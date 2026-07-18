/**
 * LATHE-LORA-MS0/U-LLR-EXTRACT — real-behavior tests for the knowledge extractor
 * (harvests ledger outcomes + injected corpus/tribal → deduped SFT training records).
 *
 * The extractor pulls ALL labeled lathe outcomes from the shared store, so outcome
 * assertions find their specific row by a UNIQUE material token; injected-source
 * assertions are inherently deterministic (counts + ids). Concrete value assertions
 * via optional chaining double as existence checks (fail if the record is absent).
 */
import { describe, it, expect } from "vitest";
import {
  latheLoRAKnowledgeExtractorEngine as extractor,
  KNOWLEDGE_EXTRACT_SCHEMA_VERSION,
  type LatheCorpusRecordInput,
} from "../engines/LatheLoRAKnowledgeExtractorEngine.js";
import { latheLoRAExperienceLedgerEngine as ledger } from "../engines/LatheLoRAExperienceLedgerEngine.js";
import { promises as fsp } from "node:fs";
import path from "node:path";

let _n = 0;
const uniqMat = () => `LATHE_EXTRACT_TEST_${++_n}`;
const QUERY_ALL = 5000;

describe("LatheLoRAKnowledgeExtractorEngine — injected corpus/tribal (deterministic)", () => {
  it("injected corpus → a well-formed SFT record (instruction/source/schemaVersion/reward/ts)", () => {
    const corpus: LatheCorpusRecordInput[] = [
      { instruction: "Bore Ø50 H7 in 4140", input: "{m:4140}", output: "G71 ... ", reward: 0.9, ts: "2026-01-01" },
    ];
    const { records, stats } = extractor.extract({ includeCorpus: corpus });
    expect(stats.fromCorpus).toBe(1);
    const rec = records.find((r) => r.source === "corpus" && r.output.startsWith("G71"));
    expect(rec?.schemaVersion).toBe(KNOWLEDGE_EXTRACT_SCHEMA_VERSION);
    expect(rec?.instruction).toBe("Bore Ø50 H7 in 4140");
    expect(rec?.reward).toBeCloseTo(0.9, 6);
    expect(rec?.ts).toBe("2026-01-01");
  });

  it("injected tribal → instruction is the tip-apply prompt; tip becomes the output", () => {
    const { records, stats } = extractor.extract({
      includeTribal: [{ tip: "peck-groove parting >3× width to clear chips", context: "part_off", reward: 1 }],
    });
    expect(stats.fromTribal).toBe(1);
    const rec = records.find((r) => r.source === "tribal" && r.output.includes("peck-groove"));
    expect(rec?.instruction).toMatch(/shop-floor lathe tip/i);
    expect(rec?.input).toBe("part_off");
  });

  it("identical corpus records dedup to one (deterministic content-hash id)", () => {
    const dup: LatheCorpusRecordInput = { input: "{dup:1}", output: "DUP_OUTPUT_X" };
    const { records, stats } = extractor.extract({ includeCorpus: [dup, dup] });
    expect(stats.deduped).toBeGreaterThanOrEqual(1);
    expect(records.filter((r) => r.output === "DUP_OUTPUT_X").length).toBe(1);
  });

  it("malformed injected records are skipped + counted (lenient harvest, R12-surfaced)", () => {
    const { stats } = extractor.extract({
      includeCorpus: [{ input: "x" } as never], // missing output → invalid
      includeTribal: [{ tip: "" }], // empty tip → invalid
    });
    expect(stats.skipped).toBeGreaterThanOrEqual(2);
  });

  it("reward is clamped to [0,1] for out-of-range injected values", () => {
    const { records } = extractor.extract({
      includeCorpus: [
        { input: "hi", output: "OVER_REWARD_Y", reward: 5 },
        { input: "lo", output: "UNDER_REWARD_Z", reward: -3 },
      ],
    });
    expect(records.find((r) => r.output === "OVER_REWARD_Y")?.reward).toBe(1);
    expect(records.find((r) => r.output === "UNDER_REWARD_Z")?.reward).toBe(0);
  });

  it("extraction is deterministic — same injected input yields the same record id twice", () => {
    const c: LatheCorpusRecordInput[] = [{ input: "{det:1}", output: "DET_OUTPUT" }];
    const a = extractor.extract({ includeCorpus: c }).records.find((r) => r.output === "DET_OUTPUT")?.id;
    const b = extractor.extract({ includeCorpus: c }).records.find((r) => r.output === "DET_OUTPUT")?.id;
    expect(a).toBe(b);
    expect(typeof a).toBe("string");
  });
});

describe("LatheLoRAKnowledgeExtractorEngine — harvest from the shared experience ledger", () => {
  it("a closed lathe outcome surfaces as a source:outcome SFT record carrying its reward", () => {
    const mat = uniqMat();
    const id = ledger.record({ operation: "od_finish", material: mat, vc: 220, targetRaUm: 0.8 });
    ledger.recordOutcome(id, { kind: "success", actualRaUm: 0.8 }); // reward 1.0

    const { records } = extractor.extract({ limit: QUERY_ALL });
    const rec = records.find((r) => r.source === "outcome" && r.input.includes(mat));
    expect(rec?.reward).toBe(1);
    expect(rec?.instruction).toMatch(/Recommend turning parameters for od_finish/);
    expect(rec?.input).toContain(mat);
    expect(rec?.output).toContain("220"); // predicted vc round-trips into the output
  });

  it("minReward floor drops a failed (reward 0) outcome from the harvest", () => {
    const mat = uniqMat();
    const id = ledger.record({ operation: "thread", material: mat });
    ledger.recordOutcome(id, { kind: "failure", failureMode: "insert_chipped" }); // reward 0

    const { records } = extractor.extract({ limit: QUERY_ALL, minReward: 0.5 });
    expect(records.some((r) => r.source === "outcome" && r.input.includes(mat))).toBe(false);
  });
});

describe("LATHE-LORA-MS0/U-LLR-EXTRACT — dispatcher + schema wiring", () => {
  it("turningDispatcher source has the ACTIONS entry + case-block for lathe_lora_knowledge_extract", async () => {
    const src = await fsp.readFile(
      path.resolve(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
      "utf8",
    );
    expect(src.includes('case "lathe_lora_knowledge_extract":')).toBe(true);
    expect(src.includes('"lathe_lora_knowledge_extract",')).toBe(true);
  });

  it("schema registered with safeParse; accepts {} + a valid corpus array; rejects bad corpus + null", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(typeof m.lathe_lora_knowledge_extract?.safeParse).toBe("function");
    expect(m.lathe_lora_knowledge_extract!.safeParse({}).success).toBe(true);
    expect(
      m.lathe_lora_knowledge_extract!.safeParse({ includeCorpus: [{ input: "a", output: "b" }] }).success,
    ).toBe(true);
    expect(
      m.lathe_lora_knowledge_extract!.safeParse({ includeCorpus: [{ input: "a" }] }).success,
    ).toBe(false); // corpus row missing required 'output'
    expect(m.lathe_lora_knowledge_extract!.safeParse(null).success).toBe(false);
  });
});
