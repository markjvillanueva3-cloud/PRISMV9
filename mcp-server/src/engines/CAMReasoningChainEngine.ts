/**
 * CAMReasoningChainEngine — CAM-EXHAUST-MS0/U-CAM118
 *
 * Wraps CAMDeepLearningOrchestratorEngine output into a structured, replayable,
 * auditable stepwise reasoning chain. Where the orchestrator emits voices[]
 * plus a final decision, this engine synthesizes a step-by-step trace
 * explaining how the decision was reached:
 *
 *   step 1  input_parse        — task + prompt normalization
 *   step 2  physics_check      — deterministic Kienzle/Taylor/SLD adapter vote
 *   step 3  ml_inference       — Ollama local-LLM vote (U-CAM112)
 *   step 4  ml_inference       — NVIDIA NIM/Triton GPU vote (U-CAM113)
 *   step 5  tribal_lookup      — JM-Die shop tribal-knowledge vote
 *   step 6  aggregation        — confidence-weighted vote aggregation
 *   step 7  escalation_check   — operator-in-the-loop gate
 *   step 8  final_decision     — chosen value + confidence + rationale
 *
 * Designed for human-in-the-loop review (PRISM operator-in-the-loop rule —
 * unconditional). Capabilities:
 *
 *   - decide(task, prompt, opts?)         convenience: orchestrator + chain in one call
 *   - buildFromDecision(decision, req)    synthesize a chain from existing decision
 *   - getChain(chainId)                   fetch stored chain for audit
 *   - listChains(filter?)                 enumerate stored chains
 *   - whyDecision(chainId, query)         answer follow-up "why X?" queries
 *   - compareAlternatives(chainId)        rank rejected options + cite each loss
 *   - clearChains()                       test hook
 *
 * Storage: in-memory Map with FIFO eviction at MAX_CHAINS (default 1000).
 * Persistence is intentionally out of scope for U-CAM118 — replay is per-process.
 *
 * Peer pattern: CADReasoningChainEngine (CADCAM-DAGI-MS0/U-DAGI10) for the
 * CAD domain. CAM uses orchestrator voices[] as input; CAD wrapped a single
 * neural generator. Same shape, different upstream.
 */

import {
  CAMDeepLearningOrchestratorEngine,
  type AGIDecision,
  type AGIDecisionTask,
  type AGIInvokeOptions,
  type SourceKind,
  type SourceVote,
} from "./CAMDeepLearningOrchestratorEngine.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type CAMReasoningStepKind =
  | "input_parse"
  | "physics_check"
  | "ml_inference"
  | "tribal_lookup"
  | "aggregation"
  | "escalation_check"
  | "final_decision";

export interface CAMReasoningEvidence {
  /** Where the evidence came from. */
  type:
    | "input_field"
    | "source_vote"
    | "weight"
    | "agreement"
    | "dissent"
    | "threshold"
    | "rationale";
  /** Pretty source name (e.g. "physics", "ollama", "user_prompt"). */
  source: string;
  /** Human-readable description of the evidence. */
  description: string;
  /** Optional numeric weight for ranking evidence in UIs. */
  weight?: number;
}

export interface CAMReasoningStep {
  stepNumber: number;
  kind: CAMReasoningStepKind;
  /** Source whose vote drove this step (null for non-source steps). */
  source: SourceKind | null;
  /** One-line human summary. */
  summary: string;
  /** Multi-line structured detail (key/value pairs serialized). */
  detail: string;
  evidence: CAMReasoningEvidence[];
  /** Confidence in [0, 1] for this step's contribution. 0 if step skipped. */
  confidence: number;
  /** Wall-clock latency for this step's source (0 for synthetic steps). */
  latencyMs: number;
  /** Optional error code captured at this step (e.g. "ollama_timeout"). */
  errorCode?: string;
  timestamp: number;
}

