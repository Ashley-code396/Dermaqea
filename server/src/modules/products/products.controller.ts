import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import type { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { EnokiService } from '../enoki/enoki.service';
import { ConfigService } from '@nestjs/config';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly enokiService: EnokiService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }


  @Post('upload-batch')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBatch(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5_000_000 })], // 5MB
      }),
    )
    file: Express.Multer.File,
    @Body('product_name') product_name: string,
    @Body('brand_wallet') brand_wallet: string,
  ) {
    // Delegate parsing & DB logic to service
    return this.productsService.processBatchFile(file, product_name, brand_wallet);
  }

  @Post(':id/mint')
  async mintProduct(@Param('id') id: string) {
    const p = await this.productsService.findOne(id);

    const serialRegistryId = (p as any).objectId ?? null;
    if (!serialRegistryId) throw new BadRequestException('serialRegistryId (product.objectId) not available for this product');

    const packageId = this.configService.get<string>('PACKAGE_ID');
    if (!packageId) throw new BadRequestException('PACKAGE_ID not configured');

    const tx = new Transaction();
    const toBytes = (str: string) => Array.from(new TextEncoder().encode(str));

    const serialNumberVec = toBytes(p.serialNumber);
    const batchNumberVec = toBytes((p as any).batchNumber ?? p.batchNumber ?? '');
    const manufactureDate = Math.floor(new Date((p as any).manufactureDate ?? p.manufactureDate).getTime() / 1000);
    const expiryDate = Math.floor(new Date((p as any).expiryDate ?? p.expiryDate).getTime() / 1000);

    tx.moveCall({
      target: `${packageId}::dermaqea::mint_new_product`,
      arguments: [
        tx.object(serialRegistryId),
        tx.pure.address((p as any).brand_wallet ?? p.brand_wallet),
        tx.pure.string((p as any).product_name ?? p.product_name),
        tx.pure(bcs.vector(bcs.U8).serialize(serialNumberVec)),
        tx.pure(bcs.vector(bcs.U8).serialize(batchNumberVec)),
        tx.pure('u64', manufactureDate),
        tx.pure('u64', expiryDate),
        tx.object.clock(),
      ],
    });

    return await this.enokiService.sponsorAndExecuteTransaction(tx);
  }
}