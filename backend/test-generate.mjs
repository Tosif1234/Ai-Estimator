import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PdfReportGenerator } from './dist/reports/generators/pdf-report.generator.js';
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

  console.log(`Report data loaded. Estimate version: ${data.estimate?.version}, Total Hours: ${data.estimate?.totalHours}`);
  console.log(`Items: ${data.estimate?.items?.length}, Gaps: ${data.gaps?.length}, Questions: ${data.questions?.length}`);

  const generator = new PdfReportGenerator();
  const pdfBuffer = await generator.generate(data);

  fs.writeFileSync('test-output.pdf', pdfBuffer);
  console.log(`Generated PDF saved to test-output.pdf (size: ${pdfBuffer.length} bytes)`);
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
