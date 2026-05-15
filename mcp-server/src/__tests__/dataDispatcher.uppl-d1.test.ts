/**
 * dataDispatcher — U-PPL-D1 round-trip suite
 * ===========================================
 *
 * MS-PRINT-PROGRAM-LOOP / U-PPL-D1 (Track D) — prism_data mirror of the
 * ProgramPrintLinkIndexEngine surfaces already wired into prism_dev. Pure
 * registry-style read lookups: the dispatcher case blocks lazy-import the
 * engine, validate params, call the module-level functions, and return
 * {success:true, data:{...}} envelopes. No physics, no compute.
 *
 * The two surfaces:
 *   - program_print_link_lookup   — bidirectional resolver (print↔program)
 *   - program_print_link_coverage — confidence breakdown + disk gap report
 *
 * Coverage floor (per comprehensive-build-enforce):
 *   • Happy path (3 tests)            — both directions + coverage
 *   • Schema rejection (4 tests)      — missing required, wrong enum, empty
 *   • Adversarial (3 tests)           — unknown PN, garbage path, oversize
 *   • Regression (2 tests)            — both actions registered in enum
 *
 * Fixture strategy mirrors ProgramPrintLinkIndexEngine.test.ts (tmp JSONL).
 *
 * @milestone MS-PRINT-PROGRAM-LOOP
 * @unit U-PPL-D1
 * @track D
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
let tmpDir: string;
let tmpJoin: string;

beforeAll(() => {
  // Mirror the engine-test fixture exactly so the dispatcher exercises the same
  // composite-load path the engine tests cover. Two PN rows — one with a program
  // ref + exact match, one with no program + loose match — give us coverage
  // confidence-breakdown variability and a non-empty seed-rescue surface.
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppl-d1-disp-"));
  tmpJoin = path.join(tmpDir, "blueprint-program-join.jsonl");
  const rows = [
    {
      part_number: "9082526",
      part_number_normalized: "9082526",
      blueprints: [{ doc_id: "bp-9082526", filename: "bp.pdf", page_index: 0, drawing_score: 1 }],
      programs: [
        {
          source_path: "H:/jm/programs/9082526.MIN",
          filename: "9082526.MIN",
          kind: "program",
          kind3: "g_code",
          via: "exact",
        },
      ],
      match_confidence: "exact",
      n_programs: 1,
    },
    {
      part_number: "8047D3",
      part_number_normalized: "8047D3",
      blueprints: [{ doc_id: "bp-8047D3", filename: "bp2.pdf", page_index: 0, drawing_score: 1 }],
      programs: [],
      match_confidence: "loose",
    },
  ];
  fs.writeFileSync(tmpJoin, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  server = new MockMCPServer();
  registerDataDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. Happy paths — both directions + coverage (3 tests)
// ─────────────────────────────────────────────────────────────────────
describe("U-PPL-D1 happy paths — round-trip via prism_data", () => {
  it("program_print_link_lookup direction=print_for_program — resolves program path → print", async () => {
    const r = await call(server, "program_print_link_lookup", {
      direction: "print_for_program",
      query: "H:/jm/programs/9082526.MIN",
      join_jsonl_path: tmpJoin,
    });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    const payload = r.data.data as { direction: string; lookup: { found: boolean } };
    expect(payload.direction).toBe("print_for_program");
    expect(payload.lookup.found).toBe(true);
  });

  it("program_print_link_lookup direction=program_for_print — resolves PN → programs via seed", async () => {
    const r = await call(server, "program_print_link_lookup", {
      direction: "program_for_print",
      query: "8047D3",
      input_program_paths: ["H:/jm/programs/T8047D3 ITW.MIN"],
      join_jsonl_path: tmpJoin,
    });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    const payload = r.data.data as { direction: string; lookup: { found: boolean; sources: string[] } };
    expect(payload.direction).toBe("program_for_print");
    expect(payload.lookup.found).toBe(true);
    // The enhanced PN normalizer ("T8047D3 ITW" → "8047D3") rescues this via program_seed.
    expect(payload.lookup.sources).toContain("program_seed");
  });

  it("program_print_link_coverage — confidence breakdown + disk gap stats", async () => {
    const r = await call(server, "program_print_link_coverage", {
      join_jsonl_path: tmpJoin,
      input_program_paths: ["H:/jm/programs/T8047D3 ITW.MIN"],
      archive_program_paths: [
        "H:/jm/programs/9082526.MIN",
        "H:/jm/programs/T8047D3 ITW.MIN",
        "H:/jm/programs/unknown-99999.MIN",
      ],
    });
    expect(r.ok).toBe(true);
    const payload = r.data.data as {
      report: {
        join_stats: { rows: number; confidence_breakdown: Record<string, number> };
        disk_side: { archive_paths_scanned: number; in_v6_join: number; rescued_by_seed: number; still_orphan: number; orphan_rate_pct: number };
      };
    };
    expect(payload.report.join_stats.rows).toBe(2);
    expect(payload.report.join_stats.confidence_breakdown.exact).toBe(1);
    expect(payload.report.join_stats.confidence_breakdown.loose).toBe(1);
    expect(payload.report.disk_side.archive_paths_scanned).toBe(3);
    // 9082526.MIN is in the v6 join; T8047D3 is rescued by the seed; unknown-99999 is orphan.
    expect(payload.report.disk_side.in_v6_join).toBe(1);
    expect(payload.report.disk_side.rescued_by_seed).toBe(1);
    expect(payload.report.disk_side.still_orphan).toBe(1);
    // orphan_rate_pct = 1/3 ≈ 33.33% — load-bearing for downstream training-set sizing.
    expect(payload.report.disk_side.orphan_rate_pct).toBeCloseTo(33.33, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Schema rejection — invalid inputs (4 tests)
// ─────────────────────────────────────────────────────────────────────
describe("U-PPL-D1 schema rejection", () => {
  it("program_print_link_lookup — rejects missing direction", async () => {
    const r = await call(server, "program_print_link_lookup", {
      query: "9082526",
    });
    expect(r.ok).toBe(false);
  });

  it("program_print_link_lookup — rejects invalid direction enum", async () => {
    const r = await call(server, "program_print_link_lookup", {
      direction: "sideways_resolve",
      query: "9082526",
    });
    expect(r.ok).toBe(false);
  });

  it("program_print_link_lookup — rejects missing query", async () => {
    const r = await call(server, "program_print_link_lookup", {
      direction: "print_for_program",
    });
    expect(r.ok).toBe(false);
  });

  it("program_print_link_lookup — rejects empty-string query (engine-level guard)", async () => {
    const r = await call(server, "program_print_link_lookup", {
      direction: "print_for_program",
      query: "   ",
      join_jsonl_path: tmpJoin,
    });
    // Schema passes (min(1) is on the literal char count, "   " has 3 chars), but the
    // dispatcher's trim+length guard catches it as a structured error envelope rather
    // than crashing — this is the explicit "query is required" branch in the case block.
    expect(r.ok).toBe(false);
    expect(typeof r.data).toBe("object");
    const errPayload = r.data as Record<string, unknown>;
    const errText = JSON.stringify(errPayload);
    expect(errText.toLowerCase()).toMatch(/query/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Adversarial edge cases (3 tests)
// ─────────────────────────────────────────────────────────────────────
describe("U-PPL-D1 adversarial edge cases", () => {
  it("program_print_link_lookup — unknown PN returns found=false without crashing", async () => {
    const r = await call(server, "program_print_link_lookup", {
      direction: "program_for_print",
      query: "XYZ-NEVER-EXISTED-99999",
      join_jsonl_path: tmpJoin,
    });
    expect(r.ok).toBe(true);
    const payload = r.data.data as { lookup: { found: boolean } };
    expect(payload.lookup.found).toBe(false);
  });

  it("program_print_link_lookup — garbage program path returns found=false without crashing", async () => {
    const r = await call(server, "program_print_link_lookup", {
      direction: "print_for_program",
      query: "::not-a-real-path::\\\\garbage\\\\file.exe",
      join_jsonl_path: tmpJoin,
    });
    expect(r.ok).toBe(true);
    const payload = r.data.data as { lookup: { found: boolean } };
    expect(payload.lookup.found).toBe(false);
  });

  it("program_print_link_lookup — missing join file produces FAIL-LOUD structured error", async () => {
    const r = await call(server, "program_print_link_lookup", {
      direction: "print_for_program",
      query: "9082526",
      join_jsonl_path: path.join(tmpDir, "never-existed.jsonl"),
    });
    // loadLinkIndex throws on missing v6 join (per its FAIL-LOUD contract); the
    // dispatcher catch wraps that into dispatcherError so the operator sees a
    // structured envelope rather than a thrown stack.
    expect(r.ok).toBe(false);
    expect(typeof r.data).toBe("object");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Regression — both actions in enum + schema map (2 tests)
// ─────────────────────────────────────────────────────────────────────
describe("U-PPL-D1 regression guards", () => {
  it("dispatcher accepts program_print_link_lookup (not 'Unknown action')", async () => {
    const r = await call(server, "program_print_link_lookup", {
      direction: "print_for_program",
      query: "9082526",
      join_jsonl_path: tmpJoin,
    });
    // Either the success or structured-error path is acceptable here — what we're
    // asserting is the dispatcher does NOT return {"error":"Unknown action: …"}.
    const errText = JSON.stringify(r.data);
    expect(errText).not.toMatch(/Unknown action/);
  });

  it("dispatcher accepts program_print_link_coverage (not 'Unknown action')", async () => {
    const r = await call(server, "program_print_link_coverage", {
      join_jsonl_path: tmpJoin,
    });
    const errText = JSON.stringify(r.data);
    expect(errText).not.toMatch(/Unknown action/);
  });
});
