const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { verifyPersonalMessageSignature } = require('@mysten/sui/verify');

async function run() {
  const keypair = new Ed25519Keypair();
  const address = keypair.toSuiAddress();
  console.log("Address:", address);

  const payload = 'manufacturerId-productId-nonce123';
  const msg = new TextEncoder().encode(payload);

  const { signature } = await keypair.signPersonalMessage(msg);
  console.log("Signature:", signature);

  // Convert to base64url and back to simulate my flow
  const b64url = signature.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  let sigB64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (sigB64.length % 4 !== 0) sigB64 += '=';

  try {
    const pk = await verifyPersonalMessageSignature(msg, sigB64, { address });
    console.log("Verified successfully. Recovered PK:", pk.toSuiAddress());
  } catch (e) {
    console.error("Verification failed:", e);
  }
}
run();
