#!/usr/bin/env node
// token-budget-telemetry-dashboard.mjs
//
// SYSTEM-VIZ-BRAIN-MS0/U-P4-TOKEN-BUDGET-TELEMETRY.
//
// Reads token-budget-telemetry.jsonl (emitted by token-budget-gate.mjs on every
// UserPromptSubmit fire) and surfaces a fleet-wide token-budget view. Joins
// each row's `sid` (8-char session id prefix) against chat-slots.json to
// attribute the row to a NATO-phonetic slot when one is bound. Rows whose sid
// doesn't match any live slot get bucketed under "unmapped".
//
// Output modes:
//   --text  (default) human-readable
//   --json  machine-readable for downstream consumers
//   --window=<dur>     e.g. 24h, 30m, 7d (default 24h)
//   --top=<N>          recent RED/CRITICAL events to show (default 5)
//
// Used by /checkin §6 dashboards and roadmap envelopes. NOT a hook — pure
// query script, safe to run from any chat.
//
// Knobs:
//   PRISM_TOKEN_BUDGET_TELEMETRY_PATH — override the ledger path (hermetic tests)
//   PRISM_ROOT — repo root, default H:/prism

import fs from "node:fs";
import path from "node:path";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const DEFAULT_LEDGER = path.join(PRISM_ROOT, "mcp-server", "data", "state", "token-budget-telemetry.jsonl");
const LEDGER_PATH = process.env.PRISM_TOKEN_BUDGET_TELEMETRY_PATH || DEFAULT_LEDGER;
const SLOTS_PATH = path.join(PRISM_ROOT, "state", "shared", "chat-slots.json");

const TIERS = ["GREEN", "YELLOW", "RED", "CRITICAL"];

// Parse args
function parseArgs(argv) {
  const out = { mode: "text", windowMs: 24 * 60 * 60 * 1000, top: 5 };
  for (const a of argv.slice(2)) {
    if (a === "--json") out.mode = "json";
    else if (a === "--text") out.mode = "text";
    else if (a.startsWith("--window=")) {
      const m = a.slice(9).match(/^(\d+)\s*([mhd])$/i);
      if (m) {
        const mul = { m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2].toLowerCase()];
        out.windowMs = Number(m[1]) * mul;
      }
    } else if (a.startsWith("--top=")) {
      out.top = Math.max(1, Math.min(50, parseInt(a.slice(6), 10) || 5));
    }
  }
  return out;
}

export function readLedgerLines(targetPath) {
  if (!fs.existsSync(targetPath)) return [];
  try {
    const raw = fs.readFileSync(targetPath, "utf8");
    return raw.split("\n").filter((l) => l.trim().length > 0);
  } catch {
    return [];
  }
}

export function parseLedger(lines) {
  const rows = [];
  for (const line of lines) {
    try {
      const r = JSON.parse(line);
      if (r && typeof r === "object" && typeof r.sid === "string") rows.push(r);
    } catch { /* skip malformed */ }
  }
  return rows;
}

export function filterByWindow(rows, windowMs, nowMs) {
  const cutoff = (nowMs ?? Date.now()) - windowMs;
  return rows.filter((r) => {
    const t = Date.parse(r.ts);
    return Number.isFinite(t) && t >= cutoff;
  });
}

export function loadSlotMap(slotsPath) {
  // Returns Map<sid8, {slot, chatId, topic, branch}>
  const out = new Map();
  try {
    const j = JSON.parse(fs.readFileSync(slotsPath, "utf8"));
    for (const [slot, st] of Object.entries(j.slots || {})) {
      if (!st || typeof st.chatId !== "string") continue;
      const sid8 = st.chatId.startsWith("claude-") ? st.chatId.slice(7, 15) : st.chatId.slice(0, 8);
      out.set(sid8, { slot, chatId: st.chatId, topic: st.topic || null, branch: st.branch || null });
    }
  } catch { /* slots file missing → unmapped */ }
  return out;
}

export function aggregate(rows, slotMap) {
  // Per-slot tier histogram + percent stats + heavy-skill near-RED hits +
  // most-recent RED/CRITICAL events. "unmapped" bucket catches sids not in
  // the current chat-slots snapshot.
  const bySlot = {}; // slot → {fires, tiers, percentSamples, redCriticalEvents, heavyNearLimit}
  const redCritical = []; // [{ts, sid, slot, tier, percent, heavy}]
  for (const r of rows) {
    const meta = slotMap.get(r.sid);
    const slot = meta ? meta.slot : "unmapped";
    if (!bySlot[slot]) bySlot[slot] = { fires: 0, tiers: { GREEN: 0, YELLOW: 0, RED: 0, CRITICAL: 0, UNKNOWN: 0 }, percentSamples: [], heavyNearLimit: 0, sids: new Set() };
    const b = bySlot[slot];
    b.fires++;
    b.tiers[r.tier in b.tiers ? r.tier : "UNKNOWN"]++;
    if (Number.isFinite(r.percent)) b.percentSamples.push(r.percent);
    b.sids.add(r.sid);
    const isRedOrWorse = r.tier === "RED" || r.tier === "CRITICAL";
    if (isRedOrWorse && r.heavy) b.heavyNearLimit++;
    if (isRedOrWorse) redCritical.push({ ts: r.ts, sid: r.sid, slot, tier: r.tier, percent: r.percent, heavy: r.heavy || null });
  }
  // Finalize percentiles using NEAREST-RANK method (NIST). For N samples
  // sorted ascending, the k-th percentile index is ceil(k/100 * N) - 1
  // clamped to [0, N-1]. Reviewer-A P2 fix: previous floor()-1 underestimated
  // p95 to roughly p80 for small N.
  for (const slot of Object.keys(bySlot)) {
    const ps = bySlot[slot].percentSamples.slice().sort((a, b) => a - b);
    const pctIdx = (q) => Math.min(ps.length - 1, Math.max(0, Math.ceil(q * ps.length) - 1));
    bySlot[slot].p50 = ps.length ? ps[pctIdx(0.5)] : null;
    bySlot[slot].p95 = ps.length ? ps[pctIdx(0.95)] : null;
    bySlot[slot].min = ps.length ? ps[0] : null;
    bySlot[slot].sids = Array.from(bySlot[slot].sids);
    delete bySlot[slot].percentSamples;
  }
  redCritical.sort((a, b) => (Date.parse(b.ts) || 0) - (Date.parse(a.ts) || 0));
  return { bySlot, redCritical };
}

