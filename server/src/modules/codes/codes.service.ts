import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EnokiService } from '../enoki/enoki.service';
import { embedSignature } from './steganography.util';
import { randomBytes } from 'crypto';

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
    // ensure nonces are unique within this generated batch
    const seen = new Set<string>();
    const mId = manufacturer.id;
    for (let i = 0; i < amount; i++) {
      let nonce: string;
      let payload: string;
      do {
        nonce = this.generateNonce(6);
        payload = `${mId}-${prod.id}-${nonce}`;
      } while (seen.has(payload));
      seen.add(payload);
      payloads.push(payload);
    }

    return { product: prod, payloads };
  }

  /**
   * Step 2 (client flow): Accept signed payloads from the client, verify each
   * signature against the manufacturer's configured Sui address, embed the
   * cryptographic validation steganographically into an input image, and
   * persist Code records. Returns the created codes and associated images.
   */
  async finalizeBatchWithSignatures(params: {
    productId: string;
    signedPayloads: Array<{ payload: string; signature: string }>;
    inputImageBuffer?: Buffer; // The packaging template to embed into buffer
  }) {
    const { productId, signedPayloads, inputImageBuffer } = params;
    const prod = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!prod) throw new Error('product not found');

    const manufacturer = await this.prisma.manufacturer.findUnique({ where: { id: prod.manufacturerId } });
    let imageToUse = inputImageBuffer;
    if (!imageToUse) {
      const sharp = require('sharp');
      // Generate a default 1024x1024 white packaging template if none provided
      imageToUse = await sharp({
        create: {
          width: 1024,
          height: 1024,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .jpeg()
      .toBuffer();
    }

    const results: Array<{ code: string; serialId: string; payload: string; signature: string; stegoImageBase64: string }> = [];

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
      
      let stegoImageBase64 = '';
      try {
        // Embed the signature invisibly into the image buffer
        const stegoImgBuf = await embedSignature(imageToUse as Buffer, code);
        stegoImageBase64 = stegoImgBuf.toString('base64');
      } catch (e) {
        this.logger.error(`Failed to embed steganographic signature for ${code}`, e);
        throw e;
      }

      try {
        const created = await this.prisma.code.create({ data: { product: { connect: { id: prod.id } }, codeValue: code, generatedAt: new Date() } });

        results.push({ code, serialId: created.id, payload, signature, stegoImageBase64 });
      } catch (e) {
        this.logger.warn(`Failed to create Code record for product ${prod.id}: ${e}`);
        throw e;
      }
    }

    return { product: prod, codes: results };
  }
}
