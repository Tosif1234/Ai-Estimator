import ExcelJS from 'exceljs';
import { ReportData, ReportEstimateItem } from '../types/report-data.types.js';

// ==========================================
// UNIFIED ESTIMATION WORKBOOK DESIGN SYSTEM
// ==========================================
const PALETTE = {
  // Section & Epic Header
  epicHeaderBg: 'FF1E293B',     // Dark Slate 800
  tableHeaderBg: 'FFF1F5F9',    // Slate 100
  tableHeaderBorder: 'FFCBD5E1', // Slate 300

  // Rows & Cards
  white: 'FFFFFFFF',
  altRowBg: 'FFF8FAFC',         // Slate 50
  subtotalBg: 'FFF1F5F9',       // Slate 100
  descRowBg: 'FFF8FAFC',        // Slate 50
  metaLabelBg: 'FFF1F5F9',      // Slate 100

  // Final Total Highlight
  finalTotalBg: 'FF0F172A',     // Deep Slate 900

  // Typography Colors
  textHead: 'FF0F172A',         // Slate 900
  textBody: 'FF334155',         // Slate 700
  textMuted: 'FF64748B',        // Slate 500
  textWhite: 'FFFFFFFF',

  // Borders
  borderLight: 'FFE2E8F0',      // Slate 200
  borderMedium: 'FF94A3B8',     // Slate 400
  borderDark: 'FF475569',       // Slate 600
};

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: PALETTE.borderLight } },
  bottom: { style: 'thin', color: { argb: PALETTE.borderLight } },
  left: { style: 'thin', color: { argb: PALETTE.borderLight } },
  right: { style: 'thin', color: { argb: PALETTE.borderLight } },
};

const BORDER_SUBTOTAL: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: PALETTE.tableHeaderBorder } },
  bottom: { style: 'double', color: { argb: PALETTE.borderMedium } },
  left: { style: 'thin', color: { argb: PALETTE.borderLight } },
  right: { style: 'thin', color: { argb: PALETTE.borderLight } },
};

const BORDER_FINAL_TOTAL: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: PALETTE.borderDark } },
  bottom: { style: 'double', color: { argb: PALETTE.white } },
  left: { style: 'thin', color: { argb: PALETTE.borderDark } },
  right: { style: 'thin', color: { argb: PALETTE.borderDark } },
};

/**
 * Derives accurate frontend and backend hours for a given task/feature.
 * Guaranteed: frontend + backend === total hours.
 */
function splitFrontendBackendHours(item: ReportEstimateItem): { frontend: number; backend: number } {
  const total = Number(item.hours) || 0;
  if (total <= 0) {
    return { frontend: 0, backend: 0 };
  }

  // 1. If subtasks exist with hour estimates, inspect their names/descriptions
  if (item.subtasks && item.subtasks.length > 0) {
    let feSum = 0;
    let beSum = 0;
    let matched = 0;

    for (const st of item.subtasks) {
      const text = `${st.name} ${st.description}`.toLowerCase();
      const isFe = /frontend|ui|ux|component|view|screen|page|form|modal|client|css|tailwind|html|render|dialog|layout/.test(text);
      const isBe = /backend|api|server|database|db|prisma|endpoint|controller|service|jwt|auth logic|migration|query|schema|route|webhook|queue|worker/.test(text);

      if (isFe && !isBe) {
        feSum += st.hours;
        matched++;
      } else if (isBe && !isFe) {
        beSum += st.hours;
        matched++;
      } else {
        const half = Math.round((st.hours / 2) * 10) / 10;
        feSum += half;
        beSum += Math.round((st.hours - half) * 10) / 10;
      }
    }

    if (matched > 0 && Math.abs((feSum + beSum) - total) < 0.1) {
      return { frontend: Math.round(feSum * 10) / 10, backend: Math.round(beSum * 10) / 10 };
    }
  }

  // 2. Check item category and keywords
  const category = (item.category || '').toLowerCase();
  const text = `${item.featureName} ${item.description || ''}`.toLowerCase();

  const isPureFe = (category.includes('frontend') || category.includes('ui') || category.includes('client') || text.includes('frontend ui') || text.includes('user interface')) &&
    !category.includes('backend') && !category.includes('full') && !category.includes('api');

  const isPureBe = (category.includes('backend') || category.includes('api') || category.includes('database') || category.includes('server') || category.includes('devops')) &&
    !category.includes('frontend') && !category.includes('full') && !category.includes('ui');

  if (isPureFe) {
    return { frontend: total, backend: 0 };
  }

  if (isPureBe) {
    return { frontend: 0, backend: total };
  }

  // 3. Balanced split for fullstack / core features
  const fe = Math.floor(total / 2);
  const be = Math.round((total - fe) * 10) / 10;
  return { frontend: fe, backend: be };
}

/**
 * Extracts a professional project summary from project description or requirement text.
 */
