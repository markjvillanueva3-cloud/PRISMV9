/**
 * ZuluSoulEvolutionAdvisorEngine (C8) tests -- advisory-only soul-amendment proposals.
 * Pure proposal/safety logic + the append-only durable ledger (hermetic tmp file).
 *
 * SAFETY is the load-bearing property here: the engine must NEVER produce a proposal that
 * touches refuse_list / safety coverage, and must NEVER auto-apply. These tests pin that.
 */
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ZuluSoulEvolutionAdvisorEngine } from "../engines/ZuluSoulEvolutionAdvisorEngine.js";
import type { AttestationScore } from "../engines/ZuluCapabilityAttestationEngine.js";
import type { SlotSoul } from "../engines/SoulFrontmatterReaderEngine.js";

const E = ZuluSoulEvolutionAdvisorEngine;
const NOW_ISO = "2026-06-15T12:00:00.000Z";

const tmp: string[] = [];
function tmpLedger(): string {
  const p = path.join(os.tmpdir(), `zulu-soul-prop-${process.pid}-${Math.random().toString(36).slice(2)}.jsonl`);
  tmp.push(p);
  return p;
}
afterEach(() => {
  for (const p of tmp.splice(0)) { try { fs.rmSync(p, { force: true }); } catch { /* best-effort */ } }
});

const score = (over: Partial<AttestationScore> = {}): AttestationScore => ({
  slot: "foxtrot",
  domain: "mill",
  declared_affinity: true,
  empirical_success_rate: 0.8,
  successes: 20,
  sample_n: 25,
  ci_lower: 0.61,
  ci_upper: 0.91,
  confidence: "moderate",
  bid_modifier: 1.05,
  over_claim: false,
  attested_at: NOW_ISO,
  ...over,
});

const soul = (over: Partial<SlotSoul> = {}): SlotSoul => ({
  slot: "foxtrot",
  role: "mill specialist",
  voice: "terse",
  tone: "neutral",
  refuse_list: [],
  hermes_role: "worker",
  domain_filter: "[mill]",
  body: "",
  ...over,
});

// ---- PURE: isSafeAmendment -----------------------------------------------------

describe("isSafeAmendment (pure -- the safety guard)", () => {
  it("a well-formed non-sensitive domain not in refuse_list is SAFE (null)", () => {
    expect(E.isSafeAmendment("mill", soul())).toBe(null);
    expect(E.isSafeAmendment("speed-feed", soul())).toBe(null);
  });
  it("REFUSES safety-sensitive domains (safety/scrutiny/refuse/compliance/gate/physics/security)", () => {
    for (const d of ["safety", "scrutiny", "compliance", "physics", "security", "safety-gate", "refuse-list"]) {
      expect(E.isSafeAmendment(d, soul())).toMatch(/safety-sensitive|malformed/);
    }
  });
  it("REFUSES a domain that collides with a refuse_list entry", () => {
    const r = E.isSafeAmendment("lathe", soul({ refuse_list: ["lathe-work-is-forbidden-here"] }));
    expect(r).toMatch(/refuse_list/);
  });
  it("REFUSES malformed domains", () => {
    expect(E.isSafeAmendment("has space", soul())).toMatch(/malformed/);
    expect(E.isSafeAmendment("", soul())).toMatch(/malformed/);
  });
});

// ---- PURE: proposeAmendments ---------------------------------------------------