export interface CAMReasoningChainSummary {
  chainId: string;
  task: AGIDecisionTask;
  finalValue: unknown;
  overallConfidence: number;
  escalated: boolean;
  stepCount: number;
  createdAt: number;
}

export interface CAMReasoningChain {
  chainId: string;
  task: AGIDecisionTask;
  /** Original user prompt (may be truncated for storage). */
  prompt: string;
  steps: CAMReasoningStep[];
  finalValue: unknown;
  overallConfidence: number;
  escalated: boolean;
  agreeingSources: SourceKind[];
  dissentingSources: SourceKind[];
  totalLatencyMs: number;
  rationale: string;
  createdAt: number;
}

export interface WhyDecisionResult {
  chainId: string;
  query: string;
  matchedSteps: CAMReasoningStep[];
  explanation: string;
  confidence: number;
  /** True iff at least one step matched the query keywords. */
  matched: boolean;
}

export interface RejectedAlternative {
  value: unknown;
  source: SourceKind;
  rejectionReason:
    | "lower_weighted_confidence"
    | "source_unavailable"
    | "source_errored"
    | "dissented_from_majority";
  weightedScore: number;
  rawConfidence: number;
  weight: number;
  evidence: string;
  errorCode?: string;
}

export interface AlternativesResult {
  chainId: string;
  winner: { value: unknown; source: SourceKind | null; weightedScore: number };
  alternatives: RejectedAlternative[];
}

