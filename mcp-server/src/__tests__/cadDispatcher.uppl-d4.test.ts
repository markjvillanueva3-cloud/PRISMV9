/**
 * cadDispatcher.uppl-d4.test.ts — MS-PRINT-PROGRAM-LOOP/U-PPL-D4 dispatcher
 * round-trip tests for the 2 actions `cad_archive_join_augment` and
 * `cad_archive_join_augment_dry`.
 *
 * Why this file: per CLAUDE.md the engine test verifies the pure-transform
 * kernel; THIS file verifies the dispatcher wiring round-trips (action enum
 * + lazy import + case block + Zod schema), so a contract drift in any of
 * those four surfaces fails loudly here.
 *
 * I/O strategy: tests use the engine's `masterIndexPath` knob to point at a
 * temp-file fixture (real disk read, no mock). The v6 join JSONL load step
 * is exercised separately by `BlueprintProgramJoinEngine.test.ts` — these
 * tests only assert the dispatcher envelope shape + the engine's fail-loud
 * paths for missing/malformed master-index.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (res && res.success === false) return res;
  const content = res.content as Array<{ type: string; text: string }> | undefined;
  const text = content?.[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(
    server as unknown as Parameters<typeof registerCadDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

describe("cadDispatcher U-PPL-D4 actions are registered", () => {
  it("both action names appear in the Zod enum (no contract drift)", async () => {
    // A bogus param triggers schema-level validation (action enum check).
    // If the action isn't in the enum, the dispatcher rejects it before the
    // case block — we'd see a `schemaValidation` error. With the action in
    // the enum, the call reaches the engine which then throws on the
    // nonexistent master-index — we get an engine-side error envelope.
    const r1 = await invoke("cad_archive_join_augment", {
      masterIndexPath: "H:/__nonexistent__/master-index.json",
    });
    // Either error is fine — the assertion is that we did NOT get a
    // schema-level "unknown action" rejection.
    const errMsg = JSON.stringify(r1).toLowerCase();
    expect(errMsg.includes("unknown action")).toBe(false);
    expect(errMsg.includes("invalid action")).toBe(false);

    const r2 = await invoke("cad_archive_join_augment_dry", {
      masterIndexPath: "H:/__nonexistent__/master-index.json",
    });
    const errMsg2 = JSON.stringify(r2).toLowerCase();
    expect(errMsg2.includes("unknown action")).toBe(false);
    expect(errMsg2.includes("invalid action")).toBe(false);
  });
});

describe("cad_archive_join_augment_dry — envelope shape", () => {
  let tmpDir: string;
  let masterIndexPath: string;
  let joinJsonlPath: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "uppl-d4-"));
    masterIndexPath = path.join(tmpDir, "master-index.json");
    fs.writeFileSync(
      masterIndexPath,
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: "2026-05-15T00:00:00Z",
        rootPaths: [],
        totalFiles: 0,
        byFormat: {},
        byMachineCategory: {},
        byCustomer: {},
        files: [],
      }),
      "utf8",
    );
    // REAL minimal v6 join JSONL — 1 row keyed by PN "8047D3". loadJoinIndex
    // rejects 0-row files ("yielded 0 valid rows") so the fixture MUST carry
    // a parsable row (shape per isJoinIndexRow at BlueprintProgramJoinEngine.ts:764).
    // Arm B of end-of-task 3-of-3 scrutiny gate caught the prior "empty file"
    // dead-code branch; this is the fix.
    joinJsonlPath = path.join(tmpDir, "join.jsonl");
    fs.writeFileSync(
      joinJsonlPath,
      JSON.stringify({
        part_number: "8047D3",
        part_number_normalized: "8047D3",
        blueprints: [
          { doc_id: "d-8047", filename: "8047D3.pdf", page_index: 0, drawing_score: 0.9 },
        ],
        programs: [],
        match_confidence: "exact",
        has_program: false,
      }) + "\n",
      "utf8",
    );
  });

  it("returns success:true envelope with stats + newLinkCount=0 (empty master-index, populated join)", async () => {
    const r = await invoke("cad_archive_join_augment_dry", {
      masterIndexPath,
      joinJsonlPath,
    });
    expect(typeof r).toBe("object");
    expect(r === null).toBe(false);
    expect(r.success).toBe(true);
    // master-index has 0 entries → 0 new links regardless of how many PNs
    // are in the join fixture.
    expect(typeof r.newLinkCount).toBe("number");
    expect(r.newLinkCount).toBe(0);
    expect(typeof r.stats).toBe("object");
    // dry variant MUST NOT include the newLinks payload.
    expect("newLinks" in r).toBe(false);
    const stats = r.stats as Record<string, number>;
    expect(stats.newLinks).toBe(0);
    expect(stats.cadEntriesScanned).toBe(0);
    expect(stats.cadZipMisses).toBe(0);
  });

  it("missing master-index file → error envelope mentions master-index", async () => {
    const r = await invoke("cad_archive_join_augment_dry", {
      masterIndexPath: "H:/__nonexistent__/__never__/master-index.json",
    });
    expect(r.success).toBe(false);
    const errText = JSON.stringify(r).toLowerCase();
    const hasIdentifyingToken =
      errText.includes("master-index") ||
      errText.includes("not found") ||
      errText.includes("enoent") ||
      errText.includes("exist");
    expect(hasIdentifyingToken).toBe(true);
  });
});

describe("cad_archive_join_augment — envelope with newLinks", () => {
  let tmpDir: string;
  let masterIndexPath: string;
  let joinJsonlPath: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "uppl-d4-full-"));
    masterIndexPath = path.join(tmpDir, "master-index.json");
    fs.writeFileSync(
      masterIndexPath,
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: "2026-05-15T00:00:00Z",
        rootPaths: ["H:/PRISM/JM DIE"],
        totalFiles: 1,
        byFormat: { ".ipt": 1 },
        byMachineCategory: { mill: 1 },
        byCustomer: { ITW: 1 },
        files: [
          {
            fileId: "a".repeat(64),
            absolutePath: "H:/PRISM/JM DIE/MILL/ITW/T8047D3 ITW.ipt",
            format: ".ipt",
            sizeBytes: 123456,
            customer: "ITW",
            machineCategory: "mill",
            complexityHint: "moderate",
            lastModified: "2026-05-15T00:00:00Z",
          },
        ],
      }),
      "utf8",
    );
    // REAL minimal v6 join JSONL — 1 row PN "8047D3" matching the .ipt
    // entry's normalized PN. loadJoinIndex rejects 0-row files.
    joinJsonlPath = path.join(tmpDir, "join.jsonl");
    fs.writeFileSync(
      joinJsonlPath,
      JSON.stringify({
        part_number: "8047D3",
        part_number_normalized: "8047D3",
        blueprints: [
          { doc_id: "d-8047", filename: "8047D3.pdf", page_index: 0, drawing_score: 0.9 },
        ],
        programs: [],
        match_confidence: "exact",
        has_program: false,
      }) + "\n",
      "utf8",
    );
  });

  it("returns success:true envelope with stats AND newLinks matching the 8047D3 PN", async () => {
    const r = await invoke("cad_archive_join_augment", {
      masterIndexPath,
      joinJsonlPath,
    });
    expect(typeof r).toBe("object");
    expect(r === null).toBe(false);
    expect(r.success).toBe(true);
    expect(typeof r.stats).toBe("object");
    expect(Array.isArray(r.newLinks)).toBe(true);
    // The 1 master-index entry (T8047D3 ITW.ipt) extracts to normalized PN
    // "8047D3" which IS in the v6 join fixture → 1 new enriched link.
    const links = r.newLinks as Array<Record<string, unknown>>;
    expect(links.length).toBe(1);
    expect(links[0]!.matched_normalized_pn).toBe("8047D3");
    expect(links[0]!.cad_customer).toBe("ITW");
    expect(links[0]!.cad_format).toBe(".ipt");
    const stats = r.stats as Record<string, number>;
    expect(stats.cadEntriesScanned).toBe(1);
    expect(stats.millEligibleEntries).toBe(1);
    expect(stats.newLinks).toBe(1);
    expect(stats.cadZipMisses).toBe(0);
  });

  it("formats override as ARRAY (JSON-serializable) is coerced to Set internally — Arm C fix", async () => {
    // Arm C of end-of-task 3-of-3 scrutiny gate caught a silent-breakage bug:
    // the Zod schema declares `formats: z.array(z.string())` because JSON
    // can't serialize a Set across the MCP boundary, but the engine
    // originally called `opts.formats.has(...)` — which on an Array returns
    // undefined and silently rejected every entry. This test pins the
    // coercion: a single-element array allowlist must still match the
    // 1 mill-eligible .ipt entry (i.e., NOT silently reject it).
    const r = await invoke("cad_archive_join_augment_dry", {
      masterIndexPath,
      joinJsonlPath,
      formats: [".ipt"],
    });
    expect(r.success).toBe(true);
    const stats = r.stats as Record<string, number>;
    // The .ipt entry must survive the array-based allowlist filter.
    expect(stats.millEligibleEntries).toBe(1);
    expect(stats.skippedNonMillFormat).toBe(0);
  });

  it("formats override REJECTS entries outside the allowlist (array path)", async () => {
    // .step is NOT in the allowlist → the .ipt entry should be REJECTED.
    const r = await invoke("cad_archive_join_augment_dry", {
      masterIndexPath,
      joinJsonlPath,
      formats: [".step"],
    });
    expect(r.success).toBe(true);
    const stats = r.stats as Record<string, number>;
    expect(stats.millEligibleEntries).toBe(0);
    expect(stats.skippedNonMillFormat).toBe(1);
  });
});

describe("schema validation — Zod rejects bad input shapes", () => {
  it("rejects millOnly when not a boolean", async () => {
    const r = await invoke("cad_archive_join_augment_dry", {
      millOnly: "yes" as unknown as boolean,
    });
    expect(r.success).toBe(false);
  });

  it("rejects masterIndexPath when not a string", async () => {
    const r = await invoke("cad_archive_join_augment_dry", {
      masterIndexPath: 42 as unknown as string,
    });
    expect(r.success).toBe(false);
  });

  it("rejects maxLineBytes when negative", async () => {
    const r = await invoke("cad_archive_join_augment_dry", {
      masterIndexPath: "H:/__nonexistent__/master-index.json",
      maxLineBytes: -1,
    });
    expect(r.success).toBe(false);
  });

  it("rejects maxLineBytes when non-integer", async () => {
    const r = await invoke("cad_archive_join_augment_dry", {
      masterIndexPath: "H:/__nonexistent__/master-index.json",
      maxLineBytes: 1.5,
    });
    expect(r.success).toBe(false);
  });
});
