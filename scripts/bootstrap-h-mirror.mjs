// bootstrap-h-mirror.mjs - INTEL-OLLAMA-OBSIDIAN-MS0/P6-U01
// Initial sweep that copies all current C:\Users\<user>\.claude files into
// H:\.claude where missing. Refuses to auto-overwrite diverged files (those
// require human resolution — the audit script flags them).
//
// Idempotent: re-running is safe and reports what would change without acting
// when --dry-run is set.

import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import {
  buildAuditReport,
  H_ROOT,
} from "./lib/c-to-h-mirror-shared.mjs";

function parseArgs(argv) {
  const args = { dryRun: false, force: false, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

const HELP =
  "bootstrap-h-mirror.mjs - mirror C:\\.claude → H:\\.claude where missing.\n\n" +
  "Usage:\n" +
  "  node scripts/bootstrap-h-mirror.mjs --dry-run   # preview only\n" +
  "  node scripts/bootstrap-h-mirror.mjs              # do the sweep\n" +
  "  node scripts/bootstrap-h-mirror.mjs --force      # ALSO overwrite diverged on H: (DESTRUCTIVE)\n";

function ensureDir(absPath) {
  const dir = dirname(absPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) { process.stdout.write(HELP); return; }
  const report = buildAuditReport();
  if (!report.ok) {
    process.stderr.write(`audit failed: ${report.error}\n`);
    process.exit(2);
  }
  if (report.note) process.stdout.write(`${report.note}\n`);
  const cOnly = report.c_only;
  const diverged = report.diverged;
  const stats = { copied: 0, skipped_diverged: 0, overwrote: 0, dry_run: args.dryRun };

  for (const c of cOnly) {
    if (args.dryRun) {
      process.stdout.write(`[dry-run] would copy C: → H: : ${c.rel}\n`);
    } else {
      ensureDir(c.hAbs);
      copyFileSync(c.cAbs, c.hAbs);
      process.stdout.write(`copied: ${c.rel}\n`);
    }
    stats.copied++;
  }

  for (const d of diverged) {
    if (args.force) {
      if (args.dryRun) {
        process.stdout.write(`[dry-run] [--force] would OVERWRITE H: with C: : ${d.rel}\n`);
      } else {
        ensureDir(d.hAbs);
        copyFileSync(d.cAbs, d.hAbs);
        process.stdout.write(`overwrote (--force): ${d.rel}\n`);
      }
      stats.overwrote++;
    } else {
      process.stdout.write(`SKIP diverged (--force to overwrite): ${d.rel}\n`);
      stats.skipped_diverged++;
    }
  }

  process.stdout.write(
    `\nbootstrap done: ${stats.copied} copied, ${stats.overwrote} overwrote, ` +
    `${stats.skipped_diverged} skipped diverged${stats.dry_run ? " (DRY RUN)" : ""}.\n`,
  );

  // Exit non-zero if there were diverged files we didn't resolve — signals to caller
  // that human review is needed.
  if (stats.skipped_diverged > 0) process.exit(1);
}

const entry = process.argv[1];
if (entry && entry.endsWith("bootstrap-h-mirror.mjs")) {
  main();
}
