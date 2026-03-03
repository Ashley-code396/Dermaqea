import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';

@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get()
  getAll(@Query('productId') productId?: string) {
    if (productId) return this.batchesService.findByProduct(productId);
    return this.batchesService.findAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.batchesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBatchDto) {
    return this.batchesService.create(dto);
  }
}
