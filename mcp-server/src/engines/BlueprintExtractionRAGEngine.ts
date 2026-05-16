/**
 * BlueprintExtractionRAGEngine — BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U7
 *
 * The composition layer (centerpiece). Wraps the base vision call
 * (BlueprintVisionOCREngine) with RAG augmentation. For each extraction:
 *   1. Pre-classify the print (blueprint-infer-class + family + customer prior)
 *   2. Retrieve corpus context (top-k via embed-search, filtered by domain)
 *   3. Retrieve tribal knowledge (shop-floor priors)
 *   4. Retrieve prior similar prints (dim-signature near-neighbour)
 *   5. Compose extraction prompt with retrieved context
 *   6. Run vision call (+ optional ensemble corroboration)
 *   7. Fuse + bound (conformal stratification)
 *   8. Emit BlueprintExtraction with per-region confidence + cited sources
 *   9. Record outcome for later operator-confirmation pairing
 *
 * Pure-orchestration: every retriever + the vision call is injectable so the
 * engine can be unit-tested without network/disk dependencies and so the
 * production wiring can swap backends (Tesseract/Ollama vision/GPT-4V/etc).
 *
 * HARD RULE (spec): every extraction MUST cite ≥1 retrieved source. When no
 * context is retrievable, the engine returns a "no-prior" candidate with
 * empty sources AND a low-confidence flag — never a sourceless extraction
 * masquerading as confident. blueprint-accuracy-guard surfaces "no-prior"
 * candidates as drift.
 *
 * Output: BlueprintExtraction object — NEVER auto-applied. Operator reviews +
 * confirms or corrects (per `[[feedback_operator_in_the_loop]]`).
 *
 * @engine BlueprintExtractionRAGEngine
 * @milestone BLUEPRINT-OCR-TRAINING-MS1 / U-MS1-U7
 * @classification CRITICAL (centerpiece) — orchestration, no physics constants
 */

import { z } from "zod";

// ── Domain ──────────────────────────────────────────────────────────────────

export const EXTRACTION_DIM_TYPES = [
  "linear",
  "diameter",
  "radius",
  "gdt_positional",
  "gdt_runout",
  "gdt_profile",
  "thread_callout",
  "surface_finish",
  "material_callout",
  "note",
  "other",
] as const;
export type ExtractionDimType = (typeof EXTRACTION_DIM_TYPES)[number];

export const SOURCE_KINDS = ["corpus", "tribal", "similar_print", "family_template"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const CONFIDENCE_FLOORS = ["normal", "low_no_prior", "low_contradiction", "low_no_vision"] as const;
export type ConfidenceFloor = (typeof CONFIDENCE_FLOORS)[number];

/**
 * One cited source — every extraction carries an array of these. An empty
 * array IS allowed but ONLY in combination with a confidenceFloor !== "normal".
 */
export const RetrievedSourceSchema = z
  .object({
    kind: z.enum(SOURCE_KINDS),
    id: z.string().min(1),
    title: z.string().min(1),
    score: z.number().min(0).max(1),
    excerpt: z.string().optional(),
  })
  .strict();
export type RetrievedSource = z.infer<typeof RetrievedSourceSchema>;

/**
 * One region of the blueprint that was extracted. Per-region confidence
 * bounds come from conformal stratification.
 */
export const ExtractionRegionSchema = z
  .object({
    regionId: z.string().min(1),
    dimType: z.enum(EXTRACTION_DIM_TYPES),
    value: z.string(),
    confidence: z.number().min(0).max(1),
    confidenceLower: z.number().min(0).max(1),
    confidenceUpper: z.number().min(0).max(1),
    bbox: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }).strict().optional(),
    attentionTrace: z.string().optional(),
  })
  .strict()
  .refine(
    (r) => r.confidenceLower <= r.confidence && r.confidence <= r.confidenceUpper,
    "confidence must lie within [confidenceLower, confidenceUpper]",
  );
export type ExtractionRegion = z.infer<typeof ExtractionRegionSchema>;

/**
 * The full extraction candidate. ALWAYS emitted for operator review — never
 * auto-applied. HARD RULE: sources array OR confidenceFloor !== "normal".
 */
