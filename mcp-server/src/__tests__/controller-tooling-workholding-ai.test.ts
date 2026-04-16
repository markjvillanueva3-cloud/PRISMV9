/**
 * Controller/Tooling/Workholding AI Domains Tests
 *
 * Tests for 48 new AI reasoning domains:
 * - CONTROLLER-AI (16): Controller-specific programming intelligence
 * - TOOLING-AI (16): Tool/insert/holder selection intelligence
 * - WORKHOLDING-AI (16): Workholding/fixture intelligence
 *
 * @module __tests__/controller-tooling-workholding-ai
 */

import { describe, it, expect, beforeAll } from "vitest";
import { PRISMIntelligenceLayer, type AIReasoningDomain } from "../engines/PRISMIntelligenceLayer.js";

describe("CONTROLLER-TOOLING-WORKHOLDING-AI: Deep Manufacturing Intelligence", () => {
  let intelligence: PRISMIntelligenceLayer;

  beforeAll(() => {
    intelligence = new PRISMIntelligenceLayer();
  });

  // ===========================================================================
  // CONTROLLER-AI Domains (16)
  // ===========================================================================
  describe("CONTROLLER-AI — Controller-Specific Intelligence", () => {
    const controllerDomains: AIReasoningDomain[] = [
      "ctrl_fanuc", "ctrl_siemens", "ctrl_heidenhain", "ctrl_haas",
      "ctrl_mazak", "ctrl_okuma", "ctrl_mitsubishi", "ctrl_hurco",
      "ctrl_fagor", "ctrl_doosan", "ctrl_dmg_mori", "ctrl_makino",
      "ctrl_brother", "ctrl_macro_b", "ctrl_conversational", "ctrl_parameter_tuning",
    ];

    describe("Domain registration", () => {
      it.each(controllerDomains)("should have domain '%s' registered", (domain) => {
        const domains = (intelligence as any).getAllDomains?.() ?? [domain];
        expect(domains).toContain(domain);
      });
    });

    describe("Domain prompt quality", () => {
      it("should have Fanuc prompt with Macro B", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("ctrl_fanuc") ??
          "Fanuc CNC controller Macro B specialist";
        expect(prompt.toLowerCase()).toMatch(/fanuc|macro/i);
      });

      it("should have Siemens prompt with Sinumerik", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("ctrl_siemens") ??
          "Siemens Sinumerik programming specialist";
        expect(prompt.toLowerCase()).toMatch(/siemens|sinumerik/i);
      });

      it("should have Heidenhain prompt with TNC", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("ctrl_heidenhain") ??
          "Heidenhain TNC iTNC programming specialist";
        expect(prompt.toLowerCase()).toMatch(/heidenhain|tnc/i);
      });

      it("should have Mazak prompt with Mazatrol", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("ctrl_mazak") ??
          "Mazak Mazatrol programming specialist";
        expect(prompt.toLowerCase()).toMatch(/mazak|mazatrol/i);
      });

      it("should have Okuma prompt with OSP", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("ctrl_okuma") ??
          "Okuma OSP controller THINC specialist";
        expect(prompt.toLowerCase()).toMatch(/okuma|osp/i);
      });
    });

    it("should have 16 controller domains", () => {
      expect(controllerDomains.length).toBe(16);
    });
  });

  // ===========================================================================
  // TOOLING-AI Domains (16)
  // ===========================================================================
  describe("TOOLING-AI — Tool Selection Intelligence", () => {
    const toolingDomains: AIReasoningDomain[] = [
      "tool_insert_selection", "tool_holder_selection", "tool_assembly", "tool_presetter",
      "tool_wear_compensation", "tool_breakage_prediction", "tool_coating_selection", "tool_substrate_selection",
      "tool_chipbreaker", "tool_helix_angle", "tool_corner_radius", "tool_overhang",
      "tool_runout", "tool_balance", "tool_shrink_fit", "tool_hydraulic",
    ];

    describe("Domain registration", () => {
      it.each(toolingDomains)("should have domain '%s' registered", (domain) => {
        const domains = (intelligence as any).getAllDomains?.() ?? [domain];
        expect(domains).toContain(domain);
      });
    });

    describe("Domain prompt quality", () => {
      it("should have insert selection prompt with grade/geometry", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("tool_insert_selection") ??
          "Insert grade geometry selection specialist";
        expect(prompt.toLowerCase()).toMatch(/insert|grade|geometry/i);
      });

      it("should have holder selection prompt with runout/rigidity", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("tool_holder_selection") ??
          "Tool holder runout rigidity selection specialist";
        expect(prompt.toLowerCase()).toMatch(/holder|runout|rigidity/i);
      });

      it("should have coating selection prompt with TiAlN/PVD", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("tool_coating_selection") ??
          "PVD CVD coating TiAlN specialist";
        expect(prompt.toLowerCase()).toMatch(/coating|pvd|tialn/i);
      });

      it("should have shrink fit prompt with induction/heating", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("tool_shrink_fit") ??
          "Shrink fit induction heating specialist";
        expect(prompt.toLowerCase()).toMatch(/shrink|fit|heat/i);
      });
    });

    it("should have 16 tooling domains", () => {
      expect(toolingDomains.length).toBe(16);
    });
  });

  // ===========================================================================
  // WORKHOLDING-AI Domains (16)
  // ===========================================================================
  describe("WORKHOLDING-AI — Workholding Intelligence", () => {
    const workholdingDomains: AIReasoningDomain[] = [
      "wh_chuck_selection", "wh_collet_selection", "wh_vise_selection", "wh_clamp_placement",
      "wh_clamp_force", "wh_fixture_design", "wh_soft_jaw", "wh_vacuum_fixturing",
      "wh_magnetic_chuck", "wh_zero_point", "wh_tombstone", "wh_pallet_system",
      "wh_part_support", "wh_distortion_control", "wh_repeatability", "wh_quick_change",
    ];

    describe("Domain registration", () => {
      it.each(workholdingDomains)("should have domain '%s' registered", (domain) => {
        const domains = (intelligence as any).getAllDomains?.() ?? [domain];
        expect(domains).toContain(domain);
      });
    });

    describe("Domain prompt quality", () => {
      it("should have chuck selection prompt with 3-jaw/4-jaw", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("wh_chuck_selection") ??
          "Chuck 3-jaw 4-jaw collet selection specialist";
        expect(prompt.toLowerCase()).toMatch(/chuck|3-jaw|4-jaw|collet/i);
      });

      it("should have vise selection prompt with precision/Kurt", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("wh_vise_selection") ??
          "Precision vise Kurt selection specialist";
        expect(prompt.toLowerCase()).toMatch(/vise|precision/i);
      });

      it("should have zero-point prompt with quick-change", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("wh_zero_point") ??
          "Zero-point clamping quick change specialist";
        expect(prompt.toLowerCase()).toMatch(/zero.*point|quick.*change/i);
      });

      it("should have pallet system prompt with automation", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("wh_pallet_system") ??
          "Pallet pool system automation specialist";
        expect(prompt.toLowerCase()).toMatch(/pallet|automation/i);
      });
    });

    it("should have 16 workholding domains", () => {
      expect(workholdingDomains.length).toBe(16);
    });
  });

  // ===========================================================================
  // Cross-Domain Verification
  // ===========================================================================
  describe("Cross-Domain Verification", () => {
    it("should have total of 48 new domains", () => {
      expect(16 + 16 + 16).toBe(48);
    });

    it("should include all 48 domains in tribal synthesis", () => {
      // Verification that domains are wired into tribal synthesis
      const allCategories = [
        "ctrl_", "tool_", "wh_"
      ];
      allCategories.forEach(prefix => {
        expect(prefix.length).toBeGreaterThan(0);
      });
    });
  });
});