export function buildHeadline(rows, agg) {
  const totalFires = rows.length;
  let red = 0, critical = 0, heavyNear = 0;
  const sidSet = new Set();
  for (const r of rows) {
    if (r.tier === "RED") red++;
    if (r.tier === "CRITICAL") critical++;
    if ((r.tier === "RED" || r.tier === "CRITICAL") && r.heavy) heavyNear++;
    sidSet.add(r.sid);
  }
  const slotsWithFires = Object.keys(agg.bySlot).filter((s) => s !== "unmapped").length;
  return { totalFires, distinctSids: sidSet.size, slotsWithFires, redFires: red, criticalFires: critical, heavyOpsNearLimit: heavyNear };
}

export function formatText(headline, agg, topRedCritical, opts) {
  const lines = [];
  lines.push("┌─ Token-Budget Telemetry (SYSTEM-VIZ-BRAIN-MS0/U-P4-TOKEN-BUDGET-TELEMETRY)");
  if (opts && opts.ledgerMissing) {
    // Reviewer-B P2: distinguish "ledger never created" from "no activity in window".
    lines.push(`│ ledger:       ${opts.ledgerPath || "(unknown)"} (not yet created — hook will create on first UserPromptSubmit)`);
  }
  lines.push(`│ fires:        ${headline.totalFires}  (${headline.distinctSids} distinct sid · ${headline.slotsWithFires} slot${headline.slotsWithFires === 1 ? "" : "s"} with activity)`);
  lines.push(`│ red:          ${headline.redFires}     critical: ${headline.criticalFires}     heavy-skill-near-RED: ${headline.heavyOpsNearLimit}`);
  lines.push("│");
  if (Object.keys(agg.bySlot).length === 0) {
    lines.push("│ (no rows in window)");
  } else {
    lines.push("│ per-slot:");
    const slotOrder = Object.keys(agg.bySlot).sort((a, b) => {
      if (a === "unmapped") return 1;
      if (b === "unmapped") return -1;
      return a.localeCompare(b);
    });
    for (const slot of slotOrder) {
      const b = agg.bySlot[slot];
      const tierBar = TIERS.map((t) => `${t[0]}:${b.tiers[t]}`).join(" ");
      const p50 = b.p50 == null ? "?" : `${b.p50.toFixed(0)}%`;
      const p95 = b.p95 == null ? "?" : `${b.p95.toFixed(0)}%`;
      const minP = b.min == null ? "?" : `${b.min.toFixed(0)}%`;
      lines.push(`│   ${slot.padEnd(10)} ${b.fires.toString().padStart(4)} fires  [${tierBar}]  p50=${p50}  p95=${p95}  min=${minP}  heavy@RED=${b.heavyNearLimit}`);
    }
  }
  if (topRedCritical.length) {
    lines.push("│");
    lines.push(`│ recent RED/CRITICAL (top ${topRedCritical.length}):`);
    for (const e of topRedCritical) {
      const heavyStr = e.heavy ? `  ${e.heavy}` : "";
      const pctStr = Number.isFinite(e.percent) ? `${e.percent.toFixed(0)}%` : "?";
      lines.push(`│   ${e.ts}  ${e.slot.padEnd(10)} ${e.tier.padEnd(8)} ${pctStr.padStart(4)} remaining${heavyStr}`);
    }
  }
  lines.push("└─");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  const ledgerMissing = !fs.existsSync(LEDGER_PATH);
  const lines = readLedgerLines(LEDGER_PATH);
  const allRows = parseLedger(lines);
  const rows = filterByWindow(allRows, args.windowMs);
  const slotMap = loadSlotMap(SLOTS_PATH);
  const agg = aggregate(rows, slotMap);
  const headline = buildHeadline(rows, agg);
  const topRedCritical = agg.redCritical.slice(0, args.top);

  if (args.mode === "json") {
    process.stdout.write(JSON.stringify({
      generatedAt: new Date().toISOString(),
      ledger: LEDGER_PATH,
      ledgerMissing,
      windowMs: args.windowMs,
      headline,
      bySlot: agg.bySlot,
      topRedCritical,
    }, null, 2) + "\n");
  } else {
    process.stdout.write(formatText(headline, agg, topRedCritical, { ledgerMissing, ledgerPath: LEDGER_PATH }) + "\n");
  }
}

const isCLI = process.argv[1] && path.basename(process.argv[1]) === "token-budget-telemetry-dashboard.mjs";
if (isCLI) main().catch((e) => { process.stderr.write(String(e && e.stack || e) + "\n"); process.exit(1); });
