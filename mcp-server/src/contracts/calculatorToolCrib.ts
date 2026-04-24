export type CalculatorToolCribSourceType =
  | "purchase_order"
  | "invoice"
  | "rfq"
  | "email"
  | "attachment"
  | "cadcam_scan";

export type CalculatorToolCribSuggestionKind =
  | "tooling_part"
  | "holder_part"
  | "fixture_part"
  | "part_number"
  | "library";

export type CalculatorCadCamSoftwareFamily =
  | "fusion_360"
  | "mastercam"
  | "hypermill"
  | "nx_cam"
  | "solidcam"
  | "camworks"
  | "gibbscam"
  | "esprit"
  | "generic_cam";

export interface CalculatorToolCribSuggestion {
  id: string;
  kind: CalculatorToolCribSuggestionKind;
  label: string;
  manufacturer?: string;
  partNumber?: string;
  quantityHint?: string;
  confidence: number;
  evidence: string;
  action: string;
  sourceType: CalculatorToolCribSourceType;
}

export interface CalculatorCadCamLibraryFinding {
  id: string;
  softwareFamily: CalculatorCadCamSoftwareFamily;
  softwareLabel: string;
  path: string;
  confidence: number;
  matchedBy: string[];
}

export interface CalculatorToolCribImportRecord {
  id: string;
  userId: string;
  workspaceId: string;
  sourceType: CalculatorToolCribSourceType;
  sourceLabel: string;
  filename?: string;
  importedAt: string;
  status: "ready" | "needs_review";
  summary: string;
  suggestions: CalculatorToolCribSuggestion[];
  discoveredLibraries?: CalculatorCadCamLibraryFinding[];
  redaction?: {
    applied: boolean;
    replacementCount: number;
    redactedFields: string[];
    note: string;
  };
}

export interface CalculatorToolCribWorkspace {
  userId: string;
  workspaceId: string;
  summary: string;
  lastUpdatedAt: string | null;
  imports: CalculatorToolCribImportRecord[];
  partNumbers: string[];
  toolingPartNumbers: string[];
  discoveredLibraries: CalculatorCadCamLibraryFinding[];
}

export interface IngestCalculatorToolCribDocumentInput {
  userId: string;
  workspaceId?: string;
  sourceType: CalculatorToolCribSourceType;
  filename: string;
  title?: string;
  contentBase64?: string;
  contentText?: string;
}

export interface RunCalculatorToolCribLocalScanInput {
  userId: string;
  workspaceId?: string;
  approvedByUser: boolean;
  roots?: string[];
  maxResults?: number;
}
