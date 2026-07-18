/**
 * U-PP-VERIFY-ORCH-WIRE — wire the orphaned PostProcessorVerificationOrchestratorEngine
 * (0 consumers / 0 dispatcher refs — stop_on_unwired_assets) into ppDispatcher (prism_pp)
 * as `pp_verify_posted_nc`. Round-trips a real posted .NC file through the REAL dispatcher
 * (registerPPDispatcher → fakeServer handler) and asserts the engine's feature-coverage +
 * verdict + meta land in the JSON response. No mocks of the system-under-test.
 *
 * slot:bravo /loop (2026-06-01, claude-5e210e4e). @module __tests__/ppDispatcher.pp-verify-orch-wire
 */
import { describe, it, expect, beforeAll } from "vitest";
import { z } from "zod";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { registerPPDispatcher } from "../tools/dispatchers/ppDispatcher.js";

function writeNc(content: string, name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ppvw-"));
  const p = path.join(dir, name);
  fs.writeFileSync(p, content, "utf8");
  return p;
}

describe("prism_pp::pp_verify_posted_nc (PostProcessorVerificationOrchestratorEngine round-trip)", () => {
  type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: "text"; text: string }>;
  }>;
  let invoke: (action: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

  beforeAll(() => {
    let captured: Handler | undefined;
    const fakeServer = {
      tool: (_n: string, _d: string, _s: { action: z.ZodEnum; params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>> }, handler: Handler) => {
        captured = handler;
      },
    };
    registerPPDispatcher(fakeServer);
    if (!captured) throw new Error("registerPPDispatcher did not register the prism_pp tool");
    const h = captured;
    invoke = async (action, params = {}) => JSON.parse((await h({ action, params })).content[0].text) as Record<string, unknown>;
  });

  it("verifies a posted .NC and detects the HSM (G05.3) feature in feature-coverage", async () => {
    const nc = writeNc("%\nO0001\nG05.3 P1\nG1 X10 Y10 F500\nM30\n%", "hsm.nc");
    const r = await invoke("pp_verify_posted_nc", {
      nc_path: nc,
      machine_id: "HURCO-VM30I",
      controller_id: "hurco_winmax",
      quick: true,
    });
    const fc = r.feature_coverage as { nc_uses: string[] };
    expect(Array.isArray(fc.nc_uses)).toBe(true);
    expect(fc.nc_uses).toContain("hsm");
    expect(["PASS", "WARN", "FAIL"]).toContain(r.overall_verdict);
    const meta = r.meta as { nc_line_count: number; nc_byte_count: number };
    expect(meta.nc_line_count).toBeGreaterThan(0);
    expect(meta.nc_byte_count).toBeGreaterThan(0);
    // overall_score MUST honor its documented [0,1] invariant — regression guard for the
    // unclamped quality_score bug (was 1.66) fixed alongside this wire. (scrutiny arm B P1)
    expect(r.overall_score as number).toBeGreaterThanOrEqual(0);
    expect(r.overall_score as number).toBeLessThanOrEqual(1);
  });

  it("a plain .NC with no special features reports zero detected features", async () => {
    const nc = writeNc("%\nO0001\nG90 G21\nG0 X0 Y0\nG1 X10 F500\nM30\n%", "plain.nc");
    const r = await invoke("pp_verify_posted_nc", {
      nc_path: nc,
      machine_id: "X",
      controller_id: "Y",
      quick: true,
    });
    const fc = r.feature_coverage as { nc_uses: string[] };
    // slimResponse drops empty arrays — so nc_uses is either absent or [].
    expect((fc.nc_uses ?? []).length).toBe(0);
    expect(["PASS", "WARN"]).toContain(r.overall_verdict);
  });
});