describe("proposeAmendments (pure)", () => {
  it("declared + discredited (over_claim) -> remove_domain proposal with evidence", () => {
    const r = E.proposeAmendments("foxtrot", [
      score({ domain: "lathe", declared_affinity: true, over_claim: true, empirical_success_rate: 0.2, successes: 5, ci_lower: 0.09, ci_upper: 0.39, confidence: "moderate" }),
    ], soul(), { now: NOW_ISO });
    expect(r.proposals).toHaveLength(1);
    const p = r.proposals[0];
    expect(p.change_type).toBe("remove_domain");
    expect(p.domain).toBe("lathe");
    expect(p.target_field).toBe("domain_filter");
    expect(p.operator_approval_required).toBe(true);
    expect(p.auto_apply).toBe(false);
    expect(p.evidence.sample_n).toBe(25);
    expect(p.evidence.ci_lower).toBeCloseTo(0.09, 6);
    expect(p.rationale).toContain("20%"); // empirical rate surfaced
  });

  it("undeclared + strongly proven (ci_lower >= 0.7) -> add_domain proposal", () => {
    const r = E.proposeAmendments("kilo", [
      score({ slot: "kilo", domain: "cam", declared_affinity: false, over_claim: false, empirical_success_rate: 0.96, successes: 24, ci_lower: 0.80, ci_upper: 0.99, confidence: "high" }),
    ], soul({ slot: "kilo" }), { now: NOW_ISO });
    expect(r.proposals).toHaveLength(1);
    expect(r.proposals[0].change_type).toBe("add_domain");
    expect(r.proposals[0].domain).toBe("cam");
  });

  it("insufficient sample / confidence -> NO proposal (thin evidence never churns a soul)", () => {
    expect(E.proposeAmendments("foxtrot", [score({ over_claim: true, declared_affinity: true, confidence: "insufficient", sample_n: 5 })], soul(), { now: NOW_ISO }).proposals).toHaveLength(0);
    expect(E.proposeAmendments("foxtrot", [score({ over_claim: true, declared_affinity: true, confidence: "moderate", sample_n: 19 })], soul(), { now: NOW_ISO }).proposals).toHaveLength(0);
  });

  it("declared + competent (NOT over_claim) -> no proposal", () => {
    expect(E.proposeAmendments("foxtrot", [score({ declared_affinity: true, over_claim: false, ci_lower: 0.61 })], soul(), { now: NOW_ISO }).proposals).toHaveLength(0);
  });

  it("undeclared but only weakly proven (ci_lower < 0.7) -> no add proposal", () => {
    expect(E.proposeAmendments("foxtrot", [score({ declared_affinity: false, over_claim: false, ci_lower: 0.55, confidence: "moderate" })], soul(), { now: NOW_ISO }).proposals).toHaveLength(0);
  });

  it("SAFETY: a discredited safety-sensitive domain is REFUSED, never proposed", () => {
    const r = E.proposeAmendments("foxtrot", [
      score({ domain: "compliance", declared_affinity: true, over_claim: true, ci_lower: 0.1, confidence: "high" }),
    ], soul(), { now: NOW_ISO });
    expect(r.proposals).toHaveLength(0); // never emitted
    expect(r.refused).toHaveLength(1);
    expect(r.refused[0].domain).toBe("compliance");
    expect(r.refused[0].refused_reason).toMatch(/safety-sensitive/);
  });

  it("SAFETY: a domain colliding with refuse_list is REFUSED", () => {
    const r = E.proposeAmendments("foxtrot", [
      score({ domain: "edm", declared_affinity: false, over_claim: false, ci_lower: 0.85, confidence: "high" }),
    ], soul({ refuse_list: ["never-touch-edm-programs"] }), { now: NOW_ISO });
    expect(r.proposals).toHaveLength(0);
    expect(r.refused[0].refused_reason).toMatch(/refuse_list/);
  });

  it("only scores for the requested slot are considered", () => {
    const r = E.proposeAmendments("foxtrot", [
      score({ slot: "oscar", domain: "lathe", over_claim: true, declared_affinity: true, ci_lower: 0.1 }),
    ], soul(), { now: NOW_ISO });
    expect(r.proposals).toHaveLength(0); // oscar's score ignored for foxtrot
  });
});

// ---- PURE: renderForChat -------------------------------------------------------

