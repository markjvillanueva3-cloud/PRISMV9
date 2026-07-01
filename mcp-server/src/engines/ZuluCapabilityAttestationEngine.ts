/**
 * ZuluCapabilityAttestationEngine -- C7 (ZULU fleet, HZD-NEW-05).
 *
 * Outcome-correlated capability trust. The gap this fills: ZuluTaskAuctionEngine's
 * `domain_match` bid component (highest weight, W=4.0) trusts a slot's SOUL-DECLARED
 * domain expertise completely -- there is NO feedback loop from actual task outcomes.
 * A slot that DECLARES `mill` expertise but consistently produces test failures /
 * scrutiny FAILs on mill tasks should have its `domain_match` bid weight DISCOUNTED.
 * This engine correlates declared affinity against empirical success history and emits
 * an AttestationScore per (slot, domain) pair, plus an advisory multiplicative
 * `bid_modifier` the auction can apply to `domain_match`.
 *
 * SAFETY -- ADVISORY, NEVER A VETO:
 *   - bid_modifier is a multiplicative factor in [MIN_MODIFIER, MAX_MODIFIER], ALWAYS > 0
 *     (never 0 -> never a veto; the ZuluFleetGovernor authority hierarchy is unchanged).
 *   - Below MIN_SAMPLE_N completed outcomes the score is `insufficient` and the modifier
 *     is NEUTRAL (1.0): an unproven slot is NEVER penalized on thin evidence (R12 honest --
 *     we do not fabricate a trust score we have not earned the samples to support).
 *   - Credibility uses the WILSON score interval LOWER bound (not the raw point estimate),
 *     so n=1 success never yields an overconfident 1.0; small n -> wide interval -> low
 *     ci_lower -> conservative modifier. (Wilson is the standard small-n proportion CI.)
 *
 * Pure-core (heavily tested, no IO): wilsonInterval / classifyConfidence /
 * computeBidModifier / buildAttestation. Durable instance methods (recordOutcome / attest
 * / attestAll / bidModifierFor) clone ZuluTaskContinuityEngine (C2) + C5 store discipline:
 * schemaVersion-tagged, atomic tmp+rename, fail-closed on corrupt/schema, per-pair ring
 * capped, store path overridable for hermetic tests.
 *
 * declared_affinity is supplied by the CALLER (the auction already loads souls via
 * SoulFrontmatterReaderEngine) -- this engine does NOT read soul YAML itself, keeping it
 * decoupled and honest (no fabricated soul read). C8 (soul-evolution advisor) consumes
 * the AttestationScores produced here.
 *
 * @module engines/ZuluCapabilityAttestationEngine
 * @unit ZULU/C7-CAPABILITY-ATTESTATION
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Constants
// ============================================================================

const SCHEMA_VERSION = 1;
const DEFAULT_STORE_PATH = "H:/prism/mcp-server/data/state/zulu-capability-attestation.json";
const ATOMIC_RENAME_RETRIES = 5;
const RENAME_RETRY_MS = 25;
const SLOT_RE = /^[a-z][a-z0-9-]{1,31}$/i;
const DOMAIN_RE = /^[a-z][a-z0-9_-]{1,47}$/i;
const Z_95 = 1.959963984540054; // standard-normal quantile for a 95% two-sided interval

/** Statistical-significance + ring configuration. Overridable via opts. */
const DEFAULTS = Object.freeze({
  minSampleN: 20, // spec: >= 20 completed tasks per slot per domain for significance
  maxOutcomesPerPair: 200, // ring-buffer cap per (slot,domain)
  z: Z_95,
  // bid_modifier bounds -- advisory multiplier on domain_match; NEVER 0 (never a veto).
  minModifier: 0.5, // a fully-discredited proven slot still gets half-weight, not exclusion
  maxModifier: 1.25, // a fully-attested proven slot gets a modest boost
});

// ============================================================================
// Types (exported for dispatcher + tests)
// ============================================================================

export type AttestationConfidence = "insufficient" | "low" | "moderate" | "high";

