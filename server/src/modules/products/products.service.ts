import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CodesService } from '../codes/codes.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService, private readonly codes: CodesService) {}

  async findByManufacturer(manufacturerId: string) {
    return this.prisma.product.findMany({ where: { manufacturerId }, orderBy: { createdAt: 'desc' } });
  }


}
