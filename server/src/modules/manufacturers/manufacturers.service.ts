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
    // Include related documents and products so callers (UI) can render verification state
    return this.prisma.manufacturer.findMany({
      include: {
        documents: true,
        products: true,
      },
    });
  }

  async findBySuiWalletAddress(suiWalletAddress: string) {
    if (!suiWalletAddress) return null;
    return this.prisma.manufacturer.findFirst({
      where: { suiWalletAddress },
      include: {
        documents: true,
        products: true,
      },
    });
  }

  // Create a ManufacturerDocument record and associate it with the manufacturer
  // identified by the given SUI wallet address. `file` is the multer-supplied
  // file object. We store filename and a local URL (uploads are saved under ./uploads).
  async createDocumentForManufacturerBySui(suiWalletAddress: string, file: Express.Multer.File, docType: string) {
    if (!suiWalletAddress) throw new Error('missing suiWalletAddress');

    const manufacturer = await this.prisma.manufacturer.findFirst({ where: { suiWalletAddress } });
    if (!manufacturer) throw new Error('manufacturer not found');

    const created = await this.prisma.manufacturerDocument.create({
      data: {
        manufacturerId: manufacturer.id,
        docType,
        filename: file.filename || file.originalname,
        url: `/uploads/${file.filename || file.originalname}`,
        status: 'PENDING',
      },
    });

    return created;
  }

  // Partial update of manufacturer fields identified by their SUI wallet address
  async updateBySuiWalletAddress(suiWalletAddress: string, data: Partial<CreateManufacturerDto>) {
    if (!suiWalletAddress) throw new Error('missing suiWalletAddress');

    const manufacturer = await this.prisma.manufacturer.findFirst({ where: { suiWalletAddress } });
    if (!manufacturer) throw new Error('manufacturer not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.contactEmail !== undefined) updateData.email = data.contactEmail;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.businessRegNumber !== undefined) updateData.businessRegNumber = data.businessRegNumber;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.suiWalletAddress !== undefined) updateData.suiWalletAddress = data.suiWalletAddress;

    const updated = await this.prisma.manufacturer.update({ where: { id: manufacturer.id }, data: updateData });
    return updated;
  }

  // Delete manufacturer and all associated data by SUI wallet address.
  // Performs ordered deletes to respect foreign key constraints.
  async deleteBySuiWalletAddress(suiWalletAddress: string) {
    if (!suiWalletAddress) throw new Error('missing suiWalletAddress');

    const manufacturer = await this.prisma.manufacturer.findFirst({ where: { suiWalletAddress } });
    if (!manufacturer) throw new Error('manufacturer not found');

    // Collect related product and batch ids
    const products = await this.prisma.product.findMany({ where: { manufacturerId: manufacturer.id }, select: { id: true } });
    const productIds = products.map((p) => p.id);

    const batches = await this.prisma.batch.findMany({ where: { productId: { in: productIds } }, select: { id: true } });
    const batchIds = batches.map((b) => b.id);

    const serials = await this.prisma.serialRegistry.findMany({ where: { batchId: { in: batchIds } }, select: { id: true } });
    const serialIds = serials.map((s) => s.id);

    // Run deletes in a transaction
    await this.prisma.$transaction([
      // QR codes and related logs/alerts tied to serials
      this.prisma.qrCode.deleteMany({ where: { serialId: { in: serialIds } } }),
      this.prisma.securityAlert.deleteMany({ where: { serialId: { in: serialIds } } }),
      this.prisma.scanLog.deleteMany({ where: { serialId: { in: serialIds } } }),

      // Product twins for batches
      this.prisma.productTwin.deleteMany({ where: { batchId: { in: batchIds } } }),

      // Delete serials, batches, products
      this.prisma.serialRegistry.deleteMany({ where: { batchId: { in: batchIds } } }),
      this.prisma.batch.deleteMany({ where: { productId: { in: productIds } } }),
      this.prisma.product.deleteMany({ where: { id: { in: productIds } } }),

      // Manufacturer documents
      this.prisma.manufacturerDocument.deleteMany({ where: { manufacturerId: manufacturer.id } }),

      // Finally delete manufacturer
      this.prisma.manufacturer.delete({ where: { id: manufacturer.id } }),
    ]);

    return { deleted: true };
  }
}
