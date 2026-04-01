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


}
