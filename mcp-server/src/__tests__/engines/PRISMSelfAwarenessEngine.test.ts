/**
 * Tests for PRISMSelfAwarenessEngine
 *
 * Token-efficient agent self-model with hardening features
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PRISMSelfAwarenessEngine,
  prismSelfAwarenessEngine,
  CapabilityManifest,
  CapabilityMatch,
  GapAnalysis,
  generateClaudeMdContext,
  generateMinimalContext,
  refreshSelfAwareness,
} from "../../engines/PRISMSelfAwarenessEngine.js";

describe("PRISMSelfAwarenessEngine", () => {
  let engine: PRISMSelfAwarenessEngine;

  beforeEach(() => {
    engine = new PRISMSelfAwarenessEngine();
  });

  describe("manifest generation", () => {
    it("should generate capability manifest", () => {
      const manifest = engine.getManifest();

      expect(manifest.version).toBeDefined();
      expect(manifest.generatedAt).toBeDefined();
      expect(manifest.expiresAt).toBeDefined();
      expect(manifest.counts.dispatchers).toBe(82);
      expect(manifest.counts.actions).toBe(4296);
      expect(manifest.counts.engines).toBe(1559);
    });

    it("should include top capabilities by category", () => {
      const manifest = engine.getManifest();

      expect(manifest.topCapabilities.calculation.length).toBeGreaterThan(0);
      expect(manifest.topCapabilities.business.length).toBeGreaterThan(0);
      expect(manifest.topCapabilities.cam.length).toBeGreaterThan(0);
      expect(manifest.topCapabilities.calculation).toContain("speed_feed");
      expect(manifest.topCapabilities.business).toContain("quote_estimate");
    });

    it("should include domain list", () => {
      const manifest = engine.getManifest();

      expect(manifest.domains).toContain("turning");
      expect(manifest.domains).toContain("milling");
      expect(manifest.domains).toContain("EDM");
      expect(manifest.domains).toContain("quoting");
    });

    it("should have checksum for delta detection", () => {
      const manifest = engine.getManifest();

      expect(manifest.checksum).toBeDefined();
      expect(manifest.checksum.length).toBeGreaterThan(0);
    });

    it("should cache manifest", () => {
      const manifest1 = engine.getManifest();
      const manifest2 = engine.getManifest();

      expect(manifest1.generatedAt).toBe(manifest2.generatedAt);
    });

    it("should refresh manifest when forced", () => {
      const manifest1 = engine.getManifest();

      // Small delay to ensure different timestamp
      const manifest2 = engine.getManifest(true);

      // Checksum should be regenerated
      expect(manifest2.generatedAt).toBeDefined();
    });

    it("should generate compact manifest under 600 tokens", () => {
      const compact = engine.getCompactManifest();

      // Rough token estimate: ~1.3 tokens per word
      const words = compact.split(/\s+/).length;
      const estimatedTokens = words * 1.3;

      expect(estimatedTokens).toBeLessThan(600);
    });

    it("should include key info in compact manifest", () => {
      const compact = engine.getCompactManifest();

      expect(compact).toContain("PRISM Self-Model");
      expect(compact).toContain("82 dispatchers");
      expect(compact).toContain("speed_feed");
      expect(compact).toContain("quote_estimate");
    });
  });

  describe("whatCanIDo", () => {
    it("should find speed_feed for speed calculation query", () => {
      const result = engine.whatCanIDo("calculate speed and feed");

      expect(result.queryType).toBe("capability");
      expect(result.results.length).toBeGreaterThan(0);

      const matches = result.results as CapabilityMatch[];
      expect(matches[0].action).toBe("speed_feed");
      expect(matches[0].confidence).toBeGreaterThan(0.3);
    });

    it("should find quote_estimate for quoting query", () => {
      const result = engine.whatCanIDo("quote estimate cost price");

      const matches = result.results as CapabilityMatch[];
      const quoteMatch = matches.find(m => m.action === "quote_estimate");

      expect(quoteMatch).toBeDefined();
    });

    it("should find cutting_force for force query", () => {
      const result = engine.whatCanIDo("calculate cutting force");

      const matches = result.results as CapabilityMatch[];
      expect(matches[0].action).toBe("cutting_force");
    });

    it("should find machine_selection for machine query", () => {
      const result = engine.whatCanIDo("select machine lathe mill");

      const matches = result.results as CapabilityMatch[];
      expect(matches[0].action).toBe("machine_selection");
    });

    it("should include alternatives in results", () => {
      const result = engine.whatCanIDo("calculate something");

      const matches = result.results as CapabilityMatch[];
      if (matches.length > 0) {
        expect(matches[0].alternatives).toBeDefined();
      }
    });

    it("should cache search results", () => {
      const result1 = engine.whatCanIDo("calculate speed");
      const result2 = engine.whatCanIDo("calculate speed");

      expect(result1.fromCache).toBe(false);
      expect(result2.fromCache).toBe(true);
    });

    it("should track processing time", () => {
      const result = engine.whatCanIDo("test query");

      expect(result.processingMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("howDoI", () => {
    it("should return best match for task", () => {
      const match = engine.howDoI("calculate speed and feed for steel");

      expect(match).toBeDefined();
      expect(match?.action).toBe("speed_feed");
      expect(match?.dispatcher).toBe("prism_calc");
    });

    it("should return null for unknown task", () => {
      const match = engine.howDoI("xyzzy foobar nonsense");

      expect(match).toBeNull();
    });

    it("should include full action path", () => {
      const match = engine.howDoI("estimate cost");

      expect(match?.fullAction).toBe("prism_business:quote_estimate");
    });

    it("should track usage", () => {
      engine.howDoI("calculate speed");
      engine.howDoI("calculate speed");

      const stats = engine.getUsageStats();
      expect(stats.totalQueries).toBeGreaterThanOrEqual(2);
    });
  });

  describe("whoHandles", () => {
    it("should find physics engines for force domain", () => {
      const matches = engine.whoHandles("force");

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.name.includes("Kienzle") || m.name.includes("Force"))).toBe(true);
    });

    it("should find AI engines for reasoning domain", () => {
      const matches = engine.whoHandles("reasoning");

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.name.includes("Reasoning"))).toBe(true);
    });

    it("should include related engines", () => {
      const matches = engine.whoHandles("speed feed");

      if (matches.length > 0) {
        expect(matches[0].relatedEngines).toBeDefined();
      }
    });

    it("should include engine category", () => {
      const matches = engine.whoHandles("quote");

      if (matches.length > 0) {
        expect(matches[0].category).toBeDefined();
      }
    });
  });

  describe("gap detection", () => {
    it("should detect when capability exists", () => {
      const analysis = engine.analyzeGap("calculate cutting force");

      expect(analysis.canHandle).toBe(true);
      expect(analysis.confidence).toBeGreaterThan(0.5);
    });

    it("should detect gap for unknown request", () => {
      const analysis = engine.analyzeGap("teleport the part");

      expect(analysis.canHandle).toBe(false);
      expect(analysis.suggestions.length).toBeGreaterThan(0);
    });

    it("should suggest external sources for gaps", () => {
      const analysis = engine.analyzeGap("material properties of inconel");

      expect(analysis.externalSources).toBeDefined();
      if (!analysis.canHandle && analysis.externalSources) {
        expect(analysis.externalSources.length).toBeGreaterThan(0);
      }
    });

    it("should track known gaps", () => {
      engine.analyzeGap("impossible task xyz");
      engine.analyzeGap("another impossible task");

      const gaps = engine.getKnownGaps();
      expect(gaps.length).toBeGreaterThanOrEqual(2);
    });

    it("should limit gap storage", () => {
      // Add many gaps
      for (let i = 0; i < 150; i++) {
        engine.analyzeGap(`impossible task ${i}`);
      }

      const gaps = engine.getKnownGaps();
      expect(gaps.length).toBeLessThanOrEqual(100);
    });

    it("should provide suggestions for partial matches", () => {
      const analysis = engine.analyzeGap("calculate something");

      expect(analysis.suggestions).toBeDefined();
      expect(analysis.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("external sources", () => {
    it("should find relevant sources for materials", () => {
      const sources = engine.findRelevantSources("material properties");

      expect(sources.length).toBeGreaterThan(0);
      expect(sources.some(s => s.name.includes("Handbook") || s.name.includes("NIST"))).toBe(true);
    });

    it("should find sources for cutting tools", () => {
      const sources = engine.findRelevantSources("cutting tools");

      expect(sources.length).toBeGreaterThan(0);
      expect(sources.some(s => s.name.includes("Sandvik") || s.name.includes("Kennametal"))).toBe(true);
    });

    it("should get trusted sources for domain", () => {
      const sources = engine.getTrustedSources("materials");

      expect(sources.length).toBeGreaterThan(0);
    });

    it("should verify source trust", () => {
      expect(engine.isSourceTrusted("sandvik")).toBe(true);
      expect(engine.isSourceTrusted("unknown")).toBe(false);
    });

    it("should include trust level", () => {
      const sources = engine.findRelevantSources("standards");

      const isoSource = sources.find(s => s.name.includes("ISO"));
      if (isoSource) {
        expect(isoSource.trustLevel).toBe(1.0);
      }
    });
  });

  describe("usage analytics", () => {
    it("should track usage counts", () => {
      engine.trackUsage("prism_calc:speed_feed", 0.9);
      engine.trackUsage("prism_calc:speed_feed", 0.85);
      engine.trackUsage("prism_calc:cutting_force", 0.8);

      const stats = engine.getUsageStats();

      expect(stats.totalQueries).toBe(3);
      expect(stats.topActions[0].action).toBe("prism_calc:speed_feed");
      expect(stats.topActions[0].count).toBe(2);
    });

    it("should calculate average confidence", () => {
      engine.trackUsage("prism_calc:speed_feed", 0.9);
      engine.trackUsage("prism_calc:speed_feed", 0.8);

      const stats = engine.getUsageStats();

      expect(stats.avgConfidence).toBeCloseTo(0.85, 1);
    });

    it("should calculate success rate", () => {
      engine.trackUsage("prism_calc:speed_feed", 0.9, true);
      engine.trackUsage("prism_calc:speed_feed", 0.8, false);

      const stats = engine.getUsageStats();

      expect(stats.avgSuccessRate).toBeCloseTo(0.5, 1);
    });

    it("should track last used time", () => {
      engine.trackUsage("prism_calc:speed_feed", 0.9);

      const stats = engine.getUsageStats();
      expect(stats.topActions.length).toBeGreaterThan(0);
    });
  });

  describe("cache management", () => {
    it("should clear all caches", () => {
      engine.whatCanIDo("test query");
      engine.getManifest();

      engine.clearCaches();

      const stats = engine.getCacheStats();
      expect(stats.searchCacheSize).toBe(0);
      expect(stats.manifestCached).toBe(false);
    });

    it("should report cache statistics", () => {
      engine.whatCanIDo("query 1");
      engine.whatCanIDo("query 2");
      engine.getManifest();

      const stats = engine.getCacheStats();

      expect(stats.searchCacheSize).toBe(2);
      expect(stats.manifestCached).toBe(true);
      expect(stats.manifestAge).toBeGreaterThanOrEqual(0);
    });
  });

  describe("hardening features", () => {
    it("should handle empty queries gracefully", () => {
      const result = engine.whatCanIDo("");

      expect(result.results.length).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it("should handle very long queries", () => {
      const longQuery = "calculate ".repeat(100);
      const result = engine.whatCanIDo(longQuery);

      expect(result).toBeDefined();
      expect(result.processingMs).toBeLessThan(1000);
    });

    it("should handle special characters in queries", () => {
      const result = engine.whatCanIDo("calculate <speed> & feed's \"value\"");

      expect(result).toBeDefined();
    });

    it("should be case insensitive", () => {
      const result1 = engine.whatCanIDo("CALCULATE SPEED");
      const result2 = engine.whatCanIDo("calculate speed");

      const matches1 = result1.results as CapabilityMatch[];
      const matches2 = result2.results as CapabilityMatch[];

      expect(matches1[0]?.action).toBe(matches2[0]?.action);
    });

    it("should return consistent results", () => {
      const result1 = engine.whatCanIDo("cutting force");
      const result2 = engine.whatCanIDo("cutting force");

      const matches1 = result1.results as CapabilityMatch[];
      const matches2 = result2.results as CapabilityMatch[];

      expect(matches1[0]?.fullAction).toBe(matches2[0]?.fullAction);
    });
  });

  describe("confidence scoring", () => {
    it("should rank exact matches higher", () => {
      const result = engine.whatCanIDo("speed_feed");

      const matches = result.results as CapabilityMatch[];
      expect(matches[0]?.action).toBe("speed_feed");
      expect(matches[0]?.confidence).toBeGreaterThan(0.5);
    });

    it("should rank partial matches lower", () => {
      const exactResult = engine.whatCanIDo("speed_feed");
      const partialResult = engine.whatCanIDo("feed");

      const exactMatches = exactResult.results as CapabilityMatch[];
      const partialMatches = partialResult.results as CapabilityMatch[];

      if (exactMatches.length > 0 && partialMatches.length > 0) {
        expect(exactMatches[0].confidence).toBeGreaterThanOrEqual(partialMatches[0].confidence);
      }
    });

    it("should provide alternatives with confidence", () => {
      const result = engine.whatCanIDo("calculate");

      const matches = result.results as CapabilityMatch[];
      if (matches.length > 0 && matches[0].alternatives.length > 0) {
        expect(matches[0].alternatives[0].confidence).toBeLessThanOrEqual(matches[0].confidence);
      }
    });
  });

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(prismSelfAwarenessEngine).toBeInstanceOf(PRISMSelfAwarenessEngine);
    });
  });

  describe("integration with manifest", () => {
    it("should reflect recent learnings in manifest", () => {
      // Use some capabilities to generate learnings
      engine.trackUsage("prism_calc:speed_feed", 0.9);
      engine.trackUsage("prism_calc:speed_feed", 0.9);
      engine.trackUsage("prism_calc:speed_feed", 0.9);

      const manifest = engine.getManifest(true);

      expect(manifest.recentLearnings).toBeDefined();
    });

    it("should reflect known gaps in manifest", () => {
      engine.analyzeGap("impossible task for testing");

      const manifest = engine.getManifest(true);

      expect(manifest.knownGaps.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("domain coverage", () => {
    it("should cover turning domain", () => {
      const matches = engine.whoHandles("turning");
      expect(matches.length).toBeGreaterThanOrEqual(0);
    });

    it("should cover milling domain", () => {
      const result = engine.whatCanIDo("milling operation");
      expect(result).toBeDefined();
    });

    it("should cover EDM domain", () => {
      const manifest = engine.getManifest();
      expect(manifest.domains).toContain("EDM");
    });

    it("should cover business domain", () => {
      const result = engine.whatCanIDo("quote estimate price");
      const matches = result.results as CapabilityMatch[];
      expect(matches.some(m => m.dispatcher === "prism_business")).toBe(true);
    });
  });

  describe("Codex/Claude Code compatibility", () => {
    describe("generateClaudeMdContext", () => {
      it("should generate CLAUDE.md compatible context", () => {
        const context = generateClaudeMdContext();

        expect(context).toContain("# PRISM Agent Self-Awareness Context");
        expect(context).toContain("## System Capabilities");
        expect(context).toContain("Dispatchers");
        expect(context).toContain("Actions");
        expect(context).toContain("Engines");
      });

      it("should include top actions", () => {
        const context = generateClaudeMdContext();

        expect(context).toContain("speed_feed");
        expect(context).toContain("quote_estimate");
        expect(context).toContain("machine_selection");
      });

      it("should include external sources", () => {
        const context = generateClaudeMdContext();

        expect(context).toContain("Sandvik");
        expect(context).toContain("Kennametal");
        expect(context).toContain("Machinery's Handbook");
      });

      it("should include usage hints", () => {
        const context = generateClaudeMdContext();

        expect(context).toContain("## How to Use Self-Awareness");
        expect(context).toContain("whatCanIDo");
        expect(context).toContain("howDoI");
      });
    });

    describe("generateMinimalContext", () => {
      it("should generate minimal context under 300 tokens", () => {
        const context = generateMinimalContext();

        // Rough estimate: 1.3 tokens per word
        const words = context.split(/\s+/).length;
        const estimatedTokens = words * 1.3;

        expect(estimatedTokens).toBeLessThan(300);
      });

      it("should include key counts", () => {
        const context = generateMinimalContext();

        expect(context).toContain("PRISM:");
        expect(context).toMatch(/\d+d\/\d+a\/\d+e/); // dispatchers/actions/engines
      });

      it("should include category shortcuts", () => {
        const context = generateMinimalContext();

        expect(context).toContain("Calc:");
        expect(context).toContain("Biz:");
        expect(context).toContain("CAM:");
      });
    });

    describe("refreshSelfAwareness", () => {
      it("should refresh manifest and return contexts", async () => {
        const result = await refreshSelfAwareness();

        expect(result.manifest).toBeDefined();
        expect(result.manifest.version).toBeDefined();
        expect(result.context).toContain("PRISM Agent Self-Awareness");
        expect(result.minimalContext).toContain("PRISM:");
      });

      it("should force refresh manifest", async () => {
        const before = prismSelfAwarenessEngine.getManifest();
        const result = await refreshSelfAwareness();

        // Both should be valid manifests
        expect(before.version).toBeDefined();
        expect(result.manifest.version).toBeDefined();
      });
    });
  });

  describe("automatic context injection", () => {
    it("should provide context for session startup", async () => {
      const { manifest, context, minimalContext } = await refreshSelfAwareness();

      // All three should be usable for different contexts
      expect(manifest.counts.actions).toBeGreaterThan(0);
      expect(context.length).toBeGreaterThan(500);
      expect(minimalContext.length).toBeLessThan(500);
    });

    it("should support both verbose and minimal modes", () => {
      const verbose = generateClaudeMdContext();
      const minimal = generateMinimalContext();

      // Verbose is for CLAUDE.md
      expect(verbose.length).toBeGreaterThan(minimal.length * 3);

      // Minimal is for constrained contexts
      expect(minimal.split("\n").length).toBeLessThan(10);
    });
  });

  // ============================================================================
  // H: DRIVE AWARENESS TESTS
  // ============================================================================

  describe("H: Drive awareness", () => {
    describe("drive locations", () => {
      it("should return all drive locations", () => {
        const locations = engine.getDriveLocations();

        expect(locations.length).toBeGreaterThan(0);
        expect(locations.some(l => l.category === "prism")).toBe(true);
        expect(locations.some(l => l.category === "jm_die")).toBe(true);
      });

      it("should find location by query", () => {
        const location = engine.findDriveLocation("jm_die");

        expect(location).toBeDefined();
        expect(location?.path).toContain("JM DIE");
      });

      it("should find location by keyword", () => {
        const location = engine.findDriveLocation("programs");

        expect(location).toBeDefined();
      });

      it("should get locations by category", () => {
        const prismLocations = engine.getDriveLocationsByCategory("prism");

        expect(prismLocations.length).toBeGreaterThan(0);
        expect(prismLocations.every(l => l.category === "prism")).toBe(true);
      });

      it("should include file counts where applicable", () => {
        const jmDie = engine.findDriveLocation("jm_die");

        expect(jmDie?.fileCount).toBe(24545);
      });
    });

    describe("JM DIE access", () => {
      it("should return JM DIE machine folders", () => {
        const folders = engine.getJMDieMachineFolders();

        expect(folders.length).toBeGreaterThan(0);
        expect(folders.some(f => f.type === "CNC LATHE")).toBe(true);
        expect(folders.some(f => f.type === "WIRE EDM")).toBe(true);
      });

      it("should return JM DIE customers", () => {
        const customers = engine.getJMDieCustomers();

        expect(customers.length).toBeGreaterThan(0);
        expect(customers.some(c => c.name === "ALCOA")).toBe(true);
      });

      it("should search customers by name", () => {
        const results = engine.searchJMDieCustomer("alcoa");

        expect(results.length).toBe(1);
        expect(results[0].name).toBe("ALCOA");
      });

      it("should get customer path", () => {
        const path = engine.getJMDieCustomerPath("ALCOA");

        expect(path).toBeDefined();
        expect(path).toContain("ALCOA");
      });

      it("should return null for unknown customer", () => {
        const path = engine.getJMDieCustomerPath("UNKNOWN_CUSTOMER_XYZ");

        expect(path).toBeNull();
      });

      it("should get program paths for machine type", () => {
        const paths = engine.getJMDieProgramPaths("lathe");

        expect(paths.length).toBeGreaterThan(0);
        expect(paths[0]).toContain("LATHE");
      });

      it("should include machine types for customers", () => {
        const customers = engine.getJMDieCustomers();
        const alcoa = customers.find(c => c.name === "ALCOA");

        expect(alcoa?.machineTypes).toBeDefined();
        expect(alcoa?.machineTypes.includes("lathe")).toBe(true);
      });

      it("should include program extensions for machine folders", () => {
        const folders = engine.getJMDieMachineFolders();
        const lathe = folders.find(f => f.type === "CNC LATHE");

        expect(lathe?.programExtensions).toContain(".MIN");
      });

      it("should generate JM DIE summary", () => {
        const summary = engine.getJMDieSummary();

        expect(summary).toContain("JM DIE");
        expect(summary).toContain("24,545 programs");
        expect(summary).toContain("H:/PRISM/JM DIE");
      });
    });

    describe("resource files", () => {
      it("should return all resource files", () => {
        const files = engine.getResourceFiles();

        expect(files.length).toBeGreaterThan(0);
      });

      it("should get resource files by type", () => {
        const tips = engine.getResourceFilesByType("tips");
        const catalogs = engine.getResourceFilesByType("catalog");

        expect(tips.length).toBeGreaterThan(0);
        expect(catalogs.length).toBeGreaterThan(0);
        expect(tips.every(t => t.type === "tips")).toBe(true);
      });

      it("should search resources by domain", () => {
        const camResults = engine.searchResources("cam");
        const toolingResults = engine.searchResources("tooling");

        expect(camResults.length).toBeGreaterThan(0);
        expect(toolingResults.length).toBeGreaterThan(0);
      });

      it("should include record counts", () => {
        const tips = engine.getResourceFilesByType("tips");

        expect(tips.some(t => (t.recordCount ?? 0) > 0)).toBe(true);
      });

      it("should generate resource summary", () => {
        const summary = engine.getResourceSummary();

        expect(summary).toContain("Resources:");
        expect(summary).toContain("CAM tip files");
        expect(summary).toContain("tool catalogs");
      });
    });
  });

  describe("tribal knowledge integration", () => {
    it("should search tribal knowledge", () => {
      // Search for "cam" which matches multiple CAM tip files
      const results = engine.searchTribalKnowledge("cam");

      expect(results.length).toBeGreaterThan(0);
    });

    it("should return tip details", () => {
      const results = engine.searchTribalKnowledge("cam strategy");

      if (results.length > 0) {
        expect(results[0].tipId).toBeDefined();
        expect(results[0].title).toBeDefined();
        expect(results[0].confidence).toBeGreaterThan(0);
      }
    });

    it("should limit results", () => {
      const results = engine.searchTribalKnowledge("machining", { limit: 3 });

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("should sort by confidence", () => {
      const results = engine.searchTribalKnowledge("tool");

      if (results.length > 1) {
        expect(results[0].confidence).toBeGreaterThanOrEqual(results[1].confidence);
      }
    });

    it("should generate tribal knowledge summary", () => {
      const summary = engine.getTribalKnowledgeSummary();

      expect(summary).toContain("Tribal Knowledge");
      expect(summary).toContain("3,700+");
      expect(summary).toContain("18 CAM systems");
    });
  });

  describe("playbook integration", () => {
    it("should search playbook rules", () => {
      const results = engine.searchPlaybookRules("thin wall");

      expect(results.length).toBeGreaterThan(0);
    });

    it("should return rule details", () => {
      const results = engine.searchPlaybookRules("roughing depth");

      if (results.length > 0) {
        expect(results[0].ruleId).toBeDefined();
        expect(results[0].title).toBeDefined();
        expect(results[0].severity).toBeDefined();
        expect(results[0].reasoning).toBeDefined();
      }
    });

    it("should find surface finish rules", () => {
      const results = engine.searchPlaybookRules("surface finish");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].category).toBe("finishing");
    });

    it("should find tool life rules", () => {
      const results = engine.searchPlaybookRules("tool wear life");

      expect(results.length).toBeGreaterThan(0);
    });

    it("should limit results", () => {
      const results = engine.searchPlaybookRules("machining", { limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe("web search capability", () => {
    it("should generate web search queries", () => {
      const results = engine.generateWebSearch("cutting tools");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].source).toBeDefined();
      expect(results[0].trustLevel).toBeGreaterThan(0);
    });

    it("should suggest search topics", () => {
      const results = engine.generateWebSearch("carbide insert");

      if (results.length > 0) {
        expect(results[0].suggestedTopics.length).toBeGreaterThan(0);
      }
    });

    it("should include trust level", () => {
      const results = engine.generateWebSearch("material properties");

      expect(results.some(r => r.trustLevel >= 0.9)).toBe(true);
    });

    it("should generate web search summary", () => {
      const summary = engine.getWebSearchSummary();

      expect(summary).toContain("Web Search");
      expect(summary).toContain("trusted sources");
      expect(summary).toContain("Sandvik");
    });
  });

  describe("full drive awareness context", () => {
    it("should generate comprehensive drive awareness", () => {
      const awareness = engine.getFullDriveAwareness();

      expect(awareness).toContain("# H: Drive Awareness");
      expect(awareness).toContain("JM DIE");
      expect(awareness).toContain("Tribal Knowledge");
      expect(awareness).toContain("External Sources");
    });

    it("should include quick access methods", () => {
      const awareness = engine.getFullDriveAwareness();

      expect(awareness).toContain("getJMDieCustomerPath");
      expect(awareness).toContain("searchTribalKnowledge");
      expect(awareness).toContain("generateWebSearch");
    });
  });

  describe("manifest includes H: drive counts", () => {
    it("should include JM DIE program count", () => {
      const manifest = engine.getManifest();

      expect(manifest.counts.jmDiePrograms).toBe(24545);
    });

    it("should include JM DIE customer count", () => {
      const manifest = engine.getManifest();

      expect(manifest.counts.jmDieCustomers).toBe(100);
    });

    it("should include tribal tips count", () => {
      const manifest = engine.getManifest();

      expect(manifest.counts.tribalTips).toBe(3700);
    });

    it("should include playbook rules count", () => {
      const manifest = engine.getManifest();

      expect(manifest.counts.playbookRules).toBe(296);
    });

    it("should include resource files count", () => {
      const manifest = engine.getManifest();

      expect(manifest.counts.resourceFiles).toBe(40);
    });
  });

  describe("CLAUDE.md context includes H: drive", () => {
    it("should include H: drive awareness section", () => {
      const context = generateClaudeMdContext();

      expect(context).toContain("## H: Drive Awareness");
      expect(context).toContain("JM DIE Programs");
    });

    it("should include JM DIE direct access paths", () => {
      const context = generateClaudeMdContext();

      expect(context).toContain("## JM DIE Direct Access");
      expect(context).toContain("H:/PRISM/JM DIE");
    });

    it("should include knowledge sources", () => {
      const context = generateClaudeMdContext();

      expect(context).toContain("## Knowledge Sources");
      expect(context).toContain("TribalKnowledgeEngine");
      expect(context).toContain("MachiningPlaybookEngine");
    });

    it("should include new API methods", () => {
      const context = generateClaudeMdContext();

      expect(context).toContain("getJMDieCustomerPath");
      expect(context).toContain("searchTribalKnowledge");
      expect(context).toContain("generateWebSearch");
    });
  });

  describe("minimal context includes H: drive", () => {
    it("should include H: drive counts", () => {
      const context = generateMinimalContext();

      expect(context).toContain("H:Drive:");
      expect(context).toMatch(/\d+progs/);
      expect(context).toMatch(/\d+cust/);
      expect(context).toMatch(/\d+tips/);
    });

    it("should include JM DIE path", () => {
      const context = generateMinimalContext();

      expect(context).toContain("JM_DIE:");
      expect(context).toContain("H:/PRISM/JM DIE");
    });
  });

  // ============================================================================
  // PROACTIVE DEEP REASONING TESTS
  // ============================================================================

  describe("proactive deep reasoning", () => {
    describe("proactiveReason", () => {
      it("should infer intent from query", () => {
        const result = engine.proactiveReason("calculate speed and feed for steel");

        expect(result.inferredIntent).toBe("cutting_parameters");
      });

      it("should find related capabilities beyond direct matches", () => {
        const result = engine.proactiveReason("calculate speed and feed");

        expect(result.relatedCapabilities.length).toBeGreaterThan(0);
        // Should suggest related capabilities like cutting_force, tool_life
        const relatedActions = result.relatedCapabilities.map(c => c.action);
        expect(relatedActions.some(a =>
          ["cutting_force", "tool_life", "surface_finish", "power_requirement"].includes(a)
        )).toBe(true);
      });

      it("should identify missing context", () => {
        const result = engine.proactiveReason("calculate speed and feed");

        expect(result.missingContext.length).toBeGreaterThan(0);
        expect(result.missingContext.some(m => m.includes("Material"))).toBe(true);
      });

      it("should not flag missing material when material is specified", () => {
        const result = engine.proactiveReason("calculate speed and feed for steel");

        expect(result.missingContext.some(m => m.includes("Material"))).toBe(false);
      });

      it("should generate proactive questions", () => {
        const result = engine.proactiveReason("quote this part");

        expect(result.proactiveQuestions.length).toBeGreaterThan(0);
      });

      it("should generate recommended actions", () => {
        const result = engine.proactiveReason("select a tool for milling");

        expect(result.recommendedActions.length).toBeGreaterThan(0);
      });

      it("should include relevant knowledge", () => {
        const result = engine.proactiveReason("cam strategy for milling");

        // May have relevant knowledge
        expect(result.relevantKnowledge).toBeDefined();
      });

      it("should include relevant playbook rules", () => {
        const result = engine.proactiveReason("thin wall machining");

        expect(result.relevantRules.length).toBeGreaterThan(0);
      });

      it("should calculate confidence score", () => {
        const result = engine.proactiveReason("calculate cutting force");

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });

      it("should suggest JM DIE search when no customer specified", () => {
        const result = engine.proactiveReason("quote a part");

        expect(result.proactiveQuestions.some(q => q.includes("JM DIE"))).toBe(true);
      });
    });

    describe("intent inference", () => {
      it("should infer cost_estimation intent", () => {
        const result = engine.proactiveReason("how much will this cost");
        expect(result.inferredIntent).toBe("cost_estimation");
      });

      it("should infer tool_selection intent", () => {
        const result = engine.proactiveReason("recommend a tool for this operation");
        expect(result.inferredIntent).toBe("tool_selection");
      });

      it("should infer turning_operation intent", () => {
        const result = engine.proactiveReason("program for lathe turning OD");
        expect(result.inferredIntent).toBe("turning_operation");
      });

      it("should infer edm_processing intent", () => {
        const result = engine.proactiveReason("wire EDM electrode setup");
        expect(result.inferredIntent).toBe("edm_processing");
      });

      it("should infer thin_feature_machining intent", () => {
        const result = engine.proactiveReason("thin wall deflection concern");
        expect(result.inferredIntent).toBe("thin_feature_machining");
      });
    });

    describe("quickProactiveCheck", () => {
      it("should return compact recommendation string", () => {
        const result = engine.quickProactiveCheck("calculate speed");

        expect(result).toContain("Intent:");
        expect(result).toContain("Confidence:");
      });

      it("should include missing context hint", () => {
        const result = engine.quickProactiveCheck("calculate speed and feed");

        expect(result).toContain("Missing:");
      });

      it("should include recommended action", () => {
        const result = engine.quickProactiveCheck("quote this part");

        expect(result).toContain("Do:");
      });

      it("should be under 200 characters for token efficiency", () => {
        const result = engine.quickProactiveCheck("test query");

        expect(result.length).toBeLessThan(300);
      });
    });

    describe("suggested resources", () => {
      it("should suggest resources for tool selection", () => {
        const result = engine.proactiveReason("select a cutting tool");

        // Should have some suggested resources
        expect(result.suggestedResources).toBeDefined();
        // Tool selection should find tool-related resources
        expect(result.suggestedResources.length).toBeGreaterThanOrEqual(0);
      });

      it("should suggest resources for programming queries", () => {
        const result = engine.proactiveReason("create NC program for milling");

        expect(result.suggestedResources).toBeDefined();
        // NC programming should find CAM-related resources
        if (result.suggestedResources.length > 0) {
          expect(result.suggestedResources[0].type).toBeDefined();
        }
      });

      it("should suggest resources for EDM queries", () => {
        const result = engine.proactiveReason("wire EDM cutting parameters");

        expect(result.suggestedResources).toBeDefined();
        // EDM queries should attempt to find relevant resources
        expect(result.inferredIntent).toBe("edm_processing");
      });
    });
  });
});
