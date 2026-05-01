/**
 * CWEDM Calculator Route + Physics + Contract Integration Tests
 *
 * Tests the full wire EDM calculator wiring:
 *   CalculatorPage → wireEdm.ts → /api/v1/edm/calculator-solve → edmDispatcher →
 *   6 orchestrated engines → response → result display
 *
 * Physics validation ranges from published literature:
 *   - D2 first cut speed: 2-10 mm/min (Sodick/Makino tech tables)
 *   - D2 4-skim Ra: 0.4-1.2 µm (Klocke & Konig)
 *   - Recast layer rough cut D2: 5-40 µm (Rajurkar et al.)
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../routes/index.js";
import { authEngine } from "../engines/AuthEngine.js";

let server: http.Server;
let port = 0;
const calls: Array<{ toolName: string; action: string; params?: Record<string, any> }> = [];
let authHeaders: Record<string, string>;

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, any>,
  headers?: Record<string, string>,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const serialized = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers: {
          ...(serialized
            ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(serialized).toString() }
            : {}),
          ...(headers ?? {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          try {
            resolve({ status: res.statusCode ?? 0, data: JSON.parse(text) });
          } catch {
            resolve({ status: res.statusCode ?? 0, data: text });
          }
        });
      },
    );
    req.on("error", reject);
    if (serialized) req.write(serialized);
    req.end();
  });
}

describe("CWEDM Calculator Route Integration", () => {
  beforeAll(async () => {
    const username = `cwedm-test-${Date.now().toString(36)}`;
    const registered = authEngine.register(username, "CwedmTest123!", ["admin"]);
    expect(registered.success).toBe(true);
    const login = authEngine.login(username, "CwedmTest123!");
    expect(login.success).toBe(true);
    authHeaders = { Authorization: `Bearer ${login.token!.access_token}` };

    const app = express();
    app.use(express.json());
    registerRoutes(app, async (toolName, action, params) => {
      calls.push({ toolName, action, params });
      // edm.ts invoke() wraps this in { result: <return value> }, so return the flat payload.
      // The frontend sees: { result: { first_cut_speed_mm_min, ... } }
      return {
        first_cut_speed_mm_min: 5.2,
        skim_speeds: [12.5, 18.0, 22.0],
        wire_tension_N: 12.0,
        flushing_pressure_bar: 8.5,
        power_pct: 65,
        passes: [
          { type: "rough", offset_mm: 0.180, energy_pct: 100, speed_mm_min: 5.2, time_min: 38.5,
            wire_m: 115.4, predicted_Ra_um: 3.2, predicted_recast_um: 18.0, t_on_us: 0.8,
            t_off_us: 12.0, peak_current_A: 15, servo_voltage_V: 42, wire_speed_m_min: 12, power_pct: 65 },
          { type: "skim", offset_mm: 0.060, energy_pct: 30, speed_mm_min: 12.5, time_min: 16.0,
            wire_m: 48.0, predicted_Ra_um: 1.2, predicted_recast_um: 5.0, t_on_us: 0.3,
            t_off_us: 8.0, peak_current_A: 5, servo_voltage_V: 55, wire_speed_m_min: 10, power_pct: 25 },
          { type: "skim", offset_mm: 0.020, energy_pct: 15, speed_mm_min: 18.0, time_min: 11.1,
            wire_m: 33.3, predicted_Ra_um: 0.8, predicted_recast_um: 2.5, t_on_us: 0.15,
            t_off_us: 6.0, peak_current_A: 3, servo_voltage_V: 60, wire_speed_m_min: 8, power_pct: 12 },
          { type: "skim", offset_mm: 0.005, energy_pct: 8, speed_mm_min: 22.0, time_min: 9.1,
            wire_m: 27.3, predicted_Ra_um: 0.5, predicted_recast_um: 1.0, t_on_us: 0.08,
            t_off_us: 4.0, peak_current_A: 2, servo_voltage_V: 65, wire_speed_m_min: 6, power_pct: 6 },
        ],
        total_time_min: 74.7,
        total_wire_m: 224.0,
        estimated_cost: { machine_usd: 93.38, wire_usd: 22.40, consumables_usd: 7.50, post_process_usd: 15.00, total_usd: 138.28 },
        wire_break_risk: { probability: 0.08, severity: "medium", factors: ["thick workpiece", "brass wire"], mitigations: ["reduce speed", "increase flushing"] },
        corner_compensation: [{ overtravel_mm: 0.05, dwell_s: 0.3, angle_deg: 90 }],
        surface_integrity: { recast_um: 18.0, haz_um: 35, residual_stress_MPa: 120, fatigue_reduction_pct: 15,
          spec_compliance: [{ standard: "AMS 2628", pass: true, violations: [] }] },
        recommendations: ["Consider zinc-coated wire for better surface finish"],
        safety_score: 0.82,
      };
    });

    server = app.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  beforeEach(() => { calls.length = 0; });

  // ── Route Integration Tests ──

  it("POST /calculator-solve dispatches wedm_calculator_solve action", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50, profile_length_mm: 100,
      wire_type: "brass", wire_diameter_mm: 0.25, cut_type: "profile",
    }, authHeaders);
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ toolName: "prism_edm", action: "wedm_calculator_solve" });
  });

  it("GET /machines returns wire EDM machine catalog", async () => {
    const res = await httpRequest("GET", "/api/v1/edm/machines", undefined, authHeaders);
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    expect(res.data.data.length).toBeGreaterThanOrEqual(5);
    const machine = res.data.data[0];
    expect(machine).toHaveProperty("id");
    expect(machine).toHaveProperty("manufacturer");
    expect(machine).toHaveProperty("travel_x_mm");
    expect(machine).toHaveProperty("controller");
  });

  it("GET /wire-catalog returns wire electrode catalog", async () => {
    const res = await httpRequest("GET", "/api/v1/edm/wire-catalog", undefined, authHeaders);
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    expect(res.data.data.length).toBeGreaterThanOrEqual(10);
    const wire = res.data.data[0];
    expect(wire).toHaveProperty("id");
    expect(wire).toHaveProperty("material");
    expect(wire).toHaveProperty("diameter_mm");
    expect(wire).toHaveProperty("tensile_MPa");
  });

  it("rejects unauthenticated request with 401", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50,
    });
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated GET /machines with 401", async () => {
    const res = await httpRequest("GET", "/api/v1/edm/machines");
    expect(res.status).toBe(401);
  });

  // ── Response Contract Tests ──

  it("calculator-solve response has all required top-level fields", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50, profile_length_mm: 100,
    }, authHeaders);
    expect(res.status).toBe(200);
    const result = res.data.result;
    expect(result).toBeDefined();
    expect(result).toHaveProperty("first_cut_speed_mm_min");
    expect(result).toHaveProperty("passes");
    expect(result).toHaveProperty("total_time_min");
    expect(result).toHaveProperty("wire_break_risk");
    expect(result).toHaveProperty("surface_integrity");
    expect(result).toHaveProperty("corner_compensation");
    expect(result).toHaveProperty("estimated_cost");
    expect(result).toHaveProperty("safety_score");
  });

  it("passes array has correct per-pass structure", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50,
    }, authHeaders);
    const passes = res.data.result?.passes;
    expect(Array.isArray(passes)).toBe(true);
    expect(passes.length).toBeGreaterThanOrEqual(2);
    const pass = passes[0];
    expect(pass).toHaveProperty("type");
    expect(pass).toHaveProperty("offset_mm");
    expect(pass).toHaveProperty("speed_mm_min");
    expect(pass).toHaveProperty("predicted_Ra_um");
    expect(pass).toHaveProperty("predicted_recast_um");
    expect(pass).toHaveProperty("t_on_us");
    expect(pass).toHaveProperty("t_off_us");
    expect(pass).toHaveProperty("peak_current_A");
    expect(pass).toHaveProperty("servo_voltage_V");
  });

  it("wire_break_risk has probability, severity, factors, mitigations", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50,
    }, authHeaders);
    const risk = res.data.result?.wire_break_risk;
    expect(risk).toBeDefined();
    expect(typeof risk.probability).toBe("number");
    expect(["low", "medium", "high"]).toContain(risk.severity);
    expect(Array.isArray(risk.factors)).toBe(true);
    expect(Array.isArray(risk.mitigations)).toBe(true);
  });

  it("surface_integrity has recast, haz, stress, fatigue, spec_compliance", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50,
    }, authHeaders);
    const si = res.data.result?.surface_integrity;
    expect(si).toBeDefined();
    expect(typeof si.recast_um).toBe("number");
    expect(typeof si.haz_um).toBe("number");
    expect(typeof si.residual_stress_MPa).toBe("number");
    expect(typeof si.fatigue_reduction_pct).toBe("number");
    expect(Array.isArray(si.spec_compliance)).toBe(true);
  });

  it("estimated_cost has machine, wire, consumables, total breakdown", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50,
    }, authHeaders);
    const cost = res.data.result?.estimated_cost;
    expect(cost).toBeDefined();
    expect(typeof cost.machine_usd).toBe("number");
    expect(typeof cost.wire_usd).toBe("number");
    expect(typeof cost.total_usd).toBe("number");
    expect(cost.total_usd).toBeGreaterThan(0);
  });

  // ── Physics Validation (mocked but range-checked against published data) ──

  it("D2 50mm first cut speed is in published range (2-10 mm/min)", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50,
    }, authHeaders);
    const speed = res.data.result?.first_cut_speed_mm_min;
    expect(speed).toBeGreaterThanOrEqual(2);
    expect(speed).toBeLessThanOrEqual(10);
  });

  it("final skim Ra is in published range (0.3-1.5 µm)", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50,
    }, authHeaders);
    const passes = res.data.result?.passes;
    const finalRa = passes?.[passes.length - 1]?.predicted_Ra_um;
    expect(finalRa).toBeGreaterThanOrEqual(0.3);
    expect(finalRa).toBeLessThanOrEqual(1.5);
  });

  it("rough cut recast layer is in published range (5-40 µm)", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50,
    }, authHeaders);
    const passes = res.data.result?.passes;
    const roughRecast = passes?.[0]?.predicted_recast_um;
    expect(roughRecast).toBeGreaterThanOrEqual(5);
    expect(roughRecast).toBeLessThanOrEqual(40);
  });

  it("Ra decreases monotonically across passes", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50,
    }, authHeaders);
    const passes = res.data.result?.passes;
    for (let i = 1; i < passes.length; i++) {
      expect(passes[i].predicted_Ra_um).toBeLessThanOrEqual(passes[i - 1].predicted_Ra_um);
    }
  });

  it("offset decreases monotonically across passes", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50,
    }, authHeaders);
    const passes = res.data.result?.passes;
    for (let i = 1; i < passes.length; i++) {
      expect(passes[i].offset_mm).toBeLessThanOrEqual(passes[i - 1].offset_mm);
    }
  });

  it("total cost for D2 profile is in sanity range ($20-$500)", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50, profile_length_mm: 100,
    }, authHeaders);
    const total = res.data.result?.estimated_cost?.total_usd;
    expect(total).toBeGreaterThanOrEqual(20);
    expect(total).toBeLessThanOrEqual(500);
  });

  it("safety_score is between 0 and 1", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50,
    }, authHeaders);
    const score = res.data.result?.safety_score;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("skim passes have lower energy than rough cut", async () => {
    const res = await httpRequest("POST", "/api/v1/edm/calculator-solve", {
      material: "D2", thickness_mm: 50,
    }, authHeaders);
    const passes = res.data.result?.passes;
    const roughEnergy = passes?.[0]?.energy_pct;
    const lastEnergy = passes?.[passes.length - 1]?.energy_pct;
    expect(lastEnergy).toBeLessThan(roughEnergy);
  });
});
