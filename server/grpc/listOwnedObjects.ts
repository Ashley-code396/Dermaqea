#!/usr/bin/env node
import { SuiGrpcClient } from '@mysten/sui/grpc';

const network = (process.env.SUI_NETWORK as 'mainnet' | 'testnet' | 'devnet' | 'localnet') || 'testnet';
const baseUrl = process.env.SUI_GRPC_URL;
if (!baseUrl) {
  throw new Error('SUI_GRPC_URL is required');
}

const grpcClient = new SuiGrpcClient({ network, baseUrl });

async function listOwnedObjects(owner: string, pageSize = 100) {
  const objects: string[] = [];
  let nextPageToken: Uint8Array | undefined = undefined;

  while (true) {
    const { response } = await grpcClient.stateService.listOwnedObjects({
      owner,
      pageSize,
      pageToken: nextPageToken,
      readMask: { paths: ['objects.object_id', 'next_page_token'] },
    });

    const responseObjects = response?.objects ?? [];
    for (const obj of responseObjects) {
      if (obj?.objectId) objects.push(obj.objectId);
    }

    // Normalize nextPageToken to a Uint8Array (response.nextPageToken may be a base64 string or Uint8Array)
    const token = response?.nextPageToken as unknown;
    if (typeof token === 'string') {
      nextPageToken = token ? Buffer.from(token, 'base64') : undefined;
    } else {
      nextPageToken = (token as Uint8Array) || undefined;
    }

    if (!nextPageToken) break;
  }

  return objects;
}

async function main() {
  const owner = process.argv[2] || process.env.SUI_OWNER || '';
  if (!owner) {
    console.error('Usage: npx tsx server/grpc/listOwnedObjects.ts <ownerAddress>');
    process.exit(1);
  }

  try {
    // Core API example for standard query patterns.
    const balance = await grpcClient.core.getBalance({ owner });
    console.log(`Owner ${owner} SUI balance: ${JSON.stringify(balance ?? {})}`);

    // Native stateService example for advanced gRPC queries.
    console.log(`Querying gRPC node ${baseUrl} for owner ${owner}...`);
    const objs = await listOwnedObjects(owner, 200);
    console.log(`Found ${objs.length} objects:`);
    for (const id of objs) console.log(id);
  } catch (e: any) {
    console.error('gRPC error:', e?.message ?? e);
    process.exit(2);
  }
}

if (require.main === module) {
  void main();
}
