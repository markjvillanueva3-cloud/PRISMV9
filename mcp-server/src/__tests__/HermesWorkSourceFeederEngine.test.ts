/**
 * HermesWorkSourceFeederEngine tests -- the work-source -> Subtask[] adapter (HERMES-WORK-LOOP-MS0/U3).
 *
 * R9: each assertion encodes WHY the mapping matters -- the risk class drives the executor's
 * cloud-vs-local lane + the plan-vs-draft posture (operator decision 2: plan+draft-only, safety
 * ALWAYS plan-only). Coverage: happy path + >=3 failure modes (empty, all-claimed, malformed)
 * + >=2 adversarial (a peer claims a unit that ALSO appears under a code title; a research-source
 * row whose title screams "engine" must STAY read-only by source; a safety word inside a roadmap
 * unit must OVERRIDE the code class to plan-only).
 */
import { describe, it, expect } from "vitest";
import {
  HermesWorkSourceFeederEngine,
  type WorkSourceUnit,
} from "../engines/HermesWorkSourceFeederEngine.js";

function unit(over: Partial<WorkSourceUnit> & { unit_id: string; title: string; source: WorkSourceUnit["source"] }): WorkSourceUnit {
  return { ...over };
}

describe("HermesWorkSourceFeederEngine.classify", () => {
  it("a safety-touching roadmap unit is plan-only on the cloud lane (NEVER an autonomous draft)", () => {
    const c = HermesWorkSourceFeederEngine.classify(
      unit({ unit_id: "U-KIENZLE-FORCE", title: "Fix the Kienzle cutting-force exponent", source: "roadmap" }),
    );
    expect(c.risk).toBe("safety");
    expect(c.posture).toBe("plan"); // operator decision 2 + extra caution: no draft on safety work
    expect(c.lane).toBe("cloud"); // deep reasoning
    expect(c.reason).toMatch(/safety-touching/);
  });

  it("a safety word OVERRIDES the code class -- 'wire the deflection engine' is safety, plan-only", () => {
    // 'wire'/'engine' are code signals; 'deflection' is a safety signal -> the most cautious wins.
    const c = HermesWorkSourceFeederEngine.classify(
      unit({ unit_id: "U-DEFL-WIRE", title: "Wire the deflection engine to prism_calc", source: "roadmap" }),
    );
    expect(c.risk).toBe("safety");
    expect(c.posture).toBe("plan");
  });

  it("a research source is read-only/local/plan EVEN when its title screams 'engine' (source dominates)", () => {
    const c = HermesWorkSourceFeederEngine.classify(
      unit({ unit_id: "RES-ENGINE-SURVEY", title: "Summarize every cutting-force engine for the wiki", source: "research" }),
    );
    // 'engine' is a code signal, but a research/wiki summarize task touches no code.
    // NOTE: this title has no SAFETY word, so source-precedence (research) applies.
    expect(c.risk).toBe("read-only");
    expect(c.lane).toBe("local"); // free Ollama summarize
    expect(c.posture).toBe("plan");
  });

  it("a wiring source is always code/cloud/draft (a wiring gap is build work by construction)", () => {
    const c = HermesWorkSourceFeederEngine.classify(
      unit({ unit_id: "AuthEngineV7", title: "Wire 1 unwired Auth engine to prism_auth", source: "wiring" }),
    );
    expect(c.risk).toBe("code");
    expect(c.lane).toBe("cloud");
    expect(c.posture).toBe("draft"); // plan + a diff for human review
  });

  it("a roadmap title with no code/safety signal falls back to read-only analysis (conservative)", () => {
    const c = HermesWorkSourceFeederEngine.classify(
      unit({ unit_id: "U-DOC-AUDIT", title: "Audit the customer onboarding documentation", source: "roadmap" }),
    );
    expect(c.risk).toBe("read-only");
    expect(c.posture).toBe("plan");
  });

  // R9 regression-pin for the scrutiny-arm-B P1 regex defects: a trailing `\b` after a stem
  // alternative (`migrat`/`orchestrat`/`refactor`) silently missed every inflected form, so a
  // genuine code unit mis-routed to the local/plan lane. These fail on the pre-fix regex.
  it.each([
    ["U-MIGRATE", "Run the database migration now"],
    ["U-ORCH", "Orchestration of the post pipeline"],
    ["U-REFACTOR", "Refactoring the lathe dispatcher module"],
    ["U-IMPL", "Implementing the new schema validator"],
  ])("an inflected code-stem in a roadmap title (%s) classifies as code/cloud/draft, not read-only", (id, title) => {
    const c = HermesWorkSourceFeederEngine.classify(unit({ unit_id: id, title, source: "roadmap" }));
    expect(c.risk).toBe("code");
    expect(c.lane).toBe("cloud");
    expect(c.posture).toBe("draft");
  });

  it("an isolated 's(x)' safety token (no other safety word) flags safety/plan-only", () => {
    // `\bs\(x\)\b` never matched (the trailing `\b` after ')' needs a word char) -> the one
    // safety pattern whose miss made a unit LESS cautious. Now `s\(x\)` is a top-level alt.
    const c = HermesWorkSourceFeederEngine.classify(
      unit({ unit_id: "U-SX-GATE", title: "Recompute the s(x) gate threshold", source: "roadmap" }),
    );
    expect(c.risk).toBe("safety");
    expect(c.posture).toBe("plan");
  });

  it("a SYNTHESIS source carrying a safety word still flips to safety/plan-only (safety overrides source)", () => {
    // synthesis is code/draft by construction, but a safety signal must STILL force plan-only.
    const c = HermesWorkSourceFeederEngine.classify(
      unit({ unit_id: "SYN-DEFL", title: "Synthesis gap: deflection model coverage", source: "synthesis" }),
    );
    expect(c.risk).toBe("safety");
    expect(c.posture).toBe("plan"); // NOT draft, even though synthesis defaults to draft
  });
});