export interface DecideAndChainResult<V = unknown> {
  decision: AGIDecision<V>;
  chain: CAMReasoningChain;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const MAX_CHAINS_DEFAULT = 1000;
/** Truncate stored prompts at this length so the in-memory store stays bounded. */
const PROMPT_STORAGE_LIMIT = 4096;
/** Truncate step detail blocks so a single rogue source can't blow up memory. */
const STEP_DETAIL_LIMIT = 2048;
/** Truncate prompt preview shown in the input_parse step. */
const PROMPT_PREVIEW_CHARS = 240;
/** Truncate per-step evidence text to keep evidence arrays UI-friendly. */
const EVIDENCE_TEXT_LIMIT = 480;
/** Truncate formatJSON-stringified values to keep summary lines readable. */
const FORMAT_VALUE_LIMIT = 200;
/** Drop tokens shorter than this in whyDecision tokenization. */
const QUERY_MIN_TOKEN_LEN = 2;
/** Hex chars used in chainId random suffix (16-bit). */
const CHAIN_ID_RAND_HEX_LEN = 4;
/** Random space for chainId disambiguation suffix. */
const CHAIN_ID_RAND_MAX = 0xffff;
/** Counter-rollover modulus for chainId monotonic part. */
const CHAIN_ID_COUNTER_MOD = 1_000_000;

const SOURCE_TO_STEP_KIND: Record<SourceKind, CAMReasoningStepKind> = {
  physics: "physics_check",
  ollama: "ml_inference",
  nvidia: "ml_inference",
  tribal: "tribal_lookup",
};

// Order in which sources appear in the chain (matches orchestrator parallel-fan order).
const SOURCE_ORDER: ReadonlyArray<SourceKind> = ["physics", "ollama", "nvidia", "tribal"];

// ═══════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR ADAPTER (DI for tests)
// ═══════════════════════════════════════════════════════════════════════════

export interface OrchestratorAdapter {
  decide<V>(
    task: AGIDecisionTask,
    prompt: string,
    opts: AGIInvokeOptions
  ): Promise<AGIDecision<V>>;
}

const productionOrchestratorAdapter: OrchestratorAdapter = {
  decide: <V>(task: AGIDecisionTask, prompt: string, opts: AGIInvokeOptions) =>
    CAMDeepLearningOrchestratorEngine.decide<V>(task, prompt, opts),
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class CAMReasoningChainEngine {
  private static orchestrator: OrchestratorAdapter = productionOrchestratorAdapter;
  private static store: Map<string, CAMReasoningChain> = new Map();
  private static maxChains: number = MAX_CHAINS_DEFAULT;
  private static idCounter: number = 0;

  /**
   * Inject a custom orchestrator adapter. Tests pass a fake; production resets.
   */
  static setOrchestrator(adapter: OrchestratorAdapter): void {
    this.orchestrator = adapter;
  }

  /** Restore the production orchestrator wiring. */
  static resetOrchestrator(): void {
    this.orchestrator = productionOrchestratorAdapter;
  }

  /** Override the chain-storage cap. Tests use small caps to verify FIFO. */
  static setMaxChains(max: number): void {
    if (!Number.isFinite(max) || max < 1) {
      throw new Error(`maxChains must be a positive integer, got ${max}`);
    }
    this.maxChains = Math.floor(max);
    this.evictIfNeeded();
  }

  /** Drop all stored chains. Test hook. */
  static clearChains(): void {
    this.store.clear();
    this.idCounter = 0;
  }

  /**
   * Convenience: invoke the orchestrator AND build the chain in one call.
   * The chain is stored and returned alongside the raw decision.
   */
  static async decide<V = unknown>(
    task: AGIDecisionTask,
    prompt: string,
    opts: AGIInvokeOptions = {}
  ): Promise<DecideAndChainResult<V>> {
    const decision = await this.orchestrator.decide<V>(task, prompt, opts);
    const chain = this.buildFromDecision<V>(decision, { task, prompt, opts });
    return { decision, chain };
  }

  /**
   * Synthesize a chain from an existing AGIDecision (e.g. one returned by a
   * prior orchestrator call). Stores + returns the chain.
   */
  static buildFromDecision<V = unknown>(
    decision: AGIDecision<V>,
    request: { task: AGIDecisionTask; prompt: string; opts?: AGIInvokeOptions }
  ): CAMReasoningChain {
    if (!decision || typeof decision !== "object") {
      throw new Error("buildFromDecision: decision must be a non-null AGIDecision object");
    }
    if (!request || typeof request.task !== "string") {
      throw new Error("buildFromDecision: request.task must be a non-empty string");
    }
    if (typeof request.prompt !== "string") {
      throw new Error("buildFromDecision: request.prompt must be a string");
    }

    const now = Date.now();
    const chainId = this.nextChainId(now);
    const steps: CAMReasoningStep[] = [];
    let stepNumber = 1;

    // ── Step 1: input_parse ──────────────────────────────────────────────
    steps.push({
      stepNumber: stepNumber++,
      kind: "input_parse",
      source: null,
      summary: `parsed task="${request.task}", prompt length=${request.prompt.length} chars`,
      detail: truncate(
        [
          `task: ${request.task}`,
          `prompt_chars: ${request.prompt.length}`,
          `prompt_preview: ${request.prompt.slice(0, PROMPT_PREVIEW_CHARS)}${request.prompt.length > PROMPT_PREVIEW_CHARS ? "…" : ""}`,
          `weights: ${JSON.stringify(request.opts?.weights ?? "default")}`,
          `disabled_sources: ${JSON.stringify(request.opts?.disableSources ?? [])}`,
        ].join("\n"),
        STEP_DETAIL_LIMIT
      ),
      evidence: [
        {
          type: "input_field",
          source: "user_prompt",
          description: `task=${request.task}`,
        },
        {
          type: "input_field",
          source: "user_prompt",
          description: `prompt_chars=${request.prompt.length}`,
        },
      ],
      confidence: 1,
      latencyMs: 0,
      timestamp: now,
    });

    // ── Steps 2..n: per-source votes (in canonical SOURCE_ORDER) ─────────
    const voicesBySource = new Map<SourceKind, SourceVote<unknown>>();
    for (const v of decision.voices ?? []) {
      voicesBySource.set(v.source, v as SourceVote<unknown>);
    }

    for (const source of SOURCE_ORDER) {
      const vote = voicesBySource.get(source);
      const stepKind = SOURCE_TO_STEP_KIND[source];
      if (!vote) {
        // Source not in voices array → orchestrator skipped it (disabled/unavailable upstream).
        steps.push({
          stepNumber: stepNumber++,
          kind: stepKind,
          source,
          summary: `${source}: skipped (no vote returned by orchestrator)`,
          detail: `source ${source} did not appear in decision.voices — likely disabled via opts.disableSources or absent adapter`,
          evidence: [
            {
              type: "source_vote",
              source,
              description: "no vote present",
            },
          ],
          confidence: 0,
          latencyMs: 0,
          errorCode: "no_vote",
          timestamp: now,
        });
        continue;
      }

      const stepEvidence: CAMReasoningEvidence[] = [
        { type: "source_vote", source, description: `available=${vote.available}` },
        { type: "weight", source, description: `weight=${vote.weight.toFixed(3)}` },
        {
          type: "source_vote",
          source,
          description: `confidence=${vote.confidence.toFixed(3)}`,
        },
      ];
      if (vote.evidence) {
        stepEvidence.push({
          type: "rationale",
          source,
          description: truncate(vote.evidence, EVIDENCE_TEXT_LIMIT),
        });
      }
      if (vote.errorCode) {
        stepEvidence.push({
          type: "source_vote",
          source,
          description: `error=${vote.errorCode}`,
        });
      }

      const summary = vote.available
        ? vote.value !== null && vote.value !== undefined
          ? `${source}: voted ${formatValue(vote.value)} @ conf=${vote.confidence.toFixed(2)}, w=${vote.weight.toFixed(2)}`
          : `${source}: available but abstained (value=null)`
        : `${source}: unavailable${vote.errorCode ? ` (${vote.errorCode})` : ""}`;

      const detail = truncate(
        [
          `source: ${source}`,
          `available: ${vote.available}`,
          `value: ${formatValue(vote.value)}`,
          `confidence: ${vote.confidence.toFixed(4)}`,
          `weight: ${vote.weight.toFixed(4)}`,
          `weighted_score: ${(vote.confidence * vote.weight).toFixed(4)}`,
          `latency_ms: ${vote.latencyMs}`,
          vote.errorCode ? `error_code: ${vote.errorCode}` : "",
          vote.evidence ? `evidence: ${vote.evidence}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        STEP_DETAIL_LIMIT
      );

      const step: CAMReasoningStep = {
        stepNumber: stepNumber++,
        kind: stepKind,
        source,
        summary,
        detail,
        evidence: stepEvidence,
        confidence: vote.available ? vote.confidence : 0,
        latencyMs: vote.latencyMs,
        timestamp: now,
      };
      if (vote.errorCode) {
        step.errorCode = vote.errorCode;
      }
      steps.push(step);
    }

    // ── Aggregation step ─────────────────────────────────────────────────
    const agreementEvidence: CAMReasoningEvidence[] = [];
    for (const s of decision.agreeingSources ?? []) {
      agreementEvidence.push({
        type: "agreement",
        source: s,
        description: `${s} agreed with majority`,
      });
    }
    for (const s of decision.dissentingSources ?? []) {
      agreementEvidence.push({
        type: "dissent",
        source: s,
        description: `${s} dissented or abstained`,
      });
    }

    steps.push({
      stepNumber: stepNumber++,
      kind: "aggregation",
      source: null,
      summary: `aggregated ${decision.agreeingSources?.length ?? 0} agreeing / ${decision.dissentingSources?.length ?? 0} dissenting → composite confidence=${decision.confidence.toFixed(3)}`,
      detail: truncate(
        [
          `agreeing_sources: ${(decision.agreeingSources ?? []).join(", ") || "(none)"}`,
          `dissenting_sources: ${(decision.dissentingSources ?? []).join(", ") || "(none)"}`,
          `composite_confidence: ${decision.confidence.toFixed(4)}`,
          `total_latency_ms: ${decision.totalLatencyMs}`,
        ].join("\n"),
        STEP_DETAIL_LIMIT
      ),
      evidence: agreementEvidence,
      confidence: decision.confidence,
      latencyMs: 0,
      timestamp: now,
    });

    // ── Escalation check ─────────────────────────────────────────────────
    steps.push({
      stepNumber: stepNumber++,
      kind: "escalation_check",
      source: null,
      summary: decision.escalateToHuman
        ? `ESCALATE_TO_HUMAN — operator review required (confidence below threshold or sources dissented)`
        : `no escalation required — composite confidence + agreement above threshold`,
      detail: `escalate_to_human: ${decision.escalateToHuman}\nrationale: ${decision.rationale}`,
      evidence: [
        {
          type: "threshold",
          source: "orchestrator",
          description: `escalateToHuman=${decision.escalateToHuman}`,
        },
        {
          type: "rationale",
          source: "orchestrator",
          description: decision.rationale,
        },
      ],
      confidence: decision.escalateToHuman ? 0 : decision.confidence,
      latencyMs: 0,
      timestamp: now,
    });

    // ── Final decision ───────────────────────────────────────────────────
    steps.push({
      stepNumber: stepNumber++,
      kind: "final_decision",
      source: null,
      summary:
        decision.value !== null && decision.value !== undefined
          ? `final: ${formatValue(decision.value)} (confidence=${decision.confidence.toFixed(3)})`
          : `final: ABSTAINED — no consensus value`,
      detail: truncate(
        [
          `value: ${formatValue(decision.value)}`,
          `confidence: ${decision.confidence.toFixed(4)}`,
          `escalate_to_human: ${decision.escalateToHuman}`,
          `rationale: ${decision.rationale}`,
        ].join("\n"),
        STEP_DETAIL_LIMIT
      ),
      evidence: [
        {
          type: "rationale",
          source: "orchestrator",
          description: decision.rationale,
        },
      ],
      confidence: decision.confidence,
      latencyMs: 0,
      timestamp: now,
    });

    const chain: CAMReasoningChain = {
      chainId,
      task: request.task,
      prompt: truncate(request.prompt, PROMPT_STORAGE_LIMIT),
      steps,
      finalValue: decision.value,
      overallConfidence: decision.confidence,
      escalated: decision.escalateToHuman,
      agreeingSources: [...(decision.agreeingSources ?? [])],
      dissentingSources: [...(decision.dissentingSources ?? [])],
      totalLatencyMs: decision.totalLatencyMs,
      rationale: decision.rationale,
      createdAt: now,
    };

    this.store.set(chainId, chain);
    this.evictIfNeeded();
    return chain;
  }

  /** Fetch a stored chain by id. Returns null if missing or evicted. */
  static getChain(chainId: string): CAMReasoningChain | null {
    if (typeof chainId !== "string" || chainId.length === 0) {
      return null;
    }
    return this.store.get(chainId) ?? null;
  }

  /**
   * Enumerate stored chains as compact summaries. Most recent first.
   * Optional filter narrows by task or escalation status.
   */
  static listChains(filter?: {
    task?: AGIDecisionTask;
    escalatedOnly?: boolean;
    limit?: number;
  }): CAMReasoningChainSummary[] {
    const all = [...this.store.values()].sort((a, b) => b.createdAt - a.createdAt);
    let filtered = all;
    if (filter?.task) {
      filtered = filtered.filter((c) => c.task === filter.task);
    }
    if (filter?.escalatedOnly) {
      filtered = filtered.filter((c) => c.escalated);
    }
    if (filter?.limit !== undefined) {
      const lim = Math.max(0, Math.floor(filter.limit));
      filtered = filtered.slice(0, lim);
    }
    return filtered.map((c) => ({
      chainId: c.chainId,
      task: c.task,
      finalValue: c.finalValue,
      overallConfidence: c.overallConfidence,
      escalated: c.escalated,
      stepCount: c.steps.length,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Answer a follow-up "why X?" query against a stored chain by keyword-matching
   * step summaries + evidence + detail. Case-insensitive substring match on
   * tokenized query terms (drops common stop words). Returns matched steps,
   * an explanation paragraph, and a normalized confidence.
   */
  static whyDecision(chainId: string, query: string): WhyDecisionResult {
    if (typeof chainId !== "string" || chainId.length === 0) {
      throw new Error("whyDecision: chainId must be a non-empty string");
    }
    if (typeof query !== "string") {
      throw new Error("whyDecision: query must be a string");
    }
    const chain = this.store.get(chainId);
    if (!chain) {
      return {
        chainId,
        query,
        matchedSteps: [],
        explanation: `chain "${chainId}" not found (may have been evicted or never stored)`,
        confidence: 0,
        matched: false,
      };
    }

    const tokens = tokenizeQuery(query);
    if (tokens.length === 0) {
      return {
        chainId,
        query,
        matchedSteps: [],
        explanation: "query contained no meaningful tokens after stop-word removal",
        confidence: 0,
        matched: false,
      };
    }

    const matched: CAMReasoningStep[] = [];
    for (const step of chain.steps) {
      const haystack = [
        step.summary,
        step.detail,
        ...step.evidence.map((e) => `${e.source} ${e.description}`),
      ]
        .join(" ")
        .toLowerCase();
      const hits = tokens.filter((t) => haystack.includes(t)).length;
      if (hits > 0) {
        matched.push(step);
      }
    }

    const explanation =
      matched.length > 0
        ? `query "${query}" matched ${matched.length} step(s): ${matched
            .map((s) => `step ${s.stepNumber} (${s.kind})`)
            .join(", ")}. Final decision: ${formatValue(chain.finalValue)} @ ${chain.overallConfidence.toFixed(3)}${
            chain.escalated ? " [ESCALATED]" : ""
          }`
        : `query "${query}" did not match any step in chain ${chainId}. Final decision: ${formatValue(chain.finalValue)} @ ${chain.overallConfidence.toFixed(3)}`;

    // Confidence = matched-step coverage scaled by chain's overall confidence.
    const coverage = chain.steps.length > 0 ? matched.length / chain.steps.length : 0;
    const confidence = coverage * chain.overallConfidence;

    return {
      chainId,
      query,
      matchedSteps: matched,
      explanation,
      confidence,
      matched: matched.length > 0,
    };
  }

  /**
   * Rank all source votes by weighted score (confidence × weight). The winning
   * source's vote is the chain's final value; every other source vote is a
   * rejected alternative with a typed reason.
   */
  static compareAlternatives(chainId: string): AlternativesResult {
    if (typeof chainId !== "string" || chainId.length === 0) {
      throw new Error("compareAlternatives: chainId must be a non-empty string");
    }
    const chain = this.store.get(chainId);
    if (!chain) {
      throw new Error(`compareAlternatives: chain "${chainId}" not found`);
    }

    type Scored = {
      source: SourceKind;
      value: unknown;
      weightedScore: number;
      rawConfidence: number;
      weight: number;
      available: boolean;
      errorCode?: string;
      evidence: string;
    };

    const scored: Scored[] = [];
    for (const step of chain.steps) {
      if (step.source === null) continue;
      // Reconstruct the per-source numbers from the evidence we recorded.
      const conf = step.confidence;
      // Locate weight from evidence (we encoded it as "weight=N").
      let weight = 0;
      let value: unknown = null;
      let available = step.errorCode !== "no_vote" && step.confidence > 0;
      for (const e of step.evidence) {
        if (e.type === "weight") {
          const m = e.description.match(/weight=([\d.]+)/);
          if (m) weight = parseFloat(m[1]);
        }
      }
      // Pull the value out of the detail block (we encoded "value: X").
      const valueMatch = step.detail.match(/^value: (.+)$/m);
      if (valueMatch) {
        value = parseFormattedValue(valueMatch[1]);
      }
      // Re-mark availability from explicit detail.
      const availMatch = step.detail.match(/^available: (true|false)$/m);
      if (availMatch) available = availMatch[1] === "true";

      const entry: Scored = {
        source: step.source,
        value,
        weightedScore: conf * weight,
        rawConfidence: conf,
        weight,
        available,
        evidence: step.detail,
      };
      if (step.errorCode) {
        entry.errorCode = step.errorCode;
      }
      scored.push(entry);
    }

    if (scored.length === 0) {
      return {
        chainId,
        winner: { value: chain.finalValue, source: null, weightedScore: 0 },
        alternatives: [],
      };
    }

    scored.sort((a, b) => b.weightedScore - a.weightedScore);
    const winner = scored[0];
    const losers = scored.slice(1);

    const agreeing = new Set(chain.agreeingSources);
    const alternatives: RejectedAlternative[] = losers.map((s) => {
      let reason: RejectedAlternative["rejectionReason"];
      if (s.errorCode === "no_vote") {
        reason = "source_unavailable";
      } else if (!s.available) {
        reason = "source_errored";
      } else if (!agreeing.has(s.source)) {
        reason = "dissented_from_majority";
      } else {
        reason = "lower_weighted_confidence";
      }
      const alt: RejectedAlternative = {
        value: s.value,
        source: s.source,
        rejectionReason: reason,
        weightedScore: s.weightedScore,
        rawConfidence: s.rawConfidence,
        weight: s.weight,
        evidence: s.evidence,
      };
      if (s.errorCode) alt.errorCode = s.errorCode;
      return alt;
    });

    return {
      chainId,
      winner: {
        value: winner.value !== null && winner.value !== undefined ? winner.value : chain.finalValue,
        source: winner.source,
        weightedScore: winner.weightedScore,
      },
      alternatives,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTERNALS
  // ─────────────────────────────────────────────────────────────────────────

  private static nextChainId(now: number): string {
    this.idCounter = (this.idCounter + 1) % CHAIN_ID_COUNTER_MOD;
    // Combine timestamp + monotonic counter to guarantee uniqueness even on
    // parallel calls within the same ms (Date.now() collides under load).
    const rand = Math.floor(Math.random() * CHAIN_ID_RAND_MAX)
      .toString(16)
      .padStart(CHAIN_ID_RAND_HEX_LEN, "0");
    return `cam-rc-${now.toString(36)}-${this.idCounter.toString(36)}-${rand}`;
  }

  private static evictIfNeeded(): void {
    while (this.store.size > this.maxChains) {
      const oldest = this.store.keys().next().value;
      if (typeof oldest !== "string") break;
      this.store.delete(oldest);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function truncate(s: string, max: number): string {
  if (typeof s !== "string") return "";
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    const s = JSON.stringify(v);
    return s.length > FORMAT_VALUE_LIMIT ? s.slice(0, FORMAT_VALUE_LIMIT - 1) + "…" : s;
  } catch {
    return "[unserializable]";
  }
}

function parseFormattedValue(s: string): unknown {
  if (s === "null") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s.startsWith("{") || s.startsWith("[") || s.startsWith('"')) {
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  }
  return s;
}

const QUERY_STOP_WORDS = new Set([
  "the", "a", "an", "of", "to", "for", "in", "on", "with", "and", "or", "is", "are",
  "be", "was", "were", "what", "which", "how", "should", "i", "we", "use", "did",
  "why", "do", "does", "this", "that", "these", "those", "it",
]);

function tokenizeQuery(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((t) => t.length >= QUERY_MIN_TOKEN_LEN && !QUERY_STOP_WORDS.has(t));
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const camReasoningChainEngine = CAMReasoningChainEngine;
