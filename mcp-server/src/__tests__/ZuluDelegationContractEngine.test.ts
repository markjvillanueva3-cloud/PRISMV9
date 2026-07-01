/**
 * ZuluDelegationContractEngine (C4) tests -- pure decision core + durable store.
 *
 * Pure core (evaluateDelegation / composeGatedAuthority): no IO, fully
 * deterministic with an injected `nowMs`. Durable store: hermetic via
 * __forTests(tmpPath) + an injected `now` for deadline math; each test gets a
 * unique tmp store and cleans it up.
 */
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  ZuluDelegationContractEngine,
  ZULU_DELEGATION_ORCHESTRATOR_ROLES,
  DELEGATION_OPERATIONS,
  type DelegationContract,
  type GovernorVerdictLike,
} from "../engines/ZuluDelegationContractEngine.js";
import { ORCHESTRATOR_ROLES as GOVERNOR_ORCHESTRATOR_ROLES } from "../engines/ZuluFleetGovernorEngine.js";

// ---- fixtures ----------------------------------------------------------------

const NOW = Date.parse("2026-06-15T12:00:00.000Z");
const FUTURE = "2026-06-15T13:00:00.000Z"; // +1h
const PAST = "2026-06-15T11:00:00.000Z"; // -1h

function contract(over: Partial<DelegationContract> = {}): DelegationContract {
  return {
    id: over.id ?? "dc-test-1",
    grantee_slot: over.grantee_slot ?? "alpha",
    operations: over.operations ?? ["assign", "veto"],
    galaxy_scope: over.galaxy_scope ?? "mill",
    deadline_utc: over.deadline_utc ?? FUTURE,
    token_cap: over.token_cap ?? null,
    tokens_used: over.tokens_used ?? 0,
    failure_semantics: "fail-closed",
    granted_by_slot: over.granted_by_slot ?? "zulu",
    granted_by_role: over.granted_by_role ?? "zulu-orchestrator",
    granted_at_utc: over.granted_at_utc ?? "2026-06-15T11:30:00.000Z",
    revoked: over.revoked ?? false,
    revoked_at_utc: over.revoked_at_utc ?? null,
  };
}

