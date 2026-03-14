import { Body, Controller, Get, Param, Post, Query, BadRequestException } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { EnokiService } from '../enoki/enoki.service';
import { Transaction } from '@mysten/sui/transactions';
import { SuiGrpcClient } from '@mysten/sui/grpc';
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
  const { serialRegistryId, brandWalletAddress, productName, items } = args as any;

  // Allow falling back to an env-configured SERIAL_REGISTRY_ID when the DB
  // representative product doesn't have an objectId populated.
  const serialRegistry = serialRegistryId ?? this.configService.get<string>('SERIAL_REGISTRY_ID');

  if (!serialRegistry) throw new BadRequestException('serialRegistryId not found for this batch (product.objectId)');
    if (!brandWalletAddress) throw new BadRequestException('brand wallet missing on product');

    // Use DB-provided brand wallet (connected user account address) as the
    // sender for the sponsored transaction. This flow uses ENOKI_SECRET_KEY
    // only: the server will create a sponsored transaction and return it to
    // the client for signing/execution.
    const brandWallet = brandWalletAddress;

    // Build transaction (same shape as /enoki/batch-mint controller)
    const tx = new Transaction();
    const packageId = this.configService.get<string>('PACKAGE_ID');
    if (!packageId) throw new BadRequestException('PACKAGE_ID is not configured on the server');

    const toBytes = (str: string) => Array.from(new TextEncoder().encode(str));

    const serialNumbers = items.map((i) => toBytes(i.serialNumber));
    const batchNumbers = items.map((i) => toBytes(i.batchNumber));
    const manufactureDates = items.map((i) => i.manufactureDate);
    const expiryDates = items.map((i) => i.expiryDate);

    tx.moveCall({
      target: `${packageId}::dermaqea::batch_mint_new_products`,
      arguments: [
  tx.object(serialRegistry),
        tx.pure.address(brandWallet),
        tx.pure.string(productName),
        tx.pure(bcs.vector(bcs.vector(bcs.U8)).serialize(serialNumbers)),
        tx.pure(bcs.vector(bcs.vector(bcs.U8)).serialize(batchNumbers)),
        tx.pure.vector('u64', manufactureDates),
        tx.pure.vector('u64', expiryDates),
        tx.object.clock(),
      ],
    });

  // Build tx bytes (transactionKind only) and create a sponsored tx via Enoki
  // Use the gRPC Sui client to resolve object references when building.
  const grpcUrl = this.configService.get<string>('SUI_GRPC_URL') || 'https://fullnode.testnet.sui.io:443';
  const suiClient = new SuiGrpcClient({ network: 'testnet', baseUrl: grpcUrl });
  const txBytes = await tx.build({ onlyTransactionKind: true, client: suiClient });
    const sender = brandWallet || '';
    const sponsored = await this.enokiService.createSponsoredTransaction({
      transactionKindBytes: Buffer.from(txBytes).toString('base64'),
      sender,
    });
    // Return the sponsored payload to the client so it can sign & execute.
    return sponsored;
  }
}
