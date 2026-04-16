/**
 * Lathe AI Bulk Training Test — Comprehensive JM Die Archive Analysis
 * =====================================================================
 * This test runs the training engine against ALL .MIN files in the JM Die
 * archive to validate the AI can correctly identify issues in amateur programs.
 *
 * Archive: H:/PRISM/JM DIE/CNC LATHE/
 * Expected: ~15,251 .MIN files from 100+ customers
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, basename, dirname } from "path";
import {
  LatheAITrainingEngine,
  ProgramAnalysis,
} from "../engines/LatheAITrainingEngine.js";

const JM_DIE_LATHE_PATH = "H:/PRISM/JM DIE/CNC LATHE";
const MAX_PROGRAMS = 100; // Limit for test speed; set to 0 for unlimited

interface ProgramFile {
  content: string;
  filepath: string;
  customer: string;
}

/** Recursively collect .MIN files */
function collectMinFiles(dir: string, files: ProgramFile[] = []): ProgramFile[] {
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);

    try {
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        collectMinFiles(fullPath, files);
      } else if (entry.toUpperCase().endsWith(".MIN")) {
        const content = readFileSync(fullPath, "utf-8");
        const customer = basename(dirname(fullPath));
        files.push({ content, filepath: fullPath, customer });

        if (MAX_PROGRAMS > 0 && files.length >= MAX_PROGRAMS) {
          return files;
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return files;
}

describe("Lathe AI Bulk Training", () => {
  let archiveAvailable = false;
  let programs: ProgramFile[] = [];

  beforeAll(() => {
    archiveAvailable = existsSync(JM_DIE_LATHE_PATH);
    if (archiveAvailable) {
      console.log(`\n=== Collecting .MIN files from JM Die archive ===`);
      console.log(`Path: ${JM_DIE_LATHE_PATH}`);
      console.log(`Limit: ${MAX_PROGRAMS > 0 ? MAX_PROGRAMS : "UNLIMITED"}`);

      programs = collectMinFiles(JM_DIE_LATHE_PATH);
      console.log(`Collected: ${programs.length} programs\n`);
    }
  });

  it("should train on bulk programs and generate statistics", async () => {
    if (!archiveAvailable || programs.length === 0) {
      console.log("SKIP: JM Die archive not available");
      return;
    }

    const engine = new LatheAITrainingEngine();

    console.log(`\n=== PRISM Lathe AI Bulk Training ===`);
    console.log(`Training on ${programs.length} JM Die programs...`);

    // Train
    const stats = engine.trainFromPrograms(
      programs.map(p => ({ content: p.content, filepath: p.filepath }))
    );

    // Output statistics
    console.log(`\n=== Training Results ===`);
    console.log(`Programs Parsed:   ${stats.programs_parsed}`);
    console.log(`Programs Analyzed: ${stats.programs_analyzed}`);
    console.log(`Patterns Learned:  ${stats.patterns_learned}`);
    console.log(`Anti-Patterns:     ${stats.anti_patterns_found}`);
    console.log(`Average Score:     ${stats.avg_program_score.toFixed(1)}/100`);
    console.log(`High Scoring (≥80): ${stats.high_scoring_count}`);
    console.log(`Low Scoring (<50):  ${stats.low_scoring_count}`);

    // Best practices
    if (stats.best_practices.length > 0) {
      console.log(`\n=== Best Practices Found ===`);
      for (const practice of stats.best_practices.slice(0, 10)) {
        console.log(`  • ${practice}`);
      }
    }

    // Common issues
    console.log(`\n=== Most Common Issues ===`);
    const sortedIssues = Array.from(stats.common_issues.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [issue, count] of sortedIssues) {
      const pct = ((count / stats.programs_analyzed) * 100).toFixed(1);
      console.log(`  ${count.toString().padStart(3)} programs (${pct}%): ${issue}`);
    }

    // Assertions
    expect(stats.programs_parsed).toBe(programs.length);
    expect(stats.programs_analyzed).toBeGreaterThan(0);
  });

  it("should identify the best and worst programs", async () => {
    if (!archiveAvailable || programs.length === 0) {
      console.log("SKIP: JM Die archive not available");
      return;
    }

    const engine = new LatheAITrainingEngine();

    let bestAnalysis: ProgramAnalysis | null = null;
    let worstAnalysis: ProgramAnalysis | null = null;
    let bestScore = 0;
    let worstScore = 100;

    // Analyze all
    for (const prog of programs) {
      const parsed = engine.parseProgram(prog.content, prog.filepath);
      const analysis = engine.analyzeProgram(parsed);

      if (analysis.score > bestScore) {
        bestScore = analysis.score;
        bestAnalysis = analysis;
      }
      if (analysis.score < worstScore) {
        worstScore = analysis.score;
        worstAnalysis = analysis;
      }
    }

    // Report best
    if (bestAnalysis) {
      console.log(`\n=== Best Program (Score: ${bestScore}/100) ===`);
      console.log(`File: ${bestAnalysis.program.filename}`);
      console.log(`Customer: ${bestAnalysis.program.customer}`);
      console.log(`Operations: ${bestAnalysis.program.operation_sequence.join(" → ")}`);
      console.log(`Issues: ${bestAnalysis.issues.length}`);

      if (bestAnalysis.issues.length > 0) {
        console.log(`Minor issues:`);
        for (const issue of bestAnalysis.issues.slice(0, 3)) {
          console.log(`  - ${issue.issue}`);
        }
      }
    }

    // Report worst
    if (worstAnalysis) {
      console.log(`\n=== Worst Program (Score: ${worstScore}/100) ===`);
      console.log(`File: ${worstAnalysis.program.filename}`);
      console.log(`Customer: ${worstAnalysis.program.customer}`);
      console.log(`Operations: ${worstAnalysis.program.operation_sequence.join(" → ")}`);
      console.log(`Issues: ${worstAnalysis.issues.length}`);

      console.log(`\nCritical Issues:`);
      for (const issue of worstAnalysis.issues.filter(i => i.severity === "critical").slice(0, 5)) {
        console.log(`  - [T${issue.tool_number}] ${issue.issue}`);
      }

      console.log(`\nRecommendations:`);
      for (const rec of worstAnalysis.recommendations.slice(0, 5)) {
        console.log(`  • ${rec}`);
      }

      // Generate improved version
      console.log(`\n=== AI-Improved Version (first 30 lines) ===`);
      const improved = engine.rewriteProgram(worstAnalysis);
      const lines = improved.split("\n").slice(0, 30);
      for (const line of lines) {
        console.log(line);
      }
    }

    expect(bestAnalysis).not.toBeNull();
    expect(worstAnalysis).not.toBeNull();
    expect(bestScore).toBeGreaterThan(worstScore);
  });

  it("should analyze by customer and find problem shops", async () => {
    if (!archiveAvailable || programs.length === 0) {
      console.log("SKIP: JM Die archive not available");
      return;
    }

    const engine = new LatheAITrainingEngine();

    // Group by customer
    const byCustomer = new Map<string, ProgramAnalysis[]>();

    for (const prog of programs) {
      const parsed = engine.parseProgram(prog.content, prog.filepath);
      const analysis = engine.analyzeProgram(parsed);

      const existing = byCustomer.get(prog.customer) || [];
      existing.push(analysis);
      byCustomer.set(prog.customer, existing);
    }

    // Calculate averages
    const customerStats = Array.from(byCustomer.entries()).map(([customer, analyses]) => {
      const avgScore = analyses.reduce((s, a) => s + a.score, 0) / analyses.length;
      const avgIssues = analyses.reduce((s, a) => s + a.issues.length, 0) / analyses.length;
      return { customer, count: analyses.length, avgScore, avgIssues };
    });

    // Sort by score
    customerStats.sort((a, b) => a.avgScore - b.avgScore);

    console.log(`\n=== Customer Analysis (${customerStats.length} customers) ===`);

    // Worst customers
    console.log(`\n--- Needs Training (Lowest Scores) ---`);
    for (const stat of customerStats.slice(0, 5)) {
      console.log(
        `  ${stat.customer.padEnd(20)} | ${stat.count} programs | Score: ${stat.avgScore.toFixed(1)} | Avg Issues: ${stat.avgIssues.toFixed(1)}`
      );
    }

    // Best customers
    console.log(`\n--- Best Practices (Highest Scores) ---`);
    const best = customerStats.slice(-5).reverse();
    for (const stat of best) {
      console.log(
        `  ${stat.customer.padEnd(20)} | ${stat.count} programs | Score: ${stat.avgScore.toFixed(1)} | Avg Issues: ${stat.avgIssues.toFixed(1)}`
      );
    }

    expect(customerStats.length).toBeGreaterThan(0);
  });

  it("should detect specific programming errors", async () => {
    if (!archiveAvailable || programs.length === 0) {
      console.log("SKIP: JM Die archive not available");
      return;
    }

    const engine = new LatheAITrainingEngine();

    const errorCounts = {
      missing_g50: 0,
      slow_feed: 0,
      fast_feed: 0,
      no_coolant: 0,
      wrong_spindle_mode: 0,
      operation_order: 0,
      missing_m_code: 0,
    };

    for (const prog of programs) {
      const parsed = engine.parseProgram(prog.content, prog.filepath);
      const analysis = engine.analyzeProgram(parsed);

      for (const issue of analysis.issues) {
        if (issue.issue.includes("G50")) errorCounts.missing_g50++;
        if (issue.issue.includes("slow") || issue.issue.includes("Extremely low")) errorCounts.slow_feed++;
        if (issue.issue.includes("too high") || issue.issue.includes("aggressive")) errorCounts.fast_feed++;
        if (issue.issue.includes("coolant")) errorCounts.no_coolant++;
        if (issue.issue.includes("RPM mode") || issue.issue.includes("CSS")) errorCounts.wrong_spindle_mode++;
        if (issue.issue.includes("before") || issue.issue.includes("order")) errorCounts.operation_order++;
      }

      if (!analysis.operation_order_correct) errorCounts.operation_order++;
    }

    console.log(`\n=== Programming Error Analysis ===`);
    console.log(`Missing G50 RPM Limit:  ${errorCounts.missing_g50} programs`);
    console.log(`Slow Feed Rate:         ${errorCounts.slow_feed} programs`);
    console.log(`Aggressive Feed Rate:   ${errorCounts.fast_feed} programs`);
    console.log(`Missing Coolant:        ${errorCounts.no_coolant} programs`);
    console.log(`Wrong Spindle Mode:     ${errorCounts.wrong_spindle_mode} programs`);
    console.log(`Operation Order Issues: ${errorCounts.operation_order} programs`);

    // At least some errors should be found
    const totalErrors = Object.values(errorCounts).reduce((a, b) => a + b, 0);
    expect(totalErrors).toBeGreaterThan(0);
    console.log(`\nTotal programming errors found: ${totalErrors}`);
  });
});
