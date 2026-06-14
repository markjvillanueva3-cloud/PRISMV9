#!/usr/bin/env node
// tier: T3
/**
 * stop-wiki-from-nodes-autopopulate.mjs — Stop hook (T3, non-blocking)
 *
 * Closes the operator ask "auto populating anytime either domain gains
 * another node". Behavior on Stop:
 *
 *   1. Check the system-viz graph mtime — if it's newer than our last
 *      successful run (cache sidecar), the graph has gained/lost nodes.
 *   2. Throttle: do not fire more often than DEFAULT_THROTTLE_MS (6h).
 *      Wiki regen takes ~8min on a 95MB graph; the orchestrator has its
 *      own fingerprint short-circuit so the floor is just an extra safety
 *      net for the busy hours.
 *   3. Detached background spawn:
 *        - scripts/emit-node-memory-pointers.mjs --since-cache --quiet
 *        - scripts/regen-wiki-from-viz.mjs --quiet   (only if --enable-wiki)
 *      The memory-pointer pass is the cheap one (~1s for incremental);
 *      full wiki regen is gated separately because of its weight.
 *
 * Pairs with stop-obsidian-memory-feed.mjs — that hook propagates auto
 * memory files into the Obsidian vault; this hook makes sure every graph
 * node has a corresponding pointer in that vault to start with.
 *
 * Knobs:
 *   PRISM_WIKI_FROM_NODES_AUTOPOPULATE_DISABLE=1
 *   PRISM_WIKI_FROM_NODES_AUTOPOPULATE_THROTTLE_MS=N   (default 6h)
 *   PRISM_WIKI_FROM_NODES_AUTOPOPULATE_FULL=1          (also fire heavy wiki regen)
 *   PRISM_WIKI_FROM_NODES_AUTOPOPULATE_VERBOSE=1
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { spawn } from "node:child_process";

const PRISM_ROOT = "H:/prism";
const GRAPH_PATH = resolve(PRISM_ROOT, "state/shared/system-viz/system-graph.json");
const POINTER_CACHE = resolve(PRISM_ROOT, "state/shared/system-viz/.node-memory-pointers-cache.json");
const STATE_PATH = resolve(PRISM_ROOT, ".claude/cache/wiki-from-nodes-autopopulate.json");

const DEFAULT_THROTTLE_MS = 6 * 60 * 60 * 1000;
const SILENCE = { continue: true, suppressOutput: true };

function emit(o) { process.stdout.write(JSON.stringify(o)); }

function readJsonSafe(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

function writeJsonSafe(p, payload) {
  try {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(payload, null, 2), "utf8");
  } catch {}
}

function main() {
  try {
    if (process.env.PRISM_WIKI_FROM_NODES_AUTOPOPULATE_DISABLE === "1") return emit(SILENCE);

    // 1. Read stdin (Stop hooks receive an empty/JSON payload, ignore content)
    try { if (!process.stdin.isTTY) readFileSync(0, "utf-8"); } catch {}

    if (!existsSync(GRAPH_PATH)) return emit(SILENCE);

    let graphMtime;
    try { graphMtime = statSync(GRAPH_PATH).mtimeMs; } catch { return emit(SILENCE); }

    const throttleMs = Number(process.env.PRISM_WIKI_FROM_NODES_AUTOPOPULATE_THROTTLE_MS || DEFAULT_THROTTLE_MS);
    const verbose = process.env.PRISM_WIKI_FROM_NODES_AUTOPOPULATE_VERBOSE === "1";

    // 2. Decision: graph newer than last successful pointer run AND outside throttle
    const cache = readJsonSafe(POINTER_CACHE);
    const state = readJsonSafe(STATE_PATH) || {};
    const lastPointerRunMs = (cache && Number(cache.lastRunMs)) || 0;
    const lastHookFireMs = Number(state.lastFireMs || 0);

    if (graphMtime <= lastPointerRunMs) return emit(SILENCE);
    if (Date.now() - lastHookFireMs < throttleMs) return emit(SILENCE);

    // 3. Detached spawn — cheap memory-pointer pass, conditionally heavy wiki regen
    const runFull = process.env.PRISM_WIKI_FROM_NODES_AUTOPOPULATE_FULL === "1";
    const node = process.execPath;

    spawn(node, [resolve(PRISM_ROOT, "scripts/emit-node-memory-pointers.mjs"), "--since-cache", "--quiet"], {
      cwd: PRISM_ROOT, detached: true, stdio: "ignore",
    }).unref();

    // NCI-STOPHOOK-EXTEND (whiskey, 2026-05-22): keep the node-capability
    // index in lock-step with the pointer set. ~1s incremental, atomic
    // write tolerates concurrent fleet fires.
    spawn(node, [resolve(PRISM_ROOT, "scripts/build-node-capability-index.mjs"), "--quiet"], {
      cwd: PRISM_ROOT, detached: true, stdio: "ignore",
    }).unref();

    if (runFull) {
      spawn(node, ["--max-old-space-size=8192", resolve(PRISM_ROOT, "scripts/regen-wiki-from-viz.mjs"), "--quiet"], {
        cwd: PRISM_ROOT, detached: true, stdio: "ignore",
      }).unref();
    }

    writeJsonSafe(STATE_PATH, { lastFireMs: Date.now(), graphMtime, runFull, throttleMs });

    if (verbose) {
      emit({ continue: true, suppressOutput: false, systemMessage: `[wiki-from-nodes-autopopulate] fired (graph_mtime=${new Date(graphMtime).toISOString()}, full=${runFull})` });
    } else {
      emit(SILENCE);
    }
  } catch {
    emit(SILENCE);
  }
}

main();
