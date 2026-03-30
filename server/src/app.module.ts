import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// Products, Batches and QrCodes features removed
import { StatsModule } from './modules/stats/stats.module';
import { ManufacturersModule } from './modules/manufacturers/manufacturers.module';
import { EnokiModule } from './modules/enoki/enoki.module';
import { CodesModule } from './modules/codes/codes.module';
import { ProductsModule } from './modules/products/products.module';
// QrCodesModule removed
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [StatsModule, ManufacturersModule, EnokiModule, CodesModule, ProductsModule, ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
