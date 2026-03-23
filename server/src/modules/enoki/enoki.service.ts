import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnokiClient } from '@mysten/enoki';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64, toBase64 } from '@mysten/bcs';

@Injectable()
export class EnokiService {
  private readonly logger = new Logger(EnokiService.name);
  private enokiClient: EnokiClient;
  private network: 'testnet' | 'mainnet' | 'devnet';
  private suiClient?: SuiGrpcClient;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ENOKI_SECRET_KEY');
    if (!apiKey) {
      this.logger.warn('ENOKI_SECRET_KEY is not set in environment variables');
    }

    // Create a fetch wrapper that enforces a 20s timeout for Enoki API calls.
    // The EnokiClient may accept a custom fetch implementation; passing this
    // wrapper lets us increase the default timeout (from 10s -> 20s).
    const timeoutMs = 20_000;
    const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const merged = { ...(init || {}), signal: controller.signal } as RequestInit;
      try {
        // Prefer global fetch if available (Node 18+ / undici), otherwise fall back
        // to the global fetch identifier which should be polyfilled in the runtime.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const f = (globalThis as any).fetch;
        if (!f) throw new Error('No global fetch available to call Enoki API');
        return await f(input, merged as any);
      } finally {
        clearTimeout(id);
      }
    };

    this.enokiClient = new EnokiClient({
      apiKey: apiKey || '',
      // Pass our wrapped fetch so Enoki requests use the extended timeout
      // (EnokiClient should accept a `fetch` override; extra options are
      // ignored if not supported by the installed SDK version).
      // @ts-ignore
      fetch: fetchWithTimeout,
    });

    this.network = this.configService.get<'testnet' | 'mainnet' | 'devnet'>('SUI_NETWORK', 'testnet');
    // lazy Sui gRPC client — created on demand when building transactions that
    // require object resolution (tx.object(...) or tx.object.clock()).
    this.suiClient = undefined;
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

      // Log a compact summary to help debug dry-run failures (do not log full secrets)
      this.logger.debug(`createSponsoredTransaction: sender=${params.sender}, allowedTargets=${
        (params.allowedMoveCallTargets || defaultTargets).join(',')
      }, bytesLen=${params.transactionKindBytes.length}`);

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

    // Ensure we have an RPC client to resolve object inputs when building
    // the transaction bytes (clock/object references, etc.). Prefer an
    // explicit RPC URL via SUI_RPC_URL, otherwise derive from network.
    if (!this.suiClient) {
      // Prefer explicit gRPC endpoint env var, otherwise fall back to known public fullnode gRPC endpoints.
      const grpcUrl =
        this.configService.get<string>('SUI_GRPC_URL') ||
        (this.network === 'mainnet'
          ? 'https://fullnode.mainnet.sui.io:443'
          : this.network === 'devnet'
          ? 'https://fullnode.devnet.sui.io:443'
          : 'http://127.0.0.1:9000');
      this.suiClient = new SuiGrpcClient({ network: this.network, baseUrl: grpcUrl });
    }

    const txBytes = await tx.build({ onlyTransactionKind: true, client: this.suiClient });

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

  /**
   * Builds and executes a batch mint transaction for multiple products.
   * This moves the controller logic into the service so the controller can remain thin.
   */
  async batchMintSponsored(params: {
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
  }) {
    const {
      serialRegistryId,
      brandWalletAddress,
      productName,
      items,
    } = params;

    const toBytes = (str: string) => Array.from(new TextEncoder().encode(str));

    const serialNumbers = items.map((i) => toBytes(i.serialNumber));
    const batchNumbers = items.map((i) => toBytes(i.batchNumber));
    const metadataHashes = items.map((i) => toBytes(i.metadataHash));
  // Use BigInt for u64 values to ensure correct serialization for Move u64
  const manufactureDates = items.map((i) => BigInt(i.manufactureDate));
  const expiryDates = items.map((i) => BigInt(i.expiryDate));

    const tx = new Transaction();
    const packageId = this.configService.get<string>('PACKAGE_ID');

    if (!packageId) {
      throw new Error('PACKAGE_ID is not configured on the server.');
    }

    // The Move `batch_mint_new_products` in the dermaqea package expects the
    // SerialRegistry reference as the first argument. Do not include a
    // minter-cap object here unless your Move module requires it.
    tx.moveCall({
      target: `${packageId}::dermaqea::batch_mint_new_products`,
      arguments: [
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

    return await this.sponsorAndExecuteTransaction(tx);
  }

  /**
   * Build the transaction bytes (onlyTransactionKind) and call Enoki to create a sponsored transaction.
   * Returns the sponsored transaction object (bytes, digest, etc.) which the client can sign.
   */
  async sponsorTransaction(
    tx: Transaction,
    sender: string,
    allowedMoveCallTargets?: string[],
    allowedAddresses?: string[],
  ) {
    // Build transaction bytes using an RPC client so any object references
    // (e.g. tx.object(...), tx.object.clock()) are resolved.
    if (!this.suiClient) {
      const grpcUrl =
        this.configService.get<string>('SUI_GRPC_URL') ||
        (this.network === 'mainnet'
          ? 'https://fullnode.mainnet.sui.io:443'
          : this.network === 'devnet'
          ? 'https://fullnode.devnet.sui.io:443'
          : 'http://127.0.0.1:9000');
      this.suiClient = new SuiGrpcClient({ network: this.network, baseUrl: grpcUrl });
    }

    const txBytes = await tx.build({ onlyTransactionKind: true, client: this.suiClient });
    return await this.createSponsoredTransaction({
      transactionKindBytes: toBase64(txBytes),
      sender,
      allowedMoveCallTargets,
      allowedAddresses,
    });
  }

  /**
   * Build a batch-mint transaction and create a sponsored transaction for the provided sender.
   * This returns the sponsored payload so the client can sign and then call execute.
   */
  async createSponsoredBatchMint(params: {
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
    sender: string;
    allowedMoveCallTargets?: string[];
    allowedAddresses?: string[];
  }) {
    const {
      minterCapId,
      serialRegistryId,
      brandWalletAddress,
      productName,
      items,
      sender,
      allowedMoveCallTargets,
      allowedAddresses,
    } = params;

    const toBytes = (str: string) => Array.from(new TextEncoder().encode(str));

  const serialNumbers = items.map((i) => toBytes(i.serialNumber));
  const batchNumbers = items.map((i) => toBytes(i.batchNumber));
  const metadataHashes = items.map((i) => toBytes(i.metadataHash));
  // Ensure we pass u64 values as BigInt so the transaction builder and BCS
  // serialize them correctly for Move's clock::timestamp_ms expectations.
  const manufactureDates = items.map((i) => BigInt(i.manufactureDate));
  const expiryDates = items.map((i) => BigInt(i.expiryDate));

    const tx = new Transaction();

    const packageId = this.configService.get<string>('PACKAGE_ID');

    if (!packageId) {
      throw new Error('PACKAGE_ID is not configured on the server.');
    }

    // Restrict allowed move call targets to the batch entrypoint unless the
    // caller explicitly provided an override.
    const batchTarget = `${packageId}::dermaqea::batch_mint_new_products`;
    const allowedTargets = allowedMoveCallTargets && allowedMoveCallTargets.length > 0 ? allowedMoveCallTargets : [batchTarget];

    // Match the dermaqea Move module: registry is first argument.
    tx.moveCall({
      target: `${packageId}::dermaqea::batch_mint_new_products`,
      arguments: [
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

    return await this.sponsorTransaction(tx, sender, allowedTargets, allowedAddresses);
  }
}
