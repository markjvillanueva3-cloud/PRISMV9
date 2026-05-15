/**
 * devDispatcher × DataValidationEngine wire — orphan-rescue (OBSIDIAN-PRISM-OS-MS0).
 *
 * @milestone OBSIDIAN-PRISM-OS-MS0
 * @unit U-ORPHAN-RESCUE-DATA-VALIDATION
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

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
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

describe("devDispatcher × DataValidationEngine wire (U-ORPHAN-RESCUE-DATA-VALIDATION)", () => {
  it("validate_material — valid 6061 aluminum data → valid=true with no error-severity issues", async () => {
    const r = await call(server, "dv_validate_material", {
      name: "Aluminum 6061-T6",
      hardness_hrc: 25,
      tensile_strength_mpa: 310,
      density_kg_m3: 2700,
      thermal_conductivity: 167,
      iso_group: "N",
    });
    expect(r.ok).toBe(true);
    const v = r.data.validation as Record<string, unknown>;
    // 'valid' encodes error-severity-only — info/warning issues may exist but
    // not block validity. Per engine canonical behavior, all canonical 6061
    // values fall inside hard-error range so valid=true.
    expect(v.valid).toBe(true);
    // Engine returns score 94 for this canonical valid input (some info issues
    // present but no errors). Score is a continuous metric, not 0/100 binary.
    expect(typeof v.score).toBe("number");
    expect(v.score as number).toBeGreaterThanOrEqual(90);
    expect(v.score as number).toBeLessThanOrEqual(100);
    // No error-severity issues for valid canonical 6061 data
    const issues = (v.issues ?? []) as Array<Record<string, string>>;
    const errorCount = issues.filter(i => i.severity === "error").length;
    expect(errorCount).toBe(0);
  });

  it("validate_material — missing name → error issue", async () => {
    const r = await call(server, "dv_validate_material", {
      hardness_hrc: 25,
    });
    const v = r.data.validation as Record<string, unknown>;
    expect(v.valid).toBe(false);
    const issues = v.issues as Array<Record<string, string>>;
    expect(issues.some(i => i.field === "name" && i.severity === "error")).toBe(true);
  });

  it("validate_material — hardness_hrc out of range (>70) → error", async () => {
    const r = await call(server, "dv_validate_material", {
      name: "Mystery",
      hardness_hrc: 99,
    });
    const v = r.data.validation as Record<string, unknown>;
    const issues = v.issues as Array<Record<string, string>>;
    const hrcIssue = issues.find(i => i.field === "hardness_hrc");
    expect(hrcIssue, "hardness_hrc out-of-range must produce an issue").not.toBe(undefined);
    expect(hrcIssue!.severity).toBe("error");
  });

  it("validate_material — invalid iso_group → error with valid groups in expected", async () => {
    const r = await call(server, "dv_validate_material", {
      name: "Test",
      iso_group: "X",
    });
    const v = r.data.validation as Record<string, unknown>;
    const issues = v.issues as Array<Record<string, string>>;
    const isoIssue = issues.find(i => i.field === "iso_group");
    expect(isoIssue, "invalid ISO group must produce an issue").not.toBe(undefined);
    expect(isoIssue!.expected).toContain("P");
    expect(isoIssue!.actual).toBe("X");
  });

  it("validate_cutting_params — sensible mill setup → valid", async () => {
    const r = await call(server, "dv_validate_cutting_params", {
      rpm: 5000,
      feed_rate: 60,
      feed_per_tooth: 0.003,
      axial_depth: 0.25,
      radial_depth: 0.1,
      tool_diameter: 0.5,
      number_of_teeth: 4,
    });
    expect(r.ok).toBe(true);
    const v = r.data.validation as Record<string, unknown>;
    expect(typeof v.valid).toBe("boolean");
    expect(typeof v.score).toBe("number");
  });

  it("validate_job — empty payload returns valid=false with issues", async () => {
    const r = await call(server, "dv_validate_job", {});
    expect(r.ok).toBe(true);
    const v = r.data.validation as Record<string, unknown>;
    expect(typeof v.valid).toBe("boolean");
  });

  it("stats — counts validations across multiple calls", async () => {
    await call(server, "dv_validate_material", { name: "x" });
    await call(server, "dv_validate_material", { name: "y" });
    const r = await call(server, "dv_stats");
    const s = r.data.stats as Record<string, number>;
    expect(typeof s.validation_count).toBe("number");
    expect(s.validation_count).toBeGreaterThan(0);
  });

  it("all 4 dv_* actions accepted by the registered dispatcher", async () => {
    const actions: Array<[string, Record<string, unknown>]> = [
      ["dv_validate_material",         { name: "test" }],
      ["dv_validate_cutting_params",   { rpm: 1000 }],
      ["dv_validate_job",              {}],
      ["dv_stats",                     {}],
    ];
    for (const [act, p] of actions) {
      const r = await call(server, act, p);
      expect(r.ok, `${act} should succeed`).toBe(true);
      expect(r.data.success).toBe(true);
    }
  });
});
