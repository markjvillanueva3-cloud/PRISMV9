/**
 * ZuluDelegationContractEngine -- C4 (ZULU fleet, HZD-NEW-03).
 *
 * Time/token/galaxy-bounded authority DELEGATION contracts. The gap this fills:
 * ZuluFleetGovernorEngine (HZD-02) checks authority BINARY -- a slot's soul
 * (hermes_role / domain_filter / refuse_list) either clears an operation or it
 * doesn't, forever. It has no notion of a *bounded* delegation: "slot alpha may
 * perform assign/veto on mill-galaxy tasks for 30 minutes or 50K tokens,
 * whichever comes first." This engine adds that bound as a typed contract and a
 * PRE-GATE consulted before the governor's authority check.
 *
 * SAFETY -- the gate is STRICTLY NARROWING (never widening):
 *   - composeGatedAuthority() runs the delegation check FIRST; the governor runs
 *     AFTER. A delegation verdict can only turn the governor's ALLOW into a DENY
 *     (when a matching contract is expired / revoked / over token-cap). It can
 *     NEVER turn a governor DENY into an ALLOW. A "within-contract" verdict does
 *     NOT grant authority on its own -- the governor remains the authority
 *     ceiling. (Widening delegation -- letting a slot do what its soul forbids --
 *     is the dangerous direction this unit deliberately does NOT implement; the
 *     2025 A2A / delegation-contract literature names bounded scope, not scope
 *     expansion, as the scope-creep-prevention mechanism.)
 *   - FAIL-CLOSED: a matching-but-expired/revoked/over-cap contract denies
 *     immediately. A corrupt store falls back to "no contracts" (governor base
 *     authority) -- safe because delegations only narrow, so losing them cannot
 *     accidentally widen authority. The corruption is never silent (R12): a
 *     mutation (grant/revoke/recordUsage) THROWS on a read-only store, status()
 *     returns {readOnly,reason}, and the corrupt file is preserved as
 *     `.corrupt-<iso>` for inspection.
 *   - Only ORCHESTRATOR_ROLES may grant or revoke. A worker slot cannot grant
 *     itself authority (grant() rejects a non-orchestrator granter).
 *
 * Durability mirrors ZuluTaskContinuityEngine (C2): one schemaVersion-tagged
 * JSON store, atomic tmp+rename write, fail-closed-refuse-write on corrupt /
 * forward-compat schema, store path overridable for hermetic tests.
 *
 * Pure-core (heavily tested, no IO): evaluateDelegation() + composeGatedAuthority().
 * The durable instance methods (grant/revoke/status/check/recordUsage) wrap them.
 *
 * @module engines/ZuluDelegationContractEngine
 * @unit ZULU/C4-DELEGATION-CONTRACT
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";
import { z } from "zod";
import { ORCHESTRATOR_ROLES } from "./ZuluFleetGovernorEngine.js";

// ============================================================================
// Constants
// ============================================================================

const SCHEMA_VERSION = 1;
const DEFAULT_STORE_PATH = "H:/prism/mcp-server/data/state/zulu-delegation-contracts.json";
const ATOMIC_RENAME_RETRIES = 5;
const RENAME_RETRY_MS = 25;
const SLOT_RE = /^[a-z][a-z0-9-]{1,31}$/i;
/** Galaxy scope: a galaxy slug, or "*" meaning all galaxies. */
const GALAXY_SCOPE_RE = /^(\*|[a-z][a-z0-9-]{1,63})$/i;
const PREVIEW_LEN = 60;

// Roles permitted to GRANT/REVOKE a delegation are imported from
// ZuluFleetGovernorEngine (ORCHESTRATOR_ROLES) as the single source of truth -- a
// worker slot must never be able to grant itself authority, and a duplicated set
// could silently drift in the dangerous direction.

/** Operations a contract may scope -- mirrors ZuluFleetGovernorEngine's operation enum. */
const DELEGATION_OPERATIONS = [
  "assign",
  "veto",
  "promote-refuse",
  "adopt-doctrine",
  "escalate",
  "bus-send",
] as const;
export type DelegationOperation = (typeof DELEGATION_OPERATIONS)[number];

// ============================================================================
// Schemas + types (exported for dispatcher + tests)
// ============================================================================

