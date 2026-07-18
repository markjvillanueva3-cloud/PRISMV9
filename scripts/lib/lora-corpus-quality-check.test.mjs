// scripts/lib/lora-corpus-quality-check.test.mjs
// U-LORA-CORPUS-QUALITY: pre-train degeneracy guard for assembled Alpaca SFT corpora.
// Run: node scripts/lib/lora-corpus-quality-check.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  inputTokenCount, instructionDistribution, contradictoryPairs,
  thinInstructionRate, gradeCorpus, parseJsonlRows,
} from "./lora-corpus-quality-check.mjs";

const ROWS = [
  { instruction: "PRISM x. Inputs: material=A, op=turn.", output: "o1" },
  { instruction: "PRISM x. Inputs: material=A, op=turn.", output: "o1" }, // exact dup
  { instruction: "PRISM x. Inputs: material=A, op=turn.", output: "o2" }, // contradictory (same instr, diff out)
  { instruction: "PRISM y. Inputs: machine=M.", output: "o3" },           // thin (1 input)
];

describe("inputTokenCount", () => {
  it("counts key= determining-input tokens", () => {
    assert.equal(inputTokenCount("PRISM x. Inputs: material=A, op=turn."), 2);
    assert.equal(inputTokenCount("PRISM y. Inputs: machine=M."), 1);
    assert.equal(inputTokenCount("no inputs here"), 0);
    assert.equal(inputTokenCount(null), 0);
  });
});

describe("instructionDistribution", () => {
  it("computes unique-instruction ratio + top repeated", () => {
    const d = instructionDistribution(ROWS);
    assert.equal(d.totalRows, 4);
    assert.equal(d.uniqueInstructions, 2);
    assert.ok(Math.abs(d.uniqueRatio - 0.5) < 1e-9);
    assert.deepEqual(d.topRepeated[0], { instruction: "PRISM x. Inputs: material=A, op=turn.", count: 3 });
  });
});

describe("contradictoryPairs", () => {
  it("flags an instruction mapping to >=2 distinct outputs", () => {
    const c = contradictoryPairs(ROWS);
    assert.equal(c.contradictoryInstructions, 1);   // only "PRISM x" (o1,o2)
    assert.equal(c.contradictoryRows, 3);           // all 3 rows of that instruction
    assert.equal(c.examples[0].distinctOutputs, 2);
  });
  it("no contradiction when every instruction has one output", () => {
    const c = contradictoryPairs([{ instruction: "a", output: "x" }, { instruction: "b", output: "y" }]);
    assert.equal(c.contradictoryInstructions, 0);
  });
});

describe("thinInstructionRate", () => {
  it("rate of instructions with < minInputs determining inputs", () => {
    const t = thinInstructionRate(ROWS, 2);
    assert.equal(t.total, 4);
    assert.equal(t.thin, 1);                        // only the machine-only "PRISM y"
    assert.ok(Math.abs(t.thinRate - 0.25) < 1e-9);
  });
});

describe("gradeCorpus", () => {
  it("flags HIGH CONTRADICTION as degenerate", () => {
    const g = gradeCorpus(ROWS);
    assert.equal(g.pass, false);
    assert.equal(g.verdict, "degenerate-corpus");
    assert.ok(Math.abs(g.contradictionRate - 0.75) < 1e-9);
    assert.ok(g.warnings.some((w) => /HIGH CONTRADICTION/.test(w)));
  });
  it("flags LOW DIVERSITY (mass duplication = the thin-data pattern)", () => {
    const dup = Array.from({ length: 20 }, () => ({ instruction: "same", output: "out" }));
    const g = gradeCorpus(dup);
    assert.equal(g.uniqueRatio, 0.05);
    assert.ok(g.warnings.some((w) => /LOW DIVERSITY/.test(w)));
  });
  it("clean diverse corpus -> training-ready", () => {
    const good = Array.from({ length: 20 }, (_, i) => ({ instruction: `PRISM. Inputs: material=M${i}, op=turn.`, output: `o${i}` }));
    const g = gradeCorpus(good);
    assert.equal(g.pass, true);
    assert.equal(g.verdict, "training-ready");
  });
  it("prose knowledge corpus (no key=val, but diverse + non-contradictory) -> training-ready; THIN is ADVISORY only", () => {
    // The Hermes per-domain rules: distinct prose instructions, unique outputs, ZERO key= tokens.
    // thinRate is 1.0 but that is the parametric heuristic mis-applied -- must NOT fail the corpus.
    const prose = Array.from({ length: 12 }, (_, i) => ({
      instruction: `PRISM mill machining best-practice. Topic: distinct rule number ${i} about tooling. Give the guideline.`,
      output: `Specific cited guideline ${i}. Source: Handbook p.${i}.`,
    }));
    const g = gradeCorpus(prose);
    assert.equal(g.pass, true);                                   // diverse + non-contradictory -> ready
    assert.equal(g.verdict, "training-ready");
    assert.equal(g.thinRate, 1);                                  // genuinely no key=val tokens
    assert.ok(Array.isArray(g.advisories) && g.advisories.some((w) => /THIN INSTRUCTIONS/.test(w)), "thin surfaces as advisory");
    assert.ok(!g.warnings.some((w) => /THIN/.test(w)), "thin must NOT be a pass-failing warning");
  });
  it("adversarial: empty -> ready (no rows, no warnings), never throws", () => {
    assert.doesNotThrow(() => {
      const g = gradeCorpus([]);
      assert.equal(g.totalRows, 0);
      assert.equal(g.pass, true);
    });
  });
});

describe("parseJsonlRows", () => {
  it("parses JSONL, skips blank/unparseable lines", () => {
    const rows = parseJsonlRows('{"instruction":"a","output":"b"}\n\n{bad\n{"instruction":"c","output":"d"}');
    assert.equal(rows.length, 2);
    assert.equal(rows[1].instruction, "c");
  });
});
