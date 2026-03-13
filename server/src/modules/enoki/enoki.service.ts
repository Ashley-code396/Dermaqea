import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnokiClient } from '@mysten/enoki';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64, toBase64 } from '@mysten/bcs';

@Injectable()
export class EnokiService {
  private readonly logger = new Logger(EnokiService.name);
  private enokiClient: EnokiClient;
  private network: 'testnet' | 'mainnet' | 'devnet';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ENOKI_SECRET_KEY');
    if (!apiKey) {
      this.logger.warn('ENOKI_SECRET_KEY is not set in environment variables');
    }

    this.enokiClient = new EnokiClient({
      apiKey: apiKey || '',
    });

    this.network = this.configService.get<'testnet' | 'mainnet' | 'devnet'>('SUI_NETWORK', 'testnet');
  }

  getEnokiClient() {
    return this.enokiClient;
  }

  /**
   * Sponsors a transaction for client-side signing or backend execution
   */
  async createSponsoredTransaction(params: {
    transactionKindBytes: string;
    sender: string;
    allowedMoveCallTargets?: string[];
    allowedAddresses?: string[];
  }) {
    try {
      const packageId = this.configService.get<string>('PACKAGE_ID');
      const defaultTargets = packageId
        ? [
            `${packageId}::dermaqea::batch_mint_new_products`,
            `${packageId}::dermaqea::mint_new_product`,
          ]
        : [];

      return await this.enokiClient.createSponsoredTransaction({
        network: this.network,
        transactionKindBytes: params.transactionKindBytes,
        sender: params.sender,
        allowedMoveCallTargets: params.allowedMoveCallTargets || defaultTargets,
        allowedAddresses: params.allowedAddresses || [],
      });
    } catch (error) {
      this.logger.error(`Failed to create sponsored transaction: ${error}`);
      throw error;
    }
  }

  /**
   * Executes a sponsored transaction that has been signed (either by client or backend)
   */
  async executeSponsoredTransaction(params: {
    digest: string;
    signature: string;
  }) {
    try {
      return await this.enokiClient.executeSponsoredTransaction({
        digest: params.digest,
        signature: params.signature,
      });
    } catch (error) {
      this.logger.error(`Failed to execute sponsored transaction: ${error}`);
      throw error;
    }
  }

  /**
   * Backend-only flow: Sponsor, sign, and execute a transaction completely using the backend admin key
   */
  async sponsorAndExecuteTransaction(
    tx: Transaction,
    allowedMoveCallTargets?: string[],
    allowedAddresses?: string[]
  ) {
    const adminKey = this.configService.get<string>('ADMIN_SECRET_KEY');
    if (!adminKey) {
      throw new Error('ADMIN_SECRET_KEY is required for backend-only execution');
    }

    const keypair = Ed25519Keypair.deriveKeypair(adminKey);
    const senderAddress = keypair.toSuiAddress();

    const txBytes = await tx.build({
      onlyTransactionKind: true,
    });

    const defaultTargets = [
      `${this.configService.get<string>('PACKAGE_ID')}::dermaqea::batch_mint_new_products`,
      `${this.configService.get<string>('PACKAGE_ID')}::dermaqea::mint_new_product`,
    ];

    // 1. Sponsor the transaction
    const sponsored = await this.createSponsoredTransaction({
      transactionKindBytes: toBase64(txBytes),
      sender: senderAddress,
      allowedMoveCallTargets: allowedMoveCallTargets || defaultTargets,
      allowedAddresses,
    });

    // 2. Sign it using the admin key
    const { signature } = await keypair.signTransaction(fromBase64(sponsored.bytes));

    // 3. Execute it
    return await this.executeSponsoredTransaction({
      digest: sponsored.digest,
      signature,
    });
  }
}
