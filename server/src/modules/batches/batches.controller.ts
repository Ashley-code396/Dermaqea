import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';

@Controller('batches')
export class BatchesController {
  constructor(
    private readonly batchesService: BatchesService,
  ) {}

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

  @Post(':id/mint')
  async mintBatch(@Param('id') id: string) {
    // Delegate batch sponsorship creation to the service layer. The service
    // will build the tx from DB records, validate the brand wallet, and call
    // Enoki to create the sponsored payload. We pass the DB-declared brand
    // wallet as the sender so the client can sign with that account.
    const args = await this.batchesService.buildMintArgs(id) as any;
    const brandWallet = args?.brandWalletAddress ?? null;

    // The service will throw clear errors if anything is misconfigured.
    return await this.batchesService.createSponsoredBatchMint(id, brandWallet ?? '');
  }
 
}