/** A single durable delegation contract. */
export const DelegationContractSchema = z.object({
  id: z.string().min(1),
  grantee_slot: z.string().regex(SLOT_RE),
  operations: z.array(z.enum(DELEGATION_OPERATIONS)).min(1),
  galaxy_scope: z.string().regex(GALAXY_SCOPE_RE),
  deadline_utc: z.string().datetime(),
  token_cap: z.number().int().positive().nullable(),
  tokens_used: z.number().int().nonnegative(),
  failure_semantics: z.literal("fail-closed"),
  granted_by_slot: z.string().min(1),
  granted_by_role: z.string().min(1),
  granted_at_utc: z.string().datetime(),
  revoked: z.boolean(),
  revoked_at_utc: z.string().datetime().nullable(),
});
export type DelegationContract = z.infer<typeof DelegationContractSchema>;

/** Input to grant() -- the engine fills id/tokens_used/granted_at/revoked. */
export const GrantInputSchema = z.object({
  grantee_slot: z.string().regex(SLOT_RE),
  operations: z.array(z.enum(DELEGATION_OPERATIONS)).min(1),
  galaxy_scope: z.string().regex(GALAXY_SCOPE_RE),
  deadline_utc: z.string().datetime(),
  token_cap: z.number().int().positive().nullable().optional(),
  granted_by_slot: z.string().min(1),
  granted_by_role: z.string().min(1),
});
export type GrantInput = z.infer<typeof GrantInputSchema>;

export interface DelegationCheckRequest {
  grantee_slot: string;
  operation: DelegationOperation;
  galaxy: string;
  /** Tokens this action is about to spend (added to tokens_used vs cap). Default 0. */
  tokens_pending?: number;
}

export type DelegationDecision = "no-contract" | "within-contract" | "denied";

export interface DelegationVerdict {
  decision: DelegationDecision;
  reason: string;
  contract_id?: string;
  matched_count: number;
}

export interface GrantResult {
  ok: boolean;
  contract?: DelegationContract;
  error?: string;
}

export interface RevokeResult {
  ok: boolean;
  contract?: DelegationContract;
  error?: string;
}

export interface ComposedAuthority {
  authorized: boolean;
  gate: "delegation" | "governor";
  reason: string;
  delegation: DelegationVerdict;
  governor: GovernorVerdictLike | null;
}

/**
 * Minimal shape of ZuluFleetGovernorEngine's AuthorityVerdict -- just the two fields
 * composeGatedAuthority reads. Deliberately NO index signature: the governor's richer
 * AuthorityVerdict (with optional matched_refuse/matched_domain/hermes_role) is
 * structurally assignable to this, while an index signature would REJECT it (TS2345).
 * Kept structural (not a direct import) to avoid coupling the engine to the governor's
 * exact return type.
 */
export interface GovernorVerdictLike {
  authorized: boolean;
  reason: string;
}

/** Internal on-disk shape. */
interface StoreShape {
  schemaVersion: number;
  contracts: Record<string, DelegationContract>;
}
interface ReadStoreResult extends StoreShape {
  readOnly?: boolean;
  reason?: string;
}

// ============================================================================
// Engine
// ============================================================================

class ZuluDelegationContractEngine {
  private static instance: ZuluDelegationContractEngine;
  private readonly storePath: string;
  private readonly host: string;
  private readonly pid: number;

  private constructor(storePath?: string) {
    this.storePath = storePath || process.env.PRISM_ZULU_DELEGATION_PATH || DEFAULT_STORE_PATH;
    this.host = os.hostname();
    this.pid = process.pid;
  }

  static getInstance(): ZuluDelegationContractEngine {
    if (!ZuluDelegationContractEngine.instance) {
      ZuluDelegationContractEngine.instance = new ZuluDelegationContractEngine();
    }
    return ZuluDelegationContractEngine.instance;
  }

  /** Isolated instance bound to a specific store path. Tests only. */
  static __forTests(storePath: string): ZuluDelegationContractEngine {
    return new ZuluDelegationContractEngine(storePath);
  }

  getStorePath(): string {
    return this.storePath;
  }

  // --------------------------------------------------------------------------
  // PURE CORE (no IO) -- the safety-critical decision logic
  // --------------------------------------------------------------------------

