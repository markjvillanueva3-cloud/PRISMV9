/**
 * devDispatcher U-WIRE-FORMAL round-trip tests — FormalVerificationEngine (Z3 SAT/SMT).
 *
 * Validates the 3 new actions (formal_prove / formal_satisfy / formal_ready) wire
 * through prism_dev and that the engine's Z3-backed integer-linear reasoning behaves
 * per contract: prove() returns "unsat" when a goal is PROVEN (assumptions ∧ ¬goal is
 * unsatisfiable) and "sat" + a counterexample when it is not; satisfy() returns a
 * model or "unsat".
 *
 * Pattern: a LIVE dispatcher round-trip (registerDevDispatcher(shim) → capture handler
 * → invoke → assert JSON). Z3's WASM loads lazily + module-cached across all instances;
 * engine-direct value tests use isolated `new FormalVerificationEngine()`. Z3-using tests
 * carry a generous timeout (cold WASM load under memory pressure).
 *
 * Wired slot:papa 2026-06-13 — continues WIRE-UNWIRED-PAPA (verification infra).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-FORMAL
 */

import { describe, it, expect } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import {
  FormalVerificationEngine,
  formalVerificationEngine,
  type ProofInput,
  type SatInput,
} from "../engines/FormalVerificationEngine.js";

const Z3_TIMEOUT = 30000;

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

function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerDevDispatcher(s as unknown as { tool: MockMCPServer["tool"] });
  return s;
}

// ── Engine-direct: Z3 SAT/SMT reference results ─────────────────────────────
describe("U-WIRE-FORMAL — Z3 prove() / satisfy() reference results", () => {
  it("Z3 loads (ready() === true)", async () => {
    expect(await new FormalVerificationEngine().ready()).toBe(true);
  }, Z3_TIMEOUT);

  it("prove: x>=5 ⊢ x>=3 is PROVEN (unsat of assumptions ∧ ¬goal)", async () => {
    const e = new FormalVerificationEngine();
    const input: ProofInput = {
      variables: [{ name: "x", min: 0, max: 10 }],
      assumptions: [{ terms: { x: 1 }, op: ">=", rhs: 5 }],
      goal: { terms: { x: 1 }, op: ">=", rhs: 3 },
    };
    const r = await e.prove(input);
    expect(r.result).toBe("unsat");
    expect(r.counterexample).toBeNull();
  }, Z3_TIMEOUT);

  it("prove: x>=5 ⊬ x>=8 — returns sat with a counterexample in [5,7]", async () => {
    const e = new FormalVerificationEngine();
    const r = await e.prove({
      variables: [{ name: "x", min: 0, max: 10 }],
      assumptions: [{ terms: { x: 1 }, op: ">=", rhs: 5 }],
      goal: { terms: { x: 1 }, op: ">=", rhs: 8 },
    });
    expect(r.result).toBe("sat");
    expect(r.counterexample).not.toBeNull();
    const x = r.counterexample!.x;
    expect(x).toBeGreaterThanOrEqual(5);
    expect(x).toBeLessThanOrEqual(7);
  }, Z3_TIMEOUT);

  it("prove: multi-var x+y<=5 ⊢ x<=5 is PROVEN", async () => {
    const e = new FormalVerificationEngine();
    const r = await e.prove({
      variables: [{ name: "x", min: 0, max: 10 }, { name: "y", min: 0, max: 10 }],
      assumptions: [{ terms: { x: 1, y: 1 }, op: "<=", rhs: 5 }],
      goal: { terms: { x: 1 }, op: "<=", rhs: 5 },
    });
    expect(r.result).toBe("unsat");
  }, Z3_TIMEOUT);

  it("satisfy: {x>=3, x<=7} is SAT with a model in [3,7]", async () => {
    const e = new FormalVerificationEngine();
    const r = await e.satisfy({
      variables: [{ name: "x", min: 0, max: 10 }],
      constraints: [{ terms: { x: 1 }, op: ">=", rhs: 3 }, { terms: { x: 1 }, op: "<=", rhs: 7 }],
    });
    expect(r.result).toBe("sat");
    expect(r.model).not.toBeNull();
    expect(r.model!.x).toBeGreaterThanOrEqual(3);
    expect(r.model!.x).toBeLessThanOrEqual(7);
  }, Z3_TIMEOUT);

  it("satisfy: {x<=5 ∧ x>=8} is UNSAT (no model)", async () => {
    const e = new FormalVerificationEngine();
    const r = await e.satisfy({
      variables: [{ name: "x", min: 0, max: 10 }],
      constraints: [{ terms: { x: 1 }, op: "<=", rhs: 5 }, { terms: { x: 1 }, op: ">=", rhs: 8 }],
    });
    expect(r.result).toBe("unsat");
    expect(r.model).toBeNull();
  }, Z3_TIMEOUT);
});