/** A single completed-task outcome for a (slot, domain) pair. */
export interface TaskOutcome {
  slot: string;
  domain: string;
  /** true = task succeeded (committed + scrutiny PASS); false = failed (test/scrutiny FAIL). */
  success: boolean;
  /** ISO-8601 timestamp; defaults to record time. */
  at?: string;
  /** Optional originating unit id, for audit. */
  unit?: string;
}

/** Wilson score interval result. */
export interface WilsonInterval {
  lower: number;
  upper: number;
  center: number;
}

export interface AttestationScore {
  slot: string;
  domain: string;
  /** Did the slot's SOUL declare this domain? (supplied by caller; default false). */
  declared_affinity: boolean;
  /** Point estimate successes / sample_n (0 when sample_n=0). */
  empirical_success_rate: number;
  successes: number;
  sample_n: number;
  /** Wilson 95% score-interval bounds on the success rate. */
  ci_lower: number;
  ci_upper: number;
  confidence: AttestationConfidence;
  /** Advisory multiplicative modifier on the auction's domain_match weight (> 0, never a veto). */
  bid_modifier: number;
  /** True when declared but empirically discredited (ci_lower well below neutral) -- a C8 signal. */
  over_claim: boolean;
  attested_at: string;
}

export interface AttestOpts {
  now?: string;
  minSampleN?: number;
  z?: number;
  minModifier?: number;
  maxModifier?: number;
  /** Domains the slot's soul declares (caller-supplied; default treats none as declared). */
  declaredDomains?: string[];
}

export interface RecordOutcomeOpts {
  now?: string;
  unit?: string;
  maxOutcomesPerPair?: number;
}

interface OutcomeRow {
  success: boolean;
  at: string;
  unit?: string;
}

interface StoreShape {
  schemaVersion: number;
  /** "slot|domain" -> chronological outcome rows (oldest first). */
  outcomes: Record<string, OutcomeRow[]>;
}

interface ReadStoreResult extends StoreShape {
  readOnly?: boolean;
  reason?: string;
}

// ============================================================================
// Engine
// ============================================================================

class ZuluCapabilityAttestationEngine {
  private static instance: ZuluCapabilityAttestationEngine;
  private readonly storePath: string;
  private readonly pid: number;

  private constructor(storePath?: string) {
    this.storePath = storePath || process.env.PRISM_ZULU_ATTESTATION_PATH || DEFAULT_STORE_PATH;
    this.pid = process.pid;
  }

  static getInstance(): ZuluCapabilityAttestationEngine {
    if (!ZuluCapabilityAttestationEngine.instance) {
      ZuluCapabilityAttestationEngine.instance = new ZuluCapabilityAttestationEngine();
    }
    return ZuluCapabilityAttestationEngine.instance;
  }

  /** Isolated instance bound to a specific store path. Tests only. */
  static __forTests(storePath: string): ZuluCapabilityAttestationEngine {
    return new ZuluCapabilityAttestationEngine(storePath);
  }

  getStorePath(): string {
    return this.storePath;
  }

  // --------------------------------------------------------------------------
  // PURE CORE (no IO) -- the credibility statistics
  // --------------------------------------------------------------------------

  /**
   * Wilson score interval for a binomial proportion. Pure. Far better than the
   * normal approximation for small n / extreme proportions (the n=1 case): a single
   * success yields a wide interval, not [1,1]. n=0 -> [0,1] (no information).
   *
   * @param successes count of successes (clamped to [0, n])
   * @param n total trials (>= 0)
   * @param z standard-normal quantile (default 1.96 for 95%)
   */
  static wilsonInterval(successes: number, n: number, z: number = Z_95): WilsonInterval {
    const N = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    if (N === 0) return { lower: 0, upper: 1, center: 0 };
    const x = Math.min(Math.max(0, Math.floor(Number.isFinite(successes) ? successes : 0)), N);
    const phat = x / N;
    const z2 = z * z;
    const denom = 1 + z2 / N;
    const center = (phat + z2 / (2 * N)) / denom;
    const margin = (z / denom) * Math.sqrt((phat * (1 - phat)) / N + z2 / (4 * N * N));
    return {
      lower: Math.max(0, center - margin),
      upper: Math.min(1, center + margin),
      center,
    };
  }

