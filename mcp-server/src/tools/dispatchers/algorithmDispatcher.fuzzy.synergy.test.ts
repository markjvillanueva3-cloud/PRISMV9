/**
 * algorithmDispatcher -- round-trip synergy test for the control_fuzzy action.
 *
 * DISCOVERY-EFFICIENCY/U-ALGO-FUZZY-WIRE (slot:tango, 2026-06-15) wired the
 * canonical FuzzyController Algorithm<I,O> class (built-but-orphaned -- no
 * consumer import) into prism_algorithm as `control_fuzzy`. Verified-on-disk
 * that it is NOT a duplicate of any algorithmGatewayEngine method (the gateway
 * serves kalman/montecarlo/spline/localsearch but NO fuzzy control), so the
 * wire is genuinely additive, not dispatcher-level duplication.
 *
 * This is a TRUE round-trip: a mock server captures the registered handler, then
 * `control_fuzzy` is invoked through the dispatcher's OWN switch + lazy-import +
 * FuzzyController.validate + FuzzyController.calculate path (not the class
 * singleton directly). Assertions are method-robust where defuzzification could
 * vary (output region bands that hold for centroid / bisector / mean-of-maxima)
 * and EXACT where the value is method-independent (rule-firing strengths are
 * pure triangular-membership evaluations -- mu_hot(90)=0.8, mu_cold(90)=0).
 *
 * The fuzzy fixture is a temperature -> fan_speed Mamdani controller with two
 * non-overlapping triangular sets; test inputs (90, 10) sit on the rising/falling
 * edges (mu = 0.8 exactly) and deliberately avoid the degenerate shared peak
 * endpoint (x == b == c) whose membership is implementation-defined.
 *
 * @module dispatchers/algorithmDispatcher.fuzzy.synergy.test
 */
import { describe, it, expect } from "vitest";
import {
  registerAlgorithmDispatcher,
  ALGORITHM_ACTIONS,
  ALGORITHM_DISPATCHER_ACTION_COUNT,
} from "./algorithmDispatcher.js";

interface Captured {
  name: string;
  description: string;
  schema: any;
  handler: (args: { action: string; params?: Record<string, any> }) => Promise<any>;
}

/** Register the dispatcher against a mock server and capture the tool wiring. */
function captureRegistration(): Captured {
  let captured: Captured | null = null;
  const mockServer = {
    tool(name: string, description: string, schema: any, handler: any) {
      captured = { name, description, schema, handler };
    },
  };
  registerAlgorithmDispatcher(mockServer as any);
  if (!captured) throw new Error("registerAlgorithmDispatcher did not register a tool");
  return captured;
}

/** Invoke an action through the captured handler and parse the content text. */
async function call(handler: Captured["handler"], action: string, params: Record<string, any>) {
  const res = await handler({ action, params });
  const text: string = res?.content?.[0]?.text ?? "";
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { /* non-JSON content */ }
  return { res, text, parsed };
}

/**
 * Temperature -> fan_speed Mamdani controller.
 * - temperature: cold = triangular[0,0,50] (mu=1 at 0, ->0 at 50),
 *                hot  = triangular[50,100,100] (mu=0 at 50, ->1 at 100)
 * - fan_speed:   low  = triangular[0,0,50],   high = triangular[50,100,100]
 * - rules: index 0 = IF cold THEN low ; index 1 = IF hot THEN high
 */
function fanController(tempValue: number) {
  return {
    inputs: [
      {
        name: "temperature",
        range: [0, 100] as [number, number],
        sets: [
          { name: "cold", type: "triangular" as const, params: [0, 0, 50] },
          { name: "hot", type: "triangular" as const, params: [50, 100, 100] },
        ],
      },
    ],
    outputs: [
      {
        name: "fan_speed",
        range: [0, 100] as [number, number],
        sets: [
          { name: "low", type: "triangular" as const, params: [0, 0, 50] },
          { name: "high", type: "triangular" as const, params: [50, 100, 100] },
        ],
      },
    ],
    rules: [
      { conditions: [{ variable: "temperature", set: "cold" }], output: { variable: "fan_speed", set: "low" } },
      { conditions: [{ variable: "temperature", set: "hot" }], output: { variable: "fan_speed", set: "high" } },
    ],
    values: { temperature: tempValue },
  };
}

const strengthOf = (acts: Array<{ rule_index: number; strength: number }>, idx: number) =>
  acts.find((a) => a.rule_index === idx)?.strength;

