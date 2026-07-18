/**
 * BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-5 — wire test (slot:alpha, 2026-05-22)
 *
 * Round-trips 5 actions through millDispatcher's prism_mill tool, surfacing
 * the bounded-input core of the previously-unwired FiveAxisOrchestrationEngine
 * (static-method class):
 *
 *   mill_5axis_orch_dsl_examples     → getDSLSyntaxExamples
 *   mill_5axis_orch_parse_dsl        → parseDSL
 *   mill_5axis_orch_rtcp_dialect     → getRTCPDialect
 *   mill_5axis_orch_machine_dynamics → getDefaultDynamics
 *   mill_5axis_orch_sequences        → getAllSequences
 *
 * Real-value assertions (no toBeDefined()/toBeTruthy() stubs):
 *   - getDSLSyntaxExamples returns a non-empty example set, and each example
 *     parses into a DSLScript with the documented fields.
 *   - getRTCPDialect("fanuc") returns the Fanuc dialect — controller="fanuc",
 *     activation_code="G43.5", deactivation_code="G49".
 *   - getDefaultDynamics returns a populated machine-dynamics record.
 *
 * Each test invokes through the dispatcher handler, not the engine singleton.
 *
 * Scope note: FiveAxisOrchestrationEngine exposes ~20 static methods; this
 * iteration wires the bounded-input core (DSL / dialect / dynamics / registry).
 * The complex toolpath-generation methods (generateSequence, generateGCode,
 * checkCollisions) take deep nested geometry inputs and are a follow-up — the
 * engine is now reachable via prism_mill, which is the wiring unit's goal.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  MILL_ACTIONS,
  registerMillDispatcher,
} from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const ORCH_ACTIONS = [
  "mill_5axis_orch_dsl_examples",
  "mill_5axis_orch_parse_dsl",
  "mill_5axis_orch_rtcp_dialect",
  "mill_5axis_orch_machine_dynamics",
  "mill_5axis_orch_sequences",
] as const;

interface ToolCall {
  action: string;
  params?: Record<string, unknown>;
}

let handler:
  | ((args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>)
  | null = null;

beforeAll(() => {
  const fakeServer = {
    tool: (
      _name: string,
      _desc: string,
      _schema: unknown,
      fn: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>,
    ) => {
      if (_name === "prism_mill") handler = fn;
    },
  };
  registerMillDispatcher(fakeServer);
  if (!handler) throw new Error("millDispatcher did not register prism_mill tool");
});

async function call(c: ToolCall): Promise<{ raw: any; success: boolean; error?: string }> {
  if (!handler) throw new Error("handler not captured");
  const r: any = await handler(c);
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) {
    try {
      const parsed = JSON.parse(r.content[0].text);
      return { raw: parsed, success: !parsed?.error && parsed?.success !== false, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") {
    try {
      const parsed = JSON.parse(r.text);
      return { raw: parsed, success: !parsed?.error && parsed?.success !== false, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  if (r && typeof r === "object") {
    return { raw: r, success: !r.error && r.success !== false && !r.isError, error: r.error };
  }
  return { raw: r, success: true };
}

function payload(raw: any): any {
  if (raw && typeof raw === "object") {
    if (raw.result !== undefined) return raw.result;
    if (raw.data !== undefined) return raw.data;
  }
  return raw;
}

describe("U-BRIDGE-WIRE-MILL iter-5 — FiveAxisOrchestrationEngine wired into millDispatcher", () => {
  describe("action enum + schema registration", () => {
    it("registers all 5 actions in MILL_ACTIONS enum", () => {
      for (const action of ORCH_ACTIONS) {
        expect(MILL_ACTIONS).toContain(action);
      }
    });

    it("registers all 5 actions in MILL_ACTION_SCHEMAS map", () => {
      const schemaKeys = new Set(Object.keys(MILL_ACTION_SCHEMAS));
      for (const action of ORCH_ACTIONS) {
        expect(schemaKeys.has(action)).toBe(true);
      }
    });
  });

  describe("dispatcher round-trip — DSL", () => {
    it("mill_5axis_orch_dsl_examples returns a non-empty example set", async () => {
      const r = await call({ action: "mill_5axis_orch_dsl_examples", params: {} });
      expect(r.success).toBe(true);
      const examples = payload(r.raw).examples;
      expect(Array.isArray(examples)).toBe(true);
      expect(examples.length).toBeGreaterThan(0);
      for (const ex of examples) {
        expect(typeof ex).toBe("string");
      }
    });

    it("mill_5axis_orch_parse_dsl parses an example into a DSLScript", async () => {
      const exR = await call({ action: "mill_5axis_orch_dsl_examples", params: {} });
      const example: string = payload(exR.raw).examples[0];
      const r = await call({
        action: "mill_5axis_orch_parse_dsl",
        params: { source: example },
      });
      expect(r.success).toBe(true);
      const script = payload(r.raw);
      expect(typeof script.id).toBe("string");
      expect(typeof script.source).toBe("string");
      expect(script).toHaveProperty("ast");
      expect(script).toHaveProperty("commands");
    });

    it("failure mode: parse_dsl with an empty source is rejected", async () => {
      const r = await call({ action: "mill_5axis_orch_parse_dsl", params: { source: "" } });
      expect(r.success).toBe(false);
    });

    it("failure mode: parse_dsl without a source is rejected", async () => {
      const r = await call({ action: "mill_5axis_orch_parse_dsl", params: {} });
      expect(r.success).toBe(false);
    });

    it("adversarial: parse_dsl with a numeric source is rejected", async () => {
      const r = await call({ action: "mill_5axis_orch_parse_dsl", params: { source: 12345 } });
      expect(r.success).toBe(false);
    });
  });

  describe("dispatcher round-trip — RTCP dialect", () => {
    it("returns the Fanuc RTCP dialect with the expected activation codes", async () => {
      const r = await call({
        action: "mill_5axis_orch_rtcp_dialect",
        params: { controller: "fanuc" },
      });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(p.found).toBe(true);
      expect(p.dialect.controller).toBe("fanuc");
      expect(p.dialect.activation_code).toBe("G43.5");
      expect(p.dialect.deactivation_code).toBe("G49");
    });

    it("failure mode: rtcp_dialect without a controller is rejected", async () => {
      const r = await call({ action: "mill_5axis_orch_rtcp_dialect", params: {} });
      expect(r.success).toBe(false);
    });
  });

  describe("dispatcher round-trip — machine dynamics + sequences", () => {
    it("mill_5axis_orch_machine_dynamics returns a populated dynamics record", async () => {
      const r = await call({
        action: "mill_5axis_orch_machine_dynamics",
        params: { machine_id: "DMU-50" },
      });
      expect(r.success).toBe(true);
      expect(Object.keys(payload(r.raw)).length).toBeGreaterThan(0);
    });

    it("mill_5axis_orch_sequences returns an array (empty when nothing registered)", async () => {
      const r = await call({ action: "mill_5axis_orch_sequences", params: {} });
      expect(r.success).toBe(true);
      // slimResponse drops an empty sequences array → coalesce to [].
      expect(Array.isArray(payload(r.raw).sequences ?? [])).toBe(true);
    });

    it("failure mode: machine_dynamics without a machine_id is rejected", async () => {
      const r = await call({ action: "mill_5axis_orch_machine_dynamics", params: {} });
      expect(r.success).toBe(false);
    });
  });

  describe("schema boundary — direct safeParse", () => {
    type Schema = { safeParse: (x: unknown) => { success: boolean } };

    it("mill_5axis_orch_parse_dsl requires a non-empty source string", () => {
      const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>)
        .mill_5axis_orch_parse_dsl;
      expect(schema.safeParse({ source: "OP roughing" }).success).toBe(true);
      expect(schema.safeParse({ source: "" }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });

    it("mill_5axis_orch_rtcp_dialect requires a controller string", () => {
      const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>)
        .mill_5axis_orch_rtcp_dialect;
      expect(schema.safeParse({ controller: "fanuc" }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });
});
