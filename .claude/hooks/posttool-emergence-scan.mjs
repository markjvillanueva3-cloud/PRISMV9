#!/usr/bin/env node
// tier: T4
/**
 * posttool-emergence-scan.mjs — hook_emergence_scan (PP-0.18 U-AGI11)
 *
 * Fires PostTool. Every N=100 calls, scans the last slice of
 * WORLD_SIM_PREDICTIONS.jsonl for unexpected patterns:
 *   - calibration drift (predicted vs. observed outcome mismatch ≥30%)
 *   - tool-usage lopsidedness (one tool dominating ≥80%)
 *   - high-risk burst (≥25% of recent ops flagged risk=high)
 *
 * Each signal is appended to EMERGENCE_LEDGER.jsonl and surfaces a one-
 * line system message when severity ≥ medium.
 */

import * as fs from "fs";
import * as path from "path";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const COUNTER_FILE = "H:/prism/mcp-server/data/state/EMERGENCE_SCAN_COUNTER.json";
const PREDICTIONS_FILE = "H:/prism/mcp-server/data/state/WORLD_SIM_PREDICTIONS.jsonl";
const EMERGENCE_LEDGER = "H:/prism/mcp-server/data/state/EMERGENCE_LEDGER.jsonl";
const TELEMETRY = `${process.env.USERPROFILE || process.env.HOME}/.prism/telemetry/phase-018-emergence-scan.jsonl`;
const SCAN_EVERY = 100;
const WINDOW = 200;

function loadCounter() { try { return JSON.parse(fs.readFileSync(COUNTER_FILE, "utf-8")); } catch { return { count: 0 }; } }
function saveCounter(c) { try { fs.mkdirSync(path.dirname(COUNTER_FILE), { recursive: true }); fs.writeFileSync(COUNTER_FILE, JSON.stringify(c)); } catch { /* ignore */ } }

function loadRecent() {
  try {
    if (!fs.existsSync(PREDICTIONS_FILE)) return [];
    return fs.readFileSync(PREDICTIONS_FILE, "utf-8").trim().split("\n").slice(-WINDOW)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

function detectSignals(preds) {
  const signals = [];
  if (preds.length < 20) return signals;

  const withOutcome = preds.filter((p) => typeof p.outcome === "boolean");
  if (withOutcome.length >= 20) {
    const meanPred = withOutcome.reduce((a, p) => a + (p.willSucceed ?? 0.5), 0) / withOutcome.length;
    const meanObs = withOutcome.filter((p) => p.outcome).length / withOutcome.length;
    const drift = Math.abs(meanPred - meanObs);
    if (drift >= 0.30) signals.push({ kind: "calibration-drift", severity: drift >= 0.50 ? "high" : "medium", predicted: +meanPred.toFixed(3), observed: +meanObs.toFixed(3), drift: +drift.toFixed(3), sample: withOutcome.length });
  }

  const toolCounts = new Map();
  for (const p of preds) toolCounts.set(p.tool, (toolCounts.get(p.tool) || 0) + 1);
  const top = [...toolCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const share = top[1] / preds.length;
    if (share >= 0.80) signals.push({ kind: "tool-dominance", severity: share >= 0.95 ? "high" : "medium", tool: top[0], share: +share.toFixed(3), sample: preds.length });
  }

  const highRisk = preds.filter((p) => p.risk === "high").length;
  const highRiskShare = highRisk / preds.length;
  if (highRiskShare >= 0.25) signals.push({ kind: "high-risk-burst", severity: highRiskShare >= 0.50 ? "high" : "medium", count: highRisk, share: +highRiskShare.toFixed(3), sample: preds.length });

  return signals;
}

function appendLedger(entries) {
  try {
    fs.mkdirSync(path.dirname(EMERGENCE_LEDGER), { recursive: true });
    for (const e of entries) fs.appendFileSync(EMERGENCE_LEDGER, JSON.stringify({ at: new Date().toISOString(), source: "hook_emergence_scan", ...e }) + "\n");
  } catch { /* ignore */ }
}

function logTelemetry(ev) {
  try {
    const dir = TELEMETRY.replace(/[^/\\]+$/, "");
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(TELEMETRY, JSON.stringify({ at: new Date().toISOString(), ...ev }) + "\n");
  } catch { /* ignore */ }
}

async function main() {
  const input = readStdinSafe();
  try { JSON.parse(input); } catch { process.exit(0); }

  const counter = loadCounter();
  counter.count = (counter.count || 0) + 1;
  const shouldScan = counter.count % SCAN_EVERY === 0;
  saveCounter(counter);
  if (!shouldScan) process.exit(0);

  const preds = loadRecent();
  const signals = detectSignals(preds);
  if (signals.length === 0) { logTelemetry({ scan: true, signals: 0, sample: preds.length }); process.exit(0); }

  appendLedger(signals);
  logTelemetry({ scan: true, signals: signals.length, sample: preds.length });

  const major = signals.filter((s) => s.severity === "high" || s.severity === "medium");
  if (major.length === 0) process.exit(0);

  const summary = major.map((s) => `${s.kind}=${s.severity}`).join(", ");
  console.log(JSON.stringify({  continue: true,  hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `[Phase 0.18 / Emergence] ${major.length} anomaly signal(s) on last ${preds.length} ops: ${summary}. See EMERGENCE_LEDGER.jsonl.` },
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
