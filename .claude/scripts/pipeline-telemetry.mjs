#!/usr/bin/env node
/**
 * pipeline-telemetry.mjs
 *
 * Records every rgs/forge pipeline step's decision + outcome to an
 * append-only ledger. The /rgs6 self-optimizing layer reads this ledger
 * to tune adaptive thresholds (tier-floor pct, context nudge pct, leverage
 * min, dispatcher capacity ceiling, etc.).
 *
 * Each entry is a discrete pipeline event:
 *   - stage_entry  — entered Stage S<N>
 *   - tool_used    — invoked a specific tool/skill/script
 *   - decision     — pipeline branched on a threshold (e.g., tier-floor PASS/BLOCK)
 *   - outcome      — measurable result (test pass/fail, leverage delta, etc.)
 *   - violation    — Agent 12 / Agent 11 / scrutiny flagged a violation
 *   - artifact     — emitted a compounding-gains artifact
 *
 * Schema (each line is a JSON object):
 *   {
 *     ts: ISO timestamp,
 *     session_id: stable session id,
 *     milestone: milestone-id,
 *     phase: phase-id,
 *     unit: unit-id,
 *     stage: stage label (S0, S0.5, S0.6, S1..S11, S11.5, S11.6),
 *     event: stage_entry|tool_used|decision|outcome|violation|artifact,
 *     payload: { ...event-specific fields }
 *   }
 *
 * Usage:
 *   node pipeline-telemetry.mjs record \
 *     --milestone <id> --stage <S> --event <kind> --payload '<json>'
 *
 *   node pipeline-telemetry.mjs query --milestone <id>
 *   node pipeline-telemetry.mjs query --since <iso>
 *   node pipeline-telemetry.mjs summary
 *   node pipeline-telemetry.mjs export-csv > telemetry.csv
 *
 * Failure mode: any error → silent exit 0 (telemetry must never block the
 * pipeline; better to lose a record than to halt a milestone).
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const LEDGER = "H:/prism/state/shared/pipeline-telemetry.jsonl";
const STABLE_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";

const VALID_EVENTS = new Set([
  "stage_entry", "tool_used", "decision", "outcome", "violation", "artifact",
]);
const VALID_STAGES = new Set([
  "S0", "S0.5", "S0.6", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8",
  "S9", "S10", "S11", "S11.5", "S11.6", "phase4_loop", "phase6_handoff",
]);

function args() {
  const a = process.argv.slice(2);
  const cmd = a[0];
  const opts = {};
  for (let i = 1; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      opts[k] = v;
    }
  }
  return { cmd, opts };
}

function getSessionId() {
  if (!fs.existsSync(STABLE_HELPER)) return "unknown";
  const r = spawnSync(process.execPath, [STABLE_HELPER], { encoding: "utf8" });
  return (r.stdout || "").trim() || "unknown";
}

function appendRecord(record) {
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.appendFileSync(LEDGER, JSON.stringify(record) + "\n");
}

function readLedger() {
  if (!fs.existsSync(LEDGER)) return [];
  const raw = fs.readFileSync(LEDGER, "utf8");
  return raw.split("\n").filter(Boolean).map((ln) => {
    try { return JSON.parse(ln); }
    catch { return null; }
  }).filter(Boolean);
}

function cmdRecord(opts) {
  const event = opts.event;
  const stage = opts.stage;
  if (!event || !VALID_EVENTS.has(event)) {
    process.exit(0); // silent
  }
  if (!stage || !VALID_STAGES.has(stage)) {
    process.exit(0); // silent
  }
  let payload = {};
  if (opts.payload) {
    try { payload = JSON.parse(opts.payload); }
    catch { payload = { raw: String(opts.payload).slice(0, 500) }; }
  }
  const record = {
    ts: new Date().toISOString(),
    session_id: getSessionId(),
    milestone: opts.milestone || null,
    phase: opts.phase || null,
    unit: opts.unit || null,
    stage,
    event,
    payload,
  };
  try { appendRecord(record); }
  catch { /* silent — telemetry must never block */ }
  process.exit(0);
}

function cmdQuery(opts) {
  const ledger = readLedger();
  const since = opts.since ? Date.parse(opts.since) : 0;
  const filtered = ledger.filter((r) => {
    if (opts.milestone && r.milestone !== opts.milestone) return false;
    if (opts["session-id"] && r.session_id !== opts["session-id"]) return false;
    if (opts.event && r.event !== opts.event) return false;
    if (opts.stage && r.stage !== opts.stage) return false;
    if (since && Date.parse(r.ts) < since) return false;
    return true;
  });
  if (opts.json) {
    console.log(JSON.stringify(filtered, null, 2));
  } else {
    console.log(`Found ${filtered.length} records:`);
    for (const r of filtered.slice(-50)) {
      console.log(`  [${r.ts}] ${r.stage} ${r.event.padEnd(12)} m=${r.milestone || "-"} ${JSON.stringify(r.payload).slice(0, 80)}`);
    }
    if (filtered.length > 50) console.log(`...and ${filtered.length - 50} earlier`);
  }
}

