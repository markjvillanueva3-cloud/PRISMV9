/**
 * LatheTribalIntegrationEngine — companion test suite
 * ====================================================
 * Verifies the lathe tribal-knowledge → lathe AI bridge:
 *   - corpus sourcing (injected fake searchFn + a real-data E2E)
 *   - getAdjustment factor compounding, css/sfm ceilings, heuristic gating
 *   - checkFailureModes lookup + severity ordering
 *   - integrateWithLatheAI injection into all 4 lathe AI targets
 *   - getStatistics coverage counts
 *   - prism_turning dispatcher round-trip for all 5 wired actions
 *
 * @milestone FEATURE-GAP-AUDIT-MS0 (U-GAP-LATHE-TRIBAL-WIRE)
 */

import { describe, it, expect } from "vitest";
import {
  LatheTribalIntegrationEngine,
  latheTribalIntegrationEngine,
} from "../engines/LatheTribalIntegrationEngine.js";
import type { KnowledgeTip, KnowledgeSearchInput } from "../engines/TribalKnowledgeEngine.js";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

// ── Test fixtures ───────────────────────────────────────────────────────────

/** Build a minimal valid KnowledgeTip for fake-corpus tests. */
function makeTip(over: Partial<KnowledgeTip> & { id: string }): KnowledgeTip {
  return {
    id: over.id,
    title: over.title ?? "Lathe turning tip",
    body: over.body ?? "Use a sharp insert when turning on the lathe.",
    category: over.category ?? "tooling",
    tags: over.tags ?? ["lathe", "turning"],
    confidence: over.confidence ?? 80,
    source: over.source ?? "operator:test",
    created_at: over.created_at ?? "2026-01-01T00:00:00.000Z",
    usage_count: over.usage_count ?? 3,
    ...over,
  };
}

/** A fake corpus returning two lathe-relevant tips for every query. */
const fakeLatheCorpus = (_input: KnowledgeSearchInput): KnowledgeTip[] => [
  makeTip({ id: "CORP-1", title: "Boring bar overhang", body: "Keep boring bar overhang short." }),
  makeTip({ id: "CORP-2", title: "Parting feed", body: "Parting on a lathe needs a firm feed." }),
];

/** Drive the prism_turning dispatcher in isolation via a captured handler. */
async function callTurning(action: string, params: Record<string, unknown> = {}) {
  let handler: ((a: { action: string; params?: unknown }) => Promise<any>) | undefined;
  const mockServer = {
    tool: (_n: string, _d: string, _s: unknown, h: typeof handler) => {
      handler = h;
    },
  };
  registerTurningDispatcher(mockServer as never);
  if (!handler) throw new Error("turning dispatcher did not register a handler");
  const res = await handler({ action, params });
  return JSON.parse(res.content[0].text);
}

const TARGETS = ["speed_feed", "program_assembler", "post_processor", "quote_estimator"] as const;

// ── getAdjustment — happy path + reference values ───────────────────────────

