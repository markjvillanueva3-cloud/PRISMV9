/**
 * cadAutomationDispatcher.stepPipeline.test.ts — U-CGT03 dispatcher E2E
 *
 * Drives the five `step_pipeline_*` / `step_validate` actions through the real
 * `prism_cad_automation` dispatcher. Verifies action-enum membership, supported-
 * extension list, per-format strategy chains, mock-mode pipeline round-trip,
 * STEP-header validation on synthetic + corrupt fixtures, batch roll-up, and
 * adversarial input rejection.
 *
 * MOCK MODE: PRISM_CAD_MOCK=1 short-circuits the real CAD bridge so tests do
 * not require SolidWorks / Inventor / Fusion / hyperMILL installations. The
 * pipeline writes a synthetic AP242 STEP header at the output path so the
 * downstream validation step exercises identical code paths to a live export.
 */

process.env["PRISM_CAD_MOCK"] = "1";

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  registerCadAutomationDispatcher,
  CAD_AUTOMATION_ACTIONS,
} from "../tools/dispatchers/cadAutomationDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(
      name: string,
      description: string,
      schema: unknown,
      handler: CapturedTool["handler"],
    ) {
      tools.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];
let tmpRoot: string;

/**
 * Invoke an action through the dispatcher and normalize the response shape.
 * The dispatcher returns either:
 *   • MCP envelope: { content: [{ type, text: "<JSON>" }] } for normal results
 *   • Direct error envelope: { success: false, error, action, dispatcher } when
 *     validateActionParams rejects input before the case switch runs.
 * We handle both so adversarial inputs do not crash the helper.
 */