export const BlueprintExtractionSchema = z
  .object({
    extractionId: z.string().min(1),
    pdfPath: z.string().min(1),
    page: z.number().int().min(1),
    customer: z.string().optional(),
    familyMatchId: z.string().nullable(),
    regions: z.array(ExtractionRegionSchema),
    sources: z.array(RetrievedSourceSchema),
    confidenceFloor: z.enum(CONFIDENCE_FLOORS),
    contradictionsDetected: z.array(z.string()).default([]),
    extractedAt: z.string(),
    backendId: z.string().min(1),
    /** Comparison shape for blueprint_rag_compare_to_baseline action. */
    baselineRegions: z.array(ExtractionRegionSchema).optional(),
  })
  .strict()
  .refine(
    (e) =>
      e.sources.length > 0 ||
      (e.sources.length === 0 && e.confidenceFloor !== "normal"),
    "HARD RULE: sources.length > 0 OR confidenceFloor !== 'normal' (no sourceless extraction may claim normal confidence)",
  );
export type BlueprintExtraction = z.infer<typeof BlueprintExtractionSchema>;

// ── Public-facing types ─────────────────────────────────────────────────────

export interface ExtractRequest {
  pdfPath: string;
  page: number;
  customer?: string;
  /** Hint from upstream classifier; if absent, engine calls inferClass injectable. */
  dimTypeHint?: ExtractionDimType;
  /** Operator-supplied additional context. */
  operatorContext?: string;
}

export interface BlueprintExtractionRAGIO {
  inferClass?: (req: ExtractRequest) => Promise<{ classId: string; confidence: number } | null>;
  matchFamily?: (req: ExtractRequest, classId: string | null) => Promise<{ familyId: string; templateId: string } | null>;
  customerPriorPath?: (customer: string) => string | null;
  retrieveCorpus?: (req: ExtractRequest, opts: { topK: number; domain?: string }) => Promise<RetrievedSource[]>;
  retrieveTribal?: (req: ExtractRequest, opts: { topK: number }) => Promise<RetrievedSource[]>;
  retrieveSimilarPrints?: (req: ExtractRequest, opts: { topK: number }) => Promise<RetrievedSource[]>;
  composePrompt?: (req: ExtractRequest, retrieved: { corpus: RetrievedSource[]; tribal: RetrievedSource[]; similar: RetrievedSource[]; familyTemplate: RetrievedSource | null }) => string;
  visionExtract?: (req: ExtractRequest, prompt: string) => Promise<Array<{ regionId: string; dimType: ExtractionDimType; value: string; confidence: number; bbox?: { x: number; y: number; width: number; height: number } }>>;
  ensembleVision?: (req: ExtractRequest, prompt: string) => Promise<Array<{ regionId: string; value: string; confidence: number }>>;
  fuseRegions?: (primary: ExtractionRegion[], ensemble: Array<{ regionId: string; value: string; confidence: number }>) => ExtractionRegion[];
  conformalBound?: (regions: ExtractionRegion[]) => ExtractionRegion[];
  recordOutcome?: (extraction: BlueprintExtraction) => Promise<void>;
  now?: () => string;
}

export interface CompareToBaselineResult {
  agreedRegions: number;
  disagreedRegions: Array<{
    regionId: string;
    ragValue: string;
    baselineValue: string;
    ragConfidence: number;
    baselineConfidence: number;
  }>;
  ragOnlyRegions: string[];
  baselineOnlyRegions: string[];
}

// ── Engine ──────────────────────────────────────────────────────────────────

const DEFAULT_TOP_K = 5;
const MIN_TOP_K = 1;
const MAX_TOP_K = 50;
const LOW_CONFIDENCE_FLOOR_VALUE = 0.3;

export class BlueprintExtractionRAGEngine {
  public readonly schemaVersion = "1.0.0" as const;

  private readonly cachedExtractions = new Map<string, BlueprintExtraction>();

