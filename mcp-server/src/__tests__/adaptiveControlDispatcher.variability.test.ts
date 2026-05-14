/**
 * ORPHAN-RESCUE — prism_adaptive_control:variability_* dispatcher wiring tests
 *
 * Round-trips VariabilityEnvelopeEngine through the `prism_adaptive_control`
 * MCP tool handler. Uses a fake MCP server that captures the registered handler
 * closure so the full chain runs (z.enum gate -> normalizeParams ->
 * validateActionParams -> pre-calc hooks -> switch case -> engine -> slimResponse).
 *
 * NOTE: the dispatcher wires the *singleton* variabilityEnvelopeEngine, so state
 * persists across calls within this file. Every test that mutates uses a UNIQUE
 * parameter name (wire_*) so cases never collide; read-only tests use the 8
 * seeded defaults.
 *
 * The invalid-params path returns a RAW dispatcherError object
 * ({success:false,error,...}), NOT a {content:[]} envelope — parseResponse
 * handles both shapes.
 *
 * @milestone OBSIDIAN-PRISM-OS-MS0 / orphan-rescue (VariabilityEnvelopeEngine)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

type RegisteredTool = {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
};

function makeFakeServer(): { server: { tool: (...args: unknown[]) => void }; tools: RegisteredTool[] } {
  const tools: RegisteredTool[] = [];
  const server = {
    tool: (...args: unknown[]) => {
      tools.push({ name: args[0] as string, handler: args[3] as RegisteredTool["handler"] });
    },
  };
  return { server, tools };
}

async function buildHandler(): Promise<RegisteredTool["handler"]> {
  const { server, tools } = makeFakeServer();
  const { registerAdaptiveControlDispatcher } = await import("../tools/dispatchers/adaptiveControlDispatcher.js");
  registerAdaptiveControlDispatcher(server as never);
  const tool = tools.find((t) => t.name === "prism_adaptive_control");
  if (!tool) throw new Error("registerAdaptiveControlDispatcher did not register 'prism_adaptive_control'");
  return tool.handler;
}

/** Handles BOTH the success envelope ({content:[{text}]}) and the raw dispatcherError object. */
function parseResponse(response: unknown): Record<string, unknown> {
  if (response && typeof response === "object" && Array.isArray((response as { content?: unknown }).content)) {
    const content = (response as { content: Array<{ text?: string }> }).content;
    return JSON.parse(content[0]?.text ?? "{}");
  }
  return (response ?? {}) as Record<string, unknown>;
}

/** A complete, strictly-monotone envelope (passes _variabilityEnvelopeShape). */
function wireEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    parameter: "placeholder",
    nominal: 100,
    unit: "units",
    distribution: "lognormal",
    p50: 100,
    p95: 200,
    p99: 300,
    p999: 500,
    outlierCapture: true,
    sampleCount: 500,
    ...overrides,
  };
}

const ACTIONS = [
  "variability_evaluate",
  "variability_get_envelope",
  "variability_set_envelope",
  "variability_expand",
  "variability_apply_expansion",
  "variability_export",
  "variability_import",
  "variability_outliers",
] as const;

// ── source-level presence: enum + case + schema-map all wired ────────────

describe("prism_adaptive_control:variability_* — source wiring", () => {
  const dispatcherSrc = readFileSync(
    new URL("../tools/dispatchers/adaptiveControlDispatcher.ts", import.meta.url),
    "utf-8",
  );
  const schemaSrc = readFileSync(
    new URL("../schemas/adaptiveControlActionSchemas.ts", import.meta.url),
    "utf-8",
  );

  for (const action of ACTIONS) {
    it(`'${action}' appears in the ACTIONS enum`, () => {
      expect(dispatcherSrc).toContain(`"${action}"`);
    });
    it(`'${action}' has a switch case`, () => {
      expect(dispatcherSrc).toContain(`case "${action}":`);
    });
    it(`'${action}' is registered in ADAPTIVE_CONTROL_ACTION_SCHEMAS`, () => {
      expect(schemaSrc).toContain(`  ${action},`);
    });
  }

  it("the dispatcher lazy-imports VariabilityEnvelopeEngine via the getEngine('var') case", () => {
    expect(dispatcherSrc).toContain('await import("../../engines/VariabilityEnvelopeEngine.js")');
  });
});

