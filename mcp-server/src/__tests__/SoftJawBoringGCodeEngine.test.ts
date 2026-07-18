/**
 * SoftJawBoringGCodeEngine.test.ts — U-whiskey-SoftJawBoringGCodeEngine-TEST
 * ==========================================================================
 * REAL reference-value coverage for SoftJawBoringGCodeEngine
 * (src/engines/SoftJawBoringGCodeEngine.ts), which was WIRED into camDispatcher
 * (`soft_jaw_boring_generate` → camDispatcher.ts:20766) but had ZERO test files
 * referencing it. Soft-jaw boring is a core lathe workholding op: the raw jaws
 * are bored to the finished OD + a material-specific spring-back clearance so the
 * part grips concentrically. A wrong bore diameter scraps the jaws; a bore that
 * crosses the jaw-bolt circle destroys the tool.
 *
 * Every expected value below is derived from the engine's OWN published formulas
 * (JSDoc + body), not from a golden log:
 *   - bore_diameter = finished_od + clearance
 *   - clearance: steel 0.05 / aluminum 0.10 / titanium 0.03 / custom 0.05
 *     (custom_clearance_mm, when supplied, OVERRIDES the material default)
 *   - bolt interference: boltInnerRadius = bolt_pattern_radius − bolt_head_dia/2;
 *     interferes (relief required) when boreDia/2 >= boltInnerRadius (INCLUSIVE)
 *   - G71 rough / G70 finish cycle per controller dialect (block numbering differs)
 *
 * ROUND-TRIP: the primary functional cases drive the LIVE `prism_cam` dispatcher
 * (registerCamDispatcher), proving the wired path is numerically correct end-to-end
 * (R15 "through the dispatcher, not just the singleton"). CONTRACT NOTES verified
 * against the live handler:
 *   - handler sets `result = { success:true, data:<engineResult> }` then the
 *     post-switch return wraps `JSON.stringify(slimResponse(result))`
 *     (camDispatcher.ts:21621). slimResponse STRIPS null/undefined values and
 *     EMPTY arrays — so a no-warning result drops `warnings`/`bolt_clearance_details`
 *     (read via `?? []` / optional).
 *   - normalizeParams is ADDITIVE (keeps the original snake_case + the nested
 *     `workpiece`/`chuck`/`machine` objects), so nested keys reach the engine intact.
 *
 * ADVERSARIAL/degenerate inputs are pinned on the singleton directly (bypassing the
 * pre-toolpath safety hook). The three former gaps (unknown dialect / non-finite or
 * non-positive OD / partial chuck spec) are now GUARDED by defensive input validation
 * in the engine; those cases assert the guarded/warned behavior (SoftJawGuard FIX).
 *
 * @engine SoftJawBoringGCodeEngine
 * @dispatcher prism_cam / soft_jaw_boring_generate
 */

import { describe, it, expect, beforeAll } from "vitest";

import {
  softJawBoringGCodeEngine,
  type SoftJawBoringInput,
  type SoftJawBoringResult,
  type ControllerDialect,
} from "../engines/SoftJawBoringGCodeEngine.js";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";

// ─── Dispatcher round-trip harness ────────────────────────────────────────────
interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return { tools, tool(name, _d, _s, handler) { tools.push({ name, handler }); } };
}