describe("prism_algorithm -- control_fuzzy registration + enum", () => {
  it("registers exactly one tool named prism_algorithm with a callable handler", () => {
    const cap = captureRegistration();
    expect(cap.name).toBe("prism_algorithm");
    expect(typeof cap.handler).toBe("function");
  });

  it("control_fuzzy is a declared action accepted by the enum; the count export matches", () => {
    const cap = captureRegistration();
    expect((ALGORITHM_ACTIONS as readonly string[]).includes("control_fuzzy")).toBe(true);
    expect(cap.schema.action.safeParse("control_fuzzy").success).toBe(true);
    expect(cap.schema.action.safeParse("control_definitely_not_an_action").success).toBe(false);
    expect(ALGORITHM_DISPATCHER_ACTION_COUNT).toBe((ALGORITHM_ACTIONS as readonly string[]).length);
  });
});

describe("prism_algorithm -- control_fuzzy round-trips (real Mamdani inference)", () => {
  it("hot input (temp=90): only the hot->high rule fires at mu=0.8; output sits in the high region", async () => {
    const cap = captureRegistration();
    const { res, parsed } = await call(cap.handler, "control_fuzzy", { input: fanController(90) });
    expect(res.isError).toBeFalsy();
    expect(parsed).not.toBeNull();
    // Rule firing is a pure triangular-membership eval -> exact, defuzz-independent.
    expect(parsed.rule_activations).toHaveLength(2);
    expect(strengthOf(parsed.rule_activations, 1)).toBeCloseTo(0.8, 6); // hot rule
    expect(strengthOf(parsed.rule_activations, 0)).toBe(0);             // cold rule silent
    // Output region holds for any reasonable defuzzifier (centroid/bisector/MoM).
    const fan = parsed.crisp_outputs.fan_speed;
    expect(Number.isFinite(fan)).toBe(true);
    expect(fan).toBeGreaterThan(50);
    expect(fan).toBeLessThanOrEqual(100);
    expect(parsed.membership_values).toBeTruthy();
    expect(typeof parsed.calculation_method).toBe("string");
  });

  it("cold input (temp=10): only the cold->low rule fires at mu=0.8; output sits in the low region", async () => {
    const cap = captureRegistration();
    const { res, parsed } = await call(cap.handler, "control_fuzzy", { input: fanController(10) });
    expect(res.isError).toBeFalsy();
    expect(strengthOf(parsed.rule_activations, 0)).toBeCloseTo(0.8, 6); // cold rule
    expect(strengthOf(parsed.rule_activations, 1)).toBe(0);             // hot rule silent
    const fan = parsed.crisp_outputs.fan_speed;
    expect(Number.isFinite(fan)).toBe(true);
    expect(fan).toBeGreaterThanOrEqual(0);
    expect(fan).toBeLessThan(50);
  });

  it("monotonic: a hotter input commands a strictly higher fan_speed", async () => {
    const cap = captureRegistration();
    const hot = await call(cap.handler, "control_fuzzy", { input: fanController(90) });
    const cold = await call(cap.handler, "control_fuzzy", { input: fanController(10) });
    expect(hot.parsed.crisp_outputs.fan_speed).toBeGreaterThan(cold.parsed.crisp_outputs.fan_speed);
  });
});

describe("prism_algorithm -- control_fuzzy failure modes", () => {
  it("missing input param -> isError with a clear message (no throw)", async () => {
    const cap = captureRegistration();
    const { res, parsed } = await call(cap.handler, "control_fuzzy", {});
    expect(res.isError).toBe(true);
    expect(String(parsed.error)).toMatch(/Missing required param/i);
  });

  it("structurally-invalid input (no rules) -> validate fails -> isError 'Invalid input' (no throw)", async () => {
    const cap = captureRegistration();
    const bad = { ...fanController(50), rules: [] };
    const { res, parsed } = await call(cap.handler, "control_fuzzy", { input: bad });
    expect(res.isError).toBe(true);
    expect(String(parsed.error)).toMatch(/Invalid input/i);
    // Fail-loud (R12): the SPECIFIC validation reason must be surfaced, not a bare
    // "Invalid input:". This assertion fails if the handler drops validate().issues detail.
    expect(String(parsed.error)).toMatch(/rule/i);
  });

  it("empty crisp values -> validate fails -> isError with the surfaced reason (no throw)", async () => {
    const cap = captureRegistration();
    const bad = { ...fanController(50), values: {} };
    const { res, parsed } = await call(cap.handler, "control_fuzzy", { input: bad });
    expect(res.isError).toBe(true);
    expect(String(parsed.error)).toMatch(/value/i); // detail surfaced, not dropped
  });
});
