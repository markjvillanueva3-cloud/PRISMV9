/**
 * U-FE-SPECIALTY-FORMING-CONTRACT route guard (slot:bravo 2026-06-19).
 *
 * Proves /api/v1/forming/sheet-metal serves the REAL prism_forming:press_brake_calculate
 * action through a faithful adapter (param renames, free-string material -> engine enum,
 * AtomicValue unwrap, tonnes-force -> kN), replacing the prior 501. callTool is stubbed to
 * invoke the ACTUAL PressBrakeEngine, so the asserted numbers are reference values from the
 * real physics, not hand-mocked constants (R9: a green run is meaningful).
 *
 * Coverage: happy path + 3 failure/edge modes (dispatcher-error -> 400, unknown-material
 * fallback, omitted-field non-fabrication) + 2 adversarial (forwarded-param shape; the sibling
 * forming endpoints still fail loud with 501 rather than silent 404/200).
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CallToolFn } from "../routes/index.js";
import { createSpecialtyRouter } from "../routes/specialty.js";
import { pressBrakeEngine, type PressBrakeInput } from "../engines/PressBrakeEngine.js";

let server: http.Server;
let port = 0;
let lastForwarded: { tool: string; action: string; params: Record<string, unknown> } | null = null;

// Real round-trip: dispatch the actual engine for press_brake_calculate so the adapter is
// validated against true engine output. The sentinel thickness (-999) simulates a DISPATCHER-LAYER
// error ({error} body — e.g. a schema/validation failure), which is the only way a 400 is reached:
// PressBrakeEngine itself has no negative-geometry guard, so the adapter's isToolError->400 wiring
// is what's under test here, not engine validation. Any other action returns an error sentinel.
const callTool: CallToolFn = async (tool, action, params) => {
  lastForwarded = { tool, action, params: (params ?? {}) as Record<string, unknown> };
  if (tool === "prism_forming" && action === "press_brake_calculate") {
    if ((params as Record<string, unknown> | undefined)?.thickness_mm === -999) {
      return { error: "bad input" };
    }
    return pressBrakeEngine.calculate((params ?? {}) as PressBrakeInput);
  }
  return { error: `unexpected ${tool}:${action}` };
};

function httpRequest(
  method: string,
  urlPath: string,
  body?: unknown,
): Promise<{ status: number; json: any }> {
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
  // Mount at root so request paths match the router's own paths (/forming/*, /welding/*,
  // /grinding/*). In production index.ts mounts it at /api/v1; the prefix is orthogonal to
  // what this adapter guard verifies.
  app.use(createSpecialtyRouter(callTool));
  server = http.createServer(app);
  server.listen(0);
  await once(server, "listening");
  port = (server.address() as AddressInfo).port;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("/forming/sheet-metal -> prism_forming:press_brake_calculate", () => {
  it("forwards renamed geometry params + maps a free-string material to the engine enum", async () => {
    const { status } = await httpRequest("POST", "/forming/sheet-metal", {
      material: "Stainless 304",
      thickness_mm: 3,
      bend_length_mm: 1000,
      bend_angle_deg: 90,
      bend_radius_mm: 4,
      die_opening_mm: 24,
    });
    expect(status).toBe(200);
    expect(lastForwarded?.tool).toBe("prism_forming");
    expect(lastForwarded?.action).toBe("press_brake_calculate");
    expect(lastForwarded?.params.material).toBe("stainless_304"); // "Stainless 304" -> enum
    expect(lastForwarded?.params.inside_radius_mm).toBe(4); // bend_radius_mm rename
    expect(lastForwarded?.params.v_die_opening_mm).toBe(24); // die_opening_mm rename
    expect(lastForwarded?.params).not.toHaveProperty("bend_radius_mm"); // old key not leaked
  });

  it("unwraps AtomicValue + converts tonnes->kN against real engine reference values", async () => {
    const engineParams: PressBrakeInput = {
      material: "mild_steel",
      thickness_mm: 3,
      bend_length_mm: 1000,
      bend_angle_deg: 90,
      inside_radius_mm: 4,
      v_die_opening_mm: 24,
    };
    const ref = pressBrakeEngine.calculate(engineParams);
    const { status, json } = await httpRequest("POST", "/forming/sheet-metal", {
      material: "mild_steel",
      thickness_mm: 3,
      bend_length_mm: 1000,
      bend_angle_deg: 90,
      bend_radius_mm: 4,
      die_opening_mm: 24,
    });
    expect(status).toBe(200);
    expect(json.bend_allowance_mm).toBeCloseTo(ref.bend_allowance.value, 6);
    expect(json.bend_deduction_mm).toBeCloseTo(ref.bend_deduction.value, 6);
    expect(json.springback_angle_deg).toBeCloseTo(ref.springback_angle.value, 6);
    expect(json.tonnage_required).toBeCloseTo(ref.required_tonnage.value, 6);
    // bending_force_kN = required_tonnage * 9.80665 (tonne-force -> kN), exact conversion.
    expect(json.bending_force_kN).toBeCloseTo(ref.required_tonnage.value * 9.80665, 4);
    expect(json.bending_force_kN).toBeCloseTo(json.tonnage_required * 9.80665, 4);
  });

  it("maps recommendations from real engine warnings (cracking warning when Ri < thickness)", async () => {
    // inside_radius (1mm) < thickness (3mm) deterministically triggers the engine's
    // "cracking risk" warning; the adapter must surface engine warnings as recommendations.
    const ref = pressBrakeEngine.calculate({
      material: "mild_steel",
      thickness_mm: 3,
      bend_length_mm: 1000,
      bend_angle_deg: 90,
      inside_radius_mm: 1,
      v_die_opening_mm: 24,
    });
    expect(ref.warnings.some((w) => /cracking/i.test(w))).toBe(true); // engine precondition
    const { json } = await httpRequest("POST", "/forming/sheet-metal", {
      material: "mild_steel",
      thickness_mm: 3,
      bend_length_mm: 1000,
      bend_angle_deg: 90,
      bend_radius_mm: 1,
      die_opening_mm: 24,
    });
    expect(json.recommendations).toEqual(ref.warnings);
    expect(json.recommendations.some((w: string) => /cracking/i.test(w))).toBe(true);
  });

  it("omits fields the engine does not produce while still returning the real produced ones", async () => {
    const ref = pressBrakeEngine.calculate({ material: "aluminum_6061", thickness_mm: 2, bend_length_mm: 500, bend_angle_deg: 90 });
    const { json } = await httpRequest("POST", "/forming/sheet-metal", {
      material: "aluminum_6061",
      thickness_mm: 2,
      bend_length_mm: 500,
      bend_angle_deg: 90,
    });
    // produced field is faithful...
    expect(json.tonnage_required).toBeCloseTo(ref.required_tonnage.value, 6);
    // ...and the non-derivable fields are absent (omitted, NOT fabricated).
    expect(json).not.toHaveProperty("minimum_bend_radius_mm");
    expect(json).not.toHaveProperty("blank_size_mm");
  });

  it("falls back to mild_steel for an unknown material, matching the engine's default output", async () => {
    const ref = pressBrakeEngine.calculate({ material: "mild_steel", thickness_mm: 3, bend_length_mm: 1000, bend_angle_deg: 90, inside_radius_mm: 4, v_die_opening_mm: 24 });
    const { status, json } = await httpRequest("POST", "/forming/sheet-metal", {
      material: "unobtanium",
      thickness_mm: 3,
      bend_length_mm: 1000,
      bend_angle_deg: 90,
      bend_radius_mm: 4,
      die_opening_mm: 24,
    });
    expect(status).toBe(200);
    expect(lastForwarded?.params.material).toBe("mild_steel");
    expect(json.tonnage_required).toBeCloseTo(ref.required_tonnage.value, 6); // identical to mild_steel
  });

  it("surfaces a dispatcher error as 400 with the SPA-facing message (fail-loud)", async () => {
    const { status, json } = await httpRequest("POST", "/forming/sheet-metal", {
      material: "mild_steel",
      thickness_mm: -999, // sentinel -> stub returns { error }
    });
    expect(status).toBe(400);
    expect(json.message).toBe("bad input");
  });

  it("leaves the not-yet-wired forming siblings as fail-loud 501 (not silent 404/200)", async () => {
    const casting = await httpRequest("POST", "/forming/casting", {});
    expect(casting.status).toBe(501);
    expect(casting.json.deferredTo).toBe("U-FE-SPECIALTY-FORMING-CONTRACT");
    expect(casting.json.error).toBe("not_implemented");
    const molding = await httpRequest("POST", "/forming/molding", {});
    expect(molding.status).toBe(501);
    expect(molding.json.error).toBe("not_implemented");
  });
});
