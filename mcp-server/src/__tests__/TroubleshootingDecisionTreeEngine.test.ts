/**
 * TroubleshootingDecisionTreeEngine.test.ts — U-india-TroubleshootingDecisionTree-TEST
 * ============================================================================
 * REAL reference-value coverage for the previously-UNTESTED
 * `TroubleshootingDecisionTreeEngine` (src/engines/TroubleshootingDecisionTreeEngine.ts),
 * which is wired into `prism_knowledge` (knowledgeDispatcher.ts:2019-2028) via
 * `dtEngine.calculate(action, params)` for the 4 actions
 *   troubleshoot_diagnose · troubleshoot_by_symptom · troubleshoot_tree · troubleshoot_common
 * but had NO test file referencing it (verified: `grep -rl` empty in src/__tests__).
 *
 * The engine is 100% deterministic (no Math.random / no I/O), so every value
 * below is derived from the engine's OWN tree data + formulas and pinned exactly
 * — not snapshotted. Coverage: happy path + >3 failure modes + >2 adversarial +
 * a real-round-trip block through the live knowledgeDispatcher handler.
 *
 * ── REAL BUG PINNED (R12 — current behavior locked, NOT weakened) ─────────────
 * `diagnose()` resolves category roots via `isRootNode(id)` = "no node points to
 * this id". But the tree data wires ALL 8 category sub-trees into a SINGLE chain
 * through the `noNode` spine (1.chatter → 9.surface_finish → 17.tool_breakage →
 * 24.dimensional → 31.chip → 37.coolant → 43.fixture → 48.program), so the ONLY
 * root node in the whole tree is node 1 (category "chatter"). Consequences that
 * these tests LOCK IN as the engine's real behavior:
 *   (a) `diagnose` only ever walks the chatter root → the returned diagnoses are
 *       the whole-tree leaf set, and EVERY diagnosis carries evidence
 *       "Matched category: chatter" even when the root cause is coolant/program.
 *   (b) symptoms that match a NON-chatter category but not chatter return ZERO
 *       diagnoses (e.g. pure coolant symptoms) — the feature is effectively broken
 *       for non-chatter inputs. Tests below assert `diagnosis.length === 0` for
 *       that case and document it rather than masking it.
 * Reported to the orchestrator; not fixed here (this unit is TEST-ONLY).
 *
 * @slot india  @domain AI/reliability/stochastic (deterministic decision engine)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  troubleshootingDecisionTreeEngine as engine,
  TroubleshootingDecisionTreeEngine,
} from "../engines/TroubleshootingDecisionTreeEngine.js";
import { registerKnowledgeDispatcher } from "../tools/dispatchers/knowledgeDispatcher.js";

// ============================================================================
// DIRECT SINGLETON COVERAGE (engine.calculate() — the exact method the
// dispatcher invokes: `result = dtEngine.calculate(action, params)`)
// ============================================================================

describe("troubleshoot_tree — structural reference values", () => {
  it("reports 52 nodes, 8 tree categories, and shared-visited DFS depth = 11", () => {
    const r = engine.calculate("troubleshoot_tree");
    // 52 authored nodes (ids 1..52).
    expect(r.nodes).toBe(52);
    // Categories in first-appearance order down the noNode spine.
    expect(r.categories).toEqual([
      "chatter",
      "surface_finish",
      "tool_breakage",
      "dimensional",
      "chip",
      "coolant",
      "fixture",
      "program",
    ]);
    // Longest root→leaf spine is 1→9→17→24→31→37→43→48→49→51→52 = 11 nodes,
    // and computeMaxDepth()'s yes-first shared-visited DFS counts it fully.
    expect(r.depth).toBe(11);
    expect(r.tree).toHaveLength(52);
  });

  it("works with NO params object (calculate default arg) — adversarial", () => {
    // calculate(action) omits params → defaults to {} → getTree ignores params.
    const r = engine.calculate("troubleshoot_tree");
    expect(r.nodes).toBe(52);
  });
});

describe("troubleshoot_common — DB slices", () => {
  it("category=chatter → the 3 authored chatter problems (first = slotting)", () => {
    const r = engine.calculate("troubleshoot_common", { category: "chatter" });
    expect(r.problems).toHaveLength(3);
    expect(r.problems[0].name).toContain("Regenerative chatter in slotting");
    expect(r.problems[0].frequency).toBe("very common");
  });

  it("no category → the full 23-problem catalog (3+3+3+3+2+3+2+2+2)", () => {
    const r = engine.calculate("troubleshoot_common", {});
    expect(r.problems).toHaveLength(23);
  });

  it("unknown category → falls back to full 23-problem catalog — adversarial", () => {
    const r = engine.calculate("troubleshoot_common", { category: "totally_bogus" });
    expect(r.problems).toHaveLength(23);
  });
});

describe("troubleshoot_diagnose — happy path (chatter root walk)", () => {
  // score = 4 keyword hits (chatter, vibration, noise, buzz) → min(4/3,1)=1.0,
  // so each confidence == the leaf's own confidence (no context multiplier).
  const HAPPY = { symptoms: ["chatter vibration noise buzz"] };

  it("returns top-6 leaf diagnoses with exact confidences [.92,.91,.90,.90,.88,.88]", () => {
    const r = engine.calculate("troubleshoot_diagnose", HAPPY);
    expect(r.diagnosis).toHaveLength(6);
    // Exact, descending — pins both the confidence formula and the sort.
    expect(r.diagnosis.map((d: any) => d.confidence)).toEqual([
      0.92, 0.91, 0.9, 0.9, 0.88, 0.88,
    ]);
    // #1 = node 50 (program crash, 0.92), #2 = node 41 (coolant bacteria, 0.91).
    expect(r.diagnosis[0].rootCause).toContain("Unsafe rapid positioning");
    expect(r.diagnosis[1].rootCause).toContain("Anaerobic bacteria growth in coolant sump");
    // The two 0.90 leaves = node 11 (feed) + node 28 (offset); order-agnostic.
    const at090 = r.diagnosis
      .filter((d: any) => d.confidence === 0.9)
      .map((d: any) => d.rootCause)
      .join(" | ");
    expect(at090).toContain("Feed rate too high for required surface finish");
    expect(at090).toContain("Incorrect tool offset, wear compensation");
    // The two 0.88 leaves = node 3 (overhang) + node 21 (overload); order-agnostic.
    const at088 = r.diagnosis
      .filter((d: any) => d.confidence === 0.88)
      .map((d: any) => d.rootCause)
      .join(" | ");
    expect(at088).toContain("Excessive tool overhang causing regenerative chatter");
    expect(at088).toContain("Chip load exceeds tool strength");
    // Every diagnosis carries fixes.
    for (const d of r.diagnosis) expect(d.fixes.length).toBeGreaterThan(0);
  });

  it("BUG-PIN: every diagnosis is evidenced as 'chatter' regardless of true cause", () => {
    const r = engine.calculate("troubleshoot_diagnose", HAPPY);
    for (const d of r.diagnosis) {
      expect(d.evidence).toContain("Matched category: chatter");
    }
    // A program-crash root cause tagged chatter is the smoking gun of the
    // single-root-node bug documented at the top of this file.
    expect(r.diagnosis[0].rootCause).toContain("Unsafe rapid positioning");
  });

  it("machineType context applies the ×1.05 multiplier with rounding: 0.92 → 0.97", () => {
    const r = engine.calculate("troubleshoot_diagnose", {
      ...HAPPY,
      machineType: "VMC",
    });
    // 0.92 * 1.05 = 0.966 → min(.,0.98)=0.966 → round(96.6)/100 = 0.97.
    expect(r.diagnosis[0].confidence).toBe(0.97);
    expect(r.diagnosis[0].rootCause).toContain("Unsafe rapid positioning");
  });

  it("all three context clues saturate at the 0.98 cap — adversarial", () => {
    const r = engine.calculate("troubleshoot_diagnose", {
      ...HAPPY,
      machineType: "VMC",
      operation: "slot",
      material: "4140",
    });
    // 0.92→0.966→(×1.05→1.014 capped 0.98)→(×1.03→1.009 capped 0.98) = 0.98.
    expect(r.diagnosis[0].confidence).toBe(0.98);
  });
});

describe("troubleshoot_by_symptom — exact likelihood formula", () => {
  it("'chatter' (score=1) → 3 chatter leaves with likelihood = conf × 2/3", () => {
    const r = engine.calculate("troubleshoot_by_symptom", { symptom: "chatter" });
    // node3 has relevance 0 AND score(1)<2 → excluded; nodes 5/7/8 keep 'chatter'.
    expect(r.causes).toHaveLength(3);
    // relevance = 1 overlapping word / 3 (max set size) = 1/3 →
    // likelihood = conf × (0.5 + (1/3)×0.5) = conf × 2/3.
    expect(r.causes[0].name).toContain("Operating at unstable RPM per stability lobe");
    expect(r.causes[0].likelihood).toBeCloseTo(0.85 * (2 / 3), 10);
    expect(r.causes[1].name).toContain("Excessive radial engagement");
    expect(r.causes[1].likelihood).toBeCloseTo(0.82 * (2 / 3), 10);
    expect(r.causes[2].name).toContain("Workholding rigidity or spindle bearing");
    expect(r.causes[2].likelihood).toBeCloseTo(0.7 * (2 / 3), 10);
    // Sorted strictly descending.
    expect(r.causes[0].likelihood).toBeGreaterThan(r.causes[1].likelihood);
    expect(r.causes[1].likelihood).toBeGreaterThan(r.causes[2].likelihood);
    // fixes split: first 2 = quickFixes, remainder = deepFixes (node7 has 4).
    expect(r.causes[0].quickFixes).toHaveLength(2);
    expect(r.causes[0].deepFixes).toHaveLength(2);
    expect(r.causes[0].description).toContain("Category: chatter");
  });

  it("empty symptom string → no causes (failure mode)", () => {
    expect(engine.calculate("troubleshoot_by_symptom", { symptom: "" }).causes).toEqual([]);
  });

  it("missing symptom param → no causes (failure mode)", () => {
    expect(engine.calculate("troubleshoot_by_symptom", {}).causes).toEqual([]);
  });
});

describe("troubleshoot_diagnose — failure & adversarial branches", () => {
  it("no symptoms → empty diagnosis + the generic prompting question (failure mode)", () => {
    const r = engine.calculate("troubleshoot_diagnose", {});
    expect(r.diagnosis).toEqual([]);
    expect(r.questionsToNarrow?.[0]).toContain("What symptoms are you observing");
  });

  it("unmatched symptoms → empty diagnosis + 'could not match' question (failure mode)", () => {
    const r = engine.calculate("troubleshoot_diagnose", { symptoms: ["zzz"] });
    expect(r.diagnosis).toEqual([]);
    expect(r.questionsToNarrow?.[0]).toContain("Could not match symptoms to known categories");
  });

  it("BUG-PIN: pure coolant symptoms match a category but yield ZERO diagnoses AND no guidance", () => {
    // "coolant foam odor rust" → coolant score 4, chatter score 0. Because no
    // coolant node is a root, the `for (root of rootNodes)` body never runs —
    // and since questions are collected INSIDE that loop, `questions` stays []
    // too. So a matched-but-non-chatter symptom returns neither a diagnosis nor
    // a follow-up question: `{ diagnosis: [], questionsToNarrow: undefined }`.
    const r = engine.calculate("troubleshoot_diagnose", {
      symptoms: ["coolant foam odor rust"],
    });
    expect(r.diagnosis).toEqual([]);
    expect(r.questionsToNarrow).toBeUndefined();
  });
});

describe("calculate — dispatch guard", () => {
  it("unknown action → structured error (failure mode)", () => {
    expect(engine.calculate("nonsense_action")).toEqual({
      error: "Unknown action: nonsense_action",
    });
  });

  it("a fresh instance yields identical structural results (no shared mutation)", () => {
    const fresh = new TroubleshootingDecisionTreeEngine();
    expect(fresh.calculate("troubleshoot_tree").nodes).toBe(52);
    expect(fresh.calculate("troubleshoot_tree").depth).toBe(11);
  });
});

// ============================================================================
// REAL ROUND-TRIP through the live knowledgeDispatcher (prism_knowledge)
// — proves the wired path (normalizeParams → validate → dtEngine.calculate →
//   slimResponse envelope) is numerically correct end-to-end, not just the
//   singleton. slimResponse STRIPS empty arrays, so the empty-diagnosis case
//   drops the `diagnosis` key entirely (read via `?? []`).
// ============================================================================

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, handler });
    },
  };
}
async function invoke(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<any> {
  const res = (await handler({ action, params })) as { content?: Array<{ text?: string }> };
  if (Array.isArray(res.content)) {
    return JSON.parse(res.content[0]?.text ?? "null");
  }
  return res;
}

describe("round-trip via prism_knowledge dispatcher", () => {
  let handler: CapturedTool["handler"];

  beforeAll(() => {
    const srv = makeStubServer();
    registerKnowledgeDispatcher(srv as any);
    const t = srv.tools.find((x) => x.name === "prism_knowledge");
    if (!t) throw new Error("prism_knowledge not registered");
    handler = t.handler;
  });

  it("troubleshoot_tree → parsed envelope carries 52 nodes / depth 11", async () => {
    const body = await invoke(handler, "troubleshoot_tree");
    expect(body.nodes).toBe(52);
    expect(body.depth).toBe(11);
    expect(body.categories).toHaveLength(8);
  });

  it("troubleshoot_common(category=chatter) → 3 problems through the envelope", async () => {
    const body = await invoke(handler, "troubleshoot_common", { category: "chatter" });
    expect(body.problems).toHaveLength(3);
    expect(body.problems[0].name).toContain("Regenerative chatter in slotting");
  });

  it("troubleshoot_by_symptom(chatter) → 3 causes, top = unstable-RPM", async () => {
    const body = await invoke(handler, "troubleshoot_by_symptom", { symptom: "chatter" });
    expect(body.causes).toHaveLength(3);
    expect(body.causes[0].name).toContain("Operating at unstable RPM per stability lobe");
    expect(body.causes[0].likelihood).toBeCloseTo(0.85 * (2 / 3), 8);
  });

  it("troubleshoot_diagnose(chatter) → 6 diagnoses, #1 = 0.92 unsafe-rapid", async () => {
    const body = await invoke(handler, "troubleshoot_diagnose", {
      symptoms: ["chatter vibration noise buzz"],
    });
    expect(body.diagnosis).toHaveLength(6);
    expect(body.diagnosis[0].rootCause).toContain("Unsafe rapid positioning");
    expect(body.diagnosis[0].confidence).toBe(0.92);
  });

  it("BUG-PIN round-trip: coolant symptoms → slimResponse yields an empty body", async () => {
    const body = await invoke(handler, "troubleshoot_diagnose", {
      symptoms: ["coolant foam odor rust"],
    });
    // Engine returns { diagnosis: [], questionsToNarrow: undefined }. slimResponse
    // strips the empty array and JSON drops the undefined key → body is {}.
    expect((body.diagnosis ?? []).length).toBe(0);
    expect(body.questionsToNarrow).toBeUndefined();
    expect(Object.keys(body)).toHaveLength(0);
  });
});
