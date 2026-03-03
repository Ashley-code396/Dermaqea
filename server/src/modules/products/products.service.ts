import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from './../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ Get all products
  async findAll(): Promise<Product[]> {
    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // ✅ Get one product
  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  // ✅ Create product
  async create(dto: CreateProductDto): Promise<Product> {
    try {
      return await this.prisma.product.create({
        data: {
          name: dto.name,
          description: dto.description,
          manufacturer: dto.manufacturer,
          sku: dto.sku,
        },
      });
    } catch (error) {
      // Handle unique constraint violation (e.g. duplicate SKU)
      if (error.code === 'P2002') {
        throw new ConflictException('SKU already exists');
      }
      throw error;
    }
  }

  // ✅ Update product
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findOne(id); // ensure exists first

    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  // ✅ Delete product
  async remove(id: string): Promise<void> {
    await this.findOne(id); // ensure exists first

    await this.prisma.product.delete({
      where: { id },
    });
  }

  // ✅ Count products
  async count(): Promise<number> {
    return this.prisma.product.count();
  }
}