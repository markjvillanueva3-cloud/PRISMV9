/**
 * CAMDeepLearningOrchestratorEngine — CAM-EXHAUST-MS0/U-CAM117
 *
 * Multi-source AGI decision orchestrator for CAM. Combines three independent
 * inference sources into a single confidence-weighted decision with full
 * traceability of every contributing voice:
 *
 *   1. PHYSICS path — deterministic Kienzle/Taylor/SLD/deflection/thermal
 *      calculations (from src/physics/constants.ts and engines that consume
 *      them). Always available; weight = 1.0.
 *   2. ML path — local Ollama (U-CAM112) and/or NVIDIA NIM (U-CAM113)
 *      LLM inference. Availability detected at runtime.
 *   3. TRIBAL path — TribalKnowledgeAdvisorEngine semantic-search of
 *      JM-Die shop tips and prior-job outcomes.
 *
 * Decision aggregation:
 *   - Each source returns {value, confidence, weight, evidence}.
 *   - Composite confidence = Σ(w_i × c_i) / Σ(w_i)  for sources voting same way.
 *   - Disagreement (sources voting different ways) drops composite confidence
 *     and triggers escalation flag (escalate_to_human=true).
 *   - Below ESCALATION_THRESHOLD (0.55) the orchestrator refuses to ship the
 *     decision without operator review — matches PRISM operator-in-the-loop
 *     unconditional rule.
 *
 * Output traceability: every returned decision carries a `voices` array with
 * each source's vote + raw evidence so reviewers can audit *why*.
 *
 * Reference: CAM-EXHAUST-MS0 unit U-CAM117 + PRISM omega-thresholds.json tier
 * model. Decision-quality measurement is left to the post-deployment harness
 * (U-CAM-FINAL-04 scoring rubric).
 */

import {
  OllamaCAMIntegrationEngine,
  type CAMTaskKind as OllamaTask,
  type CAMQueryResult as OllamaResult,
} from "./OllamaCAMIntegrationEngine.js";
import {
  NVIDIALLMCAMEngine,
  type NVIDIACAMTaskKind as NVIDIATask,
  type NVIDIAQueryResult,
} from "./NVIDIALLMCAMEngine.js";

/**
 * MLAdapter — pluggable LLM inference path. Production wires the static-class
 * surfaces of OllamaCAMIntegrationEngine / NVIDIALLMCAMEngine; tests inject
 * deterministic fakes via setOllamaAdapter / setNVIDIAAdapter.
 */
export interface MLAdapter {
  query(
    task: AGIDecisionTask,
    prompt: string,
    opts: { timeoutMs?: number }
  ): Promise<{
    success: boolean;
    parsed: unknown;
    raw?: string | null;
    errorCode?: string;
    error?: string;
  }>;
  healthCheck(): Promise<{ available: boolean }>;
}

export type AGIDecisionTask =
  | "strategy_recommend"
  | "parameter_extract"
  | "operation_classify"
  | "tool_select_advisor";

export type SourceKind = "physics" | "ollama" | "nvidia" | "tribal";

export interface SourceVote<V = unknown> {
  source: SourceKind;
  value: V | null;
  confidence: number;
  weight: number;
  available: boolean;
  errorCode?: string;
  evidence?: string;
  latencyMs: number;
}

export interface AGIDecision<V = unknown> {
  task: AGIDecisionTask;
  /** The chosen value (highest-confidence-weighted vote). null if no consensus. */
  value: V | null;
  /** Composite confidence in [0, 1]. */
  confidence: number;
  /** True iff confidence below threshold or sources disagree. */
  escalateToHuman: boolean;
  /** Human-readable reason for the decision (one line). */
  rationale: string;
  /** Per-source votes with full evidence. */
  voices: Array<SourceVote<V>>;
  /** Total wall-clock orchestration latency. */
  totalLatencyMs: number;
  /** Sources that voted the same way (>=80% string equality on canonical key). */
  agreeingSources: SourceKind[];
  /** Sources that voted differently from the majority (or had no vote). */
  dissentingSources: SourceKind[];
}

