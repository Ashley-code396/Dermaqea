import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EnokiService } from '../enoki/enoki.service';
import { encodeSignatureToBase64Url } from './crypto.util';
import { createHash, randomBytes } from 'crypto';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

@Injectable()
export class CodesService {
  private readonly logger = new Logger(CodesService.name);
  constructor(private prisma: PrismaService, private enoki: EnokiService) {}

  /**
   * Generate payload, request Enoki to sign it, and return compact code.
   * Optionally store signature and payloadHash into SerialRegistry if serial exists.
   */
  async generateCode(params: { manufacturerUuid: string; productUuid: string; nonce: string; signingKey?: string }) {
    const { manufacturerUuid, productUuid, nonce, signingKey } = params;
    const payload = `${manufacturerUuid}-${productUuid}-${nonce}`;
    // Lookup manufacturer to obtain its Sui wallet address and ask Enoki to
    // sign under that address. Passing the DB id directly to Enoki often
    // results in an inability to sign (Enoki expects a Sui address).
  const manufacturer = await this.prisma.manufacturer.findUnique({ where: { id: manufacturerUuid } });
  if (!manufacturer) throw new Error('manufacturer not found');
  if (!manufacturer.suiWalletAddress) throw new Error('manufacturer does not have a configured suiWalletAddress; cannot request Enoki to sign');

    // If a signingKey is provided, prefer local keypair signing (Ed25519). This allows
    // backend signing without relying on Enoki. The signingKey may be a mnemonic,
    // a Bech32 secret key string, or raw secret key bytes (hex/base64). If not provided
    // we fall back to the Enoki signing flow.
    let sigBytes: Uint8Array;
    if (signingKey) {
      sigBytes = await this.signWithKeypair(signingKey, payload);
    } else {
      // Use Enoki to sign the payload under the manufacturer's Sui address.
      // EnokiService.signPayload expects a Sui address (not an internal DB id).
      // Enoki-based clients (e.g. EnokiKeypair) may return an object like
      // { bytes, signature } where `signature` is the zkLogin signature.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawSig: any = await (this.enoki as any).signPayload(manufacturer.suiWalletAddress, payload);
      sigBytes = this.parseRawSignature(rawSig);
    }

    const sigB64Url = encodeSignatureToBase64Url(sigBytes);
    const code = `${payload}.${sigB64Url}`;

    // Persist a Code record linked to the product (we no longer use SerialRegistry)
    try {
  await this.prisma.code.create({ data: { product: { connect: { id: productUuid } }, codeValue: code, generatedAt: new Date() } });
    } catch (e) {
      this.logger.warn(`Failed to persist Code record for product ${productUuid}: ${e}`);
    }

    return { code, payload, signature: sigB64Url };
  }

  private generateNonce(len = 6) {
    // base36 uppercase short nonce
    const bytes = randomBytes(len);
    const s = Buffer.from(bytes).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    return s.slice(0, len).toUpperCase();
  }

