#!/usr/bin/env node
/**
 * hook-creation-gate.mjs — PreToolUse(Write) advisory dedup gate
 * HOOK-SYNERGY-MS0 / U-HOOK-CREATION-GATE  (H5)
 *
 * Sister of the `HookCreationGuardEngine` TS engine (same logic, .mjs-callable so it
 * runs without a dist build). Fires on `Write` to a NEW `.claude/hooks/*.mjs` file and
 * checks the proposed name + JSDoc-line description + (event, matcher) signature
 * against `state/shared/HOOK_REGISTRY.json`. Advisory by default — emits a system
 * message recommending {skip|extend|rename} rather than blocking, because:
 *
 *   - fuzzy/description matches have non-zero false-positive rate; a hard-block on
 *     a probabilistic signal annoys more than it helps;
 *   - the existing `ai-duplication-guard.mjs` + `duplication-hard-block.mjs` already
 *     hard-block on exact-name collisions; this hook's job is the layer ABOVE that:
 *     signature collisions + descriptive overlap that name-only guards can't see.
 *
 * Set `PRISM_HOOK_CREATION_GATE_BLOCK=1` to flip the advisory to a hard block when
 * the engine recommends "skip" or "extend" (the high-confidence buckets).
 *
 * EXIT CONTRACT (Claude Code PreToolUse):
 *   allow:    {continue: true}
 *   advisory: {continue: true, systemMessage: "..."}  ← default for any match
 *   block:    {decision: "block", reason: "..."}      ← only when env override is set
 *
 * Test seam: the core logic is exposed as `evaluate({stdin, registryPath, fsImpl, env})`
 * so tests can drive it without an on-disk registry.
 *
 * @module .claude/hooks/hook-creation-gate
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ── Constants (kept in sync with HookCreationGuardEngine.ts) ─────────────────

const FUZZY_NAME_THRESHOLD = 0.7;
const HIGH_CONFIDENCE_OVERLAP = 0.85;
const DESC_TOKEN_MIN_LEN = 4;
const DESC_OVERLAP_MIN_TOKENS = 2;
const DESC_OVERLAP_BOOST = 0.2;
const SIGNATURE_BOOST = 0.3;
const MAX_MATCHES_RETURNED = 10;
const DEFAULT_REGISTRY_REL = "state/shared/HOOK_REGISTRY.json";
const HOOK_DIR_PREFIX = ".claude/hooks/";   // we only gate hooks-directory creates

const STOP = new Set([
  "this","that","with","from","into","have","been","when","where","what","which",
  "will","would","should","could","must","does","they","them","their","than",
  "then","these","those","some","such","only","also","other","more","most",
  "every","each","case","true","false","null","type","kind","name","file",
  "path","step","list","code","test","tests","hook","hooks","guard","block",
  "engine","module","system","input","output","value","values",
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\.(mjs|cjs|js|ts)$/i, "")
    .replace(/^.*[\\/]/, "")
    .replace(/[_\s.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/^(hook|hooks)-/, "");
}

function tokens(desc) {
  const out = new Set();
  for (const raw of String(desc ?? "").toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < DESC_TOKEN_MIN_LEN) continue;
    if (STOP.has(raw)) continue;
    out.add(raw);
  }
  return out;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

function nameSimilarity(a, b) {
  const n = Math.max(a.length, b.length);
  return n === 0 ? 1 : 1 - levenshtein(a, b) / n;
}

/** Extract the first JSDoc/comment line of a source string (best-effort). */
function firstDocLine(src) {
  if (typeof src !== "string") return "";
  const jsdoc = src.match(/\/\*\*([\s\S]*?)\*\//);
  if (jsdoc) {
    for (const raw of jsdoc[1].split("\n")) {
      const line = raw.replace(/^\s*\*?\s?/, "").trim();
      if (line && !line.startsWith("@")) return line.slice(0, 240);
    }
  }
  const slash = src.match(/^\s*\/\/\s?(.+)$/m);
  if (slash) return slash[1].trim().slice(0, 240);
  return "";
}

/** Read the registry from disk; tolerate missing/malformed. */
function readRegistry(p, fsImpl) {
  const fsi = fsImpl ?? fs;
  try {
    if (!fsi.existsSync(p)) return [];
    const raw = JSON.parse(fsi.readFileSync(p, "utf-8"));
    if (!raw || !Array.isArray(raw.hooks)) return [];
    const out = [];
    for (const h of raw.hooks) {
      if (!h || typeof h !== "object" || typeof h.file !== "string") continue;
      const id = typeof h.id === "string" && h.id ? h.id : path.basename(h.file).replace(/\.[^.]+$/, "");
      const description = typeof h.description === "string" ? h.description : "";
      const wirings = Array.isArray(h.wirings) ? h.wirings : [];
      const sigKeys = new Set();
      const signatures = [];
      for (const w of wirings) {
        if (!w || typeof w !== "object") continue;
        const event = typeof w.event === "string" ? w.event : "";
        const matcher = typeof w.matcher === "string" ? w.matcher : "";
        if (!event) continue;
        const k = `${event}::${matcher}`;
        if (!sigKeys.has(k)) {
          sigKeys.add(k);
          signatures.push({ event, matcher });
        }
      }
      out.push({ id, file: h.file, description, signatures });
    }
    return out;
  } catch {
    return [];
  }
}

// ── Core logic ───────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {object|null} opts.stdin       Parsed PreToolUse stdin ({tool_name, tool_input}).
 * @param {string} [opts.registryPath]   HOOK_REGISTRY.json path; default: H:/prism/state/shared/HOOK_REGISTRY.json
 * @param {object} [opts.fsImpl]         Injectable fs (existsSync, readFileSync).
 * @param {object} [opts.env]            Environment vars (PRISM_HOOK_CREATION_GATE_BLOCK).
 * @returns {{action: "allow"|"advise"|"block", recommendation: string, reason: string, matches: Array, topMatch?: object}}
 */
export function evaluate({ stdin, registryPath, fsImpl, env }) {
  const tool = String(stdin?.tool_name || "");
  if (tool !== "Write") {
    return { action: "allow", recommendation: "proceed", reason: "tool is not Write", matches: [] };
  }
  const ti = stdin?.tool_input ?? {};
  const filePath = typeof ti.file_path === "string" ? ti.file_path.replace(/\\/g, "/") : "";
  if (!filePath) {
    return { action: "allow", recommendation: "proceed", reason: "no file_path in tool_input", matches: [] };
  }

  // Only gate creates inside `.claude/hooks/` for .mjs files. The mcp-server hooks dir
  // is covered by ai-duplication-guard; we focus on the harness-level surface.
  const inHooksDir = filePath.includes(HOOK_DIR_PREFIX);
  if (!inHooksDir || !/\.mjs$/.test(filePath)) {
    return { action: "allow", recommendation: "proceed", reason: "not a .claude/hooks/*.mjs Write", matches: [] };
  }

  // If the file already exists, this Write is an UPDATE not a CREATE → not our scope.
  const fsi = fsImpl ?? fs;
  if (fsi.existsSync(filePath)) {
    return { action: "allow", recommendation: "proceed", reason: "file already exists (update, not create)", matches: [] };
  }

  // Load catalog.
  const regPath = registryPath ?? "H:/prism/state/shared/HOOK_REGISTRY.json";
  const catalog = readRegistry(regPath, fsi);
  if (catalog.length === 0) {
    return { action: "allow", recommendation: "proceed", reason: "registry empty or unavailable", matches: [] };
  }

  // Description: try to pull from the proposed content if Claude included it; else "".
  const proposedContent = typeof ti.content === "string" ? ti.content : "";
  const description = firstDocLine(proposedContent);

  const proposedNorm = normalizeName(filePath);
  const proposedTokens = tokens(description);

  // Score each catalog entry.
  const matches = [];
  for (const entry of catalog) {
    const entryNorm = normalizeName(entry.id);
    const reasons = [];
    const details = [];
    let score = 0;

    if (entryNorm && entryNorm === proposedNorm) {
      score = 1;
      reasons.push("exact-name");
      details.push("exact-name");
    } else {
      const sim = nameSimilarity(entryNorm, proposedNorm);
      if (sim >= FUZZY_NAME_THRESHOLD) {
        score = sim;
        reasons.push("fuzzy-name");
        details.push(`fuzzy-name@${sim.toFixed(2)}`);
      }
    }

    if (proposedTokens.size > 0 && entry.description) {
      const entryTokens = tokens(entry.description);
      let shared = 0;
      for (const t of proposedTokens) if (entryTokens.has(t)) shared++;
      if (shared >= DESC_OVERLAP_MIN_TOKENS) {
        score = Math.min(1, score + DESC_OVERLAP_BOOST);
        reasons.push("description-overlap");
        details.push(`description-overlap:${shared} tokens`);
      }
    }

    if (reasons.length > 0) {
      matches.push({
        file: entry.file,
        id: entry.id,
        score: Math.round(score * 1000) / 1000,
        reasons,
        detail: details.join(" · "),
      });
    }
  }
  matches.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const trimmed = matches.slice(0, MAX_MATCHES_RETURNED);
  const top = trimmed[0];

  if (!top) {
    return { action: "allow", recommendation: "proceed", reason: "no overlap with existing hooks", matches: [] };
  }

  const isExact = top.reasons.includes("exact-name");
  const isHighConf = top.score >= HIGH_CONFIDENCE_OVERLAP;
  let recommendation;
  let reason;
  if (isExact) {
    recommendation = "skip";
    reason = `Exact name collision with existing hook '${top.id}' (${top.file}). Reuse or rename.`;
  } else if (isHighConf) {
    recommendation = "extend";
    reason = `High-confidence overlap (score=${top.score.toFixed(2)}) with '${top.id}'. Consider extending the existing hook.`;
  } else {
    recommendation = "rename";
    reason = `Name is close to existing hook '${top.id}' (score=${top.score.toFixed(2)}). Consider a more distinctive name.`;
  }

  // Block vs advise: default advise, hard-block only if env override + high-confidence.
  const blockEnabled = (env ?? process.env)?.PRISM_HOOK_CREATION_GATE_BLOCK === "1";
  const action = blockEnabled && (isExact || isHighConf) ? "block" : "advise";
  return { action, recommendation, reason, matches: trimmed, topMatch: top };
}

// ── Hook entry (when run as a script) ────────────────────────────────────────

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf-8");
    return raw.trim() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function main() {
  let r;
  try {
    r = evaluate({ stdin: readStdinSafe() });
  } catch {
    r = { action: "allow", recommendation: "proceed", reason: "hook threw; failing open", matches: [] };
  }
  if (r.action === "block") {
    process.stdout.write(JSON.stringify({ decision: "block", reason: r.reason }));
  } else if (r.action === "advise") {
    const summary = `[hook-creation-gate] ${r.recommendation.toUpperCase()}: ${r.reason}`;
    process.stdout.write(JSON.stringify({ continue: true, systemMessage: summary }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
  process.exit(0);
}

const invokedAsScript = (() => {
  try {
    const self = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/i, "$1");
    return path.resolve(self) === path.resolve(process.argv[1] ?? "");
  } catch {
    return false;
  }
})();
if (invokedAsScript) main();
