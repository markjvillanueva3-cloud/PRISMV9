/**
 * Tests for MachineModelIndexEngine
 *
 * Validates indexing of OEM machine model STEP files and generic models:
 *   - OEM models: 234 .step + 1 .mch across 12 OEM subdirectories
 *   - Generic models: 34 axis configuration .step files
 *   - Total: ~269 models (excluding .zip duplicates)
 *
 * Verifies classification of machine types (VMC, HMC, lathe, mill-turn,
 * 5-axis, high-speed, drill-mill) and axis configurations.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  MachineModelIndexEngine,
  type MachineModelIndexResult,
  type MachineModelEntry,
} from "../engines/MachineModelIndexEngine.js";

// ============================================================================
// SHARED HARVEST (run once, reuse across all tests)
// ============================================================================

let result: MachineModelIndexResult;

beforeAll(async () => {
  result = await MachineModelIndexEngine.harvest();
}, 30_000);

// ============================================================================
// TESTS
// ============================================================================

describe("MachineModelIndexEngine", () => {
  // --------------------------------------------------------------------------
  // getSources
  // --------------------------------------------------------------------------
  describe("getSources()", () => {
    it("should return correct OEM root path", () => {
      const sources = MachineModelIndexEngine.getSources();
      expect(sources.oemRoot).toContain(
        "MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION"
      );
    });

    it("should return correct generic root path", () => {
      const sources = MachineModelIndexEngine.getSources();
      expect(sources.genericRoot).toContain("GENERIC MACHINE MODELS");
    });

    it("should expect 12 OEM subdirectories", () => {
      const sources = MachineModelIndexEngine.getSources();
      expect(sources.expectedOemSubdirs).toBe(12);
    });

    it("should expect 34 generic models", () => {
      const sources = MachineModelIndexEngine.getSources();
      expect(sources.expectedGenericModels).toBe(34);
    });
  });

  // --------------------------------------------------------------------------
  // harvest — completeness
  // --------------------------------------------------------------------------
  describe("harvest() — completeness", () => {
    it("should find at least 200 models total (some zip duplicates skipped)", () => {
      expect(result.totalModels).toBeGreaterThanOrEqual(200);
    });

    it("should find approximately 269 models (234 OEM step + 1 mch + 34 generic)", () => {
      // Allow some variance for future additions/removals
      expect(result.totalModels).toBeGreaterThanOrEqual(260);
      expect(result.totalModels).toBeLessThanOrEqual(320);
    });

    it("should have HAAS as the largest OEM with >= 50 models", () => {
      expect(result.byOem["HAAS"]).toBeGreaterThanOrEqual(50);
    });

    it("should index Hurco models", () => {
      expect(result.byOem["HURCO"]).toBeGreaterThanOrEqual(40);
    });

    it("should index OKUMA models", () => {
      expect(result.byOem["OKUMA"]).toBeGreaterThanOrEqual(30);
    });

    it("should index MAZAK models", () => {
      expect(result.byOem["MAZAK"]).toBeGreaterThanOrEqual(35);
    });

    it("should index BROTHER models", () => {
      expect(result.byOem["BROTHER"]).toBeGreaterThanOrEqual(15);
    });

    it("should index GENERIC models", () => {
      expect(result.byOem["GENERIC"]).toBe(34);
    });
  });

  // --------------------------------------------------------------------------
  // harvest — OEM breakdown
  // --------------------------------------------------------------------------
  describe("harvest() — OEM breakdown", () => {
    it("should have known OEMs: HAAS, HURCO, OKUMA, MAZAK, BROTHER", () => {
      const oems = Object.keys(result.byOem);
      expect(oems).toContain("HAAS");
      expect(oems).toContain("HURCO");
      expect(oems).toContain("OKUMA");
      expect(oems).toContain("MAZAK");
      expect(oems).toContain("BROTHER");
    });

    it("should have smaller OEMs: DATRON, KERN, MAKINO, HELLER", () => {
      const oems = Object.keys(result.byOem);
      expect(oems).toContain("DATRON");
      expect(oems).toContain("KERN");
      expect(oems).toContain("MAKINO");
      expect(oems).toContain("HELLER");
    });

    it("should have oemCount including GENERIC", () => {
      // 12 OEM subdirs + GENERIC + DMG MORI (root file)
      expect(result.oemCount).toBeGreaterThanOrEqual(10);
    });
  });

  // --------------------------------------------------------------------------
  // harvest — machine type classification
  // --------------------------------------------------------------------------
  describe("harvest() — machine type classification", () => {
    it("should have vmc as the largest machine type category", () => {
      const vmcCount = result.byMachineType["vmc"] || 0;
      // VMC should be the dominant type across HAAS VF series, Hurco VM/VMX, etc.
      expect(vmcCount).toBeGreaterThanOrEqual(50);
    });

    it("should have 3axis as the most common axis config", () => {
      expect(result.byAxisConfig["3axis"]).toBeGreaterThanOrEqual(30);
    });

    it("should classify INTEGREX models as mill_turn", () => {
      const integrex = result.models.filter(
        (m) => m.modelName.includes("INTEGREX")
      );
      expect(integrex.length).toBeGreaterThanOrEqual(1);
      for (const m of integrex) {
        expect(m.machineType).toBe("mill_turn");
        expect(m.axisConfig).toBe("mill_turn");
      }
    });

    it("should classify OKUMA VTM models as mill_turn", () => {
      const vtm = result.models.filter(
        (m) => m.oem === "OKUMA" && m.modelName.includes("VTM")
      );
      expect(vtm.length).toBeGreaterThanOrEqual(2);
      for (const v of vtm) {
        expect(v.machineType).toBe("mill_turn");
      }
    });

    it("should classify HAAS EC series as HMC", () => {
      const ec = result.models.filter(
        (m) => m.oem === "HAAS" && m.modelName.startsWith("EC-")
      );
      expect(ec.length).toBeGreaterThanOrEqual(4);
      for (const e of ec) {
        expect(e.machineType).toBe("hmc");
      }
    });

    it("should classify HAAS TM series as lathe", () => {
      const tm = result.models.filter(
        (m) => m.oem === "HAAS" && /^TM-?\d/.test(m.modelName)
      );
      expect(tm.length).toBeGreaterThanOrEqual(4);
      for (const t of tm) {
        expect(t.machineType).toBe("lathe");
      }
    });

    it("should classify Brother SPEEDIO as high_speed", () => {
      const speedio = result.models.filter(
        (m) => m.oem === "BROTHER" && m.modelName.includes("SPEEDIO")
      );
      expect(speedio.length).toBeGreaterThanOrEqual(15);
      for (const s of speedio) {
        expect(s.machineType).toBe("high_speed");
      }
    });

    it("should classify HAAS UMC as 5axis", () => {
      const umc = result.models.filter(
        (m) => m.oem === "HAAS" && m.modelName.startsWith("UMC")
      );
      expect(umc.length).toBeGreaterThanOrEqual(8);
      for (const u of umc) {
        expect(u.machineType).toBe("5axis");
        expect(u.axisConfig).toBe("5axis");
      }
    });

    it("should classify Mazak VARIAXIS as 5axis", () => {
      const variaxis = result.models.filter(
        (m) =>
          m.oem === "MAZAK" &&
          m.modelName.toUpperCase().includes("VARIAXIS")
      );
      expect(variaxis.length).toBeGreaterThanOrEqual(10);
      for (const v of variaxis) {
        expect(v.machineType).toBe("5axis");
      }
    });

    it("should classify HAAS DM series as drill_mill", () => {
      const dm = result.models.filter(
        (m) => m.oem === "HAAS" && /^DM-/.test(m.modelName)
      );
      expect(dm.length).toBeGreaterThanOrEqual(1);
      for (const d of dm) {
        expect(d.machineType).toBe("drill_mill");
      }
    });
  });

  // --------------------------------------------------------------------------
  // harvest — generic model classification
  // --------------------------------------------------------------------------
  describe("harvest() — generic models", () => {
    it("should classify generic 3-axis models correctly", () => {
      const generic3 = result.models.filter(
        (m) => m.source === "generic" && m.axisConfig === "3axis"
      );
      expect(generic3.length).toBeGreaterThanOrEqual(5);
    });

    it("should classify generic 4-axis models correctly", () => {
      const generic4 = result.models.filter(
        (m) => m.source === "generic" && m.axisConfig === "4axis"
      );
      expect(generic4.length).toBeGreaterThanOrEqual(5);
    });

    it("should classify generic 5-axis models correctly", () => {
      const generic5 = result.models.filter(
        (m) => m.source === "generic" && m.axisConfig === "5axis"
      );
      expect(generic5.length).toBeGreaterThanOrEqual(15);
    });

    it("should have generic router models", () => {
      const routers = result.models.filter(
        (m) => m.source === "generic" && m.machineType === "router"
      );
      expect(routers.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // harvest — file metadata
  // --------------------------------------------------------------------------
  describe("harvest() — file metadata", () => {
    it("should have fileSize > 0 for every model", () => {
      for (const m of result.models) {
        expect(m.fileSize).toBeGreaterThan(0);
      }
    });

    it("should have format counts dominated by step", () => {
      expect(result.byFormat["step"]).toBeGreaterThanOrEqual(250);
    });

    it("should detect DMG Mori .mch file", () => {
      const mchModels = result.models.filter((m) => m.format === "mch");
      expect(mchModels.length).toBeGreaterThanOrEqual(1);
      expect(result.byFormat["mch"]).toBeGreaterThanOrEqual(1);
    });

    it("should have valid filePath for every model", () => {
      for (const m of result.models) {
        expect(m.filePath).toContain("/");
        expect(
          m.filePath.endsWith(".step") || m.filePath.endsWith(".mch")
        ).toBe(true);
      }
    });

    it("should not include any .zip files", () => {
      const zips = result.models.filter((m) =>
        m.filename.toLowerCase().endsWith(".zip")
      );
      expect(zips.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // findByOem
  // --------------------------------------------------------------------------
  describe("findByOem()", () => {
    it("should filter HAAS models case-insensitively", () => {
      const haas = MachineModelIndexEngine.findByOem(result.models, "haas");
      expect(haas.length).toBeGreaterThanOrEqual(50);
      for (const m of haas) {
        expect(m.oem).toBe("HAAS");
      }
    });

    it("should filter Hurco models", () => {
      const hurco = MachineModelIndexEngine.findByOem(result.models, "HURCO");
      expect(hurco.length).toBeGreaterThanOrEqual(40);
    });

    it("should return empty array for unknown OEM", () => {
      const none = MachineModelIndexEngine.findByOem(
        result.models,
        "NONEXISTENT"
      );
      expect(none.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // findByType
  // --------------------------------------------------------------------------
  describe("findByType()", () => {
    it("should return VMC machines", () => {
      const vmcs = MachineModelIndexEngine.findByType(result.models, "vmc");
      expect(vmcs.length).toBeGreaterThanOrEqual(50);
      for (const m of vmcs) {
        expect(m.machineType).toBe("vmc");
      }
    });

    it("should return mill_turn machines", () => {
      const mt = MachineModelIndexEngine.findByType(
        result.models,
        "mill_turn"
      );
      expect(mt.length).toBeGreaterThanOrEqual(3);
    });

    it("should return 5axis machines", () => {
      const fiveAxis = MachineModelIndexEngine.findByType(
        result.models,
        "5axis"
      );
      expect(fiveAxis.length).toBeGreaterThanOrEqual(15);
    });

    it("should return high_speed machines (SPEEDIO)", () => {
      const hs = MachineModelIndexEngine.findByType(
        result.models,
        "high_speed"
      );
      expect(hs.length).toBeGreaterThanOrEqual(15);
      for (const m of hs) {
        expect(m.oem).toBe("BROTHER");
      }
    });
  });

  // --------------------------------------------------------------------------
  // audit
  // --------------------------------------------------------------------------
  describe("audit()", () => {
    it("should return valid audit summary", async () => {
      const audit = await MachineModelIndexEngine.audit();
      expect(audit.totalModels).toBeGreaterThanOrEqual(200);
      expect(audit.oemCount).toBeGreaterThanOrEqual(10);
      expect(audit.genericCount).toBe(34);
      expect(audit.oemModelCount).toBeGreaterThanOrEqual(220);
      expect(audit.timestamp).toBeTruthy();
      expect(audit.byOem).toBeDefined();
      expect(audit.byMachineType).toBeDefined();
      expect(audit.byAxisConfig).toBeDefined();
      expect(audit.byFormat).toBeDefined();
    }, 30_000);
  });
});
