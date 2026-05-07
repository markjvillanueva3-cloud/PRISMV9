#!/usr/bin/env node
/**
 * cog-bridge-drain.mjs — COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH10-FOLLOWUP
 * =========================================================================
 *
 * Closes the 2 feedback loops created by the BATCH10 hooks
 * (cog-bridge-ai-memory-capture.mjs + cog-bridge-awareness-rebuild.mjs).
 *
 * The hooks are intentionally non-blocking — they only APPEND records to
 * .jsonl queue files. Without a drainer, those queues grow forever and the
 * feedback loops are no-ops. This script processes the queues and:
 *
 *   1. awareness-rebuild-queue.jsonl  → trigger one manifest rebuild via
 *      `agentSelfAwarenessEngine.buildAwareness(true)` (deduplicated; one
 *      drain == one rebuild regardless of queue depth — that's the whole
 *      point of debouncing in the hook).
 *
 *   2. cog-bridge-memory-capture.jsonl → for each record, persist to the
 *      cross-session memory graph via QdrantMemoryEngineSingleton.remember().
 *      Each cognitive-outcome becomes one memory node so the AI ↔ memory
 *      loop closes automatically.
 *
 * Safety:
 *   - Never throws — always exits 0 in production mode (--strict to fail).
 *   - Concurrent-write safe: atomically rotates queue (rename → truncate
 *     original) so records appended during processing land in fresh queue.
 *   - Idempotent: empty queues exit early, do nothing.
 *   - Path-portable: PRISM_ROOT env var override, falls back to script-
 *     relative resolution (no hardcoded H:/prism).
 *
 * Usage:
 *   node .claude/helpers/cog-bridge-drain.mjs              # drain
 *   node .claude/helpers/cog-bridge-drain.mjs --dry-run    # preview only
 *   node .claude/helpers/cog-bridge-drain.mjs --json       # machine-readable
 *   node .claude/helpers/cog-bridge-drain.mjs --strict     # exit 1 on error
 *
 * Schedule via cron / Task Scheduler / `prism_orchestrate:auto_resume`:
 *   every 5 min during active sessions (drain is cheap when queues empty).
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-COG-BATCH10-FOLLOWUP
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PRISM_ROOT: env var override → fall back to .claude/helpers parent
// (.claude/helpers → .claude → PRISM_ROOT)
const PRISM_ROOT = process.env.PRISM_ROOT
  ? path.resolve(process.env.PRISM_ROOT)
  : path.resolve(__dirname, "..", "..");

const AWARENESS_QUEUE = path.join(PRISM_ROOT, "state", "shared", "awareness-rebuild-queue.jsonl");
const MEMORY_QUEUE = path.join(PRISM_ROOT, "state", "shared", "cog-bridge-memory-capture.jsonl");
const DRAIN_LOG = path.join(PRISM_ROOT, "state", "shared", "cog-bridge-drain.log.jsonl");

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const JSON_OUT = args.has("--json");
const STRICT = args.has("--strict");

function readJsonlSafe(p) {
  try {
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, "utf-8");
    if (!raw.trim()) return [];
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    const records = [];
    for (const line of lines) {
      try {
        records.push(JSON.parse(line));
      } catch {
        // Skip malformed lines silently — don't block drain on bad JSON
      }
    }
    return records;
  } catch {
    return [];
  }
}

/**
 * Atomic rotate: rename queue to .processing-<ts>, truncate original.
 * Records appended during processing land in the fresh queue.
 * Returns the path to the snapshot file (or null if queue was missing/empty).
 */
function rotateQueue(queuePath) {
  if (!fs.existsSync(queuePath)) return null;
  const stats = fs.statSync(queuePath);
  if (stats.size === 0) return null;
  const ts = Date.now();
  const snapshotPath = `${queuePath}.processing-${ts}`;
  try {
    // rename is atomic on same filesystem
    fs.renameSync(queuePath, snapshotPath);
    // create fresh empty queue so hooks can keep appending
    fs.writeFileSync(queuePath, "");
    return snapshotPath;
  } catch (err) {
    return null;
  }
}

