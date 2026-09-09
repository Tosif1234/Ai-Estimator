import { Injectable, BadRequestException } from '@nestjs/common';
import { ReportDataService } from './report-data.service.js';
import { ExcelReportGenerator } from './generators/excel-report.generator.js';
import { SrsPdfReportGenerator } from './generators/srs-pdf-report.generator.js';

@Injectable()
export class ReportsService {
  constructor(private readonly reportDataService: ReportDataService) {}

  async generateReport(
    projectId: string,
    format: string,
    version?: number,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const normFormat = format?.toLowerCase();

    if (normFormat !== 'excel' && normFormat !== 'xlsx' && normFormat !== 'pdf' && normFormat !== 'srs-pdf') {
      throw new BadRequestException('Supported report formats are Excel (.xlsx) and SRS Document (.pdf).');
    }

    const data = await this.reportDataService.getReportData(projectId, version);

    const safeProjectName = data.project.name
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .substring(0, 50) || 'Project';

    // Handle PDF SRS Generation
    if (normFormat === 'pdf' || normFormat === 'srs-pdf') {
      if (!data.requirement && !data.analysis) {
        throw new BadRequestException('No requirement specification found for this project.');
      }
      const buffer = await new SrsPdfReportGenerator().generate(data);
      const filename = `AI-Estimator_${safeProjectName}_SRS_Specification.pdf`;
      const contentType = 'application/pdf';
      return { buffer, filename, contentType };
    }

    // Handle Excel Technical Workbook Generation
    if (!data.estimate) {
      throw new BadRequestException('No estimate found for this project. Generate an estimate before downloading an Excel report.');
    }

    const versionTag = `V${data.estimate.version}`;
    const buffer = await new ExcelReportGenerator().generate(data);
    const filename = `AI-Estimator_${safeProjectName}_${versionTag}_Report.xlsx`;
    const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return { buffer, filename, contentType };
  }
}
