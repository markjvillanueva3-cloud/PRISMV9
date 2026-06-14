#!/usr/bin/env node
// tier: T3 (advisory, fires-last)
/**
 * psn-prompt-checklist-inject.mjs — UserPromptSubmit injector
 *
 * The fleet's UserPromptSubmit chain emits a rich context bundle on every
 * prompt: master-index hits, wiki precheck, memory pre-search, tribal
 * context, slot-soul, Obsidian vault precheck, chat-bus, route-suggest, etc.
 * The model nonetheless often skims past it and re-derives what the substrate
 * already knows. This hook is the forcing-function — emits a compact
 * acknowledge-the-substrate checklist at the END of the bundle so the model
 * has to face it before generating.
 *
 * U-PSN-PROMPT-CHECKLIST-INJECT (2026-05-24, slot golf). Built per operator
 * directive "build everything we need so we get the best possible output
 * every turn". Highest-ROI single fix: forces utilization of the PSN context
 * that's already being injected at zero additional substrate cost.
 *
 * Knobs:
 *   PRISM_PSN_CHECKLIST_INJECT_DISABLE=1   kill switch (default ON)
 *   PRISM_PSN_CHECKLIST_MIN_PROMPT_LEN=N   skip prompts shorter than N chars (default 15)
 *
 * Heuristic gate: skips on
 *   - very short prompts (acknowledgements like "ok"/"thanks")
 *   - bare slash-command invocations (already routed)
 *   - knob disabled
 *
 * Pure logic surfaced for tests:
 *   - shouldInject(prompt, opts) — gating predicate (no I/O)
 *   - buildChecklist(prompt, opts) — render the checklist (pure string)
 */

import { pathToFileURL } from "node:url";
import { readSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneExpired } from "../../scripts/lib/injection-dedup.mjs";

const ENABLED = process.env.PRISM_PSN_CHECKLIST_INJECT_DISABLE !== "1";
const MIN_PROMPT_LEN = clampInt(process.env.PRISM_PSN_CHECKLIST_MIN_PROMPT_LEN, 15, 1, 1000);

// U-PSN-CHECKLIST-DEDUP (2026-05-25, slot:alpha) — closes the last Category-A
// static-content TTL bump from U-HOOK-INJECT-ROI. The checklist body is
// identical every prompt (10 lines, ~278 tokens, no prompt-specific content).
// Without dedup it fired 37× per session = ~10K tokens / 4.2% injection share.
// Session-keyed dedup with 24h TTL ≈ once per session.
const DEDUP_SIDECAR = "H:/prism/state/shared/dashboards/injection-dedup-cache.json";
const DEDUP_TTL_MS = 24 * 60 * 60_000;
function readJsonSafe(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return {}; } }

function clampInt(raw, def, lo, hi) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < lo || n > hi) return def;
  return n;
}

/**
 * Decide whether to inject. Skip:
 *  - knob-disabled / empty / non-string
 *  - prompts shorter than minLen (likely acknowledgements)
 *  - bare slash-command lines (no extra args — already routed)
 *
 * Pure — no I/O. Tested in isolation.
 */
export function shouldInject(prompt, opts = {}) {
  const enabled = opts.enabled !== undefined ? opts.enabled : ENABLED;
  if (!enabled) return false;
  if (typeof prompt !== "string") return false;
  const trimmed = prompt.trim();
  if (trimmed.length === 0) return false;
  const minLen = Number.isInteger(opts.minLen) && opts.minLen > 0 ? opts.minLen : MIN_PROMPT_LEN;
  if (trimmed.length < minLen) return false;
  // Bare slash-command (no extra args after the command token). A `/foo` is
  // already routed; a `/foo bar baz` carries a work order and benefits from
  // the checklist.
  if (/^\/\S+\s*$/.test(trimmed)) return false;
  return true;
}

/**
 * Render the checklist. Pure — depends only on `prompt` (and a 2-line preface
 * mentioning that the substrate context already fired). Tests pin the
 * structure so future edits don't silently break the markers consumers grep.
 */
