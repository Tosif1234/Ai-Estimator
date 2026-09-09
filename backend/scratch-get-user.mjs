import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ include: { projects: true } });
  for (const user of users) {
    if (user.projects.length > 0) {
      console.log(`User: ${user.email}, Password: Password123! (assumed), Project: ${user.projects[0].id}`);
      break;
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
