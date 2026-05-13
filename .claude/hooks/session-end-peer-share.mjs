#!/usr/bin/env node
// tier: T4
/**
 * session-end-peer-share.mjs — hook_post_session_peer_share (PP-0.18 U-AGI14)
 *
 * Fires SessionEnd (Stop). Broadcasts non-sensitive session insights to
 * PEER_SHARE_LEDGER.jsonl so sibling Claude/Codex sessions can pick them up
 * at boot. Dedups by a content fingerprint over 24h.
 *
 * Anti-pattern guard (plan line 760): "Do NOT broadcast sensitive data
 * (credentials, customer) to peers — filter."
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const GOALS_FILE = "H:/prism/mcp-server/data/state/SYNTHESIZED_GOALS.json";
const PREDICTIONS_FILE = "H:/prism/mcp-server/data/state/WORLD_SIM_PREDICTIONS.jsonl";
const PEER_LEDGER = "H:/prism/mcp-server/data/state/PEER_SHARE_LEDGER.jsonl";
const TELEMETRY = `${process.env.USERPROFILE || process.env.HOME}/.prism/telemetry/phase-018-peer-share.jsonl`;
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

const SENSITIVE_TOKENS = [
  /(?:password|api[-_]?key|secret|token|bearer)[=:\s]+\S+/i,
  /\b(?:ITW|ALCOA|OPTIMAS|SFS|HOLO-?KROME)\b/i,
  /\b[A-Z0-9._-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /-----BEGIN [A-Z ]+-----/,
];
function isSensitive(s) { return typeof s === "string" && SENSITIVE_TOKENS.some((rx) => rx.test(s)); }

function loadJsonSafe(p) { try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return null; } }

function recentFingerprints() {
  try {
    if (!fs.existsSync(PEER_LEDGER)) return new Set();
    const now = Date.now();
    const fps = new Set();
    for (const line of fs.readFileSync(PEER_LEDGER, "utf-8").trim().split("\n")) {
      try {
        const r = JSON.parse(line);
        if (r.fingerprint && r.at && (now - new Date(r.at).getTime()) < DEDUP_WINDOW_MS) fps.add(r.fingerprint);
      } catch { /* skip */ }
    }
    return fps;
  } catch { return new Set(); }
}

function countRecentPredictions() {
  try {
    if (!fs.existsSync(PREDICTIONS_FILE)) return { total: 0, failures: 0 };
    const lines = fs.readFileSync(PREDICTIONS_FILE, "utf-8").trim().split("\n").slice(-500);
    let total = 0, failures = 0;
    for (const l of lines) { try { const p = JSON.parse(l); total++; if (p.outcome === false) failures++; } catch { /* skip */ } }
    return { total, failures };
  } catch { return { total: 0, failures: 0 }; }
}

function logTelemetry(ev) {
  try {
    const dir = TELEMETRY.replace(/[^/\\]+$/, "");
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(TELEMETRY, JSON.stringify({ at: new Date().toISOString(), ...ev }) + "\n");
  } catch { /* ignore */ }
}

function buildInsight() {
  const goals = loadJsonSafe(GOALS_FILE);
  const stats = countRecentPredictions();
  const pick = goals?.goals?.filter((g) => g?.text && !isSensitive(g.text)).slice(0, 1)[0] || null;
  const insight = {
    topGoal: pick ? { priority: pick.priority, text: pick.text.slice(0, 140) } : null,
    recentOpsTotal: stats.total,
    recentOpsFailures: stats.failures,
  };
  return isSensitive(JSON.stringify(insight)) ? null : insight;
}

function fingerprint(obj) { return crypto.createHash("sha1").update(JSON.stringify(obj)).digest("hex").slice(0, 16); }

async function main() {
  const insight = buildInsight();
  if (!insight || !insight.topGoal) { logTelemetry({ skipped: "no-insight" }); process.exit(0); }

  const fp = fingerprint(insight);
  if (recentFingerprints().has(fp)) { logTelemetry({ skipped: "dedup", fingerprint: fp }); process.exit(0); }

  try {
    fs.mkdirSync(path.dirname(PEER_LEDGER), { recursive: true });
    fs.appendFileSync(PEER_LEDGER, JSON.stringify({ at: new Date().toISOString(), source: "hook_post_session_peer_share", fingerprint: fp, insight }) + "\n");
  } catch { /* ignore */ }
  logTelemetry({ broadcast: true, fingerprint: fp });
  process.exit(0);
}

main().catch(() => { console.log(JSON.stringify({ continue: true })); });
