/**
 * Drawing2DExtractionEngine — DXF/DWG 2D Drawing Parser
 * U-AWR28: 2D Drawing Extraction (124 DXF/DWG files)
 */

import { log } from '../utils/Logger.js';
import { parseDXFGroups } from './DXFGeometryParserEngine.js';

export type DrawingFormat = 'dxf' | 'dwg';
export type EntityType = 'line' | 'arc' | 'circle' | 'polyline' | 'dimension' | 'text' | 'block';

export interface Point2D { x: number; y: number; }

export interface DrawingEntity {
  id: string;
  type: EntityType;
  layer: string;
  color?: number;
  data: Record<string, unknown>;
}

export interface Dimension {
  id: string;
  type: 'linear' | 'angular' | 'radial' | 'diameter';
  value: number;
  // 'unknown' = DXF had no $INSUNITS header. UNITS-FIRST: never collapse unknown -> 'mm'
  // (a 25.4x trap); a downstream normalizer forces needs_confirm on a non-mm/in unit.
  unit: 'mm' | 'in' | 'unknown';
  text: string;
}

export interface DrawingMetadata {
  path: string;
  name: string;
  format: DrawingFormat;
  units: 'mm' | 'in' | 'unknown';
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  layers: string[];
  entityCount: number;
}

export interface ExtractionResult {
  metadata: DrawingMetadata;
  entities: DrawingEntity[];
  dimensions: Dimension[];
  annotations: string[];
  partInfo: { partNumber?: string; revision?: string; material?: string };
  success: boolean;
  warnings: string[];
  processingTimeMs: number;
}

export interface BatchExtractionResult {
  totalFiles: number;
  successful: number;
  failed: number;
  byFormat: Record<DrawingFormat, number>;
  totalEntities: number;
  totalDimensions: number;
  results: ExtractionResult[];
  processingTimeMs: number;
}