// ── variability_evaluate ─────────────────────────────────────────────────

describe("prism_adaptive_control:variability_evaluate", () => {
  it("evaluates a value against a seeded envelope (spindle_rpm at p95 → percentile 0.95)", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "variability_evaluate",
      params: { parameter: "spindle_rpm", value: 12000 },
    }));
    expect(body.percentile).toBeCloseTo(0.95, 5);
    expect(body.recommendation).toBe("accept");
    expect(body.created).toBe(false); // spindle_rpm already existed
  });

  it("flags created=true when evaluating an unknown parameter (engine mints a default envelope)", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "variability_evaluate",
      params: { parameter: "wire_unknown_param", value: 99 },
    }));
    expect(body.created).toBe(true);
    expect(body.confidence).toBe(0.1);
    expect(body.recommendation).toBe("caution");
  });

  it("Zod gate rejects a missing 'parameter' — raw dispatcherError, success=false", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "variability_evaluate",
      params: { value: 100 },
    }));
    expect(body.success).toBe(false);
    expect(String(body.error)).toContain("Invalid params for 'variability_evaluate'");
  });
});

// ── variability_get_envelope ─────────────────────────────────────────────

describe("prism_adaptive_control:variability_get_envelope", () => {
  it("returns found=true with the envelope for a seeded parameter", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "variability_get_envelope",
      params: { parameter: "feed_rate" },
    }));
    expect(body.found).toBe(true);
    expect((body.envelope as Record<string, unknown>).nominal).toBe(500);
  });

  it("returns found=false for an unknown parameter (slimResponse strips the null envelope)", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "variability_get_envelope",
      params: { parameter: "wire_ghost_param" },
    }));
    expect(body.found).toBe(false);
    expect(body.envelope).toBeUndefined(); // null stripped by slimResponse
  });
});

// ── variability_set_envelope ─────────────────────────────────────────────

describe("prism_adaptive_control:variability_set_envelope", () => {
  it("stores an envelope and FORCES envelope.parameter to match the Map key", async () => {
    const handler = await buildHandler();
    // caller passes a mismatched envelope.parameter — the dispatcher must override it
    const body = parseResponse(await handler({
      action: "variability_set_envelope",
      params: {
        parameter: "wire_set_param",
        envelope: wireEnvelope({ parameter: "DELIBERATELY_WRONG", p999: 4321 }),
      },
    }));
    expect(body.stored).toBe(true);
    const env = body.envelope as Record<string, unknown>;
    expect(env.parameter).toBe("wire_set_param"); // injected, not "DELIBERATELY_WRONG"
    expect(env.p999).toBe(4321);
  });

  it("Zod gate rejects a degenerate envelope where p95 <= p50 (divide-by-zero guard)", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "variability_set_envelope",
      params: {
        parameter: "wire_degenerate",
        envelope: wireEnvelope({ parameter: "wire_degenerate", p50: 200, p95: 200 }),
      },
    }));
    expect(body.success).toBe(false);
    expect(String(body.error)).toContain("Invalid params for 'variability_set_envelope'");
  });

  it("Zod gate rejects a non-finite percentile (Infinity)", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "variability_set_envelope",
      params: {
        parameter: "wire_infinite",
        envelope: wireEnvelope({ parameter: "wire_infinite", p999: Infinity }),
      },
    }));
    expect(body.success).toBe(false);
  });
});

// ── variability_expand ───────────────────────────────────────────────────

describe("prism_adaptive_control:variability_expand", () => {
  it("returns hasProposal=false when evidence is insufficient", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "variability_expand",
      params: {
        parameter: "spindle_rpm",
        evidence: [{ value: 20000, outcome: "success" }],
      },
    }));
    expect(body.hasProposal).toBe(false);
  });

  it("returns hasProposal=true with a proposedP999 = maxSuccess * 1.1 when 3+ successful outliers", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "variability_expand",
      params: {
        parameter: "spindle_rpm",
        evidence: [
          { value: 20000, outcome: "success" },
          { value: 21000, outcome: "success" },
          { value: 22000, outcome: "success" },
        ],
      },
    }));
    expect(body.hasProposal).toBe(true);
    const proposal = body.proposal as Record<string, unknown>;
    expect(proposal.proposedP999).toBeCloseTo(24200, 5);
    expect(proposal.riskAssessment).toBe("medium");
  });
});

