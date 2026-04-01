import { Body, Controller, Post, HttpCode, HttpStatus, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CodesService } from './codes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { verifySignature } from './crypto.util';

@Controller('codes')
export class CodesController {
  constructor(private readonly svc: CodesService, private readonly prisma: PrismaService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generate(@Body() body: { manufacturerUuid: string; productUuid: string; nonce: string; signingKey?: string }) {
    const { manufacturerUuid, productUuid, nonce, signingKey } = body;
    const result = await this.svc.generateCode({ manufacturerUuid: manufacturerUuid, productUuid, nonce, signingKey });
    return result;
  }

  @Post('create-batch')
  @HttpCode(HttpStatus.OK)
  async createBatch(
    @Body()
    body: {
      manufacturerId: string;
      productName: string;
      description?: string;
      manufactureDate: number | string;
      expiryDate: number | string;
      amount: number;
      batchNumber?: string;
      signingKey?: string;
    },
  ) {
    const { manufacturerId, productName, description, manufactureDate, expiryDate, amount, batchNumber, signingKey } = body;
    const res = await this.svc.createProductAndGenerateCodes({
      manufacturerId,
      productName,
      description,
      manufactureDate,
      expiryDate,
      amount,
      batchNumber,
      signingKey,
    });
    return res;
  }

 

  // Removed batch model; clients should fetch product and then call /codes/product/:productId/codes or /download

  @Get('product/:productId/download')
  async downloadProductCodes(@Param('productId') productId: string, @Res() res: Response) {
  const codes = await (this.prisma as any).code.findMany({ where: { productId } });
    if (!codes || codes.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'No codes found for product' });
    }

    // Mark downloadedAt for all codes
    try {
      await Promise.all(
        codes.map(async (c) => {
          await this.prisma.code.update({ where: { id: c.id }, data: { downloadedAt: new Date() } });
        }),
      );
    } catch (e) {
      // non-fatal
      // eslint-disable-next-line no-console
      console.warn('Failed to update downloadedAt on some Code records', e);
    }

    // Build CSV content
    const header = ['codeId', 'productId', 'codeValue', 'generatedAt', 'downloadedAt'];
    const rows = codes.map((c: any) => [c.id, c.productId ?? '', c.codeValue ?? '', c.generatedAt ? new Date(c.generatedAt).toISOString() : '', c.downloadedAt ? new Date(c.downloadedAt).toISOString() : '']);
    const csv = [header.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="codes-${productId}.csv"`);
    return res.send(csv);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() body: { code: string }) {
    const { code } = body;
    if (!code || !code.includes('.')) return { result: 'COUNTERFEIT_OR_MODIFIED_CODE' };
    const idx = code.lastIndexOf('.');
    const payload = code.slice(0, idx);
    const signature = code.slice(idx + 1);

    const parts = payload.split('-');
    if (parts.length < 3) return { result: 'COUNTERFEIT_OR_MODIFIED_CODE' };
    const manufacturerId = parts[0];
    // Lookup manufacturer by id
    const manufacturer = await this.prisma.manufacturer.findUnique({ where: { id: manufacturerId } });
    if (!manufacturer) return { result: 'COUNTERFEIT_OR_MODIFIED_CODE' };

    const publicKey = manufacturer.suiWalletAddress;
    const isValid = await verifySignature(signature, payload, publicKey);
    return { result: isValid ? 'AUTHENTIC_PRODUCT' : 'COUNTERFEIT_OR_MODIFIED_CODE', isValid };
  }
}
