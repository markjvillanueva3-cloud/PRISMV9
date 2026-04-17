/**
 * OfficeDocumentPipelineEngine — Office Document Processing
 *
 * Extracts manufacturing-relevant data from Office documents:
 * Word docs, Excel spreadsheets, PowerPoint presentations.
 *
 * U-AWR29: Office Document Pipeline
 *
 * @module engines/OfficeDocumentPipelineEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type DocumentType = "word" | "excel" | "powerpoint" | "pdf" | "text" | "unknown";

export type ContentCategory =
  | "specification"
  | "procedure"
  | "tool_list"
  | "material_list"
  | "setup_sheet"
  | "inspection_report"
  | "quote"
  | "order"
  | "certificate"
  | "manual"
  | "training"
  | "general";

export interface DocumentMetadata {
  filePath: string;
  fileName: string;
  type: DocumentType;
  category: ContentCategory;
  title?: string;
  author?: string;
  created?: string;
  modified?: string;
  pageCount?: number;
  wordCount?: number;
  hasImages: boolean;
  hasTables: boolean;
  hasFormulas: boolean;
}

export interface ExtractedTable {
  id: string;
  sheetName?: string;
  headers: string[];
  rows: string[][];
  rowCount: number;
  columnCount: number;
  dataType: "tool_list" | "material_list" | "speed_feed" | "dimension" | "generic";
}

export interface ExtractedSection {
  id: string;
  heading: string;
  content: string;
  level: number;
  keywords: string[];
}

export interface DocumentExtraction {
  metadata: DocumentMetadata;
  sections: ExtractedSection[];
  tables: ExtractedTable[];
  keywords: string[];
  manufacturingData: ManufacturingData;
  extractionConfidence: number;
  warnings: string[];
  extractedAt: string;
}

export interface ManufacturingData {
  toolNumbers: string[];
  partNumbers: string[];
  materials: string[];
  operations: string[];
  speeds: number[];
  feeds: number[];
  dimensions: string[];
  tolerances: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FILE_TYPE_MAP: Record<string, DocumentType> = {
  ".doc": "word",
  ".docx": "word",
  ".xls": "excel",
  ".xlsx": "excel",
  ".xlsm": "excel",
  ".ppt": "powerpoint",
  ".pptx": "powerpoint",
  ".pdf": "pdf",
  ".txt": "text",
  ".md": "text",
  ".csv": "excel",
};

// Order matters: more specific categories first
const CATEGORY_KEYWORDS: Array<[ContentCategory, string[]]> = [
  ["inspection_report", ["inspection", "cmm", "measurement report", "quality report"]],
  ["tool_list", ["tool list", "tooling", "cutter list", "insert", "holder"]],
  ["setup_sheet", ["setup sheet", "set up", "fixture", "workholding", "job setup"]],
  ["material_list", ["material list", "bom", "bill of material", "parts list"]],
  ["specification", ["specification", "spec sheet", "requirement", "standard"]],
  ["procedure", ["procedure", "process", "instruction", "sop", "work instruction"]],
  ["quote", ["quote", "quotation", "estimate", "pricing", "rfq"]],
  ["order", ["order", "purchase order", "po", "work order"]],
  ["certificate", ["certificate", "certification", "cert", "compliance"]],
  ["manual", ["manual", "guide", "handbook", "documentation"]],
  ["training", ["training", "course", "lesson", "tutorial"]],
];

const MANUFACTURING_PATTERNS = {
  toolNumber: /T\d{1,4}\b|Tool\s*#?\s*\d+/gi,
  partNumber: /P\/N\s*:?\s*([A-Z0-9\-]+)|Part\s*#?\s*:?\s*([A-Z0-9\-]+)/gi,
  speed: /(\d{2,5})\s*(?:RPM|rpm|SFM|sfm)/g,
  feed: /(\d+\.?\d*)\s*(?:IPM|ipm|IPR|ipr|mm\/min|mm\/rev)/g,
  dimension: /\d+\.?\d*\s*(?:mm|in|")/gi,
  tolerance: /[±+\-]\s*\d+\.?\d*/g,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

function detectDocumentType(filename: string): DocumentType {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return FILE_TYPE_MAP[ext] || "unknown";
}

function detectCategory(text: string, filename: string): ContentCategory {
  const combined = `${filename} ${text}`.toLowerCase();

  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        return category;
      }
    }
  }

  return "general";
}

