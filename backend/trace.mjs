import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PdfReportGenerator } from './dist/reports/generators/pdf-report.generator.js';
import { ReportDataService } from './dist/reports/report-data.service.js';
import PDFDocument from 'pdfkit';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const origAddPage = PDFDocument.prototype.addPage;
PDFDocument.prototype.addPage = function(...args) {
  const err = new Error();
  if (err.stack.includes('continueOnNewPage')) {
    console.log('--- continueOnNewPage triggered! ---');
    console.log(err.stack.split('\n').slice(1, 10).join('\n'));
  }
  return origAddPage.apply(this, args);
};

const project = await prisma.project.findFirst({ where: { estimates: { some: {} } } });
const reportData = await new ReportDataService(prisma).getReportData(project.id);

const gen = new PdfReportGenerator();
await gen.generate(reportData);

await prisma.$disconnect();
await pool.end();
