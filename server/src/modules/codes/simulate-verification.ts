// import { verifySignature } from './crypto.util';
// import { PrismaClient } from '../../prisma/generated/prisma';

// const prisma = new PrismaClient();

// async function run() {
//   const codeRec = await prisma.code.findFirst({
//     orderBy: { generatedAt: 'desc' }
//   });
  
//   if (!codeRec || !codeRec.codeValue) {
//     console.log("No code found");
//     return;
//   }
  
//   const code = codeRec.codeValue;
//   const idx = code.lastIndexOf('.');
//   const payload = code.slice(0, idx);
//   const signature = code.slice(idx + 1);

//   const parts = payload.split('-');
//   const manufacturerId = parts.slice(0, 5).join('-');

//   const manufacturer = await prisma.manufacturer.findUnique({
//     where: { id: manufacturerId }
//   });
  
//   if (manufacturer) {
//     const isValid = await verifySignature(signature, payload, manufacturer.suiWalletAddress);
//     console.log("Verify Result:", isValid);
//   }
// }
// run().catch(console.error);
