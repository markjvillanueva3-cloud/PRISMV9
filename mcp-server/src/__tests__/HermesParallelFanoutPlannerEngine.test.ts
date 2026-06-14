/** HermesParallelFanoutPlannerEngine tests — HZP01. */
import { describe, it, expect } from "vitest";
import {
  HermesParallelFanoutPlannerEngine,
  type FanoutPlanRequest,
  type Subtask,
  type SlotCandidate,
} from "../engines/HermesParallelFanoutPlannerEngine.js";

const st = (id: string, domain = "mill", depends_on: string[] = []): Subtask => ({
  subtask_id: id,
  description: `do ${id}`,
  domain,
  depends_on,
  size_hint: "medium",
});

const cand = (slot: string, domain: string, score = 5): SlotCandidate => ({
  slot,
  hermes_role: "specialist",
  primary_domain: domain,
  score,
});

const req = (over: Partial<FanoutPlanRequest> = {}): FanoutPlanRequest => ({
  parent_task_id: "p1",
  subtasks: [st("a", "mill"), st("b", "lathe")],
  candidates: [cand("alpha", "mill"), cand("bravo", "lathe")],
  max_parallel: 5,
  ...over,
});

describe("HermesParallelFanoutPlannerEngine.plan — happy", () => {
  it("two independent leaves → 2-agent wave_1", () => {
    const p = HermesParallelFanoutPlannerEngine.plan(req());
    expect(p.parallelizable).toBe(true);
    expect(p.wave_1.length).toBe(2);
    expect(p.reject_reason).toBeNull();
  });

  it("prefers domain-matched candidate", () => {
    const p = HermesParallelFanoutPlannerEngine.plan(req());
    const millAssign = p.wave_1.find((a) => a.subtask_id === "a");
    expect(millAssign?.slot).toBe("alpha");
    expect(millAssign?.reason).toBe("domain-match");
  });

  it("max_parallel caps wave_1 size + defers the rest", () => {
    const subtasks = ["a", "b", "c", "d"].map((id) => st(id, "mill"));
    const candidates = ["alpha", "bravo", "charlie", "delta"].map((s) => cand(s, "mill"));
    const p = HermesParallelFanoutPlannerEngine.plan(req({ subtasks, candidates, max_parallel: 2 }));
    expect(p.wave_1.length).toBe(2);
    expect(p.deferred.length).toBe(2);
  });
});

describe("HermesParallelFanoutPlannerEngine.plan — sequential + degraded", () => {
  it("sequential chain (1 leaf, others depend) → not parallelizable", () => {
    const subtasks = [st("a"), st("b", "mill", ["a"]), st("c", "mill", ["b"])];
    const p = HermesParallelFanoutPlannerEngine.plan(req({ subtasks }));
    expect(p.parallelizable).toBe(false);
    expect(p.reject_reason).toContain("sequential");
  });

  it("zero positive-score candidates → no wave_1", () => {
    const candidates = [cand("alpha", "mill", -1), cand("bravo", "lathe", 0)];
    const p = HermesParallelFanoutPlannerEngine.plan(req({ candidates }));
    expect(p.parallelizable).toBe(false);
    expect(p.wave_1.length).toBe(0);
  });

  it("fewer candidates than leaves → leaves go to unrouted", () => {
    const subtasks = [st("a", "mill"), st("b", "lathe"), st("c", "wedm")];
    const candidates = [cand("alpha", "mill")];
    const p = HermesParallelFanoutPlannerEngine.plan(req({ subtasks, candidates }));
    expect(p.wave_1.length).toBe(1);
    expect(p.unrouted.length).toBeGreaterThan(0);
  });
});

describe("HermesParallelFanoutPlannerEngine — schema + validation", () => {
  it("duplicate subtask_id throws", () => {
    const subtasks = [st("a"), st("a")];
    expect(() => HermesParallelFanoutPlannerEngine.plan(req({ subtasks }))).toThrow();
  });

  it("dependency on unknown subtask_id throws", () => {
    const subtasks = [st("a", "mill", ["nope"])];
    expect(() => HermesParallelFanoutPlannerEngine.plan(req({ subtasks }))).toThrow();
  });

  it("self-dependency throws", () => {
    const subtasks = [st("a", "mill", ["a"])];
    expect(() => HermesParallelFanoutPlannerEngine.plan(req({ subtasks }))).toThrow();
  });

  it("renderPlan shows OK tag + counts on parallelizable", () => {
    const md = HermesParallelFanoutPlannerEngine.renderPlan(HermesParallelFanoutPlannerEngine.plan(req()));
    expect(md.includes("[FANOUT OK]")).toBe(true);
    expect(md.includes("wave1=2")).toBe(true);
  });

  it("renderPlan shows REJECTED tag on sequential", () => {
    const subtasks = [st("a"), st("b", "mill", ["a"])];
    const md = HermesParallelFanoutPlannerEngine.renderPlan(HermesParallelFanoutPlannerEngine.plan(req({ subtasks })));
    expect(md.includes("[FANOUT REJECTED]")).toBe(true);
  });
});

