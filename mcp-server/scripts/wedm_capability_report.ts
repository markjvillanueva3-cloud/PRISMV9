#!/usr/bin/env npx ts-node
/**
 * WEDM Controller Capability Report Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Generates capability matrix for Wire EDM controllers.
 * Leverages: EDMPostProcessGCodeEngine, ShopConfigurationEngine
 *
 * Usage: npx ts-node scripts/wedm_capability_report.ts --controllers all
 */

import * as fs from "fs";

interface ControllerCapability {
  controller: string;
  brand: string;
  model: string;
  capabilities: {
    // Travel
    xTravel_mm: number;
    yTravel_mm: number;
    zTravel_mm: number;
    uvTravel_mm: number;
    maxTaper_deg: number;
    maxWorkpiece_mm: { x: number; y: number; z: number };

    // Wire
    supportedWireDiameters_mm: number[];
    autoThreading: boolean;
    autoWireChange: boolean;
    submergedCutting: boolean;

    // Axes
    simultaneousAxes: number;
    rotaryAxis: boolean;
    cAxis: boolean;

    // Features
    adaptiveControl: boolean;
    antiElectrolysis: boolean;
    cornerControl: boolean;
    autoEdgeFind: boolean;
    collisionAvoidance: boolean;

    // Programming
    supportedCodes: string[];
    maxPrograms: number;
    networkCapable: boolean;
    usbSupport: boolean;

    // Performance
    maxMRR_mm2Min: number;
    minRa_um: number;
    positionAccuracy_mm: number;
  };
  gCodeDialect: {
    coordSystem: "G54-G59" | "G92" | "custom";
    unitDefault: "G21" | "G20";
    arcFormat: "IJK" | "R";
    taperCodes: string[];
    eCodes: boolean;
    hCodes: boolean;
    customMCodes: string[];
  };
  postProcessor: {
    available: boolean;
    name: string;
    version: string;
  };
}