describe("LatheTribalIntegrationEngine.getAdjustment", () => {
  it("applies the P-steel rough-turning curated tip (JM-LATHE-001, feed 0.85)", () => {
    const a = latheTribalIntegrationEngine.getAdjustment("P", "turn_rough");
    expect(a.feed_factor).toBeCloseTo(0.85, 5);
    expect(a.rpm_factor).toBe(1.0);
    expect(a.doc_factor).toBe(1.0);
    expect(a.tips_applied).toContain("JM-LATHE-001");
    expect(a.clamped).toBe(false);
  });

  it("returns the CSS RPM clamp for facing (JM-LATHE-016, css_rpm_cap 3000)", () => {
    const a = latheTribalIntegrationEngine.getAdjustment("P", "face");
    expect(a.css_rpm_cap).toBe(3000);
    expect(a.tips_applied).toContain("JM-LATHE-016");
  });

  it("aggregates the most-restrictive SFM ceiling for titanium roughing", () => {
    const a = latheTribalIntegrationEngine.getAdjustment("S", "turn_rough");
    expect(a.rpm_factor).toBeCloseTo(0.55, 5); // JM-LATHE-011
    expect(a.sfm_max).toBe(180);
    expect(a.tips_applied).toContain("JM-LATHE-011");
  });

  it("compounds two H-hardened finish tips (rpm 0.8 × 0.9 = 0.72)", () => {
    const a = latheTribalIntegrationEngine.getAdjustment("H", "turn_finish");
    expect(a.rpm_factor).toBeCloseTo(0.72, 5); // JM-LATHE-013 × JM-LATHE-014
    expect(a.doc_factor).toBeCloseTo(0.3, 5); // JM-LATHE-013
    expect(a.sfm_max).toBe(500);
  });

  // Variability floor — exercise all six ISO material groups.
  it("covers all six ISO material groups with a distinct curated tip each", () => {
    expect(latheTribalIntegrationEngine.getAdjustment("P", "turn_rough").feed_factor).toBeCloseTo(
      0.85,
      5,
    );
    expect(latheTribalIntegrationEngine.getAdjustment("M", "turn_rough").feed_factor).toBeCloseTo(
      1.05,
      5,
    );
    expect(latheTribalIntegrationEngine.getAdjustment("K", "turn_rough").rpm_factor).toBeCloseTo(
      0.95,
      5,
    );
    expect(latheTribalIntegrationEngine.getAdjustment("N", "turn_rough").rpm_factor).toBeCloseTo(
      1.3,
      5,
    );
    expect(latheTribalIntegrationEngine.getAdjustment("S", "turn_rough").rpm_factor).toBeCloseTo(
      0.55,
      5,
    );
    expect(latheTribalIntegrationEngine.getAdjustment("H", "turn_finish").doc_factor).toBeCloseTo(
      0.3,
      5,
    );
  });

  it("keeps every returned factor inside the [0.25, 2.5] clamp band", () => {
    const mats = ["P", "M", "K", "N", "S", "H"];
    const ops = ["turn_rough", "turn_finish", "face", "bore", "thread", "part_off", "groove", "drill", "knurl"];
    for (const m of mats) {
      for (const o of ops) {
        const a = latheTribalIntegrationEngine.getAdjustment(m, o);
        for (const f of [a.rpm_factor, a.feed_factor, a.doc_factor]) {
          expect(f).toBeGreaterThanOrEqual(0.25);
          expect(f).toBeLessThanOrEqual(2.5);
        }
      }
    }
  });

  it("normalizes case and whitespace in material/operation input", () => {
    const canonical = latheTribalIntegrationEngine.getAdjustment("P", "turn_rough");
    const messy = latheTribalIntegrationEngine.getAdjustment("  p ", "TURN_ROUGH");
    expect(messy.feed_factor).toBeCloseTo(canonical.feed_factor, 5);
    expect(messy.tips_applied).toEqual(canonical.tips_applied);
  });
});

// ── getAdjustment — heuristic condition gating ──────────────────────────────

describe("LatheTribalIntegrationEngine.getAdjustment — heuristic gating", () => {
  it("does NOT apply the boring-overhang heuristic without an overhang ratio", () => {
    const a = latheTribalIntegrationEngine.getAdjustment("P", "bore");
    expect(a.tips_applied).not.toContain("LHEUR-001");
    expect(a.doc_factor).toBe(1.0); // JM-LATHE-015 carries no factor
  });

  it("applies LHEUR-001 only once overhang ratio > 4 (doc 0.6, feed 0.8)", () => {
    const a = latheTribalIntegrationEngine.getAdjustment("P", "bore", { overhangRatio: 6 });
    expect(a.tips_applied).toContain("LHEUR-001");
    expect(a.doc_factor).toBeCloseTo(0.6, 5);
    expect(a.feed_factor).toBeCloseTo(0.8, 5);
  });

  it("makes LHEUR-002 reachable via partLengthDiameterRatio > 3", () => {
    const base = latheTribalIntegrationEngine.getAdjustment("P", "turn_finish");
    const slender = latheTribalIntegrationEngine.getAdjustment("P", "turn_finish", {
      partLengthDiameterRatio: 5,
    });
    expect(base.tips_applied).not.toContain("LHEUR-002");
    expect(slender.tips_applied).toContain("LHEUR-002");
    expect(slender.doc_factor).toBeLessThan(base.doc_factor); // extra 0.7 derate
  });

  it("applies LHEUR-003 only on an interrupted cut", () => {
    const a = latheTribalIntegrationEngine.getAdjustment("P", "turn_rough", {
      interruptedCut: true,
    });
    expect(a.tips_applied).toContain("LHEUR-003");
    expect(a.feed_factor).toBeCloseTo(0.85 * 0.75, 5); // JM-LATHE-001 × LHEUR-003
  });

  it("applies LHEUR-004 only for a worn insert on M/S material", () => {
    const sharp = latheTribalIntegrationEngine.getAdjustment("M", "turn_rough", {
      insertWearVbMm: 0.1,
    });
    const worn = latheTribalIntegrationEngine.getAdjustment("M", "turn_rough", {
      insertWearVbMm: 0.5,
    });
    expect(sharp.tips_applied).not.toContain("LHEUR-004");
    expect(worn.tips_applied).toContain("LHEUR-004");
    expect(worn.feed_factor).toBeCloseTo(1.05 * 0.9, 5); // JM-LATHE-004 × LHEUR-004
  });

  it("ignores NaN / Infinity heuristic conditions (no false trigger)", () => {
    const nan = latheTribalIntegrationEngine.getAdjustment("P", "bore", { overhangRatio: NaN });
    const inf = latheTribalIntegrationEngine.getAdjustment("P", "bore", {
      overhangRatio: Infinity,
    });
    expect(nan.tips_applied).not.toContain("LHEUR-001");
    expect(inf.tips_applied).not.toContain("LHEUR-001");
  });
});

