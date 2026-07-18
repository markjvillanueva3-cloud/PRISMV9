export interface ComplianceTemplate {
  id: string;
  standard: string;
  version: string;
  requirements: Array<{ id: string; description: string; status: "met" | "partial" | "unmet" }>;
}

export interface ComplianceAudit {
  id: string;
  template_id: string;
  timestamp: string;
  score_pct: number;
  findings: Array<{ requirement_id: string; status: string; notes: string }>;
}

export interface GapAnalysis {
  standard: string;
  total_requirements: number;
  met: number;
  partial: number;
  unmet: number;
  gaps: Array<{ requirement: string; priority: "high" | "medium" | "low"; remediation: string }>;
}

export interface ApiError { message: string; code?: string; }
