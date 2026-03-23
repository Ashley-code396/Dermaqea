import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './modules/products/products.module';
import { BatchesModule } from './modules/batches/batches.module';
import { StatsModule } from './modules/stats/stats.module';
import { ManufacturersModule } from './modules/manufacturers/manufacturers.module';
import { EnokiModule } from './modules/enoki/enoki.module';
import { QrCodesModule } from './modules/qr-codes/qr-codes.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ProductsModule, BatchesModule, StatsModule, ManufacturersModule, EnokiModule, QrCodesModule, ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
