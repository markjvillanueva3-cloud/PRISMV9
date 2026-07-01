#!/usr/bin/env node
/**
 * topup-slot-queues.mjs — non-destructively top up starved slot task queues.
 *
 * Spec: JULIETT-12CHAT-ALLOCATION-MS0 (slot juliett, 2026-05-17).
 * Work order: "build the roadmaps for each chat slot then inject them into
 * their task queues" — answered with mode "top up starved slots only".
 *
 * The live per-slot task queue is `state/shared/slot-task-queues.json`, read by
 * `scripts/slot-queue.mjs` which `/checkin-<slot> /loop` uses as its preferred
 * pickup source. Some slots are starved (few eligible units) while others are
 * deep. This script appends units from the latest per-slot RGS allocation
 * (JULIETT-PER-SLOT-RGS-ALLOCATION-<date>.json) to ONLY the starved slots,
 * bringing each up toward `--min-depth` eligible units.
 *
 * NON-DESTRUCTIVE: existing queue entries are never removed or reordered; only
 * appended to. A unit already present in ANY slot's queue is skipped (global
 * dedup — two slots must never queue the same unit). Shipped / peer-claimed
 * units are skipped. Re-runnable as slots drain.
 *
 * Eligibility (before/after) is measured by shelling out to `slot-queue.mjs
 * --status --json` so the numbers match the real consumer exactly — no
 * re-implemented eligibility logic to drift.
 *
 * Usage:  node scripts/topup-slot-queues.mjs [--min-depth N] [--dry-run]
 *                                            [--json] [--allocation <path>]
 * Exit:   0 ok (incl. nothing-to-do) · 1 validation error · 2 runtime error
 *         · 3 queue file missing/malformed
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, renameSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, basename } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const QUEUE_FILE = resolve(ROOT, "state/shared/slot-task-queues.json");
const CLAIMS_FILE = resolve(ROOT, "state/shared/slot-task-claims.json");
const PROGRESS_FILE = resolve(ROOT, "state/shared/MILESTONE_PROGRESS.json");
const SPEC_DIR = resolve(ROOT, "state/shared/specs");
const SLOT_QUEUE = resolve(ROOT, "scripts/slot-queue.mjs");
const PRIORITY_QUEUE = resolve(ROOT, ".claude/helpers/priority-queue.mjs");

const DEFAULT_MIN_DEPTH = 6;     // matches the RGS allocator's --per-slot default
const MAX_MIN_DEPTH = 50;        // CLI clamp — refuse absurd targets
const HYGIENE_SLOT = "golf";     // never gets the priority-queue feature-unit fallback
const FALLBACK_OVERPULL = 3;     // pull gap×this from priority-queue so dedup losses still fill
const MAX_EXCLUDE_CHARS = 28000; // cap the --exclude CSV well under the Windows cmdline limit

// Canonical unit-id form for dedup. PRISM unit IDs are uppercase by convention;
// normalizing makes the cross-slot dedup invariant robust regardless of casing.
const norm = (id) => String(id == null ? "" : id).trim().toUpperCase();

function parseArgs(argv) {
  const a = { minDepth: DEFAULT_MIN_DEPTH, dryRun: false, json: false, allocation: null, noFallback: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--min-depth") a.minDepth = Number(argv[++i]);
    else if (t === "--dry-run") a.dryRun = true;
    else if (t === "--json") a.json = true;
    else if (t === "--allocation") a.allocation = argv[++i];
    else if (t === "--no-fallback") a.noFallback = true;
    else { process.stderr.write(`unknown arg: ${t}\n`); process.exit(1); }
  }
  if (!Number.isInteger(a.minDepth) || a.minDepth < 1 || a.minDepth > MAX_MIN_DEPTH) {
    process.stderr.write(`--min-depth must be 1..${MAX_MIN_DEPTH} (got ${a.minDepth})\n`);
    process.exit(1);
  }
  return a;
}

function readJson(path, { exitCode, label }) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    process.stderr.write(`${label} not readable (${path}): ${e.message}\n`);
    process.exit(exitCode);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`${label} is not valid JSON (${path}): ${e.message}\n`);
    process.exit(exitCode);
  }
}

function readJsonSoft(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

// Newest JULIETT-PER-SLOT-RGS-ALLOCATION-*.json by date-suffixed filename.
function findAllocation(explicit) {
  if (explicit) return resolve(explicit);
  let files;
  try {
    files = readdirSync(SPEC_DIR).filter(
      (f) => /^JULIETT-PER-SLOT-RGS-ALLOCATION-\d{4}-\d{2}-\d{2}\.json$/.test(f)
    );
  } catch (e) {
    process.stderr.write(`cannot read spec dir ${SPEC_DIR}: ${e.message}\n`);
    process.exit(2);
  }
  if (files.length === 0) {
    process.stderr.write(
      `no JULIETT-PER-SLOT-RGS-ALLOCATION-*.json in ${SPEC_DIR} — run allocate-rgs-per-slot.mjs first\n`
    );
    process.exit(2);
  }
  files.sort(); // date-suffixed → lexical sort is chronological
  return join(SPEC_DIR, files[files.length - 1]);
}

function loadShippedSet() {
  const prog = readJsonSoft(PROGRESS_FILE) || {};
  const shipped = new Set();
  const milestones = Array.isArray(prog.milestones)
    ? prog.milestones
    : Object.values(prog.milestones || {});
  for (const m of milestones) {
    const ships = Array.isArray(m?.shipped) ? m.shipped : [];
    for (const u of ships) shipped.add(norm(typeof u === "string" ? u : u?.unit_id || u?.id || ""));
  }
  return shipped;
}

function loadActiveClaims() {
  const claims = readJsonSoft(CLAIMS_FILE) || {};
  const active = new Set();
  const claimList = Array.isArray(claims.claims)
    ? claims.claims
    : Object.values(claims.claims || {});
  for (const c of claimList) {
    const status = c?.status || c?.phase;
    if (status === "claimed" || status === "building" || status === "testing" || status === "committing") {
      const uid = c?.unitId || c?.unit_id || c?.unit;
      if (uid) active.add(norm(uid));
    }
  }
  return active;
}

// Per-slot eligible counts via the real consumer — no re-implemented logic.
function eligibleBySlot() {
  let raw;
  try {
    raw = execFileSync(process.execPath, [SLOT_QUEUE, "--status", "--json"], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (e) {
    process.stderr.write(`slot-queue.mjs --status failed: ${e.message}\n`);
    process.exit(2);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`slot-queue.mjs --status emitted invalid JSON: ${e.message}\n`);
    process.exit(2);
  }
  const status = parsed && parsed.status ? parsed.status : {};
  const out = {};
  for (const [slot, v] of Object.entries(status)) {
    out[slot] = Number(v && v.eligible) || 0;
  }
  return out;
}

// Deep-tail source: when a slot's curated RGS allocation is exhausted by dedup,
// pull more priority-ordered units straight from priority-queue (the same picker
// the allocator delegates to). `excludeSet` is every unit_id already queued, so
// the fallback never re-queues a unit. Empty-pool (priority-queue exit 1 with a
// valid `[]` on stdout) is recovered, not treated as a failure.
function pullFallback(slot, topN, excludeSet) {
  let exclude = [...excludeSet].join(",");
  // The exclude CSV is only an over-pull-efficiency hint — the caller's
  // norm()-keyed inQueue.has() re-check is the real dedup guard. Cap the CSV
  // well under the Windows CreateProcess command-line limit; truncation at
  // worst costs a few wasted over-pull slots, never a correctness violation.
  if (exclude.length > MAX_EXCLUDE_CHARS) {
    const cut = exclude.lastIndexOf(",", MAX_EXCLUDE_CHARS);
    exclude = cut > 0 ? exclude.slice(0, cut) : exclude.slice(0, MAX_EXCLUDE_CHARS);
  }
  const argv = [PRIORITY_QUEUE, "--pick", "--slot", slot, "--top", String(topN), "--json"];
  if (exclude) argv.push("--exclude", exclude);
  let raw;
  try {
    raw = execFileSync(process.execPath, argv, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  } catch (e) {
    const so = e && e.stdout != null ? String(e.stdout) : "";
    try {
      const a = JSON.parse(so);
      if (Array.isArray(a)) return a;
    } catch { /* fall through */ }
    process.stderr.write(`priority-queue fallback for slot ${slot} failed: ${e.message}\n`);
    process.exit(2);
  }
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a : [];
  } catch (e) {
    process.stderr.write(`priority-queue fallback emitted invalid JSON: ${e.message}\n`);
    process.exit(2);
  }
}