const CONTROLLERS: ControllerCapability[] = [
  {
    controller: "mitsubishi_fa",
    brand: "Mitsubishi",
    model: "FA-20S",
    capabilities: {
      xTravel_mm: 400,
      yTravel_mm: 300,
      zTravel_mm: 310,
      uvTravel_mm: 120,
      maxTaper_deg: 30,
      maxWorkpiece_mm: { x: 810, y: 560, z: 400 },
      supportedWireDiameters_mm: [0.10, 0.15, 0.20, 0.25, 0.30],
      autoThreading: true,
      autoWireChange: false,
      submergedCutting: true,
      simultaneousAxes: 5,
      rotaryAxis: false,
      cAxis: false,
      adaptiveControl: true,
      antiElectrolysis: true,
      cornerControl: true,
      autoEdgeFind: true,
      collisionAvoidance: true,
      supportedCodes: ["G00", "G01", "G02", "G03", "G40", "G41", "G42", "G51", "G52", "G90", "G91", "M00", "M02", "M30"],
      maxPrograms: 999,
      networkCapable: true,
      usbSupport: true,
      maxMRR_mm2Min: 350,
      minRa_um: 0.15,
      positionAccuracy_mm: 0.002,
    },
    gCodeDialect: {
      coordSystem: "G54-G59",
      unitDefault: "G21",
      arcFormat: "IJK",
      taperCodes: ["G51", "G52"],
      eCodes: true,
      hCodes: true,
      customMCodes: ["M98", "M99", "M60", "M61", "M62"],
    },
    postProcessor: {
      available: true,
      name: "MitsubishiFAPostEngine",
      version: "2.1.0",
    },
  },
  {
    controller: "fanuc_alpha",
    brand: "Fanuc",
    model: "Robocut Alpha-C600iB",
    capabilities: {
      xTravel_mm: 600,
      yTravel_mm: 400,
      zTravel_mm: 350,
      uvTravel_mm: 150,
      maxTaper_deg: 45,
      maxWorkpiece_mm: { x: 1050, y: 770, z: 400 },
      supportedWireDiameters_mm: [0.10, 0.15, 0.20, 0.25, 0.30, 0.35],
      autoThreading: true,
      autoWireChange: true,
      submergedCutting: true,
      simultaneousAxes: 5,
      rotaryAxis: true,
      cAxis: true,
      adaptiveControl: true,
      antiElectrolysis: true,
      cornerControl: true,
      autoEdgeFind: true,
      collisionAvoidance: true,
      supportedCodes: ["G00", "G01", "G02", "G03", "G40", "G41", "G42", "G51", "G52", "G90", "G91", "G92", "M00", "M02", "M30"],
      maxPrograms: 9999,
      networkCapable: true,
      usbSupport: true,
      maxMRR_mm2Min: 450,
      minRa_um: 0.10,
      positionAccuracy_mm: 0.001,
    },
    gCodeDialect: {
      coordSystem: "G54-G59",
      unitDefault: "G21",
      arcFormat: "IJK",
      taperCodes: ["G51", "G52", "G07.1"],
      eCodes: true,
      hCodes: true,
      customMCodes: ["M98", "M99", "M72", "M73", "M74"],
    },
    postProcessor: {
      available: true,
      name: "FanucWirePostEngine",
      version: "1.8.0",
    },
  },
  {
    controller: "sodick_lq",
    brand: "Sodick",
    model: "LQ35W",
    capabilities: {
      xTravel_mm: 350,
      yTravel_mm: 250,
      zTravel_mm: 200,
      uvTravel_mm: 80,
      maxTaper_deg: 30,
      maxWorkpiece_mm: { x: 560, y: 410, z: 200 },
      supportedWireDiameters_mm: [0.10, 0.15, 0.20, 0.25],
      autoThreading: true,
      autoWireChange: false,
      submergedCutting: true,
      simultaneousAxes: 4,
      rotaryAxis: false,
      cAxis: false,
      adaptiveControl: true,
      antiElectrolysis: true,
      cornerControl: true,
      autoEdgeFind: true,
      collisionAvoidance: false,
      supportedCodes: ["G00", "G01", "G02", "G03", "G40", "G41", "G42", "G90", "G91", "M00", "M02", "M30"],
      maxPrograms: 500,
      networkCapable: true,
      usbSupport: true,
      maxMRR_mm2Min: 280,
      minRa_um: 0.20,
      positionAccuracy_mm: 0.002,
    },
    gCodeDialect: {
      coordSystem: "G54-G59",
      unitDefault: "G21",
      arcFormat: "R",
      taperCodes: ["G51", "G52"],
      eCodes: true,
      hCodes: false,
      customMCodes: ["M98", "M99"],
    },
    postProcessor: {
      available: true,
      name: "SodickPostEngine",
      version: "1.2.0",
    },
  },
  {
    controller: "agiecharmilles_cut",
    brand: "AgieCharmilles",
    model: "CUT 300",
    capabilities: {
      xTravel_mm: 320,
      yTravel_mm: 250,
      zTravel_mm: 256,
      uvTravel_mm: 80,
      maxTaper_deg: 30,
      maxWorkpiece_mm: { x: 720, y: 550, z: 256 },
      supportedWireDiameters_mm: [0.15, 0.20, 0.25, 0.30],
      autoThreading: true,
      autoWireChange: false,
      submergedCutting: true,
      simultaneousAxes: 5,
      rotaryAxis: false,
      cAxis: false,
      adaptiveControl: true,
      antiElectrolysis: true,
      cornerControl: true,
      autoEdgeFind: true,
      collisionAvoidance: true,
      supportedCodes: ["G00", "G01", "G02", "G03", "G40", "G41", "G42", "G90", "G91", "M00", "M02", "M30"],
      maxPrograms: 1000,
      networkCapable: true,
      usbSupport: true,
      maxMRR_mm2Min: 320,
      minRa_um: 0.15,
      positionAccuracy_mm: 0.001,
    },
    gCodeDialect: {
      coordSystem: "G54-G59",
      unitDefault: "G21",
      arcFormat: "IJK",
      taperCodes: ["G51", "G52", "G141"],
      eCodes: false,
      hCodes: false,
      customMCodes: ["M98", "M99", "M100", "M101"],
    },
    postProcessor: {
      available: true,
      name: "AgieCharmillesPostEngine",
      version: "1.0.0",
    },
  },
  {
    controller: "makino_u",
    brand: "Makino",
    model: "U6 H.E.A.T.",
    capabilities: {
      xTravel_mm: 650,
      yTravel_mm: 450,
      zTravel_mm: 400,
      uvTravel_mm: 200,
      maxTaper_deg: 60,
      maxWorkpiece_mm: { x: 1020, y: 760, z: 400 },
      supportedWireDiameters_mm: [0.10, 0.15, 0.20, 0.25, 0.30],
      autoThreading: true,
      autoWireChange: true,
      submergedCutting: true,
      simultaneousAxes: 5,
      rotaryAxis: true,
      cAxis: true,
      adaptiveControl: true,
      antiElectrolysis: true,
      cornerControl: true,
      autoEdgeFind: true,
      collisionAvoidance: true,
      supportedCodes: ["G00", "G01", "G02", "G03", "G40", "G41", "G42", "G51", "G52", "G90", "G91", "M00", "M02", "M30"],
      maxPrograms: 9999,
      networkCapable: true,
      usbSupport: true,
      maxMRR_mm2Min: 500,
      minRa_um: 0.08,
      positionAccuracy_mm: 0.001,
    },
    gCodeDialect: {
      coordSystem: "G54-G59",
      unitDefault: "G21",
      arcFormat: "IJK",
      taperCodes: ["G51", "G52", "G07"],
      eCodes: true,
      hCodes: true,
      customMCodes: ["M98", "M99", "M80", "M81", "M82"],
    },
    postProcessor: {
      available: true,
      name: "MakinoWirePostEngine",
      version: "1.5.0",
    },
  },
];

