import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EnokiModule } from '../enoki/enoki.module';
import { BatchesModule } from '../batches/batches.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, EnokiModule, BatchesModule],
  controllers: [ProductsController],
  providers: [ProductsService, PrismaService],
  exports: [ProductsService],
})
export class ProductsModule {}