function atomicWrite(path, content) {
  const tmp = path + ".tmp-" + process.pid;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, path);
}

function main() {
  const args = parseArgs(process.argv);
  const allocationPath = findAllocation(args.allocation);

  const queue = readJson(QUEUE_FILE, { exitCode: 3, label: "slot-task-queues.json" });
  if (!queue.queues || typeof queue.queues !== "object") {
    process.stderr.write(`slot-task-queues.json has no .queues object\n`);
    process.exit(3);
  }
  const alloc = readJson(allocationPath, { exitCode: 2, label: "RGS allocation" });
  if (!alloc.slots || typeof alloc.slots !== "object") {
    process.stderr.write(`RGS allocation has no .slots object (${allocationPath})\n`);
    process.exit(2);
  }

  const shipped = loadShippedSet();
  const claimed = loadActiveClaims();
  const eligBefore = eligibleBySlot();

  // Global set of every unit_id already queued anywhere — the dedup guard.
  // Keyed by norm() so the cross-slot "no unit in two queues" invariant holds
  // regardless of casing differences between sources.
  const inQueue = new Set();
  for (const arr of Object.values(queue.queues)) {
    if (Array.isArray(arr)) for (const e of arr) if (e && e.unit_id) inQueue.add(norm(e.unit_id));
  }

  const results = [];
  let totalAdded = 0;
  for (const slot of Object.keys(queue.queues)) {
    const arr = queue.queues[slot];
    if (!Array.isArray(arr)) continue;
    const before = eligBefore[slot] ?? 0;
    if (before >= args.minDepth) continue; // not starved

    const gap = args.minDepth - before;
    const allocUnits = (alloc.slots[slot] && Array.isArray(alloc.slots[slot].units))
      ? alloc.slots[slot].units
      : [];
    const added = [];
    const skipped = { duplicate: 0, shipped: 0, claimed: 0 };
    for (const u of allocUnits) {
      if (added.length >= gap) break;
      const id = u && u.unit_id;
      if (!id) continue;
      const nid = norm(id);
      if (inQueue.has(nid)) { skipped.duplicate++; continue; }
      if (shipped.has(nid)) { skipped.shipped++; continue; }
      if (claimed.has(nid)) { skipped.claimed++; continue; }
      // depends_on is intentionally [] — the RGS/priority-queue consolidated
      // inventory carries NO dependency data (0/3197 pending_units have a
      // depends_on field). Topped-up units therefore have no dep ordering;
      // the slot's /checkin build is the backstop if a prerequisite is unmet.
      arr.push({
        unit_id: id,
        wave: "RGS",
        cost: "?",
        spec: "pending-generator",
        depends_on: [],
        summary: String(u.title || id).replace(/\r?\n/g, " ").trim(),
        milestone: u.milestone || "",
        source: "rgs-topup",
      });
      inQueue.add(nid);
      added.push(id);
    }

    // Deep-tail fallback: RGS allocation exhausted before the gap closed.
    // golf is exempt — the priority-queue tail is feature units, and golf is
    // the hygiene slot; it only ever receives its curated RGS hygiene allocation.
    let fallbackAdded = 0;
    if (added.length < gap && !args.noFallback && slot !== HYGIENE_SLOT) {
      const need = gap - added.length;
      const fb = pullFallback(slot, need * FALLBACK_OVERPULL, inQueue);
      for (const u of fb) {
        if (added.length >= gap) break;
        const id = u && u.unit_id;
        if (!id) continue;
        const nid = norm(id);
        if (inQueue.has(nid) || shipped.has(nid) || claimed.has(nid)) continue;
        arr.push({
          unit_id: id,
          wave: "RGS",
          cost: "?",
          spec: "pending-generator",
          depends_on: [], // see note above — RGS inventory has no dependency data
          summary: String(u.title || id).replace(/\r?\n/g, " ").trim(),
          milestone: u.milestone || "",
          source: "pq-fallback",
        });
        inQueue.add(nid);
        added.push(id);
        fallbackAdded++;
      }
    }

    totalAdded += added.length;
    results.push({
      slot,
      before,
      added: added.length,
      fromAllocation: added.length - fallbackAdded,
      fromFallback: fallbackAdded,
      shortfall: gap - added.length,
      addedIds: added,
      skipped,
    });
  }

  if (results.length === 0) {
    const msg = `[topup-slot-queues] all slots already at/above min-depth ${args.minDepth} — nothing to do\n`;
    if (args.json) process.stdout.write(JSON.stringify({ ok: true, toppedUp: [], totalAdded: 0 }, null, 2) + "\n");
    else process.stdout.write(msg);
    return;
  }

  const provenance = {
    at: new Date().toISOString(),
    by: "claude-9f57075a (juliett)",
    source: basename(allocationPath),
    minDepth: args.minDepth,
    unitsAdded: totalAdded,
    slotsToppedUp: results.map((r) => ({ slot: r.slot, before: r.before, added: r.added, shortfall: r.shortfall })),
    note: "topped-up entries carry depends_on:[] — the RGS/priority-queue inventory has no dependency data; the slot /checkin build is the dep backstop",
  };

  if (args.dryRun) {
    const plan = { ok: true, dryRun: true, allocation: basename(allocationPath), minDepth: args.minDepth, totalAdded, results };
    if (args.json) process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
    else {
      process.stdout.write(`[topup-slot-queues] DRY RUN — allocation ${basename(allocationPath)}, min-depth ${args.minDepth}\n`);
      for (const r of results) {
        process.stdout.write(
          `  ${r.slot.padEnd(8)} eligible ${r.before} → +${r.added}` +
            (r.shortfall > 0 ? ` (shortfall ${r.shortfall} — RGS pool/dedup exhausted)` : "") +
            `  [${r.addedIds.join(", ") || "none"}]\n`
        );
      }
      process.stdout.write(`[topup-slot-queues] would add ${totalAdded} units across ${results.length} slot(s). Re-run without --dry-run to apply.\n`);
    }
    return;
  }

  queue.lastTopup = provenance;
  atomicWrite(QUEUE_FILE, JSON.stringify(queue, null, 2) + "\n");

  // Re-measure with the real consumer so the reported "after" is honest.
  const eligAfter = eligibleBySlot();
  for (const r of results) r.after = eligAfter[r.slot] ?? null;

  if (args.json) {
    process.stdout.write(JSON.stringify({ ok: true, allocation: basename(allocationPath), minDepth: args.minDepth, totalAdded, results }, null, 2) + "\n");
    return;
  }
  process.stdout.write(`[topup-slot-queues] topped up ${results.length} starved slot(s), +${totalAdded} units (allocation ${basename(allocationPath)})\n`);
  for (const r of results) {
    process.stdout.write(
      `  ${r.slot.padEnd(8)} eligible ${r.before} → ${r.after}` +
        (r.shortfall > 0 ? `  WARN shortfall ${r.shortfall} (RGS allocation/dedup exhausted — re-run allocate-rgs-per-slot.mjs --per-slot N for more)` : "") +
        `\n`
    );
  }
  process.stdout.write(`[topup-slot-queues] wrote ${QUEUE_FILE} (non-destructive append; existing entries untouched)\n`);
}

main();