  /**
   * Attempt to sign a payload using an Ed25519 keypair derived from the provided key string.
   * The `key` may be a mnemonic (deriveKeypair), a bech32 secret key string, a base64/hex
   * secret key, or raw bytes. We try a few constructors from the Sui SDK.
   */
  private async signWithKeypair(key: string, payload: string): Promise<Uint8Array> {
    // Try deriveKeypair (mnemonic) first, then fromSecretKey
    let kp: Ed25519Keypair | null = null;
    try {
      // If the caller passed mnemonics, deriveKeypair will succeed
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      kp = Ed25519Keypair.deriveKeypair(key);
    } catch (e) {
      // ignore and try fromSecretKey
    }

    if (!kp) {
      try {
        // fromSecretKey accepts Uint8Array or string (bech32 or raw)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        kp = Ed25519Keypair.fromSecretKey(key as any);
      } catch (e) {
        // last resort: try from hex/base64 bytes
        try {
          let bytes: Uint8Array;
          if (/^[0-9a-fA-F]+$/.test(key)) {
            bytes = new Uint8Array(Buffer.from(key, 'hex'));
          } else {
            // assume base64
            bytes = new Uint8Array(Buffer.from(key, 'base64'));
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          kp = Ed25519Keypair.fromSecretKey(bytes);
        } catch (err) {
          throw new Error('Failed to parse signing key for local keypair signing');
        }
      }
    }

    if (!kp) throw new Error('Failed to construct Ed25519 keypair from provided key');

    const msg = new TextEncoder().encode(payload);
    // Ed25519Keypair.sign returns a Promise<Uint8Array>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const sig = await kp.sign(msg);
    return sig instanceof Uint8Array ? sig : new Uint8Array(sig as any);
  }

  /**
   * Normalize the various shapes of signature responses we may receive from Enoki
   * or other signers. Acceptable forms:
   * - string (base64 or base64url)
   * - Uint8Array / Buffer
   * - { signature: string | Uint8Array | Buffer, bytes?: ... }
   */
  private parseRawSignature(rawSig: unknown): Uint8Array {
    if (!rawSig) throw new Error('Enoki signing returned empty signature');

    // If direct string
    if (typeof rawSig === 'string') {
      const s = rawSig.replace(/-/g, '+').replace(/_/g, '/');
      return new Uint8Array(Buffer.from(s, 'base64'));
    }

    // If raw bytes / Buffer
    if (rawSig instanceof Uint8Array || Buffer.isBuffer(rawSig)) {
      return rawSig instanceof Uint8Array ? rawSig : new Uint8Array(rawSig as Buffer);
    }

    // If object with signature property (EnokiKeypair.signPersonalMessage style)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const asAny: any = rawSig as any;
    if (asAny && (asAny.signature || asAny.sig)) {
      const sigField = asAny.signature ?? asAny.sig;
      if (typeof sigField === 'string') {
        const s = sigField.replace(/-/g, '+').replace(/_/g, '/');
        return new Uint8Array(Buffer.from(s, 'base64'));
      }
      if (sigField instanceof Uint8Array || Buffer.isBuffer(sigField)) {
        return sigField instanceof Uint8Array ? sigField : new Uint8Array(sigField as Buffer);
      }
    }

    throw new Error('Unsupported signature type returned from signer');
  }

  /**
   * Create a Product + Batch and generate `amount` codes (one per unit).
   * Returns an array of generated codes and associated serial ids.
   */
  async createProductAndGenerateCodes(params: {
    manufacturerId: string;
    productName: string;
    description?: string;
    manufactureDate: number | string; // epoch ms or ISO
    expiryDate: number | string;
    amount: number;
    batchNumber?: string;
    signingKey?: string;
  }) {
    const { manufacturerId, productName, description, manufactureDate, expiryDate, amount, batchNumber } = params;
    if (amount <= 0) throw new Error('amount must be > 0');

    // Lookup manufacturer
    const manufacturer = await this.prisma.manufacturer.findUnique({ where: { id: manufacturerId } });
  if (!manufacturer) throw new Error('manufacturer not found');
  if (!manufacturer.suiWalletAddress) throw new Error('manufacturer does not have a configured suiWalletAddress; cannot request Enoki to sign');

    // Create product
    const prod = await this.prisma.product.create({
      data: {
        product_name: productName,
        brand_wallet: manufacturer.suiWalletAddress || '',
  // Note: serialNumber and batchNumber removed from schema; codes track units
  manufactureDate: new Date(manufactureDate),
  expiryDate: new Date(expiryDate),
        extraData: description ? { description } : undefined,
        manufacturerId: manufacturer.id,
      },
    });

    // No Batch model: codes/serials will point directly to the product

    const results: Array<{ code: string; serialId: string; payload: string; signature: string }> = [];

    // Generate codes for each unit
    for (let i = 0; i < amount; i++) {
      const nonce = this.generateNonce(6);
      const payload = `${manufacturerId}-${prod.id}-${nonce}`;

      // Sign via either provided signingKey (local Ed25519) or Enoki
      let sigBytes: Uint8Array;
      if (params.signingKey) {
        sigBytes = await this.signWithKeypair(params.signingKey, payload);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawSig: any = await (this.enoki as any).signPayload(manufacturer.suiWalletAddress, payload);
        sigBytes = this.parseRawSignature(rawSig);
      }

      const sigB64Url = encodeSignatureToBase64Url(sigBytes);
      const code = `${payload}.${sigB64Url}`;

      // Persist a Code record linked to the product
      try {
  const created = await this.prisma.code.create({ data: { product: { connect: { id: prod.id } }, codeValue: code, generatedAt: new Date() } });
  results.push({ code, serialId: created.id, payload, signature: sigB64Url });
      } catch (e) {
        this.logger.warn(`Failed to create Code record for product ${prod.id}: ${e}`);
        results.push({ code, serialId: '', payload, signature: sigB64Url });
      }
    }

    return { product: prod, codes: results };
  }
}
