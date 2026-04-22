const crypto = require('crypto');

function test(originalBase64) {
  // Frontend
  const b64url = originalBase64.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  // Backend
  let sigB64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (sigB64.length % 4 !== 0) sigB64 += '=';
  
  console.log("Original:", originalBase64);
  console.log("Restored:", sigB64);
  console.log("Match:", originalBase64 === sigB64);
}

// simulate typical sui serialized sig size (1 byte flag + 64 bytes sig + 32 bytes pubkey) = 97 bytes
// base64 encodes 97 bytes to ceil(97/3)*4 = 132 chars (no padding, because 97%3 = 1 -> wait!
// 97 / 3 = 32 remainder 1. 32*4 + 4 = 132 bytes.
// With 1 remainder, Base64 result ends with '=='. Length is exactly multiple of 4, meaning 130 chars data + 2 '='.
const randBytes = crypto.randomBytes(97).toString('base64');
test(randBytes);
