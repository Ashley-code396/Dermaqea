import * as nacl from 'tweetnacl';
import { fromBase64, fromHex } from '@mysten/bcs';
import { verifyPersonalMessageSignature } from '@mysten/sui/verify';
import { SuiGraphQLClient } from '@mysten/sui/graphql';

function base64UrlToUint8Array(s: string) {
  // Convert base64url to base64
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  // Pad
  while (s.length % 4) s += '=';
  const bin = Buffer.from(s, 'base64');
  return new Uint8Array(bin);
}

function tryDecodePublicKey(pk: string): Uint8Array | null {
  if (!pk) return null;
  // Common encodings: hex (maybe 32 or 64 chars), 0x-prefixed hex, base64, base64url
  const hex = pk.startsWith('0x') ? pk.slice(2) : pk;
  const isHex = /^[0-9a-fA-F]+$/.test(hex);
  try {
    if (isHex && (hex.length === 64 || hex.length === 32 * 2)) {
      return new Uint8Array(Buffer.from(hex, 'hex'));
    }
  } catch (e) {
    // fallthrough
  }

  // Try base64url/base64
  try {
    return base64UrlToUint8Array(pk);
  } catch (e) {
    // fallthrough
  }

  return null;
}

export async function verifySignature(signatureB64Url: string, payload: string, publicKeyEncoded: string): Promise<boolean> {
  // 1) Try raw Ed25519 detached signature verification (fast, local)
  try {
    const sig = base64UrlToUint8Array(signatureB64Url);
    const pk = tryDecodePublicKey(publicKeyEncoded);
    if (pk) {
      const msg = new TextEncoder().encode(payload);
      try {
        if (nacl.sign.detached.verify(msg, sig, pk as Uint8Array)) return true;
      } catch (e) {
        // fall through to zklogin attempt
      }
    }
  } catch (e) {
    // ignore and try zkLogin path
  }

  // 2) Try zkLogin verification (may require GraphQL client for testnet)
  try {
    const msg = new TextEncoder().encode(payload);
    // The Sui SDK expects the serialized zkLogin signature (string or base64).
    // Our signature may be base64url; convert to base64 string as the SDK accepts either form.
    const sigB64 = signatureB64Url.replace(/-/g, '+').replace(/_/g, '/');

    // Determine if a testnet GraphQL URL is provided
    const gqlUrl = process.env.SUI_GRAPHQL_URL || process.env.SUI_GRAPHQL || '';
    const opts: any = {};
    if (gqlUrl) {
      const network = (process.env.SUI_NETWORK as any) || 'testnet';
      opts.client = new SuiGraphQLClient({ url: gqlUrl, network });
    }

    // verifyPersonalMessageSignature returns a PublicKey instance on success
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- SDK returns a PublicKey-like object; treat as any
  const publicKeyObj: any = await verifyPersonalMessageSignature(msg, sigB64, opts);
    if (!publicKeyObj) return false;

    // If caller provided an address (publicKeyEncoded), verify the address matches
    try {
      // publicKeyEncoded may be an address or raw key; if it's an address, compare directly
      const expected = String(publicKeyEncoded || '').toLowerCase();
      const addr = publicKeyObj.toSuiAddress().toLowerCase();
      if (expected && expected.startsWith('0x')) {
        if (addr !== expected) console.error(`[verifySignature] Address mismatch: recovered ${addr} vs expected ${expected}`);
        return addr === expected;
      }
      // If provided a raw public key bytes, try to decode and compare
      const decoded = tryDecodePublicKey(publicKeyEncoded);
      if (decoded) {
        const pkHex = Buffer.from(publicKeyObj.toRawBytes()).toString('hex');
        const providedHex = Buffer.from(decoded).toString('hex');
        if (pkHex !== providedHex) console.error(`[verifySignature] Pubkey hex mismatch: ${pkHex} vs ${providedHex}`);
        return pkHex === providedHex;
      }

      // Fallback: compare addresses
      if (addr !== expected) console.error(`[verifySignature] Address mismatch fallback: ${addr} vs ${expected}`);
      return addr === expected;
    } catch (e) {
      console.error('[verifySignature] Error comparing addresses:', e);
      return false;
    }
  } catch (e) {
    // All verification attempts failed
    console.error('[verifySignature] Exception during verifyPersonalMessageSignature:', e);
    return false;
  }
}

export function encodeSignatureToBase64Url(sig: Uint8Array): string {
  const b64 = Buffer.from(sig).toString('base64');
  // base64url
  return b64.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