const PATTERNS = {
  partNumber: /(?:PART|P\/N|PN|DRAWING)[\s#:]*([A-Z0-9]+-[A-Z0-9-]+)/i,
  revision: /(?:REV|REVISION)[\s.:]*([A-Z0-9]+)/i,
  material: /(?:MATERIAL|MAT)[\s.:]*([A-Z0-9\s-]+?)(?:\s|$)/i,
};

function detectFormat(filename: string): DrawingFormat {
  return filename.toLowerCase().endsWith('.dwg') ? 'dwg' : 'dxf';
}

function generateEntityId(): string {
  return 'ent-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
}

function extractPartInfo(annotations: string[]): ExtractionResult['partInfo'] {
  const combined = annotations.join(' ');
  return {
    partNumber: combined.match(PATTERNS.partNumber)?.[1],
    revision: combined.match(PATTERNS.revision)?.[1],
    material: combined.match(PATTERNS.material)?.[1]?.trim(),
  };
}

interface ParsedDxf {
  entities: DrawingEntity[];
  dimensions: Dimension[];
  annotations: string[];
  layers: string[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  units: 'mm' | 'in' | 'unknown';
}

export class Drawing2DExtractionEngine {
  private static results: Map<string, ExtractionResult> = new Map();
  private static queue: string[] = [];

  static registerDrawing(path: string): void {
    this.queue.push(path);
    log.info('[Drawing2DExtraction] Registered: ' + path);
  }

  static registerBatch(paths: string[]): void {
    paths.forEach((p) => this.registerDrawing(p));
  }

  static extractDrawing(path: string, simulatedData?: {
    entities?: DrawingEntity[];
    dimensions?: Dimension[];
    annotations?: string[];
    layers?: string[];
    /** Raw DXF file text. When supplied (dispatcher reads the file; engine stays
     *  I/O-free) the drawing is parsed for REAL -- entities + DIMENSION values + layers
     *  + bounds + $INSUNITS. Explicit entities/dimensions still override (back-compat). */
    content?: string;
  }): ExtractionResult {
    const startTime = Date.now();
    const warnings: string[] = [];
    const name = path.split(/[\/\\]/).pop() || path;
    const format = detectFormat(name);

    if (format === 'dwg') {
      warnings.push('DWG format requires ODA SDK for full extraction');
    }

    // U-XRAY-DRAWING-EXTRACT-REAL-DXF: parse real DXF content when provided and not
    // explicitly overridden. When neither content nor sim data is present the prior
    // empty-success behavior holds (a path-only call with no file on disk).
    let parsed: ParsedDxf | null = null;
    if (format === 'dxf' && simulatedData?.content && !simulatedData?.entities && !simulatedData?.dimensions) {
      try {
        parsed = Drawing2DExtractionEngine.parseDxfContent(simulatedData.content);
        if (parsed.units === 'unknown') {
          warnings.push('DXF has no $INSUNITS header -- dimensions marked unit:unknown (operator must confirm units; NOT trusted as mm)');
        }
      } catch (e) {
        warnings.push('DXF parse failed: ' + (e instanceof Error ? e.message : String(e)));
      }
    }

    const entities = simulatedData?.entities ?? parsed?.entities ?? [];
    const dimensions = simulatedData?.dimensions ?? parsed?.dimensions ?? [];
    const layers = simulatedData?.layers ?? parsed?.layers ?? ['0'];
    // Real-parsed text annotations + any explicitly-supplied (title-block) annotations.
    const annotations = [...(parsed?.annotations ?? []), ...(simulatedData?.annotations ?? [])];

    const metadata: DrawingMetadata = {
      path, name, format,
      units: parsed?.units ?? 'mm',
      bounds: parsed?.bounds ?? { minX: 0, minY: 0, maxX: 100, maxY: 100 },
      layers,
      entityCount: entities.length,
    };

    const result: ExtractionResult = {
      metadata,
      entities,
      dimensions,
      annotations,
      partInfo: extractPartInfo(annotations),
      success: true,
      warnings,
      processingTimeMs: Date.now() - startTime,
    };

    this.results.set(path, result);
    log.info('[Drawing2DExtraction] Extracted ' + name + ': ' + entities.length + ' entities');
    return result;
  }

  /**
   * Parse raw DXF text into REAL entities + DIMENSION values, layers, annotations
   * (TEXT/MTEXT), bounds, and header units ($INSUNITS). Pure -- no I/O; reuses the
   * strict 2-line group tokenizer from DXFGeometryParserEngine.
   *
   * DXF DIMENSION reference: group 70 (& 7) = type (0/1 linear, 2/5 angular, 3 diameter,
   * 4 radius, 6 ordinate); group 42 = the measured value; group 1 = text override
   * (empty or "<>" means use the measured value).
   */
  static parseDxfContent(content: string): ParsedDxf {
    const groups = parseDXFGroups(content);

    // Header units: $INSUNITS code 70 (1 = inch, 4 = mm).
    let units: 'mm' | 'in' | 'unknown' = 'unknown';
    for (let i = 0; i + 1 < groups.length; i++) {
      if (groups[i][0] === 9 && groups[i][1] === '$INSUNITS') {
        const v = parseInt(groups[i + 1][1], 10);
        if (v === 1) units = 'in';
        else if (v === 4) units = 'mm';
        break;
      }
    }

    const emptyBounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

    // Bound the entity walk to the ENTITIES section (skip HEADER/TABLES/BLOCKS noise).
    let start = -1;
    let end = groups.length;
    for (let i = 0; i + 1 < groups.length; i++) {
      if (groups[i][0] === 0 && groups[i][1] === 'SECTION' && groups[i + 1][0] === 2 && groups[i + 1][1] === 'ENTITIES') {
        start = i + 2;
        break;
      }
    }
    if (start === -1) {
      return { entities: [], dimensions: [], annotations: [], layers: ['0'], bounds: emptyBounds, units };
    }
    for (let i = start; i < groups.length; i++) {
      if (groups[i][0] === 0 && groups[i][1] === 'ENDSEC') { end = i; break; }
    }

    const entities: DrawingEntity[] = [];
    const dimensions: Dimension[] = [];
    const annotations: string[] = [];
    const layerSet = new Set<string>();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const ENTITY_TYPE_MAP: Record<string, EntityType> = {
      LINE: 'line', CIRCLE: 'circle', ARC: 'arc',
      LWPOLYLINE: 'polyline', POLYLINE: 'polyline',
      TEXT: 'text', MTEXT: 'text', INSERT: 'block',
    };
    const DIM_TYPE: Record<number, Dimension['type']> = {
      0: 'linear', 1: 'linear', 2: 'angular', 3: 'diameter', 4: 'radial', 5: 'angular', 6: 'linear',
    };

    let i = start;
    while (i < end) {
      if (groups[i][0] !== 0) { i++; continue; }
      const etype = groups[i][1];
      const props: Record<number, string[]> = {};
      let j = i + 1;
      while (j < end && groups[j][0] !== 0) {
        (props[groups[j][0]] ??= []).push(groups[j][1]);
        j++;
      }
      i = j;

      const layer = props[8]?.[0] ?? '0';
      for (const x of props[10] ?? []) { const n = parseFloat(x); if (!isNaN(n)) { minX = Math.min(minX, n); maxX = Math.max(maxX, n); } }
      for (const y of props[20] ?? []) { const n = parseFloat(y); if (!isNaN(n)) { minY = Math.min(minY, n); maxY = Math.max(maxY, n); } }

      if (etype === 'DIMENSION') {
        layerSet.add(layer);
        const value = parseFloat(props[42]?.[0] ?? '');
        if (!isNaN(value)) {
          const type70 = (parseInt(props[70]?.[0] ?? '0', 10) || 0) & 7;
          const dtype = DIM_TYPE[type70] ?? 'linear';
          const override = props[1]?.[0];
          const text = override && override !== '' && override !== '<>' ? override : String(value);
          // UNITS-FIRST: per-dim unit follows the header; 'unknown' (no $INSUNITS) is NOT
          // collapsed to mm -- it propagates so the contract normalizer forces needs_confirm.
          dimensions.push({ id: generateEntityId(), type: dtype, value, unit: units, text });
        }
        entities.push({ id: generateEntityId(), type: 'dimension', layer, data: { value: props[42]?.[0], dimType: props[70]?.[0] } });
        continue;
      }

      if (etype === 'TEXT' || etype === 'MTEXT') {
        layerSet.add(layer);
        const txt = (props[1] ?? []).join(' ').trim();
        if (txt) annotations.push(txt);
        entities.push({ id: generateEntityId(), type: 'text', layer, data: { text: txt } });
        continue;
      }

      const mapped = ENTITY_TYPE_MAP[etype];
      if (mapped) {
        layerSet.add(layer);
        entities.push({ id: generateEntityId(), type: mapped, layer, data: {} });
      }
    }

    const bounds = isFinite(minX) ? { minX, minY, maxX, maxY } : emptyBounds;
    const layers = layerSet.size ? [...layerSet] : ['0'];
    return { entities, dimensions, annotations, layers, bounds, units };
  }

  static extractBatch(simulatedData?: Map<string, Parameters<typeof this.extractDrawing>[1]>): BatchExtractionResult {
    const startTime = Date.now();
    const results: ExtractionResult[] = [];
    const byFormat: Record<DrawingFormat, number> = { dxf: 0, dwg: 0 };
    let totalEntities = 0, totalDimensions = 0, successful = 0;

    for (const path of this.queue) {
      const data = simulatedData?.get(path);
      const result = this.extractDrawing(path, data);
      results.push(result);
      byFormat[result.metadata.format]++;
      totalEntities += result.entities.length;
      totalDimensions += result.dimensions.length;
      if (result.success) successful++;
    }

    return {
      totalFiles: this.queue.length,
      successful,
      failed: this.queue.length - successful,
      byFormat,
      totalEntities,
      totalDimensions,
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

  static findByPartNumber(partNumber: string): ExtractionResult[] {
    const lower = partNumber.toLowerCase();
    return [...this.results.values()].filter(
      (r) => r.partInfo.partNumber?.toLowerCase().includes(lower)
    );
  }

  static getQueueStats(): { queued: number; processed: number; pending: number; byFormat: Record<string, number> } {
    const byFormat: Record<string, number> = { dxf: 0, dwg: 0 };
    for (const path of this.queue) {
      const format = detectFormat(path);
      byFormat[format]++;
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
    log.info('[Drawing2DExtraction] State reset');
  }
}

export const drawing2DExtractionEngine = Drawing2DExtractionEngine;
export default Drawing2DExtractionEngine;