export interface AGIInvokeOptions {
  /** Override per-source weights. Defaults: physics=1.0, ollama=0.6, nvidia=0.7, tribal=0.5. */
  weights?: Partial<Record<SourceKind, number>>;
  /** Disable specific sources for this call. */
  disableSources?: SourceKind[];
  /** Per-source timeout. Default 8000ms. */
  timeoutMs?: number;
  /** Override escalation threshold (composite confidence below → escalate). Default 0.55. */
  escalationThreshold?: number;
}

export interface PhysicsAdapter {
  /**
   * Run a deterministic physics computation for the task.
   * Returns null if the task is not physics-amenable (e.g. classify).
   * Adapter implementations live outside this engine — pluggable so unit
   * tests can inject deterministic fakes.
   */
  evaluate(
    task: AGIDecisionTask,
    prompt: string
  ): Promise<{ value: unknown; confidence: number; evidence: string } | null>;
}

export interface TribalAdapter {
  /**
   * Look up shop tribal knowledge relevant to the task. Returns null if no
   * relevant tip found. PRISM ships TribalKnowledgeAdvisorEngine; tests
   * inject a fake.
   */
  lookup(
    task: AGIDecisionTask,
    prompt: string
  ): Promise<{ value: unknown; confidence: number; evidence: string } | null>;
}

// ── Default weights (named) ─────────────────────────────────────────────────
const DEFAULT_WEIGHTS: Record<SourceKind, number> = {
  physics: 1.0,
  ollama: 0.6,
  nvidia: 0.7,
  tribal: 0.5,
};
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_ESCALATION_THRESHOLD = 0.55;
const AGREEMENT_SIMILARITY = 0.8; // canonical-key string equality threshold

// ── Default adapters bound to the production engines ──────────────────────
const productionOllamaAdapter: MLAdapter = {
  async query(task, prompt, opts) {
    const r = (await OllamaCAMIntegrationEngine.query(
      task as OllamaTask,
      prompt,
      { timeoutMs: opts.timeoutMs }
    )) as OllamaResult<unknown>;
    return {
      success: r.success,
      parsed: r.parsed,
      raw: r.raw,
      ...(r.errorCode ? { errorCode: r.errorCode } : {}),
      ...(r.error ? { error: r.error } : {}),
    };
  },
  async healthCheck() {
    const h = await OllamaCAMIntegrationEngine.healthCheck();
    return { available: h.available };
  },
};

const productionNVIDIAAdapter: MLAdapter = {
  async query(task, prompt, opts) {
    const r = (await NVIDIALLMCAMEngine.query(
      task as NVIDIATask,
      prompt,
      { timeoutMs: opts.timeoutMs }
    )) as NVIDIAQueryResult<unknown>;
    return {
      success: r.success,
      parsed: r.parsed,
      raw: r.raw,
      ...(r.errorCode ? { errorCode: r.errorCode } : {}),
      ...(r.error ? { error: r.error } : {}),
    };
  },
  async healthCheck() {
    const h = await NVIDIALLMCAMEngine.healthCheck();
    return { available: h.available };
  },
};

export class CAMDeepLearningOrchestratorEngine {
  private static physicsAdapter: PhysicsAdapter | null = null;
  private static tribalAdapter: TribalAdapter | null = null;
  private static ollamaAdapter: MLAdapter = productionOllamaAdapter;
  private static nvidiaAdapter: MLAdapter = productionNVIDIAAdapter;

  /**
   * Inject the physics adapter (test or production). Production wires
   * an adapter that calls Kienzle/Taylor/etc. Tests inject deterministic.
   */
  static setPhysicsAdapter(adapter: PhysicsAdapter | null): void {
    this.physicsAdapter = adapter;
  }

  /** Inject the tribal-knowledge adapter. */
  static setTribalAdapter(adapter: TribalAdapter | null): void {
    this.tribalAdapter = adapter;
  }

  /** Inject Ollama ML adapter. Test-only — production keeps the engine wiring. */
  static setOllamaAdapter(adapter: MLAdapter): void {
    this.ollamaAdapter = adapter;
  }

