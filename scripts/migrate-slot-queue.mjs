#!/usr/bin/env node
/**
 * Migrate every queue entry from one slot to another in slot-task-queues.json.
 *
 * Use when a chat operator decides to retire/consolidate a slot — entries are
 * APPENDED to the destination (destination's curated head stays prioritized),
 * source queue is emptied, and a `migrations[]` audit-log entry is recorded.
 *
 * Atomic write via temp + rename. Backup written to
 * `state/shared/slot-task-queues.json.bak-<ISO>` before any change.
 *
 * Usage:
 *   node scripts/migrate-slot-queue.mjs --from mike --to lima --dry-run
 *   node scripts/migrate-slot-queue.mjs --from mike --to lima --apply --reason "<text>"
 *
 * Flags:
 *   --from <nato>     source slot (queue will be emptied; required)
 *   --to <nato>       destination slot (entries appended; required)
 *   --reason <text>   one-line audit reason (required for --apply)
 *   --dry-run         print what would happen, no write
 *   --apply           perform the write
 *   --dedupe-on-id    skip a mike entry if its unit_id already exists at destination
 *
 * Exit codes: 0 ok · 1 arg/IO error · 2 dedupe blocked · 3 source empty (no-op)
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(process.cwd(), process.cwd().toLowerCase().includes("h:") ? "" : "H:/prism");
const QUEUE_PATH = path.resolve(ROOT, "state/shared/slot-task-queues.json");

const VALID_SLOTS = new Set([
  "alpha","bravo","charlie","delta","echo","foxtrot",
  "golf","hotel","india","juliett","kilo","lima","mike",
]);
const KNOWN_FLAGS = new Set([
  "--from","--to","--reason","--dry-run","--apply","--dedupe-on-id","--help","-h",
]);

function readValue(argv, i, flagName) {
  const next = argv[i + 1];
  if (next === undefined) throw new Error(`${flagName} requires a value`);
  if (next.startsWith("--")) throw new Error(`${flagName} requires a value, got flag "${next}"`);
  return next;
}

function parseArgs(argv) {
  const out = { dryRun: false, apply: false, dedupeOnId: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!KNOWN_FLAGS.has(a)) {
      throw new Error(`unknown argument: ${a}`);
    }
    if (a === "--from") { out.from = readValue(argv, i, "--from"); i++; }
    else if (a === "--to") { out.to = readValue(argv, i, "--to"); i++; }
    else if (a === "--reason") { out.reason = readValue(argv, i, "--reason"); i++; }
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--apply") out.apply = true;
    else if (a === "--dedupe-on-id") out.dedupeOnId = true;
    else if (a === "--help" || a === "-h") {
      process.stdout.write(fs.readFileSync(process.argv[1], "utf8").split("\n").slice(0, 30).join("\n") + "\n");
      process.exit(0);
    }
  }
  return out;
}

function fail(msg, code = 1) {
  process.stderr.write(`migrate-slot-queue: ${msg}\n`);
  process.exit(code);
}

let args;
try { args = parseArgs(process.argv); }
catch (e) { fail(e.message); }
if (!args.from || !args.to) fail("missing --from/--to");
if (!VALID_SLOTS.has(args.from)) fail(`--from "${args.from}" is not a valid NATO slot name`);
if (!VALID_SLOTS.has(args.to)) fail(`--to "${args.to}" is not a valid NATO slot name`);
if (args.from === args.to) fail("--from and --to must differ");
if (args.apply && !args.reason) fail("--apply requires --reason");
if (!args.dryRun && !args.apply) fail("must pass either --dry-run or --apply");

if (!fs.existsSync(QUEUE_PATH)) fail(`queue file not found: ${QUEUE_PATH}`);

const raw = fs.readFileSync(QUEUE_PATH, "utf8");
let queue;
try { queue = JSON.parse(raw); }
catch (e) { fail(`parse fail: ${e.message}`); }

if (!queue.queues || typeof queue.queues !== "object") fail("queue.queues missing/invalid");
const src = queue.queues[args.from];
const dst = queue.queues[args.to];
if (!Array.isArray(src)) fail(`source slot "${args.from}" has no array queue`);
if (!Array.isArray(dst)) fail(`destination slot "${args.to}" has no array queue`);

if (src.length === 0) {
  process.stdout.write(`source "${args.from}" is already empty — no-op\n`);
  process.exit(3);
}

const dstIds = new Set(dst.map(u => u.unit_id || u.id).filter(Boolean));
let toMove = src;
let skipped = [];
if (args.dedupeOnId) {
  toMove = [];
  for (const u of src) {
    const id = u.unit_id || u.id;
    if (id && dstIds.has(id)) skipped.push(id);
    else toMove.push(u);
  }
}

const summary = {
  from: args.from,
  to: args.to,
  reason: args.reason || "(dry-run)",
  beforeSrcCount: src.length,
  beforeDstCount: dst.length,
  movedCount: toMove.length,
  skippedDuplicates: skipped.length,
  afterSrcCount: 0,
  afterDstCount: dst.length + toMove.length,
};

process.stdout.write(`Migration plan:\n${JSON.stringify(summary, null, 2)}\n`);
if (skipped.length > 0 && skipped.length <= 10) {
  process.stdout.write(`Skipped (already at destination): ${skipped.join(", ")}\n`);
} else if (skipped.length > 10) {
  process.stdout.write(`Skipped ${skipped.length} duplicates (first 10: ${skipped.slice(0, 10).join(", ")})\n`);
}

if (args.dryRun) {
  process.stdout.write("\n[dry-run] no changes written.\n");
  process.exit(0);
}

// Apply: backup + mutate + atomic write.
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const bakPath = `${QUEUE_PATH}.bak-${stamp}`;
fs.writeFileSync(bakPath, raw, "utf8");

// Tag every migrated entry so its provenance survives.
const tagged = toMove.map(u => ({
  ...u,
  migrated_from: args.from,
  migrated_at: new Date().toISOString(),
}));

queue.queues[args.to] = [...dst, ...tagged];
queue.queues[args.from] = args.dedupeOnId && skipped.length > 0
  ? src.filter(u => skipped.includes(u.unit_id || u.id))
  : [];

queue.updatedAt = new Date().toISOString();
queue.updatedBy = `migrate-slot-queue (${args.from} → ${args.to})`;
queue.migrations = Array.isArray(queue.migrations) ? queue.migrations : [];
queue.migrations.push({
  ts: new Date().toISOString(),
  from: args.from,
  to: args.to,
  moved: toMove.length,
  skipped: skipped.length,
  reason: args.reason,
  backup: path.basename(bakPath),
});

// Atomic write: temp file + rename (rename is atomic on Windows NTFS for same-volume targets).
const tmpPath = `${QUEUE_PATH}.tmp-${stamp}`;
fs.writeFileSync(tmpPath, JSON.stringify(queue, null, 2) + "\n", "utf8");
fs.renameSync(tmpPath, QUEUE_PATH);

process.stdout.write(`\nMigration committed.\n  backup: ${bakPath}\n  queue:  ${QUEUE_PATH}\n`);
process.exit(0);
