/**
 * HermesGoalDecomposerEngine -- the C1 goal->SubtaskSchema decomposer (U-HERMES-GOAL-DECOMPOSE,
 * slot:bravo). Decomposition itself is LLM-backed, but the LLM is INJECTED, so the deterministic
 * risk surface -- prompt construction, LLM-response PARSING, DAG VALIDATION, and the fail-loud
 * orchestration -- is real-tested here with a fake llm returning canned text. No Ollama needed.
 *
 * R9: every assertion encodes WHY -- exact subtask membership, the defaulting rules, the precise
 * DAG-validity verdict, and that an undecomposable goal THROWS (never returns a fabricated plan).
 */
import { describe, it, expect, vi } from "vitest";
import { HermesGoalDecomposerEngine, type DecomposeLlm } from "../engines/HermesGoalDecomposerEngine.js";
import type { SlotCandidate, Subtask } from "../engines/HermesParallelFanoutPlannerEngine.js";

const cand = (slot: string, primary_domain: string | null, score = 5): SlotCandidate =>
  ({ slot, hermes_role: "specialist", primary_domain, score } as SlotCandidate);
const mills = [cand("alpha", "mill"), cand("bravo", "mill"), cand("charlie", "lathe")];

// canned-response llm: every call returns the same text (decomposition is one prompt -> one completion)
const fakeLlm = (text: string): DecomposeLlm => async () => text;

const st = (subtask_id: string, depends_on: string[] = [], extra: Partial<Subtask> = {}): Subtask =>
  ({ subtask_id, description: `do ${subtask_id}`, domain: "mill", depends_on, size_hint: "short", ...extra } as Subtask);

describe("HermesGoalDecomposerEngine.buildDecomposePrompt -- PURE", () => {
  it("embeds the goal, the distinct candidate domains, and a strict-JSON instruction", () => {
    const p = HermesGoalDecomposerEngine.buildDecomposePrompt("ship the lathe wizard", mills, { maxSubtasks: 6 });
    expect(p).toContain("ship the lathe wizard");
    expect(p).toContain("mill, lathe");          // distinct domains, input order, deduped
    expect(p).toMatch(/STRICT JSON/i);
    expect(p).toMatch(/2\.\.6 subtasks/);         // maxSubtasks honored in the rules line
    expect(p).toMatch(/NO cycles/i);
  });

  it("clamps maxSubtasks into [2,20] and tolerates candidates with null domains", () => {
    const p = HermesGoalDecomposerEngine.buildDecomposePrompt("x", [cand("a", null)], { maxSubtasks: 999 });
    expect(p).toMatch(/2\.\.20 subtasks/);        // 999 clamped to 20
    expect(p).toMatch(/no specific domains/i);    // null domain -> fallback line, no crash
  });
});