// ── getAdjustment — adversarial / failure inputs ────────────────────────────

describe("LatheTribalIntegrationEngine.getAdjustment — adversarial inputs", () => {
  it("warns (R12) on an unrecognized material instead of silently doing nothing", () => {
    const a = latheTribalIntegrationEngine.getAdjustment("unobtainium", "turn_rough");
    expect(a.warnings.some((w) => w.includes("not a recognized ISO group"))).toBe(true);
  });

  it("warns on an unrecognized operation", () => {
    const a = latheTribalIntegrationEngine.getAdjustment("P", "frobnicate");
    expect(a.warnings.some((w) => w.includes("not a recognized lathe operation"))).toBe(true);
  });

  it("survives empty-string and non-canonical input with neutral factors", () => {
    expect(() => latheTribalIntegrationEngine.getAdjustment("", "")).not.toThrow();
    const a = latheTribalIntegrationEngine.getAdjustment("", "");
    expect(a.rpm_factor).toBe(1.0);
    expect(a.feed_factor).toBe(1.0);
    expect(a.doc_factor).toBe(1.0);
  });

  it("is deterministic — repeated calls give identical output", () => {
    const a = latheTribalIntegrationEngine.getAdjustment("S", "turn_finish");
    const b = latheTribalIntegrationEngine.getAdjustment("S", "turn_finish");
    expect(a).toEqual(b);
  });
});

// ── checkFailureModes ───────────────────────────────────────────────────────

describe("LatheTribalIntegrationEngine.checkFailureModes", () => {
  it("returns the critical parting dig-in failure for steel part-off", () => {
    const modes = latheTribalIntegrationEngine.checkFailureModes("P", "part_off");
    expect(modes.some((m) => m.id === "LFAIL-002")).toBe(true);
    expect(modes[0].severity).toBe("critical"); // critical-first ordering
  });

  it("returns the titanium chip-fire failure for S roughing", () => {
    const modes = latheTribalIntegrationEngine.checkFailureModes("S", "turn_rough");
    expect(modes.some((m) => m.id === "LFAIL-006" && m.severity === "critical")).toBe(true);
  });

  it("returns all six failure modes with no filter, critical-first", () => {
    const modes = latheTribalIntegrationEngine.checkFailureModes();
    expect(modes.length).toBe(6);
    const rank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    for (let i = 1; i < modes.length; i++) {
      expect(rank[modes[i].severity]).toBeGreaterThanOrEqual(rank[modes[i - 1].severity]);
    }
  });

  it("excludes failure modes whose material does not match", () => {
    const modes = latheTribalIntegrationEngine.checkFailureModes("N", "turn_rough");
    // LFAIL-001 is P-specific, LFAIL-006 is S-specific — neither should appear.
    expect(modes.some((m) => m.id === "LFAIL-001")).toBe(false);
    expect(modes.some((m) => m.id === "LFAIL-006")).toBe(false);
  });
});