// HZP01.5 — the auto-trigger gate (the dormant decision layer above plan()).
describe("HermesParallelFanoutPlannerEngine.assessAutoTrigger — domain-count gate", () => {
  it("3 distinct domains ≥ default threshold → recommends fan-out with per-domain candidates", () => {
    const a = HermesParallelFanoutPlannerEngine.assessAutoTrigger(
      "Optimize the milling roughing strategy, fix the lathe turning cycle, and tune the wire EDM skim pass.",
    );
    expect(a.shouldFanout).toBe(true);
    expect(a.domainCount).toBe(3);
    const detected = a.domains.map((d) => d.domain).sort();
    expect(detected).toEqual(["lathe", "mill", "wedm"]);
    expect(a.signals).toContain("multi-domain");
    // Candidates route to the canonical owning slots.
    const bySlot = Object.fromEntries(a.suggested_candidates.map((c) => [c.primary_domain, c.slot]));
    expect(bySlot.mill).toBe("foxtrot");
    expect(bySlot.lathe).toBe("whiskey");
    expect(bySlot.wedm).toBe("mike");
  });

  it("2 distinct domains < default threshold 3 → sequential (no fan-out)", () => {
    const a = HermesParallelFanoutPlannerEngine.assessAutoTrigger(
      "Recompute the milling feed and the lathe surface speed.",
    );
    expect(a.domainCount).toBe(2);
    expect(a.shouldFanout).toBe(false);
    expect(a.reason).toContain("sequential ok");
    expect(a.suggested_candidates).toEqual([]);
  });

  it("same 2-domain task trips when caller lowers threshold to 2", () => {
    const text = "Recompute the milling feed and the lathe surface speed.";
    expect(HermesParallelFanoutPlannerEngine.assessAutoTrigger(text, { threshold: 2 }).shouldFanout).toBe(true);
    expect(HermesParallelFanoutPlannerEngine.assessAutoTrigger(text).shouldFanout).toBe(false);
  });

  it("single-domain task → sequential", () => {
    const a = HermesParallelFanoutPlannerEngine.assessAutoTrigger("Calculate the Kienzle cutting speed for milling 4140.");
    // "milling", "speed and feed"-adjacent — but stays under threshold.
    expect(a.shouldFanout).toBe(false);
    expect(a.domainCount).toBeLessThan(3);
  });
});

describe("HermesParallelFanoutPlannerEngine.assessAutoTrigger — fleet-wide scope override", () => {
  it("explicit fleet-wide scope recommends fan-out regardless of domain count", () => {
    const a = HermesParallelFanoutPlannerEngine.assessAutoTrigger(
      "Optimize for all galaxies and synergize the system as a whole down to the lowest level.",
    );
    expect(a.shouldFanout).toBe(true);
    expect(a.signals).toContain("fleet-wide-scope");
    expect(a.reason).toContain("fleet-wide scope");
  });

  it("detects and-chain when ≥2 coordinated deliverables", () => {
    const a = HermesParallelFanoutPlannerEngine.assessAutoTrigger(
      "Build the backend and optimize the hermes app and synergize obsidian.",
    );
    expect(a.signals).toContain("and-chain");
  });
});

