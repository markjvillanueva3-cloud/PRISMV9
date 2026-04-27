#!/usr/bin/env node
/**
 * wiki-lint-periodic.mjs — Stop hook
 *
 * Periodically reminds the user (and the next session) to run
 * `/wiki-lint` when the last lint report is older than the staleness
 * threshold. Runs at session Stop, never blocks the stop.
 *
 * Threshold: 24 hours since the most recent `lint-reports/YYYY-MM-DD.md`
 * file's mtime. If newer than threshold → silent {continue: true}.
 *
 * Suppression: write a marker `state/shared/.wiki-lint-suggested-on`
 * with today's date so we don't suggest more than once per calendar day.
 *
 * Contract: emit `{continue: true, systemMessage: ...}` for the harness
 * to surface the suggestion without blocking. On any error → silent
 * `{continue: true}`.
 */

import fs from "node:fs";
import path from "node:path";

const LINT_REPORTS_DIR = "H:/prism/knowledge/wiki/lint-reports";
const SUGGEST_MARKER = "H:/prism/state/shared/.wiki-lint-suggested-on";
const STALE_HOURS = 24;
const MS_PER_HOUR = 3600 * 1000;

function readStdin() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

function main() {
  const cont = (extra) => {
    const out = { continue: true, ...(extra ?? {}) };
    console.log(JSON.stringify(out));
  };

  // Drain stdin so the harness doesn't see our hook block on it.
  try { readStdin(); } catch { /* ignore */ }

  // Already suggested today? bail.
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (fs.existsSync(SUGGEST_MARKER)) {
      const last = fs.readFileSync(SUGGEST_MARKER, "utf-8").trim();
      if (last === today) return cont();
    }
  } catch { /* ignore */ }

  // Find newest lint report.
  let newestMs = 0;
  try {
    if (!fs.existsSync(LINT_REPORTS_DIR)) {
      // No reports dir yet → this is the very first run ever; suggest.
      newestMs = 0;
    } else {
      const files = fs.readdirSync(LINT_REPORTS_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
      for (const f of files) {
        try {
          const stat = fs.statSync(path.join(LINT_REPORTS_DIR, f));
          if (stat.mtimeMs > newestMs) newestMs = stat.mtimeMs;
        } catch { /* ignore */ }
      }
    }
  } catch { return cont(); }

  const ageHours = newestMs === 0 ? Infinity : (Date.now() - newestMs) / MS_PER_HOUR;
  if (ageHours < STALE_HOURS) return cont();

  // Mark today's date so we don't repeat the suggestion this session/day.
  try {
    fs.mkdirSync(path.dirname(SUGGEST_MARKER), { recursive: true });
    fs.writeFileSync(SUGGEST_MARKER, today);
  } catch { /* ignore */ }

  const ageStr = newestMs === 0 ? "never run" : `${Math.round(ageHours)}h old`;
  const msg = `wiki-lint reminder: last lint report ${ageStr} (≥${STALE_HOURS}h threshold). Consider \`/wiki-lint\` next session to surface orphans, drift, and contradictions.`;

  return cont({ systemMessage: msg });
}

main();
