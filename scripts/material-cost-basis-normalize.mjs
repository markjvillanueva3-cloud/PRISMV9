#!/usr/bin/env node
/**
 * material-cost-basis-normalize CLI -- QUOTING-SYNERGY-MS0/U-QP-COST-BASIS-NORMALIZE (slot:charlie 2026-06-12).
 *
 * Reads the JM AP ledger (`state/shared/quoting/jm-vendor-ap-ledger.jsonl`),
 * normalizes the parseable `material`-category rows to a density-FREE $/in3 per
 * grade (see scripts/lib/material-cost-basis-normalize.mjs), and emits the clean
 * artifact `state/shared/quoting/jm-material-cost-basis.json` -- the units-correct
 * inbound material cost prior the quote/training loop can consume (material_cost =
 * part_volume_in3 * usd_per_in3), sidestepping the units-blended jm-vendor-cost-index.
 *
 * Flags:
 *   --ledger=PATH   override the AP ledger jsonl (default state/shared/quoting/jm-vendor-ap-ledger.jsonl)
 *   --out=PATH      override the output artifact path
 *   --json          print the full result to stdout (in addition to disk)
 *   --no-write      compute + print, do NOT write the artifact (dry-run)
 *
 * Exit: 0 ok, 2 pre-flight failure (ledger missing/unreadable/empty).
 */
import { promises as fs } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { aggregateByGrade } from "./lib/material-cost-basis-normalize.mjs";

const DEFAULT_LEDGER = resolve(process.cwd(), "state/shared/quoting/jm-vendor-ap-ledger.jsonl");
const DEFAULT_OUT = resolve(process.cwd(), "state/shared/quoting/jm-material-cost-basis.json");
const SCHEMA_VERSION = "1.0.0";

function val(name, def) {
  const pre = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pre));
  return hit ? hit.slice(pre.length) : def;
}
const flag = (name) => process.argv.includes(`--${name}`);

async function main() {
  const ledgerPath = resolve(val("ledger", DEFAULT_LEDGER));
  const outPath = resolve(val("out", DEFAULT_OUT));
  const jsonOut = flag("json");
  const noWrite = flag("no-write");

  let raw;
  try {
    raw = await fs.readFile(ledgerPath, "utf8");
  } catch (e) {
    console.error(`[cost-basis] R12 FAIL -- AP ledger not readable: ${ledgerPath}\n  ${e.message}`);
    process.exit(2);
  }

  const rows = [];
  let parseErrors = 0;
  for (const line of raw.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    try { rows.push(JSON.parse(s)); } catch { parseErrors += 1; }
  }
  if (rows.length === 0) {
    console.error(`[cost-basis] R12 FAIL -- ledger has 0 parseable rows (${parseErrors} parse errors)`);
    process.exit(2);
  }

  const result = aggregateByGrade(rows);

  // Sort grades by block_n desc for human scan; build a compact artifact.
  const artifact = {
    schemaVersion: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    source: ledgerPath,
    parse_errors: parseErrors,
    summary: result.summary,
    grades: result.grades,
  };

  if (!noWrite) {
    await fs.mkdir(dirname(outPath), { recursive: true });
    const tmp = `${outPath}.tmp-${process.pid}`;
    let renamed = false;
    try {
      await fs.writeFile(tmp, JSON.stringify(artifact, null, 2), "utf8");
      await fs.rename(tmp, outPath); // atomic
      renamed = true;
    } finally {
      // If rename never completed (write error / cross-device / perms), the tmp
      // would otherwise orphan on disk (PID-suffixed -> never overwritten). Clean it.
      if (!renamed) await fs.unlink(tmp).catch(() => {});
    }
  }

  // Human summary
  const grades = Object.entries(result.grades).sort((a, b) => (b[1].block_n + b[1].round_n) - (a[1].block_n + a[1].round_n));
  console.log(`[cost-basis] ${result.summary.resolved}/${result.summary.total_rows} rows resolved (${result.summary.resolved_pct}%), ${result.summary.consumable_grade_count}/${result.summary.grade_count} grades consumable (>=1 finished block)`);
  console.log(`grade     $/in3(blk) conf    blk_n  rnd_n  round_adv  regime_gap`);
  for (const [g, v] of grades) {
    const gap = v.finished_vs_raw_gap_pct == null ? "  -  " : `${(v.finished_vs_raw_gap_pct * 100).toFixed(0)}%`;
    const per = v.usd_per_in3 == null ? "  -  " : `$${v.usd_per_in3.toFixed(3)}`;
    const radv = v.round_advisory_median == null ? "  -  " : `$${v.round_advisory_median.toFixed(3)}`;
    console.log(`${g.padEnd(9)} ${per.padStart(9)}  ${v.confidence.padEnd(6)} ${String(v.block_n).padStart(4)}  ${String(v.round_n).padStart(4)}  ${radv.padStart(8)}  ${gap.padStart(6)}`);
  }
  if (!noWrite) console.log(`[cost-basis] artifact -> ${outPath}`);

  if (jsonOut) process.stdout.write(JSON.stringify(artifact) + "\n");
  process.exit(0);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((e) => { console.error(`[cost-basis] FATAL: ${e.message}`); process.exit(2); });
}

export { main };