interface CapabilityReport {
  timestamp: string;
  totalControllers: number;
  controllers: ControllerCapability[];
  comparisonMatrix: {
    feature: string;
    values: Record<string, string | number | boolean>;
  }[];
  recommendations: {
    forPrecision: string;
    forSpeed: string;
    forTaper: string;
    forVersatility: string;
  };
}

function generateReport(controllers: ControllerCapability[]): CapabilityReport {
  const features = [
    { feature: "X Travel (mm)", key: "xTravel_mm" },
    { feature: "Y Travel (mm)", key: "yTravel_mm" },
    { feature: "Max Taper (°)", key: "maxTaper_deg" },
    { feature: "Max MRR (mm²/min)", key: "maxMRR_mm2Min" },
    { feature: "Min Ra (µm)", key: "minRa_um" },
    { feature: "Position Accuracy (mm)", key: "positionAccuracy_mm" },
    { feature: "Auto Threading", key: "autoThreading" },
    { feature: "Auto Wire Change", key: "autoWireChange" },
    { feature: "Rotary Axis", key: "rotaryAxis" },
    { feature: "Collision Avoidance", key: "collisionAvoidance" },
  ];

  const comparisonMatrix = features.map((f) => {
    const values: Record<string, any> = {};
    for (const ctrl of controllers) {
      values[ctrl.model] = (ctrl.capabilities as any)[f.key];
    }
    return { feature: f.feature, values };
  });

  // Find best for each category
  const byPrecision = [...controllers].sort(
    (a, b) => a.capabilities.minRa_um - b.capabilities.minRa_um
  )[0];
  const bySpeed = [...controllers].sort(
    (a, b) => b.capabilities.maxMRR_mm2Min - a.capabilities.maxMRR_mm2Min
  )[0];
  const byTaper = [...controllers].sort(
    (a, b) => b.capabilities.maxTaper_deg - a.capabilities.maxTaper_deg
  )[0];
  const byVersatility = [...controllers].sort((a, b) => {
    const scoreA =
      (a.capabilities.rotaryAxis ? 1 : 0) +
      (a.capabilities.autoWireChange ? 1 : 0) +
      (a.capabilities.cAxis ? 1 : 0) +
      a.capabilities.simultaneousAxes;
    const scoreB =
      (b.capabilities.rotaryAxis ? 1 : 0) +
      (b.capabilities.autoWireChange ? 1 : 0) +
      (b.capabilities.cAxis ? 1 : 0) +
      b.capabilities.simultaneousAxes;
    return scoreB - scoreA;
  })[0];

  return {
    timestamp: new Date().toISOString(),
    totalControllers: controllers.length,
    controllers,
    comparisonMatrix,
    recommendations: {
      forPrecision: `${byPrecision.brand} ${byPrecision.model} (${byPrecision.capabilities.minRa_um} µm)`,
      forSpeed: `${bySpeed.brand} ${bySpeed.model} (${bySpeed.capabilities.maxMRR_mm2Min} mm²/min)`,
      forTaper: `${byTaper.brand} ${byTaper.model} (${byTaper.capabilities.maxTaper_deg}°)`,
      forVersatility: `${byVersatility.brand} ${byVersatility.model}`,
    },
  };
}

