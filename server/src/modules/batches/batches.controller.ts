import { Body, Controller, Get, Param, Post, Query, BadRequestException } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { EnokiService } from '../enoki/enoki.service';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { ConfigService } from '@nestjs/config';

@Controller('batches')
export class BatchesController {
  constructor(
    private readonly batchesService: BatchesService,
    private readonly enokiService: EnokiService,
    private readonly configService: ConfigService,
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
    // Build args from DB
    const args = await this.batchesService.buildMintArgs(id);

    const minterCapId = this.configService.get<string>('MINTER_CAP_ID');
    if (!minterCapId) throw new BadRequestException('MINTER_CAP_ID is not configured on the server');

    const { serialRegistryId, brandWalletAddress, productName, items } = args as any;

    if (!serialRegistryId) throw new BadRequestException('serialRegistryId not found for this batch (product.objectId)');
    if (!brandWalletAddress) throw new BadRequestException('brand wallet missing on product');

    // Build transaction (same shape as /enoki/batch-mint controller)
    const tx = new Transaction();
    const packageId = this.configService.get<string>('PACKAGE_ID');
    if (!packageId) throw new BadRequestException('PACKAGE_ID is not configured on the server');

    const toBytes = (str: string) => Array.from(new TextEncoder().encode(str));

    const serialNumbers = items.map((i) => toBytes(i.serialNumber));
    const batchNumbers = items.map((i) => toBytes(i.batchNumber));
    const metadataHashes = items.map((i) => toBytes(i.metadataHash || ''));
    const manufactureDates = items.map((i) => i.manufactureDate);
    const expiryDates = items.map((i) => i.expiryDate);

    tx.moveCall({
      target: `${packageId}::dermaqea::batch_mint_new_products`,
      arguments: [
        tx.object(minterCapId),
        tx.object(serialRegistryId),
        tx.pure.address(brandWalletAddress),
        tx.pure.string(productName),
        tx.pure(bcs.vector(bcs.vector(bcs.U8)).serialize(serialNumbers)),
        tx.pure(bcs.vector(bcs.vector(bcs.U8)).serialize(batchNumbers)),
        tx.pure(bcs.vector(bcs.vector(bcs.U8)).serialize(metadataHashes)),
        tx.pure.vector('u64', manufactureDates),
        tx.pure.vector('u64', expiryDates),
        tx.object.clock(),
      ],
    });

    return await this.enokiService.sponsorAndExecuteTransaction(tx);
  }
}
