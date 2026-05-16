/**
 * dispatcher.latheProgramReoptimize.test.ts — round-trip integration coverage
 * for MS-PRINT-PROGRAM-LOOP/U-PPL-B1 dispatcher wiring.
 *
 * Drives the new action through the real `prism_turning` dispatcher:
 *   - lathe_program_reoptimize → ProgramReoptimizationOrchestratorEngine.reoptimize
 *
 * Asserts the {success, data} envelope is bridged from the engine's
 * discriminated {ok:true|false} shape, and that the Zod schema gates
 * bad input before the engine is ever reached.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

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

const SYNTHETIC_LATHE = `O1001
(T010101 - FACE/OD ROUGH)
N0001 G50 S3500
N0002 G96 S600 M03
N0003 G00 X100 Z10
N0004 G01 X50 F0.2
M30
`;

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

describe("MS-PRINT-PROGRAM-LOOP/U-PPL-B1 — Zod schema gate", () => {
  it("lathe_program_reoptimize schema is registered and is a Zod schema", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_program_reoptimize"];
    expect(s).not.toBeNull();
    expect(typeof (s as { safeParse: unknown }).safeParse).toBe("function");
  });

  it("schema rejects missing gcode", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_program_reoptimize"];
    expect(s.safeParse({}).success).toBe(false);
  });

  it("schema rejects empty gcode string", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_program_reoptimize"];
    expect(s.safeParse({ gcode: "" }).success).toBe(false);
  });

  it("schema accepts a valid gcode + optional controller/strictness", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_program_reoptimize"];
    const r = s.safeParse({
      gcode: "O1001\nM30\n",
      controller: "okuma",
      strictness: "strict",
      runPhysicsPass: false,
    });
    expect(r.success).toBe(true);
  });

  it("schema rejects an invalid controller enum value", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_program_reoptimize"];
    const r = s.safeParse({ gcode: "O1\nM30", controller: "okuma-not-real" });
    expect(r.success).toBe(false);
  });
});

describe("MS-PRINT-PROGRAM-LOOP/U-PPL-B1 — prism_turning :: lathe_program_reoptimize", () => {
  it("synthetic lathe gcode → success:true, data.ok:true, detectedProcess='lathe', 6 stages", async () => {
    const r = await invokeHandler(turningHandler, "lathe_program_reoptimize", {
      gcode: SYNTHETIC_LATHE,
      filename: "synthetic.MIN",
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      ok: boolean;
      detectedProcess: string;
      optimizedGcode: string;
      stages: Array<{ name: string }>;
      safetyScoreBefore: number;
      safetyScoreAfter: number;
    };
    expect(data.ok).toBe(true);
    expect(data.detectedProcess).toBe("lathe");
    expect(data.stages.length).toBe(6);
    expect(data.optimizedGcode.includes("M30")).toBe(true);
    expect(typeof data.safetyScoreBefore).toBe("number");
    expect(typeof data.safetyScoreAfter).toBe("number");
  });

  it("no-marker gcode → success:false, data.reason='no_process_detected'", async () => {
    const r = await invokeHandler(turningHandler, "lathe_program_reoptimize", {
      gcode: "(no markers)\nG01 X1\nM30\n",
      // force auto so the detector runs
      process: "auto",
    });
    expect(r.success).toBe(false);
    const data = r.data as { ok: false; reason: string };
    expect(data.ok).toBe(false);
    expect(data.reason).toBe("no_process_detected");
  });

  it("mill gcode forced through the lathe dispatcher → success:false, reason='mill_path_deferred'", async () => {
    const millGcode = "O2001\nN0001 G54 G43 H01 Z25\nN0002 G54 X10.0 Y20.0 Z5.0\nM30\n";
    const r = await invokeHandler(turningHandler, "lathe_program_reoptimize", {
      gcode: millGcode,
      process: "mill",
    });
    expect(r.success).toBe(false);
    const data = r.data as { ok: false; reason: string };
    expect(data.reason).toBe("mill_path_deferred");
  });

  it("dispatcher defaults process to 'lathe' when caller omits it", async () => {
    // SYNTHETIC_LATHE would auto-detect as lathe anyway; this asserts the
    // dispatcher's `process: p.process ?? 'lathe'` default is wired (the
    // engine still re-validates via detectProcess for the auto path).
    const r = await invokeHandler(turningHandler, "lathe_program_reoptimize", {
      gcode: SYNTHETIC_LATHE,
    });
    expect(r.success).toBe(true);
    const data = r.data as { ok: true; detectedProcess: string };
    expect(data.detectedProcess).toBe("lathe");
  });
});
