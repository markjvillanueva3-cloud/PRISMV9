/**
 * U-FE-SPECIALTY-WELDING-CONTRACT /welding/joint-design guard (slot:bravo 2026-06-19).
 *
 * Proves /api/v1/welding/joint-design runs weld_strength_calculate as a SIZING SEARCH -- the
 * smallest standard fillet leg (>= the AWS code minimum) whose safety factor meets the target.
 * callTool is stubbed to invoke the ACTUAL WeldStrengthEngine, so the chosen leg + stresses are
 * real physics (R9). Reference values are hand-derived from the engine's AISC formulas
 * (allowable = 0.30 x E70 UTS 482 = 145 MPa rounded; throat = 0.707 x leg; sf = allowable/combined).
 *
 * Coverage: happy (smallest leg passes) + sizing escalation (small legs fail -> larger chosen)
 * + no-feasible (returns largest + fail-loud recommendation, still 200) + dispatcher error -> 400
 * + omitted joint-prep fields + forwarded load_type->force_direction mapping + sibling still 501.
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { CallToolFn } from "../routes/index.js";
import { createSpecialtyRouter } from "../routes/specialty.js";
import { weldStrengthEngine } from "../engines/WeldStrengthEngine.js";

let server: http.Server;
let port = 0;
let calls: Array<{ tool: string; action: string; params: any }> = [];
let errorActions: Set<string> = new Set();

const callTool: CallToolFn = async (tool, action, params) => {
  calls.push({ tool, action, params });
  if (errorActions.has(action)) return { error: `forced ${action}` };
  if (action === "weld_strength_calculate") return weldStrengthEngine.calculate((params ?? {}) as any) as any;
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
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("/welding/joint-design -> weld_strength_calculate sizing search", () => {
  it("picks the smallest code-minimum leg when it already meets the safety factor", async () => {
    // thickness 10 -> AWS min leg 5; default load 10kN, len 100: leg5 throat 3.535, combined ~28.3,
    // allowable 145 -> sf 5.1 >= 1.5 -> chosen at first candidate.
    const { status, json } = await httpRequest("POST", "/welding/joint-design", {
      joint_type: "fillet",
      material: "mild_steel",
      thickness_mm: 10,
      weld_length_mm: 100,
    });
    expect(status).toBe(200);
    expect(json.weld_size_mm).toBe(5);
    // r2(0.707*5): 0.707*5*100 = 353.4999.. in float -> Math.round -> 353 -> 3.53 (NOT 3.54).
    expect(json.throat_thickness_mm).toBeCloseTo(3.53, 2);
    expect(json.allowable_stress_MPa).toBe(145); // r0(0.30*482)
    expect(json.utilization_pct).toBeCloseTo((json.actual_stress_MPa / 145) * 100, 4);
    expect(json.utilization_pct).toBeLessThan(100); // feasible
    expect(json.recommendations).not.toContain(
      "No standard fillet leg up to 5mm meets a 1.5 safety factor under the given load -- increase weld length, use a higher-strength electrode, or a full-penetration joint.",
    );
  });

  it("escalates the weld size when the minimum leg is under-strength (6,8,10 fail -> 12 chosen)", async () => {
    // thickness 20 -> min leg 6; load 80kN over 100mm: legs 6/8/10 give sf < 1.5; leg 12 gives
    // combined ~94.3, sf 145/94.3 = 1.54 >= 1.5 -> chosen.
    const { status, json } = await httpRequest("POST", "/welding/joint-design", {
      joint_type: "fillet",
      material: "mild_steel",
      thickness_mm: 20,
      weld_length_mm: 100,
      load_N: 80000,
      load_type: "shear",
    });
    expect(status).toBe(200);
    expect(json.weld_size_mm).toBe(12); // escalated past the min leg (6)
    expect(json.weld_size_mm).toBeGreaterThan(6);
    expect(json.utilization_pct).toBeLessThan(100); // the chosen size IS adequate
    expect(json.utilization_pct).toBeGreaterThan(60); // and near the limit (~65%)
  });

  it("returns the largest tried leg + a fail-loud recommendation when no leg is feasible (still 200)", async () => {
    // thickness 10 -> max leg = 10-1.5 = 8.5 -> candidates [5,6,8]; 300kN over 20mm fails every one.
    const { status, json } = await httpRequest("POST", "/welding/joint-design", {
      joint_type: "fillet",
      material: "mild_steel",
      thickness_mm: 10,
      weld_length_mm: 20,
      load_N: 300000,
    });
    expect(status).toBe(200); // NOT an error -- a real (inadequate) analysis with guidance
    expect(json.weld_size_mm).toBe(8); // largest candidate within the plate-thickness-1.5 bound
    expect(json.utilization_pct).toBeGreaterThan(100); // over-stressed
    expect(json.recommendations[0]).toMatch(/No standard fillet leg up to 8mm meets a 1.5 safety factor/);
  });

  it("honors a higher target safety_factor by choosing a larger (still-feasible) leg", async () => {
    // 50kN/100mm/t20: feasible at a small leg for SF 1.5 and at a larger leg for SF 3.0 (both within
    // the max-leg bound), so this exercises the targetSF override -> larger feasible weld, not the
    // no-feasible fallback.
    const body = { joint_type: "fillet", material: "mild_steel", thickness_mm: 20, weld_length_mm: 100, load_N: 50000 };
    const sf15 = await httpRequest("POST", "/welding/joint-design", body);
    const sf30 = await httpRequest("POST", "/welding/joint-design", { ...body, safety_factor: 3.0 });
    // Robust invariant: a stricter safety factor must pick a strictly larger weld, and both choices
    // are feasible (utilization < 100). Pinned to the engine via the real round-trip, not hand-rounded.
    expect(sf30.json.weld_size_mm).toBeGreaterThan(sf15.json.weld_size_mm);
    expect(sf15.json.utilization_pct).toBeLessThan(100);
    expect(sf30.json.utilization_pct).toBeLessThan(100);
    // and SF3.0's chosen weld carries ~3x the margin (lower utilization) of SF1.5's.
    expect(sf30.json.utilization_pct).toBeLessThan(sf15.json.utilization_pct);
  });

  it("maps load_type 'bending' to the combined force_direction", async () => {
    await httpRequest("POST", "/welding/joint-design", {
      joint_type: "fillet", material: "mild_steel", thickness_mm: 10, weld_length_mm: 100, load_type: "bending",
    });
    const strengthCall = calls.find((c) => c.action === "weld_strength_calculate");
    expect(strengthCall?.params.force_direction).toBe("combined");
  });

  it("omits joint-prep fields the strength engine does not produce", async () => {
    const { json } = await httpRequest("POST", "/welding/joint-design", {
      joint_type: "fillet", material: "mild_steel", thickness_mm: 10, weld_length_mm: 100,
    });
    expect(json).not.toHaveProperty("effective_length_mm");
    expect(json).not.toHaveProperty("groove_angle_deg");
    expect(json).not.toHaveProperty("root_gap_mm");
  });

  it("maps load_type->force_direction and joint_type->weld_type, forwarding load_N as force_n", async () => {
    await httpRequest("POST", "/welding/joint-design", {
      joint_type: "butt",
      material: "mild_steel",
      thickness_mm: 10,
      weld_length_mm: 100,
      load_N: 25000,
      load_type: "tension",
    });
    const strengthCall = calls.find((c) => c.action === "weld_strength_calculate");
    expect(strengthCall?.params.weld_type).toBe("butt_full"); // "butt" -> butt_full
    expect(strengthCall?.params.force_direction).toBe("transverse"); // "tension" -> transverse
    expect(strengthCall?.params.force_n).toBe(25000); // load_N -> force_n
  });

  it("surfaces a weld_strength_calculate dispatcher error as 400", async () => {
    errorActions.add("weld_strength_calculate");
    const { status, json } = await httpRequest("POST", "/welding/joint-design", {
      joint_type: "fillet", material: "mild_steel", thickness_mm: 10,
    });
    expect(status).toBe(400);
    expect(json.message).toBe("forced weld_strength_calculate");
  });

  it("leaves /welding/inspection as a fail-loud 501 (still deferred)", async () => {
    const insp = await httpRequest("POST", "/welding/inspection", {});
    expect(insp.status).toBe(501);
    expect(insp.json.deferredTo).toBe("U-FE-SPECIALTY-WELDING-CONTRACT");
  });
});
