/**
 * IntakeArtifactProcessorEngine — auto-populates tooling + inventory + parts
 * from PDFs extracted by EmailPrintIntakeEngine (hotel iter25).
 *
 * Operator directive (2026-05-25): "make sure pdf intake features are active
 * in the app for auto populating tooling and inventory and properly
 * synergized to the whole app and all features"
 *
 * Pure-core processor — text extraction via injected PdfTextExtractor; routes
 * parsed entities to ToolingSink / InventorySink / PartSink with confidence
 * filter. Below-threshold matches → ReviewQueueSink instead of silent write.
 *
 * Hotel-soul invariants:
 *   - Never auto-routes below confidence floor (R12 fail-LOUD)
 *   - Never overwrites — only proposes (sinks decide conflict policy)
 *   - PII redaction on every raw_text excerpt (phones, SSNs, emails)
 *   - Per-artifact audit history kept on engine for review
 */

import type { ExtractedArtifact } from "./EmailPrintIntakeEngine.js";

export const INVENTORY_CONFIDENCE_FLOOR = 0.85;
export const TOOLING_CONFIDENCE_FLOOR = 0.80;
export const PART_CONFIDENCE_FLOOR = 0.90;
export const MAX_PDF_TEXT_BYTES = 10 * 1024 * 1024;

export interface ParsedTool {
  raw_text: string;
  category: "drill" | "end_mill" | "tap" | "reamer" | "insert" | "boring_bar" | "unknown";
  diameter_mm?: number;
  diameter_in?: number;
  flute_count?: number;
  material?: "hss" | "carbide" | "cobalt" | "diamond" | "cermet" | "unknown";
  coating?: "tin" | "tialn" | "altin" | "dlc" | "uncoated" | "unknown";
  confidence: number;
}

export interface ParsedInventoryItem {
  raw_text: string;
  category: "raw_stock" | "fastener" | "consumable" | "part_in_process" | "unknown";
  description: string;
  quantity?: number;
  unit?: "ea" | "ft" | "in" | "lb" | "kg";
  material_spec?: string;
  confidence: number;
}

export interface ParsedPart {
  raw_text: string;
  part_number: string;
  drawing_number?: string;
  revision?: string;
  customer?: string;
  confidence: number;
}

export interface ProcessedResult {
  artifact_sha256: string;
  source_user_id: string;
  source_filename: string;
  processed_at: string;
  tools_extracted: ParsedTool[];
  inventory_extracted: ParsedInventoryItem[];
  parts_extracted: ParsedPart[];
  tools_routed: number;
  inventory_routed: number;
  parts_routed: number;
  review_queue_count: number;
  errors: string[];
}

export interface PdfTextExtractor {
  extract(bytes: Uint8Array): Promise<string>;
}
export interface ToolingSink {
  proposeTool(tool: ParsedTool, source: { sha256: string; user_id: string }): Promise<void>;
}
export interface InventorySink {
  proposeInventoryItem(item: ParsedInventoryItem, source: { sha256: string; user_id: string }): Promise<void>;
}
export interface PartSink {
  proposePart(part: ParsedPart, source: { sha256: string; user_id: string }): Promise<void>;
}
export interface ReviewQueueSink {
  queue(
    kind: "tool" | "inventory" | "part",
    entity: ParsedTool | ParsedInventoryItem | ParsedPart,
    reason: string,
    source: { sha256: string; user_id: string }
  ): Promise<void>;
}

export class InMemoryToolingSink implements ToolingSink {
  public proposed: Array<{ tool: ParsedTool; source: { sha256: string; user_id: string } }> = [];
  async proposeTool(tool: ParsedTool, source: { sha256: string; user_id: string }): Promise<void> {
    this.proposed.push({ tool, source });
  }
}
export class InMemoryInventorySink implements InventorySink {
  public proposed: Array<{ item: ParsedInventoryItem; source: { sha256: string; user_id: string } }> = [];
  async proposeInventoryItem(item: ParsedInventoryItem, source: { sha256: string; user_id: string }): Promise<void> {
    this.proposed.push({ item, source });
  }
}
export class InMemoryPartSink implements PartSink {
  public proposed: Array<{ part: ParsedPart; source: { sha256: string; user_id: string } }> = [];
  async proposePart(part: ParsedPart, source: { sha256: string; user_id: string }): Promise<void> {
    this.proposed.push({ part, source });
  }
}
export class InMemoryReviewQueue implements ReviewQueueSink {
  public queued: Array<{
    kind: "tool" | "inventory" | "part";
    entity: ParsedTool | ParsedInventoryItem | ParsedPart;
    reason: string;
    source: { sha256: string; user_id: string };
  }> = [];
  async queue(
    kind: "tool" | "inventory" | "part",
    entity: ParsedTool | ParsedInventoryItem | ParsedPart,
    reason: string,
    source: { sha256: string; user_id: string }
  ): Promise<void> {
    this.queued.push({ kind, entity, reason, source });
  }
}