  /**
   * Decide whether a request is covered by an ACTIVE delegation contract. Pure.
   *
   * @param contracts All contracts (typically the full store).
   * @param req       {grantee_slot, operation, galaxy, tokens_pending?}.
   * @param nowMs     Current epoch ms (injected for hermetic tests).
   * @returns DelegationVerdict:
   *   - "no-contract"    -> no contract names this (grantee, operation, galaxy);
   *                         caller falls through to the governor (base authority).
   *   - "within-contract"-> at least one matching contract is active (not revoked,
   *                         not past deadline, token budget not exceeded).
   *   - "denied"         -> matching contract(s) exist but ALL are revoked / expired
   *                         / over token-cap -> FAIL-CLOSED deny.
   */
  static evaluateDelegation(
    contracts: readonly DelegationContract[],
    req: DelegationCheckRequest,
    nowMs: number,
  ): DelegationVerdict {
    const list = Array.isArray(contracts) ? contracts : [];
    const grantee = String(req?.grantee_slot ?? "");
    const operation = String(req?.operation ?? "");
    const galaxy = String(req?.galaxy ?? "");
    // Fail-safe token accounting: a MALFORMED tokens_pending (NaN / Infinity /
    // negative) becomes max-pessimistic (Infinity) so it DENIES under any finite
    // cap rather than silently reading as zero spend. Absent -> 0 (no pre-charge).
    let pending = 0;
    if (req?.tokens_pending !== undefined && req?.tokens_pending !== null) {
      const tp = Number(req.tokens_pending);
      pending = Number.isFinite(tp) && tp >= 0 ? tp : Infinity;
    }

    const matched = list.filter(
      (c) =>
        c &&
        c.grantee_slot === grantee &&
        Array.isArray(c.operations) &&
        c.operations.includes(operation as DelegationOperation) &&
        (c.galaxy_scope === "*" || c.galaxy_scope === galaxy),
    );

    if (matched.length === 0) {
      return { decision: "no-contract", reason: "no-matching-contract", matched_count: 0 };
    }

    // Reasons-why for the all-fail (denied) case.
    let sawRevoked = false;
    let sawExpired = false;
    let sawOverCap = false;

    for (const c of matched) {
      if (c.revoked) {
        sawRevoked = true;
        continue;
      }
      const deadlineMs = Date.parse(c.deadline_utc);
      // Unknown/invalid deadline -> treat as expired (fail-safe: never grant on a
      // malformed deadline).
      if (!Number.isFinite(deadlineMs) || deadlineMs <= nowMs) {
        sawExpired = true;
        continue;
      }
      if (c.token_cap !== null && c.token_cap !== undefined) {
        const used = Number.isFinite(c.tokens_used) ? c.tokens_used : 0;
        if (used + pending > c.token_cap) {
          sawOverCap = true;
          continue;
        }
      }
      // Active!
      return { decision: "within-contract", reason: "active-contract", contract_id: c.id, matched_count: matched.length };
    }

    // All matching contracts failed -> fail-closed deny, naming the dominant reason.
    const reasons: string[] = [];
    if (sawRevoked) reasons.push("revoked");
    if (sawExpired) reasons.push("expired");
    if (sawOverCap) reasons.push("over-token-cap");
    return {
      decision: "denied",
      reason: `no-active-contract:${reasons.join("+") || "unknown"}`,
      contract_id: matched[0]?.id,
      matched_count: matched.length,
    };
  }

  /**
   * Compose the delegation pre-gate with the governor verdict. Pure + NARROWS-ONLY.
   *
   * @param delegation The DelegationVerdict from evaluateDelegation().
   * @param governor   The governor's verdict (consulted only when delegation does
   *                   NOT deny). Pass null only when delegation already denied.
   * @returns ComposedAuthority. authorized=false whenever delegation denies
   *          (fail-closed) OR the governor denies. A "within-contract" /
   *          "no-contract" delegation defers entirely to the governor -- the gate
   *          can never widen authority.
   */
  static composeGatedAuthority(
    delegation: DelegationVerdict,
    governor: GovernorVerdictLike | null,
  ): ComposedAuthority {
    if (delegation.decision === "denied") {
      return {
        authorized: false,
        gate: "delegation",
        reason: `delegation-denied:${delegation.reason}`,
        delegation,
        governor: null,
      };
    }
    if (!governor || typeof governor.authorized !== "boolean") {
      // Defensive: no governor verdict supplied for a non-deny delegation -> deny
      // (fail-closed: never authorize without the governor ceiling).
      return {
        authorized: false,
        gate: "governor",
        reason: "governor-verdict-missing",
        delegation,
        governor: null,
      };
    }
    return {
      authorized: governor.authorized,
      gate: "governor",
      reason: governor.reason,
      delegation,
      governor,
    };
  }

