#!/usr/bin/env node
/**
 * hallucinated-node-id-guard.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC08 (slot:sierra)
 *
 * PreToolUse guard: catch FICTIONAL graph node-ids an agent emits when its context
 * is incomplete, before they drive an action. Detects canonical-prefix node-id
 * tokens (eng./disp./core./ghost./formula./skill./wiki./memory_) in a Bash command
 * and, in block mode, verifies each against the authoritative find-cache id-set
 * (never the 644MB graph) -- denying unknown ids.
 *
 * SAFETY + SCOPE (R12-documented divergences from the spec's literal default):
 *   - Scoped to BASH COMMANDS only, NOT Edit/Write CONTENT: docs/wiki/code legitimately
 *     mention ids (this very milestone's files are full of `eng.mill` etc.), so scanning
 *     written content would be a constant false-positive storm.
 *   - DEFAULT = advisory (warn, exit 0, ZERO index load -- regex only). A hard-block on
 *     a node-id-membership check would deny creating any NEW id (not in the graph yet),
 *     so hard-block is opt-in via PRISM_NODEID_GUARD_BLOCK=1. verifies_via runs in block mode.
 *   - Block-mode validation FAILS OPEN: if the find-cache id-set is missing/unreadable/empty,
 *     it does NOT block (a stale/absent index must never deny a legitimate id). It only denies
 *     an id CONFIRMED absent from a loaded id-set. The deny emits BOTH a stdout decision:block
 *     JSON AND exit 2 + stderr (works for the direct exit-2 contract and any JSON-parsing runner).
 *
 * Knobs: PRISM_NODEID_GUARD_DISABLE=1 (off) · PRISM_NODEID_GUARD_BLOCK=1 (hard-deny) ·
 *        PRISM_NODEID_GUARD_K (max ids scanned, default 20) · PRISM_VIZ_FINDCACHE_PATH (override).
 */
import { readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

const DISABLE = process.env.PRISM_NODEID_GUARD_DISABLE === "1";
const BLOCK = process.env.PRISM_NODEID_GUARD_BLOCK === "1";
const MAX = Math.max(1, parseInt(process.env.PRISM_NODEID_GUARD_K || "20", 10) || 20);
// Canonical prefixes only (same whitelist as the GAC05 canonicalize hook + node-card-prefetch);
// EXCLUDES fs/test/git/script noise so prose/paths do not false-positive.
const ID_RE = /\b(?:eng|disp|core|ghost|formula|skill|wiki|memory_[a-z0-9]+)\.[A-Za-z0-9_.:-]+/g;
const FINDCACHE_REL = "state/shared/system-viz/find-cache.json";

function emitOk(o) { process.stdout.write(JSON.stringify(o || {})); process.exit(0); }

function scanIds(text) {
  ID_RE.lastIndex = 0; // /g is stateful -- reset so a repeat call never skips leading matches
  const ids = [];
  const seen = new Set();
  let m;
  while ((m = ID_RE.exec(text)) !== null) {
    const id = m[0];
    if (!seen.has(id)) { seen.add(id); ids.push(id); if (ids.length >= MAX) break; }
  }
  return ids;
}

function resolveFindCache() {
  if (process.env.PRISM_VIZ_FINDCACHE_PATH) return process.env.PRISM_VIZ_FINDCACHE_PATH;
  let d = process.cwd();
  for (let i = 0; i < 8; i++) {
    const cand = join(d, FINDCACHE_REL);
    try { statSync(cand); return cand; } catch { /* keep walking */ }
    const p = dirname(d);
    if (p === d) break;
    d = p;
  }
  return join(process.cwd(), FINDCACHE_REL);
}

/** Build the canonical id-set from find-cache; returns null on any failure (-> fail-open). */
function loadIdSet(file) {
  try {
    const j = JSON.parse(readFileSync(file, "utf8"));
    const nodes = Array.isArray(j) ? j : Array.isArray(j.nodes) ? j.nodes : [];
    if (nodes.length === 0) return null;
    return new Set(nodes.map((n) => n && n.id).filter(Boolean));
  } catch {
    return null;
  }
}

let raw = "";
try { raw = readFileSync(0, "utf8"); } catch { raw = ""; }
let input = {};
try { input = JSON.parse(raw || "{}"); } catch { input = {}; }
const toolName = input.tool_name || "";

if (DISABLE || toolName !== "Bash") emitOk({});

const cmd = String(input?.tool_input?.command || "");
if (!cmd) emitOk({});

const ids = scanIds(cmd);
if (ids.length === 0) emitOk({});

// ADVISORY (default): regex-only, zero index load.
if (!BLOCK) {
  const ctx =
    "Node-id(s) referenced in this command: " + ids.map((i) => "`" + i + "`").join(", ") +
    ". If any was guessed, verify it is canonical via prism_session:node_card before relying on it " +
    "(set PRISM_NODEID_GUARD_BLOCK=1 to hard-deny unknown ids).";
  emitOk({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: ctx } });
}

// BLOCK mode: verify against the find-cache id-set. FAIL OPEN on any inability to verify.
const set = loadIdSet(resolveFindCache());
if (!set) {
  emitOk({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: `node-id guard: id-set unavailable; ${ids.length} id(s) unchecked (fail-open)` } });
}
const unknown = ids.filter((id) => !set.has(id));
if (unknown.length === 0) emitOk({});
const reason = `unknown node-id: ${unknown.join(", ")} (not in the system graph)`;
// emit BOTH a stdout decision:block JSON (advanced contract / any JSON-parsing runner) AND exit 2
// + stderr (the direct PreToolUse exit-2 block contract used across PRISM sibling guards).
process.stdout.write(JSON.stringify({ decision: "block", reason, hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } }));
process.stderr.write(reason + "\n");
process.exit(2);