  /** Inject NVIDIA ML adapter. Test-only — production keeps the engine wiring. */
  static setNVIDIAAdapter(adapter: MLAdapter): void {
    this.nvidiaAdapter = adapter;
  }

  /** Reset Ollama + NVIDIA adapters to production engine wiring. */
  static resetMLAdapters(): void {
    this.ollamaAdapter = productionOllamaAdapter;
    this.nvidiaAdapter = productionNVIDIAAdapter;
  }

  /**
   * Run an AGI-grade decision against all available sources. Returns the
   * confidence-weighted aggregate plus the full per-source trace.
   *
   * @param task    The decision task kind.
   * @param prompt  The decision payload.
   * @param opts    Source weights, disabled sources, timeouts, threshold.
   * @returns       Composite decision envelope; never throws.
   */
  static async decide<V = unknown>(
    task: AGIDecisionTask,
    prompt: string,
    opts: AGIInvokeOptions = {}
  ): Promise<AGIDecision<V>> {
    const start = Date.now();
    const weights = { ...DEFAULT_WEIGHTS, ...(opts.weights ?? {}) };
    const disabled = new Set(opts.disableSources ?? []);
    const timeoutMs = clamp(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, 500, 60_000);
    const threshold = clamp(
      opts.escalationThreshold ?? DEFAULT_ESCALATION_THRESHOLD,
      0,
      1
    );

    if (!isValidTask(task)) {
      return badInputDecision<V>(task, "unknown task kind", start);
    }
    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return badInputDecision<V>(task, "prompt must be a non-empty string", start);
    }

    // ── Run all sources in parallel (each gracefully degrades on failure) ──
    const settled = await Promise.all([
      runWith<V>("physics", disabled, weights, () =>
        evaluatePhysics<V>(task, prompt, this.physicsAdapter)
      ),
      runWith<V>("ollama", disabled, weights, () =>
        evaluateML<V>(task, prompt, timeoutMs, this.ollamaAdapter)
      ),
      runWith<V>("nvidia", disabled, weights, () =>
        evaluateML<V>(task, prompt, timeoutMs, this.nvidiaAdapter)
      ),
      runWith<V>("tribal", disabled, weights, () =>
        evaluateTribal<V>(task, prompt, this.tribalAdapter)
      ),
    ]);

    const voices = settled;
    const aggregated = aggregateVotes<V>(voices, threshold);

    return {
      task,
      value: aggregated.value,
      confidence: aggregated.confidence,
      escalateToHuman: aggregated.escalate,
      rationale: aggregated.rationale,
      voices,
      totalLatencyMs: Date.now() - start,
      agreeingSources: aggregated.agreeing,
      dissentingSources: aggregated.dissenting,
    };
  }

  /** List source kinds for dispatcher discovery. */
  static listSources(): SourceKind[] {
    return ["physics", "ollama", "nvidia", "tribal"];
  }

  /** Returns the default weight table (read-only snapshot). */
  static getDefaultWeights(): Record<SourceKind, number> {
    return { ...DEFAULT_WEIGHTS };
  }

  /** Health-check every wired source; returns each's availability. */
  static async healthCheckAll(): Promise<Record<SourceKind, boolean>> {
    const ollama = await this.ollamaAdapter.healthCheck();
    const nvidia = await this.nvidiaAdapter.healthCheck();
    return {
      physics: this.physicsAdapter !== null,
      ollama: ollama.available,
      nvidia: nvidia.available,
      tribal: this.tribalAdapter !== null,
    };
  }
}

// ── Internal: per-source runners ────────────────────────────────────────────

async function runWith<V>(
  source: SourceKind,
  disabled: Set<SourceKind>,
  weights: Record<SourceKind, number>,
  body: () => Promise<{
    value: V | null;
    confidence: number;
    available: boolean;
    errorCode?: string;
    evidence?: string;
  }>
): Promise<SourceVote<V>> {
  const start = Date.now();
  if (disabled.has(source)) {
    return {
      source,
      value: null,
      confidence: 0,
      weight: 0,
      available: false,
      errorCode: "disabled",
      latencyMs: 0,
    };
  }
  try {
    const r = await body();
    return {
      source,
      value: r.value,
      confidence: r.confidence,
      weight: r.available ? (weights[source] ?? 0) : 0,
      available: r.available,
      ...(r.errorCode ? { errorCode: r.errorCode } : {}),
      ...(r.evidence ? { evidence: r.evidence } : {}),
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      source,
      value: null,
      confidence: 0,
      weight: 0,
      available: false,
      errorCode: "source_threw",
      evidence: (err as Error).message,
      latencyMs: Date.now() - start,
    };
  }
}

