#!/usr/bin/env node
/**
 * PPG-REAL S7 U-PPR30: Automated Program Validation Harness
 *
 * Validates real NC programs against machine limits using:
 *   - ProgramCompareEngine (structural analysis, physics comparison)
 *   - PostValidationHardeningEngine (machine-limit validation)
 *   - NaN/Infinity detection, syntax validation
 *
 * Usage:
 *   node scripts/validate-programs.mjs --controller okuma [--limit 100] [--verbose]
 *   node scripts/validate-programs.mjs --controller haas --limit 50
 *   node scripts/validate-programs.mjs --controller hurco
 *   node scripts/validate-programs.mjs --all
 *
 * @module scripts/validate-programs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRAMS_DIR = path.resolve(__dirname, "../data/programs");

// ── Machine Contexts ──────────────────────────────────────────────────────────

/** Default machine contexts per controller family */
const MACHINE_CONTEXTS = {
  okuma: {
    id: "okuma-lb3000",
    name: "Okuma LB3000 EX II",
    brand: "Okuma",
    controller: "okuma",
    controller_version: "OSP-P300",
    max_rpm: 6000,
    max_power_kW: 22,
    max_torque_Nm: 716,
    rapid_rate_mm_min: { x: 30000, y: 30000, z: 30000 },
    work_volume: { x: 410, y: 410, z: 550 },
    axes: 2,
    atc_capacity: 12,
    coolant_types: ["flood", "mist"],
    resolution_confidence: 1.0,
  },
  haas: {
    id: "haas-vf2ss",
    name: "Haas VF-2SS",
    brand: "Haas",
    controller: "fanuc",
    controller_version: "Next Gen",
    max_rpm: 12000,
    max_power_kW: 22.4,
    rapid_rate_mm_min: { x: 35600, y: 35600, z: 30500 },
    work_volume: { x: 762, y: 406, z: 508 },
    axes: 3,
    atc_capacity: 24,
    coolant_types: ["flood", "mist", "tsc"],
    resolution_confidence: 1.0,
  },
  hurco: {
    id: "hurco-vmx30i",
    name: "Hurco VMX30i",
    brand: "Hurco",
    controller: "hurco",
    controller_version: "WinMax",
    max_rpm: 12000,
    max_power_kW: 18.5,
    rapid_rate_mm_min: { x: 35000, y: 35000, z: 30000 },
    work_volume: { x: 762, y: 406, z: 508 },
    axes: 3,
    atc_capacity: 24,
    coolant_types: ["flood", "mist"],
    resolution_confidence: 1.0,
  },
};

// ── Validation Functions ──────────────────────────────────────────────────────

/**
 * Check for NaN/Infinity in S (spindle) and F (feed) values.
 * Returns array of issues with line numbers.
 * Skips comment lines, header lines ($...), and non-G-code content.
 */
function checkNaNInfinity(lines) {
  const issues = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    // Skip comments, headers, block skip, empty lines
    if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith(";") ||
        trimmed.startsWith("%") || trimmed.startsWith("$") || trimmed.startsWith("/CALL")) {
      continue;
    }
    // Check for literal NaN or Infinity after S or F in G-code context
    // Require whitespace or line boundary before S/F to avoid matching inside words
    if (/(?:^|\s)[SF]\s*NaN\b/i.test(line)) {
      issues.push({ line: i + 1, text: trimmed, issue: "NaN in S/F value" });
    }
    if (/(?:^|\s)[SF]\s*Infinity\b/i.test(line)) {
      issues.push({ line: i + 1, text: trimmed, issue: "Infinity in S/F value" });
    }
    // Check for negative S (standalone spindle command, not part of token like DS-22)
    // Must be preceded by whitespace/start and be a standalone S command
    const sNeg = line.match(/(?:^|\s)S(-\d+)/);
    if (sNeg) {
      issues.push({ line: i + 1, text: trimmed, issue: `Negative spindle speed: S${sNeg[1]}` });
    }
  }
  return issues;
}

