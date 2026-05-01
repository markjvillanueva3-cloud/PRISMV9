#!/usr/bin/env node
/**
 * PRISM Comprehensive Test Runner
 * Runs both vitest (src/__tests__) and standalone tests (tests/r*)
 * Usage: npx tsx scripts/run-all-tests.ts [--phase r10] [--quick]
 */
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

const ROOT = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const phaseFilter = args.find(a => a.startsWith("--phase="))?.split("=")[1] || args[args.indexOf("--phase") + 1];
const quick = args.includes("--quick");

interface TestResult {
  phase: string;
  file: string;
  passed: number;
  failed: number;
  duration_ms: number;
  error?: string;
}

const results: TestResult[] = [];
let totalPassed = 0;
let totalFailed = 0;

// Phase 1: Run vitest (covers src/__tests__)
if (!phaseFilter || phaseFilter === "vitest") {
  console.log("\n=== VITEST SUITE ===");
  try {
    const out = execSync("npx vitest run --reporter=verbose 2>&1", {
      cwd: ROOT, encoding: "utf-8", timeout: 120000
    });
    const passMatch = out.match(/(\d+) passed/);
    const failMatch = out.match(/(\d+) failed/);
    const p = parseInt(passMatch?.[1] || "0");
    const f = parseInt(failMatch?.[1] || "0");
    totalPassed += p;
    totalFailed += f;
    results.push({ phase: "vitest", file: "src/__tests__/**", passed: p, failed: f, duration_ms: 0 });
    console.log(`  ✅ ${p} passed, ${f} failed`);
  } catch (e: any) {
    const out = e.stdout || "";
    const passMatch = out.match(/(\d+) passed/);
    const failMatch = out.match(/(\d+) failed/);
    const p = parseInt(passMatch?.[1] || "0");
    const f = parseInt(failMatch?.[1] || "0");
    totalPassed += p;
    totalFailed += f;
    results.push({ phase: "vitest", file: "src/__tests__/**", passed: p, failed: f, duration_ms: 0 });
    console.log(`  ⚠️ ${p} passed, ${f} failed`);
  }
}

// Phase 2: Run standalone test files in tests/r*
const testsDir = path.join(ROOT, "tests");
if (fs.existsSync(testsDir)) {
  const phaseDirs = fs.readdirSync(testsDir)
    .filter(d => d.startsWith("r") && fs.statSync(path.join(testsDir, d)).isDirectory())
    .filter(d => !phaseFilter || d === phaseFilter)
    .sort();

  for (const phase of phaseDirs) {
    const phaseDir = path.join(testsDir, phase);
    const files = fs.readdirSync(phaseDir).filter(f => f.endsWith(".ts") && !f.endsWith(".json"));

    if (files.length === 0) continue;
    console.log(`\n=== ${phase.toUpperCase()} (${files.length} files) ===`);

    for (const file of files) {
      if (quick && files.indexOf(file) > 0) break; // Quick mode: 1 file per phase
      const filePath = path.join(phaseDir, file);
      const start = Date.now();
      try {
        const out = execSync(`npx tsx "${filePath}" 2>&1`, {
          cwd: ROOT, encoding: "utf-8", timeout: 60000
        });
        // Parse "passed: X, failed: Y" or "PASS: X FAIL: Y" patterns
        const passMatch = out.match(/(?:passed|PASS)[:\s]+(\d+)/i);
        const failMatch = out.match(/(?:failed|FAIL)[:\s]+(\d+)/i);
        const p = parseInt(passMatch?.[1] || "0");
        const f = parseInt(failMatch?.[1] || "0");
        totalPassed += p;
        totalFailed += f;
        results.push({ phase, file, passed: p, failed: f, duration_ms: Date.now() - start });
        console.log(`  ${f > 0 ? "❌" : "✅"} ${file}: ${p} passed, ${f} failed (${Date.now() - start}ms)`);
      } catch (e: any) {
        totalFailed++;
        results.push({ phase, file, passed: 0, failed: 1, duration_ms: Date.now() - start, error: e.message?.slice(0, 200) });
        console.log(`  ❌ ${file}: CRASHED (${Date.now() - start}ms)`);
      }
    }
  }
}

// Summary
console.log("\n" + "=".repeat(60));
console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
console.log(`PHASES: ${results.map(r => r.phase).filter((v, i, a) => a.indexOf(v) === i).length}`);
console.log(`FILES: ${results.length}`);
console.log(totalFailed > 0 ? "❌ SOME FAILURES" : "✅ ALL PASSED");
process.exit(totalFailed > 0 ? 1 : 0);
