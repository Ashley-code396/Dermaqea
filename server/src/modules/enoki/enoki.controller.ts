import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { EnokiService } from './enoki.service';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

@Controller('enoki')
export class EnokiController {
  constructor(private readonly enokiService: EnokiService) { }

  @Post('sponsor')
  @HttpCode(HttpStatus.OK)
  async createSponsoredTransaction(
    @Body() body: {
      transactionKindBytes: string;
      sender: string;
      allowedMoveCallTargets?: string[];
      allowedAddresses?: string[];
    }
  ) {
    const { transactionKindBytes, sender, allowedMoveCallTargets, allowedAddresses } = body;

    const sponsoredTx = await this.enokiService.createSponsoredTransaction({
      transactionKindBytes,
      sender,
      allowedMoveCallTargets,
      allowedAddresses,
    });

    return sponsoredTx;
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executeSponsoredTransaction(
    @Body() body: {
      digest: string;
      signature: string;
    }
  ) {
    const { digest, signature } = body;

    const executedTx = await this.enokiService.executeSponsoredTransaction({
      digest,
      signature,
    });

    return executedTx;
  }
  @Post('batch-mint')
  @HttpCode(HttpStatus.OK)
  async batchMintSponsored(
    @Body()
    body: {
      minterCapId: string;
      serialRegistryId: string;
      brandWalletAddress: string;
      productName: string;
      items: Array<{
        serialNumber: string;
        batchNumber: string;
        metadataHash: string;
        manufactureDate: number;
        expiryDate: number;
      }>;
    },
  ) {
    const {
      minterCapId,
      serialRegistryId,
      brandWalletAddress,
      productName,
      items,
    } = body;

    const toBytes = (str: string) => Array.from(new TextEncoder().encode(str));

    const serialNumbers = items.map((i) => toBytes(i.serialNumber));
    const batchNumbers = items.map((i) => toBytes(i.batchNumber));
    const metadataHashes = items.map((i) => toBytes(i.metadataHash));
    const manufactureDates = items.map((i) => i.manufactureDate);
    const expiryDates = items.map((i) => i.expiryDate);

    const tx = new Transaction();
    const packageId = process.env.PACKAGE_ID;

    if (!packageId) {
      throw new Error('PACKAGE_ID is not configured on the server.');
    }

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
