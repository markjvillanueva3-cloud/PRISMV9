/**
 * CLOSED-LOOP-MS0/U-CL2 — dispatcher round-trip for the toolpath template actions.
 * Invokes THROUGH the prism_turning dispatcher (not the engine singleton) to prove the
 * wiring: action enum → getEngine lazy import → engine method → result. Per CLAUDE.md
 * comprehensive-build: "A test must invoke through the dispatcher, not only the engine."
 */
import { describe, it, expect } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

/** Mock the MCP server: capture the registered prism_turning handler. */
function captureHandler(): (a: { action: string; params?: Record<string, any> }) => Promise<any> {
  let handler: any;
  registerTurningDispatcher({ tool: (_n: string, _d: string, _s: unknown, h: any) => { handler = h; } });
  if (typeof handler !== "function") throw new Error("dispatcher did not register a handler");
  return handler;
}

describe("prism_turning round-trip — toolpath template actions", () => {
  it("turning_template_build (thread) routes through dispatcher → G76 + G97 constant-RPM", async () => {
    const handler = captureHandler();
    const res = await handler({ action: "turning_template_build", params: { category: "thread", iso_group: "P" } });
    const text = JSON.stringify(res);
    expect(text).toContain("G76");  // thread canned cycle, via the engine
    expect(text).toContain("G97");  // threading is constant-RPM, not CSS — proves real engine output
    expect(text).toContain("thread");
  });

  it("turning_template_build (rough) → G71 + css-no-rpm-cap safety gate + sourced vc", async () => {
    const handler = captureHandler();
    const res = await handler({ action: "turning_template_build", params: { category: "rough", iso_group: "P" } });
    const text = JSON.stringify(res);
    expect(text).toContain("G71");
    expect(text).toContain("css-no-rpm-cap");
    expect(text).toContain("220"); // CANONICAL_TURNING_SPEEDS.P.rough — cutting condition flowed through
  });

  it("turning_template_list_all returns the full library (every op type)", async () => {
    const handler = captureHandler();
    const res = await handler({ action: "turning_template_list_all", params: { iso_group: "P" } });
    const text = JSON.stringify(res);
    expect(text).toContain("G71"); // roughing present
    expect(text).toContain("G76"); // threading present
    expect(text).toContain("G75"); // grooving/part-off present
  });
});
