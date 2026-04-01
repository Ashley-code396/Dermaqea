const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const m = await prisma.manufacturer.findFirst();
  console.log(m ? m.id : 'None');
}
main().catch(console.error).finally(() => prisma.$disconnect());
