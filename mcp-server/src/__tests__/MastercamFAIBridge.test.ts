/**
 * Tests for MastercamFAIBridge
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP04
 */

import { describe, it, expect } from "vitest";
import {
  mastercamFAIBridge,
  type MastercamFeatureExtraction,
  type FAICharacteristic
} from "../engines/MastercamFAIBridge.js";

describe("MastercamFAIBridge", () => {
  const testFeatures: MastercamFeatureExtraction[] = [
    {
      feature_id: "BORE-001",
      feature_type: "bore",
      x: 50,
      y: 25,
      z: -10,
      nominal: 12.7,
      tolerance: { plus: 0.025, minus: 0.025 }
    },
    {
      feature_id: "LEN-001",
      feature_type: "length",
      x: 0,
      y: 0,
      z: 0,
      nominal: 100.0,
      tolerance: { plus: 0.05, minus: 0.05 }
    },
    {
      feature_id: "POS-001",
      feature_type: "position_hole",
      x: 25,
      y: 30,
      z: 0,
      nominal: 0,
      tolerance: { plus: 0.1, minus: 0.1 }
    }
  ];

  describe("extractCharacteristics", () => {
    it("should extract ballooned characteristics from features", () => {
      const chars = mastercamFAIBridge.extractCharacteristics(testFeatures);

      expect(chars.length).toBe(3);
      expect(chars[0].balloon_number).toBe(1);
      expect(chars[1].balloon_number).toBe(2);
      expect(chars[2].balloon_number).toBe(3);
    });

    it("should assign correct characteristic types", () => {
      const chars = mastercamFAIBridge.extractCharacteristics(testFeatures);

      expect(chars[2].characteristic_type).toBe("position"); // position_hole → position
    });

    it("should suggest measurement methods", () => {
      const chars = mastercamFAIBridge.extractCharacteristics(testFeatures);

      expect(chars[0].method).toBeTruthy(); // Should have a method
      expect(chars[0].equipment).toBeTruthy(); // Should have equipment
    });

    it("should format tolerances correctly", () => {
      const chars = mastercamFAIBridge.extractCharacteristics(testFeatures);

      expect(chars[0].tolerance_plus).toMatch(/^\+/);
      expect(chars[0].tolerance_minus).toMatch(/^-/);
    });
  });

  describe("createForm1", () => {
    it("should create FAI Form 1 with required fields", () => {
      const form1 = mastercamFAIBridge.createForm1(
        "PN-12345",
        "Widget Assembly",
        "A",
        "DWG-12345",
        "JM Die Company"
      );

      expect(form1.part_number).toBe("PN-12345");
      expect(form1.part_name).toBe("Widget Assembly");
      expect(form1.revision).toBe("A");
      expect(form1.drawing_number).toBe("DWG-12345");
      expect(form1.organization_name).toBe("JM Die Company");
      expect(form1.reason_for_fai).toBe("new_part");
      expect(form1.fai_report_number).toMatch(/^FAI-PN-12345-/);
    });

    it("should support different FAI reasons", () => {
      const form1 = mastercamFAIBridge.createForm1(
        "PN-12345", "Widget", "B", "DWG-12345", "Org", "design_change"
      );

      expect(form1.reason_for_fai).toBe("design_change");
    });
  });

  describe("createForm2", () => {
    it("should create FAI Form 2 with materials and processes", () => {
      const form2 = mastercamFAIBridge.createForm2(
        [{ material_spec: "AMS 5643", material_type: "17-4 PH", supplier: "Carpenter" }],
        [{ process_name: "Heat Treat", specification: "AMS 2759" }],
        [{ test_name: "Hardness", specification: "Rc 38-42", result: "PASS", date: "2024-01-15" }]
      );

      expect(form2.materials.length).toBe(1);
      expect(form2.special_processes.length).toBe(1);
      expect(form2.functional_tests.length).toBe(1);
    });
  });

  describe("createForm3", () => {
    it("should create FAI Form 3 with characteristic summary", () => {
      const chars: FAICharacteristic[] = [
        { balloon_number: 1, characteristic_designator: "A", characteristic_type: "dimension",
          nominal: "25.0000", tolerance_plus: "+0.0250", tolerance_minus: "-0.0250", result: "PASS" },
        { balloon_number: 2, characteristic_designator: "B", characteristic_type: "dimension",
          nominal: "50.0000", tolerance_plus: "+0.0500", tolerance_minus: "-0.0500", result: "PASS" },
        { balloon_number: 3, characteristic_designator: "C", characteristic_type: "dimension",
          nominal: "10.0000", tolerance_plus: "+0.0100", tolerance_minus: "-0.0100", result: "PENDING" }
      ];

      const form3 = mastercamFAIBridge.createForm3(chars);

      expect(form3.total_characteristics).toBe(3);
      expect(form3.passed).toBe(2);
      expect(form3.failed).toBe(0);
      expect(form3.pending).toBe(1);
      expect(form3.all_passed).toBe(false);
    });
  });

  describe("generateReport", () => {
    it("should generate complete FAI report", () => {
      const form1 = mastercamFAIBridge.createForm1("PN-001", "Test Part", "A", "DWG-001", "Org");
      const form2 = mastercamFAIBridge.createForm2();
      const chars = mastercamFAIBridge.extractCharacteristics(testFeatures);

      const report = mastercamFAIBridge.generateReport(form1, form2, chars);

      expect(report.form1).toBeDefined();
      expect(report.form2).toBeDefined();
      expect(report.form3).toBeDefined();
      expect(report.compliance).toBe("AS9102_Rev_C");
      expect(report.status).toBe("draft"); // Has pending items
    });
  });

  describe("applyMeasurements", () => {
    it("should apply measurements and determine pass/fail", () => {
      const chars = mastercamFAIBridge.extractCharacteristics(testFeatures);
      const measurements = [
        { balloon_number: 1, measured_value: 12.71 }, // Within tolerance
        { balloon_number: 2, measured_value: 100.08 }, // Outside tolerance
        { balloon_number: 3, measured_value: 0.05 }   // Within tolerance
      ];

      const updated = mastercamFAIBridge.applyMeasurements(chars, measurements);

      expect(updated[0].result).toBe("PASS");
      expect(updated[0].measured_value).toBe("12.7100");
      expect(updated[1].result).toBe("FAIL");
      expect(updated[2].result).toBe("PASS");
    });

    it("should calculate deviation correctly", () => {
      const chars = mastercamFAIBridge.extractCharacteristics(testFeatures);
      const measurements = [{ balloon_number: 1, measured_value: 12.72 }];

      const updated = mastercamFAIBridge.applyMeasurements(chars, measurements);

      expect(updated[0].deviation).toMatch(/^\+0\.0200/);
    });
  });

  describe("exportJSON", () => {
    it("should export report as valid JSON", () => {
      const form1 = mastercamFAIBridge.createForm1("PN-001", "Test", "A", "DWG-001", "Org");
      const form2 = mastercamFAIBridge.createForm2();
      const chars = mastercamFAIBridge.extractCharacteristics(testFeatures);
      const report = mastercamFAIBridge.generateReport(form1, form2, chars);

      const json = mastercamFAIBridge.exportJSON(report);
      const parsed = JSON.parse(json);

      expect(parsed.form1.part_number).toBe("PN-001");
    });
  });

  describe("generateBalloonData", () => {
    it("should generate balloon positions", () => {
      const chars = mastercamFAIBridge.extractCharacteristics(testFeatures);
      const balloons = mastercamFAIBridge.generateBalloonData(chars);

      expect(balloons.length).toBe(3);
      expect(balloons[0].balloon_number).toBe(1);
      expect(balloons[0].x).toBeGreaterThan(0);
      expect(balloons[0].y).toBeGreaterThan(0);
    });
  });

  describe("getStats", () => {
    it("should return FAI capabilities", () => {
      const stats = mastercamFAIBridge.getStats();

      expect(stats.forms_supported).toBe(3);
      expect(stats.compliance_standards).toContain("AS9102_Rev_C");
      expect(stats.characteristic_types).toBe(5);
    });
  });
});

