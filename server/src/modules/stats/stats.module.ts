import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { ProductsModule } from '../products/products.module';
import { BatchesModule } from '../batches/batches.module';

@Module({
  imports: [ProductsModule, BatchesModule],
  controllers: [StatsController],
})
export class StatsModule {}
