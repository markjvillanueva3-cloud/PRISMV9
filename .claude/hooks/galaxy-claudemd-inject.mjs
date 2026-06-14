#!/usr/bin/env node
// tier: T2
// PER-SLOT-CLAUDEMD-MS0 / U-PSCM-LOADER (slot:alpha 2026-06-13) -- galaxy-claudemd-inject.
//
// UserPromptSubmit hook. Resolves THIS chat's slot -> its galaxy (single-source
// scripts/lib/slot-galaxy-map.mjs) and injects that galaxy's
// mcp-server/src/engines/<galaxy>/CLAUDE.md as the slot's PRIMARY domain doctrine, so a
// slot operates from its OWN domain CLAUDE.md instead of re-deriving from the ~530-line
// root monolith. The root H:/prism/CLAUDE.md stays the UNIVERSAL rails (safety / R1-R15 /
// scrutiny); this loads the domain supplement "in place of" the monolith's per-domain prose.
//
// Operator directive 2026-06-13: "each chat slot ... their own claude md ... that they
// should be using in place of the primary ... custom tailored for their domain ... hard
// enforce the chat slots to use and edit their own claude.md files not the main one."
//
// Cloned from slot-soul-inject.mjs (the proven slot-resolved injection pattern): same
// chat-slots.json slot matcher, same injection-dedup (full doctrine emitted once per TTL
// or on content change; otherwise a 1-line marker -- the galaxy doctrine is stable across
// a /loop iter, so this is token-efficient), same surrogate-safe truncation.
//
// Fail-soft: NEVER throws, NEVER blocks (UserPromptSubmit must not break the prompt). On
// ANY uncertainty (no slot, unmapped slot, missing galaxy file) it injects NOTHING and the
// slot degrades to the universal root CLAUDE.md -- never to an empty/blocked prompt.
//
// Disable: PRISM_GALAXY_CLAUDEMD_INJECT_DISABLE=1.  Verbose: PRISM_GALAXY_CLAUDEMD_INJECT_VERBOSE=1.
// Wired: settings.json UserPromptSubmit chain, AFTER slot-bind-enforce + slot-soul-inject
// (so the slot binding is authoritative). Individual entry, NOT sessionstart-bundle, per
// the master-index wiring lesson (the bundle is high-contention peer-claimed real estate).

import fs from "node:fs";
import path from "node:path";
import { galaxyForSlot } from "../../scripts/lib/slot-galaxy-map.mjs";
import { hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneExpired } from "../../scripts/lib/injection-dedup.mjs";
import { stripLoneSurrogates, safeTruncate } from "../../scripts/lib/safe-truncate.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const ENGINES_DIR = path.join(PRISM_ROOT, "mcp-server/src/engines");
const SLOTS_FILE = path.join(PRISM_ROOT, "state/shared/chat-slots.json");
const DEDUP_SIDECAR = path.join(PRISM_ROOT, "state/shared/dashboards/injection-dedup-cache.json");
// 24KB cap -- covers the largest current galaxy CLAUDE.md (cad ~20.5KB) with headroom.
// Post Phase-C fine-tune to 80-160 lines, files shrink to ~8-12KB. safeTruncate fallback
// guarantees a lone surrogate is never left mid-pair (would 400 the Anthropic request).
const MAX_INJECT_BYTES = 24576;
// 30min TTL -- galaxy doctrine is very stable across a /loop; re-emit only on a content
// change (hash) or after 30min, so a 20KB block is not re-paid every prompt.
const DEDUP_TTL_MS = 30 * 60_000;

function emit(payload) { process.stdout.write(JSON.stringify(payload)); process.exit(0); }
function emitEmpty() { emit({ continue: true }); }
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function readText(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }

