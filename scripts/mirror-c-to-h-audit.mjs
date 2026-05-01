// mirror-c-to-h-audit.mjs - INTEL-OLLAMA-OBSIDIAN-MS0/P6-U01
// Audits the C:\Users\<user>\.claude → H:\.claude mirror invariant established by
// the c-to-h-mirror.mjs PostToolUse hook. Reports c_only files (mirror gaps),
// diverged files (content mismatch), and h_only files (informational; H: is
// canonical so this isn't a regression).
//
// Outputs human summary by default; pass --json for machine-readable output.
// Exits non-zero if c_only or diverged > 0 (CI gate signal).

import { writeFileSync } from "node:fs";
import { dirname, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAuditReport } from "./lib/c-to-h-mirror-shared.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = pathResolve(__dirname, "..");
const REPORT_PATH = "mcp-server/data/state/MIRROR-C-TO-H-AUDIT.json";

function parseArgs(argv) {
  const args = { json: false, write: false, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--write") args.write = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

const HELP =
  "mirror-c-to-h-audit.mjs - audit C: → H: mirror coverage.\n\n" +
  "Usage:\n" +
  "  node scripts/mirror-c-to-h-audit.mjs            # human summary\n" +
  "  node scripts/mirror-c-to-h-audit.mjs --json     # JSON to stdout\n" +
  "  node scripts/mirror-c-to-h-audit.mjs --write    # JSON to MIRROR-C-TO-H-AUDIT.json\n";

function humanReport(report) {
  if (!report.ok) return `error: ${report.error}\n`;
  const s = report.summary;
  const lines = [
    `c→h mirror audit (${report.generated_at}):`,
    `  C: root: ${report.cRoot}`,
    `  H: root: ${report.hRoot}`,
    `  total tracked on C: ${s.total}`,
    `  identical:           ${s.identical}`,
    `  diverged (HUMAN REVIEW): ${s.diverged}`,
    `  c_only (MIRROR GAP):     ${s.c_only}`,
    `  h_only (informational):  ${s.h_only}`,
  ];
  if (report.diverged.length > 0) {
    lines.push(``, `Diverged files (top 10):`);
    for (const d of report.diverged.slice(0, 10)) {
      lines.push(`  - ${d.rel}  (C:${(d.cHash || "").slice(0, 8)} ≠ H:${(d.hHash || "").slice(0, 8)})`);
    }
  }
  if (report.c_only.length > 0) {
    lines.push(``, `C-only files (top 10) — bootstrap will mirror these:`);
    for (const c of report.c_only.slice(0, 10)) {
      lines.push(`  - ${c.rel}`);
    }
  }
  if (report.note) lines.push(``, report.note);
  return lines.join("\n") + "\n";
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) { process.stdout.write(HELP); return; }
  const report = buildAuditReport();
  if (args.write) {
    const out = `${REPO_ROOT}/${REPORT_PATH}`;
    writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
    process.stdout.write(`written to ${REPORT_PATH}\n`);
  }
  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else process.stdout.write(humanReport(report));
  if (report.ok && (report.summary.diverged > 0 || report.summary.c_only > 0)) {
    process.exit(1);
  }
}

const entry = process.argv[1];
if (entry && entry.endsWith("mirror-c-to-h-audit.mjs")) {
  main();
}
