/**
 * camDispatcher U-WIRE-CAM-SUBPROG-SYNC round-trip tests.
 *
 * Validates 6 new prism_cam actions wiring two dispatcher-DARK engines:
 *   SubprogramExtractionEngine -> subprogram_extract / subprogram_quick_check /
 *     subprogram_estimate_savings (G-code repeated-pattern -> subprogram extraction)
 *   SyncCodeVerificationEngine -> synccode_verify / synccode_dialects /
 *     synccode_stats (multi-channel mill-turn/Swiss sync-code verification)
 *
 * Pattern: LIVE dispatcher round-trip via registerCamDispatcher(shim). prism_cam
 * wraps a successful result as content[0].text = JSON.stringify(slimResponse(result))
 * (the engine payload is the TOP-LEVEL JSON, NOT .data-nested), and returns a raw
 * { success:false } on a dispatcherError (schema/throw). slimResponse strips
 * null/undefined/empty-arrays but KEEPS false/0 (assert empty issues/subprograms via
 * ?? []). Both engines are stateless singletons -> no reset needed. Inputs are crafted
 * for deterministic detection (identical normalized G-code blocks; matched vs orphan
 * okuma G126/G127 pairs).
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA autonomous loop iteration 8.
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-CAM-SUBPROG-SYNC
 */

import { describe, it, expect } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";

interface CapturedTool {
  name: string; description: string; schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}
function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerCamDispatcher(s as unknown as { tool: MockMCPServer["tool"] });
  return s;
}
async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools.find((t) => t.name === "prism_cam") ?? server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// Two identical 5-line blocks (coords normalized to the same hash) -> 1 repeated pattern.
const REPEATED_GCODE = [
  "G0 X0 Y0", "G1 Z-1 F100", "G1 X10 F200", "G1 Y10", "G0 Z5",
  "G0 X20 Y20",
  "G0 X0 Y0", "G1 Z-1 F100", "G1 X10 F200", "G1 Y10", "G0 Z5",
];
const NO_REPEAT_GCODE = ["G0 X0 Y0", "G1 Z-1 F100", "G1 X5 F200", "G2 X8 Y8 R3", "G0 Z5", "M30"];

describe("U-WIRE-CAM-SUBPROG-SYNC — Subprogram + SyncCode via prism_cam", () => {
  it("registers the prism_cam tool", () => {
    const tool = newServer().tools.find((t) => t.name === "prism_cam");
    expect(tool?.name).toBe("prism_cam");
  });

  // ── SubprogramExtractionEngine ──────────────────────────────────────────
  it("subprogram_extract detects a repeated pattern", async () => {
    const s = newServer();
    const r = await call(s, "subprogram_extract", { gcode: REPEATED_GCODE });
    expect(r.ok).toBe(true);
    expect(r.data.original_lines).toBe(11);
    expect(typeof r.data.reduction_pct).toBe("number");
    expect(r.data.patterns_found).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(r.data.subprograms ?? [])).toBe(true);
    expect(((r.data.ai_reasoning ?? []) as unknown[]).length).toBeGreaterThan(0);
  });

  it("subprogram_extract missing gcode -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "subprogram_extract", { params: { min_pattern_length: 5 } });
    expect(r.ok).toBe(false);
  });

  it("subprogram_extract honors controller=siemens", async () => {
    const s = newServer();
    const r = await call(s, "subprogram_extract", { gcode: REPEATED_GCODE, params: { controller: "siemens" } });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.subprograms ?? [])).toBe(true);
  });

  it("subprogram_extract invalid controller enum -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "subprogram_extract", { gcode: REPEATED_GCODE, params: { controller: "not-a-controller" } });
    expect(r.ok).toBe(false);
  });

  it("subprogram_quick_check true on repeated, false on non-repeated", async () => {
    const s = newServer();
    const yes = await call(s, "subprogram_quick_check", { gcode: REPEATED_GCODE });
    expect(yes.ok).toBe(true);
    expect(yes.data.has_patterns).toBe(true);
    const no = await call(s, "subprogram_quick_check", { gcode: NO_REPEAT_GCODE });
    expect(no.ok).toBe(true);
    expect(no.data.has_patterns).toBe(false); // false survives slimming
  });

  it("subprogram_estimate_savings returns numeric estimate", async () => {
    const s = newServer();
    const r = await call(s, "subprogram_estimate_savings", { gcode: REPEATED_GCODE });
    expect(r.ok).toBe(true);
    expect(typeof r.data.potential_reduction_pct).toBe("number");
    expect(r.data.patterns_estimate).toBeGreaterThanOrEqual(1);
  });

  // ── SyncCodeVerificationEngine ──────────────────────────────────────────
  it("synccode_verify okuma matched G126/G127 -> valid, 2 sync points", async () => {
    const s = newServer();
    const r = await call(s, "synccode_verify", {
      programs: [
        { channel: 1, lines: ["G0 X0", "G126 P1", "G1 X10"] },
        { channel: 2, lines: ["G127 P1", "G1 Y10"] },
      ],
      dialect: "okuma",
    });
    expect(r.ok).toBe(true);
    expect(r.data.is_valid).toBe(true);
    expect(r.data.channels_analyzed).toBe(2);
    expect(r.data.total_sync_points).toBe(2);
  });

  it("synccode_verify okuma orphan wait -> invalid with critical orphan issue", async () => {
    const s = newServer();
    const r = await call(s, "synccode_verify", {
      programs: [
        { channel: 1, lines: ["G0 X0", "G126 P1", "G1 X10"] },
        { channel: 2, lines: ["G0 Y0", "G1 Y10"] },
      ],
      dialect: "okuma",
    });
    expect(r.ok).toBe(true);
    expect(r.data.is_valid).toBe(false);
    const issues = (r.data.issues ?? []) as Array<{ kind: string; severity: string }>;
    expect(issues.some((i) => i.kind === "orphan" && i.severity === "critical")).toBe(true);
  });

  it("synccode_verify defaults to okuma when dialect omitted", async () => {
    const s = newServer();
    const r = await call(s, "synccode_verify", {
      programs: [{ channel: 1, lines: ["G0 X0", "G1 X10"] }, { channel: 2, lines: ["G1 Y5"] }],
    });
    expect(r.ok).toBe(true);
    expect(r.data.dialect).toBe("okuma");
    expect(r.data.channels_analyzed).toBe(2);
  });

  it("synccode_verify missing programs -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "synccode_verify", { dialect: "okuma" });
    expect(r.ok).toBe(false);
  });

  it("synccode_verify invalid dialect enum -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "synccode_verify", {
      programs: [{ channel: 1, lines: ["G0 X0"] }],
      dialect: "not-a-dialect",
    });
    expect(r.ok).toBe(false);
  });

  it("synccode_dialects lists the 4 supported dialects", async () => {
    const s = newServer();
    const r = await call(s, "synccode_dialects");
    expect(r.ok).toBe(true);
    const dialects = r.data.dialects as string[];
    expect(dialects).toContain("okuma");
    expect(dialects).toContain("siemens");
    expect(dialects.length).toBe(4);
  });

  it("synccode_stats returns supported dialects + issue kinds", async () => {
    const s = newServer();
    const r = await call(s, "synccode_stats");
    expect(r.ok).toBe(true);
    expect((r.data.supported_dialects as string[]).length).toBe(4);
    expect((r.data.detected_issue_kinds as string[]).some((k) => k === "deadlock")).toBe(true);
  });
});
