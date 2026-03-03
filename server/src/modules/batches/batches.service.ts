import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBatchDto } from './dto/create-batch.dto';

export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  manufacturedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

@Injectable()
export class BatchesService {
  private batches: Batch[] = [];

  findAll(): Batch[] {
    return this.batches;
  }

  findByProduct(productId: string): Batch[] {
    return this.batches.filter((b) => b.productId === productId);
  }

  findOne(id: string): Batch {
    const b = this.batches.find((x) => x.id === id);
    if (!b) throw new NotFoundException(`Batch ${id} not found`);
    return b;
  }

  create(dto: CreateBatchDto): Batch {
    const batch: Batch = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      productId: dto.productId,
      batchNumber: dto.batchNumber,
      manufacturedAt: dto.manufacturedAt,
      expiresAt: dto.expiresAt,
      createdAt: new Date().toISOString(),
    };
    this.batches.push(batch);
    return batch;
  }

  count(): number {
    return this.batches.length;
  }
}
