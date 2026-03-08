import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';

@Injectable()
export class ManufacturersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateManufacturerDto) {
    const data: any = {
      name: dto.name,
      email: dto.contactEmail,
      country: dto.country,
      businessRegNumber: dto.businessRegNumber,
      website: dto.website,
      // Prisma schema requires `suiWalletAddress` (non-nullable). Use empty string when not provided.
      suiWalletAddress: dto.suiWalletAddress || '',
     
    };

    const manufacturer = await this.prisma.manufacturer.create({
      data,
    });

    return manufacturer;
  }

  async findAll() {
    return this.prisma.manufacturer.findMany();
  }
}
