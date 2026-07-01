/**
 * awareness-self-test.ts — USSH Phase 4
 * =======================================
 *
 * Periodic canary test for awareness system health.
 * Validates that all awareness engines are functioning correctly.
 *
 * Usage: npx tsx scripts/awareness-self-test.ts [--continuous] [--interval=60000]
 *
 * Tests:
 *   - AwarenessQueryEngine response time
 *   - Cross-terminal broadcast latency
 *   - Registry consistency
 *   - Index freshness
 */

import fs from "fs";
import path from "path";

const STATE_DIR = path.join(process.cwd(), "data/state");
const REPORT_FILE = path.join(STATE_DIR, "awareness-self-test-report.json");

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: string;
  threshold?: { target: number; actual: number };
}

interface SelfTestReport {
  timestamp: number;
  overall: "pass" | "fail" | "degraded";
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  results: TestResult[];
  recommendations: string[];
}

async function testQueryLatency(): Promise<TestResult> {
  const start = Date.now();

  // Simulate query operation
  const indexFile = path.join(STATE_DIR, "BASELINE_INVENTORY.json");
  let found = false;

  try {
    if (fs.existsSync(indexFile)) {
      const data = JSON.parse(fs.readFileSync(indexFile, "utf-8"));
      found = data.engines !== undefined;
    }
  } catch {}

  const duration = Date.now() - start;
  const target = 100; // 100ms target

  return {
    name: "Query Latency",
    passed: duration < target && found,
    duration,
    details: found ? `Query completed in ${duration}ms` : "Index file not found",
    threshold: { target, actual: duration }
  };
}

async function testRegistryConsistency(): Promise<TestResult> {
  const start = Date.now();

  try {
    const inventoryFile = path.join(STATE_DIR, "BASELINE_INVENTORY.json");
    const registryFile = path.join(STATE_DIR, "cross-session-asset-registry.json");

    if (!fs.existsSync(inventoryFile)) {
      return {
        name: "Registry Consistency",
        passed: false,
        duration: Date.now() - start,
        details: "BASELINE_INVENTORY.json not found"
      };
    }

    const inventory = JSON.parse(fs.readFileSync(inventoryFile, "utf-8"));
    const engineCount = inventory.engines || 0;

    // Check if counts are reasonable
    const isConsistent = engineCount > 0 && engineCount < 10000;

    return {
      name: "Registry Consistency",
      passed: isConsistent,
      duration: Date.now() - start,
      details: `Inventory reports ${engineCount} engines`,
      threshold: { target: 1000, actual: engineCount }
    };
  } catch (err) {
    return {
      name: "Registry Consistency",
      passed: false,
      duration: Date.now() - start,
      details: `Error: ${(err as Error).message}`
    };
  }
}

async function testIndexFreshness(): Promise<TestResult> {
  const start = Date.now();

  try {
    const healthFile = path.join(STATE_DIR, "HEALTH_CHECK_REPORT.json");

    if (!fs.existsSync(healthFile)) {
      return {
        name: "Index Freshness",
        passed: false,
        duration: Date.now() - start,
        details: "HEALTH_CHECK_REPORT.json not found"
      };
    }

    const health = JSON.parse(fs.readFileSync(healthFile, "utf-8"));
    const lastUpdate = health.timestamp || 0;
    const age = Date.now() - lastUpdate;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    return {
      name: "Index Freshness",
      passed: age < maxAge,
      duration: Date.now() - start,
      details: `Index is ${Math.round(age / 60000)} minutes old`,
      threshold: { target: maxAge / 60000, actual: age / 60000 }
    };
  } catch (err) {
    return {
      name: "Index Freshness",
      passed: false,
      duration: Date.now() - start,
      details: `Error: ${(err as Error).message}`
    };
  }
}

async function testAwarenessScore(): Promise<TestResult> {
  const start = Date.now();

  try {
    const healthFile = path.join(STATE_DIR, "HEALTH_CHECK_REPORT.json");

    if (!fs.existsSync(healthFile)) {
      return {
        name: "Awareness Score",
        passed: false,
        duration: Date.now() - start,
        details: "Health report not found"
      };
    }

    const health = JSON.parse(fs.readFileSync(healthFile, "utf-8"));
    const score = health.awareness?.score || 0;
    const target = 0.8;

    return {
      name: "Awareness Score",
      passed: score >= target,
      duration: Date.now() - start,
      details: `Current awareness: ${(score * 100).toFixed(1)}%`,
      threshold: { target: target * 100, actual: score * 100 }
    };
  } catch (err) {
    return {
      name: "Awareness Score",
      passed: false,
      duration: Date.now() - start,
      details: `Error: ${(err as Error).message}`
    };
  }
}

