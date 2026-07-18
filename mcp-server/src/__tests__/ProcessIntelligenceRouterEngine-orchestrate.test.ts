/**
 * Tests for ProcessIntelligenceRouterEngine.orchestrate(DomainAGIIntent)
 * ─────────────────────────────────────────────────────────────────────
 *
 * P0-U05 (INFRA-AGI-ROUTER-MS2) — 3-domain smoke test.
 *
 * Verifies the static dispatch table:
 *   mill  → millingAGIMasterEngine.orchestrate
 *   lathe → latheAGIKnowledgeUnificationEngine.orchestrate
 *   wedm  → wireEDMAGIOrchestrator.orchestrate
 *
 * This is a SMOKE test of the router's wiring, NOT a re-test of each domain
 * engine's contract (those have their own dedicated suites — see
 * MillingAGIMasterEngine.test.ts, LatheAGIKnowledgeUnificationEngine.test.ts,
 * WireEDMAGIOrchestrator.test.ts P0-U04 block).
 */

import { describe, it, expect } from "vitest";
import { ProcessIntelligenceRouterEngine } from "../engines/ProcessIntelligenceRouterEngine.js";
import { DOMAIN_AGI_CONTRACT_VERSION, type DomainAGIIntent } from "../schemas/domainAGIContract.js";

function millIntent(): DomainAGIIntent {
  return {
    schemaVersion: "1.0.0",
    domain: "mill",
    action: "roughing",
    features: [{ id: "F-M1", kind: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 } }],
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
    features: [{ id: "F-L1", kind: "od_profile", dimensions: { diameter_mm: 25, length_mm: 100 } }],
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
    features: [{ id: "F-W1", kind: "profile", dimensions: { thickness_mm: 25, wire_diameter_mm: 0.25 } }],
    material: "D2",
    constraints: {},
    consensusRequired: false,
  };
}

