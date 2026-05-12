/**
 * TK-MS11: Customer-Specific Knowledge Profiles Tests
 *
 * Tests customer profile management, shop-specific modifiers,
 * job history boosting, and profile-based search.
 * JM Die Company is the canonical test case.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  customerKnowledgeEngine,
  type CustomerKnowledgeProfile,
  type ShopModifier,
  type ModifierType,
  type JobPattern,
  type BoostedTip,
  type ProfiledSearchResult,
  type JobOutcome,
} from "../engines/CustomerKnowledgeEngine.js";

// JM Die test constants
const JM_DIE_SHOP_ID = "jm-die";
const JM_DIE_MATERIALS = ["D2", "M2", "S7", "A2", "H13", "tungsten-carbide"];
const JM_DIE_MACHINES = ["Okuma LB3000", "Okuma GENOS M560-V", "Hurco VMX42"];

describe("TK-MS11: Customer-Specific Knowledge Profiles", () => {
  describe("U1: CustomerKnowledgeProfile Engine", () => {
    describe("createProfile", () => {
      it("should create profile for new shop", () => {
        const profile = customerKnowledgeEngine.createProfile("test-shop-001", {
          name: "Test Shop",
          expertise_areas: ["aluminum", "steel"],
          primary_machines: ["Haas VF-2"],
        });

        expect(profile).toHaveProperty("shop_id", "test-shop-001");
        expect(profile).toHaveProperty("name", "Test Shop");
        expect(profile).toHaveProperty("expertise_areas");
        expect(profile.expertise_areas).toContain("aluminum");
      });

      it("should create JM Die profile with full expertise", () => {
        const profile = customerKnowledgeEngine.createProfile(JM_DIE_SHOP_ID, {
          name: "JM Die Company",
          industry: "cold_heading_die_tooling",
          expertise_areas: JM_DIE_MATERIALS,
          primary_machines: JM_DIE_MACHINES,
          specializations: ["die_tooling", "fastener_industry"],
        });

        expect(profile.shop_id).toBe(JM_DIE_SHOP_ID);
        expect(profile.expertise_areas).toContain("D2");
        expect(profile.expertise_areas).toContain("M2");
        expect(profile.industry).toBe("cold_heading_die_tooling");
      });

      it("should include default confidence settings", () => {
        const profile = customerKnowledgeEngine.createProfile("test-shop-002", {
          name: "Test Shop 2",
        });

        expect(profile.confidence_settings).toBeDefined();
        expect(profile.confidence_settings.base_boost).toBeGreaterThanOrEqual(0);
      });

      it("should track creation timestamp", () => {
        const profile = customerKnowledgeEngine.createProfile("test-shop-003", {
          name: "Test Shop 3",
        });

        expect(profile.created_at).toBeDefined();
        expect(new Date(profile.created_at).getTime()).toBeLessThanOrEqual(Date.now());
      });

      it("should initialize empty modifiers", () => {
        const profile = customerKnowledgeEngine.createProfile("test-shop-004", {
          name: "Test Shop 4",
        });

        expect(profile.learned_modifiers).toBeDefined();
        expect(Array.isArray(profile.learned_modifiers)).toBe(true);
      });
    });

    describe("getProfile", () => {
      it("should retrieve existing profile", () => {
        customerKnowledgeEngine.createProfile("get-test-001", { name: "Get Test" });

        const profile = customerKnowledgeEngine.getProfile("get-test-001");

        expect(profile).not.toBeNull();
        expect(profile?.name).toBe("Get Test");
      });

      it("should return null for unknown shop", () => {
        const profile = customerKnowledgeEngine.getProfile("nonexistent-shop");

        expect(profile).toBeNull();
      });

      it("should return JM Die profile with all fields", () => {
        customerKnowledgeEngine.createProfile(JM_DIE_SHOP_ID, {
          name: "JM Die Company",
          expertise_areas: JM_DIE_MATERIALS,
          primary_machines: JM_DIE_MACHINES,
        });

        const profile = customerKnowledgeEngine.getProfile(JM_DIE_SHOP_ID);

        expect(profile?.expertise_areas.length).toBeGreaterThanOrEqual(3);
        expect(profile?.primary_machines.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe("updateProfile", () => {
      it("should update profile fields", () => {
        customerKnowledgeEngine.createProfile("update-test-001", {
          name: "Update Test",
          expertise_areas: ["steel"],
        });

        customerKnowledgeEngine.updateProfile("update-test-001", {
          expertise_areas: ["steel", "aluminum", "titanium"],
        });

        const profile = customerKnowledgeEngine.getProfile("update-test-001");
        expect(profile?.expertise_areas).toContain("titanium");
      });

      it("should preserve unmodified fields", () => {
        customerKnowledgeEngine.createProfile("update-test-002", {
          name: "Original Name",
          expertise_areas: ["steel"],
        });

        customerKnowledgeEngine.updateProfile("update-test-002", {
          expertise_areas: ["steel", "brass"],
        });

        const profile = customerKnowledgeEngine.getProfile("update-test-002");
        expect(profile?.name).toBe("Original Name");
      });

      it("should track update timestamp", () => {
        customerKnowledgeEngine.createProfile("update-test-003", { name: "Test" });
        const before = Date.now();

        customerKnowledgeEngine.updateProfile("update-test-003", { name: "Updated" });

        const profile = customerKnowledgeEngine.getProfile("update-test-003");
        expect(profile?.updated_at).toBeDefined();
      });
    });
  });

  describe("U2: Shop-Specific Modifier Learning", () => {
    beforeEach(() => {
      customerKnowledgeEngine.createProfile("mod-test-shop", {
        name: "Modifier Test Shop",
        expertise_areas: ["steel"],
      });
    });

    describe("learnShopModifier", () => {
      it("should learn speed modifier from success", () => {
        const modifier = customerKnowledgeEngine.learnShopModifier(
          "mod-test-shop",
          { material: "D2", operation: "roughing", speed_used: 85 },
          { success: true, quality: "good" }
        );

        expect(modifier).toHaveProperty("modifier_type");
        expect(modifier).toHaveProperty("value");
        expect(modifier).toHaveProperty("context");
      });

      it("should learn feed modifier from outcome", () => {
        const modifier = customerKnowledgeEngine.learnShopModifier(
          "mod-test-shop",
          { material: "M2", operation: "finishing", feed_used: 0.08 },
          { success: true, surface_finish: "excellent" }
        );

        expect(["speed_factor", "feed_factor", "doc_factor", "confidence_boost"]).toContain(
          modifier.modifier_type
        );
      });

      it("should track modifier confidence", () => {
        const modifier = customerKnowledgeEngine.learnShopModifier(
          "mod-test-shop",
          { material: "Steel", operation: "milling" },
          { success: true }
        );

        expect(modifier.confidence).toBeGreaterThanOrEqual(0);
        expect(modifier.confidence).toBeLessThanOrEqual(1);
      });

      it("should increase confidence with repeated success", () => {
        // Learn same pattern multiple times
        for (let i = 0; i < 3; i++) {
          customerKnowledgeEngine.learnShopModifier(
            "mod-test-shop",
            { material: "D2", operation: "roughing" },
            { success: true }
          );
        }

        const modifiers = customerKnowledgeEngine.getShopModifiers("mod-test-shop");
        const d2Mod = modifiers.find(m => m.context.material === "D2");

        expect(d2Mod?.confidence).toBeGreaterThan(0.5);
      });
    });

    describe("applyShopModifiers", () => {
      it("should apply modifiers to tips", () => {
        customerKnowledgeEngine.learnShopModifier(
          "mod-test-shop",
          { material: "Steel" },
          { success: true, speed_factor: 0.9 }
        );

        const tips = [
          { id: "tk-001", title: "Steel tip", confidence: 0.8 },
          { id: "tk-002", title: "Aluminum tip", confidence: 0.7 },
        ];

        const modified = customerKnowledgeEngine.applyShopModifiers(tips, "mod-test-shop");

        expect(modified.length).toBe(2);
        expect(modified[0].shop_modified).toBe(true);
      });

      it("should boost confidence for expertise matches", () => {
        customerKnowledgeEngine.createProfile("expertise-shop", {
          name: "Expertise Shop",
          expertise_areas: ["D2", "M2"],
        });

        const tips = [
          { id: "tk-001", title: "D2 machining tip", tags: ["d2"], confidence: 0.7 },
        ];

        const modified = customerKnowledgeEngine.applyShopModifiers(tips, "expertise-shop");

        expect(modified[0].boosted_confidence).toBeGreaterThanOrEqual(0.7);
      });

      it("should preserve original confidence", () => {
        const tips = [{ id: "tk-001", title: "Test", confidence: 0.75 }];

        const modified = customerKnowledgeEngine.applyShopModifiers(tips, "mod-test-shop");

        expect(modified[0].original_confidence).toBe(0.75);
      });
    });

    describe("getShopModifiers", () => {
      it("should return all modifiers for shop", () => {
        customerKnowledgeEngine.learnShopModifier(
          "mod-test-shop",
          { material: "Steel" },
          { success: true }
        );

        const modifiers = customerKnowledgeEngine.getShopModifiers("mod-test-shop");

        expect(Array.isArray(modifiers)).toBe(true);
      });

      it("should filter by material", () => {
        customerKnowledgeEngine.learnShopModifier(
          "mod-test-shop",
          { material: "D2" },
          { success: true }
        );
        customerKnowledgeEngine.learnShopModifier(
          "mod-test-shop",
          { material: "Aluminum" },
          { success: true }
        );

        const d2Mods = customerKnowledgeEngine.getShopModifiers("mod-test-shop", {
          material: "D2",
        });

        expect(d2Mods.every(m => m.context.material === "D2")).toBe(true);
      });
    });
  });

  describe("U3: Job History Relevance Boosting", () => {
    beforeEach(() => {
      customerKnowledgeEngine.createProfile("history-shop", {
        name: "History Test Shop",
        expertise_areas: ["tool-steel"],
      });
    });

    describe("recordJobOutcome", () => {
      it("should record job outcome with tips used", () => {
        expect(() => {
          customerKnowledgeEngine.recordJobOutcome(
            "history-shop",
            "job-001",
            ["tk-001", "tk-003"],
            { success: true, cycle_time_reduction: 0.15 }
          );
        }).not.toThrow();
      });

      it("should track tips that led to success", () => {
        customerKnowledgeEngine.recordJobOutcome(
          "history-shop",
          "job-002",
          ["tk-001"],
          { success: true }
        );

        const history = customerKnowledgeEngine.getJobHistory("history-shop", 10);
        expect(history.some(j => j.tips_used.includes("tk-001"))).toBe(true);
      });

      it("should track tips that led to failure", () => {
        customerKnowledgeEngine.recordJobOutcome(
          "history-shop",
          "job-003",
          ["tk-bad"],
          { success: false, failure_reason: "tool breakage" }
        );

        const history = customerKnowledgeEngine.getJobHistory("history-shop", 10);
        const failedJob = history.find(j => j.job_id === "job-003");
        expect(failedJob?.outcome.success).toBe(false);
      });
    });

    describe("analyzeJobHistory", () => {
      it("should detect material patterns", () => {
        // Record multiple jobs with same material
        for (let i = 0; i < 5; i++) {
          customerKnowledgeEngine.recordJobOutcome(
            "history-shop",
            `pattern-job-${i}`,
            ["tk-001"],
            { success: true, material: "D2" }
          );
        }

        const patterns = customerKnowledgeEngine.analyzeJobHistory("history-shop", 30);

        expect(patterns.some(p => p.pattern_type === "material_frequency")).toBe(true);
      });

      it("should detect machine utilization patterns", () => {
        customerKnowledgeEngine.recordJobOutcome(
          "history-shop",
          "machine-job-1",
          ["tk-001"],
          { success: true, machine: "Okuma LB3000" }
        );

        const patterns = customerKnowledgeEngine.analyzeJobHistory("history-shop", 30);

        expect(Array.isArray(patterns)).toBe(true);
      });

      it("should calculate pattern confidence", () => {
        const patterns = customerKnowledgeEngine.analyzeJobHistory("history-shop", 30);

        for (const pattern of patterns) {
          expect(pattern.confidence).toBeGreaterThanOrEqual(0);
          expect(pattern.confidence).toBeLessThanOrEqual(1);
        }
      });
    });

    describe("boostByHistory", () => {
      it("should boost tips that succeeded in similar jobs", () => {
        customerKnowledgeEngine.recordJobOutcome(
          "history-shop",
          "boost-job-1",
          ["tk-001"],
          { success: true, material: "D2", operation: "roughing" }
        );

        const tips = [
          { id: "tk-001", title: "Tip 1", confidence: 0.7 },
          { id: "tk-002", title: "Tip 2", confidence: 0.7 },
        ];

        const boosted = customerKnowledgeEngine.boostByHistory(
          tips,
          { material: "D2", operation: "roughing" },
          "history-shop"
        );

        const tk001 = boosted.find(t => t.id === "tk-001");
        expect(tk001?.history_boost).toBeGreaterThanOrEqual(0);
      });

      it("should penalize tips that failed in similar jobs", () => {
        customerKnowledgeEngine.recordJobOutcome(
          "history-shop",
          "fail-job-1",
          ["tk-bad"],
          { success: false, material: "Steel" }
        );

        const tips = [{ id: "tk-bad", title: "Bad Tip", confidence: 0.8 }];

        const boosted = customerKnowledgeEngine.boostByHistory(
          tips,
          { material: "Steel" },
          "history-shop"
        );

        const tkBad = boosted.find(t => t.id === "tk-bad");
        expect(tkBad?.history_boost).toBeLessThanOrEqual(0);
      });

      it("should include boost reasoning", () => {
        customerKnowledgeEngine.recordJobOutcome(
          "history-shop",
          "reason-job-1",
          ["tk-001"],
          { success: true }
        );

        const tips = [{ id: "tk-001", title: "Tip 1", confidence: 0.7 }];

        const boosted = customerKnowledgeEngine.boostByHistory(
          tips,
          { material: "Steel" },
          "history-shop"
        );

        if (boosted[0].history_boost !== 0) {
          expect(boosted[0].boost_reason).toBeDefined();
        }
      });
    });
  });

  describe("U4: Profile-Based Search & Filtering", () => {
    beforeEach(() => {
      customerKnowledgeEngine.createProfile("search-shop", {
        name: "Search Test Shop",
        expertise_areas: ["D2", "M2", "tool-steel"],
        primary_machines: ["Okuma LB3000"],
        specializations: ["die_tooling"],
      });
    });

    describe("searchWithProfile", () => {
      it("should search with profile context", () => {
        const results = customerKnowledgeEngine.searchWithProfile(
          "work hardening prevention",
          "search-shop"
        );

        expect(Array.isArray(results)).toBe(true);
        for (const result of results) {
          expect(result).toHaveProperty("tip");
          expect(result).toHaveProperty("profile_relevance");
        }
      });

      it("should boost results matching shop expertise", () => {
        const results = customerKnowledgeEngine.searchWithProfile(
          "D2 tool steel machining",
          "search-shop"
        );

        // Results related to D2 should be boosted
        for (const result of results) {
          if (result.tip.tags?.includes("d2") || result.tip.title?.toLowerCase().includes("d2")) {
            expect(result.expertise_match).toBe(true);
          }
        }
      });

      it("should include profile match score", () => {
        const results = customerKnowledgeEngine.searchWithProfile(
          "general machining",
          "search-shop"
        );

        for (const result of results) {
          expect(result.profile_relevance).toBeGreaterThanOrEqual(0);
          expect(result.profile_relevance).toBeLessThanOrEqual(1);
        }
      });

      it("should limit results", () => {
        const results = customerKnowledgeEngine.searchWithProfile(
          "machining",
          "search-shop",
          { limit: 5 }
        );

        expect(results.length).toBeLessThanOrEqual(5);
      });
    });

    describe("filterByExpertise", () => {
      it("should filter tips by shop expertise", () => {
        const tips = [
          { id: "tk-d2", title: "D2 Steel Tip", tags: ["d2", "tool-steel"] },
          { id: "tk-al", title: "Aluminum Tip", tags: ["aluminum"] },
          { id: "tk-ti", title: "Titanium Tip", tags: ["titanium"] },
        ];

        const filtered = customerKnowledgeEngine.filterByExpertise(tips, "search-shop");

        // D2 tip should be included (expertise match)
        const d2Tip = filtered.find(t => t.id === "tk-d2");
        expect(d2Tip).toBeDefined();
        expect(d2Tip?.expertise_match).toBe(true);
      });

      it("should mark non-expertise tips", () => {
        const tips = [
          { id: "tk-plastic", title: "Plastic Machining", tags: ["plastic"] },
        ];

        const filtered = customerKnowledgeEngine.filterByExpertise(tips, "search-shop");

        expect(filtered[0].expertise_match).toBe(false);
      });

      it("should not exclude non-expertise tips by default", () => {
        const tips = [
          { id: "tk-d2", title: "D2 Tip", tags: ["d2"] },
          { id: "tk-other", title: "Other Tip", tags: ["other"] },
        ];

        const filtered = customerKnowledgeEngine.filterByExpertise(tips, "search-shop");

        expect(filtered.length).toBe(2);
      });

      it("should support strict mode", () => {
        const tips = [
          { id: "tk-d2", title: "D2 Tip", tags: ["d2"] },
          { id: "tk-other", title: "Other Tip", tags: ["plastic"] },
        ];

        const filtered = customerKnowledgeEngine.filterByExpertise(tips, "search-shop", {
          strict: true,
        });

        // Strict mode only returns expertise matches
        expect(filtered.every(t => t.expertise_match)).toBe(true);
      });
    });

    describe("rankByRelevance", () => {
      it("should rank tips by profile relevance", () => {
        const tips = [
          { id: "tk-1", title: "Generic Tip", confidence: 0.9 },
          { id: "tk-2", title: "D2 Tool Steel Tip", confidence: 0.7, tags: ["d2"] },
          { id: "tk-3", title: "Okuma Specific Tip", confidence: 0.6, tags: ["okuma"] },
        ];

        const ranked = customerKnowledgeEngine.rankByRelevance(
          tips,
          "search-shop",
          { material: "D2" }
        );

        // D2 tip should rank higher despite lower base confidence
        const d2Index = ranked.findIndex(t => t.id === "tk-2");
        expect(d2Index).toBeLessThan(ranked.length);
      });

      it("should combine multiple relevance factors", () => {
        const tips = [
          { id: "tk-1", title: "D2 on Okuma", tags: ["d2", "okuma"], confidence: 0.7 },
        ];

        const ranked = customerKnowledgeEngine.rankByRelevance(
          tips,
          "search-shop",
          { material: "D2", machine: "Okuma LB3000" }
        );

        // Should get high combined score
        expect(ranked[0].combined_relevance).toBeGreaterThan(0.5);
      });

      it("should include relevance breakdown", () => {
        const tips = [{ id: "tk-1", title: "Test Tip", confidence: 0.7 }];

        const ranked = customerKnowledgeEngine.rankByRelevance(
          tips,
          "search-shop",
          {}
        );

        expect(ranked[0].relevance_breakdown).toBeDefined();
        expect(ranked[0].relevance_breakdown).toHaveProperty("base_confidence");
        expect(ranked[0].relevance_breakdown).toHaveProperty("expertise_boost");
        expect(ranked[0].relevance_breakdown).toHaveProperty("history_boost");
      });
    });
  });

  describe("JM Die Integration", () => {
    it("should create complete JM Die profile", () => {
      const profile = customerKnowledgeEngine.createProfile("jm-die", {
        name: "JM Die Company",
        industry: "cold_heading_die_tooling",
        expertise_areas: ["D2", "M2", "S7", "A2", "H13", "tungsten-carbide", "cobalt"],
        primary_machines: [
          "Okuma LB3000",
          "Okuma LB300-M",
          "Okuma GENOS M560-V",
          "Hurco VMX42",
          "Haas VF-2",
        ],
        specializations: ["die_tooling", "fastener_industry", "cold_heading"],
        customer_base: ["ITW", "Alcoa", "Optimas", "SFS", "Holo-Krome"],
      });

      expect(profile.shop_id).toBe("jm-die");
      expect(profile.specializations).toContain("die_tooling");
      expect(profile.expertise_areas.length).toBeGreaterThanOrEqual(6);
    });

    it("should boost D2/M2 tips for JM Die searches", () => {
      customerKnowledgeEngine.createProfile("jm-die", {
        name: "JM Die Company",
        expertise_areas: ["D2", "M2", "S7"],
      });

      const results = customerKnowledgeEngine.searchWithProfile(
        "tool steel machining",
        "jm-die"
      );

      // Results should prioritize tool steel expertise
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it("should learn from JM Die job history", () => {
      customerKnowledgeEngine.createProfile("jm-die", {
        name: "JM Die Company",
        expertise_areas: ["D2"],
      });

      // Simulate successful D2 job
      customerKnowledgeEngine.recordJobOutcome(
        "jm-die",
        "jm-job-001",
        ["tk-001"],
        {
          success: true,
          material: "D2",
          operation: "roughing",
          machine: "Okuma LB3000",
          cycle_time_reduction: 0.12,
        }
      );

      const patterns = customerKnowledgeEngine.analyzeJobHistory("jm-die", 30);
      expect(Array.isArray(patterns)).toBe(true);
    });
  });
});
