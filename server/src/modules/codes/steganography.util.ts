import sharp from 'sharp';

// Precompute Cosine table for 8x8 DCT
const cosTable = new Float32Array(8 * 8);
for (let u = 0; u < 8; u++) {
  for (let x = 0; x < 8; x++) {
    cosTable[u * 8 + x] = Math.cos(((2 * x + 1) * u * Math.PI) / 16);
  }
}

const alpha = (v: number) => (v === 0 ? 1 / Math.sqrt(2) : 1);

function dct2d(block: Float32Array): Float32Array {
  const result = new Float32Array(64);
  const temp = new Float32Array(64);

  // 1D DCT on rows
  for (let u = 0; u < 8; u++) {
    for (let y = 0; y < 8; y++) {
      let sum = 0;
      for (let x = 0; x < 8; x++) {
        sum += block[y * 8 + x] * cosTable[u * 8 + x];
      }
      temp[y * 8 + u] = (alpha(u) / 2) * sum;
    }
  }

  // 1D DCT on columns
  for (let v = 0; v < 8; v++) {
    for (let u = 0; u < 8; u++) {
      let sum = 0;
      for (let y = 0; y < 8; y++) {
        sum += temp[y * 8 + u] * cosTable[v * 8 + y];
      }
      result[v * 8 + u] = (alpha(v) / 2) * sum;
    }
  }

  return result;
}

function idct2d(block: Float32Array): Float32Array {
  const result = new Float32Array(64);
  const temp = new Float32Array(64);

  // 1D IDCT on columns
  for (let y = 0; y < 8; y++) {
    for (let u = 0; u < 8; u++) {
      let sum = 0;
      for (let v = 0; v < 8; v++) {
        sum += alpha(v) * block[v * 8 + u] * cosTable[v * 8 + y];
      }
      temp[y * 8 + u] = sum / 2;
    }
  }

  // 1D IDCT on rows
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      let sum = 0;
      for (let u = 0; u < 8; u++) {
        sum += alpha(u) * temp[y * 8 + u] * cosTable[u * 8 + x];
      }
      result[y * 8 + x] = sum / 2;
    }
  }

  return result;
}

// Convert string to bits with error framing
function stringToBits(str: string): number[] {
  const buf = Buffer.from(str, 'utf-8');
  const bits: number[] = [];
  // Prefix with 16 bit length
  const length = buf.length;
  for (let i = 15; i >= 0; i--) bits.push((length >> i) & 1);

  for (const byte of buf) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  }
  return bits;
}

// Convert bits to string
function bitsToString(bits: number[]): string | null {
  if (bits.length < 16) return null;
  let len = 0;
  for (let i = 0; i < 16; i++) {
    len = (len << 1) | bits[i];
  }
  
  if (len === 0 || len > 2000) return null; // sanity check (max 2000 chars)

  const byteNodes = bits.slice(16, 16 + len * 8);
  if (byteNodes.length < len * 8) return null;

  const buf = Buffer.alloc(len);
  for (let i = 0; i < len; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | byteNodes[i * 8 + j];
    buf[i] = byte;
  }
  return buf.toString('utf-8');
}

// LCG PRNG for spread spectrum
class PRNG {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
}

const MODULATION_DELTA = 90; // Strong delta for print/scan/JPEG robustness
// Select two mid-frequency coords inside 8x8 block
const COORD1 = [4, 5]; // u1, v1
const COORD2 = [5, 4]; // u2, v2