function appendDrainLog(record) {
  try {
    fs.mkdirSync(path.dirname(DRAIN_LOG), { recursive: true });
    fs.appendFileSync(DRAIN_LOG, JSON.stringify(record) + "\n");
  } catch {
    /* logging failure is non-fatal */
  }
}

async function drainAwarenessQueue() {
  const records = readJsonlSafe(AWARENESS_QUEUE);
  if (records.length === 0) {
    return { processed: 0, rebuilt: false, files: [], error: null };
  }

  // Dedupe by file path — one rebuild covers all queued files
  const uniqueFiles = [...new Set(records.map((r) => r.file).filter((f) => typeof f === "string"))];
  const fileKinds = [...new Set(records.map((r) => r.file_kind).filter((k) => typeof k === "string"))];

  if (DRY_RUN) {
    return {
      processed: records.length,
      rebuilt: false,
      dry_run: true,
      files: uniqueFiles.slice(0, 10),
      file_kinds: fileKinds,
      error: null,
    };
  }

  // Rotate queue BEFORE rebuild so concurrent appends go to fresh queue
  const snapshotPath = rotateQueue(AWARENESS_QUEUE);
  if (!snapshotPath) {
    return { processed: records.length, rebuilt: false, files: [], error: "rotate-failed" };
  }

  let rebuilt = false;
  let rebuildErr = null;
  try {
    // Direct engine import — same module the dispatcher uses
    const enginePath = path.join(PRISM_ROOT, "mcp-server", "dist", "engines", "AgentSelfAwarenessEngine.js");
    if (!fs.existsSync(enginePath)) {
      // Build artifact missing — log and skip rather than fail
      rebuildErr = "engine-not-built";
    } else {
      // file:// URL is required for Windows path imports
      const moduleUrl = `file://${enginePath.replace(/\\/g, "/")}`;
      const mod = await import(moduleUrl);
      const engine = mod.agentSelfAwarenessEngine ?? mod.default;
      if (!engine || typeof engine.buildAwareness !== "function") {
        rebuildErr = "engine-shape-unexpected";
      } else {
        await engine.buildAwareness(true); // force refresh
        rebuilt = true;
      }
    }
  } catch (err) {
    rebuildErr = err?.message ?? String(err);
  }

  // Archive snapshot — keep a few days of evidence for debugging
  try {
    const archiveDir = path.join(PRISM_ROOT, "state", "shared", ".cog-bridge-archive");
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.renameSync(snapshotPath, path.join(archiveDir, path.basename(snapshotPath)));
  } catch {
    /* archive failure is non-fatal — just delete */
    try { fs.unlinkSync(snapshotPath); } catch { /* ignore */ }
  }

  return {
    processed: records.length,
    rebuilt,
    files: uniqueFiles.slice(0, 10),
    file_kinds: fileKinds,
    error: rebuildErr,
  };
}

