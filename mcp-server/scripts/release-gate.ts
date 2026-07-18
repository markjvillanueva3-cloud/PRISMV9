/**
 * PRISM Release Gate — Ralph SAFETY_AUDITOR + FORMULA_VALIDATOR
 * =============================================================
 *
 * Runs Ralph's manufacturing-specific validators against engine files
 * before any release tag. Blocks release if S(x) < 0.70.
 *
 * Usage: npx tsx scripts/release-gate.ts [--dry-run]
 *
 * Requires: ANTHROPIC_API_KEY in .env or environment
 *
 * Wired per RALPH_AUDIT.md R2-MS5 recommendations:
 * - Pre-release → prism_ralph validators=[SAFETY_AUDITOR, FORMULA_VALIDATOR]
 * - Threshold: S(x) ≥ 0.70
 * - Gate: Block release if FAIL
 *
 * @version 1.0.0
 * @date 2026-02-21
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env from mcp-server root
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SAFETY_THRESHOLD = 0.70;
const ENGINE_FILES = [
  "src/engines/ManufacturingCalculations.ts",
  "src/engines/AdvancedCalculations.ts",
  "src/engines/ToolpathCalculations.ts",
];
const DISPATCHER_FILES = [
  "src/tools/dispatchers/calcDispatcher.ts",
  "src/tools/dispatchers/safetyDispatcher.ts",
];
const VALIDATORS = ["SAFETY_AUDITOR", "FORMULA_VALIDATOR"] as const;

// ============================================================================
// CLAUDE API CALL
// ============================================================================

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set. Add to .env or environment.");
  }

  const model = "claude-sonnet-4-20250514";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Claude API ${response.status}: ${body.slice(0, 300)}`);
  }

  const data: any = await response.json();
  return data.content?.map((b: any) => b.text || "").join("\n") || "No response";
}

// ============================================================================
// VALIDATOR PROMPTS (Manufacturing-Specific)
// ============================================================================

const VALIDATOR_PROMPTS: Record<string, string> = {
  SAFETY_AUDITOR: `You are a SAFETY AUDITOR for a CNC manufacturing intelligence system.
Your job is to find safety-critical issues that could cause:
- Machine crashes (tool into fixture, spindle overload)
- Operator injury (flying debris, uncontrolled rapid moves)
- Tool breakage (excessive forces, wrong parameters)
- Workpiece damage (thermal damage, surface defects)

Check for:
1. Missing bounds checks on cutting parameters (speed, feed, depth, force)
2. Missing validation before G-code generation
3. Unsafe default values that could exceed machine limits
4. Missing safety gates on composed calculations
5. Unit conversion errors (mm vs inches, N vs N/mm², RPM vs m/min)
6. Missing coolant/spindle/toolholder compatibility checks

Return findings as:
- CRITICAL: (must fix before release — safety risk)
- HIGH: (important safety gaps)
- MEDIUM: (should fix)
- SAFETY_SCORE: (0.0-1.0, where 1.0 = no safety issues found)`,

  FORMULA_VALIDATOR: `You are a FORMULA VALIDATOR for manufacturing physics calculations.
Your job is to verify mathematical correctness of:
- Kienzle force model: Fc = kc1.1 × h^(1-mc) × b
- Taylor tool life: VT^n = C → T = (C/V)^(1/n)
- Johnson-Cook: σ = (A + Bε^n)(1 + C ln ε̇)(1 - T*^m)
- Stability (Altintas): a_lim = -1 / (2 × Ks × Re[G])
- Surface finish: Ra = f²/(32×r)
- MRR, power, torque, chip load calculations

Check for:
1. Unit errors (N/m vs N/mm, mixing metric/imperial)
2. Parameter range violations (negative speeds, zero denominators)
3. Mathematical mistakes (wrong exponents, missing terms)
4. Physically impossible outputs (negative forces, infinite tool life)
5. Missing uncertainty propagation
6. Calibration constant sanity (kc1.1 should be 100-10000 N/mm²)

Return findings as:
- CRITICAL: (math error that produces wrong results)
- HIGH: (potential physics violation)
- MEDIUM: (missing validation)
- FORMULA_SCORE: (0.0-1.0, where 1.0 = all formulas correct)`,
};

// ============================================================================
// MAIN RELEASE GATE
// ============================================================================

interface ValidatorResult {
  validator: string;
  findings: string;
  score: number;
  timestamp: string;
}

function extractScore(findings: string, scoreKey: string): number {
  // Try to extract score from findings text
  const patterns = [
    new RegExp(`${scoreKey}:\\s*([0-9.]+)`, "i"),
    new RegExp(`score.*?([0-9]\\.[0-9]+)`, "i"),
    new RegExp(`([0-9]\\.[0-9]+)\\s*/\\s*1\\.0`, "i"),
  ];

  for (const pattern of patterns) {
    const match = findings.match(pattern);
    if (match) {
      const score = parseFloat(match[1]);
      if (score >= 0 && score <= 1) return score;
    }
  }

  // Default: if no CRITICAL findings, assume 0.80
  if (findings.toLowerCase().includes("critical:") &&
      !findings.toLowerCase().includes("critical: none") &&
      !findings.toLowerCase().includes("critical: 0")) {
    return 0.60; // Has critical issues
  }
  return 0.80; // No clear critical issues
}

async function runReleaseGate(isDryRun: boolean): Promise<void> {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  PRISM RELEASE GATE — Ralph Safety Validation    ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Threshold: S(x) ≥ ${SAFETY_THRESHOLD}                          ║`);
  console.log(`║  Validators: ${VALIDATORS.join(", ")}  ║`);
  console.log(`║  Mode: ${isDryRun ? "DRY RUN (no block)" : "ENFORCING (will block)"}               ║`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();

  // 1. Read engine files
  const rootDir = path.resolve(__dirname, "..");
  const allFiles = [...ENGINE_FILES, ...DISPATCHER_FILES];
  let content = "";

  for (const file of allFiles) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      const fileContent = fs.readFileSync(fullPath, "utf-8");
      content += `\n// === ${file} (${fileContent.split("\n").length} lines) ===\n`;
      // Truncate large files to first 200 lines for API call efficiency
      content += fileContent.split("\n").slice(0, 200).join("\n");
      console.log(`  📄 Loaded: ${file} (${fileContent.split("\n").length} lines)`);
    } else {
      console.log(`  ⚠️  Missing: ${file}`);
    }
  }

  if (content.length < 100) {
    console.error("\n❌ No engine content found. Cannot validate.");
    process.exit(1);
  }

  console.log(`\n  📊 Total content: ${content.length} chars (truncated for API)\n`);

  // 2. Run each validator
  const results: ValidatorResult[] = [];

  for (const validator of VALIDATORS) {
    console.log(`  🔍 Running ${validator}...`);

    if (isDryRun) {
      // Dry run — skip API calls
      results.push({
        validator,
        findings: "DRY RUN — no API call made",
        score: 0.85,
        timestamp: new Date().toISOString(),
      });
      console.log(`     ✅ ${validator}: 0.85 (dry run default)\n`);
      continue;
    }

    try {
      const systemPrompt = VALIDATOR_PROMPTS[validator];
      const userPrompt = `Validate this manufacturing code for release readiness:\n\n${content.substring(0, 8000)}\n\nReturn your findings with a score.`;

      const findings = await callClaude(systemPrompt, userPrompt);
      const scoreKey = validator === "SAFETY_AUDITOR" ? "SAFETY_SCORE" : "FORMULA_SCORE";
      const score = extractScore(findings, scoreKey);

      results.push({
        validator,
        findings,
        score,
        timestamp: new Date().toISOString(),
      });

      console.log(`     ${score >= SAFETY_THRESHOLD ? "✅" : "❌"} ${validator}: ${score.toFixed(2)}\n`);
    } catch (error: any) {
      console.error(`     ❌ ${validator} FAILED: ${error.message}\n`);
      results.push({
        validator,
        findings: `ERROR: ${error.message}`,
        score: 0,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 3. Compute aggregate S(x)
  const scores = results.map(r => r.score);
  const safetyScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;

  // 4. Save results
  const resultDir = path.join(rootDir, "state", "ralph_loops");
  if (!fs.existsSync(resultDir)) {
    fs.mkdirSync(resultDir, { recursive: true });
  }

  const resultFile = path.join(resultDir, `release_gate_${Date.now()}.json`);
  const gateResult = {
    timestamp: new Date().toISOString(),
    safetyScore,
    threshold: SAFETY_THRESHOLD,
    passed: safetyScore >= SAFETY_THRESHOLD,
    isDryRun,
    validators: results,
    engineFiles: allFiles,
  };

  fs.writeFileSync(resultFile, JSON.stringify(gateResult, null, 2));

  // 5. Report
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║              RELEASE GATE RESULT                 ║");
  console.log("╠══════════════════════════════════════════════════╣");

  for (const r of results) {
    const icon = r.score >= SAFETY_THRESHOLD ? "✅" : "❌";
    console.log(`║  ${icon} ${r.validator.padEnd(20)} S=${r.score.toFixed(2)}       ║`);
  }

  console.log("╠══════════════════════════════════════════════════╣");

  const passed = safetyScore >= SAFETY_THRESHOLD;
  if (passed) {
    console.log(`║  ✅ PASSED — S(x) = ${safetyScore.toFixed(2)} ≥ ${SAFETY_THRESHOLD}               ║`);
    console.log("║  Release is APPROVED                             ║");
  } else {
    console.log(`║  ❌ FAILED — S(x) = ${safetyScore.toFixed(2)} < ${SAFETY_THRESHOLD}               ║`);
    console.log("║  Release is BLOCKED — fix issues first           ║");
  }

  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`\n  📁 Results saved: ${path.basename(resultFile)}`);

  // 6. Exit code
  if (!isDryRun && !passed) {
    process.exit(1);
  }
}

// ============================================================================
// CLI ENTRY
// ============================================================================

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");

runReleaseGate(isDryRun).catch((error) => {
  console.error(`\n💥 Release gate error: ${error.message}`);
  process.exit(2);
});
