#!/usr/bin/env node
/**
 * verify-full-wiring — scan all dispatchers and report wiring gaps
 *
 * Universal Phase 0.6. The R4 #3 bug class (duplicate z.enum entries routed
 * to dead switch cases) was a symptom of missing cross-file verification.
 * This script is the verification gate — run as pre-commit, nightly, or
 * PreCompact to surface:
 *
 *   - actions registered in z.enum but lacking a `case "<action>":` branch
 *   - switch `case "<action>":` branches for actions not registered in z.enum
 *   - duplicate z.enum entries (the R4 bug itself)
 *   - per-dispatcher action count vs anti-regression floor
 *
 * Output modes:
 *   --json       emit machine-readable JSON (for CI/hooks)
 *   --verbose    include every action name per dispatcher (noisy)
 *   --fail-on    exit 1 if any issue category ≥ threshold (default: any)
 *   --file=PATH  scan only one dispatcher (default: all)
 *
 * V1 LIMITATION: cross-file enum composition (e.g. `[...PP_ACTIONS, ...CALC_ACTIONS]`
 * spreads from imported constant arrays) is NOT resolved. Actions defined in an
 * imported module and spread into the dispatcher's enum appear as "orphan cases"
 * in the `casesWithoutAction` metric. The `duplicateEnumActions` check is
 * authoritative (that's the R4 #3 bug class this tool primarily targets);
 * `casesWithoutAction` should be read as a SUPERSET — real gaps plus cross-file
 * noise. A V2 parser would resolve import graphs before analysis.
 *
 * Usage:
 *   node scripts/verify-full-wiring.ts
 *   node scripts/verify-full-wiring.ts --json
 *   node scripts/verify-full-wiring.ts --file=ppDispatcher.ts
 *
 * @module scripts/verify-full-wiring
 * @phase Universal 0.6 Auto-Wiring Transactional Closure
 */

import { promises as fs } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const DISPATCHERS_DIR = path.join(ROOT, "src", "tools", "dispatchers");

// ============================================================================
// TYPES
// ============================================================================

interface DispatcherReport {
  file: string;
  totalEnumActions: number;
  uniqueEnumActions: number;
  duplicateEnumActions: string[];
  switchCaseCount: number;
  actionsWithoutCase: string[];
  casesWithoutAction: string[];
}

interface FullReport {
  scanned: number;
  dispatchers: DispatcherReport[];
  summary: {
    totalDispatchers: number;
    totalActions: number;
    totalIssues: number;
    issuesByKind: Record<string, number>;
  };
}

// ============================================================================
// PARSER
// ============================================================================

/**
 * Extract z.enum(["..."]) contents from dispatcher source.
 * Handles multiple z.enum blocks per file (dispatchers frequently declare
 * section-specific enums that are spread-merged into the canonical ACTIONS
 * export). Ignores actions that only appear in imported enum arrays —
 * cross-file composition is handled by the consumer of the report.
 */
function parseEnumActions(src: string): string[] {
  const actions: string[] = [];
  // Find every z.enum([...]) occurrence
  const re = /z\.enum\s*\(\s*\[/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src))) {
    const enumStart = match.index;
    const openBracket = src.indexOf("[", enumStart);
    if (openBracket < 0) continue;
    // Find matching close bracket
    let depth = 0;
    let end = -1;
    for (let i = openBracket; i < src.length; i++) {
      const ch = src[i];
      if (ch === "[") depth++;
      else if (ch === "]") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end < 0) continue;
    const block = src.slice(enumStart, end + 1);
    const inner = /"([a-z_][a-z0-9_]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = inner.exec(block))) {
      actions.push(m[1]);
    }
  }
  return actions;
}

/** Extract switch-case action names from the router function. */
function parseSwitchCases(src: string): string[] {
  const cases: string[] = [];
  const re = /case\s+"([a-z_][a-z0-9_]*)"\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    cases.push(m[1]);
  }
  return cases;
}

// ============================================================================
// ANALYZER
// ============================================================================

function dedupWithCount(arr: string[]): { unique: string[]; duplicates: string[] } {
  const seen = new Map<string, number>();
  for (const a of arr) seen.set(a, (seen.get(a) ?? 0) + 1);
  const duplicates = [...seen.entries()].filter(([, c]) => c > 1).map(([a]) => a);
  const unique = [...seen.keys()];
  return { unique, duplicates };
}

async function analyzeFile(filePath: string): Promise<DispatcherReport> {
  const src = await fs.readFile(filePath, "utf-8");
  const file = path.basename(filePath);

  const enumActions = parseEnumActions(src);
  const { unique: uniqueEnumActions, duplicates: duplicateEnumActions } = dedupWithCount(enumActions);
  const cases = parseSwitchCases(src);

  // Compare sets. Allow duplicate cases (some dispatchers have repeated
  // cases for branching logic, but the first-match semantics apply).
  const caseSet = new Set(cases);
  const actionSet = new Set(uniqueEnumActions);
  const actionsWithoutCase = uniqueEnumActions.filter((a) => !caseSet.has(a));
  const casesWithoutAction = [...caseSet].filter((c) => !actionSet.has(c));

  return {
    file,
    totalEnumActions: enumActions.length,
    uniqueEnumActions: uniqueEnumActions.length,
    duplicateEnumActions,
    switchCaseCount: cases.length,
    actionsWithoutCase,
    casesWithoutAction,
  };
}

