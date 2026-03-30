import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EnokiService } from '../enoki/enoki.service';
import { encodeSignatureToBase64Url } from './crypto.util';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class CodesService {
  private readonly logger = new Logger(CodesService.name);
  constructor(private prisma: PrismaService, private enoki: EnokiService) {}

  /**
   * Generate payload, request Enoki to sign it, and return compact code.
   * Optionally store signature and payloadHash into SerialRegistry if serial exists.
   */
  async generateCode(params: { manufacturerId: string; productUuid: string; nonce: string }) {
    const { manufacturerId, productUuid, nonce } = params;
    const payload = `${manufacturerId}-${productUuid}-${nonce}`;
    // Lookup manufacturer to obtain its Sui wallet address and ask Enoki to
    // sign under that address. Passing the DB id directly to Enoki often
    // results in an inability to sign (Enoki expects a Sui address).
  const manufacturer = await this.prisma.manufacturer.findUnique({ where: { id: manufacturerId } });
  if (!manufacturer) throw new Error('manufacturer not found');
  if (!manufacturer.suiWalletAddress) throw new Error('manufacturer does not have a configured suiWalletAddress; cannot request Enoki to sign');

    // Use Enoki to sign the payload under the manufacturer's Sui address.
    // EnokiService.signPayload expects a Sui address (not an internal DB id).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawSig: any = await (this.enoki as any).signPayload(manufacturer.suiWalletAddress, payload);
    let sigBytes: Uint8Array;
    if (!rawSig) throw new Error('Enoki signing returned empty signature');
    if (typeof rawSig === 'string') {
      // assume base64 or base64url
      const s = rawSig.replace(/-/g, '+').replace(/_/g, '/');
      sigBytes = new Uint8Array(Buffer.from(s, 'base64'));
    } else if (rawSig instanceof Uint8Array || Buffer.isBuffer(rawSig)) {
      sigBytes = rawSig instanceof Uint8Array ? rawSig : new Uint8Array(rawSig as Buffer);
    } else {
      throw new Error('Unsupported signature type returned from Enoki');
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

      // Sign via Enoki
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawSig: any = await (this.enoki as any).signPayload(manufacturer.suiWalletAddress, payload);
      let sigBytes: Uint8Array;
      if (!rawSig) throw new Error('Enoki signing returned empty signature');
      if (typeof rawSig === 'string') {
        const s = rawSig.replace(/-/g, '+').replace(/_/g, '/');
        sigBytes = new Uint8Array(Buffer.from(s, 'base64'));
      } else if (rawSig instanceof Uint8Array || Buffer.isBuffer(rawSig)) {
        sigBytes = rawSig instanceof Uint8Array ? rawSig : new Uint8Array(rawSig as Buffer);
      } else {
        throw new Error('Unsupported signature type returned from Enoki');
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
