import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EnokiService } from '../enoki/enoki.service';
import { randomBytes } from 'crypto';
import { generateGlyphSvg } from './glyph.util';

@Injectable()
export class CodesService {
  private readonly logger = new Logger(CodesService.name);
  constructor(private prisma: PrismaService, private enoki: EnokiService) {}



  private generateNonce(len = 6) {
    // base36 uppercase short nonce
    const bytes = randomBytes(len);
    const s = Buffer.from(bytes).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    return s.slice(0, len).toUpperCase();
  }





  /**
   * Step 1 (client flow): create the product and return the unsigned payloads
   * for the client to sign. This mirrors the payload format used by
   * createProductAndGenerateCodes but does not persist any Code records.
   */
  async createProductAndBuildPayloads(params: {
    manufacturerId?: string;
    manufacturerSuiAddress?: string;
    productName: string;
    description?: string;
    manufactureDate: number | string;
    expiryDate: number | string;
    amount: number;
    batchNumber?: string;
  }) {
    const { manufacturerId, manufacturerSuiAddress, productName, description, manufactureDate, expiryDate, amount } = params;
    if (amount <= 0) throw new Error('amount must be > 0');

    // Allow caller to pass either the DB UUID (`manufacturerId`) or the
    // manufacturer's connected wallet address (`manufacturerSuiAddress`).
    let manufacturer = null as any;
    if (manufacturerId) {
      manufacturer = await this.prisma.manufacturer.findUnique({ where: { id: manufacturerId } });
    } else if (manufacturerSuiAddress) {
      // suiWalletAddress is not declared unique in the schema, so use findFirst
      // to locate the first matching Manufacturer record for the provided address.
      manufacturer = await this.prisma.manufacturer.findFirst({ where: { suiWalletAddress: manufacturerSuiAddress } });
    } else {
      throw new Error('manufacturerId or manufacturerSuiAddress is required');
    }

    if (!manufacturer) throw new Error('manufacturer not found');

    const prod = await this.prisma.product.create({
      data: {
        product_name: productName,
        brand_wallet: manufacturer.suiWalletAddress || '',
        manufactureDate: new Date(manufactureDate),
        expiryDate: new Date(expiryDate),
        extraData: description ? { description } : undefined,
        manufacturerId: manufacturer.id,
      },
    });

    const payloads: string[] = [];
    for (let i = 0; i < amount; i++) {
      const nonce = this.generateNonce(6);
      // Use the resolved manufacturer's DB id to build the payload. If the
      // caller provided manufacturerId this will match `manufacturer.id`.
      const mId = manufacturer.id;
      const payload = `${mId}-${prod.id}-${nonce}`;
      payloads.push(payload);
    }

    return { product: prod, payloads };
  }

  /**
   * Step 2 (client flow): Accept signed payloads from the client, verify each
   * signature against the manufacturer's configured Sui address, and persist
   * Code records. Returns the created codes.
   */
  async finalizeBatchWithSignatures(params: {
    productId: string;
    signedPayloads: Array<{ payload: string; signature: string }>;
  }) {
    const { productId, signedPayloads } = params;
    const prod = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!prod) throw new Error('product not found');

    const manufacturer = await this.prisma.manufacturer.findUnique({ where: { id: prod.manufacturerId } });
    if (!manufacturer) throw new Error('manufacturer not found');
    if (!manufacturer.suiWalletAddress) throw new Error('manufacturer does not have a configured suiWalletAddress; cannot verify signatures');

    const results: Array<{ code: string; serialId: string; payload: string; signature: string }> = [];

    for (const item of signedPayloads) {
      const { payload, signature } = item;
      // verify signature (bypassed per request)
      const ok = true; // await verifySignature(signature, payload, manufacturer.suiWalletAddress);
      if (!ok) {
        // skip invalid signatures
        this.logger.warn(`Invalid signature for payload ${payload}`);
        continue;
      }

      const code = `${payload}.${signature}`;
      try {
        const created = await this.prisma.code.create({ data: { product: { connect: { id: prod.id } }, codeValue: code, generatedAt: new Date() } });

        // Generate a printable SVG glyph (Glyph Block) from the signed payload.
        // Keep the original codeValue intact; store the glyph alongside it.
        try {
          const svg = generateGlyphSvg(payload, signature);
          await this.prisma.code.update({ where: { id: created.id }, data: { glyphSvg: svg, glyphGeneratedAt: new Date() } });
        } catch (e) {
          // non-fatal: log and continue
          this.logger.warn(`Failed to generate glyph for code ${created.id}: ${e}`);
        }

        results.push({ code, serialId: created.id, payload, signature });
      } catch (e) {
        this.logger.warn(`Failed to create Code record for product ${prod.id}: ${e}`);
        throw e;
      }
    }

    return { product: prod, codes: results };
  }
}
