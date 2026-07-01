#!/usr/bin/env node
// tier: T3
/**
 * stop-compounding-budget.mjs — F4 advisory.
 *
 * Counts git commits in the last ~4h. If ≥N (default 5) AND no recent
 * forge-audit artifact (state/shared/specs/*AUDIT*.md mtime within last
 * 7d), surface an advisory recommending /forge-audit-v2 before the
 * compounding gains rot.
 *
 * Soft, never blocks. Once per Stop with a 6h marker to avoid nagging.
 *
 * Knobs:
 *   PRISM_COMPOUND_BUDGET_DISABLE=1       — off
 *   PRISM_COMPOUND_BUDGET_THRESHOLD=N     — commits trigger (default 5)
 *   PRISM_COMPOUND_BUDGET_WINDOW_HOURS=N  — commit window (default 4)
 *   PRISM_COMPOUND_BUDGET_AUDIT_FRESH_DAYS=N — audit-fresh threshold (default 7)
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const MARKER_DIR = "H:/prism/.claude/cache";
const MARKER_TTL_MS = 6 * 60 * 60 * 1000;       // 6h
const SPECS_DIR = "H:/prism/state/shared/specs";
const REPO_DIR = "H:/prism";
const SILENCE = { continue: true, suppressOutput: true };

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function emit(o) { process.stdout.write(JSON.stringify(o)); }

function recentMarkerPath(sid) {
  const safe = String(sid || "global").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
  return path.join(MARKER_DIR, `compound-budget-${safe}.marker`);
}

function alreadyNagged(sid) {
  try {
    const p = recentMarkerPath(sid);
    if (!fs.existsSync(p)) return false;
    return (Date.now() - fs.statSync(p).mtimeMs) < MARKER_TTL_MS;
  } catch { return false; }
}

function markNagged(sid) {
  try {
    if (!fs.existsSync(MARKER_DIR)) fs.mkdirSync(MARKER_DIR, { recursive: true });
    fs.writeFileSync(recentMarkerPath(sid), new Date().toISOString());
  } catch {}
}

function recentCommitCount(windowHours) {
  try {
    const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
    const out = execFileSync("git", ["-C", REPO_DIR, "log", `--since=${since}`, "--pretty=format:%h", "--no-merges"], { windowsHide: true, encoding: "utf-8", timeout: 5000 });
    return out.trim() ? out.trim().split("\n").length : 0;
  } catch { return 0; }
}

function hasRecentAudit(daysFresh) {
  try {
    if (!fs.existsSync(SPECS_DIR)) return false;
    const threshold = Date.now() - daysFresh * 24 * 3600 * 1000;
    for (const f of fs.readdirSync(SPECS_DIR)) {
      if (!/AUDIT/i.test(f)) continue;
      try {
        const st = fs.statSync(path.join(SPECS_DIR, f));
        if (st.mtimeMs > threshold) return true;
      } catch {}
    }
    return false;
  } catch { return false; }
}

function main() {
  if (process.env.PRISM_COMPOUND_BUDGET_DISABLE === "1") { emit(SILENCE); return; }
  const stdin = readStdin() || {};
  const sid = stdin.session_id || "global";
  if (alreadyNagged(sid)) { emit(SILENCE); return; }

  const threshold = Number(process.env.PRISM_COMPOUND_BUDGET_THRESHOLD || 5);
  const windowHours = Number(process.env.PRISM_COMPOUND_BUDGET_WINDOW_HOURS || 4);
  const auditFreshDays = Number(process.env.PRISM_COMPOUND_BUDGET_AUDIT_FRESH_DAYS || 7);

  const commits = recentCommitCount(windowHours);
  if (commits < threshold) { emit(SILENCE); return; }
  if (hasRecentAudit(auditFreshDays)) { emit(SILENCE); return; }

  markNagged(sid);
  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext: [
        `## 📊 Compounding budget — audit due`,
        ``,
        `**${commits} commits in last ${windowHours}h** + no `+ `*AUDIT*.md in ${SPECS_DIR} touched in ${auditFreshDays} days.`,
        ``,
        `Compounding gains rot when the audit cadence slips. Recommend running before next /loop:`,
        `  • \`/forge-audit-v2\` — full codebase quality audit with Boris doctrine, peer-reviewer auto-spawn, HTML+MD emit`,
        `  • \`/close-out-audit\` — surface silent close-out debt (envelopes whose deliverables shipped but status stayed pending)`,
        ``,
        `Silenced this session for 6h. Disable: \`PRISM_COMPOUND_BUDGET_DISABLE=1\`.`,
      ].join("\n"),
    },
  });
}

try { main(); } catch { emit(SILENCE); }