export function redactPII(text: string): string {
  return text
    // SSN: 123-45-6789
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "***-**-****")
    // Phone parens form: (708) 343-0900 — no leading \b (paren is non-word)
    .replace(/\(\d{3}\)\s*\d{3}-\d{4}/g, "(***) ***-****")
    // Phone dash form: 708-343-0900
    .replace(/\b\d{3}-\d{3}-\d{4}\b/g, "***-***-****")
    // Email
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "***@***");
}

const TOOL_PATTERNS: Array<{ regex: RegExp; category: ParsedTool["category"]; baseConfidence: number }> = [
  { regex: /(\d+(?:\.\d+)?(?:\/\d+)?)\s*(?:"|in|inch)?\s*(\d+)[\s-]?flute[\s-]?(carbide|cobalt|hss)\s+end[\s-]?mill/gi, category: "end_mill", baseConfidence: 0.92 },
  { regex: /(\d+(?:\.\d+)?(?:\/\d+)?)\s*(?:"|in|inch)?\s+drill\s*(?:bit)?/gi, category: "drill", baseConfidence: 0.85 },
  { regex: /(\d+\/\d+)[-\s](\d+)\s+tap\b/gi, category: "tap", baseConfidence: 0.90 },
  { regex: /(\d+\.\d{3,4})\s+reamer\b/gi, category: "reamer", baseConfidence: 0.88 },
  { regex: /\b(CNMG|DNMG|WNMG|TPMR|SPGN|CCMT|VBGT|DCMT)\b/g, category: "insert", baseConfidence: 0.85 },
];

const INVENTORY_PATTERNS: Array<{ regex: RegExp; category: ParsedInventoryItem["category"]; baseConfidence: number }> = [
  { regex: /(\d+(?:\.\d+)?)\s*(lb|lbs|kg|ft|in)\s+(\d{4}[A-Z]?(?:\s*-?\s*[HT]\d+)?)\s+(round\s*bar|plate|sheet|tube|block)/gi, category: "raw_stock", baseConfidence: 0.90 },
  { regex: /(\d+)\s+(?:pcs?|ea)\s+(M\d+(?:x\d+)?|[\d/]+-\d+)\s+(socket\s*head\s*cap\s*screw|bolt|nut|washer|screw)/gi, category: "fastener", baseConfidence: 0.88 },
];

const PART_PATTERNS: Array<{
  regex: RegExp;
  prefix?: "PN-";       // if set, prepended to captured id to form canonical part_number
  group_part: number;
  group_rev: number | null;
  baseConfidence: number;
}> = [
  // PN-12345 Rev B / Part# 12345 — canonicalized to "PN-12345"
  { regex: /(?:P\/?N|Part\s*#?)[:\s-]*([A-Z0-9][A-Z0-9-]{3,15})(?:\s+[Rr]ev(?:ision)?[\s.:]*([A-Z]\d?))?/g, prefix: "PN-", group_part: 1, group_rev: 2, baseConfidence: 0.92 },
  // Drawing: ABC-12345 — left as-is (drawing-numbers carry their own prefix system)
  { regex: /(?:Drawing|Dwg)[:\s#]*([A-Z]{2,6}-?\d{3,8})/gi, group_part: 1, group_rev: null, baseConfidence: 0.90 },
];

function parseDiameter(s: string): { inches: number; mm: number } | null {
  if (!s) return null;
  let inches: number;
  if (s.includes("/")) {
    const [num, denom] = s.split("/").map((x) => parseFloat(x));
    if (!Number.isFinite(num) || !Number.isFinite(denom) || denom === 0) return null;
    inches = num / denom;
  } else {
    inches = parseFloat(s);
    if (!Number.isFinite(inches)) return null;
  }
  return { inches, mm: inches * 25.4 };
}

function dedupeTools(tools: ParsedTool[]): ParsedTool[] {
  const seen = new Map<string, ParsedTool>();
  for (const t of tools) {
    // Inserts are identified by their ISO code (raw_text) — geometry fields blank,
    // so dedup by raw_text. Cutting tools dedup by spec (category|diameter|flute|material).
    const key =
      t.category === "insert"
        ? `insert|${t.raw_text.toUpperCase()}`
        : `${t.category}|${t.diameter_in ?? "?"}|${t.flute_count ?? "?"}|${t.material ?? "?"}`;
    const prior = seen.get(key);
    if (!prior || t.confidence > prior.confidence) seen.set(key, t);
  }
  return [...seen.values()];
}

export function parseTools(text: string): ParsedTool[] {
  const out: ParsedTool[] = [];
  for (const pattern of TOOL_PATTERNS) {
    const re = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const tool: ParsedTool = {
        raw_text: redactPII(match[0]),
        category: pattern.category,
        confidence: pattern.baseConfidence,
      };
      if (pattern.category === "end_mill") {
        const fluteCount = parseInt(match[2], 10);
        if (Number.isFinite(fluteCount) && fluteCount >= 2 && fluteCount <= 12) {
          tool.flute_count = fluteCount;
          tool.confidence += 0.03;
        }
        const matStr = match[3]?.toLowerCase();
        if (matStr === "carbide" || matStr === "cobalt" || matStr === "hss") {
          tool.material = matStr as ParsedTool["material"];
        }
        const diam = parseDiameter(match[1]);
        if (diam) {
          tool.diameter_in = diam.inches;
          tool.diameter_mm = diam.mm;
        }
      } else if (pattern.category === "drill" || pattern.category === "reamer") {
        const diam = parseDiameter(match[1]);
        if (diam) {
          tool.diameter_in = diam.inches;
          tool.diameter_mm = diam.mm;
        }
      }
      tool.confidence = Math.min(1.0, tool.confidence);
      out.push(tool);
    }
  }
  return dedupeTools(out);
}

export function parseInventoryItems(text: string): ParsedInventoryItem[] {
  const out: ParsedInventoryItem[] = [];
  for (const pattern of INVENTORY_PATTERNS) {
    const re = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const item: ParsedInventoryItem = {
        raw_text: redactPII(match[0]),
        category: pattern.category,
        description: match[0].trim(),
        confidence: pattern.baseConfidence,
      };
      if (pattern.category === "raw_stock") {
        const qty = parseFloat(match[1]);
        if (Number.isFinite(qty)) {
          item.quantity = qty;
          item.unit = match[2]?.toLowerCase() as ParsedInventoryItem["unit"];
        }
        item.material_spec = match[3]?.toUpperCase();
      } else if (pattern.category === "fastener") {
        const qty = parseFloat(match[1]);
        if (Number.isFinite(qty)) {
          item.quantity = qty;
          item.unit = "ea";
        }
      }
      out.push(item);
    }
  }
  return out;
}

export function parseParts(text: string): ParsedPart[] {
  const out: ParsedPart[] = [];
  for (const pattern of PART_PATTERNS) {
    const re = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const rawId = match[pattern.group_part]?.trim();
      if (!rawId) continue;
      // Canonicalize: PN-12345 if prefix-form pattern; ABC-12345 as-is for Drawing form.
      const canonical = pattern.prefix
        ? `${pattern.prefix}${rawId.replace(/^[-_\s]+/, "")}`
        : rawId;
      const rev = pattern.group_rev != null ? match[pattern.group_rev]?.trim() : undefined;
      out.push({
        raw_text: redactPII(match[0]),
        part_number: canonical.toUpperCase(),
        revision: rev,
        confidence: pattern.baseConfidence,
      });
    }
  }
  const seen = new Map<string, ParsedPart>();
  for (const p of out) {
    const prior = seen.get(p.part_number);
    if (!prior || p.confidence > prior.confidence) seen.set(p.part_number, p);
  }
  return [...seen.values()];
}

export class IntakeArtifactProcessorEngine {
  private history: ProcessedResult[] = [];

  constructor(
    private readonly pdfExtractor: PdfTextExtractor,
    private readonly toolingSink: ToolingSink,
    private readonly inventorySink: InventorySink,
    private readonly partSink: PartSink,
    private readonly reviewQueue: ReviewQueueSink
  ) {}

  async process(artifact: ExtractedArtifact, bytes: Uint8Array): Promise<ProcessedResult> {
    const result: ProcessedResult = {
      artifact_sha256: artifact.sha256,
      source_user_id: artifact.user_id,
      source_filename: artifact.filename,
      processed_at: new Date().toISOString(),
      tools_extracted: [],
      inventory_extracted: [],
      parts_extracted: [],
      tools_routed: 0,
      inventory_routed: 0,
      parts_routed: 0,
      review_queue_count: 0,
      errors: [],
    };

    if (artifact.extension !== "pdf") {
      this.history.push(result);
      return result;
    }

    let text: string;
    try {
      if (bytes.byteLength > MAX_PDF_TEXT_BYTES) {
        result.errors.push(`pdf_too_large: ${bytes.byteLength} bytes exceeds MAX_PDF_TEXT_BYTES=${MAX_PDF_TEXT_BYTES}`);
        this.history.push(result);
        return result;
      }
      text = await this.pdfExtractor.extract(bytes);
    } catch (err: unknown) {
      result.errors.push(`pdf_extract_error: ${err instanceof Error ? err.message : String(err)}`);
      this.history.push(result);
      return result;
    }

    if (!text || text.trim().length === 0) {
      this.history.push(result);
      return result;
    }

    result.tools_extracted = parseTools(text);
    result.inventory_extracted = parseInventoryItems(text);
    result.parts_extracted = parseParts(text);

    const source = { sha256: artifact.sha256, user_id: artifact.user_id };

    for (const tool of result.tools_extracted) {
      if (tool.confidence >= TOOLING_CONFIDENCE_FLOOR) {
        await this.toolingSink.proposeTool(tool, source);
        result.tools_routed += 1;
      } else {
        await this.reviewQueue.queue("tool", tool, `confidence ${tool.confidence.toFixed(2)} < floor ${TOOLING_CONFIDENCE_FLOOR}`, source);
        result.review_queue_count += 1;
      }
    }

    for (const item of result.inventory_extracted) {
      if (item.confidence >= INVENTORY_CONFIDENCE_FLOOR) {
        await this.inventorySink.proposeInventoryItem(item, source);
        result.inventory_routed += 1;
      } else {
        await this.reviewQueue.queue("inventory", item, `confidence ${item.confidence.toFixed(2)} < floor ${INVENTORY_CONFIDENCE_FLOOR}`, source);
        result.review_queue_count += 1;
      }
    }

    for (const part of result.parts_extracted) {
      if (part.confidence >= PART_CONFIDENCE_FLOOR) {
        await this.partSink.proposePart(part, source);
        result.parts_routed += 1;
      } else {
        await this.reviewQueue.queue("part", part, `confidence ${part.confidence.toFixed(2)} < floor ${PART_CONFIDENCE_FLOOR}`, source);
        result.review_queue_count += 1;
      }
    }

    this.history.push(result);
    return result;
  }

  history_get(): ProcessedResult[] {
    return [...this.history];
  }
  history_clear(): void {
    this.history = [];
  }
  history_summary(): {
    total_processed: number;
    total_tools_routed: number;
    total_inventory_routed: number;
    total_parts_routed: number;
    total_review_queue: number;
    total_errors: number;
  } {
    return {
      total_processed: this.history.length,
      total_tools_routed: this.history.reduce((s, r) => s + r.tools_routed, 0),
      total_inventory_routed: this.history.reduce((s, r) => s + r.inventory_routed, 0),
      total_parts_routed: this.history.reduce((s, r) => s + r.parts_routed, 0),
      total_review_queue: this.history.reduce((s, r) => s + r.review_queue_count, 0),
      total_errors: this.history.reduce((s, r) => s + r.errors.length, 0),
    };
  }
}
