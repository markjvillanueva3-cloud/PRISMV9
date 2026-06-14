#!/usr/bin/env node
/**
 * slot-queue-mark-done.mjs — stamp a queue entry done in slot-task-queues.json.
 *
 * The "tick" for queue entries whose own id is in no milestone envelope
 * (generator/enroller/prose-extraction units). The envelope/git shipped-set in
 * shipped-units-source-of-truth.mjs structurally cannot mark these done, so
 * slot-queue.mjs's pickNext() would re-serve them forever. After such a unit's
 * `[SCOPE]/U-ID` commit lands, run this to stamp `completed_at`+`completed_by`
 * on every matching queue entry; slot-queue.mjs's entryCompleted() then skips
 * it and the loop advances.
 *
 * Atomic temp+rename. Idempotent (already-stamped entries skipped unless
 * --force). Matches on normalized unit_id (trim + uppercase) exactly.
 *
 * Usage:
 *   node scripts/slot-queue-mark-done.mjs --unit-id U-FOO --dry-run
 *   node scripts/slot-queue-mark-done.mjs --unit-id U-FOO --by claude-xxxxxxxx --apply
 *   node scripts/slot-queue-mark-done.mjs --unit-id U-FOO --slot lima --apply
 *
 * Flags:
 *   --unit-id <ID>   the unit to stamp (required)
 *   --slot <nato>    restrict to one slot's queue (default: all slots)
 *   --by <id>        completed_by attribution (default: "slot-queue-mark-done")
 *   --force          re-stamp even if completed_at already set
 *   --dry-run        report matches, write nothing
 *   --apply          perform the stamp
 *
 * Exit: 0 ok (incl. idempotent 0-match) · 1 IO/parse error · 2 arg error
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// Default is the canonical fleet queue; PRISM_SLOT_QUEUE_PATH overrides it so
// hermetic tests can drive a temp fixture (harmless in prod — unset there).
const QUEUE_PATH = process.env.PRISM_SLOT_QUEUE_PATH || "H:/prism/state/shared/slot-task-queues.json";
const KNOWN_FLAGS = new Set([
  "--unit-id", "--slot", "--by", "--force", "--dry-run", "--apply", "--help", "-h",
]);
const norm = (id) => String(id || "").trim().toUpperCase();

function fail(msg, code = 2) {
  process.stderr.write(`slot-queue-mark-done: ${msg}\n`);
  process.exit(code);
}

function readValue(argv, i, flag) {
  const v = argv[i + 1];
  if (v === undefined) throw new Error(`${flag} requires a value`);
  if (v.startsWith("--")) throw new Error(`${flag} requires a value, got flag "${v}"`);
  return v;
}

function parseArgs(argv) {
  const out = { force: false, dryRun: false, apply: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!KNOWN_FLAGS.has(a)) throw new Error(`unknown argument: ${a}`);
    if (a === "--unit-id") { out.unitId = readValue(argv, i, a); i++; }
    else if (a === "--slot") { out.slot = readValue(argv, i, a); i++; }
    else if (a === "--by") { out.by = readValue(argv, i, a); i++; }
    else if (a === "--force") out.force = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--apply") out.apply = true;
    else if (a === "--help" || a === "-h") {
      process.stdout.write(fs.readFileSync(process.argv[1], "utf8").split("\n").slice(0, 33).join("\n") + "\n");
      process.exit(0);
    }
  }
  return out;
}

let args;
try { args = parseArgs(process.argv); }
catch (e) { fail(e.message); }
if (!args.unitId) fail("--unit-id is required");
if (!args.dryRun && !args.apply) fail("must pass either --dry-run or --apply");

if (!fs.existsSync(QUEUE_PATH)) fail(`queue file not found: ${QUEUE_PATH}`, 1);
const raw = fs.readFileSync(QUEUE_PATH, "utf8");
let queue;
try { queue = JSON.parse(raw); }
catch (e) { fail(`parse fail: ${e.message}`, 1); }
if (!queue.queues || typeof queue.queues !== "object") fail("queue.queues missing/invalid", 1);

const target = norm(args.unitId);
const slots = args.slot
  ? (Array.isArray(queue.queues[args.slot]) ? [args.slot] : fail(`slot "${args.slot}" has no queue`, 2))
  : Object.keys(queue.queues);

const stamp = new Date().toISOString();
const by = args.by || "slot-queue-mark-done";
let matched = 0, stamped = 0, alreadyDone = 0;
const touchedSlots = new Set();

for (const slot of slots) {
  const q = queue.queues[slot];
  if (!Array.isArray(q)) continue;
  for (const entry of q) {
    if (!entry || typeof entry !== "object") continue;
    if (norm(entry.unit_id) !== target) continue;
    matched++;
    if (entry.completed_at && !args.force) { alreadyDone++; continue; }
    if (!args.dryRun) {
      entry.completed_at = stamp;
      entry.completed_by = by;
    }
    stamped++;
    touchedSlots.add(slot);
  }
}

process.stdout.write(JSON.stringify({
  unit_id: target,
  scope: args.slot || "all-slots",
  matched,
  stamped,
  alreadyDone,
  touchedSlots: [...touchedSlots],
  mode: args.dryRun ? "dry-run" : "apply",
}, null, 2) + "\n");

if (matched === 0) {
  // Not an error — idempotent. The unit may have been migrated out, already
  // pruned, or only tracked via an envelope (the SSOT path). Report and exit 0.
  process.stdout.write(`(no queue entry matched ${target} — nothing to stamp; not an error)\n`);
  process.exit(0);
}

if (args.dryRun || stamped === 0) {
  process.exit(0);
}

const tmp = `${QUEUE_PATH}.tmp-mark-${Date.now()}`;
fs.writeFileSync(tmp, JSON.stringify(queue, null, 2) + "\n", "utf8");
fs.renameSync(tmp, QUEUE_PATH);
process.stdout.write(`stamped ${stamped} entry/entries done across [${[...touchedSlots].join(", ")}]\n`);
process.exit(0);
