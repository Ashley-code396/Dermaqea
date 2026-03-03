import { Controller, Get } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { BatchesService } from '../batches/batches.service';

@Controller('stats')
export class StatsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly batchesService: BatchesService,
  ) {}

  @Get()
  getOverview() {
    const products = this.productsService.count();
    const batches = this.batchesService.count();

    return {
      products,
      batches,
    };
  }
}