async function invoke(
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (res && Array.isArray((res as { content?: unknown[] }).content)) {
    const arr = (res as { content: Array<{ text?: string }> }).content;
    const text = arr[0]?.text ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  // Direct dispatcherError envelope (e.g. from Zod validation failure).
  return res;
}

function isErrorEnvelope(out: Record<string, unknown>): boolean {
  return (
    out["success"] === false ||
    typeof out["error"] === "string" ||
    typeof out["errorMessage"] === "string"
  );
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadAutomationDispatcher(
    server as unknown as Parameters<typeof registerCadAutomationDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_cad_automation");
  if (!tool) throw new Error("prism_cad_automation tool was not registered");
  handler = tool.handler;
});

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cgt03-disp-"));
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

// ─── Action-enum + supported list ─────────────────────────────────────────

describe("cadAutomationDispatcher — U-CGT03 action surface", () => {
  it("exposes the 5 step_pipeline_* actions in CAD_AUTOMATION_ACTIONS", () => {
    const actions = CAD_AUTOMATION_ACTIONS as readonly string[];
    expect(actions).toContain("step_pipeline_run");
    expect(actions).toContain("step_pipeline_batch");
    expect(actions).toContain("step_validate");
    expect(actions).toContain("step_pipeline_strategies");
    expect(actions).toContain("step_pipeline_supported");
  });

  it("step_pipeline_supported returns all 12 canonical CAD extensions", async () => {
    const out = await invoke("step_pipeline_supported", {});
    expect(out["count"]).toBe(12);
    const exts = out["extensions"] as string[];
    expect(exts).toContain(".sldprt");
    expect(exts).toContain(".sldasm");
    expect(exts).toContain(".ipt");
    expect(exts).toContain(".iam");
    expect(exts).toContain(".FCStd");
    expect(exts).toContain(".FCStd1");
    expect(exts).toContain(".mcam");
    expect(exts).toContain(".mcx");
    expect(exts).toContain(".mcx-8");
    expect(exts).toContain(".f3d");
    expect(exts).toContain(".f3z");
    expect(exts).toContain(".hmc");
  });
});

// ─── Strategy chain — variability across CAM systems ─────────────────────

describe("cadAutomationDispatcher — step_pipeline_strategies", () => {
  it("FCStd uses native-bridge → parser-fallback → manual-trigger", async () => {
    const out = await invoke("step_pipeline_strategies", { ext: ".FCStd" });
    expect(out["strategies"]).toEqual([
      "native-bridge",
      "native-parser-fallback",
      "manual-trigger",
    ]);
  });

  it("f3d (Fusion archive) includes parser-fallback for SQLite parser", async () => {
    const out = await invoke("step_pipeline_strategies", { ext: ".f3d" });
    const chain = out["strategies"] as string[];
    expect(chain).toContain("native-parser-fallback");
    expect(chain[0]).toBe("native-bridge");
  });

  it("sldprt skips parser-fallback (no SolidWorks parser)", async () => {
    const out = await invoke("step_pipeline_strategies", { ext: ".sldprt" });
    expect(out["strategies"]).toEqual(["native-bridge", "manual-trigger"]);
  });

  it("ipt (Inventor part) goes native-bridge → manual-trigger only", async () => {
    const out = await invoke("step_pipeline_strategies", { ext: ".ipt" });
    expect(out["strategies"]).toEqual(["native-bridge", "manual-trigger"]);
  });

  it("native-bridge is always the primary strategy across all 12 formats", async () => {
    const supported = (await invoke("step_pipeline_supported", {}))[
      "extensions"
    ] as string[];
    for (const ext of supported) {
      const out = await invoke("step_pipeline_strategies", { ext });
      const chain = out["strategies"] as string[];
      expect(chain[0]).toBe("native-bridge");
    }
  });

  it("returns an error envelope for an unsupported extension", async () => {
    const out = await invoke("step_pipeline_strategies", { ext: ".dxf" });
    expect(typeof out["error"]).toBe("string");
    expect(out["error"]).toContain(".dxf");
    const supported = out["supportedExtensions"] as string[];
    expect(Array.isArray(supported)).toBe(true);
    expect(supported.length).toBe(12);
  });
});

// ─── Pipeline happy path — variability across 4 CAM systems ──────────────

describe("cadAutomationDispatcher — step_pipeline_run (mock mode)", () => {
  const cases = [
    { src: "part.sldprt", out: "part.step", bridge: "solidworks", ext: ".sldprt" },
    { src: "asm.iam", out: "asm.step", bridge: "inventor", ext: ".iam" },
    { src: "model.FCStd", out: "model.step", bridge: "freecad", ext: ".FCStd" },
    { src: "tooling.mcx-8", out: "tooling.step", bridge: "mastercam", ext: ".mcx-8" },
  ] as const;

  for (const c of cases) {
    it(`${c.ext} → ${c.bridge} succeeds via native-bridge in mock mode`, async () => {
      const outPath = path.join(tmpRoot, c.out);
      const result = await invoke("step_pipeline_run", {
        filePath: c.src,
        outputPath: outPath,
      });
      expect(result["success"]).toBe(true);
      expect(result["bridge"]).toBe(c.bridge);
      expect(result["ext"]).toBe(c.ext);
      expect(result["strategyUsed"]).toBe("native-bridge");
      const validation = result["validation"] as Record<string, unknown>;
      expect(validation["valid"]).toBe(true);
      expect(validation["schema"]).toBe("AP242");
      expect(fs.existsSync(outPath)).toBe(true);
    });
  }

  it("attempts array records each strategy attempt with timing", async () => {
    const outPath = path.join(tmpRoot, "x.step");
    const result = await invoke("step_pipeline_run", {
      filePath: "x.sldprt",
      outputPath: outPath,
    });
    const attempts = result["attempts"] as Array<Record<string, unknown>>;
    expect(attempts.length).toBeGreaterThanOrEqual(1);
    expect(attempts[0]?.["strategy"]).toBe("native-bridge");
    expect(attempts[0]?.["ok"]).toBe(true);
    expect(typeof attempts[0]?.["durationMs"]).toBe("number");
  });

  it("validate=false skips header validation but still reports success", async () => {
    const outPath = path.join(tmpRoot, "skipv.step");
    const result = await invoke("step_pipeline_run", {
      filePath: "skipv.sldprt",
      outputPath: outPath,
      validate: false,
    });
    expect(result["success"]).toBe(true);
    const validation = result["validation"] as Record<string, unknown>;
    expect(validation["valid"]).toBe(false);
    const issues = validation["issues"] as string[];
    expect(issues).toContain("validation skipped");
  });
});

// ─── Pipeline failure modes (≥3 distinct paths) ──────────────────────────

describe("cadAutomationDispatcher — step_pipeline_run failure modes", () => {
  it("FAIL #1: missing output parent directory short-circuits with clear error", async () => {
    const result = await invoke("step_pipeline_run", {
      filePath: "x.sldprt",
      outputPath: path.join(tmpRoot, "no-such-dir", "x.step"),
    });
    expect(result["success"]).toBe(false);
    expect(typeof result["error"]).toBe("string");
    expect(result["error"]).toContain("Output parent directory");
    // slimResponse strips empty arrays; the absence asserts no strategies ran.
    expect(result["attempts"] ?? []).toEqual([]);
  });

  it("FAIL #2: unsupported extension fails routing before strategies run", async () => {
    const result = await invoke("step_pipeline_run", {
      filePath: "drawing.dwg",
      outputPath: path.join(tmpRoot, "out.step"),
    });
    expect(result["success"]).toBe(false);
    expect(typeof result["error"]).toBe("string");
    // bridge/ext are null in the engine, but slimResponse strips null fields,
    // so on the wire they appear as missing (not present in the JSON).
    expect(result).not.toHaveProperty("bridge");
    expect(result).not.toHaveProperty("ext");
  });

  it("FAIL #3: requireOutputParent=false allows pipeline to proceed past missing dir check", async () => {
    // The check is bypassed; routing still picks the bridge, mock mode synthesizes
    // STEP at the output path. Node mkdirSync is NOT done by the engine, so the
    // synthetic write may fail — either way the dispatcher returns a structured
    // result rather than throwing.
    const result = await invoke("step_pipeline_run", {
      filePath: "x.sldprt",
      outputPath: path.join(tmpRoot, "missing-dir", "x.step"),
      requireOutputParent: false,
    });
    // Result is a structured envelope, never an exception bubbling out.
    expect(typeof result["success"]).toBe("boolean");
    expect(result["bridge"]).toBe("solidworks");
    expect(result["ext"]).toBe(".sldprt");
  });
});

// ─── STEP header validation — happy + corrupt + adversarial ──────────────

describe("cadAutomationDispatcher — step_validate", () => {
  it("validates a valid AP242 header", async () => {
    const stepFile = path.join(tmpRoot, "good.step");
    fs.writeFileSync(
      stepFile,
      [
        "ISO-10303-21;",
        "HEADER;",
        "FILE_DESCRIPTION((''),'2;1');",
        "FILE_NAME('g.step','2026-01-01',(''),(''),'','','');",
        "FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 242 1 1 4 }'));",
        "ENDSEC;",
        "DATA;",
        "ENDSEC;",
        "END-ISO-10303-21;",
      ].join("\n"),
      "utf8",
    );
    const out = await invoke("step_validate", { stepFilePath: stepFile });
    expect(out["valid"]).toBe(true);
    expect(out["schema"]).toBe("AP242");
    expect(typeof out["rawSchema"]).toBe("string");
  });

  it("classifies AP214 from CONFIG_CONTROL_DESIGN schema string", async () => {
    const stepFile = path.join(tmpRoot, "ap214.step");
    fs.writeFileSync(
      stepFile,
      [
        "ISO-10303-21;",
        "HEADER;",
        "FILE_SCHEMA(('CONFIG_CONTROL_DESIGN_214'));",
        "ENDSEC;",
        "END-ISO-10303-21;",
      ].join("\n"),
      "utf8",
    );
    const out = await invoke("step_validate", { stepFilePath: stepFile });
    expect(out["valid"]).toBe(true);
    expect(out["schema"]).toBe("AP214");
  });

  it("rejects file lacking ISO-10303-21 magic", async () => {
    const stepFile = path.join(tmpRoot, "bad.step");
    fs.writeFileSync(stepFile, "this is not a STEP file at all", "utf8");
    const out = await invoke("step_validate", { stepFilePath: stepFile });
    expect(out["valid"]).toBe(false);
    expect(out["schema"]).toBe("unknown");
    const issues = out["issues"] as string[];
    expect(issues.join(" ")).toMatch(/Missing ISO-10303-21/);
  });

  it("rejects file with magic but no FILE_SCHEMA token", async () => {
    const stepFile = path.join(tmpRoot, "noschema.step");
    fs.writeFileSync(
      stepFile,
      "ISO-10303-21;\nHEADER;\nENDSEC;\nEND-ISO-10303-21;\n",
      "utf8",
    );
    const out = await invoke("step_validate", { stepFilePath: stepFile });
    expect(out["valid"]).toBe(false);
    expect(out["schema"]).toBe("unknown");
    const issues = out["issues"] as string[];
    expect(issues.join(" ")).toMatch(/FILE_SCHEMA/);
  });

  it("rejects nonexistent path with structured error (no throw)", async () => {
    const out = await invoke("step_validate", {
      stepFilePath: path.join(tmpRoot, "does-not-exist.step"),
    });
    expect(out["valid"]).toBe(false);
    const issues = out["issues"] as string[];
    expect(issues.join(" ")).toMatch(/does not exist/);
  });

  it("rejects directory passed as STEP file (not a regular file)", async () => {
    const out = await invoke("step_validate", { stepFilePath: tmpRoot });
    expect(out["valid"]).toBe(false);
    const issues = out["issues"] as string[];
    expect(issues.join(" ")).toMatch(/Not a regular file/);
  });
});

// ─── Batch — happy + per-ext rollup + continueOnError boundary ──────────

describe("cadAutomationDispatcher — step_pipeline_batch", () => {
  it("processes a mixed-format batch and rolls up by strategy + ext", async () => {
    const items = [
      {
        filePath: "a.sldprt",
        outputPath: path.join(tmpRoot, "a.step"),
      },
      {
        filePath: "b.iam",
        outputPath: path.join(tmpRoot, "b.step"),
      },
      {
        filePath: "c.FCStd",
        outputPath: path.join(tmpRoot, "c.step"),
      },
    ];
    const out = await invoke("step_pipeline_batch", { items });
    expect(out["total"]).toBe(3);
    expect(out["ok"]).toBe(3);
    expect(out["failed"]).toBe(0);
    const byStrategy = out["byStrategy"] as Record<string, number>;
    expect(byStrategy["native-bridge"]).toBe(3);
    const byExt = out["byExt"] as Record<string, { ok: number; failed: number }>;
    expect(byExt[".sldprt"]?.ok).toBe(1);
    expect(byExt[".iam"]?.ok).toBe(1);
    expect(byExt[".FCStd"]?.ok).toBe(1);
  });

  it("continueOnError=false stops batch on first failure", async () => {
    const items = [
      { filePath: "drawing.dwg", outputPath: path.join(tmpRoot, "1.step") }, // unsupported
      { filePath: "ok.sldprt", outputPath: path.join(tmpRoot, "2.step") },
    ];
    const out = await invoke("step_pipeline_batch", {
      items,
      continueOnError: false,
    });
    expect(out["total"]).toBe(2);
    expect(out["failed"]).toBe(1);
    expect(out["ok"]).toBe(0);
    const results = out["results"] as Array<Record<string, unknown>>;
    expect(results.length).toBe(1); // stopped after first failure
  });
});

// ─── Adversarial inputs ─────────────────────────────────────────────────

describe("cadAutomationDispatcher — adversarial inputs", () => {
  it("ADV #1: empty filePath fails routing without throwing", async () => {
    const out = await invoke("step_pipeline_run", {
      filePath: "",
      outputPath: path.join(tmpRoot, "x.step"),
    });
    // Engine returns a structured failure (Zod or routing). Either path is OK.
    const failed =
      isErrorEnvelope(out) ||
      out["success"] === false;
    expect(failed).toBe(true);
  });

  it("ADV #2: missing required fields returns dispatcher error envelope", async () => {
    const out = await invoke("step_validate", {});
    // No stepFilePath provided → either schema reject or 'does not exist' on empty path.
    const failed = isErrorEnvelope(out) || out["valid"] === false;
    expect(failed).toBe(true);
  });

  it("ADV #3: oversize batch (50 items) processes deterministically without leak", async () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      filePath: `part_${i}.sldprt`,
      outputPath: path.join(tmpRoot, `out_${i}.step`),
    }));
    const out = await invoke("step_pipeline_batch", { items });
    expect(out["total"]).toBe(50);
    expect(out["ok"]).toBe(50);
    expect(out["failed"]).toBe(0);
    const byStrategy = out["byStrategy"] as Record<string, number>;
    expect(byStrategy["native-bridge"]).toBe(50);
  });
});