export async function embedSignature(imageBuffer: Buffer, payload: string): Promise<Buffer> {
  const payloadBits = stringToBits(payload);
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // We enforce alpha removal for precise math in 3-channel (RGB)
  const img = await sharp(imageBuffer)
    .removeAlpha()
    .raw()
    .toBuffer();

  const blocksX = Math.floor(width / 8);
  const blocksY = Math.floor(height / 8);
  const totalBlocks = blocksX * blocksY;

  // We spread the bits across the available blocks, repeating them many times
  // and use a deterministic sequence (PRNG) to select blocks so it's uniform.
  const prng = new PRNG(42); // fixed seed
  const blockIndices = Array.from({ length: totalBlocks }, (_, i) => i);
  for (let i = blockIndices.length - 1; i > 0; i--) {
    const j = Math.floor(prng.next() * (i + 1));
    [blockIndices[i], blockIndices[j]] = [blockIndices[j], blockIndices[i]];
  }

  const HEADER_RESERVE_BLOCKS = 3200;
  if (totalBlocks <= HEADER_RESERVE_BLOCKS) throw new Error("Image too small to embed the payload");
  
  const payloadOnlyBits = payloadBits.slice(16);
  const availablePayloadBlocks = totalBlocks - HEADER_RESERVE_BLOCKS;
  
  if (availablePayloadBlocks < payloadOnlyBits.length) throw new Error("Image too small to embed the payload data");
  
  const headerBlocksPerBit = HEADER_RESERVE_BLOCKS / 16;
  const payloadBlocksPerBit = Math.floor(availablePayloadBlocks / payloadOnlyBits.length);
  
  for (let i = 0; i < totalBlocks; i++) {
    let bit: number;
    let bIndex = blockIndices[i];

    if (i < HEADER_RESERVE_BLOCKS) {
      // It's a header block
      const bitIndex = Math.floor(i / headerBlocksPerBit);
      bit = payloadBits[bitIndex]; // first 16 bits
    } else {
      // It's a payload block
      const payloadI = i - HEADER_RESERVE_BLOCKS;
      const bitIndex = Math.floor(payloadI / payloadBlocksPerBit);
      if (bitIndex >= payloadOnlyBits.length) break; // leftover blocks ignored
      bit = payloadOnlyBits[bitIndex];
    }
    const bx = bIndex % blocksX;
    const by = Math.floor(bIndex / blocksX);

    // Extract Y component of 8x8 block (keep Cr/Cb untouched)
    const yBlock = new Float32Array(64);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const px = bx * 8 + x;
        const py = by * 8 + y;
        const idx = (py * width + px) * 3;
        const r = img[idx];
        const g = img[idx + 1];
        const b = img[idx + 2];
        yBlock[y * 8 + x] = 0.299 * r + 0.587 * g + 0.114 * b;
      }
    }

    const dctBlock = dct2d(yBlock);

    // Modulate coefficients
    const c1Idx = COORD1[1] * 8 + COORD1[0];
    const c2Idx = COORD2[1] * 8 + COORD2[0];
    let c1 = dctBlock[c1Idx];
    let c2 = dctBlock[c2Idx];

    if (bit === 1) {
      if (c1 - c2 < MODULATION_DELTA) {
        const avg = (c1 + c2) / 2;
        c1 = avg + MODULATION_DELTA / 2;
        c2 = avg - MODULATION_DELTA / 2;
      }
    } else {
      if (c2 - c1 < MODULATION_DELTA) {
        const avg = (c1 + c2) / 2;
        c1 = avg - MODULATION_DELTA / 2;
        c2 = avg + MODULATION_DELTA / 2;
      }
    }

    dctBlock[c1Idx] = c1;
    dctBlock[c2Idx] = c2;

    const modifiedYBlock = idct2d(dctBlock);

    // write back to image
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const px = bx * 8 + x;
        const py = by * 8 + y;
        const idx = (py * width + px) * 3;
        
        const r = img[idx];
        const g = img[idx + 1];
        const bl = img[idx + 2];
        const oldY = 0.299 * r + 0.587 * g + 0.114 * bl;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * bl;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * bl;

        const newY = modifiedYBlock[y * 8 + x];
        
        let newR = newY + 1.402 * (cr - 128);
        let newG = newY - 0.344136 * (cb - 128) - 0.714136 * (cr - 128);
        let newB = newY + 1.772 * (cb - 128);

        // Clamp
        img[idx] = Math.max(0, Math.min(255, Math.round(newR)));
        img[idx + 1] = Math.max(0, Math.min(255, Math.round(newG)));
        img[idx + 2] = Math.max(0, Math.min(255, Math.round(newB)));
      }
    }
  }

  return sharp(img, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

export async function extractSignature(imageBuffer: Buffer): Promise<string> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  const img = await sharp(imageBuffer)
    .removeAlpha()
    .raw()
    .toBuffer();

  const blocksX = Math.floor(width / 8);
  const blocksY = Math.floor(height / 8);
  const totalBlocks = blocksX * blocksY;

  const prng = new PRNG(42);
  const blockIndices = Array.from({ length: totalBlocks }, (_, i) => i);
  for (let i = blockIndices.length - 1; i > 0; i--) {
    const j = Math.floor(prng.next() * (i + 1));
    [blockIndices[i], blockIndices[j]] = [blockIndices[j], blockIndices[i]];
  }

  // Evaluate a specific bit given the subset of block indices
  const readBit = (startIdx: number, endIdx: number): number => {
    let ones = 0;
    let zeros = 0;
    for (let i = startIdx; i < endIdx; i++) {
        const bIndex = blockIndices[i];
        const bx = bIndex % blocksX;
        const by = Math.floor(bIndex / blocksX);

        const yBlock = new Float32Array(64);
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const px = bx * 8 + x;
                const py = by * 8 + y;
                const idx = (py * width + px) * 3;
                const r = img[idx];
                const g = img[idx + 1];
                const b = img[idx + 2];
                yBlock[y * 8 + x] = 0.299 * r + 0.587 * g + 0.114 * b;
            }
        }

        const dctBlock = dct2d(yBlock);
        const c1Idx = COORD1[1] * 8 + COORD1[0];
        const c2Idx = COORD2[1] * 8 + COORD2[0];
        
        if (dctBlock[c1Idx] > dctBlock[c2Idx]) ones++;
        else zeros++;
    }
    return ones >= zeros ? 1 : 0;
  };

  // We must reserve blocks specifically for the header (the 16 bits of length).
  // This allows the extractor to know EXACTLY where the header is, regardless of the payload length.
  // We'll use the first HEADER_RESERVE_BLOCKS from the permuted blockIndices.
  
  const HEADER_RESERVE_BLOCKS = 3200; // 200 blocks per bit * 16 bits = 3200 blocks. (Survives heavy loss easily)
  if (totalBlocks <= HEADER_RESERVE_BLOCKS) throw new Error("Image too small");

  // Read header (16 bits)
  const headerBlocksPerBit = HEADER_RESERVE_BLOCKS / 16;
  const headerBits: number[] = [];
  for (let i = 0; i < 16; i++) {
    const startIdx = i * headerBlocksPerBit;
    const endIdx = startIdx + headerBlocksPerBit;
    headerBits.push(readBit(startIdx, endIdx));
  }

  // Parse length from the 16 bits
  let byteLength = 0;
  for (let i = 0; i < 16; i++) {
    byteLength = (byteLength << 1) | headerBits[i];
  }

  if (byteLength === 0 || byteLength > 2000) {
    throw new Error("Invalid payload length extracted.");
  }

  const payloadBitLength = byteLength * 8;
  const availablePayloadBlocks = totalBlocks - HEADER_RESERVE_BLOCKS;
  if (availablePayloadBlocks < payloadBitLength) {
    throw new Error("Image too small to contain the extracted length.");
  }

  const payloadBlocksPerBit = Math.floor(availablePayloadBlocks / payloadBitLength);
  
  // Read payload
  const payloadBits: number[] = [];
  for (let i = 0; i < payloadBitLength; i++) {
    const startIdx = HEADER_RESERVE_BLOCKS + i * payloadBlocksPerBit;
    const endIdx = startIdx + payloadBlocksPerBit;
    payloadBits.push(readBit(startIdx, endIdx));
  }

  // Combine back into the full bits array (length prefix + payload)
  const allBits = [...headerBits, ...payloadBits];
  const resultStr = bitsToString(allBits);
  if (!resultStr) throw new Error("Failed to decode string from extracted bits.");

  return resultStr;
}
