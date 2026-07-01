#!/usr/bin/env node
/**
 * node-capability-injector.mjs — NODE-CAPABILITY-INJECT-MS0 / U-NCI-CORE
 *
 * Pure library. The companion UserPromptSubmit hook
 * `.claude/hooks/node-capability-inject.mjs` wraps these functions.
 *
 * Closes the PSN coverage gap: master-index / wiki / memory injectors return
 * BM25 top-K. If a prompt explicitly names 10 graph nodes, K=5 cuts 5 of
 * them. This module routes EVERY explicitly-mentioned node directly to its
 * `node_<kind>_<slug>.md` pointer file (the 7351 pointers shipped by
 * 8c96ebb8b4 / U-NMP-CORE) with deterministic 100% coverage,
 * budget-capped to DEFAULT_BUDGET.
 *
 * Karpathy discipline:
 *   CLASSIFY: text → token → graph-node-id mapping (explicit-mention router)
 *   TECHNIQUE: 4 mention regexes + canonicalized lookup tables (O(1) per
 *              mention), budget cap, alphabetical tie-break for determinism
 *   EDGE CASES: empty/null text, duplicates, case variations, hostile
 *               1000-node prompt, missing pointer files, stale index
 *   FAILURE MODES: linear-time regexes only (no catastrophic backtracking),
 *                  malformed index returns empty plan (never throws)
 *
 * Pure-export contract (no top-level side effects):
 *   extractNodeMentions(text) → string[]
 *   resolveMentions(mentions, index) → { resolved, unresolved }
 *   planInjection({ resolved, budget }) → { items, truncated, budget }
 *   renderInjection(plan, opts?) → string
 */

// Hard cap so a hostile prompt naming many nodes still fits in budget.
export const DEFAULT_BUDGET = 12;
export const HARD_BUDGET_CAP = 50;
const MIN_BUDGET = 1;
const MIN_PATH_BASENAME_LEN = 3;
const MIN_CAMEL_CAPS_FOR_BARE = 3;

// Canonical suffix list (engine-class taxonomy). Used by both extractor
// and resolver — defined once for consistency.
const ENGINE_SUFFIXES = [
  "engine", "adapter", "service", "manager", "router", "bridge",
  "hook", "pipeline", "dispatcher", "registry", "detector", "optimizer",
  "predictor", "validator", "generator", "builder", "extractor",
  "calculator", "analyzer", "reasoning"
];

// Canonical kebab prefix list (graph node kinds).
const KEBAB_KINDS = [
  "alg", "formula", "hook", "action", "dispatcher", "milestone",
  "registry", "monolith", "skill", "course", "frontend", "layer",
  "domain", "test", "engine", "node"
];

/**
 * Extract explicit graph-node mentions from arbitrary text.
 * Returns lowercased tokens deduped, ordered by first-appearance.
 */
export function extractNodeMentions(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  const seen = new Set();
  const out = [];
  function push(tok) {
    const norm = tok.toLowerCase();
    if (!seen.has(norm)) { seen.add(norm); out.push(norm); }
  }

  // 1. CamelCase identifiers. Linear-time, no nested quantifiers.
  //    Suffix-anchored OR ≥3-capital prefix to filter generic English words.
  const suffixGroup = "(" + ENGINE_SUFFIXES.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("|") + ")?";
  const camelStr = "\\b([A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+){1,8})" + suffixGroup + "\\b";
  const camelRe = new RegExp(camelStr, "g");
  let m;
  while ((m = camelRe.exec(text)) !== null) {
    const full = m[0];
    const suffix = m[2];
    const capCount = (full.match(/[A-Z]/g) || []).length;
    if (suffix || capCount >= MIN_CAMEL_CAPS_FOR_BARE) push(full);
    if (camelRe.lastIndex === m.index) camelRe.lastIndex++;
  }

  // 2. Kebab/underscore-case kind-prefixed ids.
  const kebabKindGroup = "(?:" + KEBAB_KINDS.join("|") + ")";
  const kebabStr = "\\b" + kebabKindGroup + "[-_][a-z0-9][a-z0-9_-]{1,80}\\b";
  const kebabRe = new RegExp(kebabStr, "g");
  while ((m = kebabRe.exec(text)) !== null) push(m[0]);

  // 3. Dispatcher actions: prism_xxx:snake_case
  const dispRe = /\bprism_[a-z][a-z_0-9]{1,40}:[a-z][a-z_0-9]{1,80}\b/g;
  while ((m = dispRe.exec(text)) !== null) push(m[0]);

  // 4. Source paths under known dirs — extract basename (no extension).
  const pathRe = /\b(?:mcp-server\/src\/[a-z/]+|scripts\/(?:lib\/)?|\.claude\/hooks\/|knowledge\/wiki\/[a-z/]+)([A-Za-z0-9_.-]+)\.(?:ts|mjs|md|json)\b/g;
  while ((m = pathRe.exec(text)) !== null) {
    const base = m[1];
    if (base && base.length >= MIN_PATH_BASENAME_LEN) push(base);
  }

  return out;
}