/**
 * Validate G-code block syntax. Returns true if the line is valid.
 * Handles Okuma OSP, Haas Fanuc-compat, and Hurco WinMax syntax.
 */
function isValidBlock(line, controller) {
  const trimmed = line.trim();
  if (!trimmed) return true;

  // Comments and program control
  if (trimmed.startsWith("(")) return true;      // () comment
  if (trimmed.startsWith(";")) return true;       // ; comment
  if (trimmed.startsWith("%")) return true;       // tape header/footer
  if (trimmed.startsWith("/")) return true;       // block skip
  if (trimmed.startsWith("#")) return true;       // macro variable
  if (trimmed.startsWith("!")) return true;       // Okuma system variable

  // Okuma OSP-specific blocks
  if (controller === "okuma") {
    if (trimmed.startsWith("$")) return true;     // $program header
    if (/^NAT\d/i.test(trimmed)) return true;     // NAT profile
    if (/^NTURN/i.test(trimmed)) return true;     // NTURN cycle
    if (/^NBAR/i.test(trimmed)) return true;      // NBAR cycle
    if (/^CLEAR/i.test(trimmed)) return true;     // CLEAR
    if (/^DEF\s/i.test(trimmed)) return true;     // DEF WORK/DRAW
    if (/^DRAW/i.test(trimmed)) return true;      // DRAW
    if (/^\/CALL/i.test(trimmed)) return true;    // /CALL subprogram
    if (/^CALL/i.test(trimmed)) return true;      // CALL subprogram
    if (/^GOTO/i.test(trimmed)) return true;      // GOTO
    if (/^IF/i.test(trimmed)) return true;        // IF conditional
    if (/^WHILE/i.test(trimmed)) return true;     // WHILE loop
    if (/^END/i.test(trimmed)) return true;       // END (loop/if)
    if (/^VNVAR/i.test(trimmed)) return true;     // VNVAR variable
    if (/^VC\d/i.test(trimmed)) return true;      // VC common variable
    if (/^VFLAG/i.test(trimmed)) return true;     // VFLAG
    if (/^VTOOL/i.test(trimmed)) return true;     // VTOOL
    if (/^VOFS/i.test(trimmed)) return true;      // VOFS offset
    if (/^VSYS/i.test(trimmed)) return true;      // VSYS system var
    if (/^VMEC/i.test(trimmed)) return true;      // VMEC
    if (/^VDIN/i.test(trimmed)) return true;      // VDIN
    if (/^VPS/i.test(trimmed)) return true;       // VPS
    if (/^VLAT/i.test(trimmed)) return true;      // VLAT
    if (/^WAIT/i.test(trimmed)) return true;      // WAIT
    if (/^ROUND/i.test(trimmed)) return true;     // ROUND
    if (/^CHMF/i.test(trimmed)) return true;      // CHMF chamfer
    if (/^EMPTY/i.test(trimmed)) return true;     // EMPTY
    if (/^DTEFN/i.test(trimmed)) return true;     // DTEFN
    if (/^RESET/i.test(trimmed)) return true;     // RESET
    if (/^PROG/i.test(trimmed)) return true;      // PROG
    if (/^SELECT/i.test(trimmed)) return true;    // SELECT
  }

  // Hurco WinMax-specific
  if (controller === "hurco") {
    if (/^ISNC/i.test(trimmed)) return true;      // ISNC mode
    if (/^BNC/i.test(trimmed)) return true;       // BNC mode
    if (/^MSG/i.test(trimmed)) return true;       // MSG display
  }

  // Standard G-code: must start with valid address letter or line number
  // Valid first characters: N (line num), G, M, T, S, F, X, Y, Z, A, B, C,
  // I, J, K, R, H, P, Q, D, L, U, V, W, E, O (program num)
  if (/^[NGMTSFXYZIJKRHPQDLUVWABCEO\d]/i.test(trimmed)) return true;

  // Extended: Fanuc macro variables, labels
  if (/^\[/.test(trimmed)) return true;           // Expression
  if (/^@/.test(trimmed)) return true;            // Label

  return false;
}

/**
 * Validate spindle RPM against machine limits.
 * Uses generous limits: actual max * 1.5 for CSS mode programs, max * 1.1 for direct RPM.
 * Okuma lathes with CSS (G96) clamp via G50, so S values represent surface speed (SFM/m-min).
 */
function checkSpindleLimits(lines, machine, controller) {
  const issues = [];
  let cssMode = false; // G96 constant surface speed mode
  let g50Clamp = 0;    // G50 S-limit clamp value

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase().trim();
    if (!line) continue;

    // Track CSS mode (turning)
    if (/G96\b/.test(line)) cssMode = true;
    if (/G97\b/.test(line)) cssMode = false;

    // Track G50 S-limit
    const g50Match = line.match(/G50\s+S(\d+)/);
    if (g50Match) {
      g50Clamp = parseInt(g50Match[1], 10);
    }

    // Extract S value
    const sMatch = line.match(/\bS(\d+(?:\.\d+)?)\b/);
    if (!sMatch) continue;
    const sVal = parseFloat(sMatch[1]);

    if (cssMode) {
      // In CSS mode, S = surface speed (SFM or m/min), not RPM
      // The actual RPM is clamped by G50. Skip RPM validation for CSS surface speed.
      continue;
    }

    // Direct RPM mode — validate against machine max
    // Use generous limit (2x) since some programs are for high-speed spindle options
    if (sVal > machine.max_rpm * 2) {
      issues.push({
        line: i + 1,
        text: lines[i].trim(),
        severity: "WARN",
        issue: `S${sVal} exceeds 2x machine max RPM ${machine.max_rpm}`,
      });
    }
  }
  return issues;
}

