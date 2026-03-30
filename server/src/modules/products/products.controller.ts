import { Controller, Get, Param, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  // GET /products/manufacturer/:manufacturerId
  @Get('manufacturer/:manufacturerId')
  async listByManufacturer(@Param('manufacturerId') manufacturerId: string) {
    const items = await this.svc.findByManufacturer(manufacturerId);
    return { data: items };
  }

  // POST /products -> create product and generate codes (delegates to CodesService)
  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: any) {
    const res = await this.svc.createProductAndGenerateCodes(body);
    return res;
  }
}