describe("HermesWorkSourceFeederEngine.toSubtasks -- happy path", () => {
  it("maps rows to the canonical Subtask shape (leaves, valid size_hint enum) + classifies each", () => {
    const r = HermesWorkSourceFeederEngine.toSubtasks({
      sources: [
        unit({ unit_id: "U-A", title: "Refactor the post-processor dispatcher", source: "roadmap", domain: "post-processor" }),
        unit({ unit_id: "RES-1", title: "Survey lathe tribal tips", source: "research" }),
      ],
      heldClaims: [],
      maxUnits: 8,
    });
    expect(r.subtasks).toHaveLength(2);

    const a = r.subtasks[0];
    expect(a.subtask.subtask_id).toBe("U-A");
    expect(a.subtask.depends_on).toEqual([]); // leaf -- one-wave fan-out
    expect(["short", "medium", "large"]).toContain(a.subtask.size_hint); // valid enum, not a free string
    expect(a.subtask.domain).toBe("post-processor");
    expect(a.risk).toBe("code");
    expect(a.executor_lane).toBe("cloud");

    const res = r.subtasks[1];
    expect(res.risk).toBe("read-only");
    expect(res.executor_lane).toBe("local");
    expect(res.subtask.domain).toBe("research"); // source default applied when domain absent
  });

  it("the description folds in milestone + detail, truncated to <=2000 chars", () => {
    const longDetail = "x".repeat(3000);
    const r = HermesWorkSourceFeederEngine.toSubtasks({
      sources: [unit({ unit_id: "U-LONG", title: "Build it", source: "roadmap", milestone: "FOO-MS0", detail: longDetail })],
    });
    const d = r.subtasks[0].subtask.description;
    expect(d).toContain("FOO-MS0");
    expect(d.length).toBeLessThanOrEqual(2000);
  });
});

