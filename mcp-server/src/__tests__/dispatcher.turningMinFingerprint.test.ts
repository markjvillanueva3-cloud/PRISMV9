/**
 * dispatcher.turningMinFingerprint.test.ts — round-trip integration coverage
 * for MS-PRINT-PROGRAM-LOOP/U-PPL-A1 dispatcher wiring.
 *
 * Drives both new actions through the real `prism_turning` dispatcher:
 *   - turning_min_fingerprint → TurningMinFingerprintEngine.fromBytes
 *   - turning_min_classify    → TurningMinFingerprintEngine.classify
 *
 * Wraps the same { success, data, error } envelope the rest of the PRISM
 * dispatcher test suite asserts against (mirrors
 * dispatcher.partFamilyMatch.training.test.ts).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";
import {
  turningMinFingerprintEngine,
  FEATURE_VECTOR_DIMS,
  DEFAULT_DISTANCE_THRESHOLD,
  type NamedAnchor,
} from "../engines/TurningMinFingerprintEngine.js";
import { okumaOSPParserEngine } from "../engines/OkumaOSPParserEngine.js";

const MACRO_DIR = join("H:/prism", "Resources", "MACRO PROGRAMS");
const CLEAN_CASING = join(MACRO_DIR, "CASING_MACRO.MIN");
const CLEAN_CBORE = join(MACRO_DIR, "CBORE_CASING_MACRO.MIN");
const CORRUPT_BASIC = join(MACRO_DIR, "BASIC-CASING.MIN");

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

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

describe("MS-PRINT-PROGRAM-LOOP/U-PPL-A1 — Zod schema gates", () => {
  it("turning_min_fingerprint schema rejects empty params (refine on text|base64)", () => {
    const s = TURNING_ACTION_SCHEMAS["turning_min_fingerprint"];
    expect(s.safeParse({}).success).toBe(false);
  });

  it("turning_min_fingerprint schema accepts a text payload", () => {
    const s = TURNING_ACTION_SCHEMAS["turning_min_fingerprint"];
    expect(s.safeParse({ text: "O1001\nG50 S3500\n", filename: "x.MIN" }).success).toBe(true);
  });

  it("turning_min_fingerprint schema accepts a base64 payload", () => {
    const s = TURNING_ACTION_SCHEMAS["turning_min_fingerprint"];
    const base64 = Buffer.from("O1001\n").toString("base64");
    expect(s.safeParse({ base64 }).success).toBe(true);
  });

  it("turning_min_classify schema rejects a fingerprint with non-16-dim vector", () => {
    const s = TURNING_ACTION_SCHEMAS["turning_min_classify"];
    expect(s.safeParse({
      fingerprint: { tool_count: 1, operation_count: 1, line_count: 1, feature_vector: [1, 2, 3] },
      anchors: [],
    }).success).toBe(false);
  });

  it("turning_min_classify schema accepts a 16-dim fingerprint + empty anchors", () => {
    const s = TURNING_ACTION_SCHEMAS["turning_min_classify"];
    const result = s.safeParse({
      fingerprint: {
        tool_count: 1,
        operation_count: 1,
        line_count: 1,
        feature_vector: new Array(FEATURE_VECTOR_DIMS).fill(0),
      },
      anchors: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("MS-PRINT-PROGRAM-LOOP/U-PPL-A1 — prism_turning :: turning_min_fingerprint", () => {
  it("clean inline .MIN text → success:true, ok:true, fingerprint has 16-dim feature_vector + line_count matches", async () => {
    // 5-line program + trailing newline → parser counts 6 lines (5 content lines + 1 empty tail).
    const text = "O1001\n(T010101 - FACE/OD ROUGH)\nN0001 G50 S3500\nN0002 G96 S600 M03\nM30\n";
    const r = await invokeHandler(turningHandler, "turning_min_fingerprint", {
      text,
      filename: "synthetic.MIN",
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      ok: boolean;
      fingerprint: { feature_vector: number[]; tool_count: number; line_count: number };
    };
    expect(data.ok).toBe(true);
    expect(data.fingerprint.feature_vector.length).toBe(FEATURE_VECTOR_DIMS);
    expect(data.fingerprint.feature_vector.every(Number.isFinite)).toBe(true);
    expect(data.fingerprint.line_count).toBe(6);
  });

  it("real on-disk CASING_MACRO.MIN → success:true, ok:true, ≥1 tool section parsed", async () => {
    if (!existsSync(CLEAN_CASING)) {
      expect(existsSync(CLEAN_CASING)).toBe(false);
      return;
    }
    const text = readFileSync(CLEAN_CASING, "utf8");
    const r = await invokeHandler(turningHandler, "turning_min_fingerprint", {
      text,
      filename: "CASING_MACRO.MIN",
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      ok: true;
      fingerprint: { feature_vector: number[]; tool_count: number; line_count: number };
    };
    expect(data.ok).toBe(true);
    expect(data.fingerprint.feature_vector.length).toBe(FEATURE_VECTOR_DIMS);
    expect(data.fingerprint.tool_count).toBeGreaterThan(0);
    expect(data.fingerprint.line_count).toBeGreaterThan(50);
  });

  it("base64-encoded corrupted BASIC-CASING.MIN → success:true, ok:false, kind=git_blob", async () => {
    if (!existsSync(CORRUPT_BASIC)) {
      expect(existsSync(CORRUPT_BASIC)).toBe(false);
      return;
    }
    const base64 = readFileSync(CORRUPT_BASIC).toString("base64");
    const r = await invokeHandler(turningHandler, "turning_min_fingerprint", {
      base64,
      filename: "BASIC-CASING.MIN",
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      ok: false;
      reason: "corrupt";
      corruption: { kind: string; byte_head_hex: string };
    };
    expect(data.ok).toBe(false);
    expect(data.reason).toBe("corrupt");
    expect(data.corruption.kind).toBe("git_blob");
    expect(data.corruption.byte_head_hex.startsWith("7801")).toBe(true);
  });

  it("empty file (0 bytes base64) → ok:false, kind=empty", async () => {
    const r = await invokeHandler(turningHandler, "turning_min_fingerprint", {
      base64: "",
      filename: "empty.MIN",
    });
    expect(r.success).toBe(true);
    const data = r.data as { ok: false; corruption: { kind: string } };
    expect(data.ok).toBe(false);
    expect(data.corruption.kind).toBe("empty");
  });
});

describe("MS-PRINT-PROGRAM-LOOP/U-PPL-A1 — prism_turning :: turning_min_classify", () => {
  it("self-classify: CASING_MACRO as query + anchor → name=CASING_MACRO, family=sleeve, distance≈0", async () => {
    if (!existsSync(CLEAN_CASING) || !existsSync(CLEAN_CBORE)) {
      expect(existsSync(CLEAN_CASING)).toBe(false);
      return;
    }
    const parseFn = okumaOSPParserEngine.parse.bind(okumaOSPParserEngine);
    const casingRes = turningMinFingerprintEngine.fromBytes(
      readFileSync(CLEAN_CASING),
      parseFn,
      "CASING_MACRO.MIN",
    );
    const cboreRes = turningMinFingerprintEngine.fromBytes(
      readFileSync(CLEAN_CBORE),
      parseFn,
      "CBORE_CASING_MACRO.MIN",
    );
    expect(casingRes.ok).toBe(true);
    expect(cboreRes.ok).toBe(true);
    if (!casingRes.ok || !cboreRes.ok) return;

    const anchors: NamedAnchor[] = [
      { name: "CASING_MACRO", family: "sleeve", fingerprint: casingRes.fingerprint },
      { name: "CBORE_CASING_MACRO", family: "sleeve", fingerprint: cboreRes.fingerprint },
    ];

    const r = await invokeHandler(turningHandler, "turning_min_classify", {
      fingerprint: casingRes.fingerprint,
      anchors,
      threshold: DEFAULT_DISTANCE_THRESHOLD,
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      nearest_anchor: { name: string; family: string } | null;
      distance: number;
      confidence: number;
      family_label: string | null;
    };
    expect(data.nearest_anchor?.name).toBe("CASING_MACRO");
    expect(data.family_label).toBe("sleeve");
    expect(data.distance).toBeCloseTo(0, 6);
    expect(data.confidence).toBeCloseTo(1, 6);
  });

  it("classify with empty anchors → confidence:0, distance:2 (null fields stripped by slimResponse)", async () => {
    // slimResponse strips null/undefined fields from the response for MCP
    // transport efficiency. `nearest_anchor: null` + `family_label: null` from
    // the engine become absent on the wire — the load-bearing semantic
    // carriers are `confidence === 0` and `distance === 2`, which BOTH
    // survive slimming and BOTH mean "no anchor matched".
    const zeroFp = {
      tool_count: 0,
      operation_count: 0,
      line_count: 0,
      feature_vector: new Array(FEATURE_VECTOR_DIMS).fill(0),
    };
    const r = await invokeHandler(turningHandler, "turning_min_classify", {
      fingerprint: zeroFp,
      anchors: [],
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      nearest_anchor?: unknown;
      distance: number;
      confidence: number;
      family_label?: string;
    };
    expect(data.confidence).toBe(0);
    expect(data.distance).toBe(2);
    // The null fields are gone after slim → both keys absent from the wire.
    expect("nearest_anchor" in data).toBe(false);
    expect("family_label" in data).toBe(false);
  });
});
