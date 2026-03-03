import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './../../prisma/generated/prisma/client';
import * as csv from 'csv-parse';
import * as XLSX from 'xlsx';


@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Product[]> {
    return this.prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    try {
      const data: any = {
        name: dto.name,
        description: dto.description,
        manufacturer: dto.manufacturer ? { connect: { id: dto.manufacturer } } : undefined,
      };
      return await this.prisma.product.create({ data });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Duplicate entry detected');
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findOne(id);
    const data: any = { ...dto };
    if ((dto as any).manufacturer !== undefined) {
      data.manufacturer = { connect: { id: (dto as any).manufacturer } };
    } else delete data.manufacturer;
    return this.prisma.product.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
  }

  async count(): Promise<number> {
    return this.prisma.product.count();
  }

  async processBatchFile(file: Express.Multer.File, product_name: string, brand_wallet: string) {
    // 1️⃣ Parse file into rows
    const rows = await this.parseFile(file);

    // 2️⃣ Map rows to canonical fields
    const mappedRows = rows.map((row) => this.mapRowToCanonical(row));

    // 3️⃣ Validate and store in DB
    const storedProducts: Product[] = [];
    for (const r of mappedRows) {
      const validRow = this.validateRow(r);
      const product = await this.prisma.product.create({
        data: {
          product_name,
          brand_wallet,
          manufacturer: { connect: { id: brand_wallet } },
          serialNumber: validRow.serial_number,
          batchNumber: validRow.batch_number,
          metadataHash: validRow.metadata_hash || null,
          manufactureDate: validRow.manufacture_date,
          expiryDate: validRow.expiry_date,
          extraData: validRow.extra_data,
        },
      });
      storedProducts.push(product);
    }

    // 4️⃣ Extract vectors for Move function
    const payloadVectors = this.extractMoveVectors(storedProducts);

    return {
      products: storedProducts,
      payloadVectors,
    };
  }

  private async parseFile(file: Express.Multer.File) {
    const rows: any[] = [];
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      const parser = csv.parse(file.buffer.toString('utf8'), { columns: true, trim: true });
      for await (const record of parser) rows.push(record);
    } else if (['xlsx', 'xls'].includes(ext || '')) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rows.push(...XLSX.utils.sheet_to_json(worksheet));
    } else {
      throw new BadRequestException('Unsupported file type');
    }

    return rows;
  }

  private columnMapping: Record<string, string[]> = {
    serial_number: ['Serial Number', 'serial', 'unit_id'],
    batch_number: ['Batch / Lot Number', 'batch', 'lot_number'],
    manufacture_date: ['Manufacture Date', 'production_date', 'mfg_date'],
    expiry_date: ['Expiry Date', 'shelf_life', 'exp_date'],
    metadata_hash: ['Metadata Hash', 'ipfs', 'hash'],
  };

  private mapRowToCanonical(row: Record<string, any>) {
    const canonical: any = {};
    const extra: any = {};

    for (const key in row) {
      const val = row[key];
      let mapped = false;

      for (const canonicalKey in this.columnMapping) {
        if (this.columnMapping[canonicalKey].some((name) => name.toLowerCase() === key.toLowerCase())) {
          canonical[canonicalKey] = val;
          mapped = true;
          break;
        }
      }

      if (!mapped) extra[key] = val;
    }

    canonical.extra_data = extra;
    return canonical;
  }

  private validateRow(row: any) {
    const required = ['serial_number', 'batch_number', 'manufacture_date', 'expiry_date'];
    for (const r of required) {
      if (!row[r]) throw new BadRequestException(`Missing required field: ${r}`);
    }

    row.manufacture_date = new Date(row.manufacture_date);
    row.expiry_date = new Date(row.expiry_date);

    if (isNaN(row.manufacture_date.getTime()) || isNaN(row.expiry_date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    return row;
  }
  private extractMoveVectors(products: Product[]) {
    return {
      serialNumbers: products.map((p) => Buffer.from(p.serialNumber)),
      batchNumbers: products.map((p) => Buffer.from(p.batchNumber)),
      metadataHashes: products.map((p) => (p.metadataHash ? Buffer.from(p.metadataHash) : Buffer.from([]))),
      manufactureDates: products.map((p) => Math.floor(p.manufactureDate.getTime() / 1000)),
      expiryDates: products.map((p) => Math.floor(p.expiryDate.getTime() / 1000)),
    };
  }
}