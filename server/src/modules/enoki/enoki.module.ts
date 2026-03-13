import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnokiController } from './enoki.controller';
import { EnokiService } from './enoki.service';

@Module({
  imports: [ConfigModule],
  controllers: [EnokiController],
  providers: [EnokiService],
  exports: [EnokiService],
})
export class EnokiModule {}
