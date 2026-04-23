/**
 * PrintToProgramTutorialEngine tests
 * P2P-FULLSTACK-MS0 / U-P2PFS62
 */
import { describe, it, expect } from "vitest";
import {
  PrintToProgramTutorialEngine,
  printToProgramTutorialEngine,
  type TutorialWalkthrough,
} from "../../engines/PrintToProgramTutorialEngine.js";

function fresh(): PrintToProgramTutorialEngine {
  return new PrintToProgramTutorialEngine();
}

function makeWalkthrough(overrides: Partial<TutorialWalkthrough> = {}): TutorialWalkthrough {
  return {
    fixture_id: overrides.fixture_id ?? "test-wt",
    title: overrides.title ?? "Test walkthrough",
    difficulty: overrides.difficulty ?? "beginner",
    prerequisites: overrides.prerequisites ?? [],
    learning_objectives: overrides.learning_objectives ?? ["learn"],
    steps: overrides.steps ?? [
      {
        step_number: 1,
        title: "Only step",
        decision: "Do the thing",
        reasoning: "Because reasons",
        common_mistakes: [],
        expected_outcome: "Thing done",
      },
    ],
    estimated_minutes: overrides.estimated_minutes ?? 10,
  };
}

describe("PrintToProgramTutorialEngine", () => {
  it("exports a ready-to-use singleton", () => {
    expect(printToProgramTutorialEngine).toBeInstanceOf(PrintToProgramTutorialEngine);
  });

  it("seeds with walkthroughs spanning beginner → advanced", () => {
    const e = fresh();
    const diffs = new Set(e.walkthroughs().map((w) => w.difficulty));
    expect(diffs.has("beginner")).toBe(true);
    expect(diffs.has("intermediate")).toBe(true);
    expect(diffs.has("advanced")).toBe(true);
  });

  it("each seed walkthrough has ≥1 step and coherent learning objectives", () => {
    const e = fresh();
    for (const w of e.walkthroughs()) {
      expect(w.steps.length).toBeGreaterThan(0);
      expect(w.learning_objectives.length).toBeGreaterThan(0);
      expect(w.estimated_minutes).toBeGreaterThan(0);
    }
  });

  it("walkthroughs() returns deep clones — mutation doesn't leak", () => {
    const e = fresh();
    const snap1 = e.walkthroughs();
    snap1[0].title = "MUTATED";
    snap1[0].steps[0].common_mistakes.push("injected");
    const snap2 = e.walkthroughs();
    expect(snap2[0].title).not.toBe("MUTATED");
    expect(snap2[0].steps[0].common_mistakes).not.toContain("injected");
  });

  it("getWalkthrough returns undefined for unknown fixture_id", () => {
    const e = fresh();
    expect(e.getWalkthrough("does-not-exist")).toBeUndefined();
  });

  it("registerWalkthrough adds + returns retrievable copy", () => {
    const e = fresh();
    const before = e.walkthroughs().length;
    e.registerWalkthrough(makeWalkthrough({ fixture_id: "new-wt" }));
    expect(e.walkthroughs().length).toBe(before + 1);
    expect(e.getWalkthrough("new-wt")?.title).toBe("Test walkthrough");
  });

  it("registerWalkthrough throws on duplicate fixture_id", () => {
    const e = fresh();
    e.registerWalkthrough(makeWalkthrough({ fixture_id: "dup" }));
    expect(() => e.registerWalkthrough(makeWalkthrough({ fixture_id: "dup" }))).toThrow(
      /already registered/,
    );
  });

  it("registerWalkthrough throws on empty fixture_id", () => {
    const e = fresh();
    expect(() => e.registerWalkthrough(makeWalkthrough({ fixture_id: "" }))).toThrow(
      /fixture_id is required/,
    );
  });

  it("registerWalkthrough throws on zero-step walkthrough", () => {
    const e = fresh();
    expect(() =>
      e.registerWalkthrough(makeWalkthrough({ fixture_id: "empty-steps", steps: [] })),
    ).toThrow(/at least one step/);
  });

  it("registerWalkthrough throws if step_number is non-sequential", () => {
    const e = fresh();
    expect(() =>
      e.registerWalkthrough(
        makeWalkthrough({
          fixture_id: "bad-order",
          steps: [
            {
              step_number: 1,
              title: "a",
              decision: "a",
              reasoning: "a",
              common_mistakes: [],
              expected_outcome: "a",
            },
            {
              step_number: 3, // should be 2
              title: "b",
              decision: "b",
              reasoning: "b",
              common_mistakes: [],
              expected_outcome: "b",
            },
          ],
        }),
      ),
    ).toThrow(/1-based sequential/);
  });

  it("unregisterWalkthrough returns true/false correctly", () => {
    const e = fresh();
    const id = e.walkthroughs()[0].fixture_id;
    expect(e.unregisterWalkthrough(id)).toBe(true);
    expect(e.unregisterWalkthrough(id)).toBe(false);
    expect(e.getWalkthrough(id)).toBeUndefined();
  });

  it("byDifficulty filters to exactly that tier", () => {
    const e = fresh();
    const beginners = e.byDifficulty("beginner");
    expect(beginners.length).toBeGreaterThan(0);
    for (const w of beginners) expect(w.difficulty).toBe("beginner");
    expect(e.byDifficulty("expert")).toEqual([]);
  });

  it("progressionLadder orders by difficulty, then by minutes within tier", () => {
    const e = new PrintToProgramTutorialEngine([]);
    e.registerWalkthrough(makeWalkthrough({ fixture_id: "exp-long", difficulty: "expert", estimated_minutes: 90 }));
    e.registerWalkthrough(makeWalkthrough({ fixture_id: "beg-short", difficulty: "beginner", estimated_minutes: 5 }));
    e.registerWalkthrough(makeWalkthrough({ fixture_id: "beg-long", difficulty: "beginner", estimated_minutes: 30 }));
    e.registerWalkthrough(makeWalkthrough({ fixture_id: "int-mid", difficulty: "intermediate", estimated_minutes: 20 }));

    const ladder = e.progressionLadder();
    expect(ladder.map((w) => w.fixture_id)).toEqual([
      "beg-short",
      "beg-long",
      "int-mid",
      "exp-long",
    ]);
  });

  it("nextAfter returns the next walkthrough in the ladder", () => {
    const e = new PrintToProgramTutorialEngine([]);
    e.registerWalkthrough(makeWalkthrough({ fixture_id: "a", difficulty: "beginner", estimated_minutes: 5 }));
    e.registerWalkthrough(makeWalkthrough({ fixture_id: "b", difficulty: "beginner", estimated_minutes: 10 }));
    e.registerWalkthrough(makeWalkthrough({ fixture_id: "c", difficulty: "intermediate", estimated_minutes: 20 }));

    expect(e.nextAfter("a")?.fixture_id).toBe("b");
    expect(e.nextAfter("b")?.fixture_id).toBe("c");
    expect(e.nextAfter("c")).toBeUndefined(); // last in ladder
    expect(e.nextAfter("unknown")).toBeUndefined();
  });

  it("totalEstimatedMinutes sums across curriculum", () => {
    const e = new PrintToProgramTutorialEngine([
      makeWalkthrough({ fixture_id: "a", estimated_minutes: 10 }),
      makeWalkthrough({ fixture_id: "b", estimated_minutes: 25 }),
      makeWalkthrough({ fixture_id: "c", estimated_minutes: 40 }),
    ]);
    expect(e.totalEstimatedMinutes()).toBe(75);
  });

  it("seed constructor rejects duplicate fixture_ids", () => {
    expect(
      () =>
        new PrintToProgramTutorialEngine([
          makeWalkthrough({ fixture_id: "dup" }),
          makeWalkthrough({ fixture_id: "dup" }),
        ]),
    ).toThrow(/Duplicate tutorial fixture_id/);
  });

  it("beginner walkthrough has no heavy prerequisites (shallow ramp)", () => {
    const e = fresh();
    const beginners = e.byDifficulty("beginner");
    for (const w of beginners) {
      // A beginner tutorial should not require any prior walkthroughs as prereqs —
      // use a crude keyword check that their prerequisites don't reference
      // the other curriculum entries by fixture_id.
      const otherIds = e.walkthroughs().filter((x) => x.fixture_id !== w.fixture_id).map((x) => x.fixture_id);
      for (const pre of w.prerequisites) {
        for (const id of otherIds) {
          expect(pre).not.toContain(id);
        }
      }
    }
  });

  it("each step references a decision, reasoning, and expected outcome", () => {
    const e = fresh();
    for (const w of e.walkthroughs()) {
      for (const s of w.steps) {
        expect(s.decision.length).toBeGreaterThan(0);
        expect(s.reasoning.length).toBeGreaterThan(0);
        expect(s.expected_outcome.length).toBeGreaterThan(0);
      }
    }
  });

  it("seed walkthroughs have monotonic step_number within each walkthrough", () => {
    const e = fresh();
    for (const w of e.walkthroughs()) {
      for (let i = 0; i < w.steps.length; i++) {
        expect(w.steps[i].step_number).toBe(i + 1);
      }
    }
  });

  it("progression ladder is stable across calls (deterministic)", () => {
    const e = fresh();
    const ladder1 = e.progressionLadder().map((w) => w.fixture_id);
    const ladder2 = e.progressionLadder().map((w) => w.fixture_id);
    expect(ladder1).toEqual(ladder2);
  });
});