// ── variability_apply_expansion ──────────────────────────────────────────

describe("prism_adaptive_control:variability_apply_expansion", () => {
  it("applies a valid proposal and reports applied=true with the updated envelope", async () => {
    const handler = await buildHandler();
    // self-contained: seed a dedicated param, then apply an expansion to it
    await handler({
      action: "variability_set_envelope",
      params: { parameter: "wire_apply_param", envelope: wireEnvelope({ parameter: "wire_apply_param", p999: 500 }) },
    });
    const body = parseResponse(await handler({
      action: "variability_apply_expansion",
      params: {
        proposal: {
          parameter: "wire_apply_param",
          currentP999: 500,
          proposedP999: 880,
          evidence: [{ value: 800, outcome: "success" }],
          confidenceGain: 1,
          riskAssessment: "medium",
        },
      },
    }));
    expect(body.applied).toBe(true);
    expect((body.envelope as Record<string, unknown>).p999).toBe(880);
  });

  it("reports applied=false + reason when the proposal's parameter has no envelope (R12: no false success)", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "variability_apply_expansion",
      params: {
        proposal: {
          parameter: "wire_never_registered",
          currentP999: 100,
          proposedP999: 200,
          evidence: [],
          confidenceGain: 1,
          riskAssessment: "low",
        },
      },
    }));
    expect(body.applied).toBe(false);
    expect(body.reason).toBe("parameter_not_found");
  });

  it("Zod gate rejects a proposal where proposedP999 <= currentP999", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "variability_apply_expansion",
      params: {
        proposal: {
          parameter: "spindle_rpm",
          currentP999: 18000,
          proposedP999: 17000, // downward — invalid
          evidence: [],
          confidenceGain: 1,
          riskAssessment: "low",
        },
      },
    }));
    expect(body.success).toBe(false);
    expect(String(body.error)).toContain("Invalid params for 'variability_apply_expansion'");
  });
});

// ── variability_export / variability_import / variability_outliers ───────

describe("prism_adaptive_control:variability_export / import / outliers", () => {
  it("export returns all envelopes with a count of at least the 8 seeded defaults", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({ action: "variability_export" }));
    expect((body.count as number)).toBeGreaterThanOrEqual(8);
    const envelopes = body.envelopes as Record<string, { p50: number }>;
    expect(envelopes.spindle_rpm.p50).toBe(8000);
  });

  it("import merges an envelope in and injects the map key as envelope.parameter", async () => {
    const handler = await buildHandler();
    const body = parseResponse(await handler({
      action: "variability_import",
      params: {
        data: { wire_import_param: wireEnvelope({ parameter: "MISMATCH_IGNORED", p999: 1234 }) },
      },
    }));
    expect(body.imported).toBe(1);
    // confirm it landed and the key was injected as the parameter field
    const got = parseResponse(await handler({
      action: "variability_get_envelope",
      params: { parameter: "wire_import_param" },
    }));
    expect(got.found).toBe(true);
    expect((got.envelope as Record<string, unknown>).parameter).toBe("wire_import_param");
    expect((got.envelope as Record<string, unknown>).p999).toBe(1234);
  });

  it("outliers returns a flattened object keyed by parameter (Map → object)", async () => {
    const handler = await buildHandler();
    // drive an outlier capture through a dedicated param so the buffer is non-empty
    await handler({
      action: "variability_set_envelope",
      params: { parameter: "wire_outlier_param", envelope: wireEnvelope({ parameter: "wire_outlier_param", p999: 500 }) },
    });
    await handler({ action: "variability_evaluate", params: { parameter: "wire_outlier_param", value: 100000 } });
    const body = parseResponse(await handler({ action: "variability_outliers" }));
    const outliers = body.outliers as Record<string, number[]>;
    expect(outliers.wire_outlier_param).toEqual([100000]);
    expect((body.parameterCount as number)).toBeGreaterThanOrEqual(1);
  });
});
