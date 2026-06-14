/**
 * Tests for the prism_intelligence `process_orchestrate` action
 * ──────────────────────────────────────────────────────────────
 *
 * INFRA-AGI-ROUTER-MS2/P1-U05 — dispatcher round-trip for
 * ProcessIntelligenceRouterEngine.orchestrate(DomainAGIIntent).
 *
 * This is the E2E acceptance test mandated by CLAUDE.md §ENGINE WIRING
 * ("round-trip E2E assertion through every wired dispatcher"). The router's
 * own contract is exhaustively covered by
 * ProcessIntelligenceRouterEngine-orchestrate.test.ts (11 cases) + each
 * domain engine's adapter suite — this file proves only the dispatcher
 * WIRING: that `action: "process_orchestrate"` reaches the engine and the
 * DomainAGIResult round-trips back through the MCP content envelope.
 *
 * The dispatcher is registered via `server.tool(...)`. We mock the server,
 * capture the handler the dispatcher passes to `server.tool`, then invoke
 * that handler directly — the standard PRISM dispatcher-test pattern.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerIntelligenceDispatcher } from "../tools/dispatchers/intelligenceDispatcher.js";
import type { DomainAGIIntent } from "../schemas/domainAGIContract.js";

// ─── Harness: capture the dispatcher handler ────────────────────────────────

type DispatcherHandler = (arg: {
  action: string;
  params?: Record<string, unknown>;
}) => Promise<{ content: Array<{ type: string; text: string }> }>;

let handler: DispatcherHandler;
let registeredActions: string[] = [];

beforeAll(() => {
  // Minimal fake MCP server — captures the tool name, the action enum, and
  // the async handler the dispatcher registers.
  const fakeServer = {
    tool(
      _name: string,
      _description: string,
      schema: { action: { options?: string[]; _def?: { values?: string[] } } },
      fn: DispatcherHandler,
    ) {
      // z.enum exposes its members on `.options`.
      registeredActions = schema.action.options ?? schema.action._def?.values ?? [];
      handler = fn;
    },
  };
  registerIntelligenceDispatcher(fakeServer as unknown as Parameters<typeof registerIntelligenceDispatcher>[0]);
});

function millIntent(): DomainAGIIntent {
  return {
    schemaVersion: "1.0.0",
    domain: "mill",
    action: "roughing",
    features: [{ id: "F-M1", kind: "pocket", dimensions: { length_mm: 60, width_mm: 40, depth_mm: 12 } }],
    material: "1018-steel",
    constraints: {},
    consensusRequired: false,
  };
}

function latheIntent(): DomainAGIIntent {
  return {
    schemaVersion: "1.0.0",
    domain: "lathe",
    action: "turning",
    features: [{ id: "F-L1", kind: "od_profile", dimensions: { diameter_mm: 30, length_mm: 120 } }],
    material: "1018 steel",
    constraints: {},
    consensusRequired: false,
  };
}

function wedmIntent(): DomainAGIIntent {
  return {
    schemaVersion: "1.0.0",
    domain: "wedm",
    action: "rough_cut",
    features: [{ id: "F-W1", kind: "profile", dimensions: { thickness_mm: 20, wire_diameter_mm: 0.25 } }],
    material: "D2",
    constraints: {},
    consensusRequired: false,
  };
}

/** Parse the JSON the dispatcher packs into content[0].text. */
function parseResult(out: { content: Array<{ type: string; text: string }> }): {
  action: string;
  success: boolean;
  result: { schemaVersion: string; success: boolean; decisions: unknown[]; confidence: number; outcomes: unknown[]; warnings: unknown[]; error?: { code: string; stage?: string } };
} {
  expect(out.content.length).toBeGreaterThanOrEqual(1);
  expect(out.content[0].type).toBe("text");
  return JSON.parse(out.content[0].text);
}