  /**
   * Confidence tier. Sample-size-gated FIRST: below minSampleN the estimate is
   * `insufficient` regardless of interval width (we lack the n for a trustworthy
   * claim). Above it, narrower intervals -> higher confidence.
   */
  static classifyConfidence(n: number, ciWidth: number, minSampleN: number = DEFAULTS.minSampleN): AttestationConfidence {
    if (!Number.isFinite(n) || n < minSampleN) return "insufficient";
    // width buckets: [0,0.2) high, [0.2,0.4) moderate, [0.4,inf) low.
    if (ciWidth >= 0.4) return "low";
    if (ciWidth >= 0.2) return "moderate";
    return "high";
  }

  /**
   * Advisory multiplicative bid modifier from the Wilson lower bound. Pure.
   * - `insufficient` confidence -> 1.0 (NEUTRAL: never penalize an unproven slot).
   * - else a piecewise-linear map anchored at ci_lower=0.5 -> 1.0 (neutral):
   *     ci_lower in [0.5, 1.0] -> [1.0, maxModifier]   (reward proven credibility)
   *     ci_lower in [0.0, 0.5] -> [minModifier, 1.0]   (discount discredited over-claims)
   *   Always > 0 (clamped to >= minModifier) -- NEVER a veto.
   */
  static computeBidModifier(
    ciLower: number,
    confidence: AttestationConfidence,
    opts: { minModifier?: number; maxModifier?: number } = {},
  ): number {
    const minMod = opts.minModifier ?? DEFAULTS.minModifier;
    const maxMod = opts.maxModifier ?? DEFAULTS.maxModifier;
    if (confidence === "insufficient") return 1.0;
    const lo = Math.min(Math.max(0, ciLower), 1);
    const mod = lo >= 0.5
      ? 1.0 + (maxMod - 1.0) * ((lo - 0.5) / 0.5)
      : minMod + (1.0 - minMod) * (lo / 0.5);
    return Math.min(maxMod, Math.max(minMod, mod));
  }

