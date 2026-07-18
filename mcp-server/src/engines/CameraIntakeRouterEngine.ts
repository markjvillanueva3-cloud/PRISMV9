/**
 * CameraIntakeRouterEngine — QUOTING-PIPELINE-MS0 / U-QP02
 *
 * Classifies an OCR'd camera image into one of 4 routes:
 *   - blueprint            → BlueprintToQuoteBridgeEngine
 *   - insert-box           → InsertBoxToCatalogBridgeEngine (U-QP03)
 *   - tool-body            → InsertBoxToCatalogBridgeEngine (U-QP03, shared route)
 *   - machine-service-tag  → MachineServiceTagOCREngine (U-QP04)
 *   - unknown              → fail-loud (R12) — caller must handle, no silent default
 *
 * Input is the OCRResult shape from ImageOCRPipelineEngine (already extracted
 * via upstream pixel-OCR). The router does pure pattern + lexicon classification
 * on the extracted-text features — NO image bytes, no pixel work.
 *
 * Per CLAUDE.md R5: this is a deterministic classifier (regex + lexicon + score),
 * NOT a model call. Pure-function routing.
 *
 * Per CLAUDE.md R12 (fail-loud):
 *   - classify(...) returns { route, confidence, evidence[] } — confidence < threshold
 *     yields route = "unknown" with the evidence the caller can use to decide
 *   - Empty/missing input → route="unknown" with explicit reason, NOT a default-blueprint
 *
 * @milestone QUOTING-PIPELINE-MS0/U-QP02-CAMERA-INTAKE-ROUTER
 * @author slot:charlie /goal-13 iter2, 2026-05-24
 */

export type CameraRoute = "blueprint" | "insert-box" | "tool-body" | "machine-service-tag" | "unknown";

export interface CameraIntakeInput {
  /** Pre-OCR'd text (from ImageOCRPipelineEngine.processImage output) */
  text: string;
  /** Optional structured extraction (also from ImageOCRPipelineEngine) */
  extractedData?: {
    numbers?: string[];
    dates?: string[];
    measurements?: string[];
    toolCodes?: string[];
    partNumbers?: string[];
  };
  /** Optional OCR-quality signal — low quality drops final confidence */
  ocrConfidence?: number;
}

export interface RouteEvidence {
  route: CameraRoute;
  /** Per-route raw score (sum of feature weights matched) */
  rawScore: number;
  /** Human-readable evidence trail */
  matched: string[];
}

export interface CameraIntakeClassification {
  route: CameraRoute;
  /** Normalized 0..1 confidence in the chosen route */
  confidence: number;
  /** Full evidence per candidate route (for debugging + chat-router citations) */
  candidates: RouteEvidence[];
  /** Why an "unknown" verdict was returned (empty for known routes) */
  reason?: string;
}

/** Minimum normalized confidence below which we return "unknown" (R12). */
const MIN_ROUTE_CONFIDENCE = 0.30;

// ─── Lexicons + patterns per route ───────────────────────────────────

/** Title-block / drawing-frame lexicon — distinctly blueprint-y. */
const BLUEPRINT_LEXICON = [
  "drawn by", "checked by", "approved by", "scale", "tolerance",
  "third angle", "first angle", "rev", "revision", "drawing no",
  "drawing number", "part no", "part number", "material spec", "sheet",
  "finish", "do not scale", "all dimensions", "unless otherwise",
];
/** GD&T-specific tokens (high-precision blueprint signal). */
const GDT_TOKENS = [
  "⌖", "⏥", "○", "⌭", "⌒", "∥", "⟂", "∠", "↗", "⊕", "⊜",
  "mmc", "lmc", "rfs", "datum",
];
/** Dimension callout shape (e.g. "Ø12.7", "M6×1", "R0.5", "±0.01"). */
const DIM_PATTERN = /(Ø|⌀|±|R\d|M\d+×|×\d+|\d+\s*°|\d+\.\d+\s*(mm|in)\b)/i;