// ── sourceCorpusTips — injected fake corpus ─────────────────────────────────

describe("LatheTribalIntegrationEngine.sourceCorpusTips", () => {
  it("maps fake corpus KnowledgeTips to deduplicated TribalTips", () => {
    const tips = latheTribalIntegrationEngine.sourceCorpusTips({}, fakeLatheCorpus);
    expect(tips.length).toBe(2); // CORP-1 + CORP-2, deduped across every keyword query
    const ids = tips.map((t) => t.id).sort();
    expect(ids).toEqual(["CORP-1", "CORP-2"]);
    // confidence 80/100 → 0.8 in the injector's 0–1 scale
    expect(tips[0].confidence).toBeCloseTo(0.8, 5);
    expect(tips[0].content).toContain("Boring bar overhang");
  });

  it("fails soft when the corpus search throws (returns [], no crash)", () => {
    const throwing = () => {
      throw new Error("corpus offline");
    };
    expect(() => latheTribalIntegrationEngine.sourceCorpusTips({}, throwing)).not.toThrow();
    expect(latheTribalIntegrationEngine.sourceCorpusTips({}, throwing)).toEqual([]);
  });

  it("fails soft when the corpus search returns a non-array", () => {
    const bad = () => null as unknown as KnowledgeTip[];
    expect(latheTribalIntegrationEngine.sourceCorpusTips({}, bad)).toEqual([]);
  });

  it("filters out corpus tips with no lathe-relevant keyword", () => {
    const millOnly = (): KnowledgeTip[] => [
      makeTip({ id: "MILL-1", title: "Pocket milling", body: "5-axis pocket", tags: ["mill"] }),
    ];
    expect(latheTribalIntegrationEngine.sourceCorpusTips({}, millOnly)).toEqual([]);
  });
});

// ── integrateWithLatheAI — the wiring ───────────────────────────────────────

describe("LatheTribalIntegrationEngine.integrateWithLatheAI", () => {
  it("injects curated tips into all four lathe AI targets", () => {
    const r = latheTribalIntegrationEngine.integrateWithLatheAI(
      { material: "4140 steel", iso_group: "P", operation: "turn_rough" },
      { includeCorpus: false },
    );
    for (const t of TARGETS) {
      expect(r.targets[t].target).toBe(t);
      expect(typeof r.targets[t].audit_id).toBe("string");
      expect(Array.isArray(r.targets[t].injected)).toBe(true);
    }
    expect(r.curated_tips_used).toBeGreaterThan(0);
    expect(r.corpus_tips_sourced).toBe(0);
    expect(r.total_tips).toBe(r.curated_tips_used);
    expect(r.summary).toContain("into the lathe AI");
  });

  it("merges corpus + curated tips, curated winning on id collision", () => {
    const collide = (): KnowledgeTip[] => [
      makeTip({ id: "JM-LATHE-001", title: "corpus impostor", body: "lathe turning" }),
      makeTip({ id: "CORP-X", title: "real corpus", body: "lathe boring tip" }),
    ];
    const r = latheTribalIntegrationEngine.integrateWithLatheAI({}, { searchFn: collide });
    expect(r.corpus_tips_sourced).toBeGreaterThan(0);
    expect(r.curated_tips_used).toBeGreaterThan(0);
    // JM-LATHE-001 appears once in the merged set (curated copy wins).
    expect(r.total_tips).toBeLessThan(r.corpus_tips_sourced + r.curated_tips_used);
  });

  it("handles an empty context without throwing and still wires 4 targets", () => {
    const r = latheTribalIntegrationEngine.integrateWithLatheAI({}, { includeCorpus: false });
    expect(Object.keys(r.targets).sort()).toEqual([...TARGETS].sort());
    expect(r.total_target_injections).toBeGreaterThanOrEqual(0);
  });
});

// ── getStatistics ───────────────────────────────────────────────────────────

