/**
 * calcDispatcher × RoughnessConversionEngine wire — completes a half-wired action.
 *
 * Before: roughness_convert was in ACTIONS array + calcExtractKeyValues slimmer
 * (line 242-243) but had NO case handler in the dispatch switch — calls fell
 * through to "Unknown calculation action" error.
 *
 * After: full ISO 4287/1302 conversion between Ra_um, Rz_um, Rq_um, Rt_um,
 * Ra_uin, N_grade. Returns input/output values + all_equivalents map +
 * n_grade_label + typical_process + uncertainty_pct.
 *
 * Conversion factors (from engine source, used as canonical references):
 *   Rz ≈ 4.0 × Ra      (ISO typical)
 *   Rq ≈ 1.11 × Ra     (Gaussian assumption, π/2√2)
 *   Rt ≈ 6.5 × Ra      (typical machined)
 *   Ra(µin) = Ra(µm) × 39.37  (exact unit conversion)
 *   N-grade table: N1=0.025, N2=0.05, N3=0.1, N4=0.2, N5=0.4, N6=0.8,
 *                  N7=1.6, N8=3.2, N9=6.3, N10=12.5, N11=25, N12=50  (µm Ra)
 *
 * @milestone OBSIDIAN-PRISM-OS-MS0
 * @unit U-ORPHAN-RESCUE-ROUGHNESS
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

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
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCalcDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

describe("calcDispatcher × RoughnessConversionEngine wire (U-ORPHAN-RESCUE-ROUGHNESS)", () => {
  // ── Ra_um → Rz_um (the most common conversion) ────────────────────────
  it("Ra=0.4 µm → Rz=1.6 µm (ratio 4.0)", async () => {
    const r = await call(server, "roughness_convert", {
      value: 0.4, from_scale: "Ra_um", to_scale: "Rz_um",
    });
    // slimmer mapper kicks in: {from, to, value, n_grade, process, unc_pct}
    // But under no pressure the full engine result also has the {input_*, output_*,
    // all_equivalents, n_grade_label, typical_process, uncertainty_pct} fields.
    // Either shape is acceptable — check both possible payloads.
    expect(r.ok).toBe(true);
    const value = (r.data.value ?? r.data.output_value) as number;
    expect(value).toBeCloseTo(1.6, 4);
  });

  // ── Ra_um → Rq_um (Gaussian) ──────────────────────────────────────────
  it("Ra=1.0 µm → Rq=1.11 µm (Gaussian π/2√2)", async () => {
    const r = await call(server, "roughness_convert", {
      value: 1.0, from_scale: "Ra_um", to_scale: "Rq_um",
    });
    const value = (r.data.value ?? r.data.output_value) as number;
    expect(value).toBeCloseTo(1.11, 4);
  });

  // ── Ra_um → Rt_um ─────────────────────────────────────────────────────
  it("Ra=2.0 µm → Rt=13.0 µm (ratio 6.5)", async () => {
    const r = await call(server, "roughness_convert", {
      value: 2.0, from_scale: "Ra_um", to_scale: "Rt_um",
    });
    const value = (r.data.value ?? r.data.output_value) as number;
    expect(value).toBeCloseTo(13.0, 4);
  });

  // ── Ra_um → Ra_uin (exact unit conversion) ────────────────────────────
  it("Ra=1.0 µm → Ra=39.37 µin (exact)", async () => {
    const r = await call(server, "roughness_convert", {
      value: 1.0, from_scale: "Ra_um", to_scale: "Ra_uin",
    });
    const value = (r.data.value ?? r.data.output_value) as number;
    expect(value).toBeCloseTo(39.37, 4);
  });

  // ── Ra_um → N_grade (discrete table) ──────────────────────────────────
  it("Ra=0.4 µm → N5 (canonical N-grade table)", async () => {
    const r = await call(server, "roughness_convert", {
      value: 0.4, from_scale: "Ra_um", to_scale: "N_grade",
    });
    const value = (r.data.value ?? r.data.output_value) as number;
    expect(value).toBe(5);
  });

  it("Ra=1.6 µm → N7", async () => {
    const r = await call(server, "roughness_convert", {
      value: 1.6, from_scale: "Ra_um", to_scale: "N_grade",
    });
    expect((r.data.value ?? r.data.output_value)).toBe(7);
  });

  // ── reverse: N_grade → Ra_um ──────────────────────────────────────────
  it("N5 → Ra=0.4 µm (round-trip with above)", async () => {
    const r = await call(server, "roughness_convert", {
      value: 5, from_scale: "N_grade", to_scale: "Ra_um",
    });
    const value = (r.data.value ?? r.data.output_value) as number;
    expect(value).toBeCloseTo(0.4, 4);
  });

  // ── uncertainty calculation (combined from both endpoints) ─────────────
  it("Rz_um → Rt_um carries highest combined uncertainty (Rz=15, Rt=20)", async () => {
    const r = await call(server, "roughness_convert", {
      value: 4.0, from_scale: "Rz_um", to_scale: "Rt_um",
    });
    // Combined uncertainty = sqrt(15² + 20²) = sqrt(225+400) = sqrt(625) = 25
    const unc = (r.data.unc_pct ?? r.data.uncertainty_pct) as number;
    expect(unc).toBeCloseTo(25.0, 1);
  });

  it("Ra_um → Ra_uin uncertainty=0 (both endpoints have zero uncertainty)", async () => {
    const r = await call(server, "roughness_convert", {
      value: 1.0, from_scale: "Ra_um", to_scale: "Ra_uin",
    });
    const unc = (r.data.unc_pct ?? r.data.uncertainty_pct) as number;
    expect(unc).toBe(0);
  });

  // ── all_equivalents map present for downstream consumption ─────────────
  it("response includes typical_process + n_grade_label for operator UX", async () => {
    const r = await call(server, "roughness_convert", {
      value: 0.4, from_scale: "Ra_um", to_scale: "Rz_um",
    });
    const proc = (r.data.process ?? r.data.typical_process) as string;
    const nLabel = (r.data.n_grade_label as string | undefined);
    // Either slim or full shape — at least one of process/typical_process must be set
    expect(typeof proc).toBe("string");
    expect(proc.length).toBeGreaterThan(0);
    // n_grade=5 → "Grinding, fine reaming" per PROCESS_BY_N table
    expect(proc).toBe("Grinding, fine reaming");
    // n_grade_label is only emitted in the full (non-slim) shape — check if present
    if (nLabel !== undefined) {
      expect(nLabel).toContain("N5");
    }
  });

  // ── identity (Ra_um → Ra_um) ──────────────────────────────────────────
  it("Ra_um → Ra_um is identity", async () => {
    const r = await call(server, "roughness_convert", {
      value: 0.8, from_scale: "Ra_um", to_scale: "Ra_um",
    });
    const value = (r.data.value ?? r.data.output_value) as number;
    expect(value).toBeCloseTo(0.8, 4);
  });

  // ── schema validation ────────────────────────────────────────────────
  it("schema rejects negative value (Zod nonnegative)", async () => {
    const r = await call(server, "roughness_convert", {
      value: -1, from_scale: "Ra_um", to_scale: "Rz_um",
    });
    expect(r.ok).toBe(false);
  });

  it("schema rejects invalid scale name", async () => {
    const r = await call(server, "roughness_convert", {
      value: 1, from_scale: "Ra_invalid", to_scale: "Rz_um",
    });
    expect(r.ok).toBe(false);
  });

  // ── contract preservation — no fall-through to peck_drill_optimize ────
  it("response does NOT contain unrelated peck_drill_optimize fields", async () => {
    const r = await call(server, "roughness_convert", {
      value: 0.4, from_scale: "Ra_um", to_scale: "Rz_um",
    });
    expect(r.ok).toBe(true);
    expect("ld_ratio" in r.data).toBe(false);
    expect("peck_strategy" in r.data).toBe(false);
    expect("adjusted_feed_mm_rev" in r.data).toBe(false);
  });
});
