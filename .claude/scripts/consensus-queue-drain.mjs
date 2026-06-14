#!/usr/bin/env node
/**
 * consensus-queue-drain.mjs — drain the auto-fire consensus queue.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-AUTO-FIRE.
 *
 * The hooks `auto-consensus-userprompt.mjs` and `auto-consensus-critical-edit.mjs`
 * both ENQUEUE pending consensus tasks instead of running consensus
 * inline (because consensus is 30-60s — too slow for any critical-path hook).
 *
 * This script drains the queue. Invoke it:
 *   - Manually: `node .claude/scripts/consensus-queue-drain.mjs`
 *   - On Stop hook (idle moment, won't block the user)
 *   - On a periodic cron / chokidar watcher
 *   - --max=N to limit runs per invocation (default 3 per drain)
 *   - --once to drain a single entry then exit
 *
 * Each entry calls `multiModelConsensusEngine.ask()` via the compiled engine
 * in `mcp-server/dist/`. Failure to load means MCP isn't built — the script
 * exits 0 with a warning so it never breaks Stop hook.
 *
 * After processing, the entry is moved from queue.jsonl to a sibling
 * `consensus-queue-processed.jsonl` so we have an audit trail.
 *
 * @module scripts/consensus-queue-drain
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

const QUEUE_PATH = process.env.PRISM_CONSENSUS_QUEUE ?? "H:/prism/state/shared/consensus-queue.jsonl";
const PROCESSED_PATH = QUEUE_PATH.replace(/\.jsonl$/, "-processed.jsonl");
const DEFAULT_MAX_PER_DRAIN = 3;

// RATE-LIMIT-FIX (slot:bravo, 2026-06-09). The auto-consensus hook queues EVERY prompt across
// the ~10-session fleet; the drain fans each out via engine.ask(). With the engine DEFAULTS
// (includeClaude:true + the always-on codex voice) every drained entry made a real Claude/Codex
// API call -> across the fleet that is a hidden amplifier of the exact org-wide rate limit this
// session diagnosed (see reference_ollama_fanout_ratelimit_fix_2026_06_09). So the drain now runs
// LOCAL-ONLY by default: gpt-oss:120b + qwen2.5-coder:32b (two strong resident voices = genuine
// multi-model consensus, $0, NO Anthropic limit). Set PRISM_CONSENSUS_DRAIN_INCLUDE_CLAUDE=1 to
// restore Claude/Codex-inclusive consensus when rate limits are not a concern (R7: safe default,
// richer path opt-in). The local panel mirrors octopus-first-live-record's voice bound.
const DRAIN_INCLUDE_CLAUDE = process.env.PRISM_CONSENSUS_DRAIN_INCLUDE_CLAUDE === "1";
// CO-RESIDENCY-CORRECT panel (live-validation R15 finding 2026-06-09): the drain fires on every
// Stop, so its two voices must CO-RESIDE in VRAM for a fast genuine 2-voice consensus. gpt-oss:120b
// (65GB) + qwen2.5-coder:32b (37GB) = 102GB > 96GB -> can't co-reside -> resolveDiverseOllamaPanel
// drops the 120b -> SINGLE voter (proven: a batch drain recorded voters=[qwen2.5-coder:32b] only).
// qwen2.5-coder:32b (37GB, code specialist) + gpt-oss:20b (13GB, general reasoner) = 50GB < 96GB:
// both resident, both diverse families -> a real fast 2-voice consensus. Override via
// PRISM_CONSENSUS_DRAIN_PANEL="modelA,modelB". (The 120b stays the octopus deep-reasoning voice.)
const DRAIN_LOCAL_PANEL = (process.env.PRISM_CONSENSUS_DRAIN_PANEL
  ? process.env.PRISM_CONSENSUS_DRAIN_PANEL.split(",").map((s) => s.trim()).filter(Boolean)
  : ["qwen2.5-coder:32b", "gpt-oss:20b"]);

// Build the voice bound for engine.ask(). Local-only unless explicitly opted into Claude/Codex.
export function buildDrainVoiceBound() {
  if (DRAIN_INCLUDE_CLAUDE) return {}; // engine defaults: Claude + Codex + Ollama (richer, costs API)
  return {
    includeClaude: false,
    // includeCodex:false CLEANLY drops the codex voice. Without it the engine
    // called codex UNCONDITIONALLY, so this "local-only" drain still spawned the
    // codex CLI on every drained entry across the fleet -- real ChatGPT spend on
    // any host with codex installed (the exact rate-limit amplifier this drain
    // claims to eliminate), or a phantom failed:spawn-enoent voice where it isn't.
    includeCodex: false,
    includeGrok: false,
    includeGemini: false,
    diverseLocalPanel: true,
    diverseLocalModels: DRAIN_LOCAL_PANEL,
  };
}

const args = process.argv.slice(2);
const maxArg = args.find((a) => a.startsWith("--max="));
// Validate --max: a non-numeric / <1 value would otherwise make the drain loop
// condition (drained < maxPerDrain) false from the start → silently drains zero
// items with no error. Fall back to the default (or 1 for --once) on bad input.
const maxParsed = maxArg ? Number(maxArg.split("=")[1]) : NaN;
const maxPerDrain = (Number.isFinite(maxParsed) && maxParsed >= 1)
  ? Math.floor(maxParsed)
  : (args.includes("--once") ? 1 : DEFAULT_MAX_PER_DRAIN);
const verbose = args.includes("--verbose");

function log(msg) {
  if (verbose) process.stderr.write(`[consensus-drain] ${msg}\n`);
}

function readQueue() {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  const raw = fs.readFileSync(QUEUE_PATH, "utf-8");
  return raw.split("\n")
    .filter((l) => l.length > 0)
    .map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter((e) => e !== null);
}

function writeQueue(entries) {
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  const text = entries.length === 0 ? "" : entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  fs.writeFileSync(QUEUE_PATH, text, "utf-8");
}

function appendProcessed(entry, result, errorMsg) {
  fs.mkdirSync(path.dirname(PROCESSED_PATH), { recursive: true });
  const audit = {
    ...entry,
    drained_at: new Date().toISOString(),
    drain_ok: result !== null,
    drain_error: errorMsg ?? null,
    consensus_recommendation: result?.recommendation ?? null,
    consensus_agreement: result?.agreementScore ?? null,
    consensus_voters: result?.consensus?.voters ?? null,
  };
  fs.appendFileSync(PROCESSED_PATH, JSON.stringify(audit) + "\n", "utf-8");
}

async function loadConsensusEngine() {
  // Try iooms0 dist first, then main, then bare H: dist.
  const candidates = [
    "H:/prism-iooms0/mcp-server/dist/engines/MultiModelConsensusEngine.js",
    "H:/prism/mcp-server/dist/engines/MultiModelConsensusEngine.js",
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const mod = await import(pathToFileURL(candidate).href);
        if (mod && (mod.multiModelConsensusEngine || mod.MultiModelConsensusEngine)) {
          log(`loaded engine from ${candidate}`);
          return mod.multiModelConsensusEngine ?? new mod.MultiModelConsensusEngine();
        }
      } catch (e) {
        log(`load failed ${candidate}: ${e?.message}`);
      }
    }
  }
  return null;
}

async function processEntry(engine, entry) {
  log(`processing ${entry.prompt_hash?.slice(0, 8) ?? "?"} (${entry.task_type})`);
  try {
    const result = await engine.ask({
      prompt: entry.prompt,
      taskType: entry.task_type ?? "auto",
      sourceSession: entry.session_id,
      timeoutMs: 90_000,
      persist: true,
      ...buildDrainVoiceBound(), // local-only by default (no Claude/Codex API spend) -- rate-limit-fix
    });
    return { result, errorMsg: null };
  } catch (e) {
    return { result: null, errorMsg: e?.message ?? String(e) };
  }
}

async function main() {
  const queue = readQueue();
  if (queue.length === 0) {
    log("queue empty");
    process.stdout.write(JSON.stringify({ drained: 0, remaining: 0 }) + "\n");
    return;
  }

  log(`queue has ${queue.length} entries; will process up to ${maxPerDrain}`);

  const engine = await loadConsensusEngine();
  if (engine === null) {
    process.stdout.write(JSON.stringify({
      drained: 0,
      remaining: queue.length,
      error: "MCP server not built — run 'npm run build:fast' in mcp-server first",
    }) + "\n");
    process.exit(0);
  }

  let drained = 0;
  const remaining = [...queue];
  while (drained < maxPerDrain && remaining.length > 0) {
    const entry = remaining.shift();
    const { result, errorMsg } = await processEntry(engine, entry);
    appendProcessed(entry, result, errorMsg);
    drained++;
  }

  writeQueue(remaining);
  process.stdout.write(JSON.stringify({ drained, remaining: remaining.length }) + "\n");
}

// Only drain when invoked directly (node consensus-queue-drain.mjs) -- NOT on
// import. Without this guard, importing buildDrainVoiceBound for a test (or any
// consumer) triggered a real drain as a side effect. Mirrors the isDirect guard
// in octopus-first-live-record.mjs.
const isDirect = (process.argv[1] || "").replace(/\\/g, "/").endsWith("consensus-queue-drain.mjs");
if (isDirect) {
  main().catch((e) => {
    process.stderr.write(`drain failed: ${e?.message ?? String(e)}\n`);
    process.exit(0); // never break Stop hook
  });
}