describe("HermesGoalDecomposerEngine.parseDecomposition -- PURE, fail-soft", () => {
  it("parses a clean {subtasks:[...]} object with exact membership", () => {
    const r = HermesGoalDecomposerEngine.parseDecomposition(
      JSON.stringify({ subtasks: [st("a"), st("b", ["a"])] }),
    );
    expect(r.error).toBeNull();
    expect(r.subtasks.map((s) => s.subtask_id)).toEqual(["a", "b"]);
    expect(r.subtasks[1].depends_on).toEqual(["a"]);
  });

  it("extracts JSON wrapped in a ```json fence (model prose ignored)", () => {
    const r = HermesGoalDecomposerEngine.parseDecomposition(
      "Sure! Here is the plan:\n```json\n{\"subtasks\":[{\"subtask_id\":\"x\",\"description\":\"do x\",\"domain\":\"mill\",\"depends_on\":[],\"size_hint\":\"short\"}]}\n```\nHope that helps.",
    );
    expect(r.error).toBeNull();
    expect(r.subtasks.map((s) => s.subtask_id)).toEqual(["x"]);
  });

  it("extracts a bare {...} object embedded in prose", () => {
    const r = HermesGoalDecomposerEngine.parseDecomposition(
      'prose before {"subtasks":[{"subtask_id":"y","description":"do y","domain":"mill"}]} prose after',
    );
    expect(r.subtasks.map((s) => s.subtask_id)).toEqual(["y"]);
  });

  it("accepts a bare top-level array of subtasks", () => {
    const r = HermesGoalDecomposerEngine.parseDecomposition(
      '[{"subtask_id":"z","description":"do z","domain":"mill"}]',
    );
    expect(r.subtasks.map((s) => s.subtask_id)).toEqual(["z"]);
  });

  it("defaults a missing depends_on to [] and a missing/invalid size_hint to medium", () => {
    const r = HermesGoalDecomposerEngine.parseDecomposition(
      '{"subtasks":[{"subtask_id":"a","description":"do a","domain":"mill"},{"subtask_id":"b","description":"do b","domain":"mill","size_hint":"GIANT"}]}',
    );
    expect(r.subtasks[0].depends_on).toEqual([]);
    expect(r.subtasks[0].size_hint).toBe("medium");
    expect(r.subtasks[1].size_hint).toBe("medium");   // invalid enum coerced to medium
  });

  it("drops a subtask missing id or description (unusable) rather than emitting a broken row", () => {
    const r = HermesGoalDecomposerEngine.parseDecomposition(
      '{"subtasks":[{"subtask_id":"a","description":"do a","domain":"mill"},{"subtask_id":"","description":"no id","domain":"mill"},{"subtask_id":"c","domain":"mill"}]}',
    );
    expect(r.subtasks.map((s) => s.subtask_id)).toEqual(["a"]); // empty-id + missing-description dropped
  });

  it("returns a fail-soft error (no throw) when there is no parseable JSON", () => {
    const r = HermesGoalDecomposerEngine.parseDecomposition("I cannot help with that.");
    expect(r.subtasks).toEqual([]);
    expect(r.error).toMatch(/no parseable JSON/i);
  });

  it("returns an error when JSON parses but carries no subtasks array", () => {
    const r = HermesGoalDecomposerEngine.parseDecomposition('{"plan":"none"}');
    expect(r.subtasks).toEqual([]);
    expect(r.error).toMatch(/no `subtasks` array/i);
  });

  it("ADVERSARIAL: trims a whitespace-padded subtask_id and filters non-string depends_on entries", () => {
    const r = HermesGoalDecomposerEngine.parseDecomposition(
      '{"subtasks":[{"subtask_id":"  a  ","description":"do a","domain":"mill"},{"subtask_id":"b","description":"do b","domain":"mill","depends_on":["a",5,null,"a2"]}]}',
    );
    expect(r.subtasks[0].subtask_id).toBe("a");                 // trimmed
    expect(r.subtasks[1].depends_on).toEqual(["a", "a2"]);      // 5 and null filtered out
  });
});

describe("HermesGoalDecomposerEngine.validateDecomposition -- PURE DAG validity", () => {
  it("accepts a well-formed acyclic diamond", () => {
    const v = HermesGoalDecomposerEngine.validateDecomposition([st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])]);
    expect(v.valid).toBe(true);
    expect(v.errors).toEqual([]);
  });

  it("rejects a dependency cycle and names the stuck nodes", () => {
    const v = HermesGoalDecomposerEngine.validateDecomposition([st("a", ["b"]), st("b", ["a"])]);
    expect(v.valid).toBe(false);
    expect(v.errors.join(" ")).toMatch(/cycle/i);
    expect(v.errors.join(" ")).toMatch(/a/);
    expect(v.errors.join(" ")).toMatch(/b/);
  });

  it("rejects a dependency on an unknown subtask_id", () => {
    const v = HermesGoalDecomposerEngine.validateDecomposition([st("a", ["ghost"])]);
    expect(v.valid).toBe(false);
    expect(v.errors.join(" ")).toMatch(/unknown ghost/);
  });

  it("rejects a self-dependency", () => {
    const v = HermesGoalDecomposerEngine.validateDecomposition([st("a", ["a"])]);
    expect(v.valid).toBe(false);
    expect(v.errors.join(" ")).toMatch(/depends on itself/);
  });

  it("rejects a duplicate subtask_id", () => {
    const v = HermesGoalDecomposerEngine.validateDecomposition([st("a"), st("a")]);
    expect(v.valid).toBe(false);
    expect(v.errors.join(" ")).toMatch(/duplicate subtask_id a/);
  });

  it("rejects an empty set", () => {
    const v = HermesGoalDecomposerEngine.validateDecomposition([]);
    expect(v.valid).toBe(false);
    expect(v.errors).toEqual(["no subtasks"]);
  });

  it("ADVERSARIAL: a self-loop in an otherwise-valid set is caught (not masked by Kahn)", () => {
    // a is a clean root; b self-deps. The self-dep is reported by the dependency check, and because
    // errors exist the cycle pass is skipped -- so the verdict is invalid with the precise self-dep reason.
    const v = HermesGoalDecomposerEngine.validateDecomposition([st("a"), st("b", ["b"])]);
    expect(v.valid).toBe(false);
    expect(v.errors.join(" ")).toMatch(/b depends on itself/);
  });
});

