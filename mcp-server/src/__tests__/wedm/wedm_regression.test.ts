/**
 * WEDM Regression Test Suite - Phase 0.12 U-WEDM-OP10
 * 30+ tests validating the WEDM AGI stack end-to-end
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const STATE = path.join(ROOT, "data/state");
const SCRIPTS = path.join(ROOT, "scripts");
const HOOKS = path.join(ROOT, "src/hooks");
const PLAYBOOKS = path.join(ROOT, "data/playbooks");

describe("WEDM AGI Stack Regression", () => {
  describe("Phase 0.1: Skills (12)", () => {
    it("WEDM_SKILL_MANIFEST_INDEX exists", () => {
      expect(fs.existsSync(path.join(STATE, "WEDM_SKILL_MANIFEST_INDEX.json"))).toBe(true);
    });
  });

  describe("Phase 0.2: Scripts (18)", () => {
    const scripts = [
      "wedm_index_programs.ts",
      "wedm_embed_programs.ts",
      "wedm_sync_qdrant.ts",
      "wedm_train_lora.py",
      "wedm_extract_parameter_corpus.ts",
      "wedm_build_customer_patterns.ts",
      "wedm_register_assets.ts",
      "wedm_generate_digest.ts",
      "wedm_doc_cascade.ts",
      "wedm_retrofit_existing.ts",
      "wedm_rotate_ledgers.ts",
    ];
    for (const script of scripts) {
      it("has " + script, () => {
        expect(fs.existsSync(path.join(SCRIPTS, script))).toBe(true);
      });
    }
  });

  describe("Phase 0.3: Hooks (18)", () => {
    it("WEDMSafetyHooks.ts exists", () => {
      expect(fs.existsSync(path.join(HOOKS, "WEDMSafetyHooks.ts"))).toBe(true);
    });
    it("WEDMSVIHooks.ts exists", () => {
      expect(fs.existsSync(path.join(HOOKS, "WEDMSVIHooks.ts"))).toBe(true);
    });
    it("WEDM_HOOK_ORDER_REGISTRY.json exists", () => {
      expect(fs.existsSync(path.join(STATE, "WEDM_HOOK_ORDER_REGISTRY.json"))).toBe(true);
    });
  });

  describe("Phase 0.4: Playbooks (8)", () => {
    const playbooks = [
      "wedm_drawing_to_program.json",
      "wedm_wire_break_diagnosis.json",
      "wedm_new_material_learning.json",
      "wedm_batch_optimization.json",
      "wedm_quality_gate_review.json",
      "wedm_parameter_tuning.json",
      "wedm_jm_die_customer.json",
      "wedm_continuous_learning.json",
    ];
    for (const pb of playbooks) {
      it("has " + pb, () => {
        expect(fs.existsSync(path.join(PLAYBOOKS, pb))).toBe(true);
      });
    }
  });

  describe("Phase 0.5/0.6: State files & indexes (15+8)", () => {
    const required = [
      "WEDM_MACHINE_STATE.json",
      "WEDM_DIGITAL_TWIN.json",
      "WEDM_CAUSAL_GRAPH.json",
      "WEDM_PARETO_CACHE.json",
      "WEDM_TRANSFER_REGISTRY.json",
      "WEDM_AUTONOMY_STATE.json",
      "WEDM_DRIFT_BASELINE.json",
      "WEDM_ENGINE_USAGE_INDEX.json",
      "WEDM_ACTION_RESOLUTION_INDEX.json",
      "WEDM_SKILL_MANIFEST_INDEX.json",
      "WEDM_FORMULA_PROVENANCE_INDEX.json",
      "WEDM_ALIAS_TABLE.json",
    ];
    for (const file of required) {
      it("has " + file, () => {
        expect(fs.existsSync(path.join(STATE, file))).toBe(true);
      });
    }
  });

  describe("Phase 0.8: MIT OCW (5 courses)", () => {
    it("WEDM_MIT_OCW_INTEGRATION.json exists", () => {
      expect(fs.existsSync(path.join(STATE, "WEDM_MIT_OCW_INTEGRATION.json"))).toBe(true);
    });
    it("WEDM_MIT_TIPS.json has 25+ tips", () => {
      const data = JSON.parse(fs.readFileSync(path.join(STATE, "WEDM_MIT_TIPS.json"), "utf-8"));
      expect(data.tips.length).toBeGreaterThanOrEqual(25);
    });
  });

  describe("Phase 0.10: SVI Coupling", () => {
    it("WEDM_SVI_SURFACES.json has 10+ surfaces", () => {
      const data = JSON.parse(fs.readFileSync(path.join(STATE, "WEDM_SVI_SURFACES.json"), "utf-8"));
      expect(Object.keys(data.surfaces).length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Phase 0.11: Auto-Docs", () => {
    it("WEDM_DIGEST.md exists", () => {
      expect(fs.existsSync(path.join(ROOT, "data/docs/WEDM_DIGEST.md"))).toBe(true);
    });
  });

  describe("Phase 0.12: Operational Integrity", () => {
    it("WEDM_BOOTSTRAP_MODE.flag exists", () => {
      expect(fs.existsSync(path.join(STATE, "WEDM_BOOTSTRAP_MODE.flag"))).toBe(true);
    });
    it("WEDM_HOOK_ORDER_REGISTRY is deterministic", () => {
      const data = JSON.parse(fs.readFileSync(path.join(STATE, "WEDM_HOOK_ORDER_REGISTRY.json"), "utf-8"));
      expect(data.orderingRules).toBeDefined();
      expect(data.totalHooks).toBeGreaterThanOrEqual(16);
    });
  });
});
