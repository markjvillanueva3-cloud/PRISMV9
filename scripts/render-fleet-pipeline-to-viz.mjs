#!/usr/bin/env node
/**
 * render-fleet-pipeline-to-viz.mjs — F7
 *
 * Reads chat-slots.json. For each slot with `pipelineStep` set, stages a
 * node on /system-viz so the galaxy shows live per-slot phase visibility.
 *
 * Node label: `fleet:<slot>:<short-step-tag>`
 * Layer:      L11 (live runtime; below L10 architecture)
 * Subgroup:   `fleet-pipeline`
 * Status:     "alive" | "stale" | "crashed" | "idle"  (from classifySlot)
 *
 * Idempotent: re-running with the same labels updates rather than dupes
 * (system-viz-add-node.mjs handles dedup against the graph id set).
 *
 * Run periodically (e.g. every 60s via cron) OR on-demand from /checkin.
 *
 * CLI:
 *   node scripts/render-fleet-pipeline-to-viz.mjs            # one-shot render
 *   node scripts/render-fleet-pipeline-to-viz.mjs --json     # JSON report
 *   node scripts/render-fleet-pipeline-to-viz.mjs --flush    # force-flush queue
 */

import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const SLOTS_FILE = "H:/prism/state/shared/chat-slots.json";
const ADD_NODE = "H:/prism/scripts/system-viz-add-node.mjs";
const ADD_NODE_TIMEOUT_MS = 4000;
const LAYER = "L11";
const SUBGROUP = "fleet-pipeline";

function shortTag(step) {
  if (!step) return "idle";
  // Strip leading "Step N — " etc, keep first ~40 chars
  return step.replace(/^Step\s+\d+\s*[—:-]\s*/i, "")
             .replace(/[^A-Za-z0-9-]+/g, "-")
             .slice(0, 40)
             .replace(/^-|-$/g, "")
             || "active";
}

function readSlots() {
  if (!fs.existsSync(SLOTS_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(SLOTS_FILE, "utf-8")); }
  catch { return null; }
}

function classify(slot, now) {
  if (!slot) return "idle";
  const lastMs = Date.parse(slot.lastHeartbeat);
  if (!Number.isFinite(lastMs)) return "crashed";
  const age = now - lastMs;
  if (age < 2 * 60 * 1000) return "alive";
  if (age < 10 * 60 * 1000) return "stale";
  return "crashed";
}

function addNode(label, status, flushNow) {
  const args = [ADD_NODE,
    "--label", label,
    "--layer", LAYER,
    "--subgroup", SUBGROUP,
    "--status", status,
  ];
  if (flushNow) args.push("--flush-now");
  try {
    const r = spawnSync(process.execPath, args, {
      encoding: "utf-8", timeout: ADD_NODE_TIMEOUT_MS, windowsHide: true,
    });
    return { ok: r.status === 0, stdout: r.stdout || "", stderr: r.stderr || "" };
  } catch (e) { return { ok: false, error: e.message }; }
}

function main() {
  const args = new Set(process.argv.slice(2));
  const wantJson = args.has("--json");
  const wantFlush = args.has("--flush");

  const file = readSlots();
  if (!file) {
    const out = { ok: false, error: "chat-slots.json missing or unreadable" };
    process.stdout.write(wantJson ? JSON.stringify(out) + "\n" : "no slot data\n");
    process.exit(1);
  }
  const now = Date.now();
  const rendered = [];
  const slotNames = Object.keys(file.slots || {});
  let lastResult = null;
  for (let i = 0; i < slotNames.length; i++) {
    const n = slotNames[i];
    const slot = file.slots[n];
    if (!slot) continue;  // skip idle slots
    if (!slot.pipelineStep) continue;  // skip slots not in pipeline
    const status = classify(slot, now);
    const tag = shortTag(slot.pipelineStep);
    const label = `fleet-${n}-${tag}`;
    const isLast = (i === slotNames.length - 1);
    const flushHere = wantFlush && isLast;
    const r = addNode(label, status, flushHere);
    rendered.push({ slot: n, label, status, ok: r.ok });
    lastResult = r;
  }
  const out = { ok: true, rendered, total: rendered.length, lastFlush: lastResult?.stdout?.trim() };
  if (wantJson) process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  else {
    process.stdout.write(`rendered ${rendered.length} fleet-pipeline node(s)\n`);
    for (const r of rendered) process.stdout.write(`  ${r.slot}: ${r.label} [${r.status}]\n`);
  }
}

main();