let camHandler: CapturedTool["handler"];
beforeAll(() => {
  const srv = makeStubServer();
  registerCamDispatcher(srv as unknown as Parameters<typeof registerCamDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_cam");
  if (!t) throw new Error("prism_cam not registered");
  camHandler = t.handler;
});

/** Drive soft_jaw_boring_generate and return the engine result payload (`data`). */
async function boreViaCam(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = (await camHandler({ action: "soft_jaw_boring_generate", params })) as {
    content?: Array<{ text?: string }>;
  };
  const body = JSON.parse(res.content?.[0]?.text ?? "null") as Record<string, unknown>;
  // Fail loud if the pre-toolpath safety hook blocked benign geometry.
  expect(body.blocked, `dispatcher blocked: ${JSON.stringify(body)}`).not.toBe(true);
  expect(body.success).toBe(true);
  return body.data as Record<string, unknown>;
}

const lines = (d: Record<string, unknown>): string[] => d.gcode_lines as string[];

// ══════════════════════════════════════════════════════════════════════════════
// A. ROUND-TRIP through prism_cam — happy path + material clearances
// ══════════════════════════════════════════════════════════════════════════════
describe("SoftJawBoringGCodeEngine round-trip — bore diameter & Fanuc G71/G70", () => {
  it("steel, Ø50 → bore = 50 + 0.05 = 50.05mm; full Fanuc cycle, 18 lines", async () => {
    const d = await boreViaCam({
      workpiece: { finished_od_mm: 50, material: "steel" },
      chuck: {},
      machine: { controller_dialect: "fanuc" },
    });
    expect(d.bore_diameter_mm).toBe(50.05);
    expect(d.bore_clearance_mm as number).toBeCloseTo(0.05, 10);
    expect(d.bolt_clearance_ok).toBe(true);
    expect(d.relief_groove_required).toBe(false);
    expect(d.controller).toBe("fanuc");

    const g = lines(d);
    expect(g.length).toBe(18);
    expect(g[0]).toBe("(SOFT JAW BORING - Bore Dia 50.050mm)");
    expect(g[1]).toBe("(Controller: FANUC)");
    expect(g).toContain("G97 S800 M03");           // default RPM 800, G97 constant surface off
    expect(g).toContain("G71 U1.5 R0.5");           // default DOC 1.5, retract 0.5
    expect(g).toContain("G71 P100 Q200 U0.2 W0.1 F0.15"); // rough feed 0.15
    expect(g).toContain("N100 G00 X52.050");        // approach = boreDia + 2
    expect(g).toContain("X50.050 Z0");              // bore to finished dia
    expect(g).toContain("Z-15.0");                  // default bore depth 15mm
    expect(g).toContain("G70 P100 Q200 F0.08");     // finish feed 0.08
    expect(g[g.length - 2]).toBe("M05");
    expect(g[g.length - 1]).toBe("M30");
    // slimResponse drops the empty warnings[] → read defensively
    expect(((d.warnings as string[] | undefined) ?? []).length).toBe(0);
  });

  it("aluminum → softer material gets 0.10mm clearance (Ø80 → 80.10)", async () => {
    const d = await boreViaCam({
      workpiece: { finished_od_mm: 80, material: "aluminum" },
      chuck: {},
      machine: { controller_dialect: "fanuc" },
    });
    expect(d.bore_clearance_mm as number).toBeCloseTo(0.1, 10);
    expect(d.bore_diameter_mm).toBe(80.1);
    expect(lines(d)).toContain("X80.100 Z0");
    expect(lines(d)).toContain("N100 G00 X82.100"); // 80.10 + 2
  });

  it("titanium → low spring-back gets 0.03mm clearance (Ø25 → 25.03)", async () => {
    const d = await boreViaCam({
      workpiece: { finished_od_mm: 25, material: "titanium" },
      chuck: {},
      machine: { controller_dialect: "fanuc" },
    });
    expect(d.bore_clearance_mm as number).toBeCloseTo(0.03, 10);
    expect(d.bore_diameter_mm).toBe(25.03);
    expect(lines(d)).toContain("X25.030 Z0");
  });

  it("custom_clearance_mm OVERRIDES the material default (aluminum 0.10 → forced 0.20)", async () => {
    const d = await boreViaCam({
      workpiece: { finished_od_mm: 40, material: "aluminum", custom_clearance_mm: 0.2 },
      chuck: {},
      machine: { controller_dialect: "fanuc" },
    });
    // NOT 0.10 (aluminum default) — the explicit custom clearance wins
    expect(d.bore_clearance_mm as number).toBeCloseTo(0.2, 10);
    expect(d.bore_diameter_mm).toBe(40.2);
  });

  it("custom cutting params flow through (RPM/DOC/feeds) into the cycle", async () => {
    const d = await boreViaCam({
      workpiece: { finished_od_mm: 60, material: "steel" },
      chuck: {},
      machine: { controller_dialect: "fanuc" },
      cutting_params: { spindle_rpm: 1200, rough_depth_mm: 2, rough_feed_mm_rev: 0.2, finish_feed_mm_rev: 0.05 },
    });
    const g = lines(d);
    expect(g).toContain("G97 S1200 M03");
    expect(g).toContain("G71 U2.0 R0.5");
    expect(g).toContain("G71 P100 Q200 U0.2 W0.1 F0.2");
    expect(g).toContain("G70 P100 Q200 F0.05");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// B. ROUND-TRIP — bolt-circle interference geometry (safety-critical)
// ══════════════════════════════════════════════════════════════════════════════
describe("SoftJawBoringGCodeEngine round-trip — jaw-bolt clearance check", () => {
  it("clearance OK: boreR 20.10 < boltInnerR 40.0 → margin 19.90mm, no relief", async () => {
    // boreDia = 40 + 0.20 = 40.20; boreR = 20.10
    // boltInnerR = 50 − 20/2 = 40.0; margin = 40.0 − 20.10 = 19.90
    const d = await boreViaCam({
      workpiece: { finished_od_mm: 40, custom_clearance_mm: 0.2 },
      chuck: { bolt_pattern_radius_mm: 50, bolt_head_dia_mm: 20 },
      machine: { controller_dialect: "fanuc" },
    });
    expect(d.bolt_clearance_ok).toBe(true);
    expect(d.relief_groove_required).toBe(false);
    expect(String(d.bolt_clearance_details)).toContain("Bolt clearance OK");
    expect(String(d.bolt_clearance_details)).toContain("19.90mm margin");
    expect(((d.warnings as string[] | undefined) ?? []).length).toBe(0);
  });

  it("INTERFERENCE: boreR 45.10 >= boltInnerR 30.0 → NOT ok, relief required, 2 warnings", async () => {
    // boreDia = 90 + 0.20 = 90.20; boreR = 45.10
    // boltInnerR = 40 − 20/2 = 30.0; 45.10 >= 30.0 → interferes
    const d = await boreViaCam({
      workpiece: { finished_od_mm: 90, custom_clearance_mm: 0.2 },
      chuck: { bolt_pattern_radius_mm: 40, bolt_head_dia_mm: 20 },
      machine: { controller_dialect: "fanuc" },
    });
    expect(d.bolt_clearance_ok).toBe(false);
    expect(d.relief_groove_required).toBe(true);
    const w = d.warnings as string[];
    expect(w.length).toBe(2);
    expect(w[1]).toBe("Relief groove required in bore profile to clear bolt heads");
    expect(String(d.bolt_clearance_details)).toContain("interferes with bolt");
    expect(String(d.bolt_clearance_details)).toContain("R=45.1");   // boreRadius.toFixed(1)
    expect(String(d.bolt_clearance_details)).toContain("R=30.0mm"); // boltInnerRadius.toFixed(1)
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// C. ROUND-TRIP — controller dialect divergence (G71 block numbering / cycle form)
// ══════════════════════════════════════════════════════════════════════════════
describe("SoftJawBoringGCodeEngine round-trip — controller dialects", () => {
  const steel50 = () => ({
    workpiece: { finished_od_mm: 50, material: "steel" as const },
    chuck: {},
  });

  it("Haas mirrors the Fanuc P100/Q200 block numbering (NGC = Fanuc-compatible)", async () => {
    const d = await boreViaCam({ ...steel50(), machine: { controller_dialect: "haas" } });
    expect(d.controller).toBe("haas");
    const g = lines(d);
    expect(g[1]).toBe("(Controller: HAAS)");
    expect(g).toContain("G71 P100 Q200 U0.2 W0.1 F0.15");
    expect(g).toContain("N100 G00 X52.050");
    expect(g).toContain("G70 P100 Q200 F0.08");
  });

  it("Okuma uses distinct P1000/Q2000 (N1000/N2000) block numbering", async () => {
    const d = await boreViaCam({ ...steel50(), machine: { controller_dialect: "okuma" } });
    const g = lines(d);
    expect(g).toContain("G71 P1000 Q2000 U0.2 W0.1 F0.15");
    expect(g).toContain("N1000 G00 X52.050");
    expect(g).toContain("N2000 G00 Z2.0");
    expect(g).toContain("G70 P1000 Q2000 F0.08");
    // must NOT reuse the Fanuc 100/200 numbering
    expect(g).not.toContain("N100 G00 X52.050");
    expect(g).not.toContain("G70 P100 Q200 F0.08");
  });

  it("Mazak omits the trailing 'Z0' on the bore line and drops the SAFE RETRACT note", async () => {
    const d = await boreViaCam({ ...steel50(), machine: { controller_dialect: "mazak" } });
    const g = lines(d);
    expect(g).toContain("X50.050");                        // Mazak: bare X, no Z0
    expect(g).not.toContain("X50.050 Z0");                 // (the Fanuc form)
    expect(g).toContain("G00 X100.0 Z50.0");               // retract, no comment
    expect(g).not.toContain("G00 X100.0 Z50.0 (SAFE RETRACT)");
  });

  it("Siemens emits a CYCLE95 contour cycle (M3, not M03) — 16 lines", async () => {
    const d = await boreViaCam({ ...steel50(), machine: { controller_dialect: "siemens" } });
    const g = lines(d);
    expect(g.length).toBe(16);
    expect(g).toContain("G97 S800 M3");                    // Siemens spindle-on = M3
    expect(g).toContain('CYCLE95("BORE_CONTOUR",1.5,0,0.2,0.1,0.15,0.08,7)');
    expect(g).not.toContain("G71 U1.5 R0.5");              // no Fanuc-style G71 block
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// D. SINGLETON — edge cases, failure modes & adversarial inputs
//    Driven on the engine directly so the pre-toolpath safety hook does not mask
//    the raw engine behavior. The three former UNGUARDED hazards are now defensively
//    guarded in the engine; these cases assert the guarded/warned behavior (SoftJawGuard FIX).
// ══════════════════════════════════════════════════════════════════════════════
describe("SoftJawBoringGCodeEngine singleton — edge & failure modes", () => {
  const gen = (input: SoftJawBoringInput): SoftJawBoringResult =>
    softJawBoringGCodeEngine.generate(input);

  it("material 'custom' with NO custom_clearance_mm falls back to the 0.05mm default", async () => {
    const r = gen({
      workpiece: { finished_od_mm: 30, material: "custom" },
      chuck: {},
      machine: { controller_dialect: "fanuc" },
    });
    expect(r.bore_clearance_mm).toBeCloseTo(0.05, 10);
    expect(r.bore_diameter_mm).toBe(30.05);
  });

  it("GUARDED — partial chuck spec (bolt radius only, no head dia) now flags bolt_clearance_ok=false + warning", () => {
    // FIX (SoftJawGuard, gap #3): a partial spec cannot run the interference check, so the
    // engine now returns bolt_clearance_ok=false + a warning instead of an optimistic true.
    const r = gen({
      workpiece: { finished_od_mm: 200, material: "steel" }, // huge bore — would obviously interfere
      chuck: { bolt_pattern_radius_mm: 40 },                  // missing bolt_head_dia_mm
      machine: { controller_dialect: "fanuc" },
    });
    expect(r.bolt_clearance_ok).toBe(false);           // was optimistically true — now flagged not-verified
    expect(String(r.bolt_clearance_details)).toContain("Incomplete chuck bolt spec");
    expect(r.relief_groove_required).toBe(false);      // cannot assert relief without the full spec
    expect(r.warnings.length).toBe(1);                 // one warning: incomplete spec
    expect(r.gcode_lines.length).toBe(18);             // bore geometry itself is valid → full cycle still emitted
  });

  it("boundary — boreR EXACTLY equal to boltInnerR counts as interference (>= is inclusive)", () => {
    // boreDia = 40 + 0.20 = 40.20; boreR = 20.10.  boltInnerR = 30.10 − 20/2 = 20.10.
    const r = gen({
      workpiece: { finished_od_mm: 40, custom_clearance_mm: 0.2 },
      chuck: { bolt_pattern_radius_mm: 30.1, bolt_head_dia_mm: 20 },
      machine: { controller_dialect: "fanuc" },
    });
    expect(r.bolt_clearance_ok).toBe(false);
    expect(r.relief_groove_required).toBe(true);
  });

  it("GUARDED — zero finished OD is now rejected with a warned EMPTY program (fix: OD must be > 0)", () => {
    // FIX (SoftJawGuard, gap #2): a zero-Ø bore is nonsensical → rejected before emit.
    const r = gen({
      workpiece: { finished_od_mm: 0, material: "steel" },
      chuck: {},
      machine: { controller_dialect: "fanuc" },
    });
    expect(r.gcode_lines.length).toBe(0);               // no program emitted
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toContain("finished_od_mm");
    expect(r.bore_diameter_mm).toBe(0);
  });

  it("GUARDED — negative finished OD is rejected before any G-code is emitted (fix: no negative-Ø bore)", () => {
    // FIX (SoftJawGuard, gap #2): boreDia = -9.95 no longer reaches the G-code — rejected up front.
    const r = gen({
      workpiece: { finished_od_mm: -10, material: "steel" },
      chuck: {},
      machine: { controller_dialect: "fanuc" },
    });
    expect(r.gcode_lines.length).toBe(0);
    expect(r.gcode_lines.some((l) => l.includes("X-9.950"))).toBe(false); // never emitted
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toContain("finished_od_mm");
  });

  it("GUARDED — NaN finished OD is rejected, never propagates 'XNaN' into the G-code (fix: finite guard)", () => {
    // FIX (SoftJawGuard, gap #2): !Number.isFinite(NaN) → rejected, so no 'XNaN' move is ever emitted.
    const r = gen({
      workpiece: { finished_od_mm: NaN, material: "steel" },
      chuck: {},
      machine: { controller_dialect: "fanuc" },
    });
    expect(r.gcode_lines.length).toBe(0);
    expect(r.gcode_lines.some((l) => l.includes("NaN"))).toBe(false); // no NaN reaches any G-code line
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toContain("finished_od_mm");
  });

  it("GUARDED — unknown controller dialect now emits NO program + an explicit warning (fix: never silently empty)", () => {
    // FIX (SoftJawGuard, gap #1): an unrecognized dialect (reachable when an upstream forwards
    // a raw string past the TS type) has no G71/G70 template. Rather than a "safe-looking" empty
    // header-only program with ZERO warning, the engine now rejects with an empty program + warning.
    const r = gen({
      workpiece: { finished_od_mm: 50, material: "steel" },
      chuck: {},
      machine: { controller_dialect: "grbl" as unknown as ControllerDialect },
    });
    expect(r.gcode_lines.length).toBe(0);                       // no program — not a 6-line stub
    expect(r.gcode_lines.some((l) => l.includes("G71"))).toBe(false); // NO rough cycle
    expect(r.gcode_lines.some((l) => l.includes("G70"))).toBe(false); // NO finish cycle
    expect(r.warnings.length).toBeGreaterThan(0);              // NOW flagged — was the hazard
    expect(r.warnings[0]).toContain("Unknown controller dialect");
    expect(r.warnings[0]).toContain("grbl");
    expect(r.controller).toBe("grbl");                         // dialect echoed back
    expect(r.bore_diameter_mm).toBe(50.05);                   // bore geometry is valid → reported honestly
  });
});