function printReport(report: CapabilityReport): void {
  console.log("\n" + "=".repeat(80));
  console.log("WEDM CONTROLLER CAPABILITY REPORT");
  console.log("=".repeat(80));
  console.log(`Generated: ${report.timestamp}`);
  console.log(`Controllers Analyzed: ${report.totalControllers}`);

  console.log("\n--- Comparison Matrix ---");
  const models = report.controllers.map((c) => c.model);
  console.log("Feature".padEnd(25) + models.map((m) => m.padEnd(15)).join(""));
  console.log("-".repeat(80));

  for (const row of report.comparisonMatrix) {
    const vals = models.map((m) => {
      const v = row.values[m];
      return (typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)).padEnd(15);
    }).join("");
    console.log(row.feature.padEnd(25) + vals);
  }

  console.log("\n--- Recommendations ---");
  console.log(`Best for Precision: ${report.recommendations.forPrecision}`);
  console.log(`Best for Speed: ${report.recommendations.forSpeed}`);
  console.log(`Best for Taper: ${report.recommendations.forTaper}`);
  console.log(`Best for Versatility: ${report.recommendations.forVersatility}`);

  console.log("\n--- Post Processor Status ---");
  for (const ctrl of report.controllers) {
    const status = ctrl.postProcessor.available ? "Available" : "NOT AVAILABLE";
    console.log(`${ctrl.model}: ${status} (${ctrl.postProcessor.name} v${ctrl.postProcessor.version})`);
  }

  console.log("\n" + "=".repeat(80));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  let filterBrands: string[] = [];

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--controllers":
      case "-c":
        const val = args[++i];
        if (val !== "all") {
          filterBrands = val.split(",");
        }
        break;
      case "--help":
      case "-h":
        console.log("Usage: npx ts-node scripts/wedm_capability_report.ts [options]");
        console.log("\nOptions:");
        console.log("  --controllers, -c   Controllers to include (all or comma-separated brands)");
        console.log("\nBrands: Mitsubishi, Fanuc, Sodick, AgieCharmilles, Makino");
        process.exit(0);
    }
  }

  try {
    let controllers = CONTROLLERS;
    if (filterBrands.length > 0) {
      controllers = CONTROLLERS.filter((c) =>
        filterBrands.some((b) => c.brand.toLowerCase().includes(b.toLowerCase()))
      );
    }

    const report = generateReport(controllers);
    printReport(report);

    // Save JSON
    const jsonPath = "wedm_capability_report.json";
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`JSON saved: ${jsonPath}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
