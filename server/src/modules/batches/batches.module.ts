import { Module } from '@nestjs/common';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EnokiModule } from '../enoki/enoki.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, EnokiModule],
  controllers: [BatchesController],
  providers: [BatchesService, PrismaService],
  exports: [BatchesService],
})
export class BatchesModule {}
