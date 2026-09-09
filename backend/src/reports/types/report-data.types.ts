export interface ReportEstimateItemSubtask {
  name: string;
  description: string;
  hours: number;
}

export interface ReportEstimateItem {
  id: string;
  moduleName: string;
  featureName: string;
  description: string | null;
  category: string | null;
  complexity: string | null;
  hours: number;
  ruleId: string | null;
  subtasks?: ReportEstimateItemSubtask[];
}

export interface ReportGap {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  moduleName: string | null;
  impact: string | null;
}

export interface ReportQuestion {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  priority: string;
  moduleName: string | null;
  gapTitle: string | null;
  gapId: string | null;
}

export interface ReportModuleSummary {
  moduleName: string;
  featureCount: number;
  hours: number;
  percentOfTotal: number;
}

export interface ReportEstimateHistory {
  version: number;
  totalHours: number;
  createdAt: Date;
}

export interface ReportAnalysis {
  projectType: string;
  platforms: string[];
  actors: string[];
  modules: Array<{ name: string; features: string[] }>;
  integrations: string[];
  assumptions: string[];
}

export interface ReportData {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    clientName: string | null;
    clientEmail: string;
  };
  requirement: {
    rawText: string;
    completenessScore: number | null;
  } | null;
  analysis: ReportAnalysis | null;
  gaps: ReportGap[];
  questions: ReportQuestion[];
  estimate: {
    version: number;
    totalHours: number;
    createdAt: Date;
    items: ReportEstimateItem[];
    moduleSummary: ReportModuleSummary[];
  } | null;
  estimateHistory: ReportEstimateHistory[];
}

