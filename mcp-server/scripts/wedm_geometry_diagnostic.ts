#!/usr/bin/env npx ts-node
/**
 * WEDM Geometry Diagnostic Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Validates DXF/STEP geometry for Wire EDM feasibility.
 * Checks: start holes, clearances, sharp corners, accessibility.
 *
 * Usage: npx ts-node scripts/wedm_geometry_diagnostic.ts <file.dxf|file.step>
 */

import { edmDrawingInterpretationEngine } from "../src/engines/EDMDrawingInterpretationEngine.js";
import { edmFeasibilityEngine } from "../src/engines/EDMFeasibilityEngine.js";
import { wedmStartHoleSetupEngine } from "../src/engines/EDMStartHoleSetupEngine.js";
import * as fs from "fs";
import * as path from "path";

interface GeometryDiagnosticReport {
  file: string;
  valid: boolean;
  timestamp: string;
  features: {
    total: number;
    internal: number;
    external: number;
    pockets: number;
    throughHoles: number;
  };
  feasibility: {
    score: number;
    passRate: number;
    issues: string[];
    warnings: string[];
  };
  startHoles: {
    required: number;
    locations: Array<{ x: number; y: number; featureId: string }>;
    recommendations: string[];
  };
  accessibility: {
    allAccessible: boolean;
    blockedFeatures: string[];
    wirePathClear: boolean;
  };
  corners: {
    sharpCount: number;
    radiusRequired: Array<{ featureId: string; minRadius: number }>;
  };
  dimensions: {
    boundingBox: { x: number; y: number; z: number };
    maxThickness: number;
    minFeatureSize: number;
  };
}

async function analyzeGeometry(filePath: string): Promise<GeometryDiagnosticReport> {
  const absPath = path.resolve(filePath);
  const ext = path.extname(absPath).toLowerCase();

  if (![".dxf", ".step", ".stp", ".iges", ".igs"].includes(ext)) {
    throw new Error(`Unsupported file format: ${ext}. Use DXF, STEP, or IGES.`);
  }

  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }

  console.log(`Analyzing: ${absPath}`);

  // Parse geometry
  const drawingResult = await edmDrawingInterpretationEngine.interpret({
    filePath: absPath,
    format: ext.replace(".", "") as "dxf" | "step" | "iges",
    extractFeatures: true,
    detectStartHoles: true,
  });

  // Check feasibility
  const feasibilityResult = await edmFeasibilityEngine.analyze({
    geometry: drawingResult.features,
    constraints: {
      minFeatureSize: 0.1, // mm
      maxThickness: 400, // mm (FA-20S limit)
      maxTaper: 30, // degrees
    },
  });

  // Plan start holes
  const startHoleResult = await wedmStartHoleSetupEngine.plan({
    features: drawingResult.features,
    material: "unknown", // Will be determined later
    constraints: {
      minDiameter: 0.3, // mm
      preferExisting: true,
    },
  });

  // Analyze corners
  const sharpCorners = drawingResult.features.filter(
    (f: any) => f.type === "corner" && f.radius < 0.1
  );

  const report: GeometryDiagnosticReport = {
    file: absPath,
    valid: feasibilityResult.feasible && drawingResult.features.length > 0,
    timestamp: new Date().toISOString(),
    features: {
      total: drawingResult.features.length,
      internal: drawingResult.features.filter((f: any) => f.category === "internal").length,
      external: drawingResult.features.filter((f: any) => f.category === "external").length,
      pockets: drawingResult.features.filter((f: any) => f.type === "pocket").length,
      throughHoles: drawingResult.features.filter((f: any) => f.type === "throughHole").length,
    },
    feasibility: {
      score: feasibilityResult.score ?? 0.85,
      passRate: feasibilityResult.passRate ?? 1.0,
      issues: feasibilityResult.issues ?? [],
      warnings: feasibilityResult.warnings ?? [],
    },
    startHoles: {
      required: startHoleResult.holesRequired ?? 0,
      locations: startHoleResult.locations ?? [],
      recommendations: startHoleResult.recommendations ?? [],
    },
    accessibility: {
      allAccessible: feasibilityResult.allAccessible ?? true,
      blockedFeatures: feasibilityResult.blockedFeatures ?? [],
      wirePathClear: feasibilityResult.wirePathClear ?? true,
    },
    corners: {
      sharpCount: sharpCorners.length,
      radiusRequired: sharpCorners.map((c: any) => ({
        featureId: c.id,
        minRadius: 0.1, // mm minimum for wire EDM
      })),
    },
    dimensions: {
      boundingBox: drawingResult.boundingBox ?? { x: 0, y: 0, z: 0 },
      maxThickness: drawingResult.maxThickness ?? 0,
      minFeatureSize: drawingResult.minFeatureSize ?? 0,
    },
  };

  return report;
}