  /**
   * Main extract pipeline (steps 1-9 from the spec). Returns a candidate that
   * MUST be operator-reviewed. Throws on hostile/invalid input; returns
   * "no-prior" extraction (empty sources + low_no_prior floor) when no
   * context retrievable but vision succeeded.
   */
  async extract(input: {
    request: ExtractRequest;
    backendId: string;
    io: BlueprintExtractionRAGIO;
    topK?: number;
  }): Promise<BlueprintExtraction> {
    validateRequest(input.request);
    if (typeof input.backendId !== "string" || input.backendId.length === 0) {
      throw new Error("[BlueprintExtractionRAGEngine] backendId required");
    }
    const topK = clampInt(input.topK, DEFAULT_TOP_K, MIN_TOP_K, MAX_TOP_K);
    const now = input.io.now ?? (() => new Date().toISOString());
    const req = input.request;

    // 1. Pre-classify
    const classify = input.io.inferClass ? await input.io.inferClass(req) : null;
    const family = input.io.matchFamily ? await input.io.matchFamily(req, classify?.classId ?? null) : null;
    const familyMatchId = family?.familyId ?? null;

    // 2-4. Retrieve in parallel where possible
    const [corpus, tribal, similar] = await Promise.all([
      input.io.retrieveCorpus ? input.io.retrieveCorpus(req, { topK }) : Promise.resolve([] as RetrievedSource[]),
      input.io.retrieveTribal ? input.io.retrieveTribal(req, { topK }) : Promise.resolve([] as RetrievedSource[]),
      input.io.retrieveSimilarPrints ? input.io.retrieveSimilarPrints(req, { topK }) : Promise.resolve([] as RetrievedSource[]),
    ]);
    const familyTemplate: RetrievedSource | null = family
      ? { kind: "family_template", id: family.templateId, title: `family:${family.familyId}`, score: 1 }
      : null;

    // Detect cross-source contradictions (same canonical key, different values).
    const contradictions = detectContradictions(corpus, tribal, similar);

    // 5. Compose prompt
    const prompt = input.io.composePrompt
      ? input.io.composePrompt(req, { corpus, tribal, similar, familyTemplate })
      : defaultComposePrompt(req, { corpus, tribal, similar, familyTemplate });

    // 6. Vision call
    if (!input.io.visionExtract) {
      // No vision backend — emit explicit low-confidence candidate
      return this._buildLowConfidenceCandidate(req, input.backendId, [], "low_no_vision", now);
    }
    let primaryRaw;
    try {
      primaryRaw = await input.io.visionExtract(req, prompt);
    } catch (err) {
      throw new Error(`[BlueprintExtractionRAGEngine] visionExtract failed: ${(err as Error).message}`);
    }
    if (!Array.isArray(primaryRaw)) {
      throw new Error("[BlueprintExtractionRAGEngine] visionExtract must return array");
    }

    // 7. Fuse + bound
    let primaryRegions: ExtractionRegion[] = primaryRaw.map((r) => ({
      regionId: r.regionId,
      dimType: r.dimType,
      value: r.value,
      confidence: clamp01(r.confidence),
      confidenceLower: clamp01(r.confidence * 0.9),
      confidenceUpper: clamp01(Math.min(1, r.confidence * 1.05)),
      ...(r.bbox ? { bbox: r.bbox } : {}),
    }));
    if (input.io.ensembleVision) {
      try {
        const ensemble = await input.io.ensembleVision(req, prompt);
        const fuser = input.io.fuseRegions ?? defaultFuseRegions;
        primaryRegions = fuser(primaryRegions, ensemble);
      } catch {
        // Ensemble is advisory — primary still emitted
      }
    }
    if (input.io.conformalBound) {
      try {
        primaryRegions = input.io.conformalBound(primaryRegions);
      } catch {
        // Conformal is advisory
      }
    }

    // Validate region invariants — Zod schema enforces refine(lower<=conf<=upper)
    for (const r of primaryRegions) {
      const parsed = ExtractionRegionSchema.safeParse(r);
      if (!parsed.success) {
        throw new Error(`[BlueprintExtractionRAGEngine] region schema invalid: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
      }
    }

    // 8. Compose sources + confidenceFloor
    const sources = [...corpus, ...tribal, ...similar];
    if (familyTemplate) sources.push(familyTemplate);
    let confidenceFloor: ConfidenceFloor = "normal";
    if (sources.length === 0) confidenceFloor = "low_no_prior";
    if (contradictions.length > 0) confidenceFloor = "low_contradiction";

    const extractionId = `bpe-rag:${req.pdfPath.replace(/[^A-Za-z0-9_-]/g, "_")}:${req.page}:${now()}`;
    const extraction: BlueprintExtraction = {
      extractionId,
      pdfPath: req.pdfPath,
      page: req.page,
      ...(req.customer ? { customer: req.customer } : {}),
      familyMatchId,
      regions: primaryRegions,
      sources,
      confidenceFloor,
      contradictionsDetected: contradictions,
      extractedAt: now(),
      backendId: input.backendId,
    };
    const parsed = BlueprintExtractionSchema.safeParse(extraction);
    if (!parsed.success) {
      throw new Error(`[BlueprintExtractionRAGEngine] HARD RULE: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
    }

    // 9. Record outcome
    if (input.io.recordOutcome) {
      try {
        await input.io.recordOutcome(parsed.data);
      } catch {
        // Recording is advisory; primary extraction still returned
      }
    }
    this.cachedExtractions.set(extractionId, parsed.data);
    return parsed.data;
  }

  /**
   * Return the attention/reasoning trace for an extraction. For now this is
   * the in-memory cached extraction itself; production wiring composes
   * xproc_attention_explain output.
   */
  explain(input: { extractionId: string }): BlueprintExtraction | null {
    return this.cachedExtractions.get(input.extractionId) ?? null;
  }

  /**
   * Compare a RAG-extracted result against a baseline (non-RAG) extraction.
   * Surfaces agreement count + per-region disagreements so the operator can
   * audit whether RAG augmentation improved or regressed extraction quality.
   */
  compareToBaseline(input: {
    ragExtraction: BlueprintExtraction;
    baselineRegions: ExtractionRegion[];
  }): CompareToBaselineResult {
    const ragMap = new Map(input.ragExtraction.regions.map((r) => [r.regionId, r]));
    const baseMap = new Map(input.baselineRegions.map((r) => [r.regionId, r]));
    const agreedRegions: string[] = [];
    const disagreedRegions: CompareToBaselineResult["disagreedRegions"] = [];
    for (const [rid, ragR] of ragMap.entries()) {
      const baseR = baseMap.get(rid);
      if (!baseR) continue;
      if (ragR.value.trim() === baseR.value.trim()) {
        agreedRegions.push(rid);
      } else {
        disagreedRegions.push({
          regionId: rid,
          ragValue: ragR.value,
          baselineValue: baseR.value,
          ragConfidence: ragR.confidence,
          baselineConfidence: baseR.confidence,
        });
      }
    }
    const ragOnlyRegions = [...ragMap.keys()].filter((k) => !baseMap.has(k));
    const baselineOnlyRegions = [...baseMap.keys()].filter((k) => !ragMap.has(k));
    return {
      agreedRegions: agreedRegions.length,
      disagreedRegions,
      ragOnlyRegions,
      baselineOnlyRegions,
    };
  }

  /** Clear cached extractions (testing convenience). */
  clearCache(): void {
    this.cachedExtractions.clear();
  }
  cacheSize(): number {
    return this.cachedExtractions.size;
  }

  // ── private ─────────────────────────────────────────────────────────────

  private _buildLowConfidenceCandidate(
    req: ExtractRequest,
    backendId: string,
    sources: RetrievedSource[],
    floor: ConfidenceFloor,
    now: () => string,
  ): BlueprintExtraction {
    const ts = now();
    return {
      extractionId: `bpe-rag-nocand:${req.pdfPath.replace(/[^A-Za-z0-9_-]/g, "_")}:${req.page}:${ts}`,
      pdfPath: req.pdfPath,
      page: req.page,
      ...(req.customer ? { customer: req.customer } : {}),
      familyMatchId: null,
      regions: [],
      sources,
      confidenceFloor: floor,
      contradictionsDetected: [],
      extractedAt: ts,
      backendId,
    };
  }
}

// ── Helpers (exported for testability) ─────────────────────────────────────

export function validateRequest(req: ExtractRequest): void {
  if (!req || typeof req !== "object") {
    throw new Error("[BlueprintExtractionRAGEngine] request must be object");
  }
  if (typeof req.pdfPath !== "string" || req.pdfPath.length === 0) {
    throw new Error("[BlueprintExtractionRAGEngine] pdfPath required");
  }
  if (typeof req.page !== "number" || !Number.isInteger(req.page) || req.page < 1) {
    throw new Error("[BlueprintExtractionRAGEngine] page must be positive integer");
  }
}

export function clamp01(n: number): number {
  // NaN is not numerically meaningful — treat as zero. Infinity is naturally
  // clamped by Math.max/Math.min so we let it flow through.
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function clampInt(raw: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(raw)));
}

/**
 * Detect cross-source contradictions. A contradiction is when two sources
 * cite different values for the same canonical key (extracted from title).
 * Returns human-readable contradiction strings for operator audit.
 */
export function detectContradictions(
  corpus: RetrievedSource[],
  tribal: RetrievedSource[],
  similar: RetrievedSource[],
): string[] {
  const all = [...corpus, ...tribal, ...similar];
  const out: string[] = [];
  // Look for "key=value" tokens in titles + excerpts and flag conflicts
  const seen = new Map<string, { value: string; source: string }>();
  for (const s of all) {
    const text = `${s.title} ${s.excerpt ?? ""}`;
    // Min key length 1 char so short callout names like "k", "L", "D" (diameter)
    // still trip the contradiction detector.
    const matches = text.matchAll(/\b([a-z][a-z_0-9]{0,30})\s*[:=]\s*("[^"]{1,60}"|\S{1,30})/gi);
    for (const m of matches) {
      const key = (m[1] ?? "").toLowerCase();
      const value = (m[2] ?? "").replace(/^"|"$/g, "").trim();
      if (!key || !value) continue;
      const prior = seen.get(key);
      if (prior && prior.value.trim().toLowerCase() !== value.toLowerCase()) {
        out.push(
          `contradiction key="${key}": "${prior.value}" (${prior.source}) vs "${value}" (${s.id})`,
        );
      } else if (!prior) {
        seen.set(key, { value, source: s.id });
      }
    }
  }
  // Dedup
  return [...new Set(out)];
}

/**
 * Default prompt composer — concatenates the request + retrieved sources
 * into a single string. Production wiring should produce a vision-model-
 * specific prompt format.
 */
export function defaultComposePrompt(
  req: ExtractRequest,
  retrieved: {
    corpus: RetrievedSource[];
    tribal: RetrievedSource[];
    similar: RetrievedSource[];
    familyTemplate: RetrievedSource | null;
  },
): string {
  const parts: string[] = [];
  parts.push(`Extract dimensional + GD&T callouts from: ${req.pdfPath} page ${req.page}`);
  if (req.customer) parts.push(`Customer: ${req.customer}`);
  if (req.dimTypeHint) parts.push(`Hint: dim type = ${req.dimTypeHint}`);
  if (req.operatorContext) parts.push(`Operator context: ${req.operatorContext}`);
  if (retrieved.familyTemplate) {
    // Include id so downstream attention-explain traces + audits can resolve
    // the source. Tests pin this shape.
    parts.push(`Family template: [${retrieved.familyTemplate.id}] ${retrieved.familyTemplate.title}`);
  }
  if (retrieved.corpus.length > 0) {
    parts.push(`Corpus context (${retrieved.corpus.length}):`);
    for (const s of retrieved.corpus.slice(0, 5)) {
      parts.push(`  - [${s.id}] ${s.title} (score=${s.score.toFixed(3)})`);
    }
  }
  if (retrieved.tribal.length > 0) {
    parts.push(`Tribal context (${retrieved.tribal.length}):`);
    for (const s of retrieved.tribal.slice(0, 5)) {
      parts.push(`  - [${s.id}] ${s.title} (score=${s.score.toFixed(3)})`);
    }
  }
  if (retrieved.similar.length > 0) {
    parts.push(`Similar-prior prints (${retrieved.similar.length}):`);
    for (const s of retrieved.similar.slice(0, 5)) {
      parts.push(`  - [${s.id}] ${s.title} (score=${s.score.toFixed(3)})`);
    }
  }
  return parts.join("\n");
}

/**
 * Default region fuser — when primary + ensemble agree on a region,
 * boost confidence. When they disagree, keep primary value but mark
 * the region's confidence as the lower of the two (epistemic humility).
 */
export function defaultFuseRegions(
  primary: ExtractionRegion[],
  ensemble: Array<{ regionId: string; value: string; confidence: number }>,
): ExtractionRegion[] {
  const ensMap = new Map(ensemble.map((e) => [e.regionId, e]));
  return primary.map((p) => {
    const e = ensMap.get(p.regionId);
    if (!e) return p;
    if (p.value.trim() === e.value.trim()) {
      // Agreement: boost confidence (cap at 1.0)
      const boosted = Math.min(1, p.confidence + (e.confidence - p.confidence) * 0.1);
      return {
        ...p,
        confidence: boosted,
        confidenceLower: Math.min(p.confidenceLower, boosted * 0.9),
        confidenceUpper: Math.min(1, boosted * 1.05),
      };
    }
    // Disagreement: lower confidence to the min of the two
    const lowered = Math.min(p.confidence, e.confidence);
    return {
      ...p,
      confidence: lowered,
      confidenceLower: Math.max(0, lowered * 0.9),
      confidenceUpper: Math.min(1, lowered * 1.05),
    };
  });
}

export const blueprintExtractionRAGEngine = new BlueprintExtractionRAGEngine();
