/**
 * pipeline-roi-envelope.test.ts -- U-WIRE-PIPELINE-ROI-ENVELOPE (slot:hotel, LAUNCH-WIRE)
 *
 * POST /api/v1/pipeline/roi calls callTool("prism_business", "roi_advisor_analyze") and previously
 * sent the un-peeled result straight to res.json({ result }). prism_business returns a BARE
 * slimResponse { type:"text", text:"<json>" } with NO content[] wrapper, so the production callTool
 * (index.ts: result?.content?.[0]?.text) CANNOT peel it -> the FE (web/src/api/pipeline.ts:31
 * pipelineApi.roi reads the whole body as PipelineResult, then consumers read .result) received the
 * {type,text} envelope instead of the ROI object -> a LATENT dead-panel (real client, no page consumer
 * yet -- fixing it prevents a future dead panel). This is the recurring erp/hotel/estimate-flow
 * envelope-unwrap class (reference_hotel_erp_envelope_deadpanel_2026_07_04).
 *
 * The fix imports the canonical unwrapDispatcherEnvelope (dispatcher-envelope.ts) and peels ONLY the
 * /roi route (prism_business). Every other pipeline route calls prism_calc/cad/intelligence, which are
 * content[]-wrapped and already peeled by callTool -- wrapping them would double-peel and break them,
 * so those routes are deliberately untouched (asserted here as a regression guard).
 *
 * R9: the callTool mock mirrors the PRODUCTION wire -- prism_business returns the bare {type,text}
 * envelope via env(); a convenient bare-object mock would MASK the bug. The negative-control block
 * proves the peel is load-bearing (bare envelope -> .result.type === "text" if unwrap were removed).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "http";
import express from "express";
import { createPipelineRouter } from "../routes/pipeline.js";
import type { CallToolFn } from "../routes/index.js";

// Mirror the PRODUCTION wire (R9): prism_business returns slimResponse({type:"text",text}) with NO
// content[] wrapper, so callTool hands the route the RAW envelope. env() reproduces exactly that.
function env(obj: unknown) {
  return { type: "text", text: JSON.stringify(obj) } as unknown;
}

const calls: Array<{ tool: string; action: string; params: Record<string, unknown> }> = [];

// Fake callTool: prism_business -> bare {type,text} envelope (the real dead-panel wire);
// prism_calc/cad/intelligence -> the standard content[] wrapper that the real callTool would already
// have peeled, i.e. by the time these fake results are returned they are the *already-peeled* object.
const fakeCallTool: CallToolFn = (async (tool: string, action: string, params: Record<string, unknown>) => {
  calls.push({ tool, action, params });
  if (tool === "prism_business" && action === "roi_advisor_analyze") {
    // The REAL production shape (verified against businessDispatcher.ts:4866 + ROIAdvisorEngine.ts:53):
    // the roi case sets `result = roiAdvisorEngine.analyze(...)` = a raw AtomicValue<ROIResult> (NO
    // {success,data} wrap, unlike the customer cases), then slimResponse JSON.stringifies it. So the
    // peeled object the FE receives is { value: { suggestions, total_investment_usd, ... }, confidence,
    // source }. Mocking the REAL shape (not fabricated field names) lets this test also catch future
    // engine/FE shape drift (R9), not only the peel mechanics.
    return env({
      value: {
        suggestions: [
          { title: "5-axis retrofit", payback_months: 14, annual_savings_usd: 82000 },
        ],
        total_investment_usd: 95000,
      },
      confidence: 0.71,
      source: "ROIAdvisorEngine",
    });
  }
  // Other tools: return an already-peeled plain object (what callTool yields after content[] peel).
  return { echoed: action, ok: true };
}) as unknown as CallToolFn;

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/pipeline", createPipelineRouter(fakeCallTool));
  await new Promise<void>((resolve) => {
    server = createServer(app).listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server?.close();
});

async function postJson(path: string, body: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

describe("POST /api/v1/pipeline/roi -- prism_business envelope peel", () => {
  it("unwraps the bare {type,text} slimResponse -> .result is the parsed ROI object", async () => {
    const { status, json } = await postJson("/api/v1/pipeline/roi", { description: "bracket", material: "6061" });
    expect(status).toBe(200);
    // Positive assertion: the FE reads .result; it must be the parsed engine payload (the real
    // AtomicValue<ROIResult> shape), not the envelope.
    expect(json.result).toBeTruthy();
    expect(json.result.confidence).toBe(0.71);
    expect(json.result.source).toBe("ROIAdvisorEngine");
    expect(Array.isArray(json.result.value.suggestions)).toBe(true);
    expect(json.result.value.suggestions[0].payback_months).toBe(14);
    expect(json.result.value.total_investment_usd).toBe(95000);
    // The envelope must NOT survive into the payload (the dead-panel signature).
    expect(json.result.type).toBeUndefined();
    expect(json.result.text).toBeUndefined();
  });

  it("NEGATIVE CONTROL: the raw dispatcher return IS the bare {type,text} envelope (peel is load-bearing)", async () => {
    // Prove the mock emits the production wire shape -- if the route dropped unwrapDispatcherEnvelope,
    // json.result would be exactly this {type,text} envelope and the assertions above would fail with
    // "expected undefined to be 0.71". This documents the teeth of the positive test.
    const raw = env({ value: { suggestions: [] }, confidence: 0.71, source: "ROIAdvisorEngine" }) as { type: string; text: string };
    expect(raw.type).toBe("text");
    expect(typeof raw.text).toBe("string");
    expect(JSON.parse(raw.text).confidence).toBe(0.71);
  });

  it("forwards the request body to roi_advisor_analyze unchanged", async () => {
    calls.length = 0;
    await postJson("/api/v1/pipeline/roi", { description: "flange", material: "ti-6al-4v", quantity: 25 });
    const roiCall = calls.find((c) => c.action === "roi_advisor_analyze");
    expect(roiCall).toBeTruthy();
    expect(roiCall!.tool).toBe("prism_business");
    expect(roiCall!.params).toEqual({ description: "flange", material: "ti-6al-4v", quantity: 25 });
  });
});

describe("REGRESSION GUARD: content[]-wrapped routes are NOT double-peeled", () => {
  // These routes call prism_calc/prism_cad -- callTool already peels content[], so the route must
  // pass the object through verbatim. If someone wrapped them in unwrapDispatcherEnvelope, a plain
  // object with no {type,text} would still pass through (the peel is a no-op on non-envelopes), but a
  // {type,text}-SHAPED domain payload would be wrongly parsed. We assert the plain object survives.
  it("/full (prism_calc) passes the already-peeled object straight to .result", async () => {
    const { status, json } = await postJson("/api/v1/pipeline/full", { description: "part" });
    expect(status).toBe(200);
    expect(json.result).toEqual({ echoed: "sampling_print_to_program", ok: true });
  });

  it("/fusion360 (prism_cad) passes the already-peeled object straight to .result", async () => {
    const { status, json } = await postJson("/api/v1/pipeline/fusion360", { description: "bracket", material: "6061" });
    expect(status).toBe(200);
    expect(json.result).toEqual({ echoed: "f360_from_description", ok: true });
  });
});