  // --------------------------------------------------------------------------
  // Durable API (wraps the pure core)
  // --------------------------------------------------------------------------

  /**
   * Grant a delegation contract. ORCHESTRATOR-ONLY (granted_by_role must be in
   * ORCHESTRATOR_ROLES). Returns ok:false (never throws) on validation failure;
   * THROWS only on a read-only store (corrupt / forward-compat schema).
   */
  grant(input: GrantInput, opts: { id?: string; now?: string } = {}): GrantResult {
    const parsed = GrantInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: `invalid grant input: ${parsed.error.issues.map((i) => `${i.path.join(".")}:${i.message}`).join("; ")}` };
    }
    const g = parsed.data;
    if (!ORCHESTRATOR_ROLES.has(g.granted_by_role.toLowerCase())) {
      return { ok: false, error: `granter-not-orchestrator:${g.granted_by_role} (only ORCHESTRATOR_ROLES may grant a delegation)` };
    }
    const nowIso = this.resolveNow(opts.now);
    if (!nowIso) return { ok: false, error: `invalid now timestamp: ${this.preview(opts.now)}` };
    const deadlineMs = Date.parse(g.deadline_utc);
    if (!Number.isFinite(deadlineMs) || deadlineMs <= Date.parse(nowIso)) {
      return { ok: false, error: `deadline_utc must be in the future: ${this.preview(g.deadline_utc)}` };
    }

    const store = this.readStore();
    if (store.readOnly) {
      throw new Error(`ZuluDelegationContract: refusing to grant into read-only store: ${store.reason || "(unspecified)"}`);
    }

    const id = opts.id || this.newId();
    const contract: DelegationContract = {
      id,
      grantee_slot: g.grantee_slot,
      operations: g.operations,
      galaxy_scope: g.galaxy_scope,
      deadline_utc: new Date(deadlineMs).toISOString(),
      token_cap: g.token_cap ?? null,
      tokens_used: 0,
      failure_semantics: "fail-closed",
      granted_by_slot: g.granted_by_slot,
      granted_by_role: g.granted_by_role,
      granted_at_utc: nowIso,
      revoked: false,
      revoked_at_utc: null,
    };
    // Validate the assembled contract against the canonical schema before persist.
    const check = DelegationContractSchema.safeParse(contract);
    if (!check.success) {
      return { ok: false, error: `assembled contract failed schema: ${check.error.issues.map((i) => i.message).join("; ")}` };
    }
    store.contracts[id] = contract;
    this.writeStore(store);
    return { ok: true, contract };
  }

  /**
   * Revoke a contract by id. ORCHESTRATOR-ONLY. Idempotent (revoking an already
   * revoked contract returns ok:true with the existing record). THROWS on a
   * read-only store.
   */
  revoke(id: string, byRole: string, opts: { now?: string; bySlot?: string } = {}): RevokeResult {
    if (typeof id !== "string" || !id.trim()) return { ok: false, error: "invalid contract id" };
    if (typeof byRole !== "string" || !ORCHESTRATOR_ROLES.has(byRole.toLowerCase())) {
      return { ok: false, error: `revoker-not-orchestrator:${this.preview(byRole)} (only ORCHESTRATOR_ROLES may revoke)` };
    }
    const nowIso = this.resolveNow(opts.now);
    if (!nowIso) return { ok: false, error: `invalid now timestamp: ${this.preview(opts.now)}` };

    const store = this.readStore();
    if (store.readOnly) {
      throw new Error(`ZuluDelegationContract: refusing to revoke into read-only store: ${store.reason || "(unspecified)"}`);
    }
    const c = store.contracts[id.trim()];
    if (!c) return { ok: false, error: `contract-not-found:${id.trim()}` };
    if (c.revoked) return { ok: true, contract: c };
    c.revoked = true;
    c.revoked_at_utc = nowIso;
    store.contracts[id.trim()] = c;
    this.writeStore(store);
    return { ok: true, contract: c };
  }

  /**
   * Record token consumption against a contract (increments tokens_used). Used to
   * enforce the token cap over time. Returns the updated tokens_used, or -1 if the
   * contract is missing. THROWS on a read-only store.
   */
  recordUsage(id: string, tokens: number): number {
    if (typeof id !== "string" || !id.trim()) return -1;
    const delta = Number.isFinite(tokens) ? Math.max(0, Math.floor(tokens)) : 0;
    const store = this.readStore();
    if (store.readOnly) {
      throw new Error(`ZuluDelegationContract: refusing to record usage into read-only store: ${store.reason || "(unspecified)"}`);
    }
    const c = store.contracts[id.trim()];
    if (!c) return -1;
    c.tokens_used = (Number.isFinite(c.tokens_used) ? c.tokens_used : 0) + delta;
    store.contracts[id.trim()] = c;
    this.writeStore(store);
    return c.tokens_used;
  }

  /**
   * The durable pre-gate query: evaluate a request against the persisted contracts.
   * Reads the store (corrupt store -> empty contracts -> "no-contract", the safe
   * narrowing fallback; the corruption is surfaced via status().readOnly + the
   * rotated `.corrupt-<iso>` file, and any mutation throws). Never throws.
   */
  check(req: DelegationCheckRequest, now?: string): DelegationVerdict {
    const store = this.readStore();
    const nowMs = Date.parse(this.resolveNow(now) || new Date().toISOString());
    return ZuluDelegationContractEngine.evaluateDelegation(Object.values(store.contracts), req, nowMs);
  }

  /**
   * The durable contract list for the live wave-dispatch pre-gate (C4). Returns ALL
   * persisted contracts (active + expired + revoked) as raw DelegationContract[] --
   * the gate's pure evaluateDelegation re-derives liveness from its injected nowMs,
   * so a matching-but-expired/revoked contract correctly DENIES (fail-closed) rather
   * than vanishing into "no-contract". A corrupt / read-only store yields [] -- every
   * assignment then reads "no-contract" and the wave defers entirely to the governor
   * (the safe narrowing fallback; a broken delegation store can never silently grant
   * NOR silently deny). Never throws. Read-only state is surfaced separately via
   * status().readOnly. Distinct from check() (single-request) -- this hands the whole
   * set to ZuluWaveSchedulerEngine.governedNextWave for a per-assignment sweep.
   */
  allContracts(): DelegationContract[] {
    return Object.values(this.readStore().contracts);
  }

  /**
   * List contracts (optionally filtered by grantee_slot), annotated with live
   * active/expired/revoked status. Read-only; surfaces store readOnly state.
   */
  status(filter: { grantee_slot?: string } = {}, now?: string): {
    ok: boolean;
    count: number;
    contracts: Array<DelegationContract & { status: "active" | "expired" | "revoked" | "over-token-cap" }>;
    readOnly?: boolean;
    reason?: string;
  } {
    const store = this.readStore();
    const nowMs = Date.parse(this.resolveNow(now) || new Date().toISOString());
    const want = typeof filter.grantee_slot === "string" ? filter.grantee_slot : null;
    const rows = Object.values(store.contracts)
      .filter((c) => (want ? c.grantee_slot === want : true))
      .map((c) => ({ ...c, status: this.liveStatus(c, nowMs) }))
      .sort((a, b) => Date.parse(b.granted_at_utc) - Date.parse(a.granted_at_utc));
    const out = { ok: true, count: rows.length, contracts: rows } as ReturnType<ZuluDelegationContractEngine["status"]>;
    if (store.readOnly) {
      out.readOnly = true;
      out.reason = store.reason;
    }
    return out;
  }

  // Display-only status label for status(). Deny-leaning by design: reports
  // "over-token-cap" at used >= cap, whereas the authoritative gate
  // evaluateDelegation only denies once a NON-zero pending spend pushes used+pending
  // PAST the cap (strict >). A contract sitting exactly at cap thus shows
  // "over-token-cap" here while a 0-pending check still reads within-contract -- the
  // status label is intentionally the more cautious of the two (it never UNDER-reports
  // exhaustion). status() is never consulted by the gate, so this divergence is cosmetic.
  private liveStatus(c: DelegationContract, nowMs: number): "active" | "expired" | "revoked" | "over-token-cap" {
    if (c.revoked) return "revoked";
    const deadlineMs = Date.parse(c.deadline_utc);
    if (!Number.isFinite(deadlineMs) || deadlineMs <= nowMs) return "expired";
    if (c.token_cap !== null && c.token_cap !== undefined) {
      const used = Number.isFinite(c.tokens_used) ? c.tokens_used : 0;
      if (used >= c.token_cap) return "over-token-cap";
    }
    return "active";
  }

  // --------------------------------------------------------------------------
  // Storage layer -- clones ZuluTaskContinuityEngine (C2) discipline
  // --------------------------------------------------------------------------

  private readStore(): ReadStoreResult {
    if (!fs.existsSync(this.storePath)) {
      return { schemaVersion: SCHEMA_VERSION, contracts: {} };
    }
    let raw: string;
    try {
      raw = fs.readFileSync(this.storePath, "utf8");
    } catch (e) {
      return { schemaVersion: SCHEMA_VERSION, contracts: {}, readOnly: true, reason: `read failed: ${(e as NodeJS.ErrnoException)?.code || (e as Error)?.message}` };
    }
    if (raw.trim().length === 0) return { schemaVersion: SCHEMA_VERSION, contracts: {} };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      this.rotateCorrupt();
      return { schemaVersion: SCHEMA_VERSION, contracts: {}, readOnly: true, reason: `parse failed: ${(e as Error)?.message} -- corrupt file preserved` };
    }
    const asStore = parsed as Partial<StoreShape>;
    if (typeof parsed !== "object" || parsed === null || typeof asStore.contracts !== "object" || asStore.contracts === null) {
      return { schemaVersion: SCHEMA_VERSION, contracts: {}, readOnly: true, reason: "schema-shape failure: missing contracts map" };
    }
    if (asStore.schemaVersion !== SCHEMA_VERSION) {
      return {
        schemaVersion: SCHEMA_VERSION,
        contracts: {},
        readOnly: true,
        reason: `schema-version mismatch: file=${asStore.schemaVersion} engine=${SCHEMA_VERSION} (peer may be newer; refusing to clobber)`,
      };
    }
    // Drop malformed rows rather than fail the whole read.
    const clean: Record<string, DelegationContract> = {};
    for (const [key, row] of Object.entries(asStore.contracts as Record<string, unknown>)) {
      const v = DelegationContractSchema.safeParse(row);
      if (v.success) clean[key] = v.data;
    }
    return { schemaVersion: SCHEMA_VERSION, contracts: clean };
  }

  private writeStore(store: StoreShape): void {
    if ((store as ReadStoreResult).readOnly) {
      throw new Error(`ZuluDelegationContract: refusing to write read-only store: ${(store as ReadStoreResult).reason || "(unspecified)"}`);
    }
    const dir = path.dirname(this.storePath);
    fs.mkdirSync(dir, { recursive: true });
    const payload = JSON.stringify({ schemaVersion: SCHEMA_VERSION, contracts: store.contracts }, null, 2);
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
    throw new Error(`ZuluDelegationContract: atomic write failed after ${ATOMIC_RENAME_RETRIES} retries: ${lastErr?.message || "unknown"}`);
  }

  private rotateCorrupt(): void {
    const corruptPath = `${this.storePath}.corrupt-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    try {
      fs.renameSync(this.storePath, corruptPath);
    } catch {
      /* best-effort evidence preservation */
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private newId(): string {
    return `dc-${randomUUID()}`;
  }

  private resolveNow(now: unknown): string | null {
    if (now === undefined || now === null) return new Date().toISOString();
    if (typeof now !== "string") return null;
    const ms = Date.parse(now);
    if (!Number.isFinite(ms) || ms < 0) return null;
    return new Date(ms).toISOString();
  }

  private preview(v: unknown): string {
    try {
      const s = typeof v === "string" ? v : JSON.stringify(v);
      return (s ?? String(v)).slice(0, PREVIEW_LEN);
    } catch {
      return typeof v;
    }
  }

  private sleep(ms: number): void {
    const buf = new Int32Array(new SharedArrayBuffer(4));
    Atomics.wait(buf, 0, 0, Math.max(0, Math.floor(ms)));
  }
}

// ============================================================================
// Exports
// ============================================================================

export const zuluDelegationContractEngine = ZuluDelegationContractEngine.getInstance();
export {
  ZuluDelegationContractEngine,
  ORCHESTRATOR_ROLES as ZULU_DELEGATION_ORCHESTRATOR_ROLES,
  DELEGATION_OPERATIONS,
  SCHEMA_VERSION as ZULU_DELEGATION_SCHEMA_VERSION,
};