describe("MastercamFAIBridge — dispatcher wiring (camDispatcher.ts)", () => {
  const MC_FAI_ACTIONS = [
    "cam_mastercam_fai_extract_characteristics",
    "cam_mastercam_fai_generate_report",
    "cam_mastercam_fai_apply_measurements",
    "cam_mastercam_fai_export_json",
    "cam_mastercam_fai_generate_balloon_data",
    "cam_mastercam_fai_get_stats",
  ] as const;

  const ACTION_COUNT_EXPECTED = 6;

  const dispatcherPath = `${process.cwd()}/src/tools/dispatchers/camDispatcher.ts`.replace(/\\/g, "/");

  const readDispatcher = async (): Promise<string> => {
    const fs = await import("node:fs/promises");
    return fs.readFile(dispatcherPath, "utf-8");
  };

  it("registers all 6 cam_mastercam_fai_* enum entries", async () => {
    const src = await readDispatcher();
    expect(MC_FAI_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    for (const action of MC_FAI_ACTIONS) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("declares the _mcFAI singleton", async () => {
    const src = await readDispatcher();
    expect(src).toMatch(/_mcFAI\s*:\s*any/);
  });

  it("registers an mcFAI case in the lazy getter switch", async () => {
    const src = await readDispatcher();
    const re =
      /case\s+"mcFAI"\s*:\s*return\s+_mcFAI\s*\?\?=\s*\(await\s+import\(\s*"\.\.\/\.\.\/engines\/MastercamFAIBridge\.js"\s*\)\)\.mastercamFAIBridge/;
    expect(re.test(src)).toBe(true);
  });

  it("declares matching case statements for every action", async () => {
    const src = await readDispatcher();
    for (const action of MC_FAI_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:`);
      expect(re.test(src)).toBe(true);
    }
  });

  it("every case body resolves the engine via getEngine(\"mcFAI\")", async () => {
    const src = await readDispatcher();
    for (const action of MC_FAI_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?getEngine\\("mcFAI"\\)[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("extract_characteristics case Array.isArray-guards features and reports count", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_fai_extract_characteristics"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("extractCharacteristics");
    expect(body).toContain("Array.isArray(params.features)");
    expect(body).toContain("count");
  });

  it("generate_report case typeof-guards form1+form2 to objects, Array.isArray-guards characteristics", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_fai_generate_report"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("generateReport");
    expect(body).toMatch(/typeof\s+params\.form1\s*===\s*"object"/);
    expect(body).toMatch(/typeof\s+params\.form2\s*===\s*"object"/);
    expect(body).toContain("Array.isArray(params.characteristics)");
  });

  it("apply_measurements case Array.isArray-guards both characteristics and measurements", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_fai_apply_measurements"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("applyMeasurements");
    expect(body).toContain("Array.isArray(params.characteristics)");
    expect(body).toContain("Array.isArray(params.measurements)");
  });

  it("export_json case typeof-guards report, returns json string + byteLength", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_fai_export_json"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("exportJSON");
    expect(body).toMatch(/typeof\s+params\.report\s*===\s*"object"/);
    expect(body).toContain("byteLength");
  });

  it("generate_balloon_data case Array.isArray-guards characteristics and reports count", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_fai_generate_balloon_data"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("generateBalloonData");
    expect(body).toContain("Array.isArray(params.characteristics)");
    expect(body).toContain("count");
  });

  it("get_stats case routes to getStats() and spreads roll-up", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_mastercam_fai_get_stats"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getStats()");
    expect(body).toMatch(/\.\.\.stats/);
  });

  it("each case sets result.success to true (consistent dispatcher contract)", async () => {
    const src = await readDispatcher();
    for (const action of MC_FAI_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });
});