// ── Fail-loud validation (R12 — throws BEFORE Z3 load, deterministic) ────────
describe("U-WIRE-FORMAL — input validation (fail-loud)", () => {
  it("prove rejects an empty variable set", async () => {
    await expect(new FormalVerificationEngine().prove({
      variables: [], assumptions: [], goal: { terms: { x: 1 }, op: "<=", rhs: 1 },
    } as ProofInput)).rejects.toThrow(/variables must be non-empty/);
  });

  it("prove rejects a duplicate variable name", async () => {
    await expect(new FormalVerificationEngine().prove({
      variables: [{ name: "x", min: 0, max: 5 }, { name: "x", min: 0, max: 5 }],
      assumptions: [], goal: { terms: { x: 1 }, op: "<=", rhs: 1 },
    })).rejects.toThrow(/duplicate variable/);
  });

  it("prove rejects min > max bounds", async () => {
    await expect(new FormalVerificationEngine().prove({
      variables: [{ name: "x", min: 10, max: 0 }],
      assumptions: [], goal: { terms: { x: 1 }, op: "<=", rhs: 1 },
    })).rejects.toThrow(/min > max/);
  });

  it("satisfy rejects an invalid operator", async () => {
    await expect(new FormalVerificationEngine().satisfy({
      variables: [{ name: "x", min: 0, max: 5 }],
      constraints: [{ terms: { x: 1 }, op: "!=" as unknown as "<=", rhs: 1 }],
    })).rejects.toThrow(/op must be/);
  });

  it("a goal referencing an undeclared variable fail-softs to 'unknown' (caught at solve)", async () => {
    const e = new FormalVerificationEngine();
    const r = await e.prove({
      variables: [{ name: "x", min: 0, max: 5 }],
      assumptions: [],
      goal: { terms: { ghost: 1 }, op: "<=", rhs: 1 }, // 'ghost' not declared
    });
    expect(r.result).toBe("unknown");
  }, Z3_TIMEOUT);
});

// ── LIVE round-trip through prism_dev (the wire proof) ──────────────────────
describe("U-WIRE-FORMAL — dispatcher round-trip (prism_dev)", () => {
  it("formal_ready reports Z3 availability", async () => {
    const r = await call(newServer(), "formal_ready");
    expect(r.ok).toBe(true);
    expect(r.data.ready).toBe(true);
  }, Z3_TIMEOUT);

  it("formal_prove returns unsat for a provable goal end-to-end", async () => {
    const r = await call(newServer(), "formal_prove", {
      variables: [{ name: "x", min: 0, max: 10 }],
      assumptions: [{ terms: { x: 1 }, op: ">=", rhs: 5 }],
      goal: { terms: { x: 1 }, op: ">=", rhs: 3 },
    });
    expect(r.ok).toBe(true);
    expect(r.data.result).toBe("unsat");
  }, Z3_TIMEOUT);

  it("formal_satisfy returns a model through the dispatcher", async () => {
    const r = await call(newServer(), "formal_satisfy", {
      variables: [{ name: "x", min: 0, max: 10 }],
      constraints: [{ terms: { x: 1 }, op: ">=", rhs: 3 }, { terms: { x: 1 }, op: "<=", rhs: 7 }],
    });
    expect(r.ok).toBe(true);
    expect(r.data.result).toBe("sat");
    expect((r.data.model as Record<string, number>).x).toBeGreaterThanOrEqual(3);
  }, Z3_TIMEOUT);

  it("the exported singleton is the same Z3 surface the dispatcher uses", async () => {
    expect(await formalVerificationEngine.ready()).toBe(true);
  }, Z3_TIMEOUT);
});

// ── Schema validation through the dispatcher (adversarial) ──────────────────
describe("U-WIRE-FORMAL — schema rejection (prism_dev)", () => {
  it("formal_prove rejects an empty variables array (min 1)", async () => {
    const r = await call(newServer(), "formal_prove", {
      variables: [], assumptions: [], goal: { terms: { x: 1 }, op: "<=", rhs: 1 },
    });
    expect(r.ok).toBe(false);
  });

  it("formal_prove rejects an out-of-enum constraint op", async () => {
    const r = await call(newServer(), "formal_prove", {
      variables: [{ name: "x", min: 0, max: 5 }],
      assumptions: [{ terms: { x: 1 }, op: "!=", rhs: 1 }],
      goal: { terms: { x: 1 }, op: "<=", rhs: 1 },
    });
    expect(r.ok).toBe(false);
  });

  it("formal_satisfy rejects a non-integer bound", async () => {
    const r = await call(newServer(), "formal_satisfy", {
      variables: [{ name: "x", min: 0.5, max: 5 }],
      constraints: [{ terms: { x: 1 }, op: "<=", rhs: 1 }],
    });
    expect(r.ok).toBe(false);
  });
});
