import { Body, Controller, Get, Post } from '@nestjs/common';
import { ManufacturersService } from './manufacturers.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';

@Controller('manufacturers')
export class ManufacturersController {
  constructor(private readonly svc: ManufacturersService) {}

  @Post()
  async create(@Body() dto: CreateManufacturerDto) {
    const created = await this.svc.create(dto);
    return { data: created };
  }

  @Get()
  async list() {
    const list = await this.svc.findAll();
    return { data: list };
  }
}