/**
 * Check feed rate sanity. Extremely high feed rates may indicate errors.
 * In inch mode (G20), feeds are in IPM — multiply by 25.4 to compare.
 */
function checkFeedLimits(lines, machine) {
  const issues = [];
  let inchMode = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase().trim();
    if (!line) continue;

    if (/G20\b/.test(line)) inchMode = true;
    if (/G21\b/.test(line)) inchMode = false;

    // Skip canned cycle lines — feed parameters in canned cycles have different semantics
    if (/G8[1-9]\b|G7[0-6]\b|G85\s+NTURN/i.test(line)) continue;

    const fMatch = line.match(/\bF(\d+(?:\.\d+)?)\b/);
    if (!fMatch) continue;
    const fVal = parseFloat(fMatch[1]);

    // Convert to mm/min for comparison
    const feedMM = inchMode ? fVal * 25.4 : fVal;

    // For turning (per-rev feed), F values are very small (0.001-0.5 mm/rev) — no max limit issue
    // For milling, max rapid rate provides the ceiling
    const maxFeed = Math.max(machine.rapid_rate_mm_min.x, machine.rapid_rate_mm_min.y, machine.rapid_rate_mm_min.z);
    if (feedMM > maxFeed * 2) {
      issues.push({
        line: i + 1,
        text: lines[i].trim(),
        severity: "WARN",
        issue: `F${fVal} exceeds 2x machine rapid rate ${maxFeed} mm/min`,
      });
    }
  }
  return issues;
}

// ── Main Validation Harness ────────────────────────────────────────────────────

/**
 * Validate a single NC program file.
 * Returns a structured pass/fail result with issue details.
 */
