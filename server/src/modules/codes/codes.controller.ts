import { Body, Controller, Post, HttpCode, HttpStatus, Get, Param, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CodesService } from './codes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { verifySignature } from './crypto.util';
import { extractSignature } from './steganography.util';

@Controller('codes')
export class CodesController {
  constructor(private readonly svc: CodesService, private readonly prisma: PrismaService) {}



  /**
   * Two-step client signing flow: Step 1 creates the product and returns
   * unsigned payloads for the client to sign with their wallet.
   */
  @Post('create-batch-init')
  @HttpCode(HttpStatus.OK)
  async createBatchInit(
    @Body()
    body: {
      // Accept either the DB UUID for the manufacturer or the manufacturer's
      // connected wallet address (suiWalletAddress). Clients that only know
      // the connected wallet can pass `manufacturerSuiAddress` and the
      // server will resolve the corresponding Manufacturer record.
      manufacturerId?: string;
      manufacturerSuiAddress?: string;
      productName: string;
      description?: string;
      manufactureDate: number | string;
      expiryDate: number | string;
      amount: number;
      batchNumber?: string;
    },
  ) {
    try {
      const { manufacturerId, manufacturerSuiAddress, productName, description, manufactureDate, expiryDate, amount, batchNumber } = body;
      const res = await this.svc.createProductAndBuildPayloads({
        manufacturerId,
        manufacturerSuiAddress,
        productName,
        description,
        manufactureDate,
        expiryDate,
        amount,
        batchNumber,
      });
      return res;
    } catch (e) {
      console.error('[createBatchInit] Error:', e);
      throw e;
    }
  }

  /**
   * Two-step client signing flow: Step 2 receives signed payloads and
   * persists verified codes.
   */
  @Post('create-batch-finalize')
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.OK)
  async createBatchFinalize(@UploadedFile() file: any, @Body() body: { productId: string; signedPayloads: string | Array<any> }) {
    try {
      const { productId, signedPayloads: signedPayloadsRaw } = body;
      const signedPayloads = typeof signedPayloadsRaw === 'string' ? JSON.parse(signedPayloadsRaw) : signedPayloadsRaw;
      const res = await this.svc.finalizeBatchWithSignatures({ 
        productId, 
        signedPayloads,
        inputImageBuffer: file?.buffer
      });
      return res;
    } catch (e) {
      console.error('[createBatchFinalize] Error:', e);
      throw e;
    }
  }

 

  // Replaced batch model with product-level mapping
  @Get('product/:productId/codes')
  async getProductCodes(@Param('productId') productId: string) {
    const codes = await (this.prisma as any).code.findMany({ where: { productId } });
    
    // Map them for frontend
    return { 
      codes: codes.map(c => ({
        id: c.id,
        serialNumber: c.id, 
        codeData: c.codeValue,
        signature: c.codeValue ? c.codeValue.split('.')[1] || '' : '',
        glyphSvg: c.glyphSvg ?? null,
      })) 
    };
  }

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
    const tokenParts = code.split('.');
    const payload = tokenParts[0];
    const signature = tokenParts[1];
    const embeddedPublicKey = tokenParts[2]; // Currently optional, used only by decentralized mobile clients

    const parts = payload.split('-');
    // UUIDs have 4 dashes. manufacturerId is the first 5 parts.
    if (parts.length < 11) return { result: 'COUNTERFEIT_OR_MODIFIED_CODE' };
    const manufacturerId = parts.slice(0, 5).join('-');
    // Lookup manufacturer by id
    const manufacturer = await this.prisma.manufacturer.findUnique({ where: { id: manufacturerId } });
    if (!manufacturer) return { result: 'COUNTERFEIT_OR_MODIFIED_CODE' };

    const publicKey = manufacturer.suiWalletAddress;
    const isValid = await verifySignature(signature, payload, publicKey);
    return { result: isValid ? 'AUTHENTIC_PRODUCT' : 'COUNTERFEIT_OR_MODIFIED_CODE', isValid };
  }

  @Post('extract-stego')
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.OK)
  async extractStego(@UploadedFile() file: any) {
    if (!file) throw new Error('No image file uploaded');
    
    try {
      const payloadString = await extractSignature(file.buffer);
      if (!payloadString) return { success: false, message: 'No payload could be reliably extracted' };
      
      // Auto-verify it if we extracted something that looks mostly like a code
      if (!payloadString.includes('.')) {
         return { success: false, message: 'Extracted payload does not appear to be a signed product code', extracted: payloadString };
      }

      const result = await this.verify({ code: payloadString });
      return {
        success: true,
        extracted: payloadString,
        verification: result
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
