/**
 * PostProcessorHyperMillKnowledgeEngine Tests
 * =============================================
 * Tests for the hyperMILL production knowledge engine.
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorHyperMillKnowledgeEngine,
  HYPERMILL_VARIABLES,
  MACHINE_POST_CONFIGS,
  HYPERMILL_POST_PATTERNS
} from "../engines/PostProcessorHyperMillKnowledgeEngine.js";

describe("PostProcessorHyperMillKnowledgeEngine", () => {
  describe("Statistics", () => {
    it("should return engine statistics", () => {
      const stats = postProcessorHyperMillKnowledgeEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.variables).toBeGreaterThan(10);
      expect(stats.machines).toBe(3);
      expect(stats.patterns).toBeGreaterThan(5);
      expect(stats.tribalTips).toBeGreaterThan(10);
    });

    it("should list controllers covered", () => {
      const stats = postProcessorHyperMillKnowledgeEngine.getStatistics();

      expect(stats.controllersCovered.length).toBe(3);
      expect(stats.controllersCovered.some(c => c.includes("Haas"))).toBe(true);
      expect(stats.controllersCovered.some(c => c.includes("Okuma"))).toBe(true);
      expect(stats.controllersCovered.some(c => c.includes("Hurco"))).toBe(true);
    });

    it("should categorize variables", () => {
      const stats = postProcessorHyperMillKnowledgeEngine.getStatistics();

      expect(stats.variablesByCategory.precision).toBeGreaterThan(0);
      expect(stats.variablesByCategory.tool).toBeGreaterThan(0);
      expect(stats.variablesByCategory.origin).toBeGreaterThan(0);
      expect(stats.variablesByCategory.coolant).toBeGreaterThan(0);
    });
  });

  describe("Variables", () => {
    it("should have all hyperMILL variables", () => {
      const variables = postProcessorHyperMillKnowledgeEngine.getVariables();
      expect(variables.length).toBeGreaterThan(10);
    });

    it("should get precision variables", () => {
      const precision = postProcessorHyperMillKnowledgeEngine.getVariablesByCategory("precision");
      expect(precision.length).toBeGreaterThan(0);
      expect(precision.some(v => v.name.includes("tolerance"))).toBe(true);
    });

    it("should get tool variables", () => {
      const tools = postProcessorHyperMillKnowledgeEngine.getVariablesByCategory("tool");
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.some(v => v.name.includes("tool_number"))).toBe(true);
    });

    it("should get origin variables", () => {
      const origins = postProcessorHyperMillKnowledgeEngine.getVariablesByCategory("origin");
      expect(origins.length).toBeGreaterThan(0);
      expect(origins.some(v => v.name.includes("wpcs"))).toBe(true);
    });

    it("should get coolant variables", () => {
      const coolants = postProcessorHyperMillKnowledgeEngine.getVariablesByCategory("coolant");
      expect(coolants.length).toBeGreaterThan(0);
    });

    it("should find variable by name", () => {
      const tolerance = postProcessorHyperMillKnowledgeEngine.findVariable("tolerance");
      expect(tolerance).toBeDefined();
      expect(tolerance?.category).toBe("precision");
    });

    it("should find variable without dollar signs", () => {
      const tolerance = postProcessorHyperMillKnowledgeEngine.findVariable("$hyperMILL_tolerance$");
      expect(tolerance).toBeDefined();
    });

    it("should have typical values for variables", () => {
      for (const variable of HYPERMILL_VARIABLES) {
        expect(variable.typicalValues.length).toBeGreaterThan(0);
        expect(variable.usedIn.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Machine Configurations", () => {
    it("should have Haas VF-2 config", () => {
      const haas = postProcessorHyperMillKnowledgeEngine.getMachineConfig("haas_vf2");
      expect(haas).toBeDefined();
      expect(haas?.machineName).toBe("Haas VF-2");
      expect(haas?.controller).toContain("Haas");
      expect(haas?.axes).toBe(3);
    });

    it("should have Hurco VMX 30i config", () => {
      const hurco = postProcessorHyperMillKnowledgeEngine.getMachineConfig("hurco_vmx30i");
      expect(hurco).toBeDefined();
      expect(hurco?.machineName).toBe("Hurco VMX 30i");
      expect(hurco?.controller).toContain("Hurco");
    });

    it("should have Okuma Genos M460V-5AX config", () => {
      const okuma = postProcessorHyperMillKnowledgeEngine.getMachineConfig("okuma_m460v_5ax");
      expect(okuma).toBeDefined();
      expect(okuma?.axes).toBe(5);
      expect(okuma?.nurbsSupport).toContain("Super-NURBS");
    });

    it("should search machines by controller", () => {
      const haasMachines = postProcessorHyperMillKnowledgeEngine.getMachinesByController("Haas");
      expect(haasMachines.length).toBeGreaterThan(0);

      const okumaMachines = postProcessorHyperMillKnowledgeEngine.getMachinesByController("Okuma");
      expect(okumaMachines.length).toBeGreaterThan(0);
    });

    it("should have precision settings for all machines", () => {
      for (const machine of MACHINE_POST_CONFIGS) {
        expect(machine.precision.rough.tolerance).toBeDefined();
        expect(machine.precision.medium.tolerance).toBeDefined();
        expect(machine.precision.fine.tolerance).toBeDefined();
      }
    });

    it("should have coolant codes for all machines", () => {
      for (const machine of MACHINE_POST_CONFIGS) {
        expect(machine.coolant.mainOn).toBeDefined();
        expect(machine.coolant.mainOff).toBeDefined();
      }
    });

    it("should have work offsets for all machines", () => {
      for (const machine of MACHINE_POST_CONFIGS) {
        expect(machine.workOffsets.length).toBeGreaterThan(0);
      }
    });

    it("should have tribal tips for all machines", () => {
      for (const machine of MACHINE_POST_CONFIGS) {
        expect(machine.tribalTips.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Post Patterns", () => {
    it("should have post patterns", () => {
      expect(HYPERMILL_POST_PATTERNS.length).toBeGreaterThan(5);
    });

    it("should get patterns by controller", () => {
      const haasPatterns = postProcessorHyperMillKnowledgeEngine.getPatternsByController("Haas");
      expect(haasPatterns.length).toBeGreaterThan(0);
    });

    it("should include Okuma NURBS pattern", () => {
      const okumaPatterns = postProcessorHyperMillKnowledgeEngine.getPatternsByController("Okuma");
      expect(okumaPatterns.some(p => p.id === "okuma_nurbs_pattern")).toBe(true);
    });

    it("should include Hurco UltiMotion pattern", () => {
      const hurcoPatterns = postProcessorHyperMillKnowledgeEngine.getPatternsByController("Hurco");
      expect(hurcoPatterns.some(p => p.id === "hurco_ultimotion_pattern")).toBe(true);
    });

    it("should include Haas G187 pattern", () => {
      const haasPatterns = postProcessorHyperMillKnowledgeEngine.getPatternsByController("Haas");
      expect(haasPatterns.some(p => p.id === "haas_g187_pattern")).toBe(true);
    });

    it("should search patterns by keyword", () => {
      const nurbsPatterns = postProcessorHyperMillKnowledgeEngine.searchPatterns("NURBS");
      expect(nurbsPatterns.length).toBeGreaterThan(0);
    });

    it("should have confidence scores", () => {
      for (const pattern of HYPERMILL_POST_PATTERNS) {
        expect(pattern.confidence).toBeGreaterThan(0.5);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Post Fragment Generation", () => {
    it("should generate 2Dmill begin for Haas", () => {
      const fragment = postProcessorHyperMillKnowledgeEngine.generatePostFragment("haas_vf2", "2Dmill_begin");
      expect(fragment).toContain("G187");
    });

    it("should generate 3D begin for Okuma", () => {
      const fragment = postProcessorHyperMillKnowledgeEngine.generatePostFragment("okuma_m460v_5ax", "3D_begin");
      expect(fragment).toContain("VARD");
    });

    it("should generate 5axis begin for Okuma", () => {
      const fragment = postProcessorHyperMillKnowledgeEngine.generatePostFragment("okuma_m460v_5ax", "5axis_begin");
      expect(fragment).toContain("G43.4");
    });

    it("should return empty for unknown machine", () => {
      const fragment = postProcessorHyperMillKnowledgeEngine.generatePostFragment("nonexistent" as never, "2Dmill_begin");
      expect(fragment).toBe("");
    });
  });

  describe("Template Resolution", () => {
    it("should resolve hyperMILL variables", () => {
      const template = "G187 P2 E$hyperMILL_tolerance$";
      const resolved = postProcessorHyperMillKnowledgeEngine.resolveTemplate(template, {
        hyperMILL_tolerance: "0.002"
      });
      expect(resolved).toBe("G187 P2 E0.002");
    });

    it("should use default values when not provided", () => {
      const template = "$hyperMILL_tolerance$";
      const resolved = postProcessorHyperMillKnowledgeEngine.resolveTemplate(template, {});
      expect(resolved).not.toBe("$hyperMILL_tolerance$");
    });

    it("should handle multiple variables", () => {
      const template = "$hyperMILL_precision_cmd$$hyperMILL_tolerance$";
      const resolved = postProcessorHyperMillKnowledgeEngine.resolveTemplate(template, {
        hyperMILL_precision_cmd: "G187 P2 E",
        hyperMILL_tolerance: "0.002"
      });
      expect(resolved).toBe("G187 P2 E0.002");
    });
  });

  describe("Precision Commands", () => {
    it("should get rough precision for Haas", () => {
      const precision = postProcessorHyperMillKnowledgeEngine.getPrecisionCommand("haas_vf2", "rough");
      expect(precision?.command).toBe("G187 P1 E");
      expect(precision?.tolerance).toBe("0.004");
    });

    it("should get medium precision for Haas", () => {
      const precision = postProcessorHyperMillKnowledgeEngine.getPrecisionCommand("haas_vf2", "medium");
      expect(precision?.command).toBe("G187 P2 E");
      expect(precision?.tolerance).toBe("0.002");
    });

    it("should get fine precision for Haas", () => {
      const precision = postProcessorHyperMillKnowledgeEngine.getPrecisionCommand("haas_vf2", "fine");
      expect(precision?.tolerance).toBe("0.0002");
    });

    it("should get precision for Okuma with NURBS", () => {
      const precision = postProcessorHyperMillKnowledgeEngine.getPrecisionCommand("okuma_m460v_5ax", "fine");
      expect(precision?.command).toContain("G06");
    });

    it("should return null for unknown machine", () => {
      const precision = postProcessorHyperMillKnowledgeEngine.getPrecisionCommand("unknown", "rough");
      expect(precision).toBeNull();
    });
  });

  describe("Coolant Codes", () => {
    it("should get main on coolant for Haas", () => {
      const code = postProcessorHyperMillKnowledgeEngine.getCoolantCode("haas_vf2", "mainOn");
      expect(code).toBe("M08");
    });

    it("should get TSC coolant for Haas", () => {
      const code = postProcessorHyperMillKnowledgeEngine.getCoolantCode("haas_vf2", "tsc");
      expect(code).toBe("M88 P150");
    });

    it("should get TSC coolant for Okuma", () => {
      const code = postProcessorHyperMillKnowledgeEngine.getCoolantCode("okuma_m460v_5ax", "tsc");
      expect(code).toBe("CTLM=50");
    });
  });

  describe("Machine Capabilities", () => {
    it("should report capabilities for Okuma 5-axis", () => {
      const caps = postProcessorHyperMillKnowledgeEngine.getMachineCapabilities("okuma_m460v_5ax");
      expect(caps).toBeDefined();
      expect(caps?.capabilities.some(c => c.includes("5-axis"))).toBe(true);
      expect(caps?.capabilities.some(c => c.includes("NURBS"))).toBe(true);
      expect(caps?.capabilities.some(c => c.includes("RTCP"))).toBe(true);
    });

    it("should report limitations for 3-axis machines", () => {
      const caps = postProcessorHyperMillKnowledgeEngine.getMachineCapabilities("haas_vf2");
      expect(caps?.limitations.some(l => l.includes("5-axis"))).toBe(true);
    });

    it("should recommend HSM for machines with HSM mode", () => {
      const caps = postProcessorHyperMillKnowledgeEngine.getMachineCapabilities("haas_vf2");
      expect(caps?.recommendedFor.some(r => r.includes("finishing"))).toBe(true);
    });
  });

  describe("Machine Header Generation", () => {
    it("should generate header for Haas", () => {
      const header = postProcessorHyperMillKnowledgeEngine.generateMachineHeader("haas_vf2");
      expect(header.length).toBeGreaterThan(5);
      expect(header.some(l => l.includes("Haas VF-2"))).toBe(true);
      expect(header.some(l => l.includes("R12c_E19"))).toBe(true);
    });

    it("should generate header for Okuma", () => {
      const header = postProcessorHyperMillKnowledgeEngine.generateMachineHeader("okuma_m460v_5ax");
      expect(header.some(l => l.includes("Okuma"))).toBe(true);
      expect(header.some(l => l.includes("5"))).toBe(true);  // 5 axes
    });

    it("should return empty for unknown machine", () => {
      const header = postProcessorHyperMillKnowledgeEngine.generateMachineHeader("unknown");
      expect(header.length).toBe(0);
    });
  });

  describe("Tribal Knowledge", () => {
    it("should get all tribal tips", () => {
      const tips = postProcessorHyperMillKnowledgeEngine.getAllTribalTips();
      expect(tips.length).toBeGreaterThan(10);
    });

    it("should have Haas-specific tips", () => {
      const tips = postProcessorHyperMillKnowledgeEngine.getAllTribalTips();
      const haasTips = tips.filter(t => t.machineId === "haas_vf2");
      expect(haasTips.length).toBeGreaterThan(0);
      expect(haasTips.some(t => t.tip.includes("G187"))).toBe(true);
    });

    it("should have Okuma-specific tips", () => {
      const tips = postProcessorHyperMillKnowledgeEngine.getAllTribalTips();
      const okumaTips = tips.filter(t => t.machineId === "okuma_m460v_5ax");
      expect(okumaTips.length).toBeGreaterThan(0);
      expect(okumaTips.some(t => t.tip.includes("NURBS"))).toBe(true);
    });
  });

  describe("Post Structure Validation", () => {
    it("should validate Haas post content", () => {
      const content = "G187 P2 E0.002\n$hyperMILL_wpcs_literal$\nM08";
      const result = postProcessorHyperMillKnowledgeEngine.validatePostStructure(content, "Haas");

      expect(result.patternsMatched.length).toBeGreaterThan(0);
    });

    it("should flag missing patterns", () => {
      const incompleteContent = "G00 X0 Y0";
      const result = postProcessorHyperMillKnowledgeEngine.validatePostStructure(incompleteContent, "Haas");

      expect(result.patternsMissing.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle unknown machine gracefully", () => {
      const machine = postProcessorHyperMillKnowledgeEngine.getMachineConfig("unknown_machine");
      expect(machine).toBeUndefined();
    });

    it("should handle partial name matching", () => {
      const machine = postProcessorHyperMillKnowledgeEngine.getMachineConfig("haas");
      expect(machine).toBeDefined();
      expect(machine?.machineName).toContain("Haas");
    });

    it("should handle case-insensitive search", () => {
      const machine1 = postProcessorHyperMillKnowledgeEngine.getMachineConfig("HAAS");
      const machine2 = postProcessorHyperMillKnowledgeEngine.getMachineConfig("haas");
      expect(machine1?.machineId).toBe(machine2?.machineId);
    });

    it("should get machines by controller case-insensitively", () => {
      const results1 = postProcessorHyperMillKnowledgeEngine.getMachinesByController("HAAS");
      const results2 = postProcessorHyperMillKnowledgeEngine.getMachinesByController("haas");
      expect(results1.length).toBe(results2.length);
    });
  });
});
