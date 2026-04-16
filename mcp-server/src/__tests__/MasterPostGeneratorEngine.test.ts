/**
 * MasterPostGeneratorEngine Tests
 *
 * Comprehensive test suite for the PRISM Master Post Processor Generator.
 * Tests all controller families, machine configurations, and mathematical algorithms.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  masterPostGeneratorEngine,
  MasterPostGeneratorEngine,
  calculateRPM,
  calculateFeedRate,
  calculateTappingFeed,
  calculatePeckDepths,
  calculateRetractDistance,
  type PostGeneratorConfig,
  type MachineConfiguration,
  type PostFeatures,
  type PostOutputOptions,
  type CAMSystem,
} from "../engines/MasterPostGeneratorEngine.js";
import type { ControllerFamily } from "../engines/ControllerKnowledgeEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const DEFAULT_FEATURES: PostFeatures = {
  rigid_tapping: true,
  peck_tapping: true,
  high_speed_machining: true,
  cutter_compensation: true,
  probing: false,
  tool_breakage_detection: false,
  chip_conveyor: false,
  coolant_through_spindle: false,
  rotary_clamps: true,
  tilted_work_plane: true,
  tcp_5axis: true,
};

const DEFAULT_OUTPUT_OPTIONS: PostOutputOptions = {
  line_numbers: true,
  line_number_increment: 10,
  coordinate_precision: 4,
  feed_precision: 1,
  block_delete: false,
  optional_stop: true,
  file_extension: "nc",
  program_number_prefix: "O",
  verbose_comments: true,
};

function createConfig(
  controller: ControllerFamily,
  machineConfig: MachineConfiguration = "3_axis_vmc",
  camSystem: CAMSystem = "mastercam"
): PostGeneratorConfig {
  return {
    controller,
    machine_model: "Test Machine",
    machine_config: machineConfig,
    cam_system: camSystem,
    units: "metric",
    features: { ...DEFAULT_FEATURES },
    output_options: { ...DEFAULT_OUTPUT_OPTIONS },
  };
}

// ============================================================================
// MATHEMATICAL ALGORITHM TESTS
// ============================================================================

describe("Mathematical Algorithms", () => {
  describe("calculateRPM", () => {
    it("should calculate RPM from SFM correctly", () => {
      // SFM = 300, diameter = 0.5 inch
      // RPM = (300 * 12) / (PI * 0.5) = 2292
      const rpm = calculateRPM(300, 0.5, false);
      expect(rpm).toBeCloseTo(2292, 0);
    });

    it("should calculate RPM from SMM correctly", () => {
      // SMM = 100, diameter = 10 mm
      // RPM = (100 * 1000) / (PI * 10) = 3183
      const rpm = calculateRPM(100, 10, true);
      expect(rpm).toBeCloseTo(3183, 0);
    });

    it("should return 0 for zero diameter", () => {
      const rpm = calculateRPM(300, 0, false);
      expect(rpm).toBe(0);
    });

    it("should handle small diameters", () => {
      // 1mm endmill at 100 SMM
      const rpm = calculateRPM(100, 1, true);
      expect(rpm).toBeCloseTo(31831, 0);
    });
  });

  describe("calculateFeedRate", () => {
    it("should calculate feed rate correctly", () => {
      // RPM = 1000, chip load = 0.005, 4 flutes
      // Feed = 1000 * 0.005 * 4 = 20
      const feed = calculateFeedRate(1000, 0.005, 4);
      expect(feed).toBe(20);
    });

    it("should handle single flute tools", () => {
      const feed = calculateFeedRate(5000, 0.002, 1);
      expect(feed).toBe(10);
    });
  });

  describe("calculateTappingFeed", () => {
    it("should calculate metric tapping feed correctly", () => {
      // M10x1.5, 500 RPM -> F = 500 * 1.5 = 750 mm/min
      const feed = calculateTappingFeed(500, 1.5, true);
      expect(feed).toBe(750);
    });

    it("should calculate inch tapping feed correctly", () => {
      // 1/4-20, 500 RPM -> F = 500 / 20 = 25 IPM
      const feed = calculateTappingFeed(500, 20, false);
      expect(feed).toBe(25);
    });
  });

  describe("calculatePeckDepths", () => {
    it("should generate correct peck depths", () => {
      // 10mm drill, 30mm depth
      const depths = calculatePeckDepths(10, 30, true);

      expect(depths.length).toBeGreaterThan(0);
      expect(depths[depths.length - 1]).toBe(30); // Last depth should be total depth
      expect(depths[0]).toBeCloseTo(10, 1); // First peck is ~1x diameter
    });

    it("should handle shallow holes", () => {
      // 10mm drill, 5mm depth (less than diameter)
      const depths = calculatePeckDepths(10, 5, true);

      expect(depths.length).toBe(1);
      expect(depths[0]).toBe(5);
    });
  });

  describe("calculateRetractDistance", () => {
    it("should return appropriate distances for different operations", () => {
      const drill = calculateRetractDistance("drilling", true);
      const tap = calculateRetractDistance("tapping", true);
      const bore = calculateRetractDistance("boring", true);
      const ream = calculateRetractDistance("reaming", true);

      expect(tap).toBeGreaterThan(drill); // Tapping needs more clearance
      expect(bore).toBeLessThan(drill); // Boring uses less
      expect(ream).toBeLessThan(tap);
    });

    it("should scale correctly for inch mode", () => {
      const metricDrill = calculateRetractDistance("drilling", true);
      const inchDrill = calculateRetractDistance("drilling", false);

      // Inch distances should be smaller numerically (0.1" vs 2mm)
      expect(inchDrill).toBeLessThan(metricDrill);
    });
  });
});

// ============================================================================
// SAFETY LINE GENERATION TESTS
// ============================================================================

describe("Safety Line Generation", () => {
  const controllers: ControllerFamily[] = [
    "hurco_winmax",
    "haas_ngc",
    "fanuc",
    "okuma_osp",
    "heidenhain_tnc",
    "siemens_sinumerik",
    "mazatrol",
    "brother_c00",
  ];

  const machineConfigs: MachineConfiguration[] = [
    "3_axis_vmc",
    "4_axis_rotary_table",
    "5_axis_table_table",
    "mill_turn",
  ];

  for (const controller of controllers) {
    describe(`${controller}`, () => {
      for (const machineConfig of machineConfigs) {
        it(`should generate safety line for ${machineConfig}`, () => {
          const safetyLine = masterPostGeneratorEngine.generateSafetyLine(controller, machineConfig);

          expect(safetyLine).toBeTruthy();
          expect(safetyLine.length).toBeGreaterThan(5);

          // Safety lines should contain essential G-codes
          if (controller !== "heidenhain_tnc") {
            expect(safetyLine).toMatch(/G[0-9]+/); // Has G-codes
            expect(safetyLine).toMatch(/M0[5|9]/); // Has spindle/coolant off
          }
        });
      }

      it("should include rotary axis handling for 4/5-axis", () => {
        const safety5Axis = masterPostGeneratorEngine.generateSafetyLine(controller, "5_axis_table_table");

        // Most 5-axis safety lines include A and C positioning
        if (controller !== "heidenhain_tnc" && controller !== "siemens_sinumerik") {
          // Should have rotary axis reference or clamp commands
          const hasRotary = safety5Axis.includes("A") || safety5Axis.includes("C") ||
                           safety5Axis.includes("clamp") || safety5Axis.includes("Clamp") ||
                           safety5Axis.includes("M1") || safety5Axis.includes("M3");
          expect(hasRotary).toBe(true);
        }
      });
    });
  }
});

// ============================================================================
// CYCLE DEFINITION GENERATION TESTS
// ============================================================================

describe("Cycle Definition Generation", () => {
  it("should generate drilling cycles for all controllers", () => {
    const controllers: ControllerFamily[] = [
      "hurco_winmax",
      "haas_ngc",
      "fanuc",
      "okuma_osp",
      "siemens_sinumerik",
    ];

    for (const controller of controllers) {
      const cycles = masterPostGeneratorEngine.generateCycleDefinitions(controller);

      expect(cycles.length).toBeGreaterThan(0);

      // Should have basic drilling cycle
      const drilling = cycles.find(c => c.name.toLowerCase().includes("drill") && !c.name.toLowerCase().includes("peck"));
      expect(drilling).toBeTruthy();
      expect(drilling?.gCode).toBeTruthy();
    }
  });

  it("should include tapping cycles", () => {
    const cycles = masterPostGeneratorEngine.generateCycleDefinitions("haas_ngc");

    const tapping = cycles.find(c => c.name.toLowerCase().includes("tap"));
    expect(tapping).toBeTruthy();
    expect(tapping?.gCode).toMatch(/G[78][04]/); // G84, G74, G77, G78
  });

  it("should include boring cycles", () => {
    const cycles = masterPostGeneratorEngine.generateCycleDefinitions("fanuc");

    const boring = cycles.find(c => c.name.toLowerCase().includes("bore") || c.name.toLowerCase().includes("boring"));
    expect(boring).toBeTruthy();
  });

  it("should include peck drilling", () => {
    const cycles = masterPostGeneratorEngine.generateCycleDefinitions("hurco_winmax");

    const peck = cycles.find(c => c.name.toLowerCase().includes("peck") && c.name.toLowerCase().includes("drill"));
    expect(peck).toBeTruthy();
    expect(peck?.gCode).toMatch(/G[78]3/); // G83 or G73
  });
});

// ============================================================================
// M-CODE MAPPING GENERATION TESTS
// ============================================================================

describe("M-Code Mapping Generation", () => {
  it("should generate M-code mappings for all controllers", () => {
    const controllers: ControllerFamily[] = [
      "hurco_winmax",
      "haas_ngc",
      "fanuc",
      "okuma_osp",
      "siemens_sinumerik",
      "brother_c00",
    ];

    for (const controller of controllers) {
      const mCodes = masterPostGeneratorEngine.generateMCodeMappings(controller);

      expect(mCodes.length).toBeGreaterThan(0);

      // Should have essential M-codes
      const m3 = mCodes.find(m => m.mCode === 3);
      const m5 = mCodes.find(m => m.mCode === 5);
      const m6 = mCodes.find(m => m.mCode === 6);

      expect(m3).toBeTruthy(); // Spindle CW
      expect(m5).toBeTruthy(); // Spindle stop
      expect(m6).toBeTruthy(); // Tool change
    }
  });

  it("should categorize M-codes correctly", () => {
    const mCodes = masterPostGeneratorEngine.generateMCodeMappings("haas_ngc");

    const spindle = mCodes.filter(m => m.category === "spindle");
    const coolant = mCodes.filter(m => m.category === "coolant");
    const tool = mCodes.filter(m => m.category === "tool");

    expect(spindle.length).toBeGreaterThan(0);
    expect(coolant.length).toBeGreaterThan(0);
    expect(tool.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// PROPERTY GENERATION TESTS
// ============================================================================

describe("Property Generation", () => {
  it("should generate common properties for all controllers", () => {
    const properties = masterPostGeneratorEngine.generateProperties(
      "fanuc",
      DEFAULT_FEATURES,
      "3_axis_vmc"
    );

    expect(properties.length).toBeGreaterThan(0);

    // Should have sequence number property
    const seqNum = properties.find(p => p.name === "showSequenceNumbers");
    expect(seqNum).toBeTruthy();
    expect(seqNum?.type).toBe("boolean");
  });

  it("should generate Hurco-specific properties", () => {
    const properties = masterPostGeneratorEngine.generateProperties(
      "hurco_winmax",
      DEFAULT_FEATURES,
      "5_axis_table_table"
    );

    const isnc = properties.find(p => p.name === "useISNC");
    const ultimotion = properties.find(p => p.name === "useUltiMotion");
    const m140 = properties.find(p => p.name === "useM140Retract");
    const tcpm = properties.find(p => p.name === "useTCPM");

    expect(isnc).toBeTruthy();
    expect(ultimotion).toBeTruthy();
    expect(m140).toBeTruthy(); // Only for 5-axis
    expect(tcpm).toBeTruthy(); // Only for 5-axis
  });

  it("should generate Haas-specific properties", () => {
    const properties = masterPostGeneratorEngine.generateProperties(
      "haas_ngc",
      DEFAULT_FEATURES,
      "5_axis_table_table"
    );

    const smoothing = properties.find(p => p.name === "smoothingLevel");
    const tcpc = properties.find(p => p.name === "useTCPC");

    expect(smoothing).toBeTruthy();
    expect(smoothing?.type).toBe("enum");
    expect(smoothing?.enum_values).toContain("P1");
    expect(smoothing?.enum_values).toContain("P2");
    expect(smoothing?.enum_values).toContain("P3");
    expect(tcpc).toBeTruthy();
  });

  it("should generate Okuma-specific properties", () => {
    const properties = masterPostGeneratorEngine.generateProperties(
      "okuma_osp",
      DEFAULT_FEATURES,
      "5_axis_table_table"
    );

    const g15 = properties.find(p => p.name === "useG15WorkOffset");
    const nurbs = properties.find(p => p.name === "useSuperNURBS");
    const cas = properties.find(p => p.name === "useCAS");

    expect(g15).toBeTruthy();
    expect(nurbs).toBeTruthy();
    expect(cas).toBeTruthy(); // 5-axis only
  });

  it("should generate Siemens-specific properties", () => {
    const properties = masterPostGeneratorEngine.generateProperties(
      "siemens_sinumerik",
      DEFAULT_FEATURES,
      "5_axis_table_table"
    );

    const cycle832 = properties.find(p => p.name === "useCYCLE832");
    const cycle832Level = properties.find(p => p.name === "cycle832Level");
    const swivelRecord = properties.find(p => p.name === "cycle800SwivelDataRecord");

    expect(cycle832).toBeTruthy();
    expect(cycle832Level).toBeTruthy();
    expect(cycle832Level?.type).toBe("enum");
    expect(swivelRecord).toBeTruthy();
    expect(swivelRecord?.type).toBe("string");
  });

  it("should generate Brother-specific properties", () => {
    const properties = masterPostGeneratorEngine.generateProperties(
      "brother_c00",
      { ...DEFAULT_FEATURES, coolant_through_spindle: true },
      "3_axis_vmc"
    );

    const g77g78 = properties.find(p => p.name === "useG77G78Tapping");
    const highAccuracy = properties.find(p => p.name === "highAccuracyMode");
    const tsc = properties.find(p => p.name === "useTSC");

    expect(g77g78).toBeTruthy();
    expect(highAccuracy).toBeTruthy();
    expect(highAccuracy?.type).toBe("enum");
    expect(tsc).toBeTruthy();
  });
});

// ============================================================================
// COMPLETE POST GENERATION TESTS
// ============================================================================

describe("Complete Post Generation", () => {
  const testControllers: ControllerFamily[] = [
    "hurco_winmax",
    "haas_ngc",
    "fanuc",
    "okuma_osp",
    "heidenhain_tnc",
    "siemens_sinumerik",
    "mazatrol",
    "brother_c00",
  ];

  for (const controller of testControllers) {
    describe(`${controller}`, () => {
      it("should generate complete post for 3-axis VMC", () => {
        const config = createConfig(controller, "3_axis_vmc");
        const result = masterPostGeneratorEngine.generateCompletePost(config);

        expect(result.code).toBeTruthy();
        expect(result.code.length).toBeGreaterThan(1000);
        expect(result.metadata.controller).toBe(controller);
        expect(result.metadata.machine_config).toBe("3_axis_vmc");
        expect(result.metadata.lines_of_code).toBeGreaterThan(100);
      });

      it("should generate complete post for 5-axis table-table", () => {
        const config = createConfig(controller, "5_axis_table_table");
        const result = masterPostGeneratorEngine.generateCompletePost(config);

        expect(result.code).toBeTruthy();
        expect(result.code.length).toBeGreaterThan(1000);

        // 5-axis posts should have TCP functions
        if (controller !== "mazatrol") {
          expect(result.code).toMatch(/tcp|TCPM|TRAORI|G234|G43\.4/i);
        }
      });

      it("should include safety line in generated code", () => {
        const config = createConfig(controller, "3_axis_vmc");
        const result = masterPostGeneratorEngine.generateCompletePost(config);

        expect(result.safety_line).toBeTruthy();
        expect(result.code).toContain("SAFETY LINE");
      });

      it("should include cycle implementations", () => {
        const config = createConfig(controller, "3_axis_vmc");
        const result = masterPostGeneratorEngine.generateCompletePost(config);

        expect(result.cycles.length).toBeGreaterThan(0);
        expect(result.code).toContain("onCyclePoint");
        expect(result.code).toContain("drilling");
        expect(result.code).toContain("tapping");
      });

      it("should include M-code documentation", () => {
        const config = createConfig(controller, "3_axis_vmc");
        const result = masterPostGeneratorEngine.generateCompletePost(config);

        expect(result.m_codes.length).toBeGreaterThan(0);
        expect(result.code).toContain("M-CODE MAPPINGS");
      });

      it("should include tribal knowledge tips", () => {
        const config = createConfig(controller, "3_axis_vmc");
        const result = masterPostGeneratorEngine.generateCompletePost(config);

        // May or may not have tips depending on controller
        if (result.tribal_tips.length > 0) {
          expect(result.code).toContain("TRIBAL KNOWLEDGE");
        }
      });
    });
  }

  it("should generate valid post header", () => {
    const config = createConfig("haas_ngc", "3_axis_vmc", "fusion360");
    const result = masterPostGeneratorEngine.generateCompletePost(config);

    expect(result.code).toContain("Post Processor");
    expect(result.code).toContain("haas_ngc");
    expect(result.code).toContain("fusion360");
    expect(result.code).toContain("PRISM MasterPostGeneratorEngine");
  });

  it("should set correct file extension", () => {
    // Create configs without file_extension to test controller defaults
    const okumaConfig: PostGeneratorConfig = {
      ...createConfig("okuma_osp", "3_axis_vmc"),
      output_options: { ...DEFAULT_OUTPUT_OPTIONS, file_extension: "" },
    };
    const okumaResult = masterPostGeneratorEngine.generateCompletePost(okumaConfig);
    expect(okumaResult.code).toContain('extension = "min"');

    const siemensConfig: PostGeneratorConfig = {
      ...createConfig("siemens_sinumerik", "3_axis_vmc"),
      output_options: { ...DEFAULT_OUTPUT_OPTIONS, file_extension: "" },
    };
    const siemensResult = masterPostGeneratorEngine.generateCompletePost(siemensConfig);
    expect(siemensResult.code).toContain('extension = "mpf"');

    const heidenhainConfig: PostGeneratorConfig = {
      ...createConfig("heidenhain_tnc", "3_axis_vmc"),
      output_options: { ...DEFAULT_OUTPUT_OPTIONS, file_extension: "" },
    };
    const heidenhainResult = masterPostGeneratorEngine.generateCompletePost(heidenhainConfig);
    expect(heidenhainResult.code).toContain('extension = "h"');
  });

  it("should include JM Die specific options when provided", () => {
    const config: PostGeneratorConfig = {
      ...createConfig("hurco_winmax", "3_axis_vmc"),
      jm_die_options: {
        use_jm_die_tooling: true,
        customer_header: "ALCOA DIE SET #12345",
        include_tribal_tips: true,
      },
    };
    const result = masterPostGeneratorEngine.generateCompletePost(config);

    expect(result.code).toContain("ALCOA DIE SET #12345");
  });
});

// ============================================================================
// CONTROLLER-SPECIFIC FEATURE TESTS
// ============================================================================

describe("Controller-Specific Features", () => {
  describe("Hurco WinMax", () => {
    it("should include ISNC mode handling", () => {
      const config = createConfig("hurco_winmax", "3_axis_vmc");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("ISNC");
      expect(result.code).toContain("useISNC");
    });

    it("should include UltiMotion for HSM", () => {
      const config = createConfig("hurco_winmax", "3_axis_vmc");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("UltiMotion");
    });

    it("should include M29 for rigid tapping", () => {
      const config = createConfig("hurco_winmax", "3_axis_vmc");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("M29") || expect(result.code).toContain("mFormat.format(29)");
    });
  });

  describe("Haas NGC", () => {
    it("should include G187 smoothing levels", () => {
      const config = createConfig("haas_ngc", "3_axis_vmc");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("G187");
      expect(result.code).toContain("P1");
      expect(result.code).toContain("P2");
      expect(result.code).toContain("P3");
    });

    it("should include G95 for tapping", () => {
      const config = createConfig("haas_ngc", "3_axis_vmc");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("G95") || expect(result.code).toContain("IPR");
    });

    it("should include G234 TCPC for 5-axis", () => {
      const config = createConfig("haas_ngc", "5_axis_table_table");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("G234") || expect(result.code).toContain("TCPC");
    });
  });

  describe("Okuma OSP", () => {
    it("should include G15 H## work offsets", () => {
      const config = createConfig("okuma_osp", "3_axis_vmc");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("G15");
    });

    it("should include G08 Super-NURBS", () => {
      const config = createConfig("okuma_osp", "3_axis_vmc");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("G08") || expect(result.code).toContain("Super-NURBS");
    });

    it("should include CAS M510/M511 for 5-axis", () => {
      const config = createConfig("okuma_osp", "5_axis_table_table");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("M511") || expect(result.code).toContain("CAS");
    });
  });

  describe("Siemens SINUMERIK", () => {
    it("should include CYCLE832 for HSM", () => {
      const config = createConfig("siemens_sinumerik", "3_axis_vmc");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("CYCLE832");
    });

    it("should include TRAORI for 5-axis TCP", () => {
      const config = createConfig("siemens_sinumerik", "5_axis_table_table");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("TRAORI");
    });

    it("should include CYCLE800 for tilted work plane", () => {
      const config = createConfig("siemens_sinumerik", "5_axis_table_table");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("CYCLE800");
    });
  });

  describe("Brother C00/Speedio", () => {
    it("should include G77/G78 tapping", () => {
      const config = createConfig("brother_c00", "3_axis_vmc");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("G77") || expect(result.code).toContain("gFormat.format(77)");
    });

    it("should include M298 high accuracy mode", () => {
      const config = createConfig("brother_c00", "3_axis_vmc");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("M298");
    });
  });

  describe("Heidenhain TNC", () => {
    it("should use Klartext format", () => {
      const config = createConfig("heidenhain_tnc", "3_axis_vmc");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("BEGIN PGM");
      expect(result.code).toContain("END PGM");
    });

    it("should include PLANE SPATIAL for tilted work plane", () => {
      const config = createConfig("heidenhain_tnc", "5_axis_table_table");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("PLANE");
    });

    it("should include M128/M129 TCPM", () => {
      const config = createConfig("heidenhain_tnc", "5_axis_table_table");
      const result = masterPostGeneratorEngine.generateCompletePost(config);

      expect(result.code).toContain("M128") || expect(result.code).toContain("M129");
    });
  });
});

// ============================================================================
// MACHINE CONFIGURATION TESTS
// ============================================================================

describe("Machine Configuration Handling", () => {
  it("should handle 4-axis rotary table", () => {
    const config = createConfig("haas_ngc", "4_axis_rotary_table");
    const result = masterPostGeneratorEngine.generateCompletePost(config);

    expect(result.code).toContain("aOutput");
    expect(result.safety_line).toContain("M10") || expect(result.safety_line).toContain("M11");
  });

  it("should handle 4-axis trunnion", () => {
    const config = createConfig("hurco_winmax", "4_axis_trunnion");
    const result = masterPostGeneratorEngine.generateCompletePost(config);

    expect(result.code).toContain("aOutput");
  });

  it("should handle 5-axis head-head configuration", () => {
    const config = createConfig("fanuc", "5_axis_head_head");
    const result = masterPostGeneratorEngine.generateCompletePost(config);

    expect(result.code).toContain("aOutput");
    expect(result.code).toContain("bOutput");
    expect(result.code).toContain("cOutput");
  });

  it("should handle mill-turn configuration", () => {
    const config = createConfig("mazatrol", "mill_turn");
    const result = masterPostGeneratorEngine.generateCompletePost(config);

    expect(result.metadata.machine_config).toBe("mill_turn");
  });

  it("should handle swiss-type configuration", () => {
    const config = createConfig("fanuc", "swiss_type");
    const result = masterPostGeneratorEngine.generateCompletePost(config);

    expect(result.metadata.machine_config).toBe("swiss_type");
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe("Error Handling", () => {
  it("should throw for unknown controller", () => {
    const config = createConfig("unknown_controller" as ControllerFamily, "3_axis_vmc");

    expect(() => masterPostGeneratorEngine.generateCompletePost(config)).toThrow("Unknown controller");
  });

  it("should use fallback safety line for unknown machine config", () => {
    // This tests the internal fallback mechanism
    const safetyLine = masterPostGeneratorEngine.generateSafetyLine("fanuc", "unknown_config" as MachineConfiguration);

    // Should fall back to 3-axis VMC or generic
    expect(safetyLine).toBeTruthy();
    expect(safetyLine).toContain("G");
  });
});

// ============================================================================
// METADATA TESTS
// ============================================================================

describe("Metadata Generation", () => {
  it("should include correct version", () => {
    const config = createConfig("haas_ngc", "3_axis_vmc");
    const result = masterPostGeneratorEngine.generateCompletePost(config);

    expect(result.metadata.generator_version).toBe("1.0.0");
  });

  it("should include timestamp", () => {
    const config = createConfig("haas_ngc", "3_axis_vmc");
    const result = masterPostGeneratorEngine.generateCompletePost(config);

    expect(result.metadata.generated_at).toBeTruthy();
    expect(new Date(result.metadata.generated_at).getTime()).toBeGreaterThan(0);
  });

  it("should count lines of code", () => {
    const config = createConfig("haas_ngc", "3_axis_vmc");
    const result = masterPostGeneratorEngine.generateCompletePost(config);

    const actualLines = result.code.split("\n").length;
    expect(result.metadata.lines_of_code).toBe(actualLines);
  });

  it("should count cycles and M-codes", () => {
    const config = createConfig("fanuc", "3_axis_vmc");
    const result = masterPostGeneratorEngine.generateCompletePost(config);

    expect(result.metadata.cycles_count).toBe(result.cycles.length);
    expect(result.metadata.mcodes_count).toBe(result.m_codes.length);
  });
});

// ============================================================================
// SINGLETON EXPORT TESTS
// ============================================================================

describe("Engine Export", () => {
  it("should export singleton instance", () => {
    expect(masterPostGeneratorEngine).toBeInstanceOf(MasterPostGeneratorEngine);
  });

  it("should have all required methods", () => {
    expect(typeof masterPostGeneratorEngine.generateCompletePost).toBe("function");
    expect(typeof masterPostGeneratorEngine.generateSafetyLine).toBe("function");
    expect(typeof masterPostGeneratorEngine.generateCycleDefinitions).toBe("function");
    expect(typeof masterPostGeneratorEngine.generateMCodeMappings).toBe("function");
    expect(typeof masterPostGeneratorEngine.generateProperties).toBe("function");
  });
});