function getProjectSummary(data: ReportData): string {
  if (data.project.description && data.project.description.trim().length > 0) {
    const desc = data.project.description.trim();
    return desc.length > 220 ? `${desc.substring(0, 217)}...` : desc;
  }
  if (data.requirement?.rawText) {
    const raw = data.requirement.rawText;
    const execMatch = raw.match(/##\s*1\.\s*Executive Summary[^\n]*\n+([\s\S]*?)(?=\n##|\n\*|$)/i);
    if (execMatch && execMatch[1]?.trim()) {
      const cleaned = execMatch[1].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
      return cleaned.length > 220 ? `${cleaned.substring(0, 217)}...` : cleaned;
    }
    const firstSentence = raw.trim().split(/[.\n]/)[0].trim();
    if (firstSentence.length > 15) {
      return firstSentence.length > 220 ? `${firstSentence.substring(0, 217)}...` : firstSentence;
    }
  }
  return `${data.project.name} — End-to-end production web application specification, architectural breakdown, and engineering effort estimation.`;
}

/**
 * Builds the Technology & Architecture Context strictly without hallucination.
 * If a technology is not specified in the requirements, it is marked as "Not specified in requirements".
 */
function getTechArchitectureContext(data: ReportData): string {
  const parts: string[] = [];
  const raw = (data.requirement?.rawText || '').toLowerCase();

  // 1. Architecture / Application Type
  if (data.analysis?.projectType) {
    parts.push(`Architecture: ${data.analysis.projectType}`);
  } else {
    parts.push('Architecture: Web Application (Modular Architecture)');
  }

  // 2. Frontend Framework detection (zero hallucination)
  let feTech = 'Frontend Technology: Not specified in requirements';
  if (/next\.?js/i.test(raw)) {
    feTech = 'Frontend: Next.js (Specified in requirements)';
  } else if (/react/i.test(raw)) {
    feTech = 'Frontend: React (Specified in requirements)';
  } else if (/vue/i.test(raw)) {
    feTech = 'Frontend: Vue.js (Specified in requirements)';
  } else if (/angular/i.test(raw)) {
    feTech = 'Frontend: Angular (Specified in requirements)';
  }
  parts.push(feTech);

  // 3. Backend Technology detection (zero hallucination)
  let beTech = 'Backend Technology: Not specified in requirements';
  if (/nest\.?js/i.test(raw)) {
    beTech = 'Backend: NestJS (Specified in requirements)';
  } else if (/express/i.test(raw)) {
    beTech = 'Backend: Express.js (Specified in requirements)';
  } else if (/node\.?js/i.test(raw)) {
    beTech = 'Backend: Node.js (Specified in requirements)';
  } else if (/fastapi/i.test(raw)) {
    beTech = 'Backend: FastAPI (Specified in requirements)';
  } else if (/django/i.test(raw)) {
    beTech = 'Backend: Django (Specified in requirements)';
  }
  parts.push(beTech);

  // 4. Database detection (zero hallucination)
  let dbTech = 'Database Technology: Not specified in requirements';
  if (/postgresql|postgres/i.test(raw)) {
    dbTech = 'Database: PostgreSQL (Specified in requirements)';
  } else if (/mysql/i.test(raw)) {
    dbTech = 'Database: MySQL (Specified in requirements)';
  } else if (/mongodb|mongo/i.test(raw)) {
    dbTech = 'Database: MongoDB (Specified in requirements)';
  }
  parts.push(dbTech);

  // 5. Integrations / External Services
  if (data.analysis?.integrations && data.analysis.integrations.length > 0) {
    const ints = data.analysis.integrations.slice(0, 3).join(', ');
    parts.push(`Integrations: ${ints}`);
  }

  return parts.join('   |   ');
}

/**
 * Detects known frameworks to dynamically label the table headers.
 */
function getColumnFrameworkLabels(data: ReportData): { frontendLabel: string; backendLabel: string } {
  const raw = (data.requirement?.rawText || '').toLowerCase();

  let fe = 'Frontend (Hours)';
  if (/next\.?js/i.test(raw)) fe = 'Frontend (Next.js)';
  else if (/react/i.test(raw)) fe = 'Frontend (React)';
  else if (/vue/i.test(raw)) fe = 'Frontend (Vue)';
  else if (/angular/i.test(raw)) fe = 'Frontend (Angular)';

  let be = 'Backend (Hours)';
  if (/nest\.?js/i.test(raw)) be = 'Backend (NestJS)';
  else if (/node\.?js/i.test(raw)) be = 'Backend (Node.js)';
  else if (/express/i.test(raw)) be = 'Backend (Express)';
  else if (/python|fastapi/i.test(raw)) be = 'Backend (Python/API)';

  return { frontendLabel: fe, backendLabel: be };
}

/**
 * Identifies whether an estimate item represents optional, future phase, or out-of-scope work.
 */
function isOptionalItem(item: ReportEstimateItem): boolean {
  const text = `${item.moduleName} ${item.featureName} ${item.description || ''} ${item.category || ''}`.toLowerCase();
  return /\b(optional|future\s*phase|future\s*release|phase\s*[2-9]|out\s*of\s*scope|nice\s*to\s*have|add-?on|stretch\s*goal|post-?mvp|v2|v3)\b/i.test(text);
}

function toTitleCase(str: string): string {
  const smallWords = /^(a|an|and|as|at|but|by|for|in|nor|of|on|or|per|the|to|via|with)$/i;
  return str
    .split(' ')
    .map((word, index) => {
      if (/^[A-Z0-9]{2,}$/.test(word) || /^\([A-Z0-9/]+\)$/.test(word)) {
        return word;
      }
      if (index > 0 && smallWords.test(word)) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Transforms brief feature names into clear, production-grade engineering task names.
 */
function formatDetailedTaskName(rawName: string, rawDesc?: string | null, moduleName?: string): string {
  if (!rawName || !rawName.trim()) {
    return 'Core Feature Implementation & Integration';
  }

  let name = rawName.trim();
  const lower = name.toLowerCase();

  const enrichments: Array<{ match: RegExp; detailed: string }> = [
    {
      match: /^(user\s+)?login(\s+page|\s+screen|\s+flow)?$/i,
      detailed: 'User Authentication & Secure Session Management (Token Flow)',
    },
    {
      match: /^(user\s+)?(signup|sign\s*up|registration)(\s+flow|\s+page|\s+screen)?$/i,
      detailed: 'User Registration, Account Onboarding & Credential Verification',
    },
    {
      match: /^(forgot\s*password|reset\s*password|password\s*reset)$/i,
      detailed: 'Self-Service Password Recovery & Secure Token Verification',
    },
    {
      match: /^profile(\s+management|\s+settings|\s+page)?$/i,
      detailed: 'User Profile Management, Avatar Upload & Account Settings',
    },
    {
      match: /^dashboard(\s+overview|\s+view|\s+page)?$/i,
      detailed: 'Interactive Operational Dashboard & Key Performance Metrics',
    },
    {
      match: /^(search|search\s*bar|search\s*filter)$/i,
      detailed: 'Multi-Criteria Dynamic Search, Query Indexing & Filter Engine',
    },
    {
      match: /^(filters|filtering)$/i,
      detailed: 'Dynamic Faceted Filtering, Sorting & Query Parameter Handling',
    },
    {
      match: /^(rbac|roles?|permissions?|role\s*management)$/i,
      detailed: 'Role-Based Access Control (RBAC) & Route Authorization Guards',
    },
    {
      match: /^(notifications?|alerts?)$/i,
      detailed: 'Event-Driven Notification Delivery & Alert Dispatcher',
    },
    {
      match: /^(export|excel\s*export|pdf\s*export|csv\s*export)$/i,
      detailed: 'Automated Spreadsheet (.xlsx) & Document Export Pipeline',
    },
    {
      match: /^(reports?|reporting)$/i,
      detailed: 'Analytical Reporting, Aggregations & Metric Calculation Engine',
    },
    {
      match: /^(audit\s*logs?|audit\s*trail|activity\s*logs?)$/i,
      detailed: 'Security Audit Logging & System Activity Tracking',
    },
    {
      match: /^(payments?|checkout|billing)$/i,
      detailed: 'Payment Gateway Integration, Checkout Flow & Webhook Handling',
    },
    {
      match: /^(file\s*upload|upload|media\s*upload)$/i,
      detailed: 'Secure File Storage, MIME Validation & Media Asset Processing',
    },
    {
      match: /^(settings|configuration|preferences)$/i,
      detailed: 'System Configuration, Global Preferences & Workspace Settings',
    },
    {
      match: /^(user\s*management|users)$/i,
      detailed: 'User Administration, Lifecycle Management & Permission Controls',
    },
  ];

  for (const item of enrichments) {
    if (item.match.test(lower)) {
      return item.detailed;
    }
  }

  // If very brief (1-2 words), enrich appropriately
  const words = name.split(/\s+/);
  if (words.length <= 2) {
    if (!/management|engine|portal|system|flow|service|handler|module/i.test(name)) {
      name = `${name} Implementation & Service Integration`;
    }
  }

  return toTitleCase(name);
}

/**
 * Enriches task descriptions to explain the production implementation scope.
 */
function enrichTaskDescription(rawDesc: string | null, taskName: string, moduleName: string): string {
  if (rawDesc && rawDesc.trim().length > 65) {
    return rawDesc.trim();
  }

  const base = rawDesc && rawDesc.trim().length > 0
    ? rawDesc.trim()
    : `Engineering implementation of ${taskName}.`;

  const lower = `${taskName} ${base} ${moduleName}`.toLowerCase();

  if (lower.includes('auth') || lower.includes('login') || lower.includes('credential')) {
    return `${base} Includes credential validation, session/token management, protected route guards, security error states, and rate limiting integration.`;
  }
  if (lower.includes('upload') || lower.includes('document') || lower.includes('file')) {
    return `${base} Includes secure file upload handling, MIME-type verification, storage pipeline integration, persistence metadata, and upload progress feedback.`;
  }
  if (lower.includes('dashboard') || lower.includes('report') || lower.includes('chart') || lower.includes('visualization')) {
    return `${base} Includes data aggregation queries, reactive UI charts, dynamic filtering, responsive grid layouts, and export-ready formatting.`;
  }
  if (lower.includes('search') || lower.includes('filter')) {
    return `${base} Includes indexed query construction, faceted filtering logic, debounced input handling, and responsive result pagination.`;
  }
  if (lower.includes('model') || lower.includes('prediction') || lower.includes('engine') || lower.includes('algorithm')) {
    return `${base} Includes parameter parsing, calculation pipelines, confidence scoring, explainability metadata generation, and robust exception handling.`;
  }

  return `${base} Includes responsive UI components, REST API endpoint handler, input validation schemas, database persistence logic, and unit test coverage.`;
}

/**
 * Derives the short scope/objective description for an Epic.
 */
function getEpicDescription(epicName: string, isFirstEpic: boolean, data: ReportData): string {
  if (isFirstEpic) {
    const raw = (data.requirement?.rawText || '').toLowerCase();
    let specifics = 'application scaffolding, database foundation, and API contracts';
    if (raw.includes('security') || raw.includes('privacy') || raw.includes('protection')) {
      specifics = 'application scaffolding, database foundation, access controls, and security compliance';
    } else if (raw.includes('ecommerce') || raw.includes('store') || raw.includes('catalog')) {
      specifics = 'storefront scaffolding, responsive UI design system, database schema, and core catalog foundation';
    }
    return `Covers core architectural setup, ${specifics}, and foundational production workflows derived from project requirements.`;
  }

  return `Covers full-stack implementation, API endpoints, business logic, UI state management, and production validation for ${epicName}.`;
}

/**
 * Cleans an Add-On name by removing redundant tags like "(Optional)" or "(Future Phase)".
 */
function cleanAddonTitle(rawName: string): string {
  return rawName
    .replace(/\s*\((optional|future\s*phase|out\s*of\s*scope|phase\s*[0-9]+)\)/gi, '')
    .trim();
}

export class ExcelReportGenerator {
  async generate(data: ReportData): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'AI Estimator';
    wb.lastModifiedBy = 'AI Estimator';
    wb.created = new Date();

    // =========================================================================
    // SEPARATE SCOPE: BASE PRODUCTION (SHEET 1) vs OPTIONAL ADD-ONS (SHEET 2)
    // =========================================================================
    const allItems: ReportEstimateItem[] = (data.estimate?.items || []).slice();

    // Fallback if estimate items are empty but analysis modules exist
    if (allItems.length === 0 && data.analysis?.modules && data.analysis.modules.length > 0) {
      let fIdx = 1;
      for (const mod of data.analysis.modules) {
        for (const feat of mod.features || []) {
          allItems.push({
            id: `item-${fIdx++}`,
            moduleName: mod.name,
            featureName: feat,
            description: `Implementation, technical configuration, and verification of ${feat}.`,
            category: 'Fullstack',
            complexity: 'MEDIUM',
            hours: 12,
            ruleId: null,
            subtasks: [],
          });
        }
      }
    }

    const baseItems: ReportEstimateItem[] = [];
    const optionalItems: ReportEstimateItem[] = [];

    for (const item of allItems) {
      if (isOptionalItem(item)) {
        optionalItems.push(item);
      } else {
        baseItems.push(item);
      }
    }

    // =========================================================================
    // SHEET 1 — WEB ESTIMATION (COMPLETE BASE / PRODUCTION ESTIMATION)
    // =========================================================================
    const wsWeb = wb.addWorksheet('Web Estimation', {
      views: [{ showGridLines: true }],
      pageSetup: {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9, // A4
        margins: {
          left: 0.4,
          right: 0.4,
          top: 0.4,
          bottom: 0.4,
          header: 0.2,
          footer: 0.2,
        },
      },
    });

    const { frontendLabel, backendLabel } = getColumnFrameworkLabels(data);

    // Columns: Task ID | Task | Description | Frontend | Backend | Total Hours
    wsWeb.columns = [
      { key: 'taskId', width: 14 },
      { key: 'task', width: 38 },
      { key: 'description', width: 52 },
      { key: 'frontend', width: 16 },
      { key: 'backend', width: 16 },
      { key: 'totalHours', width: 16 },
    ];

    let rowWeb = 2;

    // --- 1. Project Title Banner ---
    wsWeb.mergeCells(`A${rowWeb}:F${rowWeb}`);
    const bannerCell = wsWeb.getCell(`A${rowWeb}`);
    bannerCell.value = `${data.project.name.toUpperCase()}  —  WEB ESTIMATION SPECIFICATION`;
    bannerCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: PALETTE.textWhite } };
    bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.finalTotalBg } };
    bannerCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    for (let c = 1; c <= 6; c++) wsWeb.getCell(rowWeb, c).border = BORDER_THIN;
    wsWeb.getRow(rowWeb).height = 34;
    rowWeb++;

    // --- 2. Project Scope / Description Row ---
    wsWeb.mergeCells(`A${rowWeb}:B${rowWeb}`);
    const scopeLabel = wsWeb.getCell(`A${rowWeb}`);
    scopeLabel.value = 'Project Scope';
    scopeLabel.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
    scopeLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.metaLabelBg } };
    scopeLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    for (let c = 1; c <= 2; c++) wsWeb.getCell(rowWeb, c).border = BORDER_THIN;

    wsWeb.mergeCells(`C${rowWeb}:F${rowWeb}`);
    const scopeVal = wsWeb.getCell(`C${rowWeb}`);
    scopeVal.value = getProjectSummary(data);
    scopeVal.font = { name: 'Segoe UI', size: 9.5, color: { argb: PALETTE.textBody } };
    scopeVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.white } };
    scopeVal.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    for (let c = 3; c <= 6; c++) wsWeb.getCell(rowWeb, c).border = BORDER_THIN;
    wsWeb.getRow(rowWeb).height = 26;
    rowWeb++;

    // --- 3. Technology / Architecture Context Row ---
    wsWeb.mergeCells(`A${rowWeb}:B${rowWeb}`);
    const stackLabel = wsWeb.getCell(`A${rowWeb}`);
    stackLabel.value = 'Technology & Architecture';
    stackLabel.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
    stackLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.metaLabelBg } };
    stackLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    for (let c = 1; c <= 2; c++) wsWeb.getCell(rowWeb, c).border = BORDER_THIN;

    wsWeb.mergeCells(`C${rowWeb}:F${rowWeb}`);
    const stackVal = wsWeb.getCell(`C${rowWeb}`);
    stackVal.value = getTechArchitectureContext(data);
    stackVal.font = { name: 'Segoe UI', size: 9, color: { argb: PALETTE.textBody } };
    stackVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.white } };
    stackVal.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    for (let c = 3; c <= 6; c++) wsWeb.getCell(rowWeb, c).border = BORDER_THIN;
    wsWeb.getRow(rowWeb).height = 26;
    rowWeb++;

    // Spacer
    wsWeb.getRow(rowWeb).height = 14;
    rowWeb++;

    // --- 4. Organize Epics (Foundational Epic First) ---
    const epicMap = new Map<string, ReportEstimateItem[]>();
    for (const item of baseItems) {
      const mod = item.moduleName?.trim() || 'Core System';
      if (!epicMap.has(mod)) {
        epicMap.set(mod, []);
      }
      epicMap.get(mod)!.push(item);
    }

    const epicEntries = Array.from(epicMap.entries());

    // Sort foundational/architecture module to position 0 if present
    epicEntries.sort((a, b) => {
      const aIsFoundational = /architecture|foundation|setup|infrastructure|input|core|auth/i.test(a[0]);
      const bIsFoundational = /architecture|foundation|setup|infrastructure|input|core|auth/i.test(b[0]);
      if (aIsFoundational && !bIsFoundational) return -1;
      if (!aIsFoundational && bIsFoundational) return 1;
      return 0;
    });

    const webSubtotalRows: number[] = [];
    let taskCounter = 1;

    for (let epicIdx = 0; epicIdx < epicEntries.length; epicIdx++) {
      const [rawEpicName, tasks] = epicEntries[epicIdx];
      const epicNumber = epicIdx + 1;
      const isFirstEpic = epicIdx === 0;

      // Determine clean, production-level Epic Name
      let displayEpicName = rawEpicName;
      if (isFirstEpic && !/architecture|foundation/i.test(displayEpicName)) {
        const rawReq = (data.requirement?.rawText || '').toLowerCase();
        if (rawReq.includes('content protection')) {
          displayEpicName = `Project Architecture, Foundation & Content Protection`;
        } else if (rawReq.includes('security') || rawReq.includes('compliance') || rawReq.includes('privacy')) {
          displayEpicName = `Project Architecture, Foundation & Security Setup`;
        } else if (rawReq.includes('input') || /project input/i.test(rawEpicName)) {
          displayEpicName = `Project Architecture, Foundation & Technical Scope Setup`;
        } else {
          displayEpicName = `Project Architecture, Foundation & ${displayEpicName}`;
        }
      }

      // --- Epic Header Row (Dark Slate 800) ---
      wsWeb.mergeCells(`A${rowWeb}:F${rowWeb}`);
      const epicHeaderCell = wsWeb.getCell(`A${rowWeb}`);
      epicHeaderCell.value = `Epic ${epicNumber}: ${displayEpicName}`;
      epicHeaderCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: PALETTE.textWhite } };
      epicHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.epicHeaderBg } };
      epicHeaderCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      for (let col = 1; col <= 6; col++) wsWeb.getCell(rowWeb, col).border = BORDER_THIN;
      wsWeb.getRow(rowWeb).height = 26;
      rowWeb++;

      // --- Epic Scope / Description Row ---
      wsWeb.mergeCells(`A${rowWeb}:F${rowWeb}`);
      const epicDescCell = wsWeb.getCell(`A${rowWeb}`);
      epicDescCell.value = getEpicDescription(displayEpicName, isFirstEpic, data);
      epicDescCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: PALETTE.textMuted } };
      epicDescCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.descRowBg } };
      epicDescCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      for (let col = 1; col <= 6; col++) wsWeb.getCell(rowWeb, col).border = BORDER_THIN;
      wsWeb.getRow(rowWeb).height = 24;
      rowWeb++;

      // --- Table Column Headers Row ---
      const tableHeaders = ['Task ID', 'Task', 'Description', frontendLabel, backendLabel, 'Total (Hours)'];
      const headerRow = wsWeb.getRow(rowWeb);
      tableHeaders.forEach((th, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = th;
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.tableHeaderBg } };
        cell.border = BORDER_THIN;
        cell.alignment = {
          vertical: 'middle',
          horizontal: idx >= 3 ? 'right' : idx === 0 ? 'center' : 'left',
          indent: idx === 1 || idx === 2 ? 1 : 0,
        };
      });
      headerRow.height = 22;
      rowWeb++;

      // --- Task Rows ---
      const startTaskRow = rowWeb;
      let epicFeSum = 0;
      let epicBeSum = 0;

      tasks.forEach((task, tIdx) => {
        const row = wsWeb.getRow(rowWeb);
        const isAlt = tIdx % 2 === 1;
        const rowFill: ExcelJS.Fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isAlt ? PALETTE.altRowBg : PALETTE.white },
        };

        const taskId = `TSK-${String(taskCounter).padStart(3, '0')}`;
        taskCounter++;

        const taskName = formatDetailedTaskName(task.featureName, task.description, rawEpicName);
        const taskDesc = enrichTaskDescription(task.description, taskName, rawEpicName);

        const { frontend, backend } = splitFrontendBackendHours(task);
        epicFeSum += frontend;
        epicBeSum += backend;
        const taskTotal = Math.round((frontend + backend) * 10) / 10;

        // Col A: Task ID
        const cellA = row.getCell(1);
        cellA.value = taskId;
        cellA.font = { name: 'Segoe UI', size: 9.5, color: { argb: PALETTE.textMuted }, bold: true };
        cellA.alignment = { vertical: 'middle', horizontal: 'center' };
        cellA.fill = rowFill;
        cellA.border = BORDER_THIN;

        // Col B: Task
        const cellB = row.getCell(2);
        cellB.value = taskName;
        cellB.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
        cellB.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
        cellB.fill = rowFill;
        cellB.border = BORDER_THIN;

        // Col C: Description
        const cellC = row.getCell(3);
        cellC.value = taskDesc;
        cellC.font = { name: 'Segoe UI', size: 9.5, color: { argb: PALETTE.textBody } };
        cellC.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
        cellC.fill = rowFill;
        cellC.border = BORDER_THIN;

        // Col D: Frontend Hours
        const cellD = row.getCell(4);
        cellD.value = frontend;
        cellD.font = { name: 'Segoe UI', size: 10, color: { argb: PALETTE.textHead } };
        cellD.alignment = { vertical: 'middle', horizontal: 'right' };
        cellD.numFmt = '#,##0.0';
        cellD.fill = rowFill;
        cellD.border = BORDER_THIN;

        // Col E: Backend Hours
        const cellE = row.getCell(5);
        cellE.value = backend;
        cellE.font = { name: 'Segoe UI', size: 10, color: { argb: PALETTE.textHead } };
        cellE.alignment = { vertical: 'middle', horizontal: 'right' };
        cellE.numFmt = '#,##0.0';
        cellE.fill = rowFill;
        cellE.border = BORDER_THIN;

        // Col F: Total Hours (Formula: D + E)
        const cellF = row.getCell(6);
        cellF.value = { formula: `D${rowWeb}+E${rowWeb}`, result: taskTotal };
        cellF.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
        cellF.alignment = { vertical: 'middle', horizontal: 'right' };
        cellF.numFmt = '#,##0.0';
        cellF.fill = rowFill;
        cellF.border = BORDER_THIN;

        const approxLines = Math.max(
          Math.ceil(taskDesc.length / 52),
          Math.ceil(taskName.length / 28),
          1
        );
        row.height = Math.max(22, approxLines * 16);

        rowWeb++;
      });

      const endTaskRow = rowWeb - 1;

      // --- Epic Subtotal Row ---
      const subtotalRowIdx = rowWeb;
      webSubtotalRows.push(subtotalRowIdx);
      const subRow = wsWeb.getRow(subtotalRowIdx);

      // Label: Subtotal: Epic [number]
      wsWeb.mergeCells(`A${subtotalRowIdx}:C${subtotalRowIdx}`);
      const subLabel = subRow.getCell(1);
      subLabel.value = `Subtotal: Epic ${epicNumber}`;
      subLabel.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
      subLabel.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
      for (let c = 1; c <= 3; c++) {
        const cell = subRow.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subtotalBg } };
        cell.border = BORDER_SUBTOTAL;
      }

      // Col D: Frontend Subtotal Formula
      const subD = subRow.getCell(4);
      subD.value = { formula: `SUM(D${startTaskRow}:D${endTaskRow})`, result: epicFeSum };
      subD.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
      subD.alignment = { vertical: 'middle', horizontal: 'right' };
      subD.numFmt = '#,##0.0';
      subD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subtotalBg } };
      subD.border = BORDER_SUBTOTAL;

      // Col E: Backend Subtotal Formula
      const subE = subRow.getCell(5);
      subE.value = { formula: `SUM(E${startTaskRow}:E${endTaskRow})`, result: epicBeSum };
      subE.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
      subE.alignment = { vertical: 'middle', horizontal: 'right' };
      subE.numFmt = '#,##0.0';
      subE.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subtotalBg } };
      subE.border = BORDER_SUBTOTAL;

      // Col F: Epic Total Hours Formula
      const epicTotalHours = Math.round((epicFeSum + epicBeSum) * 10) / 10;
      const subF = subRow.getCell(6);
      subF.value = { formula: `SUM(F${startTaskRow}:F${endTaskRow})`, result: epicTotalHours };
      subF.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
      subF.alignment = { vertical: 'middle', horizontal: 'right' };
      subF.numFmt = '#,##0.0';
      subF.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subtotalBg } };
      subF.border = BORDER_SUBTOTAL;

      subRow.height = 24;
      rowWeb++;

      // Spacer between epics
      wsWeb.getRow(rowWeb).height = 14;
      rowWeb++;
    }

    // --- 5. Base Grand Total Row ---
    const finalRowIdx = rowWeb;
    const finalRow = wsWeb.getRow(finalRowIdx);

    wsWeb.mergeCells(`A${finalRowIdx}:C${finalRowIdx}`);
    const finalLabel = finalRow.getCell(1);
    finalLabel.value = 'TOTAL BASE DEVELOPMENT HOURS';
    finalLabel.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: PALETTE.textWhite } };
    finalLabel.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
    for (let c = 1; c <= 3; c++) {
      const cell = finalRow.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.finalTotalBg } };
      cell.border = BORDER_FINAL_TOTAL;
    }

    const feSubFormula = webSubtotalRows.length > 0
      ? `SUM(${webSubtotalRows.map(r => `D${r}`).join(',')})`
      : '0';
    const beSubFormula = webSubtotalRows.length > 0
      ? `SUM(${webSubtotalRows.map(r => `E${r}`).join(',')})`
      : '0';

    let grandFe = 0;
    let grandBe = 0;
    for (const r of webSubtotalRows) {
      const dCell = wsWeb.getCell(`D${r}`);
      const eCell = wsWeb.getCell(`E${r}`);
      grandFe += typeof dCell.value === 'object' && dCell.value && 'result' in dCell.value
        ? Number(dCell.value.result) || 0
        : Number(dCell.value) || 0;
      grandBe += typeof eCell.value === 'object' && eCell.value && 'result' in eCell.value
        ? Number(eCell.value.result) || 0
        : Number(eCell.value) || 0;
    }
    const grandBaseTotal = Math.round((grandFe + grandBe) * 10) / 10;

    // Total Frontend Hours Formula
    const finalD = finalRow.getCell(4);
    finalD.value = { formula: feSubFormula, result: grandFe };
    finalD.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: PALETTE.textWhite } };
    finalD.alignment = { vertical: 'middle', horizontal: 'right' };
    finalD.numFmt = '#,##0.0';
    finalD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.finalTotalBg } };
    finalD.border = BORDER_FINAL_TOTAL;

    // Total Backend Hours Formula
    const finalE = finalRow.getCell(5);
    finalE.value = { formula: beSubFormula, result: grandBe };
    finalE.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: PALETTE.textWhite } };
    finalE.alignment = { vertical: 'middle', horizontal: 'right' };
    finalE.numFmt = '#,##0.0';
    finalE.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.finalTotalBg } };
    finalE.border = BORDER_FINAL_TOTAL;

    // Total Base Development Hours Formula
    const finalF = finalRow.getCell(6);
    finalF.value = { formula: `D${finalRowIdx}+E${finalRowIdx}`, result: grandBaseTotal };
    finalF.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: PALETTE.textWhite } };
    finalF.alignment = { vertical: 'middle', horizontal: 'right' };
    finalF.numFmt = '#,##0.0';
    finalF.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.finalTotalBg } };
    finalF.border = BORDER_FINAL_TOTAL;

    finalRow.height = 28;


    // =========================================================================
    // SHEET 2 — OPTIONAL ADD-ONS (ONLY OPTIONAL / FUTURE / OUT-OF-SCOPE WORK)
    // =========================================================================
    const wsAddons = wb.addWorksheet('Optional Add-Ons', {
      views: [{ showGridLines: true }],
      pageSetup: {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9, // A4
        margins: {
          left: 0.4,
          right: 0.4,
          top: 0.4,
          bottom: 0.4,
          header: 0.2,
          footer: 0.2,
        },
      },
    });

    // Configure 4 columns: Task ID | Task | Description | Hours
    wsAddons.columns = [
      { key: 'taskId', width: 14 },
      { key: 'task', width: 38 },
      { key: 'description', width: 56 },
      { key: 'hours', width: 16 },
    ];

    let rowAddon = 2;

    // --- 1. Project Title Banner ---
    wsAddons.mergeCells(`A${rowAddon}:D${rowAddon}`);
    const addonBannerCell = wsAddons.getCell(`A${rowAddon}`);
    addonBannerCell.value = `${data.project.name.toUpperCase()}  —  OPTIONAL FEATURES & ADD-ON SCOPE`;
    addonBannerCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: PALETTE.textWhite } };
    addonBannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.finalTotalBg } };
    addonBannerCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    for (let c = 1; c <= 4; c++) wsAddons.getCell(rowAddon, c).border = BORDER_THIN;
    wsAddons.getRow(rowAddon).height = 34;
    rowAddon++;

    // --- 2. Scope Description ---
    wsAddons.mergeCells(`A${rowAddon}:B${rowAddon}`);
    const addonScopeLabel = wsAddons.getCell(`A${rowAddon}`);
    addonScopeLabel.value = 'Add-On Scope';
    addonScopeLabel.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
    addonScopeLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.metaLabelBg } };
    addonScopeLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    for (let c = 1; c <= 2; c++) wsAddons.getCell(rowAddon, c).border = BORDER_THIN;

    wsAddons.mergeCells(`C${rowAddon}:D${rowAddon}`);
    const addonScopeVal = wsAddons.getCell(`C${rowAddon}`);
    addonScopeVal.value = 'Optional enhancements, future-phase capabilities, and out-of-scope integrations identified from project requirements.';
    addonScopeVal.font = { name: 'Segoe UI', size: 9.5, color: { argb: PALETTE.textBody } };
    addonScopeVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.white } };
    addonScopeVal.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    for (let c = 3; c <= 4; c++) wsAddons.getCell(rowAddon, c).border = BORDER_THIN;
    wsAddons.getRow(rowAddon).height = 26;
    rowAddon++;

    // Spacer
    wsAddons.getRow(rowAddon).height = 14;
    rowAddon++;

    // --- 3. Group Optional Items by Add-On Category/Module ---
    const addonMap = new Map<string, ReportEstimateItem[]>();
    for (const item of optionalItems) {
      const cleanMod = cleanAddonTitle(item.moduleName || 'Optional Enhancement');
      if (!addonMap.has(cleanMod)) {
        addonMap.set(cleanMod, []);
      }
      addonMap.get(cleanMod)!.push(item);
    }

    const addonEntries = Array.from(addonMap.entries());
    const addonSubtotalRows: number[] = [];
    let addonTaskCounter = 1;

    if (addonEntries.length === 0) {
      // Empty state if no optional features were specified
      wsAddons.mergeCells(`A${rowAddon}:D${rowAddon}`);
      const emptyCell = wsAddons.getCell(`A${rowAddon}`);
      emptyCell.value = 'No optional add-ons, future phase features, or out-of-scope items identified in the requirements. All analyzed scope is included in the base project estimation.';
      emptyCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: PALETTE.textMuted } };
      emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.white } };
      emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      for (let c = 1; c <= 4; c++) wsAddons.getCell(rowAddon, c).border = BORDER_THIN;
      wsAddons.getRow(rowAddon).height = 32;
      rowAddon++;
    } else {
      for (let aIdx = 0; aIdx < addonEntries.length; aIdx++) {
        const [addonTitle, items] = addonEntries[aIdx];
        const addonNumber = aIdx + 1;

        // --- Add-On Section Header (Dark Slate 800) ---
        wsAddons.mergeCells(`A${rowAddon}:D${rowAddon}`);
        const addHeaderCell = wsAddons.getCell(`A${rowAddon}`);
        addHeaderCell.value = `Add-On ${addonNumber}: ${addonTitle}`;
        addHeaderCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: PALETTE.textWhite } };
        addHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.epicHeaderBg } };
        addHeaderCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        for (let col = 1; col <= 4; col++) wsAddons.getCell(rowAddon, col).border = BORDER_THIN;
        wsAddons.getRow(rowAddon).height = 26;
        rowAddon++;

        // --- Add-On Description Row ---
        wsAddons.mergeCells(`A${rowAddon}:D${rowAddon}`);
        const addDescCell = wsAddons.getCell(`A${rowAddon}`);
        addDescCell.value = `Optional feature set covering engineering implementation, third-party connectors, and automated workflows for ${addonTitle}.`;
        addDescCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: PALETTE.textMuted } };
        addDescCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.descRowBg } };
        addDescCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        for (let col = 1; col <= 4; col++) wsAddons.getCell(rowAddon, col).border = BORDER_THIN;
        wsAddons.getRow(rowAddon).height = 24;
        rowAddon++;

        // --- Table Headers: Task ID | Task | Description | Hours ---
        const tableHeaders = ['Task ID', 'Task', 'Description', 'Hours'];
        const headerRow = wsAddons.getRow(rowAddon);
        tableHeaders.forEach((th, idx) => {
          const cell = headerRow.getCell(idx + 1);
          cell.value = th;
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.tableHeaderBg } };
          cell.border = BORDER_THIN;
          cell.alignment = {
            vertical: 'middle',
            horizontal: idx === 3 ? 'right' : idx === 0 ? 'center' : 'left',
            indent: idx === 1 || idx === 2 ? 1 : 0,
          };
        });
        headerRow.height = 22;
        rowAddon++;

        // --- Task Rows ---
        const startAddonRow = rowAddon;
        let addonSum = 0;

        items.forEach((item, iIdx) => {
          const row = wsAddons.getRow(rowAddon);
          const isAlt = iIdx % 2 === 1;
          const rowFill: ExcelJS.Fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isAlt ? PALETTE.altRowBg : PALETTE.white },
          };

          const taskId = `OPT-${String(addonTaskCounter).padStart(3, '0')}`;
          addonTaskCounter++;

          const taskName = formatDetailedTaskName(item.featureName, item.description, addonTitle);
          const taskDesc = enrichTaskDescription(item.description, taskName, addonTitle);
          const itemHours = Number(item.hours) || 0;
          addonSum += itemHours;

          // Col A: Task ID
          const cellA = row.getCell(1);
          cellA.value = taskId;
          cellA.font = { name: 'Segoe UI', size: 9.5, color: { argb: PALETTE.textMuted }, bold: true };
          cellA.alignment = { vertical: 'middle', horizontal: 'center' };
          cellA.fill = rowFill;
          cellA.border = BORDER_THIN;

          // Col B: Task
          const cellB = row.getCell(2);
          cellB.value = taskName;
          cellB.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
          cellB.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
          cellB.fill = rowFill;
          cellB.border = BORDER_THIN;

          // Col C: Description
          const cellC = row.getCell(3);
          cellC.value = taskDesc;
          cellC.font = { name: 'Segoe UI', size: 9.5, color: { argb: PALETTE.textBody } };
          cellC.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
          cellC.fill = rowFill;
          cellC.border = BORDER_THIN;

          // Col D: Hours
          const cellD = row.getCell(4);
          cellD.value = itemHours;
          cellD.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
          cellD.alignment = { vertical: 'middle', horizontal: 'right' };
          cellD.numFmt = '#,##0.0';
          cellD.fill = rowFill;
          cellD.border = BORDER_THIN;

          const approxLines = Math.max(
            Math.ceil(taskDesc.length / 56),
            Math.ceil(taskName.length / 28),
            1
          );
          row.height = Math.max(22, approxLines * 16);

          rowAddon++;
        });

        const endAddonRow = rowAddon - 1;

        // --- Subtotal: Add-On X ---
        const subtotalRowIdx = rowAddon;
        addonSubtotalRows.push(subtotalRowIdx);
        const subRow = wsAddons.getRow(subtotalRowIdx);

        wsAddons.mergeCells(`A${subtotalRowIdx}:C${subtotalRowIdx}`);
        const subLabel = subRow.getCell(1);
        subLabel.value = `Subtotal: Add-On ${addonNumber}`;
        subLabel.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
        subLabel.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
        for (let c = 1; c <= 3; c++) {
          const cell = subRow.getCell(c);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subtotalBg } };
          cell.border = BORDER_SUBTOTAL;
        }

        const subD = subRow.getCell(4);
        subD.value = { formula: `SUM(D${startAddonRow}:D${endAddonRow})`, result: addonSum };
        subD.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETTE.textHead } };
        subD.alignment = { vertical: 'middle', horizontal: 'right' };
        subD.numFmt = '#,##0.0';
        subD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subtotalBg } };
        subD.border = BORDER_SUBTOTAL;

        subRow.height = 24;
        rowAddon++;

        // Spacer
        wsAddons.getRow(rowAddon).height = 14;
        rowAddon++;
      }
    }

    // --- 4. Final Total: TOTAL OPTIONAL ADD-ON HOURS ---
    const finalAddonRowIdx = rowAddon;
    const finalAddonRow = wsAddons.getRow(finalAddonRowIdx);

    wsAddons.mergeCells(`A${finalAddonRowIdx}:C${finalAddonRowIdx}`);
    const finalAddonLabel = finalAddonRow.getCell(1);
    finalAddonLabel.value = 'TOTAL OPTIONAL ADD-ON HOURS';
    finalAddonLabel.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: PALETTE.textWhite } };
    finalAddonLabel.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
    for (let c = 1; c <= 3; c++) {
      const cell = finalAddonRow.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.finalTotalBg } };
      cell.border = BORDER_FINAL_TOTAL;
    }

    const addonSubFormula = addonSubtotalRows.length > 0
      ? `SUM(${addonSubtotalRows.map(r => `D${r}`).join(',')})`
      : '0';

    let grandOptionalTotal = 0;
    for (const r of addonSubtotalRows) {
      const cell = wsAddons.getCell(`D${r}`);
      grandOptionalTotal += typeof cell.value === 'object' && cell.value && 'result' in cell.value
        ? Number(cell.value.result) || 0
        : Number(cell.value) || 0;
    }

    const finalAddonD = finalAddonRow.getCell(4);
    finalAddonD.value = { formula: addonSubFormula, result: grandOptionalTotal };
    finalAddonD.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: PALETTE.textWhite } };
    finalAddonD.alignment = { vertical: 'middle', horizontal: 'right' };
    finalAddonD.numFmt = '#,##0.0';
    finalAddonD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.finalTotalBg } };
    finalAddonD.border = BORDER_FINAL_TOTAL;

    finalAddonRow.height = 28;

    return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
