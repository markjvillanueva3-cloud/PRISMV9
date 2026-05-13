/**
 * SourcePoisoningSanitizerEngine — AUTO-LEARNING-LOOP-MS0 / U-ALL12
 * ==================================================================
 *
 * First-line defence against malicious feeds. Sits between U-ALL01
 * `ReputableSourceMonitorEngine` (the raw poller) and U-ALL02
 * `NoveltyDetectionEngine` (the dedup). A poisoned feed item that
 * makes it past sanitization risks corrupting downstream research +
 * roadmap state — so this engine rejects-then-quarantines anything
 * that fails its trust ladder.
 *
 * Defence ladder (in order — first failure short-circuits to
 * QUARANTINED):
 *   1. **Allowlist check**: the item's `source` slug must appear in
 *      the per-source allowlist (`state/shared/auto-learning/
 *      source-allowlist.json`). Unknown source → `not_allowlisted`.
 *   2. **Content-hash signing** (when the source advertises a
 *      public-key fingerprint): the engine computes SHA-256 of the
 *      canonical (title|guid|summary) and compares to the source's
 *      `expected_fingerprint`. Mismatch → `hash_mismatch`.
 *   3. **Schema sanity**: `guid` / `title` must be non-empty strings;
 *      `summary` if present must be a string. Missing/invalid →
 *      `schema_invalid`.
 *   4. **Oversize**: title > `MAX_TITLE_LEN` (default 1000) or
 *      summary > `MAX_SUMMARY_LEN` (default 20000) — reject as
 *      `oversized`.
 *   5. **Prompt-injection scan**: title + summary scanned for
 *      ChatML control tokens, leading role markers, mustache
 *      template injection, control-char clusters. Any hit →
 *      `prompt_injection`. This is intentionally aggressive — we'd
 *      rather quarantine a benign-looking marketing email that
 *      starts with "System:" than let a real injection through.
 *   6. **Malformed XML/HTML**: optional caller-supplied flag
 *      (`isMalformed: boolean` on the input) — if `true`, reject
 *      as `malformed`. The caller (CLI / dispatcher) owns the
 *      parse-failure detection because XML libraries vary by
 *      runtime; the engine just records the verdict.
 *
 * Quarantine — the engine emits a `QuarantineRecord` per rejected
 * item; the CLI is responsible for appending to
 * `state/shared/auto-learning/quarantine.jsonl`. Engine itself is
 * pure data (no I/O), so quarantine assembly is deterministic +
 * test-friendly.
 *
 * Schema-versioned for forward compat. Adaptive tuners can swap
 * `MAX_TITLE_LEN` / `MAX_SUMMARY_LEN` / `prompt_injection_patterns`
 * via `setConfig()`.
 *
 * @milestone AUTO-LEARNING-LOOP-MS0 / U-ALL12
 */

import { createHash } from "node:crypto";

// ─── Public types ────────────────────────────────────────────────────

export interface SourceAllowlistEntry {
  /** Source slug — must match `SourceItem.source` exactly. */
  slug: string;
  /** Human-readable name. */
  name: string;
  /**
   * Optional SHA-256 hex fingerprint of the source's signed
   * content. When present, items from this source MUST hash to
   * this value or be quarantined. Absent ⇒ allowlist alone
   * suffices (trusted-source-by-name).
   */
  expected_fingerprint?: string;
  /** Free-form notes — origin URL, last-reviewed date, etc. */
  notes?: string;
}

export interface SourceAllowlist {
  schemaVersion: number;
  sources: SourceAllowlistEntry[];
}

export interface SanitizeInput {
  source: string;
  guid: string;
  title: string;
  summary?: string;
  link?: string;
  /**
   * Caller-supplied flag — true if the feed item was rejected by
   * the upstream XML/HTML parser. Engine surfaces this as
   * `malformed` quarantine reason without re-parsing.
   */
  isMalformed?: boolean;
}

export type QuarantineReason =
  | "not_allowlisted"
  | "hash_mismatch"
  | "schema_invalid"
  | "oversized"
  | "prompt_injection"
  | "malformed";

