import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBatchDto } from './dto/create-batch.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  // Return batches shaped for the frontend (legacy snake_case fields used by the client)
  async findAll() {
    const batches = await this.prisma.batch.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });

    return batches.map((b) => ({
      id: b.id,
      product_id: b.productId,
      product: b.product ? { id: b.product.id, name: b.product.product_name } : undefined,
      sui_object_id: b.product?.objectId ?? null,
      batch_number: b.batchNumber,
      manufacture_date: b.manufactureDate.toISOString().split('T')[0],
      expiry_date: b.expiryDate.toISOString().split('T')[0],
      unit_count: b.unitsProduced ?? 0,
      facility: null,
      stolen: false,
      status: b.status.toLowerCase(),
      created_at: b.createdAt.toISOString(),
    }));
  }

  async findByProduct(productId: string) {
    const batches = await this.prisma.batch.findMany({ where: { productId }, include: { product: true }, orderBy: { createdAt: 'desc' } });
    return batches.map((b) => ({
      id: b.id,
      product_id: b.productId,
      product: b.product ? { id: b.product.id, name: b.product.product_name } : undefined,
      sui_object_id: b.product?.objectId ?? null,
      batch_number: b.batchNumber,
      manufacture_date: b.manufactureDate.toISOString().split('T')[0],
      expiry_date: b.expiryDate.toISOString().split('T')[0],
      unit_count: b.unitsProduced ?? 0,
      facility: null,
      stolen: false,
      status: b.status.toLowerCase(),
      created_at: b.createdAt.toISOString(),
    }));
  }

  async findOne(id: string) {
    const b = await this.prisma.batch.findUnique({ where: { id }, include: { product: true } });
    if (!b) throw new NotFoundException(`Batch ${id} not found`);
    return {
      id: b.id,
      product_id: b.productId,
      product: b.product ? { id: b.product.id, name: b.product.product_name } : undefined,
      sui_object_id: b.product?.objectId ?? null,
      batch_number: b.batchNumber,
      manufacture_date: b.manufactureDate.toISOString().split('T')[0],
      expiry_date: b.expiryDate.toISOString().split('T')[0],
      unit_count: b.unitsProduced ?? 0,
      facility: null,
      stolen: false,
      status: b.status.toLowerCase(),
      created_at: b.createdAt.toISOString(),
    };
  }

  async count(): Promise<number> {
    return this.prisma.batch.count();
  }

  async create(dto: CreateBatchDto) {
    const b = await this.prisma.batch.create({
      data: {
        productId: dto.productId,
        batchNumber: dto.batchNumber,
        manufactureDate: dto.manufacturedAt ? new Date(dto.manufacturedAt) : new Date(),
        expiryDate: dto.expiresAt ? new Date(dto.expiresAt) : new Date(),
        unitsProduced: 0,
      },
    });

    return {
      id: b.id,
      product_id: b.productId,
      batch_number: b.batchNumber,
      manufacture_date: b.manufactureDate.toISOString().split('T')[0],
      expiry_date: b.expiryDate.toISOString().split('T')[0],
      unit_count: b.unitsProduced ?? 0,
      created_at: b.createdAt.toISOString(),
    };
  }
}