function cmdZeroRecords() {
  // Cross-reference all known scripts/skills/hooks against tools_used events.
  // Any script/skill/hook with zero hits is a "graveyard" candidate — shipped
  // but never fires. Closes Agent 4's M1 self-citation gap on the read side.
  const ledger = readLedger();
  const usedTools = new Set();
  for (const r of ledger) {
    if (r.event === "tool_used" && r.payload?.tool) usedTools.add(r.payload.tool);
    if (r.event === "tool_used" && r.payload?.command) {
      // extract script names from bash commands
      const m = String(r.payload.command).match(/[\w-]+\.m?js/g);
      for (const s of (m || [])) usedTools.add(s);
    }
  }

  const inventory = [];
  const dirs = [
    { dir: "H:/prism/.claude/scripts", kind: "script", ext: ".mjs" },
    { dir: "H:/prism/.claude/hooks", kind: "hook", ext: ".mjs" },
    { dir: "H:/.claude/commands", kind: "skill", ext: ".md" },
  ];
  for (const { dir, kind, ext } of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(ext)) continue;
      const name = f;
      const stem = f.replace(ext, "");
      const hit = usedTools.has(name) || usedTools.has(stem) ||
                  [...usedTools].some((t) => t.includes(stem));
      inventory.push({ kind, name, hit });
    }
  }

  const zero = inventory.filter((i) => !i.hit);
  const hit = inventory.filter((i) => i.hit);

  console.log("PIPELINE TELEMETRY — ZERO-RECORD AUDIT");
  console.log("=======================================");
  console.log(`Inventory: ${inventory.length} items (${zero.length} zero, ${hit.length} hit)`);
  console.log(`Hit rate:  ${inventory.length > 0 ? ((hit.length / inventory.length) * 100).toFixed(1) : 0}%`);
  console.log("");
  console.log("Zero-record items (graveyard candidates):");
  const byKind = {};
  for (const z of zero) (byKind[z.kind] = byKind[z.kind] || []).push(z.name);
  for (const [k, names] of Object.entries(byKind)) {
    console.log(`  ${k} (${names.length}):`);
    for (const n of names.slice(0, 25)) console.log(`    - ${n}`);
    if (names.length > 25) console.log(`    ... and ${names.length - 25} more`);
  }
  console.log("");
  console.log("Action: investigate top zero-record items — either wire them in,");
  console.log("        deprecate them, or accept they're rarely-fired (e.g. emergency-only).");
}

function cmdSummary() {
  const ledger = readLedger();
  const totals = {
    total_records: ledger.length,
    by_event: {},
    by_stage: {},
    by_milestone: {},
    violations: [],
    outcomes: { pass: 0, fail: 0, partial: 0 },
    tools_used: {},
  };
  for (const r of ledger) {
    totals.by_event[r.event] = (totals.by_event[r.event] || 0) + 1;
    totals.by_stage[r.stage] = (totals.by_stage[r.stage] || 0) + 1;
    if (r.milestone) totals.by_milestone[r.milestone] = (totals.by_milestone[r.milestone] || 0) + 1;
    if (r.event === "violation") {
      totals.violations.push({
        ts: r.ts, milestone: r.milestone, stage: r.stage,
        kind: r.payload?.kind || "?", detail: (r.payload?.detail || "").slice(0, 120),
      });
    }
    if (r.event === "outcome") {
      const v = r.payload?.verdict;
      if (v === "pass") totals.outcomes.pass++;
      else if (v === "fail") totals.outcomes.fail++;
      else if (v === "partial") totals.outcomes.partial++;
    }
    if (r.event === "tool_used" && r.payload?.tool) {
      totals.tools_used[r.payload.tool] = (totals.tools_used[r.payload.tool] || 0) + 1;
    }
  }
  console.log("PIPELINE TELEMETRY SUMMARY");
  console.log("===========================");
  console.log(`Total records:      ${totals.total_records}`);
  console.log(`Milestones tracked: ${Object.keys(totals.by_milestone).length}`);
  console.log("");
  console.log("Events:");
  for (const [k, v] of Object.entries(totals.by_event).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(14)} ${v}`);
  }
  console.log("");
  console.log("Outcomes (pass/fail/partial):");
  console.log(`  pass:    ${totals.outcomes.pass}`);
  console.log(`  fail:    ${totals.outcomes.fail}`);
  console.log(`  partial: ${totals.outcomes.partial}`);
  if (totals.outcomes.pass + totals.outcomes.fail > 0) {
    const rate = totals.outcomes.pass / (totals.outcomes.pass + totals.outcomes.fail);
    console.log(`  pass rate: ${(rate * 100).toFixed(1)}%`);
  }
  console.log("");
  console.log(`Violations: ${totals.violations.length}`);
  for (const v of totals.violations.slice(-5)) {
    console.log(`  ${v.ts} [${v.kind}] ${v.detail}`);
  }
  console.log("");
  const topTools = Object.entries(totals.tools_used).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log("Top 10 tools used:");
  for (const [tool, count] of topTools) console.log(`  ${count}x  ${tool}`);
}

function cmdExportCsv() {
  const ledger = readLedger();
  console.log("ts,session_id,milestone,phase,unit,stage,event,payload");
  for (const r of ledger) {
    const p = JSON.stringify(r.payload || {}).replace(/"/g, '""');
    console.log(`${r.ts},${r.session_id || ""},${r.milestone || ""},${r.phase || ""},${r.unit || ""},${r.stage},${r.event},"${p}"`);
  }
}

const { cmd, opts } = args();
try {
  switch (cmd) {
    case "record": cmdRecord(opts); break;
    case "query": cmdQuery(opts); break;
    case "summary":
      if (opts["zero-records"]) cmdZeroRecords();
      else cmdSummary();
      break;
    case "zero-records": cmdZeroRecords(); break;
    case "export-csv": cmdExportCsv(); break;
    default:
      console.error("usage: pipeline-telemetry.mjs <record|query|summary|zero-records|export-csv> [opts]");
      process.exit(0); // silent
  }
} catch {
  process.exit(0); // silent — never block
}
