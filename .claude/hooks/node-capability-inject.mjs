#!/usr/bin/env node
// tier: T2
/**
 * node-capability-inject.mjs — NODE-CAPABILITY-INJECT-MS0 / U-NCI-HOOK
 *
 * UserPromptSubmit hook. Loads the pre-built node-capability index
 * (built by scripts/build-node-capability-index.mjs) and injects a
 * deterministic 100%-coverage block of node wiki+pointer entries for
 * EVERY explicitly-named graph node in the prompt.
 *
 * Complements (does not replace) the BM25-top-K injectors:
 *   - master-index-precheck-inject (top-5 by score)
 *   - wiki-precheck-inject         (top-3 by score)
 *   - memory-relevance-inject      (top-K by score)
 * Where those rank, this one ROUTES: explicit mention → direct pointer.
 *
 * Disable: PRISM_NODE_CAPABILITY_INJECT=0
 * Budget : PRISM_NODE_CAPABILITY_BUDGET=N (default 12, hard cap 50)
 * Verbose: PRISM_NODE_CAPABILITY_VERBOSE=1 (log skip reasons via systemMessage)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractNodeMentions,
  resolveMentions,
  planInjection,
  renderInjection,
  DEFAULT_BUDGET
} from "../../scripts/lib/node-capability-injector.mjs";

const HOOK_DIR = path.dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = path.resolve(HOOK_DIR, "../..");
const INDEX_PATH = path.join(PRISM_ROOT, "state/shared/system-viz/node-capability-index.json");
const INDEX_FRESH_MS = 24 * 60 * 60 * 1000;

let CACHED_INDEX = null;
let CACHED_MTIME = 0;

function emitSilence() {
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");
  process.exit(0);
}
function emitContext(text, systemMessage) {
  const out = { continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: text } };
  if (systemMessage) out.systemMessage = systemMessage;
  process.stdout.write(JSON.stringify(out) + "\n");
  process.exit(0);
}

function readStdinSync() {
  try { return fs.readFileSync(0, "utf8"); } catch { return ""; }
}

function loadIndex() {
  let stat;
  try { stat = fs.statSync(INDEX_PATH); } catch { return null; }
  if (CACHED_INDEX && stat.mtimeMs === CACHED_MTIME) return CACHED_INDEX;
  let raw;
  try { raw = fs.readFileSync(INDEX_PATH, "utf8"); } catch { return null; }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.pointers || !parsed.displayNameToId) return null;
    CACHED_INDEX = parsed;
    CACHED_MTIME = stat.mtimeMs;
    return parsed;
  } catch { return null; }
}

function isStale(idx) {
  if (!idx || !idx.builtAt) return true;
  return (Date.now() - idx.builtAt) > INDEX_FRESH_MS;
}

function clampBudget(envVal) {
  const n = parseInt(envVal, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BUDGET;
  return n;
}

function main() {
  if (process.env.PRISM_NODE_CAPABILITY_INJECT === "0") emitSilence();

  const stdin = readStdinSync();
  if (!stdin) emitSilence();
  let payload;
  try { payload = JSON.parse(stdin); } catch { emitSilence(); }
  const prompt = payload && typeof payload.prompt === "string" ? payload.prompt : "";
  if (!prompt) emitSilence();

  const mentions = extractNodeMentions(prompt);
  if (mentions.length === 0) emitSilence();

  const idx = loadIndex();
  if (!idx) {
    if (process.env.PRISM_NODE_CAPABILITY_VERBOSE === "1") {
      emitContext("", "node-capability-inject: no index at " + path.relative(PRISM_ROOT, INDEX_PATH));
    }
    emitSilence();
  }

  const { resolved } = resolveMentions(mentions, idx);
  if (resolved.length === 0) {
    if (process.env.PRISM_NODE_CAPABILITY_VERBOSE === "1") {
      emitContext("", "node-capability-inject: " + mentions.length + " mention(s), 0 resolved");
    }
    emitSilence();
  }

  const budget = clampBudget(process.env.PRISM_NODE_CAPABILITY_BUDGET);
  const plan = planInjection({ resolved, budget });
  const block = renderInjection(plan);
  if (!block) emitSilence();

  let staleNote = "";
  if (isStale(idx)) {
    const ageHrs = Math.floor((Date.now() - idx.builtAt) / (60 * 60 * 1000));
    staleNote = "node-capability-inject: index is " + ageHrs + "h old — Stop hook should rebuild on next graph delta";
  }
  emitContext(block, staleNote || undefined);
}

main();
