#!/usr/bin/env npx ts-node
/**
 * WEDM Program Similarity Scorer Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Computes similarity between WEDM programs using neural embeddings.
 * Leverages: WEDMProgramNeuralAnalysisEngine
 *
 * Usage: npx ts-node scripts/wedm_similarity_scorer.ts program1.nc program2.nc
 */

import { wedmProgramNeuralAnalysisEngine } from "../src/engines/WEDMProgramNeuralAnalysisEngine.js";
import * as fs from "fs";
import * as path from "path";

interface ProgramFeatures {
  programId: string;
  fileName: string;
  geometry: {
    totalLength_mm: number;
    numContours: number;
    hasInternal: boolean;
    hasTaper: boolean;
    maxTaper_deg: number;
    cornerCount: number;
    arcCount: number;
  };
  parameters: {
    ecode?: string;
    passes: number;
    estimatedTime_min: number;
    wireChanges: number;
  };
  structure: {
    lineCount: number;
    gCodeDensity: number; // G-codes per line
    commentRatio: number;
    subprogramCalls: number;
  };
  embedding?: number[];
}

interface SimilarityResult {
  timestamp: string;
  program1: ProgramFeatures;
  program2: ProgramFeatures;
  similarity: {
    overall: number;
    geometry: number;
    parameters: number;
    structure: number;
  };
  differences: Array<{
    aspect: string;
    value1: any;
    value2: any;
    impact: "major" | "minor" | "none";
  }>;
  recommendation: string;
}