async function main() {
  if (process.env.PRISM_GALAXY_CLAUDEMD_INJECT_DISABLE === "1") return emitEmpty();

  // Read stdin (UserPromptSubmit envelope) -- must not block forever.
  let raw = "";
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    raw = Buffer.concat(chunks).toString("utf8");
  } catch { return emitEmpty(); }
  const env = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
  const sid = env.session_id || "";
  if (!sid) return emitEmpty();

  // Resolve slot via chat-slots.json (same authoritative matcher as slot-soul-inject).
  const slotsDoc = readJson(SLOTS_FILE) || { slots: {} };
  let mySlot = null;
  for (const [name, data] of Object.entries(slotsDoc.slots || {})) {
    if (data?.chatId && (data.chatId === sid || sid.includes(data.chatId.replace(/^claude-/, "")))) {
      mySlot = name;
      break;
    }
  }
  if (!mySlot) return emitEmpty();

  // Resolve galaxy (single source of truth). null = intentionally unmapped (november/
  // yankee) -> inject nothing; the slot stays on the universal root only.
  const galaxy = galaxyForSlot(mySlot);
  if (!galaxy) return emitEmpty();

  const claudeMdPath = path.join(ENGINES_DIR, galaxy, "CLAUDE.md");
  const body = readText(claudeMdPath);
  if (!body) return emitEmpty(); // galaxy file missing -> fail-open to universal-only

  let payload = body;
  if (payload.length > MAX_INJECT_BYTES) {
    payload = safeTruncate(
      payload,
      MAX_INJECT_BYTES,
      "\n...(galaxy doctrine truncated at " + MAX_INJECT_BYTES + " units; full file: " + claudeMdPath + ")",
    );
  }

  const verbose = process.env.PRISM_GALAXY_CLAUDEMD_INJECT_VERBOSE === "1";
  const header =
    `## 📜 YOUR GALAXY DOCTRINE -- slot ${mySlot} = ${galaxy} (PER-SLOT-CLAUDEMD-MS0)\n\n` +
    `> This is your PRIMARY domain CLAUDE.md (\`mcp-server/src/engines/${galaxy}/CLAUDE.md\`). Operate from it; ` +
    `the root \`H:/prism/CLAUDE.md\` is the UNIVERSAL rails only. To change ${galaxy} doctrine, edit THIS galaxy file -- ` +
    `never the root (root edits are golf-only).\n\n`;
  const footer = verbose ? `\n_(galaxy doctrine: ${claudeMdPath})_` : "";
  const fullBlock = header + payload + footer;

  // Injection-dedup (U-PSN-INJECTION-DEDUP-LIB) -- emit the full doctrine on first-emit or
  // after TTL/content-change; otherwise the 1-line marker. Shared sidecar, distinct hookTag.
  const dedupDisabled = process.env.PRISM_INJECTION_DEDUP_DISABLE === "1";
  const hookTag = `galaxy-claudemd-inject:${sid.slice(0, 8)}`;
  const contentHash = hashBlock(fullBlock);
  let cache = readJson(DEDUP_SIDECAR) || {};
  const now = Date.now();
  cache = pruneExpired(cache, now, DEDUP_TTL_MS);
  const decision = dedupDisabled
    ? { emit: true, reason: "dedup-disabled", lastSeenAt: null }
    : shouldEmit(cache, hookTag, contentHash, now, DEDUP_TTL_MS);

  // Strip any unpaired surrogate before it reaches the injected context (a lone surrogate
  // makes the Anthropic API reject the whole request body with 400 "no low surrogate").
  const additionalContext = stripLoneSurrogates(decision.emit ? fullBlock : formatDedupedMarker(hookTag));

  if (decision.emit && contentHash) {
    try {
      const newCache = recordEmit(cache, hookTag, contentHash, now);
      fs.mkdirSync(path.dirname(DEDUP_SIDECAR), { recursive: true });
      fs.writeFileSync(DEDUP_SIDECAR, JSON.stringify(newCache), "utf8");
    } catch { /* sidecar write fail-soft -- emit still proceeds */ }
  }

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  });
}

main().catch(() => emitEmpty());