async function drainMemoryQueue() {
  const records = readJsonlSafe(MEMORY_QUEUE);
  if (records.length === 0) {
    return { processed: 0, persisted: 0, errors: 0, sample: [] };
  }

  if (DRY_RUN) {
    return {
      processed: records.length,
      persisted: 0,
      errors: 0,
      dry_run: true,
      sample: records.slice(0, 3).map((r) => ({
        action: r.action,
        tool: r.tool,
        ts: r.ts,
      })),
    };
  }

  const snapshotPath = rotateQueue(MEMORY_QUEUE);
  if (!snapshotPath) {
    return { processed: records.length, persisted: 0, errors: 0, error: "rotate-failed", sample: [] };
  }

  let persisted = 0;
  let errors = 0;
  const errorSamples = [];

  try {
    const enginePath = path.join(PRISM_ROOT, "mcp-server", "dist", "engines", "QdrantMemoryEngineSingleton.js");
    if (!fs.existsSync(enginePath)) {
      // Build artifact missing — preserve queue, return early
      try {
        fs.renameSync(snapshotPath, MEMORY_QUEUE);
      } catch { /* ignore */ }
      return {
        processed: records.length,
        persisted: 0,
        errors: records.length,
        error: "engine-not-built",
        sample: [],
      };
    }

    const moduleUrl = `file://${enginePath.replace(/\\/g, "/")}`;
    const mod = await import(moduleUrl);
    const Singleton = mod.QdrantMemoryEngineSingleton ?? mod.default;
    if (!Singleton || typeof Singleton.getInstance !== "function") {
      try { fs.renameSync(snapshotPath, MEMORY_QUEUE); } catch { /* ignore */ }
      return {
        processed: records.length,
        persisted: 0,
        errors: records.length,
        error: "singleton-shape-unexpected",
        sample: [],
      };
    }

    const engine = Singleton.getInstance();

    for (const rec of records) {
      try {
        const action = typeof rec.action === "string" ? rec.action : "unknown";
        const tool = typeof rec.tool === "string" ? rec.tool : "unknown";
        const ts = typeof rec.ts === "string" ? rec.ts : new Date().toISOString();
        const id = `cog-${action}-${ts.replace(/[^0-9]/g, "")}`;
        const text =
          `Cognitive outcome: ${tool}::${action} at ${ts}. ` +
          `Result keys: ${(rec.summary?.keys ?? []).join(", ") || "none"}. ` +
          `Has error: ${rec.summary?.has_error ?? false}. ` +
          `Size: ${rec.summary?.result_size_bytes ?? 0} bytes.`;
        const metadata = {
          source: "cog-bridge-drain",
          tool,
          action,
          session_id: rec.session_id ?? null,
          has_error: rec.summary?.has_error ?? false,
          result_size_bytes: rec.summary?.result_size_bytes ?? 0,
          captured_at: ts,
        };
        const r = await engine.remember({ kind: "cognitive_outcome", id, text, metadata });
        if (r && r.ok) {
          persisted++;
        } else {
          errors++;
          if (errorSamples.length < 3) errorSamples.push({ id, error: r?.error ?? "unknown" });
        }
      } catch (err) {
        errors++;
        if (errorSamples.length < 3) errorSamples.push({ error: err?.message ?? String(err) });
      }
    }
  } catch (err) {
    // Top-level engine load failed — preserve queue
    try { fs.renameSync(snapshotPath, MEMORY_QUEUE); } catch { /* ignore */ }
    return {
      processed: records.length,
      persisted: 0,
      errors: records.length,
      error: err?.message ?? String(err),
      sample: [],
    };
  }

  // Archive or delete snapshot
  try {
    const archiveDir = path.join(PRISM_ROOT, "state", "shared", ".cog-bridge-archive");
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.renameSync(snapshotPath, path.join(archiveDir, path.basename(snapshotPath)));
  } catch {
    try { fs.unlinkSync(snapshotPath); } catch { /* ignore */ }
  }

  return {
    processed: records.length,
    persisted,
    errors,
    sample: errorSamples,
  };
}

async function main() {
  const startedAt = Date.now();
  const awareness = await drainAwarenessQueue();
  const memory = await drainMemoryQueue();
  const elapsedMs = Date.now() - startedAt;

  const summary = {
    schema_version: "1.0.0",
    ts: new Date().toISOString(),
    dry_run: DRY_RUN,
    elapsed_ms: elapsedMs,
    awareness,
    memory,
  };

  if (!DRY_RUN) appendDrainLog(summary);

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    const aFlag = awareness.error ? "ERR" : (awareness.rebuilt ? "ok" : "skip");
    const mFlag = memory.error ? "ERR" : `${memory.persisted}/${memory.processed}`;
    process.stdout.write(
      `cog-bridge-drain: awareness[${aFlag}, ${awareness.processed} queued] ` +
      `memory[${mFlag}, errors=${memory.errors ?? 0}] ` +
      `${elapsedMs}ms${DRY_RUN ? " (dry-run)" : ""}\n`
    );
    if (awareness.error) process.stdout.write(`  awareness err: ${awareness.error}\n`);
    if (memory.error) process.stdout.write(`  memory err: ${memory.error}\n`);
  }

  // STRICT mode: exit 1 if any drain step had an error
  if (STRICT && (awareness.error || memory.error)) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ schema_version: "1.0.0", error: err?.message ?? String(err) }) + "\n");
  } else {
    process.stderr.write(`cog-bridge-drain: fatal — ${err?.message ?? err}\n`);
  }
  process.exit(STRICT ? 1 : 0);
});