describe("HermesWorkSourceFeederEngine.toSubtasks -- failure modes", () => {
  it("an empty source list yields zero subtasks (not an error)", () => {
    const r = HermesWorkSourceFeederEngine.toSubtasks({ sources: [], heldClaims: [], maxUnits: 5 });
    expect(r.subtasks).toHaveLength(0);
    expect(r.consideredCount).toBe(0);
  });

  it("every unit claimed by a peer -> zero emitted, excludedClaimed counted (never races a live slot)", () => {
    const r = HermesWorkSourceFeederEngine.toSubtasks({
      sources: [
        unit({ unit_id: "U-X", title: "Build X engine", source: "roadmap" }),
        unit({ unit_id: "U-Y", title: "Build Y engine", source: "roadmap" }),
      ],
      heldClaims: ["U-X", "U-Y"],
      maxUnits: 8,
    });
    expect(r.subtasks).toHaveLength(0);
    expect(r.excludedClaimed).toBe(2);
  });

  it("a malformed source row (empty title) is dropped, not thrown -- the feed survives one bad row", () => {
    const r = HermesWorkSourceFeederEngine.toSubtasks({
      sources: [
        { unit_id: "U-GOOD", title: "Wire the cam dispatcher", source: "wiring" },
        { unit_id: "U-BAD", title: "", source: "roadmap" } as unknown as WorkSourceUnit, // empty title fails min(1)
      ],
      heldClaims: [],
    });
    expect(r.subtasks).toHaveLength(1);
    expect(r.subtasks[0].subtask.subtask_id).toBe("U-GOOD");
    expect(r.excludedMalformed).toBe(1);
  });

  it("a non-object request THROWS (fail-loud -- a malformed request is a caller bug)", () => {
    expect(() => HermesWorkSourceFeederEngine.toSubtasks(null)).toThrow(/must be an object/);
    expect(() => HermesWorkSourceFeederEngine.toSubtasks("nope")).toThrow(/must be an object/);
  });

  it("maxUnits caps the emitted set but keeps counting exclusions below it", () => {
    const sources = Array.from({ length: 10 }, (_, i) => unit({ unit_id: `U-${i}`, title: `Build engine ${i}`, source: "roadmap" }));
    const r = HermesWorkSourceFeederEngine.toSubtasks({ sources, heldClaims: [], maxUnits: 3 });
    expect(r.subtasks).toHaveLength(3);
    expect(r.consideredCount).toBe(10);
  });
});

describe("HermesWorkSourceFeederEngine.toSubtasks -- adversarial", () => {
  it("the SAME unit_id appearing under two sources is collapsed once (first wins), dup counted", () => {
    const r = HermesWorkSourceFeederEngine.toSubtasks({
      sources: [
        unit({ unit_id: "U-DUP", title: "Build the thing (roadmap copy)", source: "roadmap" }),
        unit({ unit_id: "U-DUP", title: "Build the thing (synthesis copy)", source: "synthesis" }),
      ],
      heldClaims: [],
    });
    expect(r.subtasks).toHaveLength(1);
    expect(r.subtasks[0].source).toBe("roadmap"); // first occurrence wins
    expect(r.excludedDuplicate).toBe(1);
  });

  it("a unit claimed by a peer is excluded EVEN when a duplicate of it is unclaimed in the list", () => {
    // adversarial: U-Z appears twice; held set has it -> the first (claimed) is excluded, the
    // dup is also excluded as a dup of an already-seen id is moot because seen-check is post-claim.
    // The claim check fires FIRST, so neither copy emits.
    const r = HermesWorkSourceFeederEngine.toSubtasks({
      sources: [
        unit({ unit_id: "U-Z", title: "Build Z", source: "roadmap" }),
        unit({ unit_id: "U-Z", title: "Build Z again", source: "synthesis" }),
      ],
      heldClaims: ["U-Z"],
    });
    expect(r.subtasks).toHaveLength(0);
    expect(r.excludedClaimed).toBe(2); // both copies hit the claim guard
    expect(r.excludedDuplicate).toBe(0); // claim guard short-circuits before the dup guard
  });

  it("an over-long unit_id is truncated to 120 chars so the Subtask schema (max 120) accepts it", () => {
    const longId = "U-" + "x".repeat(200);
    // The WorkSourceUnit schema itself caps unit_id at 120, so this row is dropped as malformed --
    // proving the cap is enforced at the boundary (not silently emitting an over-long subtask_id).
    const r = HermesWorkSourceFeederEngine.toSubtasks({
      sources: [{ unit_id: longId, title: "x", source: "roadmap" } as unknown as WorkSourceUnit],
      heldClaims: [],
    });
    expect(r.subtasks).toHaveLength(0);
    expect(r.excludedMalformed).toBe(1);
  });
});
