/**
 * dispatcher.parserHarnesses.test.ts — round-trip coverage for two wires:
 *   - WIRE-UNWIRED-MS0/U-WIRE-PGH (ParserGoldenHarnessEngine, 6 read actions)
 *   - WIRE-UNWIRED-MS0/U-WIRE-PFH (ParserFuzzHarnessEngine, 5 read actions)
 *
 * Both engines are stateful; only read methods are wired. Write methods
 * (freeze/quarantineCase/addCorpusEntry/markCrash/clearAll) DEFERRED —
 * LLM-callable writes would let fictional golden sets silence real
 * regressions or inject fake crashes.
 *
 * For coverage that exercises the read paths against real state, tests
 * pre-seed via engine-direct calls (freeze/addCorpusEntry) so the
 * dispatcher reads find populated state.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { parserGoldenHarnessEngine } from "../engines/ParserGoldenHarnessEngine.js";
import { parserFuzzHarnessEngine } from "../engines/ParserFuzzHarnessEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

// 64-char hex SHA-256 placeholders — match the engine's SHA256_REGEX
const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  // Seed golden + corpus via direct engine calls (DEFERRED writes), so the
  // wire read paths have real state to inspect.
  parserGoldenHarnessEngine.clearAll();
  parserGoldenHarnessEngine.freeze([
    {
      case_id: "fanuc-success-01",
      dialect: "fanuc",
      input_sha256: SHA_A,
      expected_ast_sha256: SHA_B,
    },
    {
      case_id: "okuma-success-01",
      dialect: "okuma",
      input_sha256: SHA_B,
      expected_ast_sha256: SHA_C,
    },
    {
      case_id: "haas-rejection-01",
      dialect: "haas",
      input_sha256: SHA_C,
      expected_error: "unknown G-code G99.99",
    },
  ] as Parameters<typeof parserGoldenHarnessEngine.freeze>[0], "test-harness");

  parserFuzzHarnessEngine.clearAll();
  parserFuzzHarnessEngine.addCorpusEntry({
    input_sha256: SHA_A,
    dialect: "fanuc",
    category: "valid" as Parameters<typeof parserFuzzHarnessEngine.addCorpusEntry>[0]["category"],
    added_by: "test-harness",
    input_len_bytes: 1024,
  } as Parameters<typeof parserFuzzHarnessEngine.addCorpusEntry>[0]);
  parserFuzzHarnessEngine.addCorpusEntry({
    input_sha256: SHA_B,
    dialect: "okuma",
    category: "malformed" as Parameters<typeof parserFuzzHarnessEngine.addCorpusEntry>[0]["category"],
    added_by: "test-harness",
    input_len_bytes: 512,
  } as Parameters<typeof parserFuzzHarnessEngine.addCorpusEntry>[0]);

  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

afterAll(() => {
  // Don't leak test fixtures into other test files' state.
  parserGoldenHarnessEngine.clearAll();
  parserFuzzHarnessEngine.clearAll();
});

// ────────────────────────────────────────────────────────────────────────
// PGH — ParserGoldenHarnessEngine
// ────────────────────────────────────────────────────────────────────────

describe("WIRE-UNWIRED-MS0/U-WIRE-PGH — Zod schemas", () => {
  it("pgh_list_golden accepts {} or {dialect}", () => {
    expect(ACTION_DEV_SCHEMAS["pgh_list_golden"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["pgh_list_golden"].safeParse({ dialect: "fanuc" }).success).toBe(true);
  });

  it("pgh_get_case requires non-empty case_id", () => {
    expect(ACTION_DEV_SCHEMAS["pgh_get_case"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["pgh_get_case"].safeParse({ case_id: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["pgh_get_case"].safeParse({ case_id: "x" }).success).toBe(true);
  });

  it("pgh_evaluate requires non-empty runs + caps at 10k (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["pgh_evaluate"].safeParse({ runs: [] }).success).toBe(false);
    const big = Array.from({ length: 10_001 }, () => ({ case_id: "x" }));
    expect(ACTION_DEV_SCHEMAS["pgh_evaluate"].safeParse({ runs: big }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PGH — prism_dev :: pgh_list_golden", () => {
  it("no filter → exactly 3 seeded cases", async () => {
    const r = await invokeHandler(devHandler, "pgh_list_golden", {});
    expect((r as { count?: number }).count).toBe(3);
    const cases = (r as { cases: Array<{ case_id: string; dialect: string }> }).cases;
    const ids = cases.map(c => c.case_id).sort();
    expect(ids).toEqual(["fanuc-success-01", "haas-rejection-01", "okuma-success-01"]);
  });

  it("dialect=fanuc → only fanuc-success-01", async () => {
    const r = await invokeHandler(devHandler, "pgh_list_golden", { dialect: "fanuc" });
    expect((r as { count?: number }).count).toBe(1);
    const cases = (r as { cases: Array<{ case_id: string }> }).cases;
    expect(cases[0]!.case_id).toBe("fanuc-success-01");
  });

  it("VARIABILITY — fanuc / okuma / haas each yield 1 case with correct id", async () => {
    const expectedIds: Record<string, string> = {
      fanuc: "fanuc-success-01",
      okuma: "okuma-success-01",
      haas: "haas-rejection-01",
    };
    for (const [d, expectedId] of Object.entries(expectedIds)) {
      const r = await invokeHandler(devHandler, "pgh_list_golden", { dialect: d });
      expect((r as { count?: number }).count).toBe(1);
      const cases = (r as { cases: Array<{ case_id: string }> }).cases;
      expect(cases[0]!.case_id).toBe(expectedId);
    }
  });

  it("ROUTING PROOF — wire case_id set equals engine-direct listGolden() id set", async () => {
    const r = await invokeHandler(devHandler, "pgh_list_golden", {});
    const wireIds = ((r as { cases: Array<{ case_id: string }> }).cases).map(c => c.case_id).sort();
    const directIds = parserGoldenHarnessEngine.listGolden().map(c => c.case_id).slice().sort();
    expect(wireIds).toEqual(directIds);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PGH — prism_dev :: pgh_get_case", () => {
  it("known case_id → found:true + correct dialect + correct expected_ast_sha256", async () => {
    const r = await invokeHandler(devHandler, "pgh_get_case", { case_id: "fanuc-success-01" });
    expect((r as { found?: boolean }).found).toBe(true);
    const c = (r as { case: { dialect: string; input_sha256: string; expected_ast_sha256?: string } }).case;
    expect(c.dialect).toBe("fanuc");
    expect(c.input_sha256).toBe(SHA_A);
    expect(c.expected_ast_sha256).toBe(SHA_B);
  });

  it("known rejection case → carries expected_error not expected_ast_sha256", async () => {
    const r = await invokeHandler(devHandler, "pgh_get_case", { case_id: "haas-rejection-01" });
    expect((r as { found?: boolean }).found).toBe(true);
    const c = (r as { case: { expected_error?: string } }).case;
    expect(c.expected_error).toBe("unknown G-code G99.99");
  });

  it("unknown case_id → found:false", async () => {
    const r = await invokeHandler(devHandler, "pgh_get_case", { case_id: "no-such-case-ever" });
    expect((r as { found?: boolean }).found).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PGH — prism_dev :: pgh_is_quarantined + list", () => {
  it("non-quarantined case → is_quarantined:'no'", async () => {
    const r = await invokeHandler(devHandler, "pgh_is_quarantined", { case_id: "fanuc-success-01" });
    expect((r as { is_quarantined?: string | boolean }).is_quarantined).toBe("no");
  });

  it("list_quarantine on empty quarantine → count:0", async () => {
    const r = await invokeHandler(devHandler, "pgh_list_quarantine", {});
    expect((r as { count?: number }).count ?? 0).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PGH — prism_dev :: pgh_evaluate", () => {
  it("3 runs against 3 golden cases → total_runs=3, passed=true (all match)", async () => {
    // ParserRun shape per engine: {case_id, input_sha256, parse_ok, ast_sha256?, error?, run_at?}
    const r = await invokeHandler(devHandler, "pgh_evaluate", {
      runs: [
        { case_id: "fanuc-success-01", input_sha256: SHA_A, parse_ok: true, ast_sha256: SHA_B },
        { case_id: "okuma-success-01", input_sha256: SHA_B, parse_ok: true, ast_sha256: SHA_C },
        { case_id: "haas-rejection-01", input_sha256: SHA_C, parse_ok: false, error_code: "unknown G-code G99.99" },
      ],
    });
    // slimResponse strips empty arrays — nullish-coalesce each list to []
    const report = (r as { report: { total_runs: number; passed: boolean; hard_breaches?: unknown[]; missing_cases?: unknown[]; new_cases?: unknown[] } }).report;
    expect(report.total_runs).toBe(3);
    expect(report.passed).toBe(true);
    expect((report.missing_cases ?? []).length).toBe(0);
    expect((report.new_cases ?? []).length).toBe(0);
    expect((report.hard_breaches ?? []).length).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PGH — prism_dev :: pgh_to_snapshot", () => {
  it("snapshot reflects all 3 seeded cases in some form (object with keys)", async () => {
    const r = await invokeHandler(devHandler, "pgh_to_snapshot", {});
    const snap = (r as { snapshot: Record<string, unknown> }).snapshot;
    expect(typeof snap).toBe("object");
    expect(snap === null).toBe(false);
    // Snapshot must capture the 3 seeded golden cases somewhere in its shape —
    // assert this by stringifying + matching seeded ids.
    const serialized = JSON.stringify(snap);
    expect(serialized).toContain("fanuc-success-01");
    expect(serialized).toContain("okuma-success-01");
    expect(serialized).toContain("haas-rejection-01");
  });
});

// ────────────────────────────────────────────────────────────────────────
// PFH — ParserFuzzHarnessEngine
// ────────────────────────────────────────────────────────────────────────

describe("WIRE-UNWIRED-MS0/U-WIRE-PFH — Zod schemas", () => {
  it("pfh_list_corpus accepts {} or filters", () => {
    expect(ACTION_DEV_SCHEMAS["pfh_list_corpus"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["pfh_list_corpus"].safeParse({ dialect: "fanuc" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["pfh_list_corpus"].safeParse({ category: "valid" }).success).toBe(true);
  });

  it("pfh_get_corpus_entry requires non-empty input_sha256", () => {
    expect(ACTION_DEV_SCHEMAS["pfh_get_corpus_entry"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["pfh_get_corpus_entry"].safeParse({ input_sha256: "abc" }).success).toBe(true);
  });

  it("pfh_evaluate_batch caps observations at 10k (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["pfh_evaluate_batch"].safeParse({ observations: [] }).success).toBe(false);
    const big = Array.from({ length: 10_001 }, () => ({ input_sha256: "x" }));
    expect(ACTION_DEV_SCHEMAS["pfh_evaluate_batch"].safeParse({ observations: big }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PFH — prism_dev :: pfh_list_corpus", () => {
  it("no filter → exactly 2 seeded entries", async () => {
    const r = await invokeHandler(devHandler, "pfh_list_corpus", {});
    expect((r as { count?: number }).count).toBe(2);
    const entries = (r as { entries: Array<{ input_sha256: string }> }).entries;
    const shas = entries.map(e => e.input_sha256).sort();
    expect(shas).toEqual([SHA_A, SHA_B].sort());
  });

  it("dialect=fanuc → exactly 1 entry with input_sha256=SHA_A", async () => {
    const r = await invokeHandler(devHandler, "pfh_list_corpus", { dialect: "fanuc" });
    expect((r as { count?: number }).count).toBe(1);
    const entries = (r as { entries: Array<{ input_sha256: string }> }).entries;
    expect(entries[0]!.input_sha256).toBe(SHA_A);
  });

  it("dialect=nonexistent → 0 entries", async () => {
    const r = await invokeHandler(devHandler, "pfh_list_corpus", { dialect: "no_such_dialect_" + Date.now() });
    expect((r as { count?: number }).count ?? 0).toBe(0);
  });

  it("ROUTING PROOF — wire SHA set equals engine-direct listCorpus() SHA set", async () => {
    const r = await invokeHandler(devHandler, "pfh_list_corpus", {});
    const wireShas = ((r as { entries: Array<{ input_sha256: string }> }).entries).map(e => e.input_sha256).sort();
    const directShas = parserFuzzHarnessEngine.listCorpus().map(e => e.input_sha256).slice().sort();
    expect(wireShas).toEqual(directShas);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PFH — prism_dev :: pfh_get_corpus_entry", () => {
  it("known input_sha256 → found:true + dialect=fanuc + input_len_bytes=1024", async () => {
    const r = await invokeHandler(devHandler, "pfh_get_corpus_entry", { input_sha256: SHA_A });
    expect((r as { found?: boolean }).found).toBe(true);
    const entry = (r as { entry: { dialect: string; input_len_bytes: number } }).entry;
    expect(entry.dialect).toBe("fanuc");
    expect(entry.input_len_bytes).toBe(1024);
  });

  it("unknown input_sha256 → found:false", async () => {
    const r = await invokeHandler(devHandler, "pfh_get_corpus_entry", { input_sha256: "z".repeat(64) });
    expect((r as { found?: boolean }).found).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PFH — prism_dev :: pfh_list_crashes", () => {
  it("no crashes recorded → count:0", async () => {
    const r = await invokeHandler(devHandler, "pfh_list_crashes", {});
    expect((r as { count?: number }).count ?? 0).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PFH — prism_dev :: pfh_evaluate_batch", () => {
  it("evaluates 2 observations against P1/P2/P3 properties → report is a non-null object", async () => {
    // ParserObservation shape per engine: {parser_id, input_sha256, dialect,
    // parse_ok, ast_sha256?, error_code?, panicked?, panic_signature?,
    // duration_ms?, observed_at}.
    const now = Date.now();
    const r = await invokeHandler(devHandler, "pfh_evaluate_batch", {
      observations: [
        { parser_id: "cps-v2", input_sha256: SHA_A, dialect: "fanuc", parse_ok: true, ast_sha256: SHA_B, observed_at: now },
        { parser_id: "cps-v2", input_sha256: SHA_B, dialect: "okuma", parse_ok: true, ast_sha256: SHA_C, observed_at: now },
      ],
    });
    const report = (r as { report: Record<string, unknown> }).report;
    expect(typeof report).toBe("object");
    expect(report === null).toBe(false);
    expect(Object.keys(report).length).toBeGreaterThan(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PFH — prism_dev :: pfh_to_snapshot", () => {
  it("snapshot serializes both seeded corpus SHAs", async () => {
    const r = await invokeHandler(devHandler, "pfh_to_snapshot", {});
    const snap = (r as { snapshot: Record<string, unknown> }).snapshot;
    expect(typeof snap).toBe("object");
    expect(snap === null).toBe(false);
    const serialized = JSON.stringify(snap);
    expect(serialized).toContain(SHA_A);
    expect(serialized).toContain(SHA_B);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PGH+PFH — error envelope", () => {
  it("pgh_get_case without case_id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "pgh_get_case", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("pgh_evaluate with empty runs → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "pgh_evaluate", { runs: [] });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("pfh_get_corpus_entry without input_sha256 → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "pfh_get_corpus_entry", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
