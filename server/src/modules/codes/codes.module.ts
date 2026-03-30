import { Module } from '@nestjs/common';
import { CodesController } from './codes.controller';
import { CodesService } from './codes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EnokiModule } from '../enoki/enoki.module';

@Module({
  imports: [EnokiModule],
  controllers: [CodesController],
  providers: [CodesService, PrismaService],
  exports: [CodesService],
})
export class CodesModule {}
