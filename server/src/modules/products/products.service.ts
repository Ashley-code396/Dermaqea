import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CodesService } from '../codes/codes.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService, private readonly codes: CodesService) {}

  async findByManufacturer(manufacturerId: string) {
    return this.prisma.product.findMany({ where: { manufacturerId }, orderBy: { createdAt: 'desc' } });
  }

  async createProductAndGenerateCodes(params: {
    manufacturerId: string;
    productName: string;
    description?: string;
    manufactureDate: string | number;
    expiryDate: string | number;
    amount: number;
    batchNumber?: string;
  }) {
    // delegate to CodesService which already implements creation + code generation
    // adapt param names if necessary
    const { manufacturerId, productName, description, manufactureDate, expiryDate, amount, batchNumber } = params;
    return this.codes.createProductAndGenerateCodes({ manufacturerId, productName, description, manufactureDate, expiryDate, amount, batchNumber });
  }
}
