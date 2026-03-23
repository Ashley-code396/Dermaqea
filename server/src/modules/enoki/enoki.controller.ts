import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { EnokiService } from './enoki.service';

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

    // Return the executed transaction result along with the digest so the UI
    // can link to an external block explorer (Suiscan) immediately.
    return { executedTx, digest };
  }
  @Post('batch-mint/sponsor')
  @HttpCode(HttpStatus.OK)
  async createBatchMintSponsored(
    @Body()
    body: {
     
      serialRegistryId: string;
      brandWalletAddress: string;
      productName: string;
      sender: string; // the client address that will sign
      items: Array<{
        serialNumber: string;
        batchNumber: string;
        metadataHash: string;
        manufactureDate: number;
        expiryDate: number;
      }>;
    },
  ) {
    const sponsored = await this.enokiService.createSponsoredBatchMint(body as any);
    return sponsored;
  }
}