describe("ProcessIntelligenceRouterEngine.orchestrate — 3-domain dispatch (P0-U05)", () => {
  describe("schema gate at the router boundary", () => {
    it("INVALID_INTENT when schema validation fails (missing required field)", async () => {
      const bad = { schemaVersion: "1.0.0", domain: "mill" } as unknown as DomainAGIIntent;
      const result = await ProcessIntelligenceRouterEngine.orchestrate(bad);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INTENT");
      expect(result.error?.stage).toBe("router_validation");
    });

    it("INVALID_INTENT when cross-domain action ('roughing' for wedm)", async () => {
      const bad = {
        ...wedmIntent(),
        action: "roughing" as unknown as DomainAGIIntent["action"],
      };
      const result = await ProcessIntelligenceRouterEngine.orchestrate(bad);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INTENT");
    });
  });

  describe("domain dispatch — each lane reaches its delegate", () => {
    it("mill intent → MillingAGIMasterEngine.orchestrate (schema-valid path returns DomainAGIResult)", async () => {
      // We assert the result SHAPE matches DomainAGIResult — proves the dispatch
      // landed in a domain engine's orchestrate, NOT in the router's
      // UNROUTABLE_DOMAIN branch (which would carry code UNROUTABLE_DOMAIN).
      const result = await ProcessIntelligenceRouterEngine.orchestrate(millIntent());
      expect(result.schemaVersion).toBe("1.0.0");
      // Either success:true with decisions, or a domain-specific failure code
      // (REASONING_FAILED / SAFETY_FLOOR_VIOLATED / etc.) — but NEVER
      // UNROUTABLE_DOMAIN, which would prove the switch fell through.
      expect(result.error?.code).not.toBe("UNROUTABLE_DOMAIN");
      // outcomes[] is always present in DomainAGIResult (empty on failure path).
      expect(Array.isArray(result.outcomes)).toBe(true);
    });

    it("lathe intent → LatheAGIKnowledgeUnificationEngine.orchestrate", async () => {
      const result = await ProcessIntelligenceRouterEngine.orchestrate(latheIntent());
      expect(result.schemaVersion).toBe("1.0.0");
      expect(result.error?.code).not.toBe("UNROUTABLE_DOMAIN");
      expect(Array.isArray(result.outcomes)).toBe(true);
      // If the lathe engine succeeded, outcome events MUST carry domain="lathe"
      // — proves we hit the lathe lane, not mill/wedm by mistake.
      for (const e of result.outcomes) {
        expect(e.domain).toBe("lathe");
      }
    });

    it("wedm intent → wireEDMAGIOrchestrator.orchestrate", async () => {
      const result = await ProcessIntelligenceRouterEngine.orchestrate(wedmIntent());
      expect(result.schemaVersion).toBe("1.0.0");
      expect(result.error?.code).not.toBe("UNROUTABLE_DOMAIN");
      expect(Array.isArray(result.outcomes)).toBe(true);
      for (const e of result.outcomes) {
        expect(e.domain).toBe("wedm");
      }
    });
  });

  describe("uniform contract guarantee", () => {
    it("all 3 domains return a result satisfying the DomainAGIResult shape", async () => {
      const results = await Promise.all([
        ProcessIntelligenceRouterEngine.orchestrate(millIntent()),
        ProcessIntelligenceRouterEngine.orchestrate(latheIntent()),
        ProcessIntelligenceRouterEngine.orchestrate(wedmIntent()),
      ]);
      for (const r of results) {
        expect(r.schemaVersion).toBe("1.0.0");
        expect(typeof r.success).toBe("boolean");
        expect(Array.isArray(r.decisions)).toBe(true);
        expect(typeof r.confidence).toBe("number");
        expect(r.confidence).toBeGreaterThanOrEqual(0);
        expect(r.confidence).toBeLessThanOrEqual(1);
        expect(Array.isArray(r.outcomes)).toBe(true);
        expect(Array.isArray(r.warnings)).toBe(true);
      }
    });
  });

  describe("router boundary validation — additional edge cases", () => {
    it("INVALID_INTENT when schemaVersion is wrong literal (e.g., '2.0.0')", async () => {
      // The DomainAGIIntent contract pins schemaVersion to "1.0.0". A future
      // breaking bump would set it to "2.0.0" — until then the router must
      // refuse it at the gate so we never silently dispatch a foreign-schema
      // intent into a current-version engine.
      const bad = { ...millIntent(), schemaVersion: "2.0.0" as unknown as typeof DOMAIN_AGI_CONTRACT_VERSION };
      const result = await ProcessIntelligenceRouterEngine.orchestrate(bad);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INTENT");
      expect(result.error?.stage).toBe("router_validation");
      // The validation must have happened BEFORE dispatch — the result MUST
      // NOT carry the UNROUTABLE_DOMAIN code even though domain='mill' is valid.
      expect(result.error?.code).not.toBe("UNROUTABLE_DOMAIN");
    });

    it("INVALID_INTENT when intent is null (R12 fail-loud at boundary)", async () => {
      // A caller that bypasses TypeScript and passes null/undefined must hit
      // the schema gate's safeParse failure path, not crash with a TypeError
      // when the switch tries to read `.domain` on null. R12 fail-loud: every
      // bad input gets a deterministic INVALID_INTENT response.
      const result = await ProcessIntelligenceRouterEngine.orchestrate(
        null as unknown as DomainAGIIntent,
      );
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INTENT");
      expect(result.error?.stage).toBe("router_validation");
    });

    it("INVALID_INTENT when domain field is missing entirely", async () => {
      // A caller that drops the `domain` field can't be routed at all — Zod's
      // enum validator catches this and the router emits INVALID_INTENT
      // BEFORE the switch is reached (would otherwise fall into the
      // exhaustiveness default with `undefined` and emit UNROUTABLE_DOMAIN —
      // which is the wrong error code for "you forgot to specify domain").
      const bad = { ...millIntent() } as Partial<DomainAGIIntent>;
      delete bad.domain;
      const result = await ProcessIntelligenceRouterEngine.orchestrate(
        bad as DomainAGIIntent,
      );
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INTENT");
      // CRITICAL: should NOT be UNROUTABLE_DOMAIN — the schema gate catches
      // missing-domain before the switch even runs.
      expect(result.error?.code).not.toBe("UNROUTABLE_DOMAIN");
    });

    it("error.stage uses 'router_validation' namespace (not domain-engine prefix)", async () => {
      // The router's stage namespace tells the operator WHO rejected: the
      // router itself, vs. a downstream domain engine. INVALID_INTENT from
      // the router-boundary schema gate must always be tagged
      // 'router_validation' so audit trails distinguish router-level
      // rejections from engine-level rejections (which use stages like
      // 'mill_validation', 'lathe_orchestrate', 'wedm_tier6_gate').
      const bad = { schemaVersion: "1.0.0" } as unknown as DomainAGIIntent;
      const result = await ProcessIntelligenceRouterEngine.orchestrate(bad);
      expect(result.success).toBe(false);
      expect(result.error?.stage).toBe("router_validation");
      // Negative guards — must NOT collide with downstream engine namespaces.
      expect(result.error?.stage).not.toMatch(/^mill_/);
      expect(result.error?.stage).not.toMatch(/^lathe_/);
      expect(result.error?.stage).not.toMatch(/^wedm_/);
    });

    it("router does not mutate the input intent (immutability guarantee)", async () => {
      // Critical for caller safety: a caller that re-uses the same intent
      // object for two dispatches MUST get identical behavior on each call.
      // Any router-side field-stripping or in-place enrichment would break
      // this invariant and create heisenbugs in batch-orchestration code.
      const intent = millIntent();
      const snapshot = JSON.parse(JSON.stringify(intent));
      await ProcessIntelligenceRouterEngine.orchestrate(intent);
      expect(intent).toEqual(snapshot);
      // Re-dispatch with the same object — must still validate + dispatch
      // (proves the input wasn't poisoned or marked-consumed).
      const second = await ProcessIntelligenceRouterEngine.orchestrate(intent);
      expect(second.schemaVersion).toBe("1.0.0");
      expect(second.error?.code).not.toBe("INVALID_INTENT");
    });
  });
});
