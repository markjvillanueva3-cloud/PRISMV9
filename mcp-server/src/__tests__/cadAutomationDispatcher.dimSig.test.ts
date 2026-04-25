/**
 * cadAutomationDispatcher.dimSig.test.ts — U-CGT05 dispatcher E2E
 *
 * Drives the five `dim_signature_*` actions through the real
 * `prism_cad_automation` dispatcher.
 */

import { describe, it, expect, beforeAll } from "vitest";
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
  handler: (args: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<unknown>;
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
  return res;
}

const CUBE_STEP = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('cube test'),'2;1');
FILE_NAME('cube.step','t',('PRISM'),(''),'PRISM','PRISM','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
#1=CARTESIAN_POINT('p0',(0.0,0.0,0.0));
#2=CARTESIAN_POINT('p1',(50.0,0.0,0.0));
#3=CARTESIAN_POINT('p2',(50.0,30.0,0.0));
#4=CARTESIAN_POINT('p3',(0.0,30.0,0.0));
#5=CARTESIAN_POINT('p4',(0.0,0.0,20.0));
#6=CARTESIAN_POINT('p5',(50.0,0.0,20.0));
#7=CARTESIAN_POINT('p6',(50.0,30.0,20.0));
#8=CARTESIAN_POINT('p7',(0.0,30.0,20.0));
#100=( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );
ENDSEC;
END-ISO-10303-21;
`;

beforeAll(() => {
  const server = makeStubServer();
  registerCadAutomationDispatcher(
    server as unknown as Parameters<typeof registerCadAutomationDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_cad_automation");
  if (!tool) throw new Error("prism_cad_automation tool was not registered");
  handler = tool.handler;
});

describe("cadAutomationDispatcher — U-CGT05 action surface", () => {
  it("exposes the 5 dim_signature_* actions in CAD_AUTOMATION_ACTIONS", () => {
    const actions = CAD_AUTOMATION_ACTIONS as readonly string[];
    expect(actions).toContain("dim_signature_extract");
    expect(actions).toContain("dim_signature_extract_text");
    expect(actions).toContain("dim_signature_compare");
    expect(actions).toContain("dim_signature_validate");
    expect(actions).toContain("dim_signature_recompute");
  });

  it("dim_signature_extract_text on cube STEP returns SI envelope = 0.05 m", async () => {
    const out = await invoke("dim_signature_extract_text", {
      stepText: CUBE_STEP,
      sourceFile: "/cube.step",
    });
    expect(out["sourceLengthUnit"]).toBe("mm");
    expect(out["envelopeM"]).toBeCloseTo(0.05, 12);
    expect((out["counts"] as Record<string, number>)["cartesianPoints"]).toBe(8);
    expect(out["signature"]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("dim_signature_extract reads a real .step file from disk", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cgt05-disp-"));
    const p = path.join(tmp, "cube.step");
    fs.writeFileSync(p, CUBE_STEP, "utf8");
    try {
      const out = await invoke("dim_signature_extract", { filePath: p });
      expect(out["envelopeM"]).toBeCloseTo(0.05, 12);
      expect(out["signature"]).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("dim_signature_extract on missing file returns zero-signature warning (no throw)", async () => {
    const out = await invoke("dim_signature_extract", {
      filePath: "/definitely-not-a-real-file-12345.step",
    });
    expect(out["envelopeM"]).toBe(0);
    const warnings = out["warnings"] as string[];
    expect(warnings.some((w) => w.startsWith("Read failed"))).toBe(true);
  });

  it("dim_signature_compare on two extractions of same input → signatureMatch=true", async () => {
    const a = await invoke("dim_signature_extract_text", {
      stepText: CUBE_STEP,
      sourceFile: "/c.step",
    });
    const b = await invoke("dim_signature_extract_text", {
      stepText: CUBE_STEP,
      sourceFile: "/c.step",
    });
    const cmp = await invoke("dim_signature_compare", { a, b });
    expect(cmp["signatureMatch"]).toBe(true);
    expect(cmp["envelopeDeltaM"]).toBe(0);
    expect(cmp["holeCountDelta"]).toBe(0);
  });

  it("dim_signature_validate ok=true for fresh signature, ok=false for malformed", async () => {
    const sig = await invoke("dim_signature_extract_text", {
      stepText: CUBE_STEP,
      sourceFile: "/c.step",
    });
    const okRes = await invoke("dim_signature_validate", { candidate: sig });
    expect(okRes["ok"]).toBe(true);
    const badRes = await invoke("dim_signature_validate", {
      candidate: { schemaVersion: "1.0.0" },
    });
    expect(badRes["ok"]).toBe(false);
    expect((badRes["errors"] as string[]).length).toBeGreaterThan(3);
  });

  it("dim_signature_recompute reproduces the extracted signature", async () => {
    const sig = await invoke("dim_signature_extract_text", {
      stepText: CUBE_STEP,
      sourceFile: "/c.step",
    });
    const recomputed = await invoke("dim_signature_recompute", {
      signature: sig,
    });
    expect(recomputed["signature"]).toBe(sig["signature"]);
  });

  it("dim_signature_extract rejects empty filePath via dispatcher schema", async () => {
    const out = await invoke("dim_signature_extract", { filePath: "" });
    expect(typeof out["error"]).toBe("string");
  });
});