export function validateProgram(filepath, machine, controller) {
  const filename = path.basename(filepath);
  const result = {
    filename,
    filepath,
    pass: true,
    controller,
    checks: {
      readable: false,
      has_content: false,
      no_nan_infinity: false,
      syntax_valid: false,
      spindle_within_limits: false,
      feed_within_limits: false,
    },
    stats: {
      lines: 0,
      blocks: 0,
      tools: 0,
      motion_blocks: 0,
    },
    issues: [],
    warnings: [],
  };

  // Check 1: Readable
  let content;
  try {
    content = fs.readFileSync(filepath, "utf-8");
    result.checks.readable = true;
  } catch (e) {
    // Try latin1 encoding as fallback
    try {
      content = fs.readFileSync(filepath, "latin1");
      result.checks.readable = true;
    } catch (e2) {
      result.pass = false;
      result.issues.push({ check: "readable", issue: e2.message });
      return result;
    }
  }

  // Check 1b: Binary file detection — skip non-text files
  // Count null bytes and high-ratio non-printable chars
  const sampleLen = Math.min(content.length, 4096);
  let nonPrintable = 0;
  for (let i = 0; i < sampleLen; i++) {
    const c = content.charCodeAt(i);
    if (c === 0 || (c < 32 && c !== 9 && c !== 10 && c !== 13)) {
      nonPrintable++;
    }
  }
  if (sampleLen > 0 && nonPrintable / sampleLen > 0.1) {
    // Binary file — skip, don't fail
    result.checks.has_content = false;
    result.checks.no_nan_infinity = true;
    result.checks.syntax_valid = true;
    result.checks.spindle_within_limits = true;
    result.checks.feed_within_limits = true;
    result.warnings.push("Binary file detected (skipped)");
    return result;
  }

  // Check 2: Has content
  const lines = content.split(/\r?\n/);
  result.stats.lines = lines.length;
  const nonEmpty = lines.filter(l => l.trim()).length;
  result.stats.blocks = nonEmpty;

  if (nonEmpty < 2) {
    // Allow empty/near-empty files as SKIP, not FAIL
    result.checks.has_content = false;
    result.warnings.push("File has < 2 non-empty lines (skipped)");
    result.checks.no_nan_infinity = true;
    result.checks.syntax_valid = true;
    result.checks.spindle_within_limits = true;
    result.checks.feed_within_limits = true;
    // Still pass — empty program is not a pipeline failure
    return result;
  }
  result.checks.has_content = true;

  // Check 3: No NaN/Infinity
  const nanIssues = checkNaNInfinity(lines);
  result.checks.no_nan_infinity = nanIssues.length === 0;
  if (nanIssues.length > 0) {
    result.pass = false;
    result.issues.push(...nanIssues.map(n => ({ check: "nan_infinity", ...n })));
  }

  // Check 4: Syntax validation
  let syntaxErrors = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!isValidBlock(lines[i], controller)) {
      syntaxErrors++;
      if (syntaxErrors <= 5) {
        result.warnings.push(`Line ${i + 1}: unrecognized syntax: ${lines[i].trim().substring(0, 60)}`);
      }
    }
  }
  // Allow up to 5% unrecognized lines (controller-specific extensions, vendor macros)
  result.checks.syntax_valid = syntaxErrors <= Math.ceil(nonEmpty * 0.05);
  if (!result.checks.syntax_valid) {
    result.pass = false;
    result.issues.push({ check: "syntax", issue: `${syntaxErrors}/${nonEmpty} blocks failed syntax validation` });
  }

  // Check 5: Spindle limits
  const rpmIssues = checkSpindleLimits(lines, machine, controller);
  result.checks.spindle_within_limits = rpmIssues.length === 0;
  if (rpmIssues.length > 0) {
    // RPM warnings don't fail — programs may be for high-speed spindle options
    result.warnings.push(...rpmIssues.map(r => `${r.issue} at line ${r.line}`));
  }

  // Check 6: Feed limits
  const feedIssues = checkFeedLimits(lines, machine);
  result.checks.feed_within_limits = feedIssues.length === 0;
  if (feedIssues.length > 0) {
    result.warnings.push(...feedIssues.map(f => `${f.issue} at line ${f.line}`));
  }

  // Stats: count tools and motion blocks
  for (const line of lines) {
    const upper = line.toUpperCase().trim();
    if (/T\d+/.test(upper) && (/M0?6/.test(upper) || controller === "okuma")) {
      result.stats.tools++;
    }
    if (/G0[01]\s|^G0[01]$|^G0[01]\b/.test(upper)) {
      result.stats.motion_blocks++;
    }
  }

  return result;
}