const tmpStores: string[] = [];
function tmpEngine(): ZuluDelegationContractEngine {
  const p = path.join(os.tmpdir(), `zulu-deleg-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  tmpStores.push(p);
  return ZuluDelegationContractEngine.__forTests(p);
}
afterEach(() => {
  for (const p of tmpStores.splice(0)) {
    try { fs.rmSync(p, { force: true }); } catch { /* best-effort */ }
    // also remove any rotated corrupt sibling
    try {
      const dir = path.dirname(p);
      for (const f of fs.readdirSync(dir)) {
        if (f.startsWith(path.basename(p) + ".corrupt-") || f.startsWith(path.basename(p) + ".tmp-")) {
          fs.rmSync(path.join(dir, f), { force: true });
        }
      }
    } catch { /* best-effort */ }
  }
});

const E = ZuluDelegationContractEngine;

// ---- PURE: evaluateDelegation ------------------------------------------------

describe("evaluateDelegation (pure)", () => {
  it("no matching contract -> no-contract (falls through to governor)", () => {
    expect(E.evaluateDelegation([], { grantee_slot: "alpha", operation: "assign", galaxy: "mill" }, NOW).decision).toBe("no-contract");
    // grantee mismatch
    expect(E.evaluateDelegation([contract({ grantee_slot: "bravo" })], { grantee_slot: "alpha", operation: "assign", galaxy: "mill" }, NOW).decision).toBe("no-contract");
    // operation not in contract
    expect(E.evaluateDelegation([contract({ operations: ["assign"] })], { grantee_slot: "alpha", operation: "veto", galaxy: "mill" }, NOW).decision).toBe("no-contract");
    // galaxy mismatch
    expect(E.evaluateDelegation([contract({ galaxy_scope: "lathe" })], { grantee_slot: "alpha", operation: "assign", galaxy: "mill" }, NOW).decision).toBe("no-contract");
  });

  it("active contract -> within-contract with contract_id", () => {
    const v = E.evaluateDelegation([contract({ id: "dc-A" })], { grantee_slot: "alpha", operation: "assign", galaxy: "mill" }, NOW);
    expect(v.decision).toBe("within-contract");
    expect(v.contract_id).toBe("dc-A");
    expect(v.matched_count).toBe(1);
  });

  it("galaxy_scope '*' matches any galaxy", () => {
    const c = [contract({ galaxy_scope: "*" })];
    expect(E.evaluateDelegation(c, { grantee_slot: "alpha", operation: "assign", galaxy: "wedm" }, NOW).decision).toBe("within-contract");
    expect(E.evaluateDelegation(c, { grantee_slot: "alpha", operation: "assign", galaxy: "quoting" }, NOW).decision).toBe("within-contract");
  });

  it("expired contract (past deadline) -> denied:expired", () => {
    const v = E.evaluateDelegation([contract({ deadline_utc: PAST })], { grantee_slot: "alpha", operation: "assign", galaxy: "mill" }, NOW);
    expect(v.decision).toBe("denied");
    expect(v.reason).toContain("expired");
  });

  it("malformed deadline -> treated as expired (fail-safe, never grants)", () => {
    const v = E.evaluateDelegation([contract({ deadline_utc: "not-a-date" as unknown as string })], { grantee_slot: "alpha", operation: "assign", galaxy: "mill" }, NOW);
    expect(v.decision).toBe("denied");
    expect(v.reason).toContain("expired");
  });

  it("revoked contract -> denied:revoked", () => {
    const v = E.evaluateDelegation([contract({ revoked: true, revoked_at_utc: PAST })], { grantee_slot: "alpha", operation: "assign", galaxy: "mill" }, NOW);
    expect(v.decision).toBe("denied");
    expect(v.reason).toContain("revoked");
  });

  it("over token-cap (tokens_used + pending > cap) -> denied:over-token-cap", () => {
    const c = [contract({ token_cap: 1000, tokens_used: 900 })];
    expect(E.evaluateDelegation(c, { grantee_slot: "alpha", operation: "assign", galaxy: "mill", tokens_pending: 50 }, NOW).decision).toBe("within-contract");
    const v = E.evaluateDelegation(c, { grantee_slot: "alpha", operation: "assign", galaxy: "mill", tokens_pending: 200 }, NOW);
    expect(v.decision).toBe("denied");
    expect(v.reason).toContain("over-token-cap");
  });

  it("token_cap=null -> unbounded tokens (never over-cap)", () => {
    const v = E.evaluateDelegation([contract({ token_cap: null, tokens_used: 999999 })], { grantee_slot: "alpha", operation: "assign", galaxy: "mill", tokens_pending: 999999 }, NOW);
    expect(v.decision).toBe("within-contract");
  });

  it("fail-safe: malformed tokens_pending (Infinity/NaN/negative) DENIES under a finite cap", () => {
    const capped = [contract({ token_cap: 1000, tokens_used: 0 })];
    // Infinity pending -> over any finite cap -> denied
    expect(E.evaluateDelegation(capped, { grantee_slot: "alpha", operation: "assign", galaxy: "mill", tokens_pending: Infinity }, NOW).decision).toBe("denied");
    // negative pending -> max-pessimistic -> denied (a negative spend is malformed)
    expect(E.evaluateDelegation(capped, { grantee_slot: "alpha", operation: "assign", galaxy: "mill", tokens_pending: -5 }, NOW).decision).toBe("denied");
    // but with NO cap (null), malformed pending cannot push over -> within-contract
    expect(E.evaluateDelegation([contract({ token_cap: null })], { grantee_slot: "alpha", operation: "assign", galaxy: "mill", tokens_pending: Infinity }, NOW).decision).toBe("within-contract");
  });

  it("multiple matching: an ACTIVE one wins over expired/revoked siblings", () => {
    const cs = [
      contract({ id: "dc-old", deadline_utc: PAST }),
      contract({ id: "dc-revoked", revoked: true }),
      contract({ id: "dc-live", deadline_utc: FUTURE }),
    ];
    const v = E.evaluateDelegation(cs, { grantee_slot: "alpha", operation: "assign", galaxy: "mill" }, NOW);
    expect(v.decision).toBe("within-contract");
    expect(v.contract_id).toBe("dc-live");
    expect(v.matched_count).toBe(3);
  });

  it("adversarial: null/garbage inputs never throw -> no-contract", () => {
    expect(() => E.evaluateDelegation(null as unknown as DelegationContract[], { grantee_slot: "", operation: "assign", galaxy: "" }, NOW)).not.toThrow();
    expect(E.evaluateDelegation(null as unknown as DelegationContract[], { grantee_slot: "", operation: "assign", galaxy: "" }, NOW).decision).toBe("no-contract");
    expect(E.evaluateDelegation([contract()], { grantee_slot: "alpha", operation: "assign", galaxy: "mill", tokens_pending: NaN }, NOW).decision).toBe("within-contract");
  });
});

// ---- PURE: composeGatedAuthority (narrows-only) ------------------------------

describe("composeGatedAuthority (pure, narrows-only)", () => {
  const allow: GovernorVerdictLike = { authorized: true, reason: "orchestrator-role:zulu-orchestrator" };
  const deny: GovernorVerdictLike = { authorized: false, reason: "domain-mismatch:mill" };

  it("delegation DENIED -> authorized:false, governor NOT consulted (even if it would allow)", () => {
    const out = E.composeGatedAuthority({ decision: "denied", reason: "no-active-contract:expired", matched_count: 1 }, allow);
    expect(out.authorized).toBe(false);
    expect(out.gate).toBe("delegation");
    expect(out.governor).toBeNull();
    expect(out.reason).toContain("delegation-denied");
  });

  it("within-contract + governor ALLOW -> authorized:true (governor is the ceiling)", () => {
    const out = E.composeGatedAuthority({ decision: "within-contract", reason: "active-contract", contract_id: "dc-x", matched_count: 1 }, allow);
    expect(out.authorized).toBe(true);
    expect(out.gate).toBe("governor");
  });

  it("no-contract + governor ALLOW -> authorized:true (base authority unchanged)", () => {
    const out = E.composeGatedAuthority({ decision: "no-contract", reason: "no-matching-contract", matched_count: 0 }, allow);
    expect(out.authorized).toBe(true);
  });

  it("within-contract + governor DENY -> authorized:false (NEVER widens)", () => {
    const out = E.composeGatedAuthority({ decision: "within-contract", reason: "active-contract", contract_id: "dc-x", matched_count: 1 }, deny);
    expect(out.authorized).toBe(false);
    expect(out.gate).toBe("governor");
  });

  it("non-deny delegation + missing governor verdict -> fail-closed deny", () => {
    expect(E.composeGatedAuthority({ decision: "no-contract", reason: "x", matched_count: 0 }, null).authorized).toBe(false);
    expect(E.composeGatedAuthority({ decision: "within-contract", reason: "x", matched_count: 1 }, { foo: 1 } as unknown as GovernorVerdictLike).authorized).toBe(false);
  });
});

// ---- DURABLE: grant / revoke / check / status / recordUsage ------------------

describe("grant (durable, orchestrator-only)", () => {
  it("orchestrator grants -> ok, persisted, queryable via status", () => {
    const eng = tmpEngine();
    const r = eng.grant(
      { grantee_slot: "alpha", operations: ["assign"], galaxy_scope: "mill", deadline_utc: FUTURE, token_cap: 50000, granted_by_slot: "zulu", granted_by_role: "zulu-orchestrator" },
      { now: "2026-06-15T11:30:00.000Z" },
    );
    expect(r.ok).toBe(true);
    expect(r.contract?.grantee_slot).toBe("alpha");
    expect(r.contract?.tokens_used).toBe(0);
    expect(r.contract?.revoked).toBe(false);
    const st = eng.status({ grantee_slot: "alpha" }, "2026-06-15T12:00:00.000Z");
    expect(st.count).toBe(1);
    expect(st.contracts[0].status).toBe("active");
  });

  it("REJECTS a non-orchestrator granter (worker cannot grant itself authority)", () => {
    const eng = tmpEngine();
    const r = eng.grant(
      { grantee_slot: "alpha", operations: ["assign"], galaxy_scope: "mill", deadline_utc: FUTURE, granted_by_slot: "alpha", granted_by_role: "mill-specialist" },
      { now: "2026-06-15T11:30:00.000Z" },
    );
    expect(r.ok).toBe(false);
    expect(r.error).toContain("granter-not-orchestrator");
  });

  it("REJECTS a past deadline", () => {
    const eng = tmpEngine();
    const r = eng.grant(
      { grantee_slot: "alpha", operations: ["assign"], galaxy_scope: "mill", deadline_utc: PAST, granted_by_slot: "zulu", granted_by_role: "zulu-orchestrator" },
      { now: "2026-06-15T11:30:00.000Z" },
    );
    expect(r.ok).toBe(false);
    expect(r.error).toContain("future");
  });

  it("REJECTS malformed input (bad slot, empty operations) without throwing", () => {
    const eng = tmpEngine();
    expect(eng.grant({ grantee_slot: "bad slot!", operations: ["assign"], galaxy_scope: "mill", deadline_utc: FUTURE, granted_by_slot: "zulu", granted_by_role: "zulu-orchestrator" }).ok).toBe(false);
    expect(eng.grant({ grantee_slot: "alpha", operations: [] as never, galaxy_scope: "mill", deadline_utc: FUTURE, granted_by_slot: "zulu", granted_by_role: "zulu-orchestrator" }).ok).toBe(false);
  });
});

describe("revoke + check round-trip (durable)", () => {
  it("grant -> check within-contract -> revoke -> check denied:revoked", () => {
    const eng = tmpEngine();
    const g = eng.grant(
      { grantee_slot: "bravo", operations: ["assign", "veto"], galaxy_scope: "wedm", deadline_utc: FUTURE, granted_by_slot: "zulu", granted_by_role: "fleet-orchestrator" },
      { now: "2026-06-15T11:30:00.000Z" },
    );
    expect(g.ok).toBe(true);
    const id = g.contract!.id;
    expect(eng.check({ grantee_slot: "bravo", operation: "veto", galaxy: "wedm" }, "2026-06-15T12:00:00.000Z").decision).toBe("within-contract");
    const rv = eng.revoke(id, "zulu-orchestrator", { now: "2026-06-15T12:05:00.000Z" });
    expect(rv.ok).toBe(true);
    expect(rv.contract?.revoked).toBe(true);
    const after = eng.check({ grantee_slot: "bravo", operation: "veto", galaxy: "wedm" }, "2026-06-15T12:10:00.000Z");
    expect(after.decision).toBe("denied");
    expect(after.reason).toContain("revoked");
  });

  it("check denies once the deadline passes (expiry over time)", () => {
    const eng = tmpEngine();
    eng.grant(
      { grantee_slot: "charlie", operations: ["assign"], galaxy_scope: "quoting", deadline_utc: "2026-06-15T12:30:00.000Z", granted_by_slot: "zulu", granted_by_role: "zulu-orchestrator" },
      { now: "2026-06-15T11:30:00.000Z" },
    );
    expect(eng.check({ grantee_slot: "charlie", operation: "assign", galaxy: "quoting" }, "2026-06-15T12:00:00.000Z").decision).toBe("within-contract");
    expect(eng.check({ grantee_slot: "charlie", operation: "assign", galaxy: "quoting" }, "2026-06-15T13:00:00.000Z").decision).toBe("denied");
  });

  it("revoke REJECTS a non-orchestrator + handles not-found", () => {
    const eng = tmpEngine();
    expect(eng.revoke("dc-x", "mill-specialist").ok).toBe(false);
    expect(eng.revoke("dc-nonexistent", "zulu-orchestrator").error).toContain("contract-not-found");
  });
});

describe("recordUsage drives the token cap (durable)", () => {
  it("usage accumulation pushes check from within-contract to denied:over-token-cap", () => {
    const eng = tmpEngine();
    const g = eng.grant(
      { grantee_slot: "delta", operations: ["assign"], galaxy_scope: "cad", deadline_utc: FUTURE, token_cap: 1000, granted_by_slot: "zulu", granted_by_role: "zulu-orchestrator" },
      { now: "2026-06-15T11:30:00.000Z" },
    );
    const id = g.contract!.id;
    expect(eng.check({ grantee_slot: "delta", operation: "assign", galaxy: "cad" }, "2026-06-15T12:00:00.000Z").decision).toBe("within-contract");
    expect(eng.recordUsage(id, 900)).toBe(900);
    // 900 used + 200 pending = 1100 > 1000
    const v = eng.check({ grantee_slot: "delta", operation: "assign", galaxy: "cad", tokens_pending: 200 } as never, "2026-06-15T12:00:00.000Z");
    expect(v.decision).toBe("denied");
    expect(v.reason).toContain("over-token-cap");
    expect(eng.recordUsage("missing-id", 10)).toBe(-1);
  });
});

// ---- FAIL-CLOSED + safety invariants -----------------------------------------

describe("fail-closed store + safety invariants", () => {
  // readStore quarantines a corrupt file via rotateCorrupt() on the FIRST read
  // (clones C2 evidence-preservation), so corruption is a one-shot observation:
  // the first reader rotates it + sees readOnly; subsequent reads see a fresh
  // empty store. Each assertion below therefore uses its OWN fresh corrupt file.
  function freshCorrupt(): string {
    const p = path.join(os.tmpdir(), `zulu-deleg-corrupt-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
    tmpStores.push(p);
    fs.writeFileSync(p, "{ this is not json", "utf8");
    return p;
  }

  it("corrupt store: a mutation THROWS (fail-loud, never silently clobbers)", () => {
    const eng = ZuluDelegationContractEngine.__forTests(freshCorrupt());
    // inject `now` so the valid-future-deadline check passes and the call reaches
    // the corrupt-store readOnly throw, not the deadline guard.
    expect(() => eng.grant(
      { grantee_slot: "alpha", operations: ["assign"], galaxy_scope: "mill", deadline_utc: FUTURE, granted_by_slot: "zulu", granted_by_role: "zulu-orchestrator" },
      { now: "2026-06-15T11:30:00.000Z" },
    )).toThrow(/read-only store/);
  });

  it("corrupt store: status() (first read) surfaces readOnly + reason", () => {
    const eng = ZuluDelegationContractEngine.__forTests(freshCorrupt());
    const st = eng.status();
    expect(st.readOnly).toBe(true);
    expect(st.reason).toContain("parse failed");
  });

  it("corrupt store: check() degrades to no-contract (safe narrowing fallback)", () => {
    const eng = ZuluDelegationContractEngine.__forTests(freshCorrupt());
    expect(eng.check({ grantee_slot: "alpha", operation: "assign", galaxy: "mill" }).decision).toBe("no-contract");
  });

  it("forward-compat schema version: mutation refuses (fail-closed)", () => {
    const p = path.join(os.tmpdir(), `zulu-deleg-sv-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
    tmpStores.push(p);
    fs.writeFileSync(p, JSON.stringify({ schemaVersion: 999, contracts: {} }), "utf8");
    const eng = ZuluDelegationContractEngine.__forTests(p);
    expect(() => eng.revoke("dc-x", "zulu-orchestrator")).toThrow(/read-only store/);
    expect(eng.status().readOnly).toBe(true);
  });

  it("ORCHESTRATOR_ROLES is the SAME single source of truth as the governor's (no drift possible)", () => {
    // The delegation engine now imports + re-exports the governor's ORCHESTRATOR_ROLES,
    // so the two are the same object -> a worker role can never be wrongly grantable
    // via a drifted copy. (Reference identity is the strongest parity guarantee.)
    expect(ZULU_DELEGATION_ORCHESTRATOR_ROLES).toBe(GOVERNOR_ORCHESTRATOR_ROLES);
    // Value-pin for documentation / regression on the governor's own set.
    expect([...ZULU_DELEGATION_ORCHESTRATOR_ROLES].sort()).toEqual(
      ["fleet-orchestrator", "generalist", "hermes-router", "zulu-orchestrator"].sort(),
    );
  });

  it("operations enum mirrors the governor's operation set", () => {
    expect([...DELEGATION_OPERATIONS].sort()).toEqual(
      ["adopt-doctrine", "assign", "bus-send", "escalate", "promote-refuse", "veto"].sort(),
    );
  });
});
