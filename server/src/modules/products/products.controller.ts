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
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import type { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
// move-call logic moved into ProductsService

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
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
  async mintProduct(@Param('id') id: string, @Body('sender') sender: string) {
    // Expect the client to provide the Sui address that will sign the transaction
    return await this.productsService.mint(id, sender);
  }
}