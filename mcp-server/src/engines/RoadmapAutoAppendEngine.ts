/**
 * RoadmapAutoAppendEngine — AUTO-LEARNING-LOOP-MS0 / U-ALL06
 * ===========================================================
 *
 * Turns U-ALL04 `SynergyClassifierEngine` `high`-band verdicts into
 * proposed roadmap units (`U-AUTORES-XX` IDs). The engine does NOT
 * touch the roadmap file directly — file mutation belongs to the
 * CLI under a `prism_context:claim_file` lock (deferred to U-ALL09
 * cron landing). The engine emits an `AppendProposal` carrying the
 * YAML payload + the target milestone hint; the CLI is responsible
 * for the actual write.
 *
 * Spec § U-ALL06 contracts:
 *   - **Append rate limit**: ≤ 2 new units per milestone per cron
 *     cycle (default), unless the candidate has ≥ 3 corroborating
 *     sources — in which case the rate limit is bypassed for that
 *     candidate. The rate-limit config persists in
 *     `state/shared/auto-learning/append-rate-limit.json` and is
 *     loaded by the CLI on startup.
 *   - **Band gate**: only `high` produces proposals; `med` / `low`
 *     / `none` no-op. This is tighter than U-ALL05 (high+med) on
 *     purpose: pushing a roadmap unit is a higher-commitment write
 *     than a viz augmentation, so we set a stricter floor.
 *   - **Dup guard**: same originGuid producing two proposals in one
 *     call → second drops. Cross-cycle dedup is the CLI's job (it
 *     reads the recently-appended log and filters).
 *   - **Unit-id collision**: caller hands in a `nextIdPrefix`
 *     (typically `"U-AUTORES-"` + a milestone-scoped counter); the
 *     engine assigns `${prefix}NN` where NN is a sequential index
 *     within the batch. The CLI is responsible for tracking the
 *     cross-cycle counter in the rate-limit file.
 *   - **Malformed-input rejection**: missing originGuid / title /
 *     verdict structure → rejected with structured reason in
 *     `rejected[]`. The engine NEVER throws on bad input.
 *
 * YAML emission — uses minimal hand-formatted YAML rather than a
 * library dependency. Keys are emitted in canonical order so the
 * appended block diffs cleanly:
 *   ```yaml
 *   - id: U-AUTORES-XX
 *     title: "<sanitized title>"
 *     pillar: auto-learn
 *     tier: T2
 *     ai_priority_score: <derived from verdict.score>
 *     leverage_score: <derived from verdict.score>
 *     why: "<sanitized rationale>"
 *     status: not_started
 *     depends_on: []
 *     blocks: []
 *     source:
 *       origin: "<source slug>"
 *       guid: "<guid>"
 *       url: "<link or null>"
 *       corroborations: <n>
 *     classified:
 *       score: <verdict.score>
 *       label: high
 *       rubricSchemaVersion: <int>
 *     proposedAt: "<ISO-8601>"
 *   ```
 *
 * The YAML quoting strategy keeps any newlines + colons inside
 * strings safe: every multi-line / colon-bearing field is wrapped
 * in double quotes with internal `"` / `\` / control-char escapes.
 *
 * Determinism + testability:
 *   - `now`, `nextIdPrefix` injected via engine options for
 *     reproducible YAML output in tests.
 *   - The engine performs ZERO I/O. The CLI owns disk reads/writes
 *     (rate-limit JSON + active-roadmap markdown).
 *
 * @milestone AUTO-LEARNING-LOOP-MS0 / U-ALL06
 */

import type { ClassifierVerdict } from "./SynergyClassifierEngine.js";

// ─── Public types ────────────────────────────────────────────────────

export interface AppendInput {
  /** The classifier verdict — must be label === "high" to be considered. */
  verdict: ClassifierVerdict;
  /** Stable identifier of the source item. */
  guid: string;
  /** Source slug (`arxiv-cs-ai`, `rss-bbc`, …). */
  source: string;
  /** Title of the research finding (becomes the unit title). */
  title: string;
  /** Optional URL of the source item. */
  link?: string;
  /** Optional 1-line rationale (becomes the `why:` field). */
  why?: string;
  /**
   * Number of independent sources that have corroborated this finding
   * within the current cron cycle. Default 1 (just the originating
   * source). ≥ 3 bypasses the per-milestone rate limit.
   */
  corroborations?: number;
}