function extractManufacturingData(text: string): ManufacturingData {
  const toolNumbers: string[] = [];
  const partNumbers: string[] = [];
  const materials: string[] = [];
  const operations: string[] = [];
  const speeds: number[] = [];
  const feeds: number[] = [];
  const dimensions: string[] = [];
  const tolerances: string[] = [];

  // Extract tool numbers
  let match;
  const toolRegex = new RegExp(MANUFACTURING_PATTERNS.toolNumber.source, "gi");
  while ((match = toolRegex.exec(text)) !== null) {
    if (!toolNumbers.includes(match[0])) {
      toolNumbers.push(match[0]);
    }
  }

  // Extract part numbers
  const pnRegex = new RegExp(MANUFACTURING_PATTERNS.partNumber.source, "gi");
  while ((match = pnRegex.exec(text)) !== null) {
    const pn = match[1] || match[2];
    if (pn && !partNumbers.includes(pn)) {
      partNumbers.push(pn);
    }
  }

  // Extract speeds
  const speedRegex = new RegExp(MANUFACTURING_PATTERNS.speed.source, "g");
  while ((match = speedRegex.exec(text)) !== null) {
    const speed = parseInt(match[1], 10);
    if (!speeds.includes(speed)) {
      speeds.push(speed);
    }
  }

  // Extract feeds
  const feedRegex = new RegExp(MANUFACTURING_PATTERNS.feed.source, "g");
  while ((match = feedRegex.exec(text)) !== null) {
    const feed = parseFloat(match[1]);
    if (!feeds.includes(feed)) {
      feeds.push(feed);
    }
  }

  // Extract dimensions
  const dimRegex = new RegExp(MANUFACTURING_PATTERNS.dimension.source, "gi");
  while ((match = dimRegex.exec(text)) !== null) {
    if (!dimensions.includes(match[0])) {
      dimensions.push(match[0]);
    }
  }

  // Extract tolerances
  const tolRegex = new RegExp(MANUFACTURING_PATTERNS.tolerance.source, "g");
  while ((match = tolRegex.exec(text)) !== null) {
    if (!tolerances.includes(match[0])) {
      tolerances.push(match[0]);
    }
  }

  // Detect operations
  const operationKeywords = [
    "turning", "milling", "drilling", "boring", "tapping",
    "grinding", "edm", "wire edm", "roughing", "finishing",
  ];
  const lower = text.toLowerCase();
  for (const op of operationKeywords) {
    if (lower.includes(op) && !operations.includes(op)) {
      operations.push(op);
    }
  }

  // Detect materials
  const materialKeywords = [
    "aluminum", "steel", "stainless", "brass", "copper",
    "titanium", "inconel", "plastic", "delrin", "nylon",
  ];
  for (const mat of materialKeywords) {
    if (lower.includes(mat) && !materials.includes(mat)) {
      materials.push(mat);
    }
  }

  return {
    toolNumbers,
    partNumbers,
    materials,
    operations,
    speeds,
    feeds,
    dimensions,
    tolerances,
  };
}

