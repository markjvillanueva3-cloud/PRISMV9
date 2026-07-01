/**
 * OfficeDocumentPipelineEngine — Office Document Parser
 * U-AWR29: Office Document Pipeline (17 docx/pptx files)
 */

import { log } from '../utils/Logger.js';

export type OfficeFormat = 'docx' | 'xlsx' | 'pptx' | 'doc' | 'xls' | 'ppt';

export interface TableData {
  headers: string[];
  rows: string[][];
  sheetName?: string;
}

export interface DocumentSection {
  type: 'heading' | 'paragraph' | 'table' | 'list' | 'image';
  content: string | TableData;
  level?: number;
}

export interface DocumentMetadata {
  path: string;
  name: string;
  format: OfficeFormat;
  title?: string;
  author?: string;
  wordCount?: number;
}

export interface ExtractionResult {
  metadata: DocumentMetadata;
  sections: DocumentSection[];
  tables: TableData[];
  extractedData: {
    speeds: string[];
    feeds: string[];
    toolCodes: string[];
    partNumbers: string[];
    materials: string[];
  };
  success: boolean;
  warnings: string[];
  processingTimeMs: number;
}

export interface BatchResult {
  totalFiles: number;
  successful: number;
  failed: number;
  byFormat: Record<OfficeFormat, number>;
  totalTables: number;
  totalWords: number;
  results: ExtractionResult[];
  processingTimeMs: number;
}

const PATTERNS = {
  speed: /\d+\.?\d*\s*(rpm|sfm|m\/min)/gi,
  feed: /\d+\.?\d*\s*(ipm|mm\/min|mm\/rev)/gi,
  toolCode: /[A-Z]{2,4}[-\s]?\d{3,6}/g,
  partNumber: /[A-Z0-9]{2,}-[A-Z0-9]{2,}(-[A-Z0-9]+)*/g,
  material: /(aluminum|steel|stainless|titanium|brass|copper)/gi,
};

function detectFormat(filename: string): OfficeFormat {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const formats: OfficeFormat[] = ['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt'];
  return formats.includes(ext as OfficeFormat) ? (ext as OfficeFormat) : 'docx';
}

function extractStructuredData(text: string): ExtractionResult['extractedData'] {
  return {
    speeds: text.match(PATTERNS.speed) || [],
    feeds: text.match(PATTERNS.feed) || [],
    toolCodes: text.match(PATTERNS.toolCode) || [],
    partNumbers: text.match(PATTERNS.partNumber) || [],
    materials: text.match(PATTERNS.material) || [],
  };
}

export class OfficeDocumentPipelineEngine {
  private static results: Map<string, ExtractionResult> = new Map();
  private static queue: string[] = [];

  static registerDocument(path: string): void {
    this.queue.push(path);
    log.info('[OfficeDocumentPipeline] Registered: ' + path);
  }

  static registerBatch(paths: string[]): void {
    paths.forEach((p) => this.registerDocument(p));
  }

  static extractDocument(path: string, simulatedData?: {
    sections?: DocumentSection[];
    tables?: TableData[];
    metadata?: Partial<DocumentMetadata>;
  }): ExtractionResult {
    const startTime = Date.now();
    const warnings: string[] = [];
    const name = path.split(/[\/\\]/).pop() || path;
    const format = detectFormat(name);

    if (['doc', 'xls', 'ppt'].includes(format)) {
      warnings.push('Legacy ' + format + ' format - conversion recommended');
    }

    const sections = simulatedData?.sections || [];
    const tables = simulatedData?.tables || [];
    const allText = sections.map((s) => (typeof s.content === 'string' ? s.content : '')).join(' ');
    const wordCount = allText.split(/\s+/).filter(Boolean).length;

    const metadata: DocumentMetadata = {
      path, name, format, wordCount,
      ...simulatedData?.metadata,
    };

    const result: ExtractionResult = {
      metadata,
      sections,
      tables,
      extractedData: extractStructuredData(allText),
      success: true,
      warnings,
      processingTimeMs: Date.now() - startTime,
    };

    this.results.set(path, result);
    log.info('[OfficeDocumentPipeline] Extracted ' + name + ': ' + sections.length + ' sections');
    return result;
  }

  static extractBatch(simulatedData?: Map<string, Parameters<typeof this.extractDocument>[1]>): BatchResult {
    const startTime = Date.now();
    const results: ExtractionResult[] = [];
    const byFormat: Record<OfficeFormat, number> = { docx: 0, xlsx: 0, pptx: 0, doc: 0, xls: 0, ppt: 0 };
    let totalTables = 0, totalWords = 0, successful = 0;

    for (const path of this.queue) {
      const data = simulatedData?.get(path);
      const result = this.extractDocument(path, data);
      results.push(result);
      byFormat[result.metadata.format]++;
      totalTables += result.tables.length;
      totalWords += result.metadata.wordCount || 0;
      if (result.success) successful++;
    }

    return {
      totalFiles: this.queue.length,
      successful,
      failed: this.queue.length - successful,
      byFormat,
      totalTables,
      totalWords,
      results,
      processingTimeMs: Date.now() - startTime,
    };
  }

  static getResult(path: string): ExtractionResult | null {
    return this.results.get(path) || null;
  }

  static getAllResults(): ExtractionResult[] {
    return [...this.results.values()];
  }

  static findByToolCode(toolCode: string): ExtractionResult[] {
    const upper = toolCode.toUpperCase();
    return [...this.results.values()].filter((r) =>
      r.extractedData.toolCodes.some((t) => t.toUpperCase().includes(upper))
    );
  }

  static findByMaterial(material: string): ExtractionResult[] {
    const lower = material.toLowerCase();
    return [...this.results.values()].filter((r) =>
      r.extractedData.materials.some((m) => m.toLowerCase().includes(lower))
    );
  }

  static findByPartNumber(partNumber: string): ExtractionResult[] {
    const upper = partNumber.toUpperCase();
    return [...this.results.values()].filter((r) =>
      r.extractedData.partNumbers.some((p) => p.toUpperCase().includes(upper))
    );
  }

  /** Free-text keyword search across section content + every extracted-data field. */
  static searchByKeyword(keyword: string): ExtractionResult[] {
    const lower = keyword.toLowerCase();
    return [...this.results.values()].filter((r) =>
      r.sections.some((s) => typeof s.content === "string" && s.content.toLowerCase().includes(lower)) ||
      Object.values(r.extractedData).some((arr) => arr.some((v) => v.toLowerCase().includes(lower)))
    );
  }

  static getQueueStats(): { queued: number; processed: number; pending: number; byFormat: Record<string, number> } {
    const byFormat: Record<string, number> = {};
    for (const path of this.queue) {
      const format = detectFormat(path);
      byFormat[format] = (byFormat[format] || 0) + 1;
    }
    return {
      queued: this.queue.length,
      processed: this.results.size,
      pending: this.queue.length - this.results.size,
      byFormat,
    };
  }

  static reset(): void {
    this.results.clear();
    this.queue = [];
    log.info('[OfficeDocumentPipeline] State reset');
  }
}

export const officeDocumentPipelineEngine = OfficeDocumentPipelineEngine;
export default OfficeDocumentPipelineEngine;