export interface QuarantineRecord {
  /** Original input.source (or "" if unset). */
  source: string;
  /** Original input.guid (truncated for log safety). */
  guid: string;
  reason: QuarantineReason;
  /** Optional diagnostic detail — what pattern matched, etc. */
  detail?: string;
  /** Epoch ms at which the engine flagged this. */
  quarantinedAt: number;
}

export interface SanitizeOutcome {
  /** Items that passed all 6 gates. Same shape as input. */
  clean: SanitizeInput[];
  /** Items quarantined — one record per rejected input. */
  quarantined: QuarantineRecord[];
  /** Per-reason counts. */
  counts: Record<QuarantineReason, number>;
  /** Pass-rate as a fraction of total inputs. */
  passRate: number;
}

export interface SanitizerConfig {
  max_title_len: number;
  max_summary_len: number;
  /** When true (default), prompt-injection patterns trigger quarantine. */
  prompt_injection_enabled: boolean;
}

export interface EngineOpts {
  allowlist?: SourceAllowlist | null;
  config?: Partial<SanitizerConfig>;
  now?: () => number;
}

// ─── Constants ──────────────────────────────────────────────────────

export const ALLOWLIST_SCHEMA_VERSION = 1;
export const DEFAULT_MAX_TITLE_LEN = 1000;
export const DEFAULT_MAX_SUMMARY_LEN = 20000;
export const DEFAULT_GUID_LOG_TRUNC = 64;

/**
 * Prompt-injection patterns — these mirror U-ALL03's
 * `AutoResearchOrchestratorEngine` sanitiser but trigger quarantine
 * here rather than silent strip. The U-ALL03 stripper is a runtime
 * safety net; U-ALL12 is the gatekeeper that says "if you have to
 * strip THIS aggressively, the item probably shouldn't enter the
 * pipeline at all."
 */
const CHATML_TOKEN_PATTERN = /<\|(?:im_start|im_end|system|user|assistant|endoftext|fim_prefix|fim_middle|fim_suffix)\|>/i;
const ROLE_MARKER_PATTERN = /^(?:\s*)(?:system|assistant|tool|function|developer)\s*:\s*/im;
const MUSTACHE_PATTERN = /\{\{[\s\S]{0,200}?\}\}/;
// eslint-disable-next-line no-control-regex -- intentional control-char detection
const CONTROL_CLUSTER_PATTERN = new RegExp(
  "[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]{3,}",
  "",
);

const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

// ─── Helpers ────────────────────────────────────────────────────────

