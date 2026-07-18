#!/usr/bin/env node
/**
 * allocate-domains-to-slots.mjs — domain-specialized per-slot allocation.
 *
 * Spec: JULIETT-12CHAT-ALLOCATION-MS0 (slot juliett, 2026-05-17).
 * Work order: "break up prism related tasks into the 12 chats — each chat owns
 * one PRISM system domain."
 *
 * Re-keys the live per-slot task queue (state/shared/slot-task-queues.json)
 * from a priority round-robin to a DOMAIN partition: every remaining work unit
 * in ROADMAP-CONSOLIDATED (pending_units + unconsolidated_prose) is classified
 * into one of 13 domains by keyword, and each slot's queue becomes its domain's
 * full backlog.
 *
 *   alpha=mill  bravo=lathe  charlie=wire  delta=cad  echo=cam
 *   foxtrot=machining-knowhow+tribal   hotel=erp/business+hr
 *   india=post-processor+master-post   juliett=speed-feed
 *   kilo=print-to-program   lima=prism-academy+learning   mike=misc
 *   golf=database build+maintenance (the hygiene slot also owns the DB domain)
 *
 * Classification is keyword-based (ordered first-match) — approximate but
 * domain-coherent. An operator may re-tag any unit; re-run to regenerate.
 *
 * NON-`queues` top-level keys of slot-task-queues.json are preserved verbatim.
 *
 * Usage:  node scripts/allocate-domains-to-slots.mjs [--dry-run] [--json]
 * Exit:   0 ok · 1 validation error · 2 runtime error · 3 queue file missing
 */

import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  DEFAULT_DOMAIN,
  DOMAIN_RULES,
  DOMAIN_TO_SLOT,
  SLOT_DOMAIN_LABEL,
  classifyUnit,
} from "./lib/domain-classifier.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONSOLIDATED = resolve(ROOT, "state/shared/specs/ROADMAP-CONSOLIDATED.json");
const QUEUE_FILE = resolve(ROOT, "state/shared/slot-task-queues.json");
const GAP_UNITS_FILE = resolve(ROOT, "state/shared/specs/FEATURE-GAP-UNITS-2026-05-17.json");

// DOMAIN_RULES / DEFAULT_DOMAIN / DOMAIN_TO_SLOT / SLOT_DOMAIN_LABEL now live
// in scripts/lib/domain-classifier.mjs (single source of truth — shared with
// .claude/helpers/priority-queue.mjs so the allocator and the pickup picker
// can never drift on which slot owns which domain).

function parseArgs(argv) {
  const a = { dryRun: false, json: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--dry-run") a.dryRun = true;
    else if (t === "--json") a.json = true;
    else { process.stderr.write(`unknown arg: ${t}\n`); process.exit(1); }
  }
  return a;
}

function readJson(path, exitCode) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    process.stderr.write(`cannot read/parse ${path}: ${e.message}\n`);
    process.exit(exitCode);
  }
}

// classify() now delegates to the shared classifier (was an inline duplicate
// of DOMAIN_RULES iteration — extracted to scripts/lib/domain-classifier.mjs).
const classify = classifyUnit;

function atomicWrite(path, content) {
  const tmp = path + ".tmp-" + process.pid;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, path);
}

