import { Controller, Get, Param } from '@nestjs/common';
import { QrCodesService } from './qr-codes.service';

@Controller('qr-codes')
export class QrCodesController {
  constructor(private readonly qrService: QrCodesService) {}

  @Get('batch/:id')
  async getBatchPayloads(@Param('id') id: string) {
    // Returns payloads for client-side QR generation: object id, serial, batch
    return await this.qrService.getQrPayloadsForBatch(id);
  }
}