async function evaluatePhysics<V>(
  task: AGIDecisionTask,
  prompt: string,
  adapter: PhysicsAdapter | null
): Promise<{
  value: V | null;
  confidence: number;
  available: boolean;
  errorCode?: string;
  evidence?: string;
}> {
  if (adapter === null) {
    return {
      value: null,
      confidence: 0,
      available: false,
      errorCode: "no_physics_adapter",
    };
  }
  const r = await adapter.evaluate(task, prompt);
  if (r === null) {
    return {
      value: null,
      confidence: 0,
      available: false,
      errorCode: "task_not_physics_amenable",
    };
  }
  return {
    value: r.value as V | null,
    confidence: clamp(r.confidence, 0, 1),
    available: true,
    evidence: r.evidence,
  };
}

async function evaluateML<V>(
  task: AGIDecisionTask,
  prompt: string,
  timeoutMs: number,
  adapter: MLAdapter
): Promise<{
  value: V | null;
  confidence: number;
  available: boolean;
  errorCode?: string;
  evidence?: string;
}> {
  const r = await adapter.query(task, prompt, { timeoutMs });
  if (!r.success) {
    return {
      value: null,
      confidence: 0,
      available: false,
      errorCode: r.errorCode ?? "ml_failed",
      evidence: r.error,
    };
  }
  const conf = extractConfidence(r.parsed);
  return {
    value: (r.parsed as V) ?? null,
    confidence: conf,
    available: true,
    evidence: r.raw ?? undefined,
  };
}

async function evaluateTribal<V>(
  task: AGIDecisionTask,
  prompt: string,
  adapter: TribalAdapter | null
): Promise<{
  value: V | null;
  confidence: number;
  available: boolean;
  errorCode?: string;
  evidence?: string;
}> {
  if (adapter === null) {
    return {
      value: null,
      confidence: 0,
      available: false,
      errorCode: "no_tribal_adapter",
    };
  }
  const r = await adapter.lookup(task, prompt);
  if (r === null) {
    return {
      value: null,
      confidence: 0,
      available: false,
      errorCode: "no_tribal_match",
    };
  }
  return {
    value: r.value as V | null,
    confidence: clamp(r.confidence, 0, 1),
    available: true,
    evidence: r.evidence,
  };
}

// ── Aggregation ─────────────────────────────────────────────────────────────

interface AggregateOutcome<V> {
  value: V | null;
  confidence: number;
  escalate: boolean;
  rationale: string;
  agreeing: SourceKind[];
  dissenting: SourceKind[];
}

