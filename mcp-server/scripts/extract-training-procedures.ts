/**
 * Training Procedure Extractor
 *
 * Extracts procedural knowledge from CAM training PDFs:
 * - Step-by-step workflows
 * - Setup procedures
 * - Troubleshooting guides
 * - Best practices / anti-patterns
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

// ============================================================================
// TYPES
// ============================================================================

interface ExtractedProcedure {
  source: string;
  cam_system: string;
  category: string;
  title: string;
  steps: string[];
  context: string;
  page_estimate: number;
  confidence: number;
}

interface ExtractedTip {
  source: string;
  cam_system: string;
  category: string;
  title: string;
  body: string;
  is_warning: boolean;
  confidence: number;
}

interface TrainingExtraction {
  source_pdf: string;
  cam_system: string;
  extracted_at: string;
  page_count: number;
  text_length: number;
  procedures: ExtractedProcedure[];
  tips: ExtractedTip[];
  chapter_titles: string[];
  warnings: string[];
}

// ============================================================================
// EXTRACTION
// ============================================================================

function identifyCAMSystem(filename: string, text: string): string {
  const fn = filename.toLowerCase();
  const txt = text.slice(0, 20000).toLowerCase();

  if (fn.includes("inventorcam") || txt.includes("inventorcam")) return "inventorcam";
  if (fn.includes("solidcam") || txt.includes("solidcam")) return "solidcam";
  if (fn.includes("hypermill") || txt.includes("hypermill")) return "hypermill";
  if (fn.includes("mastercam") || txt.includes("mastercam")) return "mastercam";
  if (fn.includes("fusion") || txt.includes("fusion 360")) return "fusion360";
  if (fn.includes("post") || txt.includes("post processor")) return "post_processor";

  return "general";
}

function extractProcedures(text: string, source: string, camSystem: string): ExtractedProcedure[] {
  const procedures: ExtractedProcedure[] = [];
  const lines = text.split("\n");

  // Pattern 1: "Step 1:", "Step 2:", etc.
  let currentProcedure: { title: string; steps: string[]; startLine: number } | null = null;
  let lastStepNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for step pattern
    const stepMatch = line.match(/^(?:step\s*)?(\d+)[.:]\s*(.+)/i);
    if (stepMatch) {
      const stepNum = parseInt(stepMatch[1]);
      const stepText = stepMatch[2].trim();

      if (stepNum === 1 || (currentProcedure && stepNum === lastStepNum + 1)) {
        if (stepNum === 1) {
          // Save previous procedure if exists
          if (currentProcedure && currentProcedure.steps.length >= 2) {
            procedures.push({
              source,
              cam_system: camSystem,
              category: "workflow",
              title: currentProcedure.title,
              steps: currentProcedure.steps,
              context: lines.slice(currentProcedure.startLine, i).join(" ").slice(0, 500),
              page_estimate: Math.floor(currentProcedure.startLine / 50) + 1,
              confidence: currentProcedure.steps.length >= 3 ? 0.85 : 0.7,
            });
          }

          // Look backwards for title
          let title = "Procedure";
          for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
            const prevLine = lines[j].trim();
            if (prevLine.length > 5 && prevLine.length < 100 && !prevLine.match(/^\d/)) {
              title = prevLine;
              break;
            }
          }

          currentProcedure = { title, steps: [stepText], startLine: i };
        } else if (currentProcedure) {
          currentProcedure.steps.push(stepText);
        }
        lastStepNum = stepNum;
      }
    }

    // Pattern 2: Bullet points under a header
    if (line.match(/^[•\-\*]\s+/) && i > 0) {
      const bulletText = line.replace(/^[•\-\*]\s+/, "").trim();
      if (bulletText.length > 10 && currentProcedure) {
        // Could be part of current step
      }
    }
  }

  // Save final procedure
  if (currentProcedure && currentProcedure.steps.length >= 2) {
    procedures.push({
      source,
      cam_system: camSystem,
      category: "workflow",
      title: currentProcedure.title,
      steps: currentProcedure.steps,
      context: "",
      page_estimate: Math.floor(currentProcedure.startLine / 50) + 1,
      confidence: currentProcedure.steps.length >= 3 ? 0.85 : 0.7,
    });
  }

  return procedures;
}

function extractTips(text: string, source: string, camSystem: string): ExtractedTip[] {
  const tips: ExtractedTip[] = [];
  const lines = text.split("\n");

  const tipPatterns = [
    /^(?:tip|note|hint)[:\s]+(.+)/i,
    /^(?:important|warning|caution)[:\s]+(.+)/i,
    /^(?:best practice)[:\s]+(.+)/i,
    /^(?:avoid|don'?t)[:\s]+(.+)/i,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    for (const pattern of tipPatterns) {
      const match = line.match(pattern);
      if (match) {
        const isWarning = /warning|caution|avoid|don'?t/i.test(line);
        const body = match[1] || "";

        // Get more context
        let fullBody = body;
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.length > 0 && !nextLine.match(/^(?:tip|note|step|\d)/i)) {
            fullBody += " " + nextLine;
          } else {
            break;
          }
        }

        if (fullBody.length > 20) {
          tips.push({
            source,
            cam_system: camSystem,
            category: isWarning ? "warning" : "tip",
            title: isWarning ? "Warning" : "Tip",
            body: fullBody.slice(0, 500),
            is_warning: isWarning,
            confidence: 0.8,
          });
        }
        break;
      }
    }
  }

  return tips;
}

function extractChapterTitles(text: string): string[] {
  const titles: string[] = [];
  const lines = text.split("\n");

  // Look for chapter/section headers
  const headerPatterns = [
    /^chapter\s*\d+[:\s]+(.+)/i,
    /^section\s*\d+[:\s]+(.+)/i,
    /^\d+\.\s+([A-Z][^.]+)$/,
    /^(?:module|lesson|unit)\s*\d+[:\s]+(.+)/i,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    for (const pattern of headerPatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        titles.push(match[1].trim());
        break;
      }
    }
  }

  return [...new Set(titles)].slice(0, 50);
}

async function extractTrainingPDF(filePath: string): Promise<TrainingExtraction> {
  const filename = basename(filePath);
  const warnings: string[] = [];

  console.log(`  Extracting: ${filename}`);

  try {
    const buffer = readFileSync(filePath);
    const sizeMB = buffer.length / 1024 / 1024;

    if (sizeMB > 50) {
      warnings.push(`Large file (${sizeMB.toFixed(1)}MB) — extraction may be incomplete`);
    }

    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy?.();

    const text = typeof result === "string" ? result : (result?.text || "");
    const pageCount = typeof result === "object" ? (result.total || 0) : 0;

    const camSystem = identifyCAMSystem(filename, text);

    console.log(`    CAM System: ${camSystem}, Pages: ${pageCount}`);

    const procedures = extractProcedures(text, filename, camSystem);
    const tips = extractTips(text, filename, camSystem);
    const chapters = extractChapterTitles(text);

    console.log(`    Procedures: ${procedures.length}, Tips: ${tips.length}, Chapters: ${chapters.length}`);

    return {
      source_pdf: filePath,
      cam_system: camSystem,
      extracted_at: new Date().toISOString(),
      page_count: pageCount,
      text_length: text.length,
      procedures,
      tips,
      chapter_titles: chapters,
      warnings,
    };
  } catch (error) {
    warnings.push(`Extraction failed: ${error}`);
    return {
      source_pdf: filePath,
      cam_system: "unknown",
      extracted_at: new Date().toISOString(),
      page_count: 0,
      text_length: 0,
      procedures: [],
      tips: [],
      chapter_titles: [],
      warnings,
    };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("=== PRISM Training Procedure Extraction ===\n");

  const OUTPUT_DIR = "H:/prism/mcp-server/data/extracted-knowledge/training";
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Priority training PDFs
  const trainingPDFs = [
    "H:/prism/Resources/RESOURCE PDFS/InventorCAM2024_2.5D_Milling_Training_Course.pdf",
    "H:/prism/Resources/RESOURCE PDFS/InventorCAM2024_Turning_&_Mill-Turn_Training_Course.pdf",
    "H:/prism/Resources/RESOURCE PDFS/Post Processor Training Guide.pdf",
    "H:/prism/Resources/RESOURCE PDFS/InventorCAM2024_5-Axis_Basic_Training_Vol-1.pdf",
    "H:/prism/Resources/PDF/hyperMILL/hyperMILL_Manual-en.pdf",
  ].filter(existsSync);

  console.log(`Processing ${trainingPDFs.length} training documents\n`);

  const results: TrainingExtraction[] = [];
  let totalProcedures = 0;
  let totalTips = 0;

  for (const pdfPath of trainingPDFs) {
    const result = await extractTrainingPDF(pdfPath);
    results.push(result);
    totalProcedures += result.procedures.length;
    totalTips += result.tips.length;
  }

  // Save results
  const outputPath = join(OUTPUT_DIR, `training-extraction-${Date.now()}.json`);
  const summary = {
    extracted_at: new Date().toISOString(),
    pdfs_processed: results.length,
    total_procedures: totalProcedures,
    total_tips: totalTips,
    by_cam_system: {} as Record<string, { procedures: number; tips: number }>,
    results,
  };

  for (const r of results) {
    if (!summary.by_cam_system[r.cam_system]) {
      summary.by_cam_system[r.cam_system] = { procedures: 0, tips: 0 };
    }
    summary.by_cam_system[r.cam_system].procedures += r.procedures.length;
    summary.by_cam_system[r.cam_system].tips += r.tips.length;
  }

  writeFileSync(outputPath, JSON.stringify(summary, null, 2));

  console.log("\n=== Extraction Summary ===");
  console.log(`PDFs: ${results.length}`);
  console.log(`Procedures: ${totalProcedures}`);
  console.log(`Tips: ${totalTips}`);
  console.log(`\nBy CAM System:`);
  for (const [sys, counts] of Object.entries(summary.by_cam_system)) {
    console.log(`  ${sys}: ${counts.procedures} procedures, ${counts.tips} tips`);
  }
  console.log(`\nOutput: ${outputPath}`);
}

main().catch(console.error);