  /**
   * Build the AttestationScore for one (slot, domain) pair from its outcome rows. Pure.
   */
  static buildAttestation(
    slot: string,
    domain: string,
    declaredAffinity: boolean,
    outcomes: ReadonlyArray<{ success: boolean }>,
    nowMs: number = Date.now(),
    opts: { minSampleN?: number; z?: number; minModifier?: number; maxModifier?: number } = {},
  ): AttestationScore {
    const rows = Array.isArray(outcomes) ? outcomes : [];
    const sample_n = rows.length;
    const successes = rows.reduce((acc, r) => acc + (r && r.success === true ? 1 : 0), 0);
    const minSampleN = opts.minSampleN ?? DEFAULTS.minSampleN;
    const z = opts.z ?? DEFAULTS.z;
    const ci = ZuluCapabilityAttestationEngine.wilsonInterval(successes, sample_n, z);
    const confidence = ZuluCapabilityAttestationEngine.classifyConfidence(sample_n, ci.upper - ci.lower, minSampleN);
    const bid_modifier = ZuluCapabilityAttestationEngine.computeBidModifier(ci.lower, confidence, opts);
    return {
      slot,
      domain,
      declared_affinity: declaredAffinity === true,
      empirical_success_rate: sample_n > 0 ? successes / sample_n : 0,
      successes,
      sample_n,
      ci_lower: ci.lower,
      ci_upper: ci.upper,
      confidence,
      bid_modifier,
      // over_claim: declared the domain, has enough samples, but the credibility floor is
      // below neutral -> empirically discredited self-claim (the principal C8 amend signal).
      over_claim: declaredAffinity === true && confidence !== "insufficient" && ci.lower < 0.5,
      attested_at: new Date(nowMs).toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // Durable instance API
  // --------------------------------------------------------------------------

  /** Record one completed-task outcome for a (slot, domain) pair. Validates + fail-closed. */
  recordOutcome(
    slot: string,
    domain: string,
    success: boolean,
    opts: RecordOutcomeOpts = {},
  ): { ok: boolean; reason?: string; sample_n?: number } {
    if (typeof slot !== "string" || !SLOT_RE.test(slot)) return { ok: false, reason: `invalid slot: ${JSON.stringify(slot)}` };
    if (typeof domain !== "string" || !DOMAIN_RE.test(domain)) return { ok: false, reason: `invalid domain: ${JSON.stringify(domain)}` };
    if (typeof success !== "boolean") return { ok: false, reason: "success must be a boolean" };
    const store = this.readStore();
    if (store.readOnly) return { ok: false, reason: store.reason || "store read-only" };
    const at = typeof opts.now === "string" ? opts.now : new Date().toISOString();
    const cap = typeof opts.maxOutcomesPerPair === "number" && opts.maxOutcomesPerPair > 0
      ? Math.floor(opts.maxOutcomesPerPair) : DEFAULTS.maxOutcomesPerPair;
    const key = `${slot}|${domain}`;
    const rows = store.outcomes[key] || [];
    const row: OutcomeRow = { success, at };
    if (typeof opts.unit === "string") row.unit = opts.unit;
    rows.push(row);
    // ring-buffer cap: keep the most recent `cap`
    store.outcomes[key] = rows.length > cap ? rows.slice(rows.length - cap) : rows;
    this.writeStore(store);
    return { ok: true, sample_n: store.outcomes[key].length };
  }

  /** Attest one (slot, domain) pair from accumulated outcomes (read-only). */
  attest(slot: string, domain: string, opts: AttestOpts = {}): AttestationScore {
    const store = this.readStore();
    const rows = store.outcomes[`${slot}|${domain}`] || [];
    const declared = Array.isArray(opts.declaredDomains) && opts.declaredDomains.includes(domain);
    const nowMs = typeof opts.now === "string" ? Date.parse(opts.now) : Date.now();
    return ZuluCapabilityAttestationEngine.buildAttestation(
      slot, domain, declared, rows, Number.isFinite(nowMs) ? nowMs : Date.now(), opts,
    );
  }

  /** Attest every (slot, domain) pair present in the store. Sorted slot, then domain. */
  attestAll(opts: AttestOpts & { declaredBySlot?: Record<string, string[]> } = {}): {
    ok: boolean; count: number; scores: AttestationScore[]; degraded?: boolean; reason?: string;
  } {
    const store = this.readStore();
    const nowMs = typeof opts.now === "string" ? Date.parse(opts.now) : Date.now();
    const safeNow = Number.isFinite(nowMs) ? nowMs : Date.now();
    const scores: AttestationScore[] = Object.keys(store.outcomes).map((key) => {
      const sep = key.indexOf("|");
      const slot = key.slice(0, sep);
      const domain = key.slice(sep + 1);
      const declaredList = (opts.declaredBySlot && opts.declaredBySlot[slot]) || opts.declaredDomains || [];
      const declared = Array.isArray(declaredList) && declaredList.includes(domain);
      return ZuluCapabilityAttestationEngine.buildAttestation(slot, domain, declared, store.outcomes[key], safeNow, opts);
    });
    scores.sort((a, b) => a.slot.localeCompare(b.slot) || a.domain.localeCompare(b.domain));
    const out = { ok: true, count: scores.length, scores } as {
      ok: boolean; count: number; scores: AttestationScore[]; degraded?: boolean; reason?: string;
    };
    if (store.readOnly) { out.degraded = true; out.reason = store.reason; }
    return out;
  }

  /** Convenience: the advisory multiplicative modifier ZuluTaskAuction applies to domain_match. */
  bidModifierFor(slot: string, domain: string, opts: AttestOpts = {}): number {
    return this.attest(slot, domain, opts).bid_modifier;
  }

  // --------------------------------------------------------------------------
  // Storage layer -- clones ZuluTaskContinuityEngine (C2) + C5 discipline
  // --------------------------------------------------------------------------

  private readStore(): ReadStoreResult {
    if (!fs.existsSync(this.storePath)) return { schemaVersion: SCHEMA_VERSION, outcomes: {} };
    let raw: string;
    try {
      raw = fs.readFileSync(this.storePath, "utf8");
    } catch (e) {
      return { schemaVersion: SCHEMA_VERSION, outcomes: {}, readOnly: true, reason: `read failed: ${(e as NodeJS.ErrnoException)?.code || (e as Error)?.message}` };
    }
    if (raw.trim().length === 0) return { schemaVersion: SCHEMA_VERSION, outcomes: {} };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      this.rotateCorrupt();
      return { schemaVersion: SCHEMA_VERSION, outcomes: {}, readOnly: true, reason: `parse failed: ${(e as Error)?.message} -- corrupt file preserved` };
    }
    const asStore = parsed as Partial<StoreShape>;
    if (typeof parsed !== "object" || parsed === null || typeof asStore.outcomes !== "object" || asStore.outcomes === null) {
      return { schemaVersion: SCHEMA_VERSION, outcomes: {}, readOnly: true, reason: "schema-shape failure: missing outcomes map" };
    }
    if (asStore.schemaVersion !== SCHEMA_VERSION) {
      return { schemaVersion: SCHEMA_VERSION, outcomes: {}, readOnly: true, reason: `schema-version mismatch: file=${asStore.schemaVersion} engine=${SCHEMA_VERSION} (peer may be newer; refusing to clobber)` };
    }
    // Drop malformed rows rather than fail the whole read.
    const clean: Record<string, OutcomeRow[]> = {};
    for (const [key, rows] of Object.entries(asStore.outcomes as Record<string, unknown>)) {
      if (!Array.isArray(rows)) continue;
      const valid = rows.filter((r) => this.isValidRow(r)) as OutcomeRow[];
      if (valid.length) clean[key] = valid;
    }
    return { schemaVersion: SCHEMA_VERSION, outcomes: clean };
  }

  private writeStore(store: StoreShape): void {
    if ((store as ReadStoreResult).readOnly) {
      throw new Error(`ZuluCapabilityAttestation: refusing to write read-only store: ${(store as ReadStoreResult).reason || "(unspecified)"}`);
    }
    const dir = path.dirname(this.storePath);
    fs.mkdirSync(dir, { recursive: true });
    const payload = JSON.stringify({ schemaVersion: SCHEMA_VERSION, outcomes: store.outcomes }, null, 2);
    const tmp = `${this.storePath}.tmp-${this.pid}-${Date.now()}`;
    fs.writeFileSync(tmp, payload, "utf8");
    let lastErr: NodeJS.ErrnoException | null = null;
    for (let attempt = 0; attempt < ATOMIC_RENAME_RETRIES; attempt++) {
      try {
        fs.renameSync(tmp, this.storePath);
        return;
      } catch (e) {
        lastErr = e as NodeJS.ErrnoException;
        if (lastErr.code !== "EBUSY" && lastErr.code !== "EPERM" && lastErr.code !== "EACCES") break;
        this.sleep(RENAME_RETRY_MS);
      }
    }
    try { fs.unlinkSync(tmp); } catch { /* best-effort tmp cleanup */ }
    throw new Error(`ZuluCapabilityAttestation: atomic write failed after ${ATOMIC_RENAME_RETRIES} retries: ${lastErr?.message || "unknown"}`);
  }

  private rotateCorrupt(): void {
    const corruptPath = `${this.storePath}.corrupt-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    try {
      fs.renameSync(this.storePath, corruptPath);
    } catch {
      /* best-effort evidence preservation */
    }
  }

  private isValidRow(row: unknown): boolean {
    if (typeof row !== "object" || row === null) return false;
    const r = row as Partial<OutcomeRow>;
    return typeof r.success === "boolean" && typeof r.at === "string";
  }

  private sleep(ms: number): void {
    // Synchronous sleep without a busy-loop (Atomics.wait on a throwaway buffer).
    try {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    } catch {
      const end = Date.now() + ms;
      while (Date.now() < end) { /* spin fallback */ }
    }
  }
}

export { ZuluCapabilityAttestationEngine };
export const zuluCapabilityAttestationEngine = ZuluCapabilityAttestationEngine.getInstance();