/**
 * Resolve mentions to pointer entries using the prebuilt index.
 * Tries the raw mention first, then suffix-stripped, then kebab-prefix-stripped.
 */
export function resolveMentions(mentions, index) {
  if (!Array.isArray(mentions) || mentions.length === 0) return { resolved: [], unresolved: [] };
  if (!index || typeof index !== "object" || !index.displayNameToId || !index.pointers) {
    return { resolved: [], unresolved: Array.isArray(mentions) ? mentions.slice() : [] };
  }
  const dn2id = index.displayNameToId;
  const ptrs = index.pointers;
  const resolved = [];
  const unresolved = [];
  const seenNode = new Set();

  for (const raw of mentions) {
    const m = String(raw || "").toLowerCase();
    if (m.length === 0) continue;
    const candidates = [m];
    for (const s of ENGINE_SUFFIXES) {
      if (m.endsWith(s) && m.length > s.length + 2) candidates.push(m.slice(0, -s.length));
    }
    for (const p of KEBAB_KINDS) {
      const prefix1 = p + "-";
      const prefix2 = p + "_";
      if (m.startsWith(prefix1) && m.length > prefix1.length + 1) candidates.push(m.slice(prefix1.length));
      else if (m.startsWith(prefix2) && m.length > prefix2.length + 1) candidates.push(m.slice(prefix2.length));
    }
    if (m.includes(":")) {
      const parts = m.split(":");
      const action = parts[1];
      if (action) candidates.push(action);
    }

    let hitId = null;
    for (const c of candidates) {
      const id = dn2id[c];
      if (id && ptrs[id]) { hitId = id; break; }
    }
    if (hitId) {
      if (!seenNode.has(hitId)) {
        seenNode.add(hitId);
        resolved.push({ mention: raw, nodeId: hitId, ...ptrs[hitId] });
      }
    } else {
      unresolved.push(raw);
    }
  }
  return { resolved, unresolved };
}

/**
 * Budget-capped plan. Deterministic — mention order preserved.
 */
export function planInjection({ resolved, budget = DEFAULT_BUDGET } = {}) {
  if (!Array.isArray(resolved)) return { items: [], truncated: 0, budget };
  const cap = Math.min(Math.max(MIN_BUDGET, Number(budget) || DEFAULT_BUDGET), HARD_BUDGET_CAP);
  const items = resolved.slice(0, cap);
  return { items, truncated: Math.max(0, resolved.length - cap), budget: cap };
}

/**
 * Render the plan as a compact markdown block.
 */
export function renderInjection(plan, opts = {}) {
  if (!plan || !Array.isArray(plan.items) || plan.items.length === 0) return "";
  const header = opts.header || "## 🎯 Node-capability inject — explicit graph nodes named in this prompt";
  const lines = [header, ""];
  for (const it of plan.items) {
    const kind = it.kind || "node";
    const wiki = it.wikiPath || "(no-wiki)";
    const ptr = it.pointerPath || "";
    const display = it.displayName || it.nodeId;
    const matched = it.mention && String(it.mention).toLowerCase() !== String(display).toLowerCase();
    const mentionTag = matched ? " _(matched on: " + it.mention + ")_" : "";
    lines.push("  • [" + kind + "] **" + display + "** — wiki `" + wiki + "`" + mentionTag);
    if (ptr) lines.push("    pointer: `" + ptr + "`");
  }
  if (plan.truncated > 0) {
    lines.push("");
    lines.push("_+" + plan.truncated + " more mention(s) truncated by budget=" + plan.budget + "._");
  }
  lines.push("");
  lines.push("_100% coverage of explicitly-named nodes (within budget). For BM25 ranked hits see master-index / wiki / memory injectors above._");
  return lines.join("\n");
}