/** Persisted state — the CLI rate-limit file mirrors this shape. */
export interface AppendRateLimitState {
  schemaVersion: number;
  /** Hard ceiling on appends per milestone per cron cycle. */
  per_milestone_limit: number;
  /** Corroboration count that bypasses the limit. */
  corroboration_bypass_threshold: number;
  /**
   * Per-milestone counters for the *current* cron cycle. Reset by
   * the CLI at the top of each cycle.
   */
  appended_this_cycle: Record<string, number>;
  /** Cross-cycle dedup: guids already appended (caller maintains). */
  dedup_guids?: string[];
}

export interface AppendProposal {
  /** Unit id (e.g. "U-AUTORES-07"). */
  id: string;
  /** Hand-formatted YAML block, ready to append to the roadmap file. */
  yaml: string;
  /** Milestone the proposal targets (default "BACKEND-DEVTOOLS-RGS6"). */
  targetMilestone: string;
  /** Sanitised title (after escape). */
  titleSanitized: string;
  /** Sanitised why (after escape). */
  whySanitized: string;
  /** Classifier audit trail. */
  verdictSchemaVersion: number;
  verdictScore: number;
  /** Mirror of input.corroborations (default 1). */
  corroborations: number;
  /** Set when rate-limit bypass fired (corroborations ≥ threshold). */
  bypassedRateLimit: boolean;
  /** ISO-8601 of the proposal. */
  proposedAt: string;
}

export interface AppendRejection {
  guid: string;
  reason:
    | "low_synergy_band"
    | "missing_guid"
    | "missing_title"
    | "missing_verdict"
    | "rate_limited"
    | "internal_dup"
    | "cross_cycle_dup"
    | "invalid_score";
}

export interface AppendBatchResult {
  proposals: AppendProposal[];
  rejected: AppendRejection[];
  /** Counter snapshot after the call — mirrors state.appended_this_cycle. */
  appendedThisCycle: Record<string, number>;
}

export interface EngineOpts {
  state?: AppendRateLimitState | null;
  /** Default `"U-AUTORES-"`. */
  idPrefix?: string;
  /** Default `"BACKEND-DEVTOOLS-RGS6"`. */
  targetMilestone?: string;
  /** Default `"T2"`. */
  defaultTier?: string;
  /** Wall-clock injection. */
  now?: () => number;
}

// ─── Constants ──────────────────────────────────────────────────────

export const RATE_LIMIT_SCHEMA_VERSION = 1;
export const DEFAULT_PER_MILESTONE_LIMIT = 2;
export const DEFAULT_CORROBORATION_BYPASS_THRESHOLD = 3;
export const DEFAULT_ID_PREFIX = "U-AUTORES-";
export const DEFAULT_TARGET_MILESTONE = "BACKEND-DEVTOOLS-RGS6";
export const DEFAULT_TIER = "T2";

/**
 * Hard upper bound on title length in the appended YAML — prevents a
 * runaway feed from emitting a 100 KB single-line title.
 */
export const MAX_TITLE_LEN = 300;
/** Hard upper bound on the `why:` line. */
export const MAX_WHY_LEN = 500;

const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

// ─── Helpers ────────────────────────────────────────────────────────

function freshState(): AppendRateLimitState {
  return {
    schemaVersion: RATE_LIMIT_SCHEMA_VERSION,
    per_milestone_limit: DEFAULT_PER_MILESTONE_LIMIT,
    corroboration_bypass_threshold: DEFAULT_CORROBORATION_BYPASS_THRESHOLD,
    appended_this_cycle: {},
    dedup_guids: [],
  };
}

function deepCloneState(s: AppendRateLimitState): AppendRateLimitState {
  const counters: Record<string, number> = {};
  if (s.appended_this_cycle && typeof s.appended_this_cycle === "object") {
    for (const [k, v] of Object.entries(s.appended_this_cycle)) {
      if (FORBIDDEN_KEYS.has(k)) continue;
      counters[k] = Number.isFinite(v) ? Number(v) : 0;
    }
  }
  return {
    schemaVersion: RATE_LIMIT_SCHEMA_VERSION,
    per_milestone_limit: Number.isFinite(s.per_milestone_limit)
      ? Math.max(0, Math.floor(s.per_milestone_limit))
      : DEFAULT_PER_MILESTONE_LIMIT,
    corroboration_bypass_threshold: Number.isFinite(s.corroboration_bypass_threshold)
      ? Math.max(0, Math.floor(s.corroboration_bypass_threshold))
      : DEFAULT_CORROBORATION_BYPASS_THRESHOLD,
    appended_this_cycle: counters,
    dedup_guids: Array.isArray(s.dedup_guids) ? s.dedup_guids.slice() : [],
  };
}