describe("LatheTribalIntegrationEngine.getStatistics", () => {
  it("reports the curated corpus coverage counts", () => {
    const s = latheTribalIntegrationEngine.getStatistics();
    expect(s.total_signals).toBe(18);
    expect(s.total_heuristics).toBe(4);
    expect(s.total_failure_modes).toBe(6);
    expect(s.critical_failure_modes).toBe(3); // LFAIL-002, -003, -006
    for (const m of ["P", "M", "K", "N", "S", "H"]) {
      expect(s.by_material[m]).toBeGreaterThan(0);
    }
  });

  it("increments integration_runs by exactly 1 per integrateWithLatheAI call", () => {
    const fresh = new LatheTribalIntegrationEngine();
    expect(fresh.getStatistics().integration_runs).toBe(0);
    fresh.integrateWithLatheAI({}, { includeCorpus: false });
    expect(fresh.getStatistics().integration_runs).toBe(1);
    fresh.integrateWithLatheAI({}, { includeCorpus: false });
    expect(fresh.getStatistics().integration_runs).toBe(2); // not 8 — one id per call
  });
});

// ── Real-data E2E — exercises the live TribalKnowledgeEngine corpus ─────────

describe("LatheTribalIntegrationEngine — real corpus E2E", () => {
  it("sourceCorpusTips runs against the live corpus without crashing", () => {
    const tips = latheTribalIntegrationEngine.sourceCorpusTips({ operation: "turn_rough" });
    expect(Array.isArray(tips)).toBe(true);
    // Every returned tip must carry the injector TribalTip shape.
    for (const t of tips) {
      expect(typeof t.id).toBe("string");
      expect(typeof t.content).toBe("string");
      // knowledgeTipToTribalTip always emits a clamped 0–1 confidence.
      expect(t.confidence).toBeGreaterThanOrEqual(0);
      expect(t.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("integrateWithLatheAI runs end-to-end against the live corpus", () => {
    const r = latheTribalIntegrationEngine.integrateWithLatheAI({
      material: "stainless",
      iso_group: "M",
      operation: "bore",
    });
    expect(r.total_tips).toBeGreaterThanOrEqual(r.curated_tips_used);
    for (const t of TARGETS) expect(r.targets[t].target).toBe(t);
  });
});

// ── Dispatcher round-trip E2E — prism_turning ───────────────────────────────

describe("prism_turning — lathe_tribal_* round-trip", () => {
  it("lathe_tribal_integration_stats returns curated coverage counts", async () => {
    const res = await callTurning("lathe_tribal_integration_stats", {});
    expect(res.success).toBe(true);
    expect(res.data.total_signals).toBe(18);
    expect(res.data.total_failure_modes).toBe(6);
  });

  it("lathe_tribal_adjustment returns tribal factors for a material/operation", async () => {
    const res = await callTurning("lathe_tribal_adjustment", {
      material: "P",
      operation: "turn_rough",
    });
    expect(res.success).toBe(true);
    expect(res.data.feed_factor).toBeCloseTo(0.85, 5);
    expect(res.data.tips_applied).toContain("JM-LATHE-001");
  });

  it("lathe_tribal_adjustment rejects a call missing required material", async () => {
    const res = await callTurning("lathe_tribal_adjustment", { operation: "turn_rough" });
    expect(res.success).toBe(false); // dispatcherError envelope, not a success-less shape
    expect(typeof res.error).toBe("string");
    expect(res.error).toMatch(/invalid params|material/i);
  });

  it("lathe_tribal_failure_check returns lathe failure modes", async () => {
    const res = await callTurning("lathe_tribal_failure_check", {
      material: "S",
      operation: "turn_rough",
    });
    expect(res.success).toBe(true);
    expect(res.data.failure_modes.some((m: { id: string }) => m.id === "LFAIL-006")).toBe(true);
  });

  it("lathe_tribal_integrate wires tribal knowledge into the 4 lathe AI targets", async () => {
    const res = await callTurning("lathe_tribal_integrate", {
      context: { iso_group: "P", operation: "turn_rough" },
      options: { includeCorpus: false },
    });
    expect(res.success).toBe(true);
    for (const t of TARGETS) expect(res.data.targets[t].target).toBe(t);
    expect(res.data.curated_tips_used).toBeGreaterThan(0);
  });

  it("lathe_tribal_source_corpus returns lathe-relevant tribal tips", async () => {
    const res = await callTurning("lathe_tribal_source_corpus", {
      context: { operation: "bore" },
    });
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data.tips)).toBe(true);
    for (const tp of res.data.tips as Array<{ id: string; content: string }>) {
      expect(typeof tp.id).toBe("string");
      expect(typeof tp.content).toBe("string");
    }
  });
});