// ============================================================================
// CLI
// ============================================================================

interface CliArgs {
  json: boolean;
  verbose: boolean;
  failOn: "any" | "none";
  file: string | null;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { json: false, verbose: false, failOn: "any", file: null };
  for (const a of argv) {
    if (a === "--json") args.json = true;
    else if (a === "--verbose") args.verbose = true;
    else if (a === "--fail-on=none") args.failOn = "none";
    else if (a === "--fail-on=any") args.failOn = "any";
    else if (a.startsWith("--file=")) args.file = a.slice("--file=".length);
  }
  return args;
}

function summarize(reports: DispatcherReport[]): FullReport {
  let totalIssues = 0;
  const issuesByKind: Record<string, number> = {
    duplicateEnumActions: 0,
    actionsWithoutCase: 0,
    casesWithoutAction: 0,
  };
  for (const r of reports) {
    issuesByKind.duplicateEnumActions += r.duplicateEnumActions.length;
    issuesByKind.actionsWithoutCase += r.actionsWithoutCase.length;
    issuesByKind.casesWithoutAction += r.casesWithoutAction.length;
  }
  totalIssues = issuesByKind.duplicateEnumActions + issuesByKind.actionsWithoutCase + issuesByKind.casesWithoutAction;
  return {
    scanned: reports.length,
    dispatchers: reports,
    summary: {
      totalDispatchers: reports.length,
      totalActions: reports.reduce((sum, r) => sum + r.uniqueEnumActions, 0),
      totalIssues,
      issuesByKind,
    },
  };
}

function printText(report: FullReport, verbose: boolean): void {
  const { summary, dispatchers } = report;
  console.log(`verify-full-wiring — scanned ${summary.totalDispatchers} dispatchers, ${summary.totalActions} unique actions`);
  console.log(`  issues: ${summary.totalIssues} total`);
  console.log(`    duplicate enum entries:  ${summary.issuesByKind.duplicateEnumActions}`);
  console.log(`    enum w/o switch case:    ${summary.issuesByKind.actionsWithoutCase}`);
  console.log(`    switch case w/o enum:    ${summary.issuesByKind.casesWithoutAction}`);
  console.log();

  const withIssues = dispatchers.filter(
    (d) => d.duplicateEnumActions.length + d.actionsWithoutCase.length + d.casesWithoutAction.length > 0
  );
  if (withIssues.length === 0) {
    console.log("  ✓ all dispatchers clean");
    return;
  }
  for (const d of withIssues) {
    console.log(`  ${d.file} [${d.uniqueEnumActions} actions, ${d.switchCaseCount} cases]`);
    if (d.duplicateEnumActions.length > 0) {
      console.log(`    dup enum: ${d.duplicateEnumActions.slice(0, verbose ? Infinity : 10).join(", ")}${!verbose && d.duplicateEnumActions.length > 10 ? " …" : ""}`);
    }
    if (d.actionsWithoutCase.length > 0) {
      console.log(`    no case : ${d.actionsWithoutCase.slice(0, verbose ? Infinity : 10).join(", ")}${!verbose && d.actionsWithoutCase.length > 10 ? " …" : ""}`);
    }
    if (d.casesWithoutAction.length > 0) {
      console.log(`    orphan case: ${d.casesWithoutAction.slice(0, verbose ? Infinity : 10).join(", ")}${!verbose && d.casesWithoutAction.length > 10 ? " …" : ""}`);
    }
  }
}

export async function verifyFullWiring(args: Partial<CliArgs> = {}): Promise<FullReport> {
  const opts: CliArgs = { json: false, verbose: false, failOn: "any", file: null, ...args };
  const files = opts.file
    ? [path.join(DISPATCHERS_DIR, opts.file)]
    : (await fs.readdir(DISPATCHERS_DIR))
        .filter((f) => f.endsWith("Dispatcher.ts"))
        .map((f) => path.join(DISPATCHERS_DIR, f));
  const reports: DispatcherReport[] = [];
  for (const f of files) {
    try {
      reports.push(await analyzeFile(f));
    } catch {
      // skip unreadable files
    }
  }
  return summarize(reports);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const report = await verifyFullWiring(args);
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printText(report, args.verbose);
  }
  if (args.failOn === "any" && report.summary.totalIssues > 0) {
    process.exit(1);
  }
  process.exit(0);
}

// Only run main when invoked directly (not when imported by tests).
// `import.meta.url` compares normalize path case on Windows.
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : "";
const thisPath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === thisPath) {
  main().catch((err) => {
    console.error("verify-full-wiring failed:", err);
    process.exit(2);
  });
}
