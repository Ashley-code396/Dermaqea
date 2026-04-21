import { embedSignature, extractSignature } from './steganography.util';
import sharp from 'sharp';

describe('Steganography Utility', () => {
  it('should embed and extract a payload perfectly without loss', async () => {
    // Generate a noise image 1024x1024
    const buffer = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3,
        background: { r: 128, g: 128, b: 128 }
      }
    })
    .jpeg()
    .toBuffer();

    const payload = "CUST123-PROD456-XYZ890.3a8f9b92134018231209381203810238120";
    console.log(`Original buffer size: ${buffer.length} bytes`);
    
    // Embed
    const stegoImg = await embedSignature(buffer, payload);
    console.log(`Stego buffer size: ${stegoImg.length} bytes`);

    // Extract exactly
    const extracted = await extractSignature(stegoImg);
    expect(extracted).toEqual(payload);
  }, 30000);

  it('should survive JPEG compression', async () => {
    const buffer = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3,
        background: { r: 100, g: 150, b: 200 }
      }
    })
    .jpeg()
    .toBuffer();

    const payload = "CUST123-PROD456-XYZ890.3a8f9b92134018231209381203810238120";
    
    const stegoImg = await embedSignature(buffer, payload);
    
    // Apply JPEG compression
    const compressed = await sharp(stegoImg)
      .jpeg({ quality: 60 })
      .toBuffer();

    const extracted = await extractSignature(compressed);
    expect(extracted).toEqual(payload);
  }, 30000);
});