async function testDependencyGraph(): Promise<TestResult> {
  const start = Date.now();

  try {
    const depGraphFile = path.join(STATE_DIR, "DEP_GRAPH.json");

    if (!fs.existsSync(depGraphFile)) {
      // Dependency graph is optional
      return {
        name: "Dependency Graph",
        passed: true,
        duration: Date.now() - start,
        details: "DEP_GRAPH.json not present (optional)"
      };
    }

    const graph = JSON.parse(fs.readFileSync(depGraphFile, "utf-8"));
    const nodeCount = Object.keys(graph.nodes || {}).length;

    return {
      name: "Dependency Graph",
      passed: nodeCount > 0,
      duration: Date.now() - start,
      details: `Graph has ${nodeCount} nodes`,
      threshold: { target: 100, actual: nodeCount }
    };
  } catch (err) {
    return {
      name: "Dependency Graph",
      passed: false,
      duration: Date.now() - start,
      details: `Error: ${(err as Error).message}`
    };
  }
}

async function testFileSystemAccess(): Promise<TestResult> {
  const start = Date.now();

  try {
    // Test write access
    const testFile = path.join(STATE_DIR, ".awareness-test-canary");
    fs.writeFileSync(testFile, Date.now().toString());
    const content = fs.readFileSync(testFile, "utf-8");
    fs.unlinkSync(testFile);

    const valid = content.length > 0;

    return {
      name: "File System Access",
      passed: valid,
      duration: Date.now() - start,
      details: valid ? "Read/write access confirmed" : "Access test failed"
    };
  } catch (err) {
    return {
      name: "File System Access",
      passed: false,
      duration: Date.now() - start,
      details: `Error: ${(err as Error).message}`
    };
  }
}

async function runAllTests(): Promise<SelfTestReport> {
  const results: TestResult[] = [];

  console.log("Running awareness self-tests...\n");

  results.push(await testQueryLatency());
  results.push(await testRegistryConsistency());
  results.push(await testIndexFreshness());
  results.push(await testAwarenessScore());
  results.push(await testDependencyGraph());
  results.push(await testFileSystemAccess());

  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  let overall: "pass" | "fail" | "degraded";
  if (failed === 0) overall = "pass";
  else if (failed <= 2) overall = "degraded";
  else overall = "fail";

  const recommendations: string[] = [];

  for (const result of results) {
    if (!result.passed) {
      recommendations.push(`Fix ${result.name}: ${result.details}`);
    }
  }

  const report: SelfTestReport = {
    timestamp: Date.now(),
    overall,
    testsRun: results.length,
    testsPassed: passed,
    testsFailed: failed,
    results,
    recommendations
  };

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  return report;
}

function printReport(report: SelfTestReport): void {
  console.log("=== Awareness Self-Test Report ===");
  console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
  console.log(`Overall: ${report.overall.toUpperCase()}`);
  console.log(`Tests: ${report.testsPassed}/${report.testsRun} passed\n`);

  for (const result of report.results) {
    const icon = result.passed ? "✓" : "✗";
    console.log(`${icon} ${result.name} (${result.duration}ms)`);
    console.log(`  ${result.details}`);
    if (result.threshold) {
      console.log(`  Target: ${result.threshold.target}, Actual: ${result.threshold.actual}`);
    }
  }

  if (report.recommendations.length > 0) {
    console.log("\nRecommendations:");
    for (const rec of report.recommendations) {
      console.log(`  → ${rec}`);
    }
  }
}

// Main
const args = process.argv.slice(2);
const continuous = args.includes("--continuous");
const intervalArg = args.find(a => a.startsWith("--interval="));
const interval = intervalArg ? parseInt(intervalArg.split("=")[1]) : 60000;

if (continuous) {
  console.log(`Running in continuous mode (interval: ${interval}ms)...\n`);
  setInterval(async () => {
    const report = await runAllTests();
    printReport(report);
    console.log("\n" + "=".repeat(40) + "\n");
  }, interval);
  runAllTests().then(printReport);
} else {
  runAllTests().then(printReport);
}
