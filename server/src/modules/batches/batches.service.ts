import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateBatchDto } from './dto/create-batch.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { EnokiService } from '../enoki/enoki.service';
import { ConfigService } from '@nestjs/config';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

@Injectable()
export class BatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enokiService: EnokiService,
    private readonly configService: ConfigService,
  ) {}

  // Return batches shaped for the frontend (legacy snake_case fields used by the client)
  async findAll() {
    const batches = await this.prisma.batch.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });

    return batches.map((b) => ({
      id: b.id,
      product_id: b.productId,
      product: b.product ? { id: b.product.id, name: b.product.product_name } : undefined,
      sui_object_id: b.product?.objectId ?? null,
      batch_number: b.batchNumber,
      manufacture_date: b.manufactureDate.toISOString().split('T')[0],
      expiry_date: b.expiryDate.toISOString().split('T')[0],
      unit_count: b.unitsProduced ?? 0,
      facility: null,
      stolen: false,
      status: b.status.toLowerCase(),
      created_at: b.createdAt.toISOString(),
    }));
  }

  async findByProduct(productId: string) {
    const batches = await this.prisma.batch.findMany({ where: { productId }, include: { product: true }, orderBy: { createdAt: 'desc' } });
    return batches.map((b) => ({
      id: b.id,
      product_id: b.productId,
      product: b.product ? { id: b.product.id, name: b.product.product_name } : undefined,
      sui_object_id: b.product?.objectId ?? null,
      batch_number: b.batchNumber,
      manufacture_date: b.manufactureDate.toISOString().split('T')[0],
      expiry_date: b.expiryDate.toISOString().split('T')[0],
      unit_count: b.unitsProduced ?? 0,
      facility: null,
      stolen: false,
      status: b.status.toLowerCase(),
      created_at: b.createdAt.toISOString(),
    }));
  }

  async findOne(id: string) {
    const b = await this.prisma.batch.findUnique({ where: { id }, include: { product: true } });
    if (!b) throw new NotFoundException(`Batch ${id} not found`);
    return {
      id: b.id,
      product_id: b.productId,
      product: b.product ? { id: b.product.id, name: b.product.product_name } : undefined,
      sui_object_id: b.product?.objectId ?? null,
      batch_number: b.batchNumber,
      manufacture_date: b.manufactureDate.toISOString().split('T')[0],
      expiry_date: b.expiryDate.toISOString().split('T')[0],
      unit_count: b.unitsProduced ?? 0,
      facility: null,
      stolen: false,
      status: b.status.toLowerCase(),
      created_at: b.createdAt.toISOString(),
    };
  }

  async count(): Promise<number> {
    return this.prisma.batch.count();
  }

  async create(dto: CreateBatchDto) {
    const b = await this.prisma.batch.create({
      data: {
        productId: dto.productId,
        batchNumber: dto.batchNumber,
        manufactureDate: dto.manufacturedAt ? new Date(dto.manufacturedAt) : new Date(),
        expiryDate: dto.expiresAt ? new Date(dto.expiresAt) : new Date(),
        unitsProduced: 0,
      },
    });

    return {
      id: b.id,
      product_id: b.productId,
      batch_number: b.batchNumber,
      manufacture_date: b.manufactureDate.toISOString().split('T')[0],
      expiry_date: b.expiryDate.toISOString().split('T')[0],
      unit_count: b.unitsProduced ?? 0,
      created_at: b.createdAt.toISOString(),
    };
  }

  /**
   * Build arguments for a batch mint operation using DB records.
   * Returns an object shaped for the enoki.batch-mint controller.
   */
  async buildMintArgs(batchId: string) {
    const b = await this.prisma.batch.findUnique({ where: { id: batchId }, include: { product: true } });
    if (!b) throw new NotFoundException(`Batch ${batchId} not found`);

    // Find all products that belong to the same manufacturer and share the same batch number
    const products = await this.prisma.product.findMany({
      where: {
        batchNumber: b.batchNumber,
        manufacturerId: b.product.manufacturerId,
      },
    });

    // Move contract expects timestamps in milliseconds (clock::timestamp_ms)
    const items = products.map((p) => ({
      serialNumber: p.serialNumber,
      batchNumber: p.batchNumber,
      // metadataHash is not required by the on-chain batch mint entry; omit it here
      manufactureDate: p.manufactureDate.getTime(),
      expiryDate: p.expiryDate.getTime(),
    }));

    // Use the representative product as source for brand wallet and product name
    const repr = b.product as any;

    return {
      serialRegistryId: repr?.objectId ?? null,
      brandWalletAddress: repr?.brand_wallet ?? repr?.brandWallet ?? null,
      productName: repr?.product_name ?? repr?.productName ?? 'Unknown product',
      items,
    };
  }

  /**
   * Mint a single product on-chain using the existing DB product record.
   * This was previously implemented in ProductsService; moved here so minting
   * logic lives with batch-related operations.
   */
  async mintProduct(productId: string) {
    // Admin-signed backend flow has been disabled. Use sponsorMintProduct(productId, sender)
    // to create a sponsored payload that the client signs with their own key.
    throw new Error('Backend-side mint execution is disabled. Use sponsorMintProduct(productId, sender) instead.');
  }

  /**
   * Create a sponsored transaction for a single product mint so the client can sign and submit.
   * Returns the sponsored payload (bytes, digest, ...) from Enoki which the client must sign.
   */
  async sponsorMintProduct(productId: string, sender: string) {
    const p = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!p) throw new NotFoundException(`Product with ID ${productId} not found`);

    // Ensure the sender is the connected brand wallet (owner) for this product
    const productBrand = (p as any).brand_wallet ?? p.brand_wallet;
    if (!productBrand) throw new BadRequestException('Product does not have a brand wallet configured');
    if (sender.toLowerCase() !== productBrand.toLowerCase()) {
      throw new ForbiddenException('Sender must be the product brand wallet address');
    }

    const serialRegistryId = this.configService.get<string>('SERIAL_REGISTRY_ID');
    if (!serialRegistryId) throw new BadRequestException('SERIAL_REGISTRY_ID not configured');

    const packageId = this.configService.get<string>('PACKAGE_ID');
    if (!packageId) throw new BadRequestException('PACKAGE_ID not configured');

    const tx = new Transaction();
    const toBytes = (str: string) => Array.from(new TextEncoder().encode(str));

    const serialNumberVec = toBytes((p as any).serialNumber ?? p.serialNumber ?? '');
    const batchNumberVec = toBytes((p as any).batchNumber ?? p.batchNumber ?? '');
    const manufactureDate = Math.floor(new Date((p as any).manufactureDate ?? p.manufactureDate).getTime() / 1000);
    const expiryDate = Math.floor(new Date((p as any).expiryDate ?? p.expiryDate).getTime() / 1000);

    tx.moveCall({
      target: `${packageId}::dermaqea::mint_new_product`,
      arguments: [
        tx.object(serialRegistryId),
        tx.pure.address((p as any).brand_wallet ?? p.brand_wallet),
        tx.pure.string((p as any).product_name ?? p.product_name),
        tx.pure(bcs.vector(bcs.U8).serialize(serialNumberVec)),
        tx.pure(bcs.vector(bcs.U8).serialize(batchNumberVec)),
        tx.pure('u64', manufactureDate),
        tx.pure('u64', expiryDate),
        tx.object.clock(),
      ],
    });

    // Use EnokiService to create a sponsored transaction (client will sign)
    return await this.enokiService.sponsorTransaction(tx, sender);
  }

  /**
   * Create a sponsored batch-mint for a batchId using DB records. Returns the sponsored payload
   * which the client (sender) should sign and then call /enoki/execute.
   */
  async createSponsoredBatchMint(batchId: string, sender: string) {
    const args = await this.buildMintArgs(batchId);

    const { serialRegistryId, brandWalletAddress, productName, items } = args as any;

    if (!serialRegistryId) throw new BadRequestException('serialRegistryId not found for batch');
    if (!brandWalletAddress) throw new BadRequestException('brand wallet missing on product');

    // Validate sender is the connected brand wallet
    if (sender.toLowerCase() !== String(brandWalletAddress).toLowerCase()) {
      throw new ForbiddenException('Sender must be the batch brand wallet address');
    }
    // Delegate to EnokiService helper which builds the tx and calls createSponsoredTransaction
    return await this.enokiService.createSponsoredBatchMint({
      minterCapId: '', // if you require a minter cap object, wire it here or change buildMintArgs to return it
      serialRegistryId,
      brandWalletAddress,
      productName,
      items,
      sender,
    });
  }
}
