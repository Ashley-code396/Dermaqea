import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './modules/products/products.module';
import { BatchesModule } from './modules/batches/batches.module';
import { StatsModule } from './modules/stats/stats.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ProductsModule, BatchesModule, StatsModule, ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