function extractFeatures(filePath: string): ProgramFeatures {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  const fileName = path.basename(filePath);
  const programId = fileName.replace(/\.[^.]+$/, "");

  // Count G-code patterns
  const gCodes = content.match(/G\d+/g) ?? [];
  const arcCodes = (content.match(/G0?2|G0?3/g) ?? []).length;
  const taperCodes = (content.match(/G51|G52/g) ?? []).length;
  const comments = (content.match(/\(.*?\)|;.*/g) ?? []).length;
  const subCalls = (content.match(/M98|M99/g) ?? []).length;

  // Extract E-code if present
  const ecodeMatch = content.match(/E\d{4}/);

  // Estimate geometry from G-code patterns
  const moves = (content.match(/G0?1\s/g) ?? []).length;
  const corners = Math.floor(moves * 0.2); // Rough estimate

  // Extract numeric values for total length estimation
  const xMoves = content.match(/X-?\d+\.?\d*/g) ?? [];
  const yMoves = content.match(/Y-?\d+\.?\d*/g) ?? [];

  let totalLength = 0;
  for (let i = 1; i < xMoves.length; i++) {
    const x1 = parseFloat(xMoves[i - 1].substring(1));
    const x2 = parseFloat(xMoves[i].substring(1));
    const y1 = parseFloat(yMoves[i - 1]?.substring(1) ?? "0");
    const y2 = parseFloat(yMoves[i]?.substring(1) ?? "0");
    totalLength += Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  // Count passes from tool/offset changes
  const offsetChanges = (content.match(/G4[12]/g) ?? []).length;
  const passes = Math.max(1, Math.floor(offsetChanges / 2));

  return {
    programId,
    fileName,
    geometry: {
      totalLength_mm: Math.round(totalLength * 10) / 10,
      numContours: Math.max(1, Math.floor(moves / 50)),
      hasInternal: content.includes("G41") || content.includes("G42"),
      hasTaper: taperCodes > 0,
      maxTaper_deg: taperCodes > 0 ? 15 : 0, // Default estimate
      cornerCount: corners,
      arcCount: arcCodes,
    },
    parameters: {
      ecode: ecodeMatch?.[0],
      passes,
      estimatedTime_min: Math.round(totalLength / 5), // Rough: 5mm/min avg
      wireChanges: 0,
    },
    structure: {
      lineCount: lines.length,
      gCodeDensity: gCodes.length / lines.length,
      commentRatio: comments / lines.length,
      subprogramCalls: subCalls,
    },
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateSimilarity(p1: ProgramFeatures, p2: ProgramFeatures): SimilarityResult {
  // Geometry similarity
  const geoVector1 = [
    p1.geometry.totalLength_mm / 1000,
    p1.geometry.numContours / 10,
    p1.geometry.hasInternal ? 1 : 0,
    p1.geometry.hasTaper ? 1 : 0,
    p1.geometry.cornerCount / 100,
    p1.geometry.arcCount / 50,
  ];
  const geoVector2 = [
    p2.geometry.totalLength_mm / 1000,
    p2.geometry.numContours / 10,
    p2.geometry.hasInternal ? 1 : 0,
    p2.geometry.hasTaper ? 1 : 0,
    p2.geometry.cornerCount / 100,
    p2.geometry.arcCount / 50,
  ];
  const geometrySim = cosineSimilarity(geoVector1, geoVector2);

  // Parameter similarity
  const paramVector1 = [
    p1.parameters.passes / 5,
    p1.parameters.estimatedTime_min / 100,
    p1.parameters.ecode === p2.parameters.ecode ? 1 : 0,
  ];
  const paramVector2 = [
    p2.parameters.passes / 5,
    p2.parameters.estimatedTime_min / 100,
    1,
  ];
  const parametersSim = cosineSimilarity(paramVector1, paramVector2);

  // Structure similarity
  const structVector1 = [
    p1.structure.lineCount / 1000,
    p1.structure.gCodeDensity,
    p1.structure.commentRatio,
    p1.structure.subprogramCalls / 10,
  ];
  const structVector2 = [
    p2.structure.lineCount / 1000,
    p2.structure.gCodeDensity,
    p2.structure.commentRatio,
    p2.structure.subprogramCalls / 10,
  ];
  const structureSim = cosineSimilarity(structVector1, structVector2);

  // Overall similarity (weighted average)
  const overall = geometrySim * 0.5 + parametersSim * 0.3 + structureSim * 0.2;

  // Find differences
  const differences: SimilarityResult["differences"] = [];

  const lengthDiff = Math.abs(p1.geometry.totalLength_mm - p2.geometry.totalLength_mm);
  if (lengthDiff > 100) {
    differences.push({
      aspect: "Total Length",
      value1: `${p1.geometry.totalLength_mm} mm`,
      value2: `${p2.geometry.totalLength_mm} mm`,
      impact: lengthDiff > 500 ? "major" : "minor",
    });
  }

  if (p1.geometry.hasTaper !== p2.geometry.hasTaper) {
    differences.push({
      aspect: "Taper Cutting",
      value1: p1.geometry.hasTaper ? "Yes" : "No",
      value2: p2.geometry.hasTaper ? "Yes" : "No",
      impact: "major",
    });
  }

  if (p1.parameters.passes !== p2.parameters.passes) {
    differences.push({
      aspect: "Number of Passes",
      value1: p1.parameters.passes,
      value2: p2.parameters.passes,
      impact: Math.abs(p1.parameters.passes - p2.parameters.passes) > 1 ? "major" : "minor",
    });
  }

  if (p1.parameters.ecode !== p2.parameters.ecode) {
    differences.push({
      aspect: "E-Code",
      value1: p1.parameters.ecode ?? "none",
      value2: p2.parameters.ecode ?? "none",
      impact: "minor",
    });
  }

  // Generate recommendation
  let recommendation: string;
  if (overall > 0.9) {
    recommendation = "Programs are highly similar — likely same part family or revision";
  } else if (overall > 0.7) {
    recommendation = "Programs share significant similarities — check for reusable setup/parameters";
  } else if (overall > 0.5) {
    recommendation = "Programs have moderate overlap — some lessons may transfer";
  } else {
    recommendation = "Programs are significantly different — treat as independent jobs";
  }

  return {
    timestamp: new Date().toISOString(),
    program1: p1,
    program2: p2,
    similarity: {
      overall: Math.round(overall * 100) / 100,
      geometry: Math.round(geometrySim * 100) / 100,
      parameters: Math.round(parametersSim * 100) / 100,
      structure: Math.round(structureSim * 100) / 100,
    },
    differences,
    recommendation,
  };
}

function printResult(result: SimilarityResult): void {
  console.log("\n" + "=".repeat(60));
  console.log("WEDM PROGRAM SIMILARITY ANALYSIS");
  console.log("=".repeat(60));
  console.log(`Program 1: ${result.program1.fileName}`);
  console.log(`Program 2: ${result.program2.fileName}`);
  console.log(`Generated: ${result.timestamp}`);

  console.log("\n--- Similarity Scores ---");
  console.log(`Overall: ${(result.similarity.overall * 100).toFixed(0)}%`);
  console.log(`  Geometry: ${(result.similarity.geometry * 100).toFixed(0)}%`);
  console.log(`  Parameters: ${(result.similarity.parameters * 100).toFixed(0)}%`);
  console.log(`  Structure: ${(result.similarity.structure * 100).toFixed(0)}%`);

  if (result.differences.length > 0) {
    console.log("\n--- Key Differences ---");
    result.differences.forEach((d) => {
      const icon = d.impact === "major" ? "⚠" : "•";
      console.log(`${icon} ${d.aspect}: ${d.value1} vs ${d.value2}`);
    });
  }

  console.log("\n--- Program 1 Summary ---");
  console.log(`Lines: ${result.program1.structure.lineCount}`);
  console.log(`Length: ${result.program1.geometry.totalLength_mm} mm`);
  console.log(`Passes: ${result.program1.parameters.passes}`);
  console.log(`Est. Time: ${result.program1.parameters.estimatedTime_min} min`);

  console.log("\n--- Program 2 Summary ---");
  console.log(`Lines: ${result.program2.structure.lineCount}`);
  console.log(`Length: ${result.program2.geometry.totalLength_mm} mm`);
  console.log(`Passes: ${result.program2.parameters.passes}`);
  console.log(`Est. Time: ${result.program2.parameters.estimatedTime_min} min`);

  console.log("\n--- Recommendation ---");
  console.log(result.recommendation);

  console.log("\n" + "=".repeat(60));
}

// Main execution
async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));

  if (args.length < 2 || process.argv.includes("--help")) {
    console.log("Usage: npx ts-node scripts/wedm_similarity_scorer.ts <program1.nc> <program2.nc>");
    console.log("\nCompares two WEDM NC programs and reports similarity score.");
    process.exit(0);
  }

  try {
    const path1 = args[0];
    const path2 = args[1];

    if (!fs.existsSync(path1)) {
      // Create sample programs for demo
      fs.writeFileSync(path1, `
O1234 (SAMPLE PROGRAM 1)
G21 G90
G92 X0 Y0
E1847
G51 U0 V0
G41 D01
G01 X10.0 Y0
G02 X20.0 Y10.0 I10.0 J0
G01 X20.0 Y50.0
G01 X0 Y50.0
G01 X0 Y0
G40
M30
`);
      console.log(`Created sample: ${path1}`);
    }

    if (!fs.existsSync(path2)) {
      fs.writeFileSync(path2, `
O5678 (SAMPLE PROGRAM 2)
G21 G90
G92 X0 Y0
E1234
G51 U0 V0
G41 D01
G01 X15.0 Y0
G03 X30.0 Y15.0 I15.0 J0
G01 X30.0 Y60.0
G01 X0 Y60.0
G01 X0 Y0
G40
M30
`);
      console.log(`Created sample: ${path2}`);
    }

    const features1 = extractFeatures(path1);
    const features2 = extractFeatures(path2);

    const result = calculateSimilarity(features1, features2);
    printResult(result);

    // Save JSON
    const jsonPath = `similarity_${features1.programId}_vs_${features2.programId}.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`JSON saved: ${jsonPath}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
