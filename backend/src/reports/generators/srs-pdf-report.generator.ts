import PDFDocument from 'pdfkit';
import { ReportData } from '../types/report-data.types.js';

export class SrsPdfReportGenerator {
  private readonly brandColor = '#4F39F6';       // Primary Nav Purple
  private readonly brandDark = '#312E81';        // Deep Indigo
  private readonly darkText = '#0F172A';         // Slate 900
  private readonly bodyText = '#334155';         // Slate 700
  private readonly mutedText = '#64748B';        // Slate 500
  private readonly lightBg = '#F8FAFC';          // Slate 50
  private readonly cardBorder = '#E2E8F0';       // Slate 200
  private readonly accentBg = '#EEF2FF';         // Indigo 50
  private readonly emeraldColor = '#059669';     // Emerald 600

  async generate(data: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 45, bottom: 45, left: 45, right: 45 },
        bufferPages: true,
        info: {
          Title: `SRS - ${data.project.name}`,
          Author: 'AI Estimator',
          Subject: 'Software Requirement Specification (SRS)',
          Keywords: 'SRS, Requirements, Architecture, Estimation',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      try {
        this.buildDocument(doc, data);
      } catch (err) {
        reject(err);
      }
    });
  }

  private buildDocument(doc: PDFKit.PDFDocument, data: ReportData) {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 45;
    const contentWidth = pageWidth - margin * 2; // 505.28
    const maxY = pageHeight - margin - 20; // 776.89

    const checkPageBreak = (neededHeight: number) => {
      if (doc.y + neededHeight > maxY) {
        doc.addPage();
        doc.y = margin + 15;
      }
    };

    // ==========================================
    // 1. COVER / HEADER BLOCK
    // ==========================================
    // Top colored accent bar
    doc.rect(margin, margin, contentWidth, 4).fill(this.brandColor);
    doc.y = margin + 14;

    // Brand tag
    doc
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .fillColor(this.brandColor)
      .text('AI ESTIMATOR  •  SOFTWARE REQUIREMENT SPECIFICATION (SRS)', margin, doc.y, {
        characterSpacing: 0.8,
      });

    doc.moveDown(0.3);

    // Title: Project Name
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor(this.darkText)
      .text(data.project.name, margin, doc.y, { width: contentWidth });

    doc.moveDown(0.2);

    // Subtitle
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(this.mutedText)
      .text('Baseline Architectural Scope & Functional Specification', margin, doc.y);

    doc.moveDown(0.7);

    // Metadata Grid Box (2 columns)
    const metaY = doc.y;
    const metaBoxHeight = 58;
    doc
      .roundedRect(margin, metaY, contentWidth, metaBoxHeight, 6)
      .fillAndStroke(this.lightBg, this.cardBorder);

    const col1X = margin + 14;
    const col2X = margin + contentWidth / 2 + 10;
    const metaTextY = metaY + 10;

    const completeness = data.requirement?.completenessScore ?? 100;
    const projectType = data.analysis?.projectType || 'Software Application';
    const clientInfo = data.project.clientName
      ? `${data.project.clientName} (${data.project.clientEmail || 'Client'})`
      : data.project.clientEmail || 'Client Workspace';
    const dateFormatted = new Date(data.project.updatedAt || new Date()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Col 1
    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor(this.mutedText)
      .text('PREPARED FOR', col1X, metaTextY)
      .font('Helvetica')
      .fontSize(9)
      .fillColor(this.darkText)
      .text(clientInfo, col1X, metaTextY + 10, { width: contentWidth / 2 - 20, lineBreak: false, ellipsis: true })
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor(this.mutedText)
      .text('SPECIFICATION BASELINE', col1X, metaTextY + 26)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(this.emeraldColor)
      .text('ACTIVE APPROVED BASELINE', col1X, metaTextY + 36);

    // Col 2
    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor(this.mutedText)
      .text('SPECIFICATION DATE', col2X, metaTextY)
      .font('Helvetica')
      .fontSize(9)
      .fillColor(this.darkText)
      .text(dateFormatted, col2X, metaTextY + 10)
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor(this.mutedText)
      .text('CLASSIFICATION & READINESS', col2X, metaTextY + 26)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(this.darkText)
      .text(`${projectType}  •  ${completeness}% Complete`, col2X, metaTextY + 36);

    doc.y = metaY + metaBoxHeight + 16;

    // Helper to render section title banners
    const renderSectionHeader = (title: string, num: string) => {
      checkPageBreak(35);
      doc.moveDown(0.3);
      const headerY = doc.y;

      // Small badge box for section number
      doc
        .roundedRect(margin, headerY, 20, 17, 3)
        .fillAndStroke(this.accentBg, this.cardBorder);

      doc
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor(this.brandColor)
        .text(num, margin, headerY + 4, { width: 20, align: 'center', lineBreak: false });

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(this.darkText)
        .text(title, margin + 28, headerY + 3);

      doc.y = headerY + 22;
    };

    // ==========================================
    // 2. PARSED REQUIREMENTS CONTENT
    // ==========================================
    const rawText = data.requirement?.rawText?.trim() || '';

    if (rawText) {
      // Check if text starts with markdown headers
      const lines = rawText.split('\n');
      let sectionCounter = 1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          doc.moveDown(0.3);
          continue;
        }

        // Title line (# ...)
        if (line.startsWith('# ')) {
          const title = line.replace(/^#\s+/, '');
          // If title is just project scope repeat, render as section 01
          renderSectionHeader(title, `0${sectionCounter++}`);
        }
        // Section Header (## ...)
        else if (line.startsWith('## ')) {
          const subTitle = line.replace(/^##\s+/, '');
          renderSectionHeader(subTitle, sectionCounter < 10 ? `0${sectionCounter++}` : `${sectionCounter++}`);
        }
        // Sub-heading (### ...)
        else if (line.startsWith('### ')) {
          checkPageBreak(25);
          doc.moveDown(0.3);
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor(this.brandDark)
            .text(line.replace(/^###\s+/, ''), margin, doc.y);
          doc.moveDown(0.2);
        }
        // Bullet item (* ... or - ...)
        else if (line.startsWith('* ') || line.startsWith('- ')) {
          checkPageBreak(16);
          const bulletText = line.replace(/^[\*\-]\s+/, '');

          // Draw small purple bullet circle
          doc
            .circle(margin + 6, doc.y + 5, 2)
            .fill(this.brandColor);

          // Check if bullet starts with bold prefix (**Name:** or **Name**)
          const boldMatch = bulletText.match(/^\*\*(.*?)\*\*(.*)/);
          if (boldMatch) {
            doc
              .fontSize(9)
              .font('Helvetica-Bold')
              .fillColor(this.darkText)
              .text(boldMatch[1], margin + 16, doc.y, { continued: true })
              .font('Helvetica')
              .fillColor(this.bodyText)
              .text(boldMatch[2], { lineGap: 2.5 });
          } else {
            doc
              .fontSize(9)
              .font('Helvetica')
              .fillColor(this.bodyText)
              .text(bulletText, margin + 16, doc.y, { lineGap: 2.5 });
          }
        }
        // Regular paragraph
        else {
          checkPageBreak(20);
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor(this.bodyText)
            .text(line, margin, doc.y, { lineGap: 2.5 });
        }
      }
    } else {
      renderSectionHeader('Executive Scope & Statement', '01');
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.bodyText)
        .text('No formal specification recorded.', margin, doc.y);
    }

    doc.moveDown(0.6);

    // ==========================================
    // 3. ARCHITECTURAL DECOMPOSITION (MODULES & FEATURES)
    // ==========================================
    if (data.analysis?.modules && data.analysis.modules.length > 0) {
      renderSectionHeader('System Architecture & Functional Decomposition', 'A');

      const modules = data.analysis.modules;
      modules.forEach((mod, idx) => {
        // Calculate needed height for this module block
        const modTitleHeight = 22;
        const featuresHeight = mod.features.length * 15;
        const totalModHeight = modTitleHeight + featuresHeight + 10;

        checkPageBreak(totalModHeight);

        const modY = doc.y;

        // Module Box
        doc
          .roundedRect(margin, modY, contentWidth, totalModHeight, 5)
          .fillAndStroke('#FFFFFF', this.cardBorder);

        // Module Strip Header
        doc
          .roundedRect(margin, modY, contentWidth, 22, 5)
          .fill(this.accentBg);
        doc.rect(margin, modY + 16, contentWidth, 6).fill(this.accentBg);

        doc
          .moveTo(margin, modY + 22)
          .lineTo(margin + contentWidth, modY + 22)
          .lineWidth(0.5)
          .strokeColor(this.cardBorder)
          .stroke();

        // Module Title
        doc
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .fillColor(this.brandDark)
          .text(`Module ${idx + 1}: ${mod.name}`, margin + 10, modY + 6);

        // Feature count pill
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor(this.mutedText)
          .text(
            `${mod.features.length} ${mod.features.length === 1 ? 'feature' : 'features'}`,
            margin,
            modY + 6,
            { width: contentWidth - 10, align: 'right' }
          );

        // Features list
        let curItemY = modY + 28;
        mod.features.forEach((feat) => {
          doc.fontSize(8.5).font('Helvetica');
          const fHeight = doc.heightOfString(feat, { width: contentWidth - 34, lineGap: 2 });

          doc
            .circle(margin + 12, curItemY + 5, 2)
            .fill(this.brandColor);

          doc
            .fontSize(8.5)
            .font('Helvetica')
            .fillColor(this.bodyText)
            .text(feat, margin + 22, curItemY, { width: contentWidth - 34, lineGap: 2 });

          curItemY += fHeight + 4;
        });

        doc.y = modY + totalModHeight + 8;
      });
    }

    doc.moveDown(0.4);

    // ==========================================
    // 4. INTEGRATIONS & ASSUMPTIONS (2-Column Grid)
    // ==========================================
    const integrations = data.analysis?.integrations ?? [];
    const assumptions = data.analysis?.assumptions ?? [];

    if (integrations.length > 0 || assumptions.length > 0) {
      renderSectionHeader('Technical Integrations & Architectural Boundaries', 'B');

      const colWidth = (contentWidth - 12) / 2;
      const intText = integrations.length > 0
        ? integrations.map((i) => `• ${i}`).join('\n')
        : '• Cloud Object Storage API\n• Modern Web & REST API Architecture\n• Standard SSL/TLS Encryption';

      const assText = assumptions.length > 0
        ? assumptions.map((a) => `• ${a}`).join('\n')
        : '• Responsive design supporting Mobile, Tablet & Desktop\n• Cross-browser support (Chrome, Safari, Firefox, Edge)\n• High-availability cloud deployment';

      const intHeight = Math.max(55, doc.heightOfString(intText, { width: colWidth - 20 }) + 26);
      const assHeight = Math.max(55, doc.heightOfString(assText, { width: colWidth - 20 }) + 26);
      const rowHeight = Math.max(intHeight, assHeight);

      checkPageBreak(rowHeight + 10);
      const boxY = doc.y;

      // Integrations Box (Left)
      doc
        .roundedRect(margin, boxY, colWidth, rowHeight, 5)
        .fillAndStroke(this.lightBg, this.cardBorder);

      doc
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .fillColor(this.brandDark)
        .text('EXTERNAL INTEGRATIONS & SERVICES', margin + 10, boxY + 8);

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(this.bodyText)
        .text(intText, margin + 10, boxY + 20, {
          width: colWidth - 20,
          lineGap: 2.5,
        });

      // Assumptions Box (Right)
      const assX = margin + colWidth + 12;
      doc
        .roundedRect(assX, boxY, colWidth, rowHeight, 5)
        .fillAndStroke(this.lightBg, this.cardBorder);

      doc
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .fillColor(this.brandDark)
        .text('TECHNICAL ASSUMPTIONS & CONSTRAINTS', assX + 10, boxY + 8);

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(this.bodyText)
        .text(assText, assX + 10, boxY + 20, {
          width: colWidth - 20,
          lineGap: 2.5,
        });

      doc.y = boxY + rowHeight + 14;
    }

    // ==========================================
    // 5. CLARIFICATIONS CONFIRMATION LOG
    // ==========================================
    const answeredQuestions = (data.questions ?? []).filter((q) => q.status === 'ANSWERED');

    if (answeredQuestions.length > 0) {
      renderSectionHeader('Stakeholder Clarifications & Confirmations Log', 'C');

      const textWidth = contentWidth - 38;

      answeredQuestions.forEach((q, idx) => {
        // Dynamically compute question text height
        doc.fontSize(8.5).font('Helvetica-Bold');
        const qTextHeight = doc.heightOfString(q.question, { width: textWidth, lineGap: 2 });

        // Dynamically compute answer text height
        doc.fontSize(8.5).font('Helvetica');
        const answerText = q.answer || 'Confirmed as specified';
        const aTextHeight = doc.heightOfString(answerText, { width: textWidth, lineGap: 2 });

        const padTop = 8;
        const padBottom = 8;
        const gapBetween = 5;
        const totalCardHeight = padTop + qTextHeight + gapBetween + aTextHeight + padBottom;

        checkPageBreak(totalCardHeight + 6);
        const cardY = doc.y;

        doc
          .roundedRect(margin, cardY, contentWidth, totalCardHeight, 5)
          .fillAndStroke('#FFFFFF', this.cardBorder);

        // Draw Question Label & Text
        const qY = cardY + padTop;
        doc
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .fillColor(this.brandColor)
          .text(`Q${idx + 1}:`, margin + 8, qY, { width: 22, lineBreak: false });

        doc
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .fillColor(this.darkText)
          .text(q.question, margin + 30, qY, { width: textWidth, lineGap: 2 });

        // Draw Answer Label & Text strictly below question
        const aY = qY + qTextHeight + gapBetween;
        doc
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .fillColor(this.emeraldColor)
          .text('A:', margin + 8, aY, { width: 22, lineBreak: false });

        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor(this.bodyText)
          .text(answerText, margin + 30, aY, { width: textWidth, lineGap: 2 });

        doc.y = cardY + totalCardHeight + 6;
      });

      doc.moveDown(0.4);
    }

    // ==========================================
    // 6. ENGINEERING EFFORT CALIBRATION (IF PRESENT)
    // ==========================================
    if (data.estimate) {
      renderSectionHeader('Calibrated Engineering Effort Baseline', 'D');

      checkPageBreak(40);
      const estY = doc.y;
      doc
        .roundedRect(margin, estY, contentWidth, 38, 5)
        .fillAndStroke(this.accentBg, this.cardBorder);

      doc
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor(this.brandDark)
        .text(`Calibrated Estimate Baseline: Version ${data.estimate.version}`, margin + 12, estY + 8)
        .font('Helvetica')
        .fontSize(8)
        .fillColor(this.bodyText)
        .text(`Total Scoped Engineering Effort: `, margin + 12, estY + 21, { continued: true })
        .font('Helvetica-Bold')
        .fillColor(this.darkText)
        .text(`${data.estimate.totalHours} hours  `, { continued: true })
        .font('Helvetica')
        .fillColor(this.mutedText)
        .text(`across ${data.estimate.items.length} itemized architectural features.`);

      doc.y = estY + 38 + 10;
    }

    // ==========================================
    // 7. RUNNING HEADERS & FOOTERS (Zero Blank Pages Pass)
    // ==========================================
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      // Disable bottom margin so writing at the bottom NEVER triggers a new page
      doc.page.margins.bottom = 0;

      // Running Header (pages 2+)
      if (i > 0) {
        doc
          .fontSize(7)
          .font('Helvetica-Bold')
          .fillColor(this.mutedText)
          .text('AI ESTIMATOR  •  SOFTWARE REQUIREMENT SPECIFICATION (SRS)', margin, 20, {
            lineBreak: false,
          });

        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor(this.mutedText)
          .text(data.project.name, margin, 20, {
            width: contentWidth,
            align: 'right',
            lineBreak: false,
          });

        doc
          .moveTo(margin, 30)
          .lineTo(margin + contentWidth, 30)
          .lineWidth(0.5)
          .strokeColor(this.cardBorder)
          .stroke();
      }

      // Running Footer (on all pages)
      const footerLineY = pageHeight - 32;
      const footerTextY = pageHeight - 22;

      doc
        .moveTo(margin, footerLineY)
        .lineTo(margin + contentWidth, footerLineY)
        .lineWidth(0.5)
        .strokeColor(this.cardBorder)
        .stroke();

      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor(this.mutedText)
        .text('Confidential  •  Generated by AI Estimator', margin, footerTextY, {
          lineBreak: false,
        });

      doc
        .fontSize(7)
        .font('Helvetica-Bold')
        .fillColor(this.mutedText)
        .text(`Page ${i + 1} of ${totalPages}`, margin, footerTextY, {
          width: contentWidth,
          align: 'right',
          lineBreak: false,
        });
    }

    doc.end();
  }
}
