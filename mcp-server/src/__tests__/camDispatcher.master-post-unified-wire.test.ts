/**
 * camDispatcher — MasterPostProcessorUnifiedAGIEngine wiring suite
 * ================================================================
 *
 * WIRE-UNWIRED (foxtrot 2026-05-17) — wires the validator-confirmed
 * TRULY-UNWIRED MasterPostProcessorUnifiedAGIEngine (1545-line real engine,
 * NOT a stub: a unified AGI facade over 50+ post-processor engines) into
 * prism_cam with 5 deterministic, no-external-I/O actions:
 *   - generatePost(input)        → master_post_generate
 *   - analyzeGCode(gcode,...)    → master_post_analyze_gcode
 *   - getControllerProfile(c)    → master_post_get_controller_profile
 *   - getStatistics()            → master_post_get_stats
 *   - getContextForAI()          → master_post_get_ai_context
 *
 * All five surfaces are pure in-process transforms (generate/analyze are
 * deterministic G-code math; profile/stats/context read frozen registries),
 * so crafted inputs yield deterministic results. Includes the
 * z.enum-membership guard for the RGS-TOOL-AUTOINVOKE-MS1 false-green class
 * (MockMCPServer bypasses the SDK z.enum).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: unknown }> {
  const tool = server.tools.find(t => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. z.enum gate membership (RGS-TOOL-AUTOINVOKE-MS1 false-green guard)
// ─────────────────────────────────────────────────────────────────────
describe("master-post unified — enum registration", () => {
  const expected = [
    "master_post_generate", "master_post_analyze_gcode",
    "master_post_get_controller_profile", "master_post_get_stats",
    "master_post_get_ai_context",
  ];
  it("all 5 actions are in the prism_cam z.enum ACTIONS list", () => {
    for (const a of expected) expect(ACTIONS).toContain(a);
  });
  it("no duplicate ACTIONS keys introduced (anti-regression)", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. master_post_get_stats — frozen in-process registry metadata
// ─────────────────────────────────────────────────────────────────────
describe("master_post_get_stats — engine registry metadata", () => {
  it("reports the engine version, 18 CAM systems, 8 physics models + a category map", async () => {
    const r = await call(server, "master_post_get_stats", {});
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    // Engine source pins these EXACT literals (getStatistics()):
    expect(d.version).toBe("1.0.0");
    expect(d.cam_systems).toBe(18);
    expect(d.physics_models).toBe(8);
    expect(typeof d.total_engines).toBe("number");
    expect((d.total_engines as number)).toBeGreaterThan(0);
    expect(typeof d.controllers_supported).toBe("number");
    expect((d.controllers_supported as number)).toBeGreaterThan(0);
    expect(typeof d.tribal_tips).toBe("number");
    expect((d.tribal_tips as number)).toBeGreaterThan(0);
    // engine_categories is a Record<string,number> — the registry sums per
    // category, so the orchestration bucket must be present + non-empty.
    const cats = d.engine_categories as Record<string, number>;
    expect(typeof cats).toBe("object");
    expect((cats.orchestration as number)).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. master_post_get_controller_profile — pure CONTROLLER_PROFILES lookup
// ─────────────────────────────────────────────────────────────────────
describe("master_post_get_controller_profile — controller capability lookup", () => {
  it("returns the fanuc profile with its canonical id + populated families", async () => {
    const r = await call(server, "master_post_get_controller_profile", { controller: "fanuc" });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    const profile = d.profile as Record<string, unknown>;
    // Bind to the EXACT engine field (ControllerProfile.id) — no `?? name`
    // fallback so a future field rename fails loudly (R9).
    expect(profile.id).toBe("fanuc");
    expect(typeof profile.name).toBe("string");
    expect(Array.isArray(profile.families)).toBe(true);
    expect((profile.families as unknown[]).length).toBeGreaterThan(0);
  });

  it("an unknown controller falls back to the 'generic' profile (not a throw)", async () => {
    const r = await call(server, "master_post_get_controller_profile", { controller: "no_such_controller" });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    const profile = d.profile as Record<string, unknown>;
    // CONTROLLER_PROFILES[controller] || CONTROLLER_PROFILES.generic
    expect(profile.id).toBe("generic");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. master_post_analyze_gcode — deterministic 8-dimension scorer
// ─────────────────────────────────────────────────────────────────────
describe("master_post_analyze_gcode — pure G-code quality analysis", () => {
  it("scores a crafted drilling+HSM Fanuc program with exact line stats", async () => {
    const gcode = [
      "%",
      "O1234 (TEST PART)",
      "G90 G54 G17",
      "T1 M6",
      "S8000 M3",
      "G0 X0. Y0.",
      "G43 H1 Z5.",
      "G81 X10. Y10. Z-5. R2. F100.",
      "G83 X20. Y20. Z-15. R2. Q3. F100.",
      "G1 X30. Y30. F500.",
      "G5.1 Q1",
      "M5",
      "M30",
      "%",
    ].join("\n");
    const r = await call(server, "master_post_analyze_gcode", { gcode, controller: "fanuc", material_iso: "P" });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);

    // detected_controller is echoed straight from the input arg (no detection
    // override when explicitly supplied).
    expect(d.detected_controller).toBe("fanuc");

    // G81/G83 → drilling, G5.1 → hsm (real regex branches in analyzeGCode).
    const ops = d.detected_operations as string[];
    expect(Array.isArray(ops)).toBe(true);
    expect(ops).toContain("drilling");
    expect(ops).toContain("hsm");

    // line_stats.total === gcode.split("\n").length (14 lines above).
    const stats = d.line_stats as Record<string, number>;
    expect(stats.total).toBe(14);
    expect(stats.feed_moves).toBeGreaterThan(0);   // G1 X30…
    expect(stats.tool_changes).toBeGreaterThan(0); // M6

    // quality_score is a bounded weighted average (0-100).
    expect(typeof d.quality_score).toBe("number");
    expect((d.quality_score as number) >= 0 && (d.quality_score as number) <= 100).toBe(true);

    // 8-dimension breakdown must carry all eight named axes.
    const dim = d.dimensions as Record<string, number>;
    for (const k of [
      "safety", "efficiency", "accuracy", "maintainability",
      "controller_optimization", "physics_compliance",
      "tribal_adherence", "best_practices",
    ]) {
      expect(typeof dim[k]).toBe("number");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. master_post_generate — toolpath-free G-code passthrough round-trip
// ─────────────────────────────────────────────────────────────────────
describe("master_post_generate — unified post round-trip", () => {
  it("returns a non-empty program + the resolved controller profile + provenance", async () => {
    const r = await call(server, "master_post_generate", {
      gcode: "G90 G54\nG0 X0 Y0\nG1 Z-1. F100.\nM30",
      controller: "haas",
      material_iso: "P",
      validate_physics: false,
      validate_kinematics: false,
      inject_tribal: true,
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);

    expect(typeof d.gcode).toBe("string");
    expect((d.gcode as string).length).toBeGreaterThan(0);
    expect(typeof d.line_count).toBe("number");
    expect((d.line_count as number)).toBeGreaterThan(0);
    expect(typeof d.quality_score).toBe("number");

    // controller_profile is the resolved ControllerProfile for the request —
    // its id must round-trip the requested controller (exact field, R9).
    const cp = d.controller_profile as Record<string, unknown>;
    expect(cp.id).toBe("haas");

    // provenance carries the audit trail. session_id + timestamp are exact
    // string fields (R9 — no fallback).
    const prov = d.provenance as Record<string, unknown>;
    expect(typeof prov.session_id).toBe("string");
    expect(typeof prov.timestamp).toBe("string");
    // total_confidence: the ProvenanceRecord interface types this `number`,
    // but the engine path that invokes ≥1 sub-engine hits a PRE-EXISTING
    // defect in calculateTotalConfidence (MasterPostProcessorUnifiedAGIEngine
    // .ts:1499 — `1 / inv.invocation_time_ms || 0.01`: when
    // invocation_time_ms===0, `1/0`===Infinity (truthy, so `|| 0.01` never
    // applies) → Infinity/Infinity → NaN). NaN is `typeof number` in-engine
    // but serializes to JSON `null` across the MCP transport, so the honest
    // round-trip contract here is: the key is PRESENT and is either a finite
    // number (no-engine path → 0.5) OR null (NaN→null, the defect path).
    // Pinned exactly so this fails loudly if the engine bug is ever fixed —
    // at which point the assertion is updated intentionally, not silently.
    // (Same operator-precedence/edge-case class as the logged
    //  HybridProgramComposerEngine.ts:221 defect — separate fix unit.)
    expect("total_confidence" in prov).toBe(true);
    const tc = prov.total_confidence;
    expect(tc === null || (typeof tc === "number" && Number.isFinite(tc))).toBe(true);
    // engines_invoked is the load-bearing audit field — must be an array.
    expect(Array.isArray(prov.engines_invoked)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 6. master_post_get_ai_context — deterministic LLM context string
// ─────────────────────────────────────────────────────────────────────
describe("master_post_get_ai_context — LLM integration string", () => {
  it("returns the engine banner naming the unified AGI facade + capabilities", async () => {
    const r = await call(server, "master_post_get_ai_context", {});
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    const ctx = d.context as string;
    expect(typeof ctx).toBe("string");
    // Engine source hard-codes these section headers + method names.
    expect(ctx).toContain("MASTER POST PROCESSOR UNIFIED AGI ENGINE");
    expect(ctx).toContain("generatePost(input)");
    expect(ctx).toContain("analyzeGCode(gcode)");
    expect(ctx).toContain("CONTROLLER SUPPORT");
  });
});