function main() {
  const args = parseArgs(process.argv);

  const consolidated = readJson(CONSOLIDATED, 2);
  const pending = Array.isArray(consolidated.pending_units) ? consolidated.pending_units : [];
  const prose = Array.isArray(consolidated.unconsolidated_prose) ? consolidated.unconsolidated_prose : [];
  if (pending.length === 0 && prose.length === 0) {
    process.stderr.write(`ROADMAP-CONSOLIDATED has no pending_units or unconsolidated_prose\n`);
    process.exit(2);
  }

  const queue = readJson(QUEUE_FILE, 3);
  if (!queue.queues || typeof queue.queues !== "object") {
    process.stderr.write(`slot-task-queues.json has no .queues object\n`);
    process.exit(3);
  }

  // Collect + classify. pending_units (envelope-backed) lead prose (no envelope).
  const all = [
    ...pending.map((u) => ({ ...u, _src: "pending" })),
    ...prose.map((u) => ({ ...u, _src: "prose" })),
  ];
  const seen = new Set();
  const bySlot = {};
  for (const s of Object.keys(SLOT_DOMAIN_LABEL)) bySlot[s] = [];
  const domainCounts = {};

  for (const u of all) {
    const id = u.unit_id;
    if (!id || seen.has(id)) continue; // dedup — a unit lands in exactly one slot
    seen.add(id);
    const { domain, slot } = classify(u);
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    bySlot[slot].push({
      unit_id: id,
      wave: "DOMAIN",
      cost: "?",
      spec: "pending-generator",
      depends_on: [],
      summary: String(u.title || id).replace(/\r?\n/g, " ").trim().slice(0, 200),
      milestone: u.milestone || "",
      domain,
      source: "domain-alloc",
    });
  }

  // Merge audit-discovered feature-gap units. They carry an explicit `domain`
  // (bypass the classifier) and are PREPENDED — audit-discovered features lead
  // the slot's queue. Soft-read: a missing gap file just skips this step.
  let gapCount = 0;
  let gapUnits = [];
  try {
    const gj = JSON.parse(readFileSync(GAP_UNITS_FILE, "utf8"));
    gapUnits = Array.isArray(gj.units) ? gj.units : [];
  } catch { gapUnits = []; }
  const gapBySlot = {};
  for (const s of Object.keys(bySlot)) gapBySlot[s] = [];
  for (const g of gapUnits) {
    const id = g && g.unit_id;
    if (!id || seen.has(id)) continue;
    const slot = DOMAIN_TO_SLOT[g.domain];
    if (!slot || !gapBySlot[slot]) continue;
    seen.add(id);
    gapBySlot[slot].push({
      unit_id: id,
      wave: "GAP",
      cost: "?",
      spec: "pending-generator",
      depends_on: [],
      summary: String(g.title || id).replace(/\r?\n/g, " ").trim().slice(0, 200),
      milestone: g.milestone || "FEATURE-GAP-AUDIT-MS0",
      domain: g.domain,
      source: "feature-gap-audit",
    });
    gapCount++;
  }
  for (const s of Object.keys(bySlot)) bySlot[s] = [...gapBySlot[s], ...bySlot[s]];

  const perSlot = {};
  for (const s of Object.keys(bySlot)) {
    perSlot[s] = { domain: SLOT_DOMAIN_LABEL[s], units: bySlot[s].length, gapUnits: gapBySlot[s].length };
  }
  const summary = {
    classifiedFrom: { pending: pending.length, prose: prose.length, gapUnits: gapCount, uniqueUnits: seen.size },
    perSlot,
  };

  if (args.dryRun) {
    if (args.json) process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
    else {
      process.stdout.write(`[domain-alloc] DRY RUN — classified ${seen.size} units into 13 domains\n`);
      for (const s of Object.keys(perSlot)) {
        process.stdout.write(`  ${s.padEnd(8)} ${String(perSlot[s].units).padStart(5)} units (${String(perSlot[s].gapUnits).padStart(2)} gap)  ${perSlot[s].domain}\n`);
      }
    }
    return;
  }

  // Rewrite queues — preserve every non-`queues` top-level key.
  queue.queues = bySlot;
  queue.domainAllocation = {
    at: new Date().toISOString(),
    by: "claude-9f57075a (juliett)",
    model: "domain-specialized — each slot owns one PRISM system domain",
    source: "ROADMAP-CONSOLIDATED.json (pending_units + unconsolidated_prose) + FEATURE-GAP-UNITS-2026-05-17.json (forge-audit-v2 discoveries)",
    slotDomains: SLOT_DOMAIN_LABEL,
    unitsClassified: seen.size,
    featureGapUnits: gapCount,
    note: "keyword classification, advisory — operators may re-tag; entries carry depends_on:[] (RGS inventory has no dependency data). GAP-wave units (forge-audit-v2 discoveries) lead each slot queue.",
  };
  atomicWrite(QUEUE_FILE, JSON.stringify(queue, null, 2) + "\n");

  if (args.json) {
    process.stdout.write(JSON.stringify({ ok: true, ...summary }, null, 2) + "\n");
    return;
  }
  process.stdout.write(`[domain-alloc] classified ${seen.size} units into 13 domain-keyed slot queues\n`);
  for (const s of Object.keys(perSlot)) {
    process.stdout.write(`  ${s.padEnd(8)} ${String(perSlot[s].units).padStart(5)}  ${perSlot[s].domain}\n`);
  }
  process.stdout.write(`[domain-alloc] wrote ${QUEUE_FILE} (queues re-keyed by domain; other keys preserved)\n`);
}

main();