/**
 * Quote a value for YAML emission. Wraps in double quotes and escapes
 * `"` / `\` / control bytes. Sufficient for the simple shape we emit
 * — fields are always single-line after truncation.
 */
function yamlString(s: string): string {
  // Strip ASCII control chars except \t.
  // eslint-disable-next-line no-control-regex -- intentional control-char scrub.
  const cleaned = s.replace(new RegExp("[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]", "g"), "");
  const escaped = cleaned.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
  return `"${escaped}"`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class RoadmapAutoAppendEngine {
  readonly name = "RoadmapAutoAppendEngine";

  private state: AppendRateLimitState;
  private idPrefix: string;
  private targetMilestone: string;
  private defaultTier: string;
  private nowFn: () => number;

  constructor(opts: EngineOpts = {}) {
    this.state = opts.state ? deepCloneState(opts.state) : freshState();
    this.idPrefix = typeof opts.idPrefix === "string" && opts.idPrefix.length > 0 ? opts.idPrefix : DEFAULT_ID_PREFIX;
    this.targetMilestone = typeof opts.targetMilestone === "string" && opts.targetMilestone.length > 0
      ? opts.targetMilestone : DEFAULT_TARGET_MILESTONE;
    this.defaultTier = typeof opts.defaultTier === "string" && opts.defaultTier.length > 0
      ? opts.defaultTier : DEFAULT_TIER;
    this.nowFn = opts.now ?? Date.now;
  }

  /** Defensive snapshot of the rate-limit state. */
  getState(): AppendRateLimitState {
    return deepCloneState(this.state);
  }

  /** Atomic swap — CLI uses this on startup to load the persisted state. */
  setState(next: AppendRateLimitState): { ok: boolean; error?: string } {
    if (!next || typeof next !== "object") return { ok: false, error: "not_an_object" };
    if (next.schemaVersion !== RATE_LIMIT_SCHEMA_VERSION) {
      return { ok: false, error: `schema_mismatch: got ${String(next.schemaVersion)}` };
    }
    this.state = deepCloneState(next);
    return { ok: true };
  }

  /** Reset per-cycle counters at the top of each cron tick. */
  resetCycleCounters(): void {
    this.state.appended_this_cycle = {};
  }

  /**
   * Hard reset — drops cycle counters AND cross-cycle dedup_guids
   * back to a fresh state. Test-only escape hatch; production
   * should `setState()` from the persisted JSON instead.
   */
  resetAll(): void {
    this.state = freshState();
  }

  /**
   * Build an AppendProposal for a single AppendInput. Returns
   * `null` when rejected (verdict not high / missing field / rate
   * limited / duplicate).
   *
   * Use `proposeBatch` for batch-aware rate-limit accounting; this
   * single-shot variant is intended for tests + dispatcher calls.
   */
  propose(input: AppendInput): AppendProposal | AppendRejection {
    const rejected = this.tryRejectInput(input);
    if (rejected) return rejected;

    const milestone = this.targetMilestone;
    const counter = this.state.appended_this_cycle[milestone] ?? 0;
    const corroborations = Math.max(1, Math.floor(input.corroborations ?? 1));
    const bypass = corroborations >= this.state.corroboration_bypass_threshold;
    if (!bypass && counter >= this.state.per_milestone_limit) {
      return { guid: input.guid, reason: "rate_limited" };
    }

    if (Array.isArray(this.state.dedup_guids) && this.state.dedup_guids.includes(input.guid)) {
      return { guid: input.guid, reason: "cross_cycle_dup" };
    }

    const idNum = counter + 1; // 1-based within the milestone-cycle
    const id = `${this.idPrefix}${pad2(idNum)}`;

    // Update counters (caller can call `resetCycleCounters()` between cycles).
    this.state.appended_this_cycle[milestone] = counter + 1;
    if (!this.state.dedup_guids) this.state.dedup_guids = [];
    this.state.dedup_guids.push(input.guid);

    return this.buildProposal(id, input, corroborations, bypass);
  }

  /**
   * Batch variant with internal dedup. Returns proposals + rejections.
   */
  proposeBatch(inputs: ReadonlyArray<AppendInput>): AppendBatchResult {
    const result: AppendBatchResult = {
      proposals: [],
      rejected: [],
      appendedThisCycle: { ...this.state.appended_this_cycle },
    };
    if (!Array.isArray(inputs)) return result;
    const seenInThisBatch = new Set<string>();
    for (const input of inputs) {
      // Per-batch internal dedup BEFORE delegating to propose() (which
      // would otherwise emit ids for two copies of the same guid).
      if (input && typeof input === "object" && typeof input.guid === "string" && input.guid.length > 0) {
        if (seenInThisBatch.has(input.guid)) {
          result.rejected.push({ guid: input.guid, reason: "internal_dup" });
          continue;
        }
        seenInThisBatch.add(input.guid);
      }
      const r = this.propose(input);
      if (this.isProposal(r)) result.proposals.push(r);
      else result.rejected.push(r);
    }
    result.appendedThisCycle = { ...this.state.appended_this_cycle };
    return result;
  }

  // ── private ──

  private isProposal(r: AppendProposal | AppendRejection): r is AppendProposal {
    return typeof (r as AppendProposal).yaml === "string";
  }

  private tryRejectInput(input: AppendInput): AppendRejection | null {
    if (!input || typeof input !== "object") {
      return { guid: "", reason: "missing_verdict" };
    }
    if (!input.verdict || typeof input.verdict !== "object") {
      return { guid: typeof input.guid === "string" ? input.guid : "", reason: "missing_verdict" };
    }
    if (typeof input.guid !== "string" || input.guid.length === 0) {
      return { guid: "", reason: "missing_guid" };
    }
    if (typeof input.title !== "string" || input.title.length === 0) {
      return { guid: input.guid, reason: "missing_title" };
    }
    if (input.verdict.label !== "high") {
      return { guid: input.guid, reason: "low_synergy_band" };
    }
    if (!Number.isFinite(input.verdict.score) || input.verdict.score < 0 || input.verdict.score > 1) {
      return { guid: input.guid, reason: "invalid_score" };
    }
    return null;
  }

  private buildProposal(
    id: string,
    input: AppendInput,
    corroborations: number,
    bypassedRateLimit: boolean,
  ): AppendProposal {
    const now = this.nowFn();
    const titleSanitized = input.title.slice(0, MAX_TITLE_LEN);
    const whySanitized = (input.why ?? "Auto-research finding — verify before scheduling.").slice(0, MAX_WHY_LEN);
    const score = input.verdict.score;
    // Map score 0.65..1.0 to ai_priority_score in [60, 90] linearly
    // (high band starts at 0.65 by default rubric). This keeps the
    // engine's emitted priority comparable to hand-authored units.
    const denom = Math.max(0.001, 1 - 0.65);
    const aiPriority = Math.round(60 + ((Math.max(0.65, score) - 0.65) / denom) * 30);
    const leverage = Math.round(8 + ((Math.max(0.65, score) - 0.65) / denom) * 6); // 8..14

    const ts = new Date(now).toISOString();
    const linkLiteral = typeof input.link === "string" && input.link.length > 0
      ? yamlString(input.link)
      : "null";

    const yaml = [
      `  - id: ${id}`,
      `    title: ${yamlString(titleSanitized)}`,
      `    pillar: auto-learn`,
      `    tier: ${this.defaultTier}`,
      `    ai_priority_score: ${aiPriority}`,
      `    leverage_score: ${leverage}`,
      `    why: ${yamlString(whySanitized)}`,
      `    status: not_started`,
      `    depends_on: []`,
      `    blocks: []`,
      `    source:`,
      `      origin: ${yamlString(input.source)}`,
      `      guid: ${yamlString(input.guid)}`,
      `      url: ${linkLiteral}`,
      `      corroborations: ${corroborations}`,
      `    classified:`,
      `      score: ${score}`,
      `      label: high`,
      `      rubricSchemaVersion: ${input.verdict.rubricSchemaVersion}`,
      `      bypassedRateLimit: ${bypassedRateLimit ? "true" : "false"}`,
      `    proposedAt: ${yamlString(ts)}`,
      "",
    ].join("\n");

    return {
      id,
      yaml,
      targetMilestone: this.targetMilestone,
      titleSanitized,
      whySanitized,
      verdictSchemaVersion: input.verdict.rubricSchemaVersion,
      verdictScore: score,
      corroborations,
      bypassedRateLimit,
      proposedAt: ts,
    };
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

/**
 * Production singleton. The dispatcher action
 * `prism_ai:roadmap_auto_append` (this milestone, U-ALL07/U-ALL08
 * wiring batch) and the CLI (deferred to U-ALL09) share this instance.
 *
 * // WIRE-EXEMPT: dispatcher action lands in U-ALL07/U-ALL08. The
 * // CLI is deferred to U-ALL09. `stop-auto-wire.mjs` should
 * // suppress orphan warnings during the gap.
 */
export const roadmapAutoAppendEngine = new RoadmapAutoAppendEngine();
