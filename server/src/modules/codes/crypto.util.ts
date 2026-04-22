import { verifyPersonalMessageSignature } from '@mysten/sui/verify';
import { SuiGraphQLClient } from '@mysten/sui/graphql';

export async function verifySignature(signatureB64Url: string, payload: string, publicKeyEncoded: string): Promise<boolean> {
  try {
    const msg = new TextEncoder().encode(payload);
    // Convert base64url to base64 and pad it
    let sigB64 = signatureB64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (sigB64.length % 4) sigB64 += '=';

    // The signature provided in your screenshot begins with 'BQN', meaning it is a zkLogin signature (Flag 0x05). 
    // ZkLogin signatures CANNOT be verified offline because they require fetching OAuth JWKs from the blockchain.
    // We strictly must provide the GraphQL client, otherwise the verification throws silently and results in COUNTERFEIT.
    const gqlUrl = process.env.SUI_GRAPHQL_URL || 'https://graphql.testnet.sui.io/graphql';
    const networkObj = (process.env.SUI_NETWORK as any) || 'testnet';

    // A custom fetch interceptor to hot-fix the mismatch between Sui SDK v2.6.0's GraphQL
    // query and the current Testnet GraphQL schema, which removed or hasn't deployed the 'error' field yet.
    const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init && init.body && typeof init.body === 'string') {
        try {
          const bodyObj = JSON.parse(init.body);
          if (bodyObj.query && bodyObj.query.toLowerCase().includes('verifyzkloginsignature')) {
            // Strip out the unsupported 'error' field (not 'errors') requested by the SDK
            bodyObj.query = bodyObj.query.replace(/\berror\b(?!\s*:)/g, '');
            init.body = JSON.stringify(bodyObj);
          }
        } catch (e) {
          // Fallback normally
        }
      }
      return fetch(input, init);
    };

    const client = new SuiGraphQLClient({ url: gqlUrl, network: networkObj, fetch: customFetch });

    // Verify signature directly matches the manufacturer's Sui address
    await verifyPersonalMessageSignature(msg, sigB64, {
      client,
      address: publicKeyEncoded,
    });
    
    return true;
  } catch (e) {
    console.error('[verifySignature] Exception during verifyPersonalMessageSignature:', e);
    return false;
  }
}

export function encodeSignatureToBase64Url(sig: Uint8Array): string {
  const b64 = Buffer.from(sig).toString('base64');
  // base64url
  return b64.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
