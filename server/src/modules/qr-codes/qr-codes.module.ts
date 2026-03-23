import { Module } from '@nestjs/common';
import { QrCodesController } from './qr-codes.controller';
import { QrCodesService } from './qr-codes.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [QrCodesController],
  providers: [QrCodesService, PrismaService],
})
export class QrCodesModule {}
