/**
 * Wire test: prism_dev × ResponseTemplateEngine
 *
 * 5 actions: response_template_match / _list / _get / _stats / _reset_stats.
 * Engine is a process singleton (ResponseTemplateEngine.getInstance()) with
 * 6 built-in templates (TPL-MATERIAL, TPL-ALARM, TPL-CUTTING, TPL-SPEEDFEED,
 * TPL-TOOL, TPL-MACHINE) indexed by (dispatcher, action).
 *
 * Pressure-adaptive sizing (engine spec):
 *   >85%  → skip (returns null)
 *   60-85 → minimal
 *   40-60 → compact
 *   <40   → full
 *
 * Iter 14 of OBSIDIAN-PRISM-OS-MS0 orphan-rescue series.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ResponseTemplateEngine } from "../engines/ResponseTemplateEngine.js";

interface ToolResult { content: Array<{ type: "text"; text: string }> }

function buildHandler() {
  let handler: ((args: any) => Promise<ToolResult>) | undefined;
  const server: any = {
    tool: (_name: string, _desc: string, _schema: any, h: any) => { handler = h; },
  };
  registerDevDispatcher(server);
  if (!handler) throw new Error("devDispatcher did not register a handler");
  return handler;
}

async function call(handler: ReturnType<typeof buildHandler>, action: string, params: any = {}) {
  const r: any = await handler({ action, params });
  let parsed: any;
  if (r && Array.isArray(r.content) && typeof r.content[0]?.text === "string") {
    parsed = JSON.parse(r.content[0].text);
  } else if (r && typeof r === "object") {
    parsed = r;
  } else {
    throw new Error(`unexpected response shape: ${JSON.stringify(r)}`);
  }
  const ok = parsed.ok !== false && parsed.success !== false && !parsed.error;
  return { ok, raw: parsed };
}

describe("devDispatcher × ResponseTemplateEngine wire (OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-RESPONSE-TEMPLATE)", () => {
  let handler: ReturnType<typeof buildHandler>;

  beforeEach(async () => {
    handler = buildHandler();
    // Each test starts on a clean stats counter — singleton is shared.
    await call(handler, "response_template_reset_stats");
  });

  // ─── response_template_list ──────────────────────────────────────────

  it("response_template_list returns the 6 built-in templates with their dispatcher/action triggers", async () => {
    const r = await call(handler, "response_template_list");
    expect(r.ok, JSON.stringify(r.raw)).toBe(true);
    expect(Array.isArray(r.raw.templates)).toBe(true);
    // Engine ships with 6 hardcoded templates (TPL-MATERIAL/ALARM/CUTTING/SPEEDFEED/TOOL/MACHINE)
    expect(r.raw.templates.length).toBe(6);
    const ids = r.raw.templates.map((t: any) => t.template_id).sort();
    expect(ids).toContain("TPL-MATERIAL");
    expect(ids).toContain("TPL-ALARM");
    expect(ids).toContain("TPL-CUTTING");
    expect(ids).toContain("TPL-SPEEDFEED");
    expect(ids).toContain("TPL-TOOL");
    expect(ids).toContain("TPL-MACHINE");
    // Every entry must have all summary fields populated (engine contract)
    for (const t of r.raw.templates) {
      expect(typeof t.template_id).toBe("string");
      expect(typeof t.dispatcher).toBe("string");
      expect(Array.isArray(t.actions)).toBe(true);
      expect(t.actions.length).toBeGreaterThan(0);
      expect(typeof t.format).toBe("string");
      expect(t.section_count).toBeGreaterThan(0);
    }
  });

  // ─── response_template_get ───────────────────────────────────────────

  it("response_template_get retrieves the full TPL-MATERIAL definition", async () => {
    const r = await call(handler, "response_template_get", { template_id: "TPL-MATERIAL" });
    expect(r.ok).toBe(true);
    expect(r.raw.template.template_id).toBe("TPL-MATERIAL");
    expect(r.raw.template.dispatcher).toBe("prism_data");
    expect(r.raw.template.actions).toContain("material_get");
    expect(Array.isArray(r.raw.template.sections)).toBe(true);
    expect(r.raw.template.sections.length).toBeGreaterThan(0);
    // Every section has the required TemplateSection fields
    for (const s of r.raw.template.sections) {
      expect(typeof s.id).toBe("string");
      expect(typeof s.label).toBe("string");
      expect(Array.isArray(s.source_fields)).toBe(true);
      expect(["full", "compact", "minimal"]).toContain(s.min_level);
      expect(typeof s.critical).toBe("boolean");
    }
  });

  it("response_template_get returns null for unknown template id (graceful, no error)", async () => {
    const r = await call(handler, "response_template_get", { template_id: "TPL-DOES-NOT-EXIST" });
    expect(r.ok).toBe(true);
    // slimResponse strips null — engine returned null, dispatcher dropped the key
    expect(r.raw.template === null || r.raw.template === undefined).toBe(true);
  });

  // ─── response_template_match ─────────────────────────────────────────

  it("response_template_match: low pressure (<40%) selects 'full' level for a known dispatcher+action", async () => {
    const r = await call(handler, "response_template_match", {
      dispatcher: "prism_data",
      action: "material_get",
      result_data: { name: "AISI 4140", iso_group: "P", machinability: 0.7, kc1_1: 1800 },
      pressure_pct: 10,
    });
    expect(r.ok, JSON.stringify(r.raw)).toBe(true);
    expect(r.raw.match).not.toBe(null);
    expect(r.raw.match.template_id).toBe("TPL-MATERIAL");
    expect(r.raw.match.level).toBe("full");
    expect(Array.isArray(r.raw.match.sections)).toBe(true);
  });

  it("response_template_match: 40-60% pressure selects 'compact' level", async () => {
    const r = await call(handler, "response_template_match", {
      dispatcher: "prism_data",
      action: "material_get",
      result_data: { name: "Al6061", iso_group: "N" },
      pressure_pct: 50,
    });
    expect(r.ok).toBe(true);
    expect(r.raw.match).not.toBe(null);
    expect(r.raw.match.level).toBe("compact");
  });

  it("response_template_match: 60-85% pressure selects 'minimal' level", async () => {
    const r = await call(handler, "response_template_match", {
      dispatcher: "prism_data",
      action: "material_get",
      result_data: { name: "Inconel 718", iso_group: "S" },
      pressure_pct: 75,
    });
    expect(r.ok).toBe(true);
    expect(r.raw.match).not.toBe(null);
    expect(r.raw.match.level).toBe("minimal");
  });

  it("response_template_match: >85% pressure SKIPS template injection (returns null match)", async () => {
    const r = await call(handler, "response_template_match", {
      dispatcher: "prism_data",
      action: "material_get",
      result_data: { name: "Ti6Al4V", iso_group: "S" },
      pressure_pct: 90,
    });
    expect(r.ok).toBe(true);
    // Engine returns null when pressure exceeds the skip threshold
    // slimResponse strips null fields; the dispatcher returns either
    // `match: null` (engine null) which slimResponse drops, OR an absent key.
    expect(r.raw.match === null || r.raw.match === undefined).toBe(true);
  });

  it("response_template_match: unknown dispatcher+action pair returns null match (no template)", async () => {
    const r = await call(handler, "response_template_match", {
      dispatcher: "prism_definitely_does_not_exist",
      action: "no_such_action",
      result_data: {},
      pressure_pct: 0,
    });
    expect(r.ok).toBe(true);
    // slimResponse strips null fields; the dispatcher returns either
    // `match: null` (engine null) which slimResponse drops, OR an absent key.
    expect(r.raw.match === null || r.raw.match === undefined).toBe(true);
  });

  it("response_template_match: pressure_pct defaults to 0 when omitted (full template)", async () => {
    const r = await call(handler, "response_template_match", {
      dispatcher: "prism_data",
      action: "material_get",
      result_data: { name: "AISI 1018", iso_group: "P" },
      // pressure_pct omitted
    });
    expect(r.ok).toBe(true);
    expect(r.raw.match).not.toBe(null);
    expect(r.raw.match.level).toBe("full");
  });

  // ─── response_template_stats ─────────────────────────────────────────

  it("response_template_stats: match/skip/execution counters update after match calls", async () => {
    // Singleton-shared state; baseline already reset by beforeEach.
    // 2 matches, 1 skip (>85%), 1 unknown (counts as execution but no skip+no match)
    await call(handler, "response_template_match", {
      dispatcher: "prism_data", action: "material_get",
      result_data: { name: "x" }, pressure_pct: 10,
    });
    await call(handler, "response_template_match", {
      dispatcher: "prism_data", action: "material_get",
      result_data: { name: "y" }, pressure_pct: 30,
    });
    await call(handler, "response_template_match", {
      dispatcher: "prism_data", action: "material_get",
      result_data: { name: "z" }, pressure_pct: 95,  // → skip
    });
    await call(handler, "response_template_match", {
      dispatcher: "prism_nope", action: "no_action",
      result_data: {}, pressure_pct: 10,  // → no template (executes but doesn't match)
    });

    const r = await call(handler, "response_template_stats");
    expect(r.ok).toBe(true);
    expect(r.raw.stats.total_executions).toBe(4);
    expect(r.raw.stats.total_matches).toBe(2);
    expect(r.raw.stats.total_skips).toBe(1);
    expect(r.raw.stats.hit_rate).toBe(0.5);  // 2 matches / 4 executions
    expect(r.raw.stats.last_match).toBe("TPL-MATERIAL");
    expect(typeof r.raw.stats.coverage).toBe("object");
    expect(r.raw.stats.total_templates).toBe(6);
  });

  it("response_template_stats: coverage maps every template_id to its action list", async () => {
    const r = await call(handler, "response_template_stats");
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.raw.stats.coverage["TPL-MATERIAL"])).toBe(true);
    expect(r.raw.stats.coverage["TPL-MATERIAL"]).toContain("material_get");
    expect(Array.isArray(r.raw.stats.coverage["TPL-ALARM"])).toBe(true);
  });

  // ─── response_template_reset_stats ──────────────────────────────────

  it("response_template_reset_stats: zeroes the engine counters", async () => {
    await call(handler, "response_template_match", {
      dispatcher: "prism_data", action: "material_get",
      result_data: {}, pressure_pct: 10,
    });
    const before = await call(handler, "response_template_stats");
    expect(before.raw.stats.total_executions).toBeGreaterThanOrEqual(1);

    const rst = await call(handler, "response_template_reset_stats");
    expect(rst.ok).toBe(true);
    expect(rst.raw.reset).toBe(true);

    const after = await call(handler, "response_template_stats");
    expect(after.raw.stats.total_executions).toBe(0);
    expect(after.raw.stats.total_matches).toBe(0);
    expect(after.raw.stats.total_skips).toBe(0);
    expect(after.raw.stats.last_match).toBe("");
  });

  // ─── validation ──────────────────────────────────────────────────────

  it("validation: response_template_match rejects missing dispatcher", async () => {
    const r = await call(handler, "response_template_match", {
      // dispatcher omitted
      action: "material_get",
      result_data: {},
      pressure_pct: 10,
    });
    expect(r.ok).toBe(false);
  });

  it("validation: response_template_match rejects pressure_pct out of range", async () => {
    const r = await call(handler, "response_template_match", {
      dispatcher: "prism_data",
      action: "material_get",
      result_data: {},
      pressure_pct: 150,  // out of [0,100]
    });
    expect(r.ok).toBe(false);
  });

  it("validation: response_template_get rejects empty template_id", async () => {
    const r = await call(handler, "response_template_get", { template_id: "" });
    expect(r.ok).toBe(false);
  });

  // ─── dispatcher action enum coverage ────────────────────────────────

  it("dispatcher exposes all 5 response_template_* actions (no 'not_implemented' default)", async () => {
    const actions = [
      "response_template_match",
      "response_template_list",
      "response_template_get",
      "response_template_stats",
      "response_template_reset_stats",
    ];
    for (const action of actions) {
      const r = await call(handler, action, {
        dispatcher: "prism_data",
        action: "material_get",
        result_data: { name: "x" },
        pressure_pct: 10,
        template_id: "TPL-MATERIAL",
      });
      const msg = String(r.raw.error || r.raw.message || "");
      expect(msg, `${action} hit default: ${msg}`).not.toMatch(/not_implemented/i);
      expect(msg, `${action} hit default: ${msg}`).not.toMatch(/Unknown.*action/i);
    }
  });

  // ─── singleton invariant ────────────────────────────────────────────

  it("dispatcher and direct engine getInstance() share the same singleton instance", async () => {
    // Reset via dispatcher, then increment via direct engine call, then read via dispatcher.
    await call(handler, "response_template_reset_stats");
    const direct = ResponseTemplateEngine.getInstance();
    direct.match("prism_data", "material_get", { name: "direct" }, 10);
    direct.match("prism_data", "material_get", { name: "direct2" }, 10);

    const r = await call(handler, "response_template_stats");
    expect(r.ok).toBe(true);
    // 2 direct-engine matches + 0 dispatcher matches in this test = 2
    expect(r.raw.stats.total_executions).toBe(2);
    expect(r.raw.stats.total_matches).toBe(2);
  });
});