/** Insert / tool body designation codes (ISO 1832 for inserts; common vendor SKUs). */
const INSERT_PATTERN = /\b([CDS][NPC][MG][G]|[CDST][CDPMS][GMA])[A-Z0-9]{3,6}[-\s]?[A-Z0-9]{2,6}\b/;
/** Vendor brands that appear on insert/tool boxes. */
const INSERT_BRAND_LEXICON = [
  "sandvik", "kennametal", "iscar", "kyocera", "mitsubishi materials",
  "seco", "walter", "sumitomo", "tungaloy", "kyocera unimerco", "carmex",
];
/** Tool-body callouts. */
const TOOL_BODY_LEXICON = [
  "shank", "ø shank", "shank dia", "end mill", "drill", "boring bar",
  "indexable", "face mill", "slot mill", "chamfer mill", "taper shank",
];

/** Machine service-tag lexicon (industry serial-tag boilerplate). */
const SERVICE_TAG_LEXICON = [
  "serial no", "serial number", "s/n", "model no", "model number",
  "spindle hp", "spindle power", "voltage", "phase", "amperage",
  "manufactured", "mfg date", "machine no", "control type",
];
/** Machine-builder names. */
const MACHINE_BUILDER_LEXICON = [
  "haas", "okuma", "mazak", "doosan", "hurco", "fanuc", "siemens",
  "mori seiki", "dmg mori", "makino", "matsuura", "tsugami", "kitamura",
  "sodick", "agie", "mitsubishi edm", "fanuc robocut", "charmilles",
  "roku-roku", "brother", "robodrill",
];
/** SN tag patterns (e.g. "S/N: 234A567", "Model VF-2"). */
const SERIAL_PATTERN = /\b(s\/n|serial|sn)\s*[:#]?\s*[A-Z0-9-]{4,}\b/i;
const MODEL_PATTERN = /\b(model|m\/n)\s*[:#]?\s*[A-Z0-9-]{2,}\b/i;

// ─── Scoring engine ─────────────────────────────────────────────────

function countLexicon(text: string, lex: string[]): { hits: number; matches: string[] } {
  const lower = text.toLowerCase();
  const matches: string[] = [];
  for (const term of lex) {
    if (lower.includes(term.toLowerCase())) matches.push(term);
  }
  return { hits: matches.length, matches };
}

function scoreBlueprint(input: CameraIntakeInput): RouteEvidence {
  const matched: string[] = [];
  let score = 0;
  const lex = countLexicon(input.text, BLUEPRINT_LEXICON);
  score += lex.hits * 1.0;
  matched.push(...lex.matches.map((m) => `lex:${m}`));
  const gdt = countLexicon(input.text, GDT_TOKENS);
  score += gdt.hits * 1.5; // GD&T is a high-precision signal
  matched.push(...gdt.matches.map((m) => `gdt:${m}`));
  if (DIM_PATTERN.test(input.text)) {
    score += 1.0;
    matched.push("pattern:dim");
  }
  const measurements = input.extractedData?.measurements ?? [];
  if (measurements.length >= 3) {
    score += 1.0;
    matched.push(`measurements:${measurements.length}`);
  }
  return { route: "blueprint", rawScore: score, matched };
}

function scoreInsertBox(input: CameraIntakeInput): RouteEvidence {
  const matched: string[] = [];
  let score = 0;
  if (INSERT_PATTERN.test(input.text)) {
    score += 2.5; // ISO 1832 designation = near-definitive insert signal
    matched.push("pattern:iso1832");
  }
  const brand = countLexicon(input.text, INSERT_BRAND_LEXICON);
  score += brand.hits * 1.0;
  matched.push(...brand.matches.map((m) => `brand:${m}`));
  const partNos = input.extractedData?.partNumbers ?? [];
  if (partNos.length >= 1) {
    score += 0.5;
    matched.push(`partNumbers:${partNos.length}`);
  }
  const toolCodes = input.extractedData?.toolCodes ?? [];
  if (toolCodes.length >= 1) {
    score += 0.5;
    matched.push(`toolCodes:${toolCodes.length}`);
  }
  return { route: "insert-box", rawScore: score, matched };
}

function scoreToolBody(input: CameraIntakeInput): RouteEvidence {
  const matched: string[] = [];
  let score = 0;
  const lex = countLexicon(input.text, TOOL_BODY_LEXICON);
  score += lex.hits * 1.2;
  matched.push(...lex.matches.map((m) => `lex:${m}`));
  // Tool bodies often share brands with insert boxes
  const brand = countLexicon(input.text, INSERT_BRAND_LEXICON);
  score += brand.hits * 0.5;
  matched.push(...brand.matches.map((m) => `brand-overlap:${m}`));
  const toolCodes = input.extractedData?.toolCodes ?? [];
  if (toolCodes.length >= 2) {
    score += 1.0; // multiple tool codes on a tool body = strong signal
    matched.push(`toolCodes:${toolCodes.length}`);
  }
  return { route: "tool-body", rawScore: score, matched };
}

function scoreServiceTag(input: CameraIntakeInput): RouteEvidence {
  const matched: string[] = [];
  let score = 0;
  const lex = countLexicon(input.text, SERVICE_TAG_LEXICON);
  score += lex.hits * 1.2;
  matched.push(...lex.matches.map((m) => `lex:${m}`));
  const builder = countLexicon(input.text, MACHINE_BUILDER_LEXICON);
  score += builder.hits * 1.5;
  matched.push(...builder.matches.map((m) => `builder:${m}`));
  if (SERIAL_PATTERN.test(input.text)) {
    score += 1.5;
    matched.push("pattern:serial");
  }
  if (MODEL_PATTERN.test(input.text)) {
    score += 1.0;
    matched.push("pattern:model");
  }
  return { route: "machine-service-tag", rawScore: score, matched };
}

// ─── Public API ─────────────────────────────────────────────────────

export class CameraIntakeRouterEngine {
  /** Classify a camera-OCR'd image into a route. Pure function; no I/O. */
  classify(input: CameraIntakeInput): CameraIntakeClassification {
    // R12: empty or NaN input → unknown with explicit reason, NOT default-blueprint.
    if (!input || typeof input.text !== "string" || input.text.trim().length === 0) {
      return {
        route: "unknown",
        confidence: 0,
        candidates: [],
        reason: "empty-or-missing-text",
      };
    }

    const evidences: RouteEvidence[] = [
      scoreBlueprint(input),
      scoreInsertBox(input),
      scoreToolBody(input),
      scoreServiceTag(input),
    ];
    evidences.sort((a, b) => b.rawScore - a.rawScore);

    const top = evidences[0];
    const runnerUp = evidences[1];
    const totalSignal = evidences.reduce((s, e) => s + e.rawScore, 0);

    // Normalize: top-score / total-signal, with a noise floor of 1.0 total
    // (so a single-hit classification doesn't claim 100% confidence).
    let confidence = totalSignal > 0 ? top.rawScore / Math.max(totalSignal, 1.0) : 0;

    // Downscale by OCR quality if upstream gave us one
    if (typeof input.ocrConfidence === "number" && Number.isFinite(input.ocrConfidence)) {
      const ocrClamped = Math.max(0, Math.min(1, input.ocrConfidence));
      confidence *= ocrClamped;
    }

    // Tie-breaker discipline: if top and runner-up are within 0.5 raw, prefer the
    // more-specific route (insert-box > tool-body > service-tag > blueprint) since
    // blueprint is the catch-all that can match on mere "dimensions" alone.
    const SPECIFICITY_ORDER: Record<CameraRoute, number> = {
      "insert-box": 4, "machine-service-tag": 3, "tool-body": 2, "blueprint": 1, "unknown": 0,
    };
    let chosen: RouteEvidence = top;
    if (runnerUp && Math.abs(top.rawScore - runnerUp.rawScore) < 0.5) {
      if (SPECIFICITY_ORDER[runnerUp.route] > SPECIFICITY_ORDER[top.route]) {
        chosen = runnerUp;
      }
    }

    if (chosen.rawScore === 0 || confidence < MIN_ROUTE_CONFIDENCE) {
      return {
        route: "unknown",
        confidence,
        candidates: evidences,
        reason: chosen.rawScore === 0
          ? "no-route-features-matched"
          : `below-min-confidence(${MIN_ROUTE_CONFIDENCE})`,
      };
    }

    return {
      route: chosen.route,
      confidence: Math.max(0, Math.min(1, confidence)),
      candidates: evidences,
    };
  }

  /** Convenience: classify and return only the route + confidence. */
  routeOnly(input: CameraIntakeInput): { route: CameraRoute; confidence: number } {
    const c = this.classify(input);
    return { route: c.route, confidence: c.confidence };
  }
}

export const cameraIntakeRouterEngine = new CameraIntakeRouterEngine();
