import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const est = await prisma.estimate.findFirst({
    where: { projectId: 'cmts9jano00004wv37ds2690d' },
    orderBy: { version: 'desc' },
    include: { items: true }
  });
  if (est) {
    for (const item of est.items) {
      console.log('Item:', item.featureName, '| subtasks:', item.subtasks);
    }
  }
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
