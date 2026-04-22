const query = `
query verifyZkLoginSignature($bytes: String!, $signature: String!, $intentScope: ZkLoginIntentScope!, $author: SuiAddress!) {
  verifyZkloginSignature(bytes: $bytes, signature: $signature, intentScope: $intentScope, author: $author) {
    success
    errors
    error
  }
}
`;

let replaced = query.replace(/\berror\b(?!\s*:)/g, '');
console.log(replaced);