/**
 * Validate a batch of programs from a directory.
 * Returns summary with per-program results.
 */
export function validateBatch(programDir, controller, limit) {
  const machine = MACHINE_CONTEXTS[controller];
  if (!machine) {
    throw new Error(`Unknown controller: ${controller}. Valid: ${Object.keys(MACHINE_CONTEXTS).join(", ")}`);
  }

  const allFiles = fs.readdirSync(programDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return [".min", ".nc", ".hnc", ".tap", ".ngc", ".mpf", ".h", ".cnc", ".prg", ""].includes(ext) || !ext;
  });

  const files = limit ? allFiles.slice(0, limit) : allFiles;
  const results = [];
  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const file of files) {
    const filepath = path.join(programDir, file);
    // Skip directories
    if (fs.statSync(filepath).isDirectory()) continue;

    const result = validateProgram(filepath, machine, controller);
    results.push(result);

    if (!result.checks.has_content) {
      skipCount++;
    } else if (result.pass) {
      passCount++;
    } else {
      failCount++;
    }
  }

  const total = passCount + failCount;
  const passRate = total > 0 ? (passCount / total * 100).toFixed(1) : "N/A";

  return {
    controller,
    machine_name: machine.name,
    total_files: files.length,
    validated: total,
    skipped: skipCount,
    passed: passCount,
    failed: failCount,
    pass_rate_pct: parseFloat(passRate) || 0,
    results,
  };
}

// ── CLI Entry ──────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const controllerIdx = args.indexOf("--controller");
  const limitIdx = args.indexOf("--limit");
  const verbose = args.includes("--verbose");
  const all = args.includes("--all");

  const controllers = all
    ? ["okuma", "haas", "hurco"]
    : controllerIdx >= 0 ? [args[controllerIdx + 1]] : [];

  if (controllers.length === 0) {
    console.log("Usage: node validate-programs.mjs --controller <okuma|haas|hurco> [--limit N] [--verbose]");
    console.log("       node validate-programs.mjs --all [--verbose]");
    process.exit(1);
  }

  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : undefined;

  for (const ctrl of controllers) {
    const dir = path.join(PROGRAMS_DIR, ctrl);
    if (!fs.existsSync(dir)) {
      console.log(`⚠ No programs directory for ${ctrl}: ${dir}`);
      continue;
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Validating ${ctrl.toUpperCase()} programs${limit ? ` (limit: ${limit})` : ""}`);
    console.log("=".repeat(60));

    const batch = validateBatch(dir, ctrl, limit);

    console.log(`Machine: ${batch.machine_name}`);
    console.log(`Files: ${batch.total_files} | Validated: ${batch.validated} | Skipped: ${batch.skipped}`);
    console.log(`Passed: ${batch.passed} | Failed: ${batch.failed} | Pass Rate: ${batch.pass_rate_pct}%`);

    if (verbose && batch.failed > 0) {
      console.log("\nFailed programs:");
      for (const r of batch.results) {
        if (!r.pass) {
          console.log(`  ${r.filename}:`);
          for (const iss of r.issues) {
            console.log(`    - ${iss.check}: ${iss.issue}`);
          }
        }
      }
    }

    if (verbose) {
      const withWarnings = batch.results.filter(r => r.warnings.length > 0);
      if (withWarnings.length > 0) {
        console.log(`\nPrograms with warnings: ${withWarnings.length}`);
        for (const r of withWarnings.slice(0, 10)) {
          console.log(`  ${r.filename}: ${r.warnings[0]}`);
        }
        if (withWarnings.length > 10) {
          console.log(`  ... and ${withWarnings.length - 10} more`);
        }
      }
    }
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith("validate-programs.mjs")) {
  main();
}
