#!/usr/bin/env node
// tier: T1
/**
 * print-accuracy-100pct-gate.mjs — Stop hook for PRINT-OCR-100PCT-MS0/U3.
 *
 * Blocks session-end when the active /goal contains the 100% print-accuracy
 * directive (heuristic match on the session's loop-state task string) AND
 * the corpus coverage report says isOneHundredPercent !== true.
 *
 * Why a Stop hook (not a slash-skill): /goal is built-in. The goal-complete
 * gate framework (CLAUDE.md §GOAL-COMPLETE GATE) reads
 * `state/shared/CLOSE-OUT-CANDIDATES.json`; the 100% directive needs its
 * OWN gate because the candidate audit doesn't know about
 * print-corpus-tables. This hook is the corpus-specific gate.
 *
 * Fail-loud: a missing rows.jsonl or empty corpus is REPORTED, not silently
 * skipped. The hook emits a clear systemMessage telling the chat exactly
 * how to make progress.
 *
 * Knobs:
 *   PRISM_PRINT_ACCURACY_GATE_DISABLE=1  — turn the gate off entirely
 *   PRISM_PRINT_ACCURACY_GATE_DIR=<path> — override print-corpus-tables dir
 *   PRISM_PRINT_ACCURACY_GATE_BYPASS=1   — one-shot bypass (logged)
 */

import fs from "node:fs";
import path from "node:path";

const DEFAULT_DIR = process.env.PRISM_PRINT_ACCURACY_GATE_DIR
  || "H:/prism/state/shared/print-corpus-tables";
const ROWS_FILE = "rows.jsonl";

// The phrases that, if present in the session's loop-state task string,
// activate the 100% gate. Keep this list narrow — we don't want every
// "print" mention to block all chats.
const GATE_TRIGGER_PATTERNS = [
  /100%\s*accuracy.*every\s+print/i,
  /every\s+print.*100%\s*accuracy/i,
  /prove.*100%\s*accurracy.*print/i,  // honors operator's exact phrasing
  /train\s+print\s+ocr.*100%/i,
  /print[\s-]?ocr[\s-]?100pct/i,
];

function readStdinSync() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch {
    return null;
  }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

function isGateActive(sessionId) {
  // Look in state/shared/loop-state/ for THIS session's loop-state task.
  // The autonomous /loop writes its task string there; we use the task to
  // decide whether the 100% gate is the directive.
  if (!sessionId) return false;
  try {
    const dir = "H:/prism/state/shared/loop-state";
    if (!fs.existsSync(dir)) return false;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      // Match prefix on the sanitised sid.
      if (!f.includes(sessionId.slice(0, 8))) continue;
      try {
        const doc = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
        const task = String(doc?.task ?? "");
        if (GATE_TRIGGER_PATTERNS.some((re) => re.test(task))) return true;
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return false;
}

function loadRows(dir) {
  const rowsPath = path.join(dir, ROWS_FILE);
  if (!fs.existsSync(rowsPath)) return { totalRows: 0, passingRows: 0, exists: false };
  const raw = fs.readFileSync(rowsPath, "utf-8");
  let totalRows = 0;
  let passingRows = 0;
  let pendingReview = 0;
  let failedExtraction = 0;
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      totalRows++;
      if (row.scanStatus === "verified_100pct"
        && row.operatorVerdict === "approved"
        && row.accuracyAgainstGroundTruth === 1.0
        && row.groundTruthAvailable === true) {
        passingRows++;
      }
      if (row.requiresOperatorReview && row.operatorVerdict === "pending") {
        pendingReview++;
      }
      if (row.scanStatus === "extraction_failed") {
        failedExtraction++;
      }
    } catch { /* skip malformed */ }
  }
  return { totalRows, passingRows, pendingReview, failedExtraction, exists: true };
}

function main() {
  if (process.env.PRISM_PRINT_ACCURACY_GATE_DISABLE === "1") {
    emit({ continue: true, suppressOutput: true });
    return;
  }
  const stdin = readStdinSync();
  const sid = stdin?.session_id ?? "";

  if (!isGateActive(sid)) {
    // Gate doesn't apply to this session — silent pass-through.
    emit({ continue: true, suppressOutput: true });
    return;
  }

  if (process.env.PRISM_PRINT_ACCURACY_GATE_BYPASS === "1") {
    // Logged bypass (per CLAUDE.md goal-gate pattern).
    try {
      fs.appendFileSync(
        "H:/prism/state/shared/print-accuracy-gate-bypasses.jsonl",
        JSON.stringify({ t: Date.now(), sid }) + "\n",
      );
    } catch { /* ignore */ }
    emit({
      continue: true,
      hookSpecificOutput: {
        additionalContext: "[print-accuracy-gate] BYPASSED via PRISM_PRINT_ACCURACY_GATE_BYPASS=1 (logged).",
      },
    });
    return;
  }

  const stats = loadRows(DEFAULT_DIR);

  if (!stats.exists) {
    emit({
      decision: "block",
      reason: [
        "PRINT-OCR-100PCT GATE — rows.jsonl missing",
        "",
        `Path: ${DEFAULT_DIR}/rows.jsonl`,
        "",
        "Action: run scripts/scan-print-corpus.mjs to populate the corpus table",
        "before declaring the 100% goal complete.",
        "",
        "Knob: PRISM_PRINT_ACCURACY_GATE_DISABLE=1 disables the gate entirely.",
        "      PRISM_PRINT_ACCURACY_GATE_BYPASS=1 logged one-shot bypass.",
      ].join("\n"),
    });
    return;
  }

  if (stats.totalRows === 0) {
    emit({
      decision: "block",
      reason: [
        "PRINT-OCR-100PCT GATE — corpus is empty",
        "",
        "No PrintCorpusRows have been written. The 100% goal requires at",
        "least one print to be scanned + verified.",
        "",
        "Action: run scripts/scan-print-corpus.mjs to scan the corpus.",
      ].join("\n"),
    });
    return;
  }

  const isOneHundred = stats.totalRows > 0 && stats.passingRows === stats.totalRows;
  if (isOneHundred) {
    // Gate cleared — emit a friendly continue.
    emit({
      continue: true,
      hookSpecificOutput: {
        additionalContext: `[print-accuracy-gate] ✓ 100% (${stats.passingRows}/${stats.totalRows}) — goal proven.`,
      },
    });
    return;
  }

  const pct = ((stats.passingRows / stats.totalRows) * 100).toFixed(2);
  emit({
    decision: "block",
    reason: [
      "PRINT-OCR-100PCT GATE — coverage BELOW 100%",
      "",
      `Coverage: ${stats.passingRows}/${stats.totalRows} = ${pct}%`,
      `Pending operator review: ${stats.pendingReview ?? 0}`,
      `Failed extraction:       ${stats.failedExtraction ?? 0}`,
      "",
      "A row PASSES iff:",
      "  scanStatus='verified_100pct' AND",
      "  operatorVerdict='approved' AND",
      "  accuracyAgainstGroundTruth=1.0 AND",
      "  groundTruthAvailable=true",
      "",
      `Source of truth: ${DEFAULT_DIR}/rows.jsonl`,
      "",
      "Knob: PRISM_PRINT_ACCURACY_GATE_BYPASS=1 logged one-shot bypass.",
    ].join("\n"),
  });
}

try {
  main();
} catch (e) {
  // Fail-safe: never crash the harness over a gate bug.
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
}