describe("renderForChat (pure)", () => {
  it("empty -> 'no amendment proposals'", () => {
    expect(E.renderForChat([])).toBe("[soul-evolution] no amendment proposals.");
  });
  it("non-empty -> advisory header + the proposal line, marked never-auto-applied", () => {
    const r = E.proposeAmendments("foxtrot", [score({ domain: "lathe", over_claim: true, declared_affinity: true, ci_lower: 0.1 })], soul(), { now: NOW_ISO });
    const md = E.renderForChat(r.proposals);
    expect(md).toContain("operator approval required");
    expect(md).toContain("remove_domain");
    expect(md).toContain("lathe");
  });
});

// ---- DURABLE: append-only ledger (hermetic) -----------------------------------

describe("emit + listProposals (append-only ledger, hermetic)", () => {
  it("emit appends, listProposals reads back round-trip", () => {
    const eng = E.__forTests(tmpLedger());
    const r = E.proposeAmendments("foxtrot", [score({ domain: "lathe", over_claim: true, declared_affinity: true, ci_lower: 0.1 })], soul(), { now: NOW_ISO });
    expect(eng.emit(r.proposals, { now: NOW_ISO })).toEqual({ ok: true, written: 1 });
    const list = eng.listProposals();
    expect(list.count).toBe(1);
    expect(list.proposals[0].domain).toBe("lathe");
    expect(list.proposals[0].change_type).toBe("remove_domain");
    expect(list.proposals[0].emitted_at).toBe(NOW_ISO);
  });

  it("emit is APPEND-only -- a second emit adds, never overwrites", () => {
    const eng = E.__forTests(tmpLedger());
    const a = E.proposeAmendments("foxtrot", [score({ domain: "lathe", over_claim: true, declared_affinity: true, ci_lower: 0.1 })], soul(), { now: NOW_ISO });
    const b = E.proposeAmendments("kilo", [score({ slot: "kilo", domain: "cam", declared_affinity: false, over_claim: false, ci_lower: 0.85, confidence: "high" })], soul({ slot: "kilo" }), { now: NOW_ISO });
    eng.emit(a.proposals, { now: NOW_ISO });
    eng.emit(b.proposals, { now: NOW_ISO });
    expect(eng.listProposals().count).toBe(2);
    expect(eng.listProposals({ slot: "kilo" }).count).toBe(1); // slot filter
  });

  it("emit writes nothing for an empty proposal list", () => {
    const eng = E.__forTests(tmpLedger());
    expect(eng.emit([], { now: NOW_ISO })).toEqual({ ok: true, written: 0 });
    expect(eng.listProposals().count).toBe(0);
  });

  it("listProposals fail-soft: skips malformed JSONL lines, never throws", () => {
    const p = tmpLedger();
    const valid = { slot: "foxtrot", change_type: "remove_domain", target_field: "domain_filter", domain: "lathe", rationale: "x", evidence: {}, confidence: "moderate", operator_approval_required: true, auto_apply: false, proposed_at: NOW_ISO };
    fs.writeFileSync(p, `${JSON.stringify(valid)}\n{ not json\n\n`, "utf8");
    const eng = E.__forTests(p);
    expect(eng.listProposals().count).toBe(1); // the malformed + blank lines skipped
  });

  it("there is NO apply path: every proposal is operator_approval_required + never auto_apply", () => {
    const eng = E.__forTests(tmpLedger());
    const r = eng.proposeForSlot("foxtrot", {
      soul: soul(),
      scores: [score({ domain: "lathe", over_claim: true, declared_affinity: true, ci_lower: 0.1 })],
      now: NOW_ISO,
    });
    eng.emit(r.proposals, { now: NOW_ISO });
    for (const p of eng.listProposals().proposals) {
      expect(p.operator_approval_required).toBe(true);
      expect(p.auto_apply).toBe(false);
      expect(p.target_field).toBe("domain_filter"); // never refuse_list
    }
    // the engine exposes no apply/commit method
    expect((eng as unknown as Record<string, unknown>).apply).toBe(undefined);
    expect((eng as unknown as Record<string, unknown>).applyAmendment).toBe(undefined);
  });
});
