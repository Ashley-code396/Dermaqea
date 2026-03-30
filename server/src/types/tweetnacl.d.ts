// Minimal ambient declaration for tweetnacl when @types/tweetnacl is not available.
// Treats the module as `any` to avoid type errors. Replace with proper
// definitions if/when a maintained @types package is available.
declare module 'tweetnacl' {
  const nacl: any;
  export = nacl;
}
