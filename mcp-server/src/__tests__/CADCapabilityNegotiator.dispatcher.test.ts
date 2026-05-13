/**
 * CADCapabilityNegotiator — dispatcher round-trip test
 *
 * CAD-COMPLETE-MS0 / U-CADC-AI03
 *
 * Verifies that the prism_cad dispatcher actually routes the 3 new actions
 * (cad_capability_negotiate / cad_capability_negotiate_or_throw /
 * cad_capability_list_gaps) through to the negotiator engine — not just
 * that the singleton works in isolation. Per CLAUDE.md wiring rule:
 * "A test must invoke through the dispatcher, not only the engine singleton."
 *
 * Test pattern: capture the dispatcher handler by registering against a
 * fake MCP server, then invoke that handler directly with action + params.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";
import { ACTION_CAD_SCHEMAS } from "../schemas/cadActionSchemas.js";
import { CAD_REGISTERED_SYSTEMS, getCADAdapter } from "../engines/CADAdapterRegistry.js";
import type { CADOperationKind, CADSystemId } from "../interfaces/ICADCodeGenerator.js";

type DispatchHandler = (input: {
  action: string;
  params?: Record<string, unknown>;
}) => Promise<{ content: Array<{ type: string; text: string }> }>;

let capturedHandler: DispatchHandler | null = null;

beforeAll(() => {
  const fakeServer = {
    tool(
      _name: string,
      _desc: string,
      _schema: unknown,
      handler: DispatchHandler,
    ) {
      capturedHandler = handler;
    },
  };
  registerCadDispatcher(fakeServer);
  if (!capturedHandler) throw new Error("registerCadDispatcher did not register a handler");
});

/**
 * Dispatcher success path returns
 *   `{ content: [{ type: "text", text: JSON.stringify(slimResponse(result)) }] }`
 * where slimResponse strips empty arrays + null/undefined values.
 *
 * Dispatcher error path returns a PLAIN object (no content[] wrapper) from
 * `dispatcherError()`: `{ success: false, error, action, dispatcher, details }`.
 * The MCP SDK normally wraps plain returns into content[] but we invoke the
 * handler directly here, so we must check both shapes.
 */
async function invoke(
  action: string,
  params: Record<string, unknown>,
): Promise<{ ok: boolean; payload: unknown; raw: string }> {
  if (!capturedHandler) throw new Error("dispatcher handler missing");
  const result = (await capturedHandler({ action, params })) as
    | { content?: Array<{ type: string; text: string }> }
    | { success: boolean; error?: string; action?: string };

  // Success path: { content: [{ text: "..." }] }
  if ("content" in result && Array.isArray(result.content) && result.content[0]?.text) {
    const txt = result.content[0].text;
    let payload: unknown;
    try {
      payload = JSON.parse(txt);
    } catch {
      payload = { __unparsed: txt };
    }
    return { ok: true, payload, raw: txt };
  }

  // Error path: { success: false, error: "..." }
  if (
    typeof result === "object" &&
    result !== null &&
    "success" in result &&
    result.success === false
  ) {
    return {
      ok: false,
      payload: result,
      raw: JSON.stringify(result),
    };
  }

  // Unknown shape — surface as raw
  return { ok: false, payload: result, raw: JSON.stringify(result) };
}

async function workingAdapterIds(): Promise<CADSystemId[]> {
  const out: CADSystemId[] = [];
  for (const sys of CAD_REGISTERED_SYSTEMS) {
    try {
      const a = await getCADAdapter(sys);
      if (a && typeof a.getCapabilities === "function") out.push(sys);
    } catch {
      /* skip broken adapter */
    }
  }
  return out.sort();
}

async function pickUniversalOp(): Promise<CADOperationKind> {
  const working = await workingAdapterIds();
  if (working.length === 0) throw new Error("registry has zero working adapters");
  const sets: Set<CADOperationKind>[] = [];
  for (const sys of working) {
    const a = await getCADAdapter(sys);
    sets.push(new Set(a.getCapabilities().supportedOps));
  }
  for (const op of sets[0]) {
    if (sets.every((s) => s.has(op))) return op;
  }
  throw new Error("no universally-supported op across working adapters");
}

