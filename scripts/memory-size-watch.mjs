#!/usr/bin/env node
/**
 * memory-size-watch.mjs — F7 META artifact for /forge-audit-v2 (2026-05-16, slot juliett).
 *
 * Makes the one-shot U-MEMORY-COMPRESS fix DURABLE. MEMORY.md is loaded into
 * every chat's context at SessionStart; the Anthropic harness silently truncates
 * it past 24576 bytes ("Only part of it was loaded"), breaking fleet-wide
 * cross-session recall. That regression already shipped once (CLAUDE.md
 * §Recent regressions 2026-05-16 U-MEMORY-COMPRESS, 73KB→21KB). With no
 * watchdog the index re-grew to 23826 B (96.9% of ceiling) within days.
 *
 * Mirrors the synergy-regression-watch.mjs contract: read → append history →
 * cron/CI-friendly exit codes.
 *
 * Modes:
 *   node scripts/memory-size-watch.mjs            # human-readable
 *   node scripts/memory-size-watch.mjs --json     # machine-readable
 *   node scripts/memory-size-watch.mjs --history  # tail history jsonl
 *
 * Exit codes (cron/CI):
 *   0 = clean (< warn threshold)
 *   1 = regression (>= warn threshold — index approaching truncation)
 *   2 = measurement error (MEMORY.md unreadable)
 */
import fs from "node:fs";
import path from "node:path";

// Anthropic harness truncates the auto-loaded MEMORY.md past this byte count.
const CEILING_BYTES = 24576;
// Warn when within 10% of the ceiling; critical within 3%.
const WARN_RATIO = 0.90;
const CRITICAL_RATIO = 0.97;

const MEMORY_MD = "C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md";
const HISTORY = "H:/prism/state/shared/memory-size-history.jsonl";

function measure() {
  const bytes = fs.statSync(MEMORY_MD).size;
  const pctOfCeiling = bytes / CEILING_BYTES;
  const status =
    pctOfCeiling >= CRITICAL_RATIO ? "critical" : pctOfCeiling >= WARN_RATIO ? "warn" : "ok";
  return {
    generatedAt: new Date().toISOString(),
    file: MEMORY_MD,
    bytes,
    ceilingBytes: CEILING_BYTES,
    pctOfCeiling: Number(pctOfCeiling.toFixed(4)),
    headroomBytes: CEILING_BYTES - bytes,
    warnRatio: WARN_RATIO,
    criticalRatio: CRITICAL_RATIO,
    status,
  };
}

function appendHistory(rec) {
  try {
    fs.appendFileSync(HISTORY, JSON.stringify(rec) + "\n");
  } catch {
    /* history is best-effort; never fail the watch on history-write error */
  }
}

function tailHistory(n) {
  try {
    const lines = fs.readFileSync(HISTORY, "utf8").trim().split("\n").filter(Boolean);
    return lines.slice(-n).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--history")) {
    const recs = tailHistory(20);
    if (args.includes("--json")) console.log(JSON.stringify(recs, null, 2));
    else
      recs.forEach((r) =>
        console.log(`${r.generatedAt}  ${r.bytes}B  ${(r.pctOfCeiling * 100).toFixed(1)}%  ${r.status}`)
      );
    process.exit(0);
  }

  let rec;
  try {
    rec = measure();
  } catch (e) {
    const err = { generatedAt: new Date().toISOString(), error: String(e && e.message || e), status: "measurement-error" };
    if (args.includes("--json")) console.log(JSON.stringify(err, null, 2));
    else console.error(`memory-size-watch: cannot read ${MEMORY_MD} — ${err.error}`);
    process.exit(2);
  }

  appendHistory(rec);

  if (args.includes("--json")) {
    console.log(JSON.stringify(rec, null, 2));
  } else {
    const bar =
      rec.status === "critical" ? "🔴 CRITICAL" : rec.status === "warn" ? "🟠 WARN" : "🟢 OK";
    console.log(
      `${bar}  MEMORY.md ${rec.bytes}B / ${rec.ceilingBytes}B ceiling ` +
        `(${(rec.pctOfCeiling * 100).toFixed(1)}%, ${rec.headroomBytes}B headroom)`
    );
    if (rec.status !== "ok") {
      console.log(
        `  → Compress the index now (entries must be ≤200 chars per global CLAUDE.md schema). ` +
          `Prior fix: U-MEMORY-COMPRESS 2026-05-16. Underlying memory files are NOT the issue — only MEMORY.md is auto-loaded.`
      );
    }
  }

  process.exit(rec.status === "ok" ? 0 : 1);
}

const invokedDirectly =
  process.argv[1] && path.basename(process.argv[1]) === "memory-size-watch.mjs";
if (invokedDirectly) main();

export { measure, CEILING_BYTES, WARN_RATIO, CRITICAL_RATIO, tailHistory };
