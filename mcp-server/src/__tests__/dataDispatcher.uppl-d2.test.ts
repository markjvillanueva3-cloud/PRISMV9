/**
 * U-PPL-D2 — E2E: prism_data dispatcher actions for the print-pointer surface.
 *
 * Verifies the dispatcher wiring (case + lazy import + Zod schema + action
 * enum all match) and that the auto-link orchestration around
 * ProgramPrintLinkIndexEngine.lookupPrintForProgram plumbs through.
 *
 * Pattern mirrors dataDispatcher.uppl-d1.test.ts (MockMCPServer +
 * registerDataDispatcher + content-envelope unwrap).
 *
 * Coverage floor:
 *   - Happy path (4): explicit save link, auto save link, explicit link_print,
 *     auto link_print.
 *   - Failure modes (≥3): unknown record on link_print, explicit mode without
 *     path/conf throws, auto mode without program_path throws,
 *     miss-on-auto preserves existing link.
 *   - Adversarial inputs (≥2): missing join file (auto-link gracefully fails,
 *     save proceeds), clear-mode on already-empty record.
 *   - Round-trip: save+recall reflects link end-to-end; auto_link=false suppresses.
 *
 * @milestone MS-PRINT-PROGRAM-LOOP
 * @unit U-PPL-D2
 * @track D
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";
import { programMemoryEngine } from "../engines/ProgramMemoryEngine.js";

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

const STANDARD_ASSIGNMENTS = [
  {
    station: 1,
    tool_id: "T0101",
    tool_description: "OD ROUGH",
    operation_type: "rough_od",
    speed_rpm: 1800,
    feed_rate: 0.012,
    notes: null,
  },
];

let server: MockMCPServer;
let tmpDir: string;
let tmpJoin: string;
let tmpJoinEmpty: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppl-d2-disp-"));
  // A non-empty join with a single AGRATI program ↔ print pairing.
  tmpJoin = path.join(tmpDir, "join.jsonl");
  const rows = [
    {
      part_number: "9082526",
      part_number_normalized: "9082526",
      blueprints: [
        { doc_id: "bp-9082526", filename: "9082526.pdf", page_index: 3, drawing_score: 1 },
      ],
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
  ];
  fs.writeFileSync(tmpJoin, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");

  // An empty join — present-but-zero-rows for the miss-preserves-link test.
  tmpJoinEmpty = path.join(tmpDir, "empty.jsonl");
  fs.writeFileSync(tmpJoinEmpty, "", "utf-8");
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  server = new MockMCPServer();
  registerDataDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
  programMemoryEngine.clear();
});

describe("box_program_memory_save — auto-link orchestration (U-PPL-D2)", () => {
  it("attaches an explicit link when caller supplies linked_blueprint_path + confidence", async () => {
    const r = await call(server, "box_program_memory_save", {
      customer: "ITW",
      part_number: "T8047D3",
      filename: "T8047D3.MIN",
      dialect: "okuma_osp",
      assignments: STANDARD_ASSIGNMENTS,
      linked_blueprint_path: "/explicit.pdf",
      linked_blueprint_confidence: "exact",
      linked_blueprint_page: 1,
    });
    expect(r.ok).toBe(true);
    const record = r.data as Record<string, unknown>;
    expect(record.linked_blueprint_path).toBe("/explicit.pdf");
    expect(record.linked_blueprint_confidence).toBe("exact");
    expect(record.linked_blueprint_page).toBe(1);
  });

  it("auto-resolves a blueprint pointer via the v6 join when program_path is supplied", async () => {
    const r = await call(server, "box_program_memory_save", {
      customer: "AGRATI",
      part_number: "9082526",
      filename: "9082526.MIN",
      dialect: "fanuc_31i",
      assignments: STANDARD_ASSIGNMENTS,
      program_path: "H:/jm/programs/9082526.MIN",
      join_jsonl_path: tmpJoin,
    });
    expect(r.ok).toBe(true);
    const record = r.data as Record<string, unknown>;
    // Reviewer B P0 fix — must resolve to the BlueprintRef.filename ("9082526.pdf"),
    // NOT the doc_id ("bp-9082526"). A doc-id starting with "bp-" would mean
    // the dispatcher attached the parent join row's reference instead of the
    // filename. Pin the assertion to the concrete fixture value.
    expect(record.linked_blueprint_path).toBe("9082526.pdf");
    // page_index in the fixture is 3 → 1-indexed page should be 4
    expect(record.linked_blueprint_page).toBe(4);
    // confidence must be one of the v6 confidence strings (test fixture used "exact")
    expect(record.linked_blueprint_confidence).toBe("exact");
  });

  it("save proceeds normally when auto-link finds no match (no link attached)", async () => {
    const r = await call(server, "box_program_memory_save", {
      customer: "ITW",
      part_number: "ORPHAN",
      filename: "ORPHAN.MIN",
      dialect: "fanuc",
      assignments: STANDARD_ASSIGNMENTS,
      program_path: "H:/no-match.MIN",
      join_jsonl_path: tmpJoin,
    });
    expect(r.ok).toBe(true);
    const record = r.data as Record<string, unknown>;
    expect("linked_blueprint_path" in record).toBe(false);
    expect(record.part_number).toBe("ORPHAN");
  });

  it("auto_link=false suppresses resolution even when program_path is set", async () => {
    const r = await call(server, "box_program_memory_save", {
      customer: "ITW",
      part_number: "P",
      filename: "P.MIN",
      dialect: "fanuc",
      assignments: STANDARD_ASSIGNMENTS,
      program_path: "H:/jm/programs/9082526.MIN",
      join_jsonl_path: tmpJoin,
      auto_link: false,
    });
    expect(r.ok).toBe(true);
    const record = r.data as Record<string, unknown>;
    expect("linked_blueprint_path" in record).toBe(false);
  });

  it("auto-link FAIL-LOUDly warns + still completes save when join file is missing", async () => {
    const r = await call(server, "box_program_memory_save", {
      customer: "ITW",
      part_number: "MISS",
      filename: "MISS.MIN",
      dialect: "fanuc",
      assignments: STANDARD_ASSIGNMENTS,
      program_path: "/anywhere.MIN",
      join_jsonl_path: "/does-not-exist.jsonl",
    });
    expect(r.ok).toBe(true);
    const record = r.data as Record<string, unknown>;
    expect(record.part_number).toBe("MISS");
    expect("linked_blueprint_path" in record).toBe(false);
  });
});

describe("box_program_memory_link_print — three modes (U-PPL-D2)", () => {
  it("mode=explicit attaches a link to an existing record", async () => {
    await call(server, "box_program_memory_save", {
      customer: "ITW",
      part_number: "EX1",
      filename: "EX1.MIN",
      dialect: "fanuc",
      assignments: STANDARD_ASSIGNMENTS,
    });
    const r = await call(server, "box_program_memory_link_print", {
      customer: "ITW",
      part_number: "EX1",
      mode: "explicit",
      linked_blueprint_path: "/posthoc.pdf",
      linked_blueprint_confidence: "filename_loose",
      linked_blueprint_page: 2,
    });
    expect(r.ok).toBe(true);
    const record = r.data as Record<string, unknown>;
    expect(record.linked_blueprint_path).toBe("/posthoc.pdf");
    expect(record.linked_blueprint_confidence).toBe("filename_loose");
    expect(record.linked_blueprint_page).toBe(2);
  });

  it("mode=auto resolves via the v6 join when program_path is supplied", async () => {
    await call(server, "box_program_memory_save", {
      customer: "AGRATI",
      part_number: "9082526",
      filename: "9082526.MIN",
      dialect: "fanuc_31i",
      assignments: STANDARD_ASSIGNMENTS,
    });
    const r = await call(server, "box_program_memory_link_print", {
      customer: "AGRATI",
      part_number: "9082526",
      mode: "auto",
      program_path: "H:/jm/programs/9082526.MIN",
      join_jsonl_path: tmpJoin,
    });
    expect(r.ok).toBe(true);
    const record = r.data as Record<string, unknown>;
    // Reviewer B P0 fix — must resolve doc_id → filename via parent v6 row.
    expect(record.linked_blueprint_path).toBe("9082526.pdf");
    expect(record.linked_blueprint_page).toBe(4);
    expect(record.linked_blueprint_confidence).toBe("exact");
  });

  it("mode=clear strips a prior link", async () => {
    await call(server, "box_program_memory_save", {
      customer: "ITW",
      part_number: "CL1",
      filename: "CL1.MIN",
      dialect: "fanuc",
      assignments: STANDARD_ASSIGNMENTS,
      linked_blueprint_path: "/strip-me.pdf",
      linked_blueprint_confidence: "exact",
    });
    const r = await call(server, "box_program_memory_link_print", {
      customer: "ITW",
      part_number: "CL1",
      mode: "clear",
    });
    expect(r.ok).toBe(true);
    const record = r.data as Record<string, unknown>;
    expect("linked_blueprint_path" in record).toBe(false);
  });

  it("returns null record when no memory exists for the customer/part", async () => {
    const r = await call(server, "box_program_memory_link_print", {
      customer: "GHOST",
      part_number: "Z999",
      mode: "explicit",
      linked_blueprint_path: "/x.pdf",
      linked_blueprint_confidence: "exact",
    });
    expect(r.ok).toBe(true);
    // engine returns null for unknown record → dispatcher wraps as data:null
    expect(r.data).toBeNull();
  });

  it("FAILS LOUDLY when mode=explicit but linked_blueprint_path is missing", async () => {
    await call(server, "box_program_memory_save", {
      customer: "ITW",
      part_number: "EX2",
      filename: "EX2.MIN",
      dialect: "fanuc",
      assignments: STANDARD_ASSIGNMENTS,
    });
    const r = await call(server, "box_program_memory_link_print", {
      customer: "ITW",
      part_number: "EX2",
      mode: "explicit",
      linked_blueprint_confidence: "exact",
    });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data)).toMatch(/mode=explicit requires/);
  });

  it("FAILS LOUDLY when mode=auto but program_path is missing", async () => {
    await call(server, "box_program_memory_save", {
      customer: "ITW",
      part_number: "AU2",
      filename: "AU2.MIN",
      dialect: "fanuc",
      assignments: STANDARD_ASSIGNMENTS,
    });
    const r = await call(server, "box_program_memory_link_print", {
      customer: "ITW",
      part_number: "AU2",
      mode: "auto",
    });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data)).toMatch(/mode=auto requires program_path/);
  });

  it("mode=auto with a miss returns the unchanged record (does NOT clear existing link)", async () => {
    await call(server, "box_program_memory_save", {
      customer: "ITW",
      part_number: "AU3",
      filename: "AU3.MIN",
      dialect: "fanuc",
      assignments: STANDARD_ASSIGNMENTS,
      linked_blueprint_path: "/keep.pdf",
      linked_blueprint_confidence: "exact",
    });
    const r = await call(server, "box_program_memory_link_print", {
      customer: "ITW",
      part_number: "AU3",
      mode: "auto",
      program_path: "/nothing-here.MIN",
      join_jsonl_path: tmpJoinEmpty,
    });
    expect(r.ok).toBe(true);
    const record = r.data as Record<string, unknown>;
    expect(record.linked_blueprint_path).toBe("/keep.pdf");
  });
});

describe("Action enum + schema wiring round-trip (U-PPL-D2)", () => {
  it("box_program_memory_link_print is reachable through the dispatcher", async () => {
    const r = await call(server, "box_program_memory_link_print", {
      customer: "PROBE",
      part_number: "P1",
      mode: "clear",
    });
    expect(r.ok).toBe(true);
  });

  it("recall after save reflects the link attachment end-to-end", async () => {
    await call(server, "box_program_memory_save", {
      customer: "ITW",
      part_number: "RT99",
      filename: "RT99.MIN",
      dialect: "okuma_osp",
      assignments: STANDARD_ASSIGNMENTS,
      linked_blueprint_path: "/round-trip.pdf",
      linked_blueprint_confidence: "exact",
      linked_blueprint_page: 3,
    });
    const r = await call(server, "box_program_memory_recall", {
      customer: "ITW",
      part_number: "RT99",
    });
    expect(r.ok).toBe(true);
    const record = r.data as Record<string, unknown>;
    expect(record.linked_blueprint_path).toBe("/round-trip.pdf");
    expect(record.linked_blueprint_confidence).toBe("exact");
    expect(record.linked_blueprint_page).toBe(3);
  });
});
