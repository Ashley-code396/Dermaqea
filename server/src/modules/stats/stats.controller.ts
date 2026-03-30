import { Controller, Get } from '@nestjs/common';

@Controller('stats')
export class StatsController {
  constructor() {}

  @Get()
  getOverview() {
    // Products/Batches modules removed — return neutral counts for overview API.
    return {
      products: 0,
      batches: 0,
    };
  }
}
