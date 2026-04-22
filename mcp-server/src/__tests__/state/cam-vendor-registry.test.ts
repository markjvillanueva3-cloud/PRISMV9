/**
 * cam-vendor-registry.test.ts — Tests for CAM-UIX-INFRA-00/U-VENDOR-REG01
 *
 * Validates CAM_VENDOR_REGISTRY.json structure and ensures every
 * in-scope CAM has required fields for hook validation.
 */
import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

interface CAMSystem {
  tier: 1 | 2 | 3;
  vendor: string;
  display_name: string;
  file_prefixes: string[];
  engine_pattern: string;
  tips_file?: string;
  bridge_engine?: string;
  scripting_sdk?: string;
  post_language?: string;
  strategies_estimated: number;
  fields_estimated?: number;
  in_scope: boolean;
  jmdie_program_count?: number;
  note?: string;
  eol_note?: string;
  patent_block?: string;
  demoted_reason?: string;
  consolidates?: string[];
}

interface VendorRegistry {
  schemaVersion: number;
  created_at: string;
  description: string;
  owner_unit: string;
  tier_definitions: Record<string, { description: string; coverage_floor_strategy_pct: number; coverage_floor_ui_field_pct: number }>;
  cam_systems: Record<string, CAMSystem>;
  aggregate_counts: {
    tier_1_count: number;
    tier_2_count: number;
    tier_3_count: number;
    in_scope_count: number;
    total_strategies_estimated: number;
    total_fields_estimated: number;
    jmdie_programs_indexed: number;
  };
  validation_queries: Record<string, string>;
}