describe("HermesParallelFanoutPlannerEngine.assessAutoTrigger — guards + edges", () => {
  it("empty / non-string input → false with explicit reason (no throw)", () => {
    expect(HermesParallelFanoutPlannerEngine.assessAutoTrigger("").shouldFanout).toBe(false);
    expect(HermesParallelFanoutPlannerEngine.assessAutoTrigger("   ").reason).toContain("empty-or-invalid");
    // @ts-expect-error — deliberately bad input to prove the no-throw guard.
    expect(HermesParallelFanoutPlannerEngine.assessAutoTrigger(null).shouldFanout).toBe(false);
    // @ts-expect-error — deliberately bad input.
    expect(HermesParallelFanoutPlannerEngine.assessAutoTrigger(42).domainCount).toBe(0);
  });

  it("invalid threshold (0 / negative / NaN / <2) clamps to default 3", () => {
    const text = "Touch milling and lathe.";
    expect(HermesParallelFanoutPlannerEngine.assessAutoTrigger(text, { threshold: 0 }).threshold).toBe(3);
    expect(HermesParallelFanoutPlannerEngine.assessAutoTrigger(text, { threshold: -5 }).threshold).toBe(3);
    expect(HermesParallelFanoutPlannerEngine.assessAutoTrigger(text, { threshold: 1 }).threshold).toBe(3);
    expect(HermesParallelFanoutPlannerEngine.assessAutoTrigger(text, { threshold: Number.NaN }).threshold).toBe(3);
  });

  it("word-boundary matching — 'camera' must NOT match the 'cam' domain", () => {
    const a = HermesParallelFanoutPlannerEngine.assessAutoTrigger("Mount a camera on the spindle.");
    expect(a.domains.some((d) => d.domain === "cam")).toBe(false);
  });

  it("detected domains carry matched-keyword evidence + owning slot", () => {
    const a = HermesParallelFanoutPlannerEngine.assessAutoTrigger("Wire the obsidian vault into the hermes orchestrator.");
    const obsidian = a.domains.find((d) => d.domain === "obsidian");
    expect(obsidian?.slot).toBe("alpha");
    expect(obsidian?.matched.length).toBeGreaterThan(0);
  });

  it("renderAutoTrigger shows ✅ when recommended and — when not", () => {
    const yes = HermesParallelFanoutPlannerEngine.assessAutoTrigger("Optimize for all galaxies.");
    const no = HermesParallelFanoutPlannerEngine.assessAutoTrigger("Calculate one milling feedrate.");
    expect(HermesParallelFanoutPlannerEngine.renderAutoTrigger(yes).includes("[AUTO-FANOUT ✅]")).toBe(true);
    expect(HermesParallelFanoutPlannerEngine.renderAutoTrigger(no).includes("[AUTO-FANOUT —]")).toBe(true);
  });
});

// Regression locks for the two scrutiny-P1 fixes + maxParallel/truncation P2 coverage.
describe("HermesParallelFanoutPlannerEngine.assessAutoTrigger — contract hardening", () => {
  it("P1a: the 'orchestrat' stem now matches real inflections (orchestration/orchestrator)", () => {
    // Pre-fix this returned no hermes-zulu match — the trailing word-boundary killed the stem.
    expect(
      HermesParallelFanoutPlannerEngine.assessAutoTrigger("Improve the orchestration layer.")
        .domains.some((d) => d.domain === "hermes-zulu"),
    ).toBe(true);
    expect(
      HermesParallelFanoutPlannerEngine.assessAutoTrigger("Ask the orchestrator to route this.")
        .domains.some((d) => d.domain === "hermes-zulu"),
    ).toBe(true);
  });

  it("P1b: suggested_candidates are FULL, plan()-ready SlotCandidates (no hidden hydration trap)", () => {
    const a = HermesParallelFanoutPlannerEngine.assessAutoTrigger(
      "Fix the milling roughing, the lathe finishing, and the wire EDM skim.",
    );
    expect(a.suggested_candidates.length).toBe(3);
    for (const c of a.suggested_candidates) {
      expect(typeof c.hermes_role).toBe("string");
      expect(c.hermes_role.length).toBeGreaterThan(0);
      expect(c.score).toBeGreaterThan(0);
    }
    // The real contract: feed them straight into plan() — pre-fix this THREW (missing hermes_role/score).
    const subtasks = a.domains.map((d) => ({
      subtask_id: d.domain,
      description: `handle ${d.domain}`,
      domain: d.domain,
      depends_on: [],
      size_hint: "medium" as const,
    }));
    const plan = HermesParallelFanoutPlannerEngine.plan({
      parent_task_id: "auto",
      subtasks,
      candidates: a.suggested_candidates,
      max_parallel: 5,
    });
    expect(plan.parallelizable).toBe(true);
    expect(plan.wave_1.length).toBe(3);
  });

  it("P2: maxParallel caps suggested_candidates but not the detected-domain list", () => {
    const a = HermesParallelFanoutPlannerEngine.assessAutoTrigger(
      "Fix the milling roughing, the lathe finishing, and the wire EDM skim.",
      { maxParallel: 2 },
    );
    expect(a.domainCount).toBe(3);
    expect(a.suggested_candidates.length).toBe(2);
  });

  it("P2: '+'-chain arm of and-chain detection fires", () => {
    const a = HermesParallelFanoutPlannerEngine.assessAutoTrigger("Ship backend + frontend + docs.");
    expect(a.signals).toContain("and-chain");
  });

  it("P2: a domain keyword past MAX_PROMPT_SCAN_CHARS is truncated away (not detected)", () => {
    // "mill" appears early; "lathe" sits past char 8000 → sliced off → only mill counts.
    const text = "mill " + "z".repeat(8000) + " lathe turning";
    const a = HermesParallelFanoutPlannerEngine.assessAutoTrigger(text);
    expect(a.domains.some((d) => d.domain === "mill")).toBe(true);
    expect(a.domains.some((d) => d.domain === "lathe")).toBe(false);
  });
});
