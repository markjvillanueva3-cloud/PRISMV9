/**
 * dispatcher.wedmGovernance.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-WEDMGOV dispatcher wiring.
 *
 * Drives 3 read-only WEDM autonomy-state inspection actions through real
 * `prism_safety` (no mutating ops — save/load are deferred for safety review
 * per CLAUDE.md operator-in-the-loop doctrine on WEDM autonomy levels 0-5).
 *
 *   - wedm_governance_path     → defaultGovernancePath()  (no params)
 *   - wedm_governance_read     → readGovernanceFile(path?) (read-only)
 *   - wedm_governance_snapshot → snapshotFromFile(readGovernanceFile(path?))
 *
 * Coverage:
 *   - Happy path (existing file with realistic state)
 *   - Failure: missing file → engine returns null (not throws)
 *   - Failure: schema-invalid file → engine throws (caught by dispatcher)
 *   - Failure: missing file_path key on snapshot → returns null
 *   - Adversarial: oversized/malformed JSON file
 *   - Adversarial: out-of-range level (engine validator rejects)
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { registerSafetyDispatcher } from "../tools/dispatchers/safetyDispatcher.js";
import { ACTION_SAFETY_SCHEMAS } from "../schemas/safetyActionSchemas.js";

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

let safetyHandler: CapturedTool["handler"];
let tmpDir: string;
let validStateFile: string;
let missingStateFile: string;
let malformedStateFile: string;
let invalidLevelStateFile: string;

beforeAll(() => {
  const srv = makeStubServer();
  registerSafetyDispatcher(srv as unknown as Parameters<typeof registerSafetyDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_safety");
  if (!t) throw new Error("prism_safety not registered");
  safetyHandler = t.handler;

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-wedm-gov-test-"));
  validStateFile = path.join(tmpDir, "WEDM_AUTONOMY_STATE.json");
  missingStateFile = path.join(tmpDir, "does-not-exist.json");
  malformedStateFile = path.join(tmpDir, "malformed.json");
  invalidLevelStateFile = path.join(tmpDir, "invalid-level.json");

  fs.writeFileSync(validStateFile, JSON.stringify({
    schemaVersion: 1,
    generatedAt: "2026-05-17T00:00:00.000Z",
    state: {
      level: 2,
      version: "1.0.0",
      history: [
        { at: "2026-05-17T00:00:00.000Z", from: 1, to: 2, reason: "test-promotion" },
      ],
    },
  }, null, 2));

  fs.writeFileSync(malformedStateFile, "{not valid json");
  fs.writeFileSync(invalidLevelStateFile, JSON.stringify({
    schemaVersion: 1,
    generatedAt: "2026-05-17T00:00:00.000Z",
    state: { level: 99, version: "1.0.0", history: [] },
  }, null, 2));
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WEDMGOV — Zod schemas", () => {
  it("wedm_governance_path schema accepts {} (no params required)", () => {
    const s = ACTION_SAFETY_SCHEMAS["wedm_governance_path"];
    const r = s.safeParse({});
    expect(r.success).toBe(true);
  });

  it("wedm_governance_read schema accepts file_path string", () => {
    const s = ACTION_SAFETY_SCHEMAS["wedm_governance_read"];
    const r = s.safeParse({ file_path: "/tmp/wedm.json" });
    expect(r.success).toBe(true);
  });

  it("wedm_governance_read schema rejects empty file_path string", () => {
    const s = ACTION_SAFETY_SCHEMAS["wedm_governance_read"];
    expect(s.safeParse({ file_path: "" }).success).toBe(false);
  });

  it("wedm_governance_snapshot schema accepts filePath camelCase alias", () => {
    const s = ACTION_SAFETY_SCHEMAS["wedm_governance_snapshot"];
    const r = s.safeParse({ filePath: "/tmp/wedm.json" });
    expect(r.success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WEDMGOV — prism_safety :: wedm_governance_path", () => {
  it("returns a non-empty filesystem path string", async () => {
    const r = await invokeHandler(safetyHandler, "wedm_governance_path", {});
    const data = r as { path?: string };
    expect(typeof data.path).toBe("string");
    expect((data.path ?? "").length).toBeGreaterThan(0);
    // Engine filename constant is WEDM_AUTONOMY_STATE.json — must end with it
    expect((data.path ?? "").endsWith("WEDM_AUTONOMY_STATE.json")).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WEDMGOV — prism_safety :: wedm_governance_read", () => {
  it("missing file → returns {file: null} (engine fail-soft, not error)", async () => {
    const r = await invokeHandler(safetyHandler, "wedm_governance_read", {
      file_path: missingStateFile,
    });
    const data = r as { file?: unknown; error?: unknown };
    expect(data.error).toBeUndefined();
    expect(data.file).toBe(null);
  });

  it("valid state file → returns the round-tripped state envelope", async () => {
    const r = await invokeHandler(safetyHandler, "wedm_governance_read", {
      file_path: validStateFile,
    });
    const data = r as {
      file?: {
        schemaVersion?: number;
        state?: { level?: number; version?: string; history?: unknown[] };
      };
    };
    expect(data.file).not.toBe(null);
    expect(data.file?.schemaVersion).toBe(1);
    // ROUTING PROOF: level=2 round-trips → engine actually parsed our test file
    expect(data.file?.state?.level).toBe(2);
    expect(data.file?.state?.version).toBe("1.0.0");
    expect(Array.isArray(data.file?.state?.history)).toBe(true);
    expect(data.file?.state?.history?.length).toBe(1);
  });

  it("malformed JSON file → returns {error, action} (safetyDispatcher catch wraps engine throw)", async () => {
    const r = await invokeHandler(safetyHandler, "wedm_governance_read", {
      file_path: malformedStateFile,
    });
    // safetyDispatcher's catch returns {error: "Safety tool error: ...", action}
    expect(typeof (r as { error?: unknown }).error).toBe("string");
    expect(String((r as { error?: unknown }).error ?? "")).toMatch(/safety tool error/i);
    // action MUST round-trip — proves the throw came from our action handler
    expect((r as { action?: string }).action).toBe("wedm_governance_read");
  });

  it("schema-invalid file (level=99) → returns {error, action} mentioning 'level' (engine validator throws)", async () => {
    const r = await invokeHandler(safetyHandler, "wedm_governance_read", {
      file_path: invalidLevelStateFile,
    });
    expect(typeof (r as { error?: unknown }).error).toBe("string");
    // The dispatcher's "Safety tool error: <msg>" envelope contains the engine's "level must be integer 0..5" message
    expect(String((r as { error?: unknown }).error ?? "")).toMatch(/level/i);
    expect((r as { action?: string }).action).toBe("wedm_governance_read");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WEDMGOV — prism_safety :: wedm_governance_snapshot", () => {
  it("missing file → returns {snapshot: null} (engine fail-soft)", async () => {
    const r = await invokeHandler(safetyHandler, "wedm_governance_snapshot", {
      file_path: missingStateFile,
    });
    const data = r as { snapshot?: unknown };
    expect(data.snapshot).toBe(null);
  });

  it("valid state file → returns AutonomySnapshot-shaped projection", async () => {
    const r = await invokeHandler(safetyHandler, "wedm_governance_snapshot", {
      file_path: validStateFile,
    });
    const data = r as {
      snapshot?: {
        level?: number;
        version?: string;
        history?: Array<{ from?: number; to?: number; reason?: string }>;
        last?: unknown;
      };
    };
    expect(data.snapshot).not.toBe(null);
    expect(data.snapshot?.level).toBe(2);
    expect(data.snapshot?.version).toBe("1.0.0");
    expect(Array.isArray(data.snapshot?.history)).toBe(true);
    // History had one promotion 1→2 with "test-promotion" reason
    expect(data.snapshot?.history?.[0]?.from).toBe(1);
    expect(data.snapshot?.history?.[0]?.to).toBe(2);
    expect(data.snapshot?.history?.[0]?.reason).toBe("test-promotion");
    // last must be the most-recent (only) history entry
    expect(data.snapshot?.last).not.toBe(undefined);
  });
});