describe("CAM_VENDOR_REGISTRY.json", () => {
  let registry: VendorRegistry;

  beforeAll(() => {
    const registryPath = path.join(
      process.cwd(),
      "data/state/CAM_VENDOR_REGISTRY.json"
    );
    const content = fs.readFileSync(registryPath, "utf-8");
    registry = JSON.parse(content);
  });

  describe("schema structure", () => {
    it("has schemaVersion", () => {
      expect(registry.schemaVersion).toBe(1);
    });

    it("has owner_unit referencing INFRA-00", () => {
      expect(registry.owner_unit).toContain("U-VENDOR-REG01");
    });

    it("has tier_definitions for all 3 tiers", () => {
      expect(registry.tier_definitions).toHaveProperty("tier_1");
      expect(registry.tier_definitions).toHaveProperty("tier_2");
      expect(registry.tier_definitions).toHaveProperty("tier_3");
    });

    it("tier_1 has 100% strategy floor", () => {
      expect(registry.tier_definitions.tier_1.coverage_floor_strategy_pct).toBe(100);
    });

    it("tier_2 has 85% strategy floor", () => {
      expect(registry.tier_definitions.tier_2.coverage_floor_strategy_pct).toBe(85);
    });

    it("tier_3 has 0% floor (deferred)", () => {
      expect(registry.tier_definitions.tier_3.coverage_floor_strategy_pct).toBe(0);
    });
  });

  describe("CAM system entries", () => {
    it("has 17 total CAM systems", () => {
      const camCount = Object.keys(registry.cam_systems).length;
      expect(camCount).toBe(17);
    });

    it("has 6 tier-1 CAMs (includes SolidCAM per user directive)", () => {
      const tier1 = Object.values(registry.cam_systems).filter((c) => c.tier === 1);
      expect(tier1.length).toBe(6);
    });

    it("has 8 tier-2 CAMs", () => {
      const tier2 = Object.values(registry.cam_systems).filter((c) => c.tier === 2);
      expect(tier2.length).toBe(8);
    });

    it("has 3 tier-3 CAMs (demoted)", () => {
      const tier3 = Object.values(registry.cam_systems).filter((c) => c.tier === 3);
      expect(tier3.length).toBe(3);
    });

    it("has 14 in-scope CAMs", () => {
      const inScope = Object.values(registry.cam_systems).filter((c) => c.in_scope);
      expect(inScope.length).toBe(14);
    });

    it("every CAM has required fields", () => {
      for (const [key, cam] of Object.entries(registry.cam_systems)) {
        expect(cam.tier, `${key} missing tier`).toBeGreaterThanOrEqual(1);
        expect(cam.tier, `${key} invalid tier`).toBeLessThanOrEqual(3);
        expect(cam.vendor, `${key} missing vendor`).toBeTruthy();
        expect(cam.display_name, `${key} missing display_name`).toBeTruthy();
        expect(cam.file_prefixes, `${key} missing file_prefixes`).toBeInstanceOf(Array);
        expect(cam.file_prefixes.length, `${key} empty file_prefixes`).toBeGreaterThan(0);
        expect(cam.engine_pattern, `${key} missing engine_pattern`).toBeTruthy();
        expect(cam.strategies_estimated, `${key} missing strategies_estimated`).toBeGreaterThan(0);
        expect(typeof cam.in_scope, `${key} missing in_scope`).toBe("boolean");
      }
    });

    it("in-scope CAMs have bridge_engine", () => {
      for (const [key, cam] of Object.entries(registry.cam_systems)) {
        if (cam.in_scope) {
          expect(cam.bridge_engine, `${key} missing bridge_engine`).toBeTruthy();
        }
      }
    });

    it("in-scope CAMs have tips_file", () => {
      for (const [key, cam] of Object.entries(registry.cam_systems)) {
        if (cam.in_scope) {
          expect(cam.tips_file, `${key} missing tips_file`).toBeTruthy();
        }
      }
    });

    it("tier-3 CAMs have demoted_reason", () => {
      for (const [key, cam] of Object.entries(registry.cam_systems)) {
        if (cam.tier === 3) {
          expect(cam.demoted_reason, `${key} missing demoted_reason`).toBeTruthy();
          expect(cam.in_scope, `${key} should be out of scope`).toBe(false);
        }
      }
    });
  });

  describe("JM Die coverage", () => {
    it("tier-1 CAMs have jmdie_program_count", () => {
      for (const [key, cam] of Object.entries(registry.cam_systems)) {
        if (cam.tier === 1) {
          expect(cam.jmdie_program_count, `${key} missing jmdie_program_count`).toBeGreaterThan(0);
        }
      }
    });

    it("mastercam has most JM Die programs (as expected)", () => {
      const mastercam = registry.cam_systems.mastercam_x8;
      const others = Object.entries(registry.cam_systems)
        .filter(([k]) => k !== "mastercam_x8" && registry.cam_systems[k].tier === 1)
        .map(([, v]) => v.jmdie_program_count || 0);

      expect(mastercam.jmdie_program_count).toBeGreaterThan(Math.max(...others));
    });
  });

  describe("aggregate counts", () => {
    it("tier counts match actual counts", () => {
      const tier1 = Object.values(registry.cam_systems).filter((c) => c.tier === 1).length;
      const tier2 = Object.values(registry.cam_systems).filter((c) => c.tier === 2).length;
      const tier3 = Object.values(registry.cam_systems).filter((c) => c.tier === 3).length;
      const inScope = Object.values(registry.cam_systems).filter((c) => c.in_scope).length;

      expect(registry.aggregate_counts.tier_1_count).toBe(tier1);
      expect(registry.aggregate_counts.tier_2_count).toBe(tier2);
      expect(registry.aggregate_counts.tier_3_count).toBe(tier3);
      expect(registry.aggregate_counts.in_scope_count).toBe(inScope);
    });

    it("total strategies matches sum", () => {
      const sum = Object.values(registry.cam_systems)
        .filter((c) => c.in_scope)
        .reduce((acc, c) => acc + c.strategies_estimated, 0);
      expect(registry.aggregate_counts.total_strategies_estimated).toBe(sum);
    });

    it("total fields matches sum", () => {
      const sum = Object.values(registry.cam_systems)
        .filter((c) => c.in_scope)
        .reduce((acc, c) => acc + (c.fields_estimated || 0), 0);
      expect(registry.aggregate_counts.total_fields_estimated).toBe(sum);
    });
  });

  describe("file prefix uniqueness", () => {
    it("no duplicate file prefixes across different CAMs", () => {
      // Map lowercase prefix -> CAM key that owns it
      const prefixOwner = new Map<string, string>();
      const crossCamDuplicates: string[] = [];

      for (const [key, cam] of Object.entries(registry.cam_systems)) {
        for (const prefix of cam.file_prefixes) {
          const lower = prefix.toLowerCase();
          const existingOwner = prefixOwner.get(lower);

          // Only flag if a DIFFERENT CAM already claimed this prefix
          if (existingOwner && existingOwner !== key) {
            crossCamDuplicates.push(`${prefix} claimed by both ${existingOwner} and ${key}`);
          } else if (!existingOwner) {
            prefixOwner.set(lower, key);
          }
        }
      }

      // Allow known consolidations (Hexagon owns Edgecam/WorkNC prefixes)
      const allowedOverlaps = ["hexagon", "edgecam", "worknc"];
      const realDuplicates = crossCamDuplicates.filter(
        (d) => !allowedOverlaps.some((a) => d.toLowerCase().includes(a))
      );

      expect(realDuplicates, "Cross-CAM duplicate file prefixes found").toEqual([]);
    });
  });

  describe("special cases", () => {
    it("SolidCAM has patent_block field", () => {
      expect(registry.cam_systems.solidcam.patent_block).toContain("US 8,489,224");
    });

    it("hexagon_unified consolidates edgecam and worknc", () => {
      expect(registry.cam_systems.hexagon_unified.consolidates).toContain("edgecam");
      expect(registry.cam_systems.hexagon_unified.consolidates).toContain("worknc");
    });

    it("FeatureCAM has EOL note", () => {
      expect(registry.cam_systems.featurecam.eol_note).toContain("EOL 2026");
    });

    it("Okuma IGF has conversational programming note", () => {
      expect(registry.cam_systems.okuma_igf.note).toContain("conversational");
    });
  });
});
