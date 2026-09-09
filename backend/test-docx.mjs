import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { WordReportGenerator } from './dist/reports/generators/word-report.generator.js';
import { ReportDataService } from './dist/reports/report-data.service.js';
import fs from 'fs';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const project = await prisma.project.findFirst({
    where: { estimates: { some: {} } },
  });

  if (!project) {
    console.log('No project found with estimate');
    return;
  }

  console.log(`Found project: "${project.name}" (${project.id})`);
  const reportDataService = new ReportDataService(prisma);
  const data = await reportDataService.getReportData(project.id);

  const generator = new WordReportGenerator();
  const docxBuffer = await generator.generate(data);

  fs.writeFileSync('test-output.docx', docxBuffer);
  console.log(`Generated Word document saved to test-output.docx (${docxBuffer.length} bytes)`);
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