describe("prism_intelligence process_orchestrate — dispatcher wiring (P1-U05)", () => {
  describe("action registration", () => {
    it("'process_orchestrate' is in the dispatcher's action enum", () => {
      expect(registeredActions).toContain("process_orchestrate");
    });

    it("the legacy 'process_route' action is still registered (no regression)", () => {
      // P1-U05 ADDS process_orchestrate alongside process_route — it must not
      // remove or rename the existing keyword-classification action.
      expect(registeredActions).toContain("process_route");
    });
  });

  describe("domain dispatch round-trips through the MCP content envelope", () => {
    it("mill intent → dispatcher → DomainAGIResult (schemaVersion 1.0.0)", async () => {
      const out = await handler({ action: "process_orchestrate", params: { intent: millIntent() } });
      const parsed = parseResult(out);
      expect(parsed.action).toBe("process_orchestrate");
      expect(parsed.result.schemaVersion).toBe("1.0.0");
      // Proves dispatch landed in a domain engine (not the router's
      // UNROUTABLE_DOMAIN fall-through).
      expect(parsed.result.error?.code).not.toBe("UNROUTABLE_DOMAIN");
      expect(Array.isArray(parsed.result.decisions)).toBe(true);
      expect(Array.isArray(parsed.result.outcomes)).toBe(true);
    });

    it("lathe intent → dispatcher → DomainAGIResult", async () => {
      const out = await handler({ action: "process_orchestrate", params: { intent: latheIntent() } });
      const parsed = parseResult(out);
      expect(parsed.result.schemaVersion).toBe("1.0.0");
      expect(parsed.result.error?.code).not.toBe("UNROUTABLE_DOMAIN");
      expect(typeof parsed.result.confidence).toBe("number");
      expect(parsed.result.confidence).toBeGreaterThanOrEqual(0);
      expect(parsed.result.confidence).toBeLessThanOrEqual(1);
    });

    it("wedm intent → dispatcher → DomainAGIResult", async () => {
      const out = await handler({ action: "process_orchestrate", params: { intent: wedmIntent() } });
      const parsed = parseResult(out);
      expect(parsed.result.schemaVersion).toBe("1.0.0");
      expect(parsed.result.error?.code).not.toBe("UNROUTABLE_DOMAIN");
      expect(Array.isArray(parsed.result.warnings)).toBe(true);
    });
  });

  describe("schema-gate failures round-trip as typed DomainAGIResults", () => {
    it("invalid intent → success:false + INVALID_INTENT (never throws out of the dispatcher)", async () => {
      // A malformed intent must NOT throw — the router schema-gates it and
      // returns a typed failure DomainAGIResult, which the dispatcher packs
      // verbatim. The outer envelope `success` mirrors result.success.
      const out = await handler({
        action: "process_orchestrate",
        params: { intent: { schemaVersion: "1.0.0", domain: "mill" } },
      });
      const parsed = parseResult(out);
      expect(parsed.success).toBe(false);
      expect(parsed.result.success).toBe(false);
      expect(parsed.result.error?.code).toBe("INVALID_INTENT");
      expect(parsed.result.error?.stage).toBe("router_validation");
    });

    it("missing intent (empty params) → INVALID_INTENT, not a thrown error", async () => {
      // When params.intent is absent the dispatcher forwards `params` itself;
      // an empty object fails DomainAGIIntentSchema → typed INVALID_INTENT.
      const out = await handler({ action: "process_orchestrate", params: {} });
      const parsed = parseResult(out);
      expect(parsed.result.success).toBe(false);
      expect(parsed.result.error?.code).toBe("INVALID_INTENT");
    });

    it("cross-domain action ('rough_cut' for mill) → INVALID_INTENT", async () => {
      // The contract's superRefine rejects an action that doesn't belong to
      // the named domain — the dispatcher surfaces it as a typed failure.
      const out = await handler({
        action: "process_orchestrate",
        params: { intent: { ...millIntent(), action: "rough_cut" } },
      });
      const parsed = parseResult(out);
      expect(parsed.result.success).toBe(false);
      expect(parsed.result.error?.code).toBe("INVALID_INTENT");
    });
  });

  describe("parameter-shape tolerance", () => {
    it("accepts the intent nested under params.intent", async () => {
      const out = await handler({ action: "process_orchestrate", params: { intent: wedmIntent() } });
      const parsed = parseResult(out);
      expect(parsed.result.schemaVersion).toBe("1.0.0");
      expect(parsed.result.error?.code).not.toBe("UNROUTABLE_DOMAIN");
    });

    it("accepts the intent passed as the flat params object", async () => {
      // The dispatcher falls back to `params` itself when params.intent is
      // absent — a caller may pass the DomainAGIIntent fields flat.
      const out = await handler({
        action: "process_orchestrate",
        params: { ...wedmIntent() } as unknown as Record<string, unknown>,
      });
      const parsed = parseResult(out);
      expect(parsed.result.schemaVersion).toBe("1.0.0");
      expect(parsed.result.error?.code).not.toBe("UNROUTABLE_DOMAIN");
    });
  });
});
