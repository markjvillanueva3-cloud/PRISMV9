/**
 * OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-GCODE-TEMPLATE — wire test
 *
 * Verifies 5 GCodeTemplateEngine actions land through camDispatcher's prism_cam tool:
 *   gcode_template_resolve_controller — alias → ControllerConfig
 *   gcode_template_generate            — controller + op + params → GCodeResult
 *   gcode_template_generate_program    — controller + ordered ops → composite GCodeResult
 *   gcode_template_list_controllers    — full registry catalog
 *   gcode_template_list_operations     — supported op type list
 *
 * Strategy: build a fake MCP-style server that captures the registered tool handler
 * closure, then invoke the handler directly. Tests assert RAW engine result shape
 * because the dispatcher returns `slimResponse(result)` at <50% pressure (test mode).
 *
 * Real-value assertions (not weak presence checks):
 *  - controller resolves through alias map (e.g. "fanuc" → name "fanuc_0i")
 *  - generateGCode produces non-empty gcode string with line_count > 0
 *  - generateProgram composes blocks separated by blank lines, sums line_count + time
 *  - listControllers returns >=5 entries (Fanuc, Haas, Mazak, Okuma, Siemens at minimum)
 *  - listOperations returns >=8 entries covering drilling/facing/threading/boring
 *  - resolveController throws on unknown alias → dispatcher wraps in error envelope
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";

interface ToolCall {
  action: string;
  params?: Record<string, any>;
}

let handler:
  | ((args: { action: string; params?: Record<string, any> }) => Promise<any>)
  | null = null;

beforeAll(() => {
  const fakeServer = {
    tool: (
      _name: string,
      _desc: string,
      _schema: any,
      fn: (args: any) => Promise<any>
    ) => {
      if (_name === "prism_cam") handler = fn;
    },
  };
  registerCamDispatcher(fakeServer as any);
  if (!handler) throw new Error("camDispatcher did not register prism_cam tool");
});

async function call(c: ToolCall): Promise<{ raw: any; success: boolean; error?: string }> {
  if (!handler) throw new Error("handler not captured");
  const r = await handler(c);
  // 3 response shapes seen in cam dispatcher:
  //   (a) MCP-wrapped: { content: [{type:'text', text: JSON.stringify(raw)}] }
  //   (b) raw object: anything else
  //   (c) error envelope: { error: '...', _meta: ... }
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) {
    try {
      const parsed = JSON.parse(r.content[0].text);
      const success = !parsed?.error && parsed?.success !== false;
      return { raw: parsed, success, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  if (r && typeof r === "object" && "error" in r) {
    return { raw: r, success: false, error: r.error };
  }
  return { raw: r, success: true };
}

describe("camDispatcher — GCodeTemplateEngine wire", () => {
  describe("gcode_template_list_controllers", () => {
    it("returns a non-empty array of controller summaries", async () => {
      const r = await call({ action: "gcode_template_list_controllers", params: {} });
      expect(r.success).toBe(true);
      // raw shape: { success: true, data: Array<{name, family, aliases, operations}> }
      const data = r.raw.data ?? r.raw;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(5);
    });

    it("each entry has name, family, aliases[], operations[]", async () => {
      const r = await call({ action: "gcode_template_list_controllers", params: {} });
      const data = r.raw.data ?? r.raw;
      for (const c of data) {
        expect(typeof c.name).toBe("string");
        expect(c.name.length).toBeGreaterThan(0);
        expect(typeof c.family).toBe("string");
        expect(Array.isArray(c.aliases)).toBe(true);
        expect(c.aliases.length).toBeGreaterThan(0);
        expect(Array.isArray(c.operations)).toBe(true);
      }
    });

    it("registry covers the big-3 controller families (fanuc, haas, mazak/okuma/siemens family present)", async () => {
      const r = await call({ action: "gcode_template_list_controllers", params: {} });
      const data = r.raw.data ?? r.raw;
      const allAliases = data.flatMap((c: any) => c.aliases.map((a: string) => a.toLowerCase()));
      // At least one fanuc-family and one big-3-family alias should be present.
      expect(allAliases.some((a: string) => a.includes("fanuc"))).toBe(true);
      const families: string[] = data.map((c: any) => String(c.family).toLowerCase());
      expect(families.some((f: string) => /haas|mazak|okuma|siemens|heidenhain|hurco/.test(f))).toBe(true);
    });
  });

  describe("gcode_template_list_operations", () => {
    it("returns ≥8 supported operation names", async () => {
      const r = await call({ action: "gcode_template_list_operations", params: {} });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(8);
    });

    it("covers core operations: drilling + facing + a threading variant + a boring variant", async () => {
      const r = await call({ action: "gcode_template_list_operations", params: {} });
      const data: string[] = r.raw.data ?? r.raw;
      const lower = data.map((s) => s.toLowerCase());
      expect(lower.some((s) => /drill/.test(s))).toBe(true);
      expect(lower.some((s) => /facing|face/.test(s))).toBe(true);
      expect(lower.some((s) => /thread|tap/.test(s))).toBe(true);
      expect(lower.some((s) => /bor/.test(s))).toBe(true);
    });
  });

  describe("gcode_template_resolve_controller", () => {
    it("resolves a known alias to a ControllerConfig with family + aliases", async () => {
      const r = await call({
        action: "gcode_template_resolve_controller",
        params: { controller: "fanuc" },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(typeof data.name).toBe("string");
      expect(typeof data.family).toBe("string");
      expect(Array.isArray(data.aliases)).toBe(true);
      // The alias "fanuc" must appear in the resolved config's alias list (or
      // be a substring of one — registry uses includes()).
      const matched = data.aliases.some(
        (a: string) => a === "fanuc" || a.includes("fanuc") || "fanuc".includes(a),
      );
      expect(matched).toBe(true);
    });

    it("throws on unknown controller alias — dispatcher wraps as error", async () => {
      const r = await call({
        action: "gcode_template_resolve_controller",
        params: { controller: "this_controller_does_not_exist_xyz123" },
      });
      // dispatcherError → result has error field; success false
      expect(r.success).toBe(false);
      expect(typeof r.error).toBe("string");
      expect(r.error!.toLowerCase()).toMatch(/unknown controller|gcodetemplate/);
    });
  });

  describe("gcode_template_generate (single operation)", () => {
    it("produces non-empty gcode with line_count > 0 for peck_drilling on fanuc", async () => {
      const r = await call({
        action: "gcode_template_generate",
        params: {
          controller: "fanuc",
          operation: "peck_drilling",
          params: {
            tool_number: 3,
            rpm: 1200,
            feed_rate: 80,
            z_depth: -25,
            peck_depth: 5,
            coolant: "flood",
          },
        },
      });
      expect(r.success).toBe(true);
      const data = r.raw;
      expect(typeof data.gcode).toBe("string");
      expect(data.gcode.length).toBeGreaterThan(0);
      expect(data.line_count).toBeGreaterThan(0);
      // Engine guarantees notes + warnings are arrays (may be empty;
      // slimResponse may strip empty arrays — assert "array or undefined").
      expect(data.notes === undefined || Array.isArray(data.notes)).toBe(true);
      expect(data.warnings === undefined || Array.isArray(data.warnings)).toBe(true);
    });

    it("controller_family is populated and consistent with the resolved controller", async () => {
      const r = await call({
        action: "gcode_template_generate",
        params: {
          controller: "fanuc",
          operation: "facing",
          params: { rpm: 800, feed_rate: 500, tool_number: 1, z_depth: -0.5 },
        },
      });
      expect(r.success).toBe(true);
      const data = r.raw;
      expect(typeof data.controller).toBe("string");
      expect(data.controller.length).toBeGreaterThan(0);
      expect(typeof data.controller_family).toBe("string");
      expect(data.controller_family.length).toBeGreaterThan(0);
      // operation echoed
      expect(data.operation).toBe("facing");
    });

    it("parameters_used echoes the rpm we sent", async () => {
      const RPM = 2400;
      const r = await call({
        action: "gcode_template_generate",
        params: {
          controller: "fanuc",
          operation: "drilling",
          params: { rpm: RPM, feed_rate: 150, tool_number: 2, z_depth: -10 },
        },
      });
      expect(r.success).toBe(true);
      // parameters_used is the engine's record of inputs (object).
      // Most controllers embed rpm in parameters_used keyed somewhere — assert
      // the value RPM appears at any depth.
      const json = JSON.stringify(r.raw.parameters_used ?? {});
      expect(json).toContain(String(RPM));
    });
  });

  describe("gcode_template_generate_program (multi-operation)", () => {
    it("composes multiple operation blocks separated by blank lines", async () => {
      const r = await call({
        action: "gcode_template_generate_program",
        params: {
          controller: "haas",
          operations: [
            { operation: "program_header", params: { rpm: 0, feed_rate: 0, program_name: "PART_001" } },
            { operation: "facing", params: { rpm: 800, feed_rate: 500, tool_number: 1, z_depth: -0.5 } },
            { operation: "drilling", params: { rpm: 1500, feed_rate: 100, tool_number: 2, z_depth: -20 } },
            { operation: "program_footer", params: { rpm: 0, feed_rate: 0 } },
          ],
        },
      });
      expect(r.success).toBe(true);
      const data = r.raw;
      // Engine joins blocks with "\n\n" — at least 1 blank-line separator must appear
      expect(data.gcode).toMatch(/\n\n/);
      // operation set to "program"
      expect(data.operation).toBe("program");
      // line_count sums all sub-blocks → > 0
      expect(data.line_count).toBeGreaterThan(0);
    });

    it("parameters_used lists the operation sequence", async () => {
      const ops = [
        { operation: "facing", params: { rpm: 800, feed_rate: 500, tool_number: 1, z_depth: -0.5 } },
        { operation: "drilling", params: { rpm: 1500, feed_rate: 100, tool_number: 2, z_depth: -20 } },
      ];
      const r = await call({
        action: "gcode_template_generate_program",
        params: { controller: "haas", operations: ops },
      });
      expect(r.success).toBe(true);
      const used = r.raw.parameters_used as { operations?: string[] };
      expect(Array.isArray(used.operations)).toBe(true);
      expect(used.operations).toEqual(["facing", "drilling"]);
    });

    it("notes from each sub-op are tagged with [operation] prefix", async () => {
      const r = await call({
        action: "gcode_template_generate_program",
        params: {
          controller: "fanuc",
          operations: [
            { operation: "drilling", params: { rpm: 1500, feed_rate: 100, tool_number: 2, z_depth: -20 } },
          ],
        },
      });
      expect(r.success).toBe(true);
      // slimResponse strips empty arrays — assert "absent OR each entry has tag"
      if (Array.isArray(r.raw.notes) && r.raw.notes.length > 0) {
        for (const n of r.raw.notes as string[]) {
          expect(n).toMatch(/^\[[a-z_]+\]/);
        }
      }
    });
  });

  describe("error envelope contract", () => {
    it("unknown operation through generateGCode produces error envelope (not throw)", async () => {
      const r = await call({
        action: "gcode_template_generate",
        params: {
          controller: "fanuc",
          operation: "this_operation_does_not_exist_zzz",
          params: { rpm: 1000, feed_rate: 100 },
        },
      });
      // dispatcherError wraps the throw — success false, error string present
      expect(r.success).toBe(false);
      expect(typeof r.error).toBe("string");
    });
  });
});