export function buildChecklist(prompt, opts = {}) {
  // U-PSN-CHECKLIST-DEDUP (2026-05-25 alpha): dropped per-prompt `length` line
  // so the rendered checklist is byte-identical every fire. Lets the session-
  // keyed dedup actually catch repeated emits. Header marker
  // `## 🎯 PSN-CHECKLIST` is the stable anchor consumers grep.
  const lines = [
    "## 🎯 PSN-CHECKLIST — consult substrate BEFORE generating",
    `_The UserPromptSubmit chain already emitted master-index, wiki, memory, tribal, slot-soul, chat-bus blocks above. Before writing your answer:_`,
    "",
    "- [ ] **Master-index pre-search hits** → consider USING the named node before re-deriving with Grep/Glob/Agent",
    "- [ ] **Wiki precheck entry exists** → READ it (don't re-derive what's documented)",
    "- [ ] **Memory-vault hit relevant** → apply the doctrine the memo names, don't ignore",
    "- [ ] **Could a `prism_*` MCP dispatcher answer this?** → ROUTE > reinvent (`prism_session:dispatcher_map_compact` for the map)",
    "- [ ] **If creating an asset** → `duplicationGuardEngine.mustCheckBeforeCreating()` BEFORE writing",
    "- [ ] **If touching a PSN leg** (Obsidian brain · PRISM OS · Wiki · Memories · Tribal · System Viz · Engines · Algorithms · Formulas · NN/GNN · PRISM AI) → query the leg's surface first (see `/system-viz` skill §PSN-11-legs)",
    "",
    "_Auto-injected by `psn-prompt-checklist-inject.mjs` (U-PSN-PROMPT-CHECKLIST-INJECT, golf 2026-05-24). Disable: `PRISM_PSN_CHECKLIST_INJECT_DISABLE=1`._",
  ];
  return lines.join("\n");
}

/* ---------- read stdin synchronously (ESM-safe — uses `readSync` import) ---------- */
function readStdinSync() {
  let data = "";
  try {
    const buf = Buffer.alloc(65536);
    let n;
    while ((n = readSync(0, buf, 0, buf.length)) > 0) {
      data += buf.slice(0, n).toString("utf8");
    }
  } catch { /* no stdin / EOF / closed fd */ }
  return data;
}

function emit(additionalContext) {
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext },
  }) + "\n");
}

function main() {
  if (!ENABLED) process.exit(0);
  let payload;
  try { payload = JSON.parse(readStdinSync() || "{}"); }
  catch { process.exit(0); }
  const prompt = String(payload.prompt ?? "");
  if (!shouldInject(prompt)) process.exit(0);

  // U-PSN-CHECKLIST-DEDUP — session-keyed dedup. Slot/session pins the cache
  // tag; content-hash + 24h TTL pins per-session uniqueness.
  const sid = String(payload.session_id || payload.sessionId || "").slice(0, 8);
  const fullBlock = buildChecklist(prompt);
  const dedupDisabled = process.env.PRISM_INJECTION_DEDUP_DISABLE === "1";
  let additionalContext = fullBlock;
  if (!dedupDisabled && sid) {
    const hookTag = `psn-prompt-checklist-inject:${sid}`;
    const contentHash = hashBlock(fullBlock);
    let cache = readJsonSafe(DEDUP_SIDECAR);
    const now = Date.now();
    cache = pruneExpired(cache, now, DEDUP_TTL_MS);
    const decision = shouldEmit(cache, hookTag, contentHash, now, DEDUP_TTL_MS);
    if (!decision.emit) {
      additionalContext = formatDedupedMarker(hookTag);
    } else if (contentHash) {
      try {
        const newCache = recordEmit(cache, hookTag, contentHash, now);
        mkdirSync(dirname(DEDUP_SIDECAR), { recursive: true });
        writeFileSync(DEDUP_SIDECAR, JSON.stringify(newCache), "utf8");
      } catch { /* sidecar write fail-soft */ }
    }
  }
  emit(additionalContext);
  process.exit(0);
}

const isDirectRun = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  try { main(); }
  catch (err) {
    // Hooks must never block the prompt — log to stderr (harness ignores it for
    // additionalContext) and exit 0.
    process.stderr.write(`[psn-prompt-checklist-inject] ${err?.message || err}\n`);
    process.exit(0);
  }
}
