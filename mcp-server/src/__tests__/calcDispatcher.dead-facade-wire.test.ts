import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

/**
 * U-CALC-FACADE-FIX round-trip wire tests. Two calcDispatcher cases probed the WRONG method
 * names on their engines and so always fell through to the `{ note: "method not callable" }`
 * facade: `process_variability_integration_calc` probed .integrate/.run/.calculate but the real
 * method is analyze(); `kalman_filter_calc` probed .filter/.calculate/.run but the real method is
 * compute(). These tests invoke THROUGH the dispatcher and assert a REAL engine result comes back
 * (the facade note is gone) -- so a regression to the wrong method name resurfaces here.
 */
interface CapturedTool { name: string; handler: (args: any) => Promise<any>; }

function calcTool(): CapturedTool {
  const tools: CapturedTool[] = [];
  const server = { tool(name: string, _d: string, _s: any, handler: any) { tools.push({ name, handler }); } };
  registerCalcDispatcher(server);
  return tools[0];
}

async function call(tool: CapturedTool, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await tool.handler({ action, params });
  const text = r?.content?.[0]?.text;
  return text ? JSON.parse(text) : r;
}

// The dead-facade sentinel. If this string survives, the method-name wiring is still wrong.
const isFacade = (o: any): boolean => JSON.stringify(o ?? {}).includes("method not callable");
// filtered_states may be at r.data (raw) or r.data.value (AtomicValue-wrapped) -- accept either.
const unwrap = (o: any): any => (o && typeof o === "object" && "value" in o ? o.value : o);

const PVI_INPUT = {
  nominal_mm: 10, usl_mm: 10.05, lsl_mm: 9.95,
  cutting_speed_m_min: 120, feed_mm_rev: 0.1, depth_of_cut_mm: 1.0,
  tool_diameter_mm: 10, tool_overhang_mm: 40, tool_material_E_GPa: 600, num_flutes: 4, material_type: "steel",
};
// Minimal valid KalmanInput: a 1-state "standard" filter tracking a ~constant signal.
const KALMAN_INPUT = {
  mode: "standard", state_dim: 1,
  initial_state: [0], initial_covariance: [1], process_noise: [0.01], measurement_noise: [0.1],
  measurements: [
    { time: 0, values: [1.0] }, { time: 1, values: [1.05] },
    { time: 2, values: [0.98] }, { time: 3, values: [1.02] },
  ],
};

describe("prism_calc dead-facade wire fix (U-CALC-FACADE-FIX)", () => {
  const calc = calcTool();

  it("process_variability_integration_calc routes to analyze() -- real result, not the facade note", async () => {
    const r = await call(calc, "process_variability_integration_calc", PVI_INPUT);
    expect(r.success).toBe(true);
    expect(isFacade(r.data)).toBe(false);                         // the dead-facade note is gone
    expect(JSON.stringify(r.data)).toMatch(/cpk|conform|risk|ppm/i); // real VariabilityPipelineResult content
  });

  it("process_variability_integration_calc: a wider tolerance is no worse than a tighter one (real numeric cpk flows)", async () => {
    const { usl_mm: _u, lsl_mm: _l, ...base } = PVI_INPUT;
    const tight = await call(calc, "process_variability_integration_calc", { ...base, usl_mm: 10.01, lsl_mm: 9.99 });
    const wide = await call(calc, "process_variability_integration_calc", { ...base, usl_mm: 10.3, lsl_mm: 9.7 });
    for (const r of [tight, wide]) { expect(isFacade(r.data)).toBe(false); }
    const cpk = (r: any): number => { const d = unwrap(r.data); return Number(d?.cpk?.value ?? d?.cpk ?? d?.capability?.cpk ?? NaN); };
    // Monte-Carlo pipeline -> allow noise, but a 30x-wider tolerance must not yield a LOWER cpk than the tight one.
    expect(cpk(wide)).toBeGreaterThanOrEqual(cpk(tight) - 0.05);
    expect(Number.isFinite(cpk(wide))).toBe(true); // a real number came back, not the facade object
  });

  it("kalman_filter_calc routes to compute() -- real filtered result, not the facade note", async () => {
    const r = await call(calc, "kalman_filter_calc", KALMAN_INPUT);
    expect(r.success).toBe(true);
    expect(isFacade(r.data)).toBe(false);
    expect(JSON.stringify(r.data)).toMatch(/filtered_states|state_summary|final_state/i);
  });

  it("kalman_filter_calc: produces one filtered state per measurement and tracks toward the signal (~1.0)", async () => {
    const r = await call(calc, "kalman_filter_calc", KALMAN_INPUT);
    const kr = unwrap(r.data);
    expect(Array.isArray(kr.filtered_states)).toBe(true);
    expect(kr.filtered_states.length).toBe(KALMAN_INPUT.measurements.length); // 4 steps in, 4 states out
    // final estimate should sit near the measured constant (~1.0), not the initial 0.
    const finalState = kr.state_summary?.final_state ?? kr.filtered_states[kr.filtered_states.length - 1]?.state;
    expect(Number(finalState[0])).toBeGreaterThan(0.5);
    expect(Number(finalState[0])).toBeLessThan(1.5);
  });
});
