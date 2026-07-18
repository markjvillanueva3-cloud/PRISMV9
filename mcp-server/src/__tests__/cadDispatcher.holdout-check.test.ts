import { describe, it, expect } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

/**
 * Dispatcher-level ROUND-TRIP test for cad_holdout_check (U-DELTA-HOLDOUT-CHECK-PARITY, R15).
 *
 * The reviewers flagged that the action's libs are unit-tested (cad-trainset-leakguard-lib 16 cases)
 * but the DISPATCHER orchestration (param validation -> manifest resolution -> union -> recordLeak ->
 * response shaping) was never exercised THROUGH registerCadDispatcher. This closes that gap by
 * capturing the registered prism_cad handler via a fake MCP server and invoking the action end-to-end
 * against the REAL frozen splits (geom-50 + ocr-150).
 *
 * The handler returns the MCP shape `{ content: [{ type:"text", text: JSON.stringify(body) }] }` on
 * success (body = {success,data}) and dispatcherError (body = {success:false,error}) -- both serialize
 * the body into content[0].text, so `call()` parses that to get the raw body.
 */
function captureHandler(): (args: { action: string; params?: Record<string, unknown> }) => Promise<any> {
  let handler: ((a: { action: string; params?: Record<string, unknown> }) => Promise<any>) | undefined;
  const fakeServer = {
    tool: (_name: string, _desc: string, _schema: unknown, h: typeof handler) => { handler = h; },
  };
  registerCadDispatcher(fakeServer as unknown as Parameters<typeof registerCadDispatcher>[0]);
  if (!handler) throw new Error("registerCadDispatcher did not register a prism_cad handler");
  return handler;
}

async function call(handler: ReturnType<typeof captureHandler>, action: string, params: Record<string, unknown>): Promise<any> {
  const res = await handler({ action, params });
  const text = res?.content?.[0]?.text;
  if (typeof text === "string") {
    try { return JSON.parse(text); } catch { /* fall through to raw */ }
  }
  return res;
}

const GEOM = "H:/prism/state/shared/cad-holdout/geom-50.json"; // 50 held B-Rep parts
const OCR = "H:/prism/state/shared/cad-holdout/ocr-150.json";  // 150 held OCR/print parts (122 distinct paths)

describe("prism_cad cad_holdout_check (dispatcher round-trip, R15)", () => {
  it("single manifest: a held part leaks via the path arm; an unrelated path is clean", async () => {
    const handler = captureHandler();
    const res = await call(handler, "cad_holdout_check", {
      holdoutManifest: GEOM,
      trainPaths: ["H:/prism/Resources/CAD FILES/blisk.stp", "H:/x/unrelated_widget_zzz.step"],
    });
    expect(res.success).toBe(true);
    expect(res.data.clean).toBe(false);
    expect(res.data.leakCount).toBe(1);            // only blisk.stp (held), not the unrelated path
    expect(res.data.leaks[0].via).toBe("path");
    expect(res.data.holdoutManifests).toHaveLength(1);
    expect(res.data.trainCount).toBe(2);
  });

  it("multi-manifest UNION: a trainRecord leaking against EITHER split is caught", async () => {
    const handler = captureHandler();
    const res = await call(handler, "cad_holdout_check", {
      holdoutManifests: [GEOM, OCR],
      trainRecords: [
        // pd1083 is a held part in ocr-150 -> caught via its answer-key path
        { part_number_normalized: "1083", cad_files: [{ path: "H:/prism/JM DIE/HAAS-HURCO/OMG INC/pd1083.stp" }] },
        { part_number_normalized: "CLEAN-ZZZ-9", cad_files: [{ path: "H:/x/clean_unrelated_zzz.step" }] },
      ],
    });
    expect(res.success).toBe(true);
    expect(res.data.leakCount).toBe(1);
    expect(res.data.holdoutManifests).toHaveLength(2);
    expect(res.data.holdoutCount).toBeGreaterThan(100); // union geom-50(50)+ocr-150(122 distinct paths)=172
  });

  it("clean trainset: no leaks against the holdout", async () => {
    const handler = captureHandler();
    const res = await call(handler, "cad_holdout_check", {
      holdoutManifest: GEOM,
      trainPaths: ["H:/x/a_zzz_unrelated.step", "H:/x/b_zzz_unrelated.step"],
    });
    expect(res.success).toBe(true);
    expect(res.data.clean).toBe(true);
    expect(res.data.leakCount).toBe(0);
  });

  it("missing train source -> dispatcherError (fail loud, R12)", async () => {
    const handler = captureHandler();
    const res = await call(handler, "cad_holdout_check", { holdoutManifest: GEOM });
    expect(res.success).toBe(false);
    expect(String(res.error)).toMatch(/trainPaths|trainRecords/);
  });

  it("missing manifest -> dispatcherError (fail loud, R12)", async () => {
    const handler = captureHandler();
    const res = await call(handler, "cad_holdout_check", { trainPaths: ["H:/x/a.step"] });
    expect(res.success).toBe(false);
  });
});
