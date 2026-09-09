import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PdfReportGenerator } from './dist/reports/generators/pdf-report.generator.js';
import { ReportDataService } from './dist/reports/report-data.service.js';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const project = await prisma.project.findFirst({
    where: { estimates: { some: {} } },
  });

  const reportDataService = new ReportDataService(prisma);
  const data = await reportDataService.getReportData(project.id);

  const generator = new PdfReportGenerator();
  
  // Intercept generate by overriding doc creation or running
  const origGen = generator.generate.bind(generator);
  
  // Let's inspect by instrumenting generator
  const buf = await origGen(data);
  console.log('Finished. Buffer length:', buf.length);
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