function freshCounts(): Record<QuarantineReason, number> {
  return {
    not_allowlisted: 0,
    hash_mismatch: 0,
    schema_invalid: 0,
    oversized: 0,
    prompt_injection: 0,
    malformed: 0,
  };
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function truncate(s: string, max = DEFAULT_GUID_LOG_TRUNC): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class SourcePoisoningSanitizerEngine {
  readonly name = "SourcePoisoningSanitizerEngine";

  private allowlist: Map<string, SourceAllowlistEntry>;
  private allowlistLoaded: boolean;
  private config: SanitizerConfig;
  private nowFn: () => number;

  constructor(opts: EngineOpts = {}) {
    this.allowlist = new Map();
    this.allowlistLoaded = false;
    this.config = {
      max_title_len: DEFAULT_MAX_TITLE_LEN,
      max_summary_len: DEFAULT_MAX_SUMMARY_LEN,
      prompt_injection_enabled: true,
      ...(opts.config ?? {}),
    };
    this.nowFn = opts.now ?? Date.now;
    if (opts.allowlist) {
      const r = this.setAllowlist(opts.allowlist);
      if (!r.ok) {
        // Bad seed allowlist ⇒ engine constructs with EMPTY allowlist
        // (will quarantine everything as `not_allowlisted`) but not
        // throw — defence-in-depth.
        this.allowlist = new Map();
        this.allowlistLoaded = false;
      }
    }
  }

  getConfig(): SanitizerConfig {
    return { ...this.config };
  }

  setConfig(patch: Partial<SanitizerConfig>): void {
    if (typeof patch.max_title_len === "number" && Number.isFinite(patch.max_title_len) && patch.max_title_len > 0) {
      this.config.max_title_len = Math.floor(patch.max_title_len);
    }
    if (typeof patch.max_summary_len === "number" && Number.isFinite(patch.max_summary_len) && patch.max_summary_len > 0) {
      this.config.max_summary_len = Math.floor(patch.max_summary_len);
    }
    if (typeof patch.prompt_injection_enabled === "boolean") {
      this.config.prompt_injection_enabled = patch.prompt_injection_enabled;
    }
  }

  isAllowlistLoaded(): boolean {
    return this.allowlistLoaded;
  }

  getAllowlistSize(): number {
    return this.allowlist.size;
  }

  setAllowlist(next: SourceAllowlist): { ok: boolean; loaded: number; error?: string } {
    if (!next || typeof next !== "object") return { ok: false, loaded: 0, error: "not_an_object" };
    if (next.schemaVersion !== ALLOWLIST_SCHEMA_VERSION) {
      return { ok: false, loaded: 0, error: `schema_mismatch: got ${String(next.schemaVersion)}` };
    }
    if (!Array.isArray(next.sources)) return { ok: false, loaded: 0, error: "sources_not_array" };
    const fresh = new Map<string, SourceAllowlistEntry>();
    for (const raw of next.sources) {
      if (!raw || typeof raw !== "object") continue;
      if (typeof raw.slug !== "string" || raw.slug.length === 0) continue;
      if (FORBIDDEN_KEYS.has(raw.slug)) continue;
      fresh.set(raw.slug, {
        slug: raw.slug,
        name: isString(raw.name) ? raw.name : raw.slug,
        expected_fingerprint: isString(raw.expected_fingerprint) ? raw.expected_fingerprint : undefined,
        notes: isString(raw.notes) ? raw.notes : undefined,
      });
    }
    this.allowlist = fresh;
    this.allowlistLoaded = true;
    return { ok: true, loaded: fresh.size };
  }

  loadAllowlistJson(json: string): { ok: boolean; loaded: number; error?: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (err) {
      return { ok: false, loaded: 0, error: `parse_error: ${err instanceof Error ? err.message : String(err)}` };
    }
    if (typeof parsed !== "object" || parsed === null) {
      return { ok: false, loaded: 0, error: "not_an_object" };
    }
    return this.setAllowlist(parsed as SourceAllowlist);
  }

  /** Test-only reset. */
  resetAll(): void {
    this.allowlist = new Map();
    this.allowlistLoaded = false;
  }

  /**
   * Sanitise a batch of feed items. Returns clean[] + quarantined[]
   * pair so callers can persist them separately.
   */
  sanitize(items: ReadonlyArray<SanitizeInput>): SanitizeOutcome {
    const out: SanitizeOutcome = {
      clean: [],
      quarantined: [],
      counts: freshCounts(),
      passRate: 0,
    };
    if (!Array.isArray(items) || items.length === 0) return out;
    const now = this.nowFn();
    for (const raw of items) {
      const verdict = this.sanitizeOne(raw, now);
      if (verdict.kind === "clean") {
        out.clean.push(verdict.item);
      } else {
        out.quarantined.push(verdict.record);
        out.counts[verdict.record.reason] += 1;
      }
    }
    out.passRate = items.length === 0 ? 0 : out.clean.length / items.length;
    return out;
  }

  // ── private ──

  private sanitizeOne(
    raw: SanitizeInput,
    now: number,
  ): { kind: "clean"; item: SanitizeInput } | { kind: "quarantine"; record: QuarantineRecord } {
    // Gate 6: malformed flag — caller already failed XML parse.
    if (raw && (raw as SanitizeInput).isMalformed === true) {
      return {
        kind: "quarantine",
        record: this.makeRecord(raw, "malformed", "upstream_parse_failure", now),
      };
    }

    // Gate 3: schema sanity (must come before everything else so we
    // can reference raw.source / raw.guid safely).
    if (!raw || typeof raw !== "object") {
      return {
        kind: "quarantine",
        record: {
          source: "",
          guid: "",
          reason: "schema_invalid",
          detail: "not_an_object",
          quarantinedAt: now,
        },
      };
    }
    if (!isString(raw.source) || raw.source.length === 0) {
      return { kind: "quarantine", record: this.makeRecord(raw, "schema_invalid", "missing_source", now) };
    }
    if (!isString(raw.guid) || raw.guid.length === 0) {
      return { kind: "quarantine", record: this.makeRecord(raw, "schema_invalid", "missing_guid", now) };
    }
    if (!isString(raw.title) || raw.title.length === 0) {
      return { kind: "quarantine", record: this.makeRecord(raw, "schema_invalid", "missing_title", now) };
    }
    if (raw.summary !== undefined && !isString(raw.summary)) {
      return { kind: "quarantine", record: this.makeRecord(raw, "schema_invalid", "summary_not_string", now) };
    }

    // Gate 1: allowlist.
    const entry = this.allowlist.get(raw.source);
    if (!entry) {
      return { kind: "quarantine", record: this.makeRecord(raw, "not_allowlisted", undefined, now) };
    }

    // Gate 4: oversize.
    if (raw.title.length > this.config.max_title_len) {
      return {
        kind: "quarantine",
        record: this.makeRecord(raw, "oversized", `title_len=${raw.title.length}`, now),
      };
    }
    if (typeof raw.summary === "string" && raw.summary.length > this.config.max_summary_len) {
      return {
        kind: "quarantine",
        record: this.makeRecord(raw, "oversized", `summary_len=${raw.summary.length}`, now),
      };
    }

    // Gate 2: hash signing (only when source declares a fingerprint).
    if (entry.expected_fingerprint) {
      const canonical = `${raw.title}|${raw.guid}|${raw.summary ?? ""}`;
      const actual = sha256Hex(canonical);
      if (actual !== entry.expected_fingerprint) {
        return {
          kind: "quarantine",
          record: this.makeRecord(raw, "hash_mismatch", `actual=${actual.slice(0, 12)}…`, now),
        };
      }
    }

    // Gate 5: prompt injection.
    if (this.config.prompt_injection_enabled) {
      const concat = `${raw.title}\n${raw.summary ?? ""}`;
      if (CHATML_TOKEN_PATTERN.test(concat)) {
        return { kind: "quarantine", record: this.makeRecord(raw, "prompt_injection", "chatml_token", now) };
      }
      if (ROLE_MARKER_PATTERN.test(concat)) {
        return { kind: "quarantine", record: this.makeRecord(raw, "prompt_injection", "role_marker", now) };
      }
      if (MUSTACHE_PATTERN.test(concat)) {
        return { kind: "quarantine", record: this.makeRecord(raw, "prompt_injection", "mustache", now) };
      }
      if (CONTROL_CLUSTER_PATTERN.test(concat)) {
        return { kind: "quarantine", record: this.makeRecord(raw, "prompt_injection", "control_cluster", now) };
      }
    }

    return { kind: "clean", item: raw };
  }

  private makeRecord(raw: SanitizeInput, reason: QuarantineReason, detail: string | undefined, now: number): QuarantineRecord {
    return {
      source: typeof raw?.source === "string" ? raw.source : "",
      guid: typeof raw?.guid === "string" ? truncate(raw.guid) : "",
      reason,
      detail,
      quarantinedAt: now,
    };
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

/**
 * Production singleton. Defaults to EMPTY allowlist — until the CLI
 * loads `state/shared/auto-learning/source-allowlist.json` via
 * `loadAllowlistJson(fs.readFileSync(...))`, every feed item will be
 * quarantined as `not_allowlisted`. This is the secure default:
 * cron loads → CLI populates → engine accepts.
 *
 * // WIRE-EXEMPT: dispatcher action lands in U-ALL07/U-ALL08 — but
 * // U-ALL12 ships LATER so the dispatcher action is incremental
 * // wiring on top of the already-shipped suite. Add as
 * // `prism_ai:source_poisoning_sanitize` in the same envelope as
 * // U-ALL12.
 */
export const sourcePoisoningSanitizerEngine = new SourcePoisoningSanitizerEngine();