function detectTableType(headers: string[]): ExtractedTable["dataType"] {
  const combined = headers.join(" ").toLowerCase();

  // Check speed/feed first (more specific)
  if (combined.includes("speed") || combined.includes("feed") || combined.includes("rpm") || combined.includes("ipm")) {
    return "speed_feed";
  }
  if (combined.includes("tool") || combined.includes("cutter")) return "tool_list";
  if (combined.includes("dimension") || combined.includes("tolerance")) return "dimension";
  if (combined.includes("material") || combined.includes("part")) return "material_list";

  return "generic";
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class OfficeDocumentPipelineEngine {
  private static extractions: Map<string, DocumentExtraction> = new Map();

  /**
   * Processes an office document.
   * In production, this would use libraries like mammoth, xlsx, pptx.
   */
  static processDocument(
    filePath: string,
    options: {
      simulatedText?: string;
      simulatedTables?: Array<{ headers: string[]; rows: string[][] }>;
      simulatedSections?: Array<{ heading: string; content: string; level: number }>;
      simulatedMetadata?: Partial<DocumentMetadata>;
    } = {}
  ): DocumentExtraction {
    const type = detectDocumentType(filePath);
    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    const text = options.simulatedText || "";

    const category = detectCategory(text, fileName);
    const manufacturingData = extractManufacturingData(text);

    const tables: ExtractedTable[] = (options.simulatedTables || []).map((t) => ({
      id: generateId(),
      headers: t.headers,
      rows: t.rows,
      rowCount: t.rows.length,
      columnCount: t.headers.length,
      dataType: detectTableType(t.headers),
    }));

    const sections: ExtractedSection[] = (options.simulatedSections || []).map((s) => ({
      id: generateId(),
      heading: s.heading,
      content: s.content,
      level: s.level,
      keywords: [],
    }));

    const metadata: DocumentMetadata = {
      filePath,
      fileName,
      type,
      category,
      hasImages: false,
      hasTables: tables.length > 0,
      hasFormulas: type === "excel",
      ...options.simulatedMetadata,
    };

    const warnings: string[] = [];
    if (text.length === 0 && tables.length === 0) {
      warnings.push("No content extracted");
    }

    const confidence =
      manufacturingData.partNumbers.length > 0 ||
      manufacturingData.toolNumbers.length > 0
        ? 0.9
        : text.length > 100
        ? 0.7
        : 0.4;

    const extraction: DocumentExtraction = {
      metadata,
      sections,
      tables,
      keywords: [...manufacturingData.operations, ...manufacturingData.materials],
      manufacturingData,
      extractionConfidence: confidence,
      warnings,
      extractedAt: new Date().toISOString(),
    };

    this.extractions.set(filePath, extraction);
    log.info(`[OfficeDocumentPipeline] Processed ${fileName}: ${category}`);

    return extraction;
  }

  /**
   * Processes multiple documents.
   */
  static processBatch(
    documents: Array<{ path: string; text?: string }>
  ): DocumentExtraction[] {
    return documents.map((doc) =>
      this.processDocument(doc.path, { simulatedText: doc.text })
    );
  }

  /**
   * Gets extraction result.
   */
  static getExtraction(filePath: string): DocumentExtraction | null {
    return this.extractions.get(filePath) || null;
  }

  /**
   * Gets all extractions.
   */
  static getAllExtractions(): DocumentExtraction[] {
    return [...this.extractions.values()];
  }

  /**
   * Gets extractions by document type.
   */
  static getByDocumentType(type: DocumentType): DocumentExtraction[] {
    return [...this.extractions.values()].filter((e) => e.metadata.type === type);
  }

  /**
   * Gets extractions by content category.
   */
  static getByCategory(category: ContentCategory): DocumentExtraction[] {
    return [...this.extractions.values()].filter(
      (e) => e.metadata.category === category
    );
  }

  /**
   * Gets documents containing tool lists.
   */
  static getToolListDocuments(): DocumentExtraction[] {
    return [...this.extractions.values()].filter(
      (e) =>
        e.metadata.category === "tool_list" ||
        e.tables.some((t) => t.dataType === "tool_list") ||
        e.manufacturingData.toolNumbers.length > 0
    );
  }

  /**
   * Gets documents containing speed/feed data.
   */
  static getSpeedFeedDocuments(): DocumentExtraction[] {
    return [...this.extractions.values()].filter(
      (e) =>
        e.tables.some((t) => t.dataType === "speed_feed") ||
        e.manufacturingData.speeds.length > 0 ||
        e.manufacturingData.feeds.length > 0
    );
  }

  /**
   * Searches documents by keyword.
   */
  static searchByKeyword(keyword: string): DocumentExtraction[] {
    const lower = keyword.toLowerCase();
    return [...this.extractions.values()].filter(
      (e) =>
        e.keywords.some((k) => k.toLowerCase().includes(lower)) ||
        e.sections.some((s) => s.content.toLowerCase().includes(lower))
    );
  }

  /**
   * Searches documents by part number.
   */
  static searchByPartNumber(partNumber: string): DocumentExtraction[] {
    const lower = partNumber.toLowerCase();
    return [...this.extractions.values()].filter((e) =>
      e.manufacturingData.partNumbers.some((pn) =>
        pn.toLowerCase().includes(lower)
      )
    );
  }

  /**
   * Gets supported document extensions.
   */
  static getSupportedExtensions(): string[] {
    return Object.keys(FILE_TYPE_MAP);
  }

  /**
   * Checks if a file is supported.
   */
  static isSupported(filename: string): boolean {
    const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
    return ext in FILE_TYPE_MAP;
  }

  /**
   * Gets available content categories.
   */
  static getCategories(): ContentCategory[] {
    return [...CATEGORY_KEYWORDS.map(([cat]) => cat), "general"];
  }

  /**
   * Gets statistics across all extractions.
   */
  static getStatistics(): {
    totalDocuments: number;
    byType: Record<DocumentType, number>;
    byCategory: Record<ContentCategory, number>;
    totalTables: number;
    totalToolNumbers: number;
    totalPartNumbers: number;
    averageConfidence: number;
  } {
    const extractions = [...this.extractions.values()];

    const byType: Record<DocumentType, number> = {
      word: 0,
      excel: 0,
      powerpoint: 0,
      pdf: 0,
      text: 0,
      unknown: 0,
    };

    const byCategory: Record<ContentCategory, number> = {
      specification: 0,
      procedure: 0,
      tool_list: 0,
      material_list: 0,
      setup_sheet: 0,
      inspection_report: 0,
      quote: 0,
      order: 0,
      certificate: 0,
      manual: 0,
      training: 0,
      general: 0,
    };

    let totalTables = 0;
    let totalToolNumbers = 0;
    let totalPartNumbers = 0;
    let totalConfidence = 0;

    for (const e of extractions) {
      byType[e.metadata.type]++;
      byCategory[e.metadata.category]++;
      totalTables += e.tables.length;
      totalToolNumbers += e.manufacturingData.toolNumbers.length;
      totalPartNumbers += e.manufacturingData.partNumbers.length;
      totalConfidence += e.extractionConfidence;
    }

    return {
      totalDocuments: extractions.length,
      byType,
      byCategory,
      totalTables,
      totalToolNumbers,
      totalPartNumbers,
      averageConfidence:
        extractions.length > 0 ? totalConfidence / extractions.length : 0,
    };
  }

  /**
   * Clears all extractions.
   */
  static reset(): void {
    this.extractions.clear();
    log.info("[OfficeDocumentPipeline] Reset complete");
  }
}

export const officeDocumentPipelineEngine = OfficeDocumentPipelineEngine;
export default OfficeDocumentPipelineEngine;