function aggregateVotes<V>(
  voices: Array<SourceVote<V>>,
  threshold: number
): AggregateOutcome<V> {
  const available = voices.filter((v) => v.available && v.value !== null);
  if (available.length === 0) {
    return {
      value: null,
      confidence: 0,
      escalate: true,
      rationale: "no source returned a usable vote",
      agreeing: [],
      dissenting: voices.map((v) => v.source),
    };
  }

  // Group by canonical-key equality
  const groups: Array<{ key: string; voices: Array<SourceVote<V>> }> = [];
  for (const v of available) {
    const key = canonicalKey(v.value);
    let bucket = groups.find(
      (g) => stringSimilarity(g.key, key) >= AGREEMENT_SIMILARITY
    );
    if (!bucket) {
      bucket = { key, voices: [] };
      groups.push(bucket);
    }
    bucket.voices.push(v);
  }

  // Pick group with highest weighted-confidence sum
  let bestGroup = groups[0];
  let bestScore = -1;
  for (const g of groups) {
    const score = g.voices.reduce(
      (acc, v) => acc + v.weight * v.confidence,
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestGroup = g;
    }
  }

  const winningVoices = bestGroup?.voices ?? [];
  const losingVoices = available.filter((v) => !winningVoices.includes(v));

  const totalWeight = winningVoices.reduce((acc, v) => acc + v.weight, 0);
  const composite =
    totalWeight > 0
      ? winningVoices.reduce((acc, v) => acc + v.weight * v.confidence, 0) /
        totalWeight
      : 0;

  // Disagreement penalty — losing voices erode confidence proportional to their weight
  const totalAvailWeight = available.reduce((acc, v) => acc + v.weight, 0);
  const disagreementWeight = losingVoices.reduce(
    (acc, v) => acc + v.weight,
    0
  );
  const disagreementRatio =
    totalAvailWeight > 0 ? disagreementWeight / totalAvailWeight : 0;
  const finalConfidence = composite * (1 - 0.5 * disagreementRatio);

  const winnerValue = winningVoices[0]?.value ?? null;
  const escalate = finalConfidence < threshold || losingVoices.length > 0;

  const rationale =
    losingVoices.length === 0
      ? `all ${winningVoices.length} available sources agreed; composite confidence ${(finalConfidence * 100).toFixed(1)}%`
      : `${winningVoices.length} of ${available.length} sources agreed; ${losingVoices.length} dissent${losingVoices.length === 1 ? "s" : "s"}; composite ${(finalConfidence * 100).toFixed(1)}%`;

  return {
    value: winnerValue,
    confidence: finalConfidence,
    escalate,
    rationale,
    agreeing: winningVoices.map((v) => v.source),
    dissenting: voices
      .filter((v) => !winningVoices.includes(v))
      .map((v) => v.source),
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function clamp(value: number, lo: number, hi: number): number {
  if (Number.isNaN(value)) return lo;
  return Math.max(lo, Math.min(hi, value));
}

function isValidTask(task: unknown): task is AGIDecisionTask {
  return (
    task === "strategy_recommend" ||
    task === "parameter_extract" ||
    task === "operation_classify" ||
    task === "tool_select_advisor"
  );
}

function extractConfidence(value: unknown): number {
  if (value === null || typeof value !== "object") return 0.5;
  const v = value as Record<string, unknown>;
  if (typeof v.confidence === "number" && Number.isFinite(v.confidence)) {
    return clamp(v.confidence, 0, 1);
  }
  return 0.5; // unknown sources get a neutral prior
}

/**
 * Reduce a vote value to a canonical string key for agreement detection.
 * For tasks with a primary identifier (strategy/op_type/tool_family) this
 * is the identifier. For parameter_extract we use a stable JSON sort.
 */
function canonicalKey(value: unknown): string {
  if (value === null || typeof value !== "object") return String(value).toLowerCase();
  const v = value as Record<string, unknown>;
  if (typeof v.strategy === "string") return v.strategy.toLowerCase();
  if (typeof v.op_type === "string") return v.op_type.toLowerCase();
  if (typeof v.tool_family === "string")
    return `${v.tool_family}|${v.diameter_mm ?? ""}|${v.flutes ?? ""}`.toLowerCase();
  if (v.parameters && typeof v.parameters === "object") {
    return Object.entries(v.parameters as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, val]) => `${k}=${String(val)}`)
      .join("|")
      .toLowerCase();
  }
  return JSON.stringify(value).toLowerCase();
}

/** Normalized similarity in [0,1]. Identical → 1, different → 0. */
function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  // Fast equality-aware Jaccard on character bigrams
  const grams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    if (s.length === 1) set.add(s);
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  let intersect = 0;
  for (const g of A) if (B.has(g)) intersect++;
  const union = A.size + B.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

function badInputDecision<V>(
  task: AGIDecisionTask,
  reason: string,
  start: number
): AGIDecision<V> {
  return {
    task,
    value: null,
    confidence: 0,
    escalateToHuman: true,
    rationale: `bad_input: ${reason}`,
    voices: [],
    totalLatencyMs: Date.now() - start,
    agreeingSources: [],
    dissentingSources: [],
  };
}
