#!/usr/bin/env node
// tier: T2
/**
 * node-card-prefetch-inject.mjs — UserPromptSubmit injector
 * (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-PREFETCH-HOOK, slot:sierra)
 *
 * When a prompt NAMES a system-viz node id (e.g. `eng.mill`, `ghost.galaxy.wedm`,
 * `formula.kienzle`), this hook SEEKS that node's compact card from the offset
 * index and injects it as additionalContext — so the model gets the node's
 * facts + its documenting wiki/memory pointers with ZERO tool call (no
 * `node-card` CLI, no graph Read). This is the payoff of U-NODECARD-OFFSET-INDEX:
 * the seek is cheap enough (parse a 24MB offsets table once, then fs.read exact
 * bytes) to run inside a per-prompt hook budget.
 *
 * CHEAP-WHEN-IRRELEVANT: the common case (no node id in the prompt) costs only a
 * regex over the prompt string (~0ms) — the offset index is touched ONLY when a
 * whitelisted-prefix candidate is present. seekCard NEVER falls back to the
 * 193MB sidecar parse (hook-safe by construction), and a non-node dotted token
 * (`fs.readFileSync`, `schema.org`) resolves to null → not injected. The trigger
 * prefix whitelist deliberately EXCLUDES noisy code/prose namespaces (`fs`,
 * `test`, `git`, `core`, `script`) so they never even trigger a seek.
 *
 * Fail-soft: any error / disabled / no-hit → exit 0 with no output (never blocks
 * a prompt). Disable: PRISM_NODECARD_PREFETCH_DISABLE=1. Tune K:
 * PRISM_NODECARD_PREFETCH_K=<n> (default 3).
 */

import { readFileSync } from "node:fs";
import { seekCard } from "../../scripts/lib/node-card-read.mjs";

const ENABLED = process.env.PRISM_NODECARD_PREFETCH_DISABLE !== "1";

function clampInt(raw, fallback, min, max) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}
const MAX_CARDS = clampInt(process.env.PRISM_NODECARD_PREFETCH_K, 3, 1, 8);

// Trigger prefixes: distinctive, agent-referenced node namespaces that are
// UNLIKELY to appear as false-positive dotted tokens in normal code/prose.
// Derived from the live offset-index prefix tally (56 namespaces); the noisy
// ones (fs/test/git/core/script/fe/vault/datacat/extract/…) are intentionally
// excluded so a `fs.readFileSync` mention never triggers a seek. Extend
// deliberately — every prefix here is one more class of dotted token that pays
// a one-time 24MB offsets parse when present. The offset index still VERIFIES
// each candidate, so a non-node match is harmless beyond that parse.
export const TRIGGER_PREFIXES = Object.freeze([
  "eng", "disp", "ghost", "formula", "wiki", "skill",
  "memory_reference", "memory_patterns", "tribal-tip", "ms-envelope",
]);

// Cap candidates SCANNED per prompt (bounds a pathological prompt full of
// dotted tokens); MAX_CARDS bounds how many actually inject.
const MAX_SCAN = 24;

const ID_RE = new RegExp(
  `(?:^|[^A-Za-z0-9_-])(?:${TRIGGER_PREFIXES.join("|")})\\.[A-Za-z0-9][A-Za-z0-9._-]*`,
  "g",
);

/**
 * Extract candidate node ids from a prompt. Matches a whitelisted prefix + dot +
 * id body (internal dots allowed for `ghost.galaxy.x` / `wiki.a.b`), strips a
 * leading boundary char and trailing punctuation (`eng.mill.` at a sentence end
 * → `eng.mill`), dedups (first-seen order), caps at MAX_SCAN. Pure.
 */
export function detectNodeIds(prompt) {
  if (typeof prompt !== "string" || !prompt) return [];
  const out = [];
  const seen = new Set();
  for (const m of prompt.matchAll(ID_RE)) {
    // m[0] may carry a leading boundary char (we used a non-capturing prefix
    // class, not \b, so memory_reference etc. with leading _ still anchor) —
    // recover the id by re-matching a prefix at the START of the trimmed token.
    let tok = m[0].replace(/^[^A-Za-z0-9_]+/, "");      // drop leading boundary
    tok = tok.replace(/[._\-,;:)\]}>"'.]+$/, "");        // drop trailing punctuation
    if (!tok || seen.has(tok)) continue;
    seen.add(tok);
    out.push(tok);
    if (out.length >= MAX_SCAN) break;
  }
  return out;
}

function truncate(s, n) {
  const str = String(s ?? "").replace(/\s+/g, " ").trim();
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

/** Render one card as a compact markdown line + its top doc pointers. */
export function renderCard(c) {
  const tags = [c.kind, c.layer, c.status].filter((x) => typeof x === "string" && x).join(" · ");
  const head = `- **${c.id}**${tags ? ` [${tags}]` : ""}${c.info ? ` — ${truncate(c.info, 96)}` : ""}`;
  const lines = [head];
  const strs = (a) => (Array.isArray(a) ? a.filter((x) => typeof x === "string") : []);
  const wiki = strs(c.wikiEntries).slice(0, 2);
  const mem = strs(c.memoryEntries).slice(0, 2);
  const docBits = [];
  if (wiki.length) {
    const moreW = c.docTotals?.wiki && c.docTotals.wiki > wiki.length ? ` (+${c.docTotals.wiki - wiki.length})` : "";
    docBits.push(`wiki: ${wiki.join(" · ")}${moreW}`);
  }
  if (mem.length) {
    const moreM = c.docTotals?.memory && c.docTotals.memory > mem.length ? ` (+${c.docTotals.memory - mem.length})` : "";
    docBits.push(`mem: ${mem.join(" · ")}${moreM}`);
  }
  if (docBits.length) lines.push(`  docs to read: ${docBits.join("  ·  ")}`);
  return lines.join("\n");
}

/**
 * Build the additionalContext string for a prompt, or null when nothing should
 * be injected (no candidate / no real-node hit). `opts.paths` is threaded to
 * seekCard (tests inject a fixture offset index); `opts.k` overrides MAX_CARDS.
 */
export function buildPrefetchContext(prompt, opts = {}) {
  const ids = detectNodeIds(prompt);
  if (!ids.length) return null;
  const k = clampInt(opts.k, MAX_CARDS, 1, 8);
  const cards = [];
  for (const id of ids) {
    if (cards.length >= k) break;
    const r = seekCard(id, { paths: opts.paths });
    if (r && r.card) cards.push(r.card);
  }
  if (!cards.length) return null;
  const header =
    "## 🃏 Node card(s) — prefetched (zero tool call)\n" +
    "_Seeked from the system-viz offset index for node id(s) named in your prompt — no graph/tool call. " +
    "Use these instead of `node-card`/Read. Disable: PRISM_NODECARD_PREFETCH_DISABLE=1._\n";
  return header + cards.map(renderCard).join("\n");
}

function emit(additionalContext) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext },
  }));
}

function readStdinSync() {
  try { return readFileSync(0, "utf8"); }
  catch { return ""; }
}

function main() {
  if (!ENABLED) { process.exit(0); }
  let payload;
  try { payload = JSON.parse(readStdinSync() || "{}"); }
  catch { process.exit(0); }
  const prompt = String(payload.prompt ?? "");
  if (!prompt || prompt.length < 4) { process.exit(0); }
  let ctx = null;
  try { ctx = buildPrefetchContext(prompt); }
  catch { process.exit(0); } // fail-soft: never block a prompt
  if (ctx) emit(ctx);
  process.exit(0);
}

// Run as a script only when invoked directly (not on import for tests).
import { pathToFileURL } from "node:url";
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