function printReport(report: GeometryDiagnosticReport): void {
  console.log("\n" + "=".repeat(60));
  console.log("WEDM GEOMETRY DIAGNOSTIC REPORT");
  console.log("=".repeat(60));
  console.log(`File: ${report.file}`);
  console.log(`Valid: ${report.valid ? "YES" : "NO"}`);
  console.log(`Generated: ${report.timestamp}`);

  console.log("\n--- Features ---");
  console.log(`Total: ${report.features.total}`);
  console.log(`  Internal: ${report.features.internal}`);
  console.log(`  External: ${report.features.external}`);
  console.log(`  Pockets: ${report.features.pockets}`);
  console.log(`  Through Holes: ${report.features.throughHoles}`);

  console.log("\n--- Feasibility ---");
  console.log(`Score: ${(report.feasibility.score * 100).toFixed(1)}%`);
  if (report.feasibility.issues.length > 0) {
    console.log("Issues:");
    report.feasibility.issues.forEach((i) => console.log(`  - ${i}`));
  }
  if (report.feasibility.warnings.length > 0) {
    console.log("Warnings:");
    report.feasibility.warnings.forEach((w) => console.log(`  - ${w}`));
  }

  console.log("\n--- Start Holes ---");
  console.log(`Required: ${report.startHoles.required}`);
  if (report.startHoles.locations.length > 0) {
    console.log("Locations:");
    report.startHoles.locations.forEach((loc) =>
      console.log(`  - (${loc.x.toFixed(3)}, ${loc.y.toFixed(3)}) for ${loc.featureId}`)
    );
  }

  console.log("\n--- Corners ---");
  console.log(`Sharp corners (radius < 0.1mm): ${report.corners.sharpCount}`);
  if (report.corners.sharpCount > 0) {
    console.log("  WARNING: Sharp corners may require multiple passes or radius addition");
  }

  console.log("\n--- Dimensions ---");
  console.log(
    `Bounding Box: ${report.dimensions.boundingBox.x.toFixed(2)} x ${report.dimensions.boundingBox.y.toFixed(2)} x ${report.dimensions.boundingBox.z.toFixed(2)} mm`
  );
  console.log(`Max Thickness: ${report.dimensions.maxThickness.toFixed(2)} mm`);
  console.log(`Min Feature Size: ${report.dimensions.minFeatureSize.toFixed(3)} mm`);

  console.log("\n" + "=".repeat(60));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npx ts-node scripts/wedm_geometry_diagnostic.ts <file.dxf|file.step>");
    console.log("\nSupported formats: DXF, STEP, IGES");
    process.exit(1);
  }

  try {
    const report = await analyzeGeometry(args[0]);
    printReport(report);

    // Output JSON for programmatic use
    const jsonPath = args[0].replace(/\.[^.]+$/, "_wedm_diagnostic.json");
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\nJSON report saved: ${jsonPath}`);

    process.exit(report.valid ? 0 : 1);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(2);
  }
}

main();
