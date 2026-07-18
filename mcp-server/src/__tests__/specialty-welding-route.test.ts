/**
 * U-FE-SPECIALTY-WELDING-CONTRACT route guard (slot:bravo 2026-06-19).
 *
 * Proves /api/v1/welding/calculate merges the 3 REAL prism_welding actions (welding_calculate +
 * weld_distortion_calculate + weld_strength_calculate) into the SPA WeldingResult, replacing the
 * prior 501. callTool is stubbed to invoke the ACTUAL engines, so every asserted number is a
 * reference value from real physics (R9). The schemas were realigned to these engines in the
 * prior commit (U-WELDING-SCHEMA-ALIGN), so this adapter sits on a proven round-trip.
 *
 * Coverage: happy merge (8 hand-verified fields) + failure modes (each of the 3 sub-actions
 * erroring -> 400; t8/5=0 divide-by-zero guard) + adversarial (t8/5->degC/s conversion pinned
 * independent of the engine clamp; unmapped process -> gmaw default; no strength-warning leak;
 * forwarded per-engine param shape; siblings still 501).
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { CallToolFn } from "../routes/index.js";
import { createSpecialtyRouter } from "../routes/specialty.js";
import { weldingEngine } from "../engines/WeldingEngine.js";
import { weldStrengthEngine } from "../engines/WeldStrengthEngine.js";
import { weldDistortionEngine } from "../engines/WeldDistortionEngine.js";

let server: http.Server;
let port = 0;
let calls: Array<{ tool: string; action: string; params: any }> = [];
// Per-test controls: force a sub-action to error, override the welding t8/5 cooling time, and
// inject a sentinel into the strength engine's warnings (to prove they are NOT leaked).
let errorActions: Set<string> = new Set();
let coolingOverride: number | null = null;
let strengthWarningSentinel: string | null = null;

const callTool: CallToolFn = async (tool, action, params) => {
  calls.push({ tool, action, params });
  if (errorActions.has(action)) return { error: `forced ${action}` };
  if (action === "welding_calculate") {
    const r = weldingEngine.calculate((params ?? {}) as any) as any;
    if (coolingOverride !== null) {
      return { ...r, cooling_rate_800_500_s: { ...r.cooling_rate_800_500_s, value: coolingOverride } };
    }
    return r;
  }
  if (action === "weld_distortion_calculate") return weldDistortionEngine.calculate((params ?? {}) as any) as any;
  if (action === "weld_strength_calculate") {
    const r = weldStrengthEngine.calculate((params ?? {}) as any) as any;
    if (strengthWarningSentinel !== null) {
      return { ...r, warnings: [...(Array.isArray(r.warnings) ? r.warnings : []), strengthWarningSentinel] };
    }
    return r;
  }
  return { error: `unexpected ${action}` };
};

function httpRequest(method: string, urlPath: string, body?: unknown): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = {};
    if (payload !== undefined) {
      headers["content-type"] = "application/json";
      headers["content-length"] = String(Buffer.byteLength(payload));
    }
    const req = http.request({ host: "127.0.0.1", port, method, path: urlPath, headers }, (resp) => {
      let text = "";
      resp.on("data", (c) => (text += c));
      resp.on("end", () => {
        let json: any;
        try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
        resolve({ status: resp.statusCode ?? 0, json });
      });
    });
    req.on("error", reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

// Canonical request reused across cases: MIG fillet weld, 10mm mild steel, E70 filler.
const REQ = {
  process: "MIG",
  material: "mild_steel",
  thickness_mm: 10,
  joint_type: "fillet",
  filler_material: "E70",
  voltage_V: 25,
  current_A: 200,
  travel_speed_mm_min: 300,
};

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use(createSpecialtyRouter(callTool));
  server = http.createServer(app);
  server.listen(0);
  await once(server, "listening");
  port = (server.address() as AddressInfo).port;
});

beforeEach(() => {
  calls = [];
  errorActions = new Set();
  coolingOverride = null;
  strengthWarningSentinel = null;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("/welding/calculate -> merge welding + distortion + strength", () => {
  it("merges 3 engines into WeldingResult with hand-verified reference values", async () => {
    const { status, json } = await httpRequest("POST", "/welding/calculate", REQ);
    expect(status).toBe(200);
    // gmaw eta=0.85: HI=(0.85*25*200)/(300/60)/1000 = 0.85 kJ/mm
    expect(json.heat_input_kJ_mm).toBeCloseTo(0.85, 2);
    // HAZ = 2.5*sqrt(0.85)*sqrt(t<10?1.2:1)=2.5*0.922*1 = 2.3 mm (t=10 -> factor 1)
    expect(json.haz_width_mm).toBeCloseTo(2.3, 1);
    // t8/5 caps at 200 s -> cooling_rate_C_s = 300/200 = 1.5 degC/s
    expect(json.cooling_rate_C_s).toBeCloseTo(1.5, 2);
    // DEPO_RATE.gmaw 3.5 * (I/250=0.8) = 2.8 kg/h
    expect(json.deposition_rate_kg_h).toBeCloseTo(2.8, 1);
    // fillet_t leg6/t10 free: transverse = 0.15*18/10 = 0.27 mm
    expect(json.distortion_mm).toBeCloseTo(0.27, 2);
    // mild_steel MAT_WELD carbon equivalent = 0.35
    expect(json.carbon_equivalent).toBeCloseTo(0.35, 2);
    // fillet E70 allowable = 0.30 * 482 = 144.6 MPa (parallel, no transverse bonus)
    const refStrength = weldStrengthEngine.calculate({ weld_type: "fillet", electrode: "E70" } as any);
    expect(json.weld_strength_MPa).toBeCloseTo(refStrength.allowable_stress.value, 4);
    expect(json.weld_strength_MPa).toBeCloseTo(144.6, 0);
    // CE 0.40 default, t=10 -> no preheat required
    expect(json.preheat_required).toBe(false);
    expect(json.preheat_temp_C).toBe(0);
    expect(Array.isArray(json.recommendations)).toBe(true);
  });

  it("maps free-string process->AWS code and renames thickness_mm, fanning to each engine", async () => {
    await httpRequest("POST", "/welding/calculate", REQ);
    const welding = calls.find((c) => c.action === "welding_calculate");
    const distortion = calls.find((c) => c.action === "weld_distortion_calculate");
    const strength = calls.find((c) => c.action === "weld_strength_calculate");
    expect(welding?.params.process).toBe("gmaw"); // "MIG" -> gmaw
    expect(welding?.params.plate_thickness_mm).toBe(10); // thickness_mm rename
    expect(distortion?.params.joint_type).toBe("fillet_t"); // "fillet" -> distortion enum
    expect(distortion?.params.heat_input_kj_mm).toBeCloseTo(0.85, 2); // step-1 heat input chained
    expect(strength?.params.weld_type).toBe("fillet"); // "fillet" -> strength enum
    expect(strength?.params.electrode).toBe("E70"); // filler_material -> electrode
  });

  it("defaults an unmapped process to gmaw (engine default, never NaN)", async () => {
    await httpRequest("POST", "/welding/calculate", { ...REQ, process: "plasma-arc-doohickey" });
    const welding = calls.find((c) => c.action === "welding_calculate");
    expect(welding?.params.process).toBe("gmaw");
  });

  it("pins the t8/5->degC/s conversion independent of the engine clamp (60s -> 5.0 degC/s)", async () => {
    coolingOverride = 60; // override the t8/5 cooling TIME to a value below the 200s clamp
    const { json } = await httpRequest("POST", "/welding/calculate", REQ);
    expect(json.cooling_rate_C_s).toBeCloseTo(300 / 60, 5); // = 5.0
  });

  it("omits cooling_rate_C_s rather than dividing by zero when t8/5 is 0", async () => {
    coolingOverride = 0;
    const { json } = await httpRequest("POST", "/welding/calculate", REQ);
    expect(json).not.toHaveProperty("cooling_rate_C_s");
  });

  it("does NOT leak the strength engine's warnings into recommendations (falsifiable sentinel)", async () => {
    // Inject a unique sentinel into weld_strength_calculate.warnings. The route must NOT spread
    // s.warnings (load-specific, meaningless without a real load), so the sentinel must be absent.
    // If a future edit added `...s.warnings`, this assertion would FAIL -- proving it's load-bearing.
    strengthWarningSentinel = "SENTINEL_STRENGTH_WARNING_LEAK_2026";
    const { json } = await httpRequest("POST", "/welding/calculate", REQ);
    expect(json.recommendations).not.toContain("SENTINEL_STRENGTH_WARNING_LEAK_2026");
    // sanity: welding/distortion recommendations DO flow through (the array is the merge target).
    expect(Array.isArray(json.recommendations)).toBe(true);
  });

  it("surfaces a welding_calculate dispatcher error as 400", async () => {
    errorActions.add("welding_calculate");
    const { status, json } = await httpRequest("POST", "/welding/calculate", REQ);
    expect(status).toBe(400);
    expect(json.message).toBe("forced welding_calculate");
  });

  it("surfaces a weld_distortion_calculate dispatcher error as 400 (not a silent partial result)", async () => {
    errorActions.add("weld_distortion_calculate");
    const { status, json } = await httpRequest("POST", "/welding/calculate", REQ);
    expect(status).toBe(400);
    expect(json.message).toBe("forced weld_distortion_calculate");
  });

  it("surfaces a weld_strength_calculate dispatcher error as 400", async () => {
    errorActions.add("weld_strength_calculate");
    const { status, json } = await httpRequest("POST", "/welding/calculate", REQ);
    expect(status).toBe(400);
    expect(json.message).toBe("forced weld_strength_calculate");
  });

  it("leaves /welding/inspection as a fail-loud 501 (joint-design is now wired)", async () => {
    // /welding/joint-design is wired (U-FE-WELDING-JOINTDESIGN) -> no longer 501; only inspection
    // remains deferred.
    const jd = await httpRequest("POST", "/welding/joint-design", { joint_type: "fillet", thickness_mm: 10, weld_length_mm: 100 });
    expect(jd.status).toBe(200);
    const insp = await httpRequest("POST", "/welding/inspection", {});
    expect(insp.status).toBe(501);
    expect(insp.json.error).toBe("not_implemented");
  });
});
