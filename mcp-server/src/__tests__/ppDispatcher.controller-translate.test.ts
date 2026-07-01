/**
 * U-PP-UNMASK-CONTROLLER-TRANSLATE -- pp_controller_translate was wrongly wired to
 * PostProcessorTransformerEngine (a neural diffusion/tokenizer with NO translate/transform method),
 * so it ALWAYS returned {error:"translate not found"}. Cross-controller dialect translation is
 * GCodeTranspilerEngine's job. This re-routes the action to its real transpile() + adds a fail-loud
 * dialect guard (the pp controller enum is wider than the transpiler's 6-dialect set).
 *
 * Round-trips real G-code through the REAL dispatcher (registerPPDispatcher -> fakeServer handler)
 * and asserts CONCRETE dialect-specific output (siemens MCALL/`;` comments, okuma `G15 H0`).
 * slot:echo /loop (2026-06-10). @module __tests__/ppDispatcher.controller-translate
 */
import { describe, it, expect, beforeAll } from "vitest";

import { registerPPDispatcher } from "../tools/dispatchers/ppDispatcher.js";

describe("prism_pp::pp_controller_translate (GCodeTranspilerEngine round-trip)", () => {
  type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: "text"; text: string }>;
  }>;
  let invoke: (action: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

  beforeAll(() => {
    let captured: Handler | undefined;
    const fakeServer = {
      tool: (_n: string, _d: string, _s: unknown, handler: Handler) => { captured = handler; },
    };
    registerPPDispatcher(fakeServer as never);
    if (!captured) throw new Error("registerPPDispatcher did not register the prism_pp tool");
    const h = captured;
    invoke = async (action, params = {}) => JSON.parse((await h({ action, params })).content[0].text) as Record<string, unknown>;
  });

  // Fanuc-style program with a comment + a canned cycle, for cross-dialect transformation.
  const GCODE = "%\nO0001\nG90 G54\n(ROUGH PASS)\nG1 X10. Y10. F500\nG81 X5. Y5. Z-1. R2. F200\nM30\n%";

  it("fanuc -> siemens: emits the SIEMENS safe-start (MCALL) and reformats the comment to `;` (not `()`)", async () => {
    const r = await invoke("pp_controller_translate", {
      gcode: GCODE, sourceController: "fanuc", targetController: "siemens",
    });
    expect(r).not.toHaveProperty("error");
    const out = r.gcode as string;
    // Siemens-specific safe start contains MCALL (fanuc's does not) -> proves target-aware injection.
    expect(out).toContain("MCALL");
    // Comment reformatted to Siemens `;` line-comment; the Fanuc `(ROUGH PASS)` form is gone.
    expect(out).toContain(";ROUGH PASS");
    expect(out).not.toContain("(ROUGH PASS)");
  });

  it("fanuc -> okuma: emits the OKUMA-specific safe-start tokens `G15 H0` (absent for fanuc)", async () => {
    const r = await invoke("pp_controller_translate", {
      gcode: GCODE, sourceController: "fanuc", targetController: "okuma",
    });
    expect(r).not.toHaveProperty("error");
    expect(r.gcode as string).toContain("G15 H0");
    // Okuma uses `()` comments (same as fanuc), so the comment text survives.
    expect(r.gcode as string).toContain("ROUGH PASS");
    const stats = r.stats as { totalLines: number; warnings: string[] };
    expect(stats.totalLines).toBeGreaterThanOrEqual(7);
  });

  it("fanuc -> heidenhain: reformats the comment to heidenhain `;` style (3rd dialect, distinct from siemens MCALL)", async () => {
    const r = await invoke("pp_controller_translate", {
      gcode: GCODE, sourceController: "fanuc", targetController: "heidenhain",
    });
    expect(r).not.toHaveProperty("error");
    const out = r.gcode as string;
    // Heidenhain uses `;` line-comments (open=";" close="") like siemens, but its safe-start is the
    // generic G80 form (NO MCALL) -- proves per-dialect routing, not a siemens copy.
    expect(out).toContain(";ROUGH PASS");
    expect(out).not.toContain("MCALL");
  });

  it("GUARD: unsupported TARGET (hurco) fails loud with the supported set, no silent passthrough", async () => {
    const r = await invoke("pp_controller_translate", {
      gcode: GCODE, sourceController: "fanuc", targetController: "hurco",
    });
    expect(r.error).toBe("unsupported_dialect");
    expect(r).not.toHaveProperty("gcode");
    expect(r.supported as string[]).toEqual(["fanuc", "siemens", "heidenhain", "mazak", "okuma", "haas"]);
    expect(String(r.message)).toContain("hurco");
  });

  it("GUARD: unsupported SOURCE (mitsubishi) fails loud", async () => {
    const r = await invoke("pp_controller_translate", {
      gcode: GCODE, sourceController: "mitsubishi", targetController: "fanuc",
    });
    expect(r.error).toBe("unsupported_dialect");
    expect(String(r.message)).toContain("mitsubishi");
  });
});
