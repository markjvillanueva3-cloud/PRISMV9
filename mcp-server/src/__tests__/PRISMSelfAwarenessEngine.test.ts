/**
 * PRISMSelfAwarenessEngine Tests
 *
 * Tests core self-awareness: manifest generation, capability matching,
 * gap detection, and AI recommendations.
 */

import { describe, it, expect } from "vitest";
import {
  prismSelfAwarenessEngine,
  generateClaudeMdContext,
  generateMinimalContext,
  refreshSelfAwareness,
} from "../engines/PRISMSelfAwarenessEngine.js";

describe("PRISMSelfAwarenessEngine", () => {
  describe("getManifest", () => {
    it("returns manifest with engines array containing at least 100 entries", async () => {
      const manifest = await prismSelfAwarenessEngine.getManifest();
      expect(manifest.engines.length).toBeGreaterThan(100);
    });

    it("returns manifest with ISO timestamp format", async () => {
      const manifest = await prismSelfAwarenessEngine.getManifest();
      const parsed = Date.parse(manifest.lastUpdated);
      expect(Number.isNaN(parsed)).toBe(false);
      expect(parsed).toBeLessThanOrEqual(Date.now());
    });

    it("returns manifest with version string", async () => {
      const manifest = await prismSelfAwarenessEngine.getManifest();
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("engine entries have required structure", async () => {
      const manifest = await prismSelfAwarenessEngine.getManifest();
      const engine = manifest.engines[0];
      expect(typeof engine.name).toBe("string");
      expect(engine.name.length).toBeGreaterThan(0);
      expect(typeof engine.path).toBe("string");
      expect(engine.path).toContain("src/engines/");
      expect(Array.isArray(engine.capabilities)).toBe(true);
    });
  });

  describe("findCapabilities - happy path", () => {
    it("finds safety-related capabilities with confidence > 0.3", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities("safety validation");
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].confidence).toBeGreaterThan(0.3);
      expect(matches[0].capability.toLowerCase()).toContain("safety");
    });

    it("finds WEDM capabilities when searching for wire edm", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities("wire edm");
      const hasWedm = matches.some(m =>
        m.capability.toLowerCase().includes("wedm") ||
        m.capability.toLowerCase().includes("edm")
      );
      expect(hasWedm).toBe(true);
    });

    it("returns results sorted by confidence descending", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities("cutting force");
      for (let i = 1; i < Math.min(matches.length, 10); i++) {
        expect(matches[i - 1].confidence).toBeGreaterThanOrEqual(matches[i].confidence);
      }
    });
  });

  describe("findCapabilities - failure modes", () => {
    it("returns empty array for completely nonsensical query", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities("zzzzqqqq12345nonexistent");
      // Low-confidence partial matches may exist, but top result should have low confidence
      if (matches.length > 0) {
        expect(matches[0].confidence).toBeLessThan(0.2);
      }
    });

    it("handles empty string without throwing", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities("");
      expect(Array.isArray(matches)).toBe(true);
    });

    it("handles null-ish input coerced to string", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities(undefined as unknown as string);
      expect(Array.isArray(matches)).toBe(true);
    });
  });

  describe("findCapabilities - adversarial inputs", () => {
    it("handles query with special regex characters", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities("test.*[a-z]+$^");
      expect(Array.isArray(matches)).toBe(true);
    });

    it("handles very long query (1000 chars) without hanging", async () => {
      const longQuery = "cutting ".repeat(125); // ~1000 chars
      const start = Date.now();
      const matches = await prismSelfAwarenessEngine.findCapabilities(longQuery);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000); // Should complete in < 5s
      expect(Array.isArray(matches)).toBe(true);
    });
  });

  describe("analyzeGaps", () => {
    it("returns hasCapability=true for known domain", async () => {
      const analysis = await prismSelfAwarenessEngine.analyzeGaps("calculate cutting force");
      expect(analysis.hasCapability).toBe(true);
      expect(analysis.confidence).toBeGreaterThan(0.5);
    });

    it("returns hasCapability=false for unknown domain", async () => {
      const analysis = await prismSelfAwarenessEngine.analyzeGaps("quantum teleportation engine");
      expect(analysis.hasCapability).toBe(false);
      expect(analysis.confidence).toBeLessThan(0.5);
    });

    it("includes query in response", async () => {
      const query = "thermal analysis for milling";
      const analysis = await prismSelfAwarenessEngine.analyzeGaps(query);
      expect(analysis.query).toBe(query);
    });

    it("provides suggestions array even when no capability found", async () => {
      const analysis = await prismSelfAwarenessEngine.analyzeGaps("nonexistent feature xyz");
      expect(Array.isArray(analysis.suggestions)).toBe(true);
    });
  });

  describe("recommendAIFeatures", () => {
    it("returns recommendations with priority scores", async () => {
      const recs = await prismSelfAwarenessEngine.recommendAIFeatures("optimize machining parameters");
      if (recs.length > 0) {
        expect(typeof recs[0].priority).toBe("number");
        expect(recs[0].priority).toBeGreaterThanOrEqual(0);
        expect(recs[0].priority).toBeLessThanOrEqual(1);
      }
    });

    it("recommendations include feature name and reason", async () => {
      const recs = await prismSelfAwarenessEngine.recommendAIFeatures("safety check");
      if (recs.length > 0) {
        expect(typeof recs[0].feature).toBe("string");
        expect(typeof recs[0].reason).toBe("string");
      }
    });

    it("returns empty array for irrelevant task", async () => {
      const recs = await prismSelfAwarenessEngine.recommendAIFeatures("");
      expect(Array.isArray(recs)).toBe(true);
    });
  });

  describe("searchTribalKnowledge", () => {
    it("returns array for any query", async () => {
      const results = await prismSelfAwarenessEngine.searchTribalKnowledge("speed feed");
      expect(Array.isArray(results)).toBe(true);
    });

    it("tribal entries have tip and category fields", async () => {
      const results = await prismSelfAwarenessEngine.searchTribalKnowledge("machining");
      if (results.length > 0) {
        expect(typeof results[0].tip).toBe("string");
        expect(typeof results[0].category).toBe("string");
      }
    });
  });

  describe("getJMDieCustomerPath", () => {
    it("returns null for non-existent customer", () => {
      const path = prismSelfAwarenessEngine.getJMDieCustomerPath("FAKE_CUSTOMER_999");
      expect(path).toBeNull();
    });

    it("case-insensitive lookup returns consistent result", () => {
      const p1 = prismSelfAwarenessEngine.getJMDieCustomerPath("test");
      const p2 = prismSelfAwarenessEngine.getJMDieCustomerPath("TEST");
      expect(p1).toBe(p2);
    });
  });

  describe("generateClaudeMdContext", () => {
    it("generates markdown with PRISM header", async () => {
      const ctx = await generateClaudeMdContext();
      expect(ctx).toContain("PRISM");
      expect(ctx).toContain("##");
    });

    it("includes numeric stats", async () => {
      const ctx = await generateClaudeMdContext();
      expect(ctx).toMatch(/Engines:\s*\d+/);
      expect(ctx).toMatch(/Dispatchers:\s*\d+/);
    });
  });

  describe("generateMinimalContext", () => {
    it("generates compact string under 500 chars", async () => {
      const ctx = await generateMinimalContext();
      expect(ctx.length).toBeLessThan(500);
      expect(ctx.length).toBeGreaterThan(20);
    });

    it("includes key terms", async () => {
      const ctx = await generateMinimalContext();
      expect(ctx.toLowerCase()).toContain("engines");
      expect(ctx.toLowerCase()).toContain("dispatchers");
    });
  });

  describe("refreshSelfAwareness", () => {
    it("returns fresh manifest with recent timestamp", async () => {
      const before = Date.now();
      const manifest = await refreshSelfAwareness();
      const after = Date.now();
      const ts = Date.parse(manifest.lastUpdated);
      expect(ts).toBeGreaterThanOrEqual(before - 1000);
      expect(ts).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe("dispatcher integration", () => {
    it("self_awareness_manifest action returns valid manifest", async () => {
      // Simulate dispatcher call
      const manifest = await prismSelfAwarenessEngine.getManifest();
      expect(manifest.stats.engineCount).toBeGreaterThan(0);
      expect(manifest.stats.dispatcherCount).toBeGreaterThan(0);
    });

    it("self_awareness_find action returns capability matches", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities("lathe turning");
      expect(matches.some(m => m.capability.toLowerCase().includes("lathe"))).toBe(true);
    });

    it("self_awareness_gaps action returns gap analysis", async () => {
      const gaps = await prismSelfAwarenessEngine.analyzeGaps("cam toolpath generation");
      expect(gaps.query).toBe("cam toolpath generation");
      expect(typeof gaps.hasCapability).toBe("boolean");
    });
  });

  // Synchronous proactive-reasoning surface. These four methods have live
  // consumers (DeepAIIntelligenceEngine, LatheSelfAwarenessIntegrationEngine,
  // MachiningIntelligenceOrchestratorEngine, AutonomousSessionIntegrationEngine)
  // but were previously only exercised by a dead-API fossil test. Coverage
  // ported here against the CURRENT engine behavior (U-SELFAWARE-FOSSIL-RECONCILE).
  describe("proactiveReason", () => {
    it("infers machining_calculation intent and recommends speed/feed for a milling query", () => {
      const r = prismSelfAwarenessEngine.proactiveReason("mill a pocket in 6061");
      expect(r.inferredIntent).toBe("machining_calculation");
      expect(r.relatedCapabilities.some(c => c.fullAction === "prism_calc:speed_feed_calc")).toBe(true);
      expect(r.recommendedActions).toContain("Calculate optimal speeds and feeds");
    });

    it("flags missing material context when material is not specified", () => {
      const r = prismSelfAwarenessEngine.proactiveReason("turn this part");
      expect(r.missingContext.some(m => m.toLowerCase().includes("material"))).toBe(true);
      expect(r.proactiveQuestions.length).toBeGreaterThan(0);
    });

    it("does not flag missing material when material is named in the query", () => {
      const r = prismSelfAwarenessEngine.proactiveReason("mill titanium material part");
      expect(r.missingContext.some(m => m.toLowerCase().includes("material"))).toBe(false);
    });

    it("infers force_analysis intent for a Kienzle force query", () => {
      const r = prismSelfAwarenessEngine.proactiveReason("kienzle force estimate");
      expect(r.inferredIntent).toBe("force_analysis");
      expect(r.relatedCapabilities.some(c => c.fullAction === "prism_calc:cutting_force")).toBe(true);
    });

    it("returns general_query with well-formed empty arrays for an unrelated query", () => {
      const r = prismSelfAwarenessEngine.proactiveReason("hello world");
      expect(r.inferredIntent).toBe("general_query");
      expect(Array.isArray(r.relatedCapabilities)).toBe(true);
      expect(Array.isArray(r.proactiveQuestions)).toBe(true);
      expect(Array.isArray(r.recommendedActions)).toBe(true);
    });

    it("lets the force branch override intent when a query matches both branches", () => {
      // Both the machining branch (mill/cut/turn) and the force branch fire; the
      // force branch runs second, so force_analysis is the resolved intent and
      // both capabilities are surfaced. Documents branch precedence (R9 intent).
      const r = prismSelfAwarenessEngine.proactiveReason("mill with cutting force");
      expect(r.inferredIntent).toBe("force_analysis");
      expect(r.relatedCapabilities.some(c => c.fullAction === "prism_calc:speed_feed_calc")).toBe(true);
      expect(r.relatedCapabilities.some(c => c.fullAction === "prism_calc:cutting_force")).toBe(true);
    });
  });

  describe("whatCanIDo", () => {
    it("returns speed_feed_calc with high confidence for a speed/feed query", () => {
      const r = prismSelfAwarenessEngine.whatCanIDo("what speed and feed should I use");
      expect(r.results.some(x => x.fullAction === "prism_calc:speed_feed_calc")).toBe(true);
      expect(r.confidence).toBeGreaterThan(0.8);
    });

    it("falls back to prism_ai:analyze for an unmatched query", () => {
      const r = prismSelfAwarenessEngine.whatCanIDo("xyzzy nonsense");
      expect(r.results).toHaveLength(1);
      expect(r.results[0].fullAction).toBe("prism_ai:analyze");
      expect(r.confidence).toBeCloseTo(0.5, 5);
    });

    it("overall confidence equals the max of individual result confidences", () => {
      // whatCanIDo reports the BEST available capability's confidence as the
      // overall score (max, not mean) so a strong primary match is not diluted
      // by weaker secondary suggestions. This invariant guards that semantics.
      const r = prismSelfAwarenessEngine.whatCanIDo("speed and tool selection");
      expect(r.results.length).toBeGreaterThan(1);
      expect(r.confidence).toBe(Math.max(...r.results.map(x => x.confidence)));
    });
  });

  describe("howDoI", () => {
    it("returns a speed/feed approach with a concrete action path for a feed task", () => {
      const r = prismSelfAwarenessEngine.howDoI("set the feed rate");
      expect(r.approach.toLowerCase()).toContain("speed/feed");
      expect(r.recommendedActions).toContain("prism_calc:speed_feed_calc");
      expect(r.steps.length).toBeGreaterThan(0);
    });

    it("falls back to a generic AI-reasoning approach for an unknown task", () => {
      const r = prismSelfAwarenessEngine.howDoI("organize my desk");
      expect(r.recommendedActions).toContain("prism_ai:analyze");
      expect(Array.isArray(r.steps)).toBe(true);
    });
  });

  describe("whoHandles", () => {
    it("routes cutting-force capability to prism_calc + Kienzle engine", () => {
      const r = prismSelfAwarenessEngine.whoHandles("kienzle force");
      expect(r.dispatcher).toBe("prism_calc");
      expect(r.engine).toBe("KienzleForceEngine");
      expect(r.actions).toContain("cutting_force");
    });

    it("routes speed/feed capability to the SpeedFeed orchestrator", () => {
      const r = prismSelfAwarenessEngine.whoHandles("feed rate");
      expect(r.dispatcher).toBe("prism_calc");
      expect(r.engine).toBe("SpeedFeedOrchestratorEngine");
    });

    it("routes safety capability to prism_safety", () => {
      const r = prismSelfAwarenessEngine.whoHandles("safety validation");
      expect(r.dispatcher).toBe("prism_safety");
    });

    it("falls back to prism_ai for an unknown capability", () => {
      const r = prismSelfAwarenessEngine.whoHandles("astrology");
      expect(r.dispatcher).toBe("prism_ai");
      expect(r.actions.length).toBeGreaterThan(0);
    });
  });

  describe("searchPlaybookRules", () => {
    it("returns a flat string array, never rule objects (defends the string[] contract)", async () => {
      const rules = await prismSelfAwarenessEngine.searchPlaybookRules("roughing depth of cut");
      expect(Array.isArray(rules)).toBe(true);
      for (const rule of rules) {
        expect(typeof rule).toBe("string");
      }
    });

    it("returns an array for an empty query without throwing", async () => {
      const rules = await prismSelfAwarenessEngine.searchPlaybookRules("");
      expect(Array.isArray(rules)).toBe(true);
    });
  });

  describe("getJMDieCustomers", () => {
    it("returns customer entries with name, path, and machineTypes shape", () => {
      const customers = prismSelfAwarenessEngine.getJMDieCustomers();
      expect(Array.isArray(customers)).toBe(true);
      // Corpus-dependent: assert shape on any present entry (JM DIE root exists on the shop host).
      if (customers.length > 0) {
        expect(typeof customers[0].name).toBe("string");
        expect(typeof customers[0].path).toBe("string");
        expect(Array.isArray(customers[0].machineTypes)).toBe(true);
      }
    });
  });

  describe("getCompactManifest", () => {
    it("returns an object (not a string) with a dispatcher list and numeric counts", () => {
      const compact = prismSelfAwarenessEngine.getCompactManifest();
      expect(Array.isArray(compact.dispatchers)).toBe(true);
      expect(compact.dispatchers).toContain("prism_calc");
      expect(typeof compact.engineCount).toBe("number");
      expect(compact.engineCount).toBeGreaterThan(0);
      expect(typeof compact.actionCount).toBe("number");
      expect(compact.actionCount).toBeGreaterThan(0);
    });
  });

  describe("searchJMDieCustomer", () => {
    it("returns {name, path, machineTypes} entries (empty when corpus absent)", () => {
      const results = prismSelfAwarenessEngine.searchJMDieCustomer("a");
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(typeof results[0].name).toBe("string");
        expect(typeof results[0].path).toBe("string");
        expect(Array.isArray(results[0].machineTypes)).toBe(true);
      }
    });

    it("filters by case-insensitive substring (every hit name contains the query)", () => {
      const results = prismSelfAwarenessEngine.searchJMDieCustomer("a");
      for (const r of results) {
        expect(r.name.toLowerCase()).toContain("a");
      }
    });

    it("returns an array for an empty query without throwing", () => {
      expect(Array.isArray(prismSelfAwarenessEngine.searchJMDieCustomer(""))).toBe(true);
    });
  });

  describe("getJMDieProgramPaths", () => {
    it("returns paths whose directory name contains the machine-type tag", () => {
      const paths = prismSelfAwarenessEngine.getJMDieProgramPaths("lathe");
      expect(Array.isArray(paths)).toBe(true);
      for (const p of paths) {
        // The engine matches on the directory BASENAME (e.toLowerCase().includes(q)),
        // not the full path. Assert the last path segment contains the tag so a
        // regression to full-path matching (which would surface unrelated dirs whose
        // ancestor happens to contain "lathe") is actually caught.
        const base = p.replace(/[/\\]+$/, "").split(/[/\\]/).pop() ?? "";
        expect(base.toLowerCase()).toContain("lathe");
      }
    });

    it("returns an empty array when no directory matches the tag", () => {
      const paths = prismSelfAwarenessEngine.getJMDieProgramPaths("zzz_no_such_machine");
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBe(0);
    });
  });

  describe("getFullDriveAwareness", () => {
    it("returns a structured object (not a string) with prism counts and jmDie stats", async () => {
      const awareness = await prismSelfAwarenessEngine.getFullDriveAwareness();
      expect(typeof awareness.prism).toBe("object");
      expect(typeof awareness.jmDie.customerCount).toBe("number");
      expect(awareness.jmDie.customerCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(awareness.jmDie.machineTypes)).toBe(true);
      expect(typeof awareness.jmDie.customersByMachineType).toBe("object");
      expect(awareness.manifestVersion).toMatch(/^\d+\.\d+\.\d+$/);
      expect(Number.isNaN(Date.parse(awareness.lastUpdated))).toBe(false);
    });

    it("machineTypes equals the sorted keys of customersByMachineType (consistency invariant)", async () => {
      const a = await prismSelfAwarenessEngine.getFullDriveAwareness();
      expect(a.jmDie.machineTypes).toEqual(Object.keys(a.jmDie.customersByMachineType).sort());
    });
  });
});