describe("CADCapabilityNegotiator — dispatcher round-trip", () => {
  it("registers the 3 new actions in ACTION_CAD_SCHEMAS with parseable Zod shapes", () => {
    const negotiate = ACTION_CAD_SCHEMAS.cad_capability_negotiate;
    const orThrow = ACTION_CAD_SCHEMAS.cad_capability_negotiate_or_throw;
    const listGaps = ACTION_CAD_SCHEMAS.cad_capability_list_gaps;
    expect(negotiate.safeParse({ ops: ["sketch_line"] }).success).toBe(true);
    expect(orThrow.safeParse({ ops: ["sketch_line"] }).success).toBe(true);
    expect(listGaps.safeParse({}).success).toBe(true);
  });

  it("dispatcher routes cad_capability_negotiate → negotiator engine returning the chosen adapter", async () => {
    const universalOp = await pickUniversalOp();
    const working = await workingAdapterIds();
    const pick = working[0];
    const result = await invoke("cad_capability_negotiate", {
      ops: [universalOp],
      preferredSystem: pick,
    });
    expect(result.ok).toBe(true);
    const data = result.payload as {
      cadSystem: string;
      supported: boolean;
      missingOps: string[];
    };
    expect(data.cadSystem).toBe(pick);
    expect(data.supported).toBe(true);
    // slimResponse strips empty arrays — accept missing field as equivalent to []
    expect(data.missingOps ?? []).toEqual([]);
  });

  it("dispatcher routes cad_capability_list_gaps → negotiator listGaps for working adapters", async () => {
    const result = await invoke("cad_capability_list_gaps", {});
    expect(result.ok).toBe(true);
    const data = result.payload as Array<{ cadSystem: string }>;
    expect(Array.isArray(data)).toBe(true);
    const working = await workingAdapterIds();
    expect(data.length).toBe(working.length);
  });

  it("dispatcher returns an error payload when negotiate_or_throw cannot satisfy intent", async () => {
    // Schema accepts any string in ops[]; engine reports no adapter can emit
    // the made-up op kind, so negotiateOrThrow throws and the dispatcher's
    // standard error path surfaces an `error` field in the response payload.
    const result = await invoke("cad_capability_negotiate_or_throw", {
      ops: ["totally_made_up_op_kind_xyz"],
      policy: "strict",
    });
    expect(result.ok).toBe(false);
    expect(result.raw.toLowerCase()).toMatch(/error|unsupported|missing/);
  });

  it("schema rejects intent missing the required ops field", () => {
    const parsed = ACTION_CAD_SCHEMAS.cad_capability_negotiate.safeParse({
      preferredSystem: "freecad",
    });
    expect(parsed.success).toBe(false);
  });

  it("schema accepts a minimal valid intent (ops only) and rejects an unknown policy value", () => {
    const minimal = ACTION_CAD_SCHEMAS.cad_capability_negotiate.safeParse({
      ops: ["sketch_line"],
    });
    expect(minimal.success).toBe(true);

    const bad = ACTION_CAD_SCHEMAS.cad_capability_negotiate.safeParse({
      ops: [],
      policy: "yolo",
    });
    expect(bad.success).toBe(false);
  });

  it("schema accepts the full optional intent shape", () => {
    const parsed = ACTION_CAD_SCHEMAS.cad_capability_negotiate.safeParse({
      ops: ["sketch_line", "feature_extrude"],
      preferredSystem: "fusion360",
      policy: "fallback",
      excludeSystems: ["mastercam"],
      excludeSubprocess: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("listGaps via dispatcher returns supportedOps + missingOps per adapter when referenceOps given", async () => {
    const universalOp = await pickUniversalOp();
    const result = await invoke("cad_capability_list_gaps", {
      referenceOps: [universalOp],
    });
    expect(result.ok).toBe(true);
    const data = result.payload as Array<{
      cadSystem: string;
      missingOps: string[];
      supportedOps: string[];
    }>;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    for (const entry of data) {
      expect(entry.supportedOps).toContain(universalOp);
      // slimResponse strips empty arrays — accept missing field as []
      expect(entry.missingOps ?? []).toEqual([]);
    }
  });
});