describe("HermesGoalDecomposerEngine.decompose -- LLM-backed, FAIL-LOUD (R12)", () => {
  it("HAPPY: a valid LLM DAG yields a schema-valid FanoutPlanRequest the executor can consume", async () => {
    const llm = fakeLlm(JSON.stringify({ subtasks: [st("core"), st("wire", ["core"]), st("test", ["wire"])] }));
    const req = await HermesGoalDecomposerEngine.decompose("ship feature X", mills, { llm });
    expect(req.subtasks.map((s) => s.subtask_id)).toEqual(["core", "wire", "test"]);
    expect(req.candidates).toEqual(mills);                    // candidates pass through unchanged (Zod parse clones)
    expect(req.max_parallel).toBe(3);                         // defaulted to min(candidates,20)=3
    expect(req.parent_task_id).toBe("goal-ship-feature-x");   // slugged from the goal
  });

  it("honors an explicit parentId and a clamped maxParallel", async () => {
    const llm = fakeLlm(JSON.stringify({ subtasks: [st("a")] }));
    const req = await HermesGoalDecomposerEngine.decompose("g", mills, { llm, parentId: "PARENT-1", maxParallel: 999 });
    expect(req.parent_task_id).toBe("PARENT-1");
    expect(req.max_parallel).toBe(20);                        // 999 clamped to schema max 20
  });

  it("THROWS on an empty goal -- and never calls the LLM (no wasted inference)", async () => {
    const spy = vi.fn<DecomposeLlm>(async () => "{}");
    await expect(HermesGoalDecomposerEngine.decompose("   ", mills, { llm: spy })).rejects.toThrow(/non-empty/);
    expect(spy).not.toHaveBeenCalled();
  });

  it("THROWS when no candidates are supplied", async () => {
    const llm = fakeLlm(JSON.stringify({ subtasks: [st("a")] }));
    await expect(HermesGoalDecomposerEngine.decompose("g", [], { llm })).rejects.toThrow(/candidate/i);
  });

  it("THROWS when no llm is injected -- it never fabricates a decomposition", async () => {
    await expect(HermesGoalDecomposerEngine.decompose("g", mills, {})).rejects.toThrow(/opts\.llm is required/);
  });

  it("THROWS (fail-loud) when the LLM returns un-parseable garbage", async () => {
    const llm = fakeLlm("I refuse to answer in JSON.");
    await expect(HermesGoalDecomposerEngine.decompose("g", mills, { llm })).rejects.toThrow(/could not parse/i);
  });

  it("THROWS when the LLM returns a CYCLIC DAG -- a nonsense plan never reaches the executor", async () => {
    const llm = fakeLlm(JSON.stringify({ subtasks: [st("a", ["b"]), st("b", ["a"])] }));
    await expect(HermesGoalDecomposerEngine.decompose("g", mills, { llm })).rejects.toThrow(/invalid DAG/i);
  });

  it("ADVERSARIAL: an LLM emitting >20 subtasks is rejected by the FanoutPlanRequest schema gate", async () => {
    const many = Array.from({ length: 21 }, (_, i) => st(`s${i}`));
    const llm = fakeLlm(JSON.stringify({ subtasks: many }));
    // The DAG itself is acyclic+valid, but FanoutPlanRequestSchema caps subtasks at 20 -> final gate throws.
    await expect(HermesGoalDecomposerEngine.decompose("g", mills, { llm })).rejects.toThrow();
  });

  it("ADVERSARIAL: an LLM dependency on an unknown id is rejected (validation precedes the schema gate)", async () => {
    const llm = fakeLlm(JSON.stringify({ subtasks: [st("a", ["does-not-exist"])] }));
    await expect(HermesGoalDecomposerEngine.decompose("g", mills, { llm })).rejects.toThrow(/invalid DAG/i);
  });
});
