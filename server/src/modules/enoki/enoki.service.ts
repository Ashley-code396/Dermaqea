import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
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
  private grpcClient?: SuiGrpcClient;

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
    this.grpcClient = undefined;
  }

  /**
   * Sign an arbitrary payload using Enoki under a manufacturer's context.
   * Returns a Uint8Array or base64 string depending on the EnokiClient implementation.
   *
   * NOTE: This method assumes the Enoki provider used by this project exposes a
   * `signMessage` or similar RPC on the client for off-chain signing. If your
   * Enoki SDK exposes a different call site you should adapt this wrapper.
   */
  async signPayload(manufacturerContext: string, payload: string): Promise<Uint8Array | string> {
    // If the Enoki client exposes a message signing helper, prefer it.
    // We try a few common method names and several likely locations (including
    // prototype methods) to keep this wrapper adaptable across multiple SDK
    // versions and runtime shapes.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = this.enokiClient as any;
    const tryNames = ['signPersonalMessage', 'signMessage', 'sign', 'signPayload'];

    const invokeCandidate = async (fn: (...args: any[]) => any) => {
      try {
        // Try common patterns: object { address, message } then raw message
        try {
          // pattern: signMessage({ address, message })
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          return await fn({ address: manufacturerContext, message: payload });
        } catch (e) {
          // fallback pattern: sign(message)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          return await fn(payload);
        }
      } catch (e) {
        // swallow and let caller try other candidates
        return undefined;
      }
    };

    const findFunction = (obj: any, name: string): Function | undefined => {
      if (!obj) return undefined;
      if (typeof obj[name] === 'function') return obj[name].bind(obj);
      const proto = Object.getPrototypeOf(obj);
      if (proto && typeof proto[name] === 'function') return proto[name].bind(obj);
      return undefined;
    };

    // 1) Direct methods on the client (own props or on prototype)
    for (const name of tryNames) {
      const fn = findFunction(client, name);
      if (fn) {
        const res = await invokeCandidate(fn as any);
        if (res) return res;
      }
    }

    // 2) Common nested places: provider, wallet, auth, connector
    const nestedOwners = ['provider', 'wallet', 'auth', 'connector'];
    for (const owner of nestedOwners) {
      // allow nested object to be defined as own property or on the prototype
      const obj = client[owner] ?? Object.getPrototypeOf(client)?.[owner];
      if (!obj) continue;
      for (const name of tryNames) {
        const fn = findFunction(obj, name);
        if (fn) {
          const res = await invokeCandidate(fn as any);
          if (res) return res;
        }
      }
    }

    // 3) Some SDKs expose rpc-like request method (own property or prototype)
    const requestFn = findFunction(client, 'request');
    if (requestFn) {
      try {
        // Attempt a generic RPC-like call; adapt parameters conservatively.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const rpcRes = await requestFn({ method: 'signMessage', params: { address: manufacturerContext, message: payload } });
        if (rpcRes) return rpcRes;
      } catch (e) {
        // ignore and fallthrough
      }
    }

    // If no Enoki client signing method available, produce a diagnostic log
    // and throw an informative error. We intentionally avoid logging any
    // secrets; we only enumerate available method/property names to help
    // debug SDK incompatibilities.
    try {
      const topLevelKeys = Object.keys(client || {}).filter(Boolean);
      const nested = {} as Record<string, string[]>;
      const nestedOwners = ['provider', 'wallet', 'auth', 'connector'];
      for (const owner of nestedOwners) {
        const obj = client?.[owner];
        if (obj && typeof obj === 'object') nested[owner] = Object.keys(obj).filter(Boolean);
      }
      this.logger.debug(`Enoki signPayload diagnostic: topLevelKeys=${JSON.stringify(topLevelKeys)}, nested=${JSON.stringify(nested)}`);
    } catch (diagError) {
      // ignore diagnostics failures
    }

    throw new Error(
      'Enoki client does not expose a message signing API (signMessage/sign). Ensure you pass the manufacturer Sui wallet address to signPayload and that your Enoki SDK/API version supports signing. Run the server with DEBUG logs to see available client properties.'
    );
  }

  getEnokiClient() {
    return this.enokiClient;
  }

  private mapDryRunAbortToHttpError(error: unknown): Error {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e: any = error;
    const details: string[] = [];
    const errors = Array.isArray(e?.errors) ? e.errors : [];
    for (const item of errors) {
      if (item?.message) details.push(String(item.message));
    }
    const fullText = [String(e?.message || ''), ...details].join(' | ');
    const lower = fullText.toLowerCase();

    // Known `dermaqea::product` aborts:
    // 0 ENotAuthorized
    // 1 EDuplicateSerialNumber
    // 2 EProductExpired
    // 3 EProductFlagged
    // 4 EProductCounterfeit
    // 5 EInvalidStatus
    if (
      lower.includes('moduleid') &&
      lower.includes('name: identifier("product")') &&
      lower.includes('abort') &&
      (lower.includes(', 1)') || lower.includes('eduplicateserialnumber'))
    ) {
      return new ConflictException('Mint rejected by Move dry-run: duplicate serial number already exists on-chain.');
    }
    if (
      lower.includes('moduleid') &&
      lower.includes('name: identifier("product")') &&
      lower.includes('abort') &&
      (lower.includes(', 2)') || lower.includes('eproductexpired'))
    ) {
      return new BadRequestException('Mint rejected by Move dry-run: product expiry is not in the future.');
    }

    if (lower.includes('dry run failed')) {
      return new BadRequestException(`Mint dry-run failed on-chain: ${fullText}`);
    }

    return e instanceof Error ? e : new Error(String(error));
  }

  private getGrpcClient(): SuiGrpcClient {
    if (this.grpcClient) return this.grpcClient;

    const baseUrl = this.configService.get<string>('SUI_GRPC_URL');
    if (!baseUrl) {
      throw new Error('SUI_GRPC_URL is required to initialize SuiGrpcClient');
    }

    this.grpcClient = new SuiGrpcClient({
      network: this.network,
      baseUrl,
    });

    return this.grpcClient;
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
    const maxRetries = Number(this.configService.get<number>('ENOKI_MAX_RETRIES') ?? 3);
    const baseBackoffMs = Number(this.configService.get<number>('ENOKI_BACKOFF_MS') ?? 1000);
    let attempt = 0;
    while (true) {
      attempt += 1;
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
      }, bytesLen=${params.transactionKindBytes.length}, attempt=${attempt}`);

      const res = await this.enokiClient.createSponsoredTransaction({
        network: this.network,
        transactionKindBytes: params.transactionKindBytes,
        sender: params.sender,
        allowedMoveCallTargets: params.allowedMoveCallTargets || defaultTargets,
        allowedAddresses: params.allowedAddresses || [],
      });

      return res;
    } catch (error) {
      // Determine if the error looks like a transient connect timeout and retry if allowed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e: any = error;
      this.logger.error(`Failed to create sponsored transaction (attempt ${attempt}): ${e}`);

      const isConnectTimeout = e?.cause && String(e.cause.code || '').toLowerCase().includes('und_err_connect_timeout');
      const isFetchFailed = String(e?.message || '').toLowerCase().includes('fetch failed');

      if (attempt < maxRetries && (isConnectTimeout || isFetchFailed)) {
        const delay = baseBackoffMs * attempt;
        this.logger.warn(`Retrying createSponsoredTransaction after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, delay));
        // loop to retry
      } else {
        this.logger.error(`createSponsoredTransaction final failure after ${attempt} attempts.`);
        throw this.mapDryRunAbortToHttpError(error);
      }
    }
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
    const grpcClient = this.getGrpcClient();
    const txBytes = await tx.build({ onlyTransactionKind: true, client: grpcClient });

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
    const grpcClient = this.getGrpcClient();
    // Build transaction bytes using the configured gRPC client. Wrap in try/catch
    // with one retry after recreating the client to handle transient fetch errors
    // or incorrect client initialization.
    let txBytes: Uint8Array;
    try {
      txBytes = await tx.build({ onlyTransactionKind: true, client: grpcClient });
    } catch (err) {
      // Log the details to help diagnose network / grpc-web transport failures.
      const grpcEnv = this.configService.get<string>('SUI_GRPC_URL') || '<not-set>';
      this.logger.error(`Transaction build failed using SUI gRPC URL=${grpcEnv}: ${err}`);

      // Attempt to recreate the SuiGrpcClient once and retry (handles transient DNS/connectivity)
      try {
        const retryGrpcUrl = this.configService.get<string>('SUI_GRPC_URL');
        if (!retryGrpcUrl) {
          throw new Error('SUI_GRPC_URL is required to retry transaction build');
        }
        this.logger.debug(`Retrying transaction build with recreated SuiGrpcClient using ${retryGrpcUrl}`);
        this.grpcClient = new SuiGrpcClient({ network: this.network, baseUrl: retryGrpcUrl });
        const grpcClient = this.getGrpcClient();
        txBytes = await tx.build({ onlyTransactionKind: true, client: grpcClient });
      } catch (err2) {
        // Final failure — include both errors in the log for debugging.
        this.logger.error(`Retry transaction build also failed: ${err2}`);
        const errText = `${String(err)} | ${String(err2)}`.toLowerCase();
        if (errText.includes('mutable parameter provided, immutable parameter expected')) {
          throw new BadRequestException(
            'Batch mint transaction argument mismatch: one object argument mutability does not match the Move function signature.',
          );
        }
        // Re-throw a clearer error explaining the gRPC connectivity problem.
        throw new Error(`Failed to build transaction bytes via Sui gRPC (attempts failed). Check SUI_GRPC_URL/network connectivity. Original error: ${String(err)}; Retry error: ${String(err2)}`);
      }
    }
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
        tx.pure.vector('u64', manufactureDates),
        tx.pure.vector('u64', expiryDates),
        tx.object.clock(),
      ],
    });

    return await this.sponsorTransaction(tx, sender, allowedTargets, allowedAddresses);
  }
}
