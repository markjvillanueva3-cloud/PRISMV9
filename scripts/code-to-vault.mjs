#!/usr/bin/env node
/**
 * code-to-vault.mjs -- connect EVERY code-heavy PRISM source file to the Obsidian vault.
 *
 * Operator goal (2026-07-02, slot:sierra): "max out obsidian vault indexing with notes
 * summaries on each file especially engines, databases, modules, tribal knowledge,
 * algorithms and other code-heavy builds ... maximize obsidian vault capabilities and
 * 2nd brain / OS functionality." Databases already have `databases-to-vault.mjs`; this
 * is the sibling bridge for CODE files -- the papa H-DRIVE-VAULT-SYNERGY-PLAN U-4 gap
 * (per-file knowledge notes) applied to engines/algorithms/dispatchers/schemas.
 *
 * For each source file it emits a per-file summary note to
 *   knowledge/memories/reference/reference_code_<kind>_<slug>.md
 * -- the SAME vault location databases-to-vault + jm-shop-knowledge-to-vault use, so the
 * notes become first-class brain nodes: generate-memories-atomic graphs them, the
 * build-memory-index-sidecar indexes them for recall, and the Stop obsidian-memory-feed
 * mirrors C:->H:. Any chat / feature / the frontend can then answer "what does
 * KienzleForceEngine do, where is it, what does it depend on" by MEANING, not by grepping.
 *
 * Summary text is FREE + $0: the file's own JSDoc header + the ENGINE_DIGEST one-liner
 * (no LLM on the default path -> the whole ~4,500-file corpus indexes in one pass). The
 * `--llm-synth` flag adds an Ollama (qwen2.5-coder:32b, local, $0) plain-language pass for
 * files with a thin/absent header -- the fan-out target for parallel sierra/hermes agents.
 *
 *   node scripts/code-to-vault.mjs                       # all kinds, all files
 *   node scripts/code-to-vault.mjs --kind engine         # one kind (singular; see KINDS keys)
 *   node scripts/code-to-vault.mjs --galaxy mill         # one galaxy (engines only)
 *   node scripts/code-to-vault.mjs --offset 0 --limit 500# a batch (agent fan-out)
 *   node scripts/code-to-vault.mjs --json                # report only, no writes
 *   node scripts/code-to-vault.mjs --dry-run             # enumerate + classify, no writes
 *   node scripts/code-to-vault.mjs --llm-synth --limit 50# Ollama prose for thin headers
 *   node scripts/code-to-vault.mjs --force               # regen even if source unchanged
 *
 * Idempotent: each note stores an 8-char sourceHash in frontmatter; a re-run skips a note
 * whose source is byte-identical (unless --force). Atomic, fail-soft, entrypoint-guarded
 * (importing buildNote never writes the live vault -- the U-DB-VAULT lesson).
 *
 * Env: PRISM_CODE_VAULT_FROZEN_TIME=<iso> pins generatedAt for diff-stable test output.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractFacts, slugify } from "./lib/code-file-facts.mjs";

const REPO_ROOT = "H:/prism";
const VAULT_DIR = path.join(REPO_ROOT, "knowledge", "memories", "reference");
const INDEX_PATH = path.join(REPO_ROOT, "state", "shared", "CODE-VAULT-INVENTORY.md");
const ENGINE_DIGEST = path.join(REPO_ROOT, "mcp-server", "data", "docs", "ENGINE_DIGEST.md");
const ASK_OLLAMA = path.join(REPO_ROOT, "scripts", "ask-ollama.mjs");
const ASK_HERMES = path.join(REPO_ROOT, "scripts", "ask-hermes.mjs");

// KIND registry: kind -> { root, label, exts }. A file only ever maps to one kind (so a
// note is never emitted twice). `exts` lets a kind index .mjs (hooks/libs) as well as .ts.
export const KINDS = {
  engine: { root: "mcp-server/src/engines", label: "Engine", exts: [".ts", ".mjs"] },
  algorithm: { root: "mcp-server/src/algorithms", label: "Algorithm", exts: [".ts"] },
  dispatcher: { root: "mcp-server/src/tools/dispatchers", label: "Dispatcher", exts: [".ts"] },
  schema: { root: "mcp-server/src/schemas", label: "Schema", exts: [".ts"] },
  registry: { root: "mcp-server/src/registries", label: "Registry", exts: [".ts"] },
  physics: { root: "mcp-server/src/physics", label: "Physics", exts: [".ts"] },
  data: { root: "mcp-server/src/data", label: "Data Module", exts: [".ts"] },
  hook: { root: ".claude/hooks", label: "Hook", exts: [".mjs"] },
  // lib MUST precede script -- scripts/lib nests under scripts/, and candidate dedup is
  // first-kind-wins, so a scripts/lib/*.mjs stays 'lib' and is not re-indexed as 'script'.
  lib: { root: "scripts/lib", label: "Lib Module", exts: [".mjs"] },
  script: { root: "scripts", label: "Script", exts: [".mjs"] },
  route: { root: "mcp-server/src/routes", label: "Route", exts: [".ts"] },
  service: { root: "mcp-server/src/services", label: "Service", exts: [".ts"] },
  util: { root: "mcp-server/src/utils", label: "Util", exts: [".ts"] },
  middleware: { root: "mcp-server/src/middleware", label: "Middleware", exts: [".ts"] },
  mcp: { root: "mcp-server/src/mcp", label: "MCP Module", exts: [".ts"] },
  db: { root: "mcp-server/src/db", label: "DB Module", exts: [".ts"] },
  // frontend: the Next.js/React web app (mcp-server/web/src) -- its OWN root (does not nest
  // under mcp-server/src), so .ts + .tsx routes/components/hooks/lib/stores all index here.
  // The export regex already handles `export default function` / interface / type, so React
  // .tsx files extract cleanly (regex-only, no parse throw).
  frontend: { root: "mcp-server/web/src", label: "Frontend", exts: [".ts", ".tsx"] },
  // module is the backend CATCH-ALL: its root (mcp-server/src) nests OVER every specific kind
  // above, so it claims ONLY the not-yet-covered subdirs (types/config/orchestration/cli/bot/
  // generators/contracts/validation/interfaces/...) as `code-module` -- honoring "each
  // code-heavy file" for the long tail without ~19 near-empty kinds. Two mechanisms keep it
  // residual: (a) MODULE_EXCLUDE_PREFIXES structurally drops any file under a specific src
  // root REGARDLESS of --kind arg order (so `--kind module` alone is safe -- arm-A P1); (b)
  // first-kind-wins dedup on a full run. Placed LAST for (b). web/ is a sibling of src/, so
  // frontend files are never double-claimed.
  module: { root: "mcp-server/src", label: "Module", exts: [".ts"] },
};
const SKIP_DIRS = new Set([
  "node_modules", ".git", "__tests__", "tests", "dist", "build", ".cache", ".next", "coverage", ".turbo",
]);

// `module` (root mcp-server/src) is the backend CATCH-ALL. To keep it STRUCTURALLY residual --
// never re-claiming a specific backend kind's files REGARDLESS of which kinds a partial run
// requests -- it prefix-excludes every specific mcp-server/src sub-root. First-kind-wins
// ordering covers a FULL run; this covers single/partial `--kind module` runs the ordering
// alone cannot (arm-A P1: `--kind module` would otherwise sweep all ~5.2k src files and
// mislabel every engine/schema/algorithm/dispatcher as code-module).
const MODULE_EXCLUDE_PREFIXES = Object.entries(KINDS)
  .filter(([k, s]) => k !== "module" && s.root.replace(/\\/g, "/").startsWith("mcp-server/src/"))
  .map(([, s]) => s.root.replace(/\\/g, "/").replace(/\/$/, "") + "/");

/** True if `rel` (forward-slashed repo-relative path) is genuinely residual for `module` --
 *  NOT under any specific backend kind's root -- so the catch-all may claim it. */
export function isModuleResidual(rel) {
  return !MODULE_EXCLUDE_PREFIXES.some((p) => rel.startsWith(p));
}

function nowIso() {
  return process.env.PRISM_CODE_VAULT_FROZEN_TIME || new Date().toISOString();
}
function shortHash(text) {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex").slice(0, 8);
}

/** Parse ENGINE_DIGEST.md -> Map<EngineName, one-line summary>. Fail-soft. */
export function parseEngineDigest(digestText) {
  const map = new Map();
  const re = /^-\s+\*\*([A-Za-z0-9_$]+)\*\*:\s*(.+)$/gm;
  for (const m of String(digestText || "").matchAll(re)) {
    map.set(m[1], m[2].trim());
  }
  return map;
}

/**
 * True if `name` is an indexable source file of one of `exts`: right extension, NOT a
 * test/spec file, NOT a type-declaration. Exported so the exclusion contract is unit-tested.
 * The test regex covers .ts/.tsx/.js/.jsx/.mts/.cts/.mjs/.cjs -- adding the `frontend` kind's
 * .tsx meant `.test.tsx`/`.spec.tsx` colocated React tests were slipping past the old
 * `[tj]s$` (ts/js-only) guard and getting emitted as source notes (arm-A P1).
 */
export function isIndexableSource(name, exts) {
  if (!exts.some((x) => name.endsWith(x))) return false;
  if (/\.(test|spec)\.[mc]?[tj]sx?$/.test(name)) return false;
  if (name.endsWith(".d.ts")) return false;
  return true;
}

/** Recursively list source files (non-test) of the given exts under a root, skip-aware. */
function walkCode(absRoot, exts = [".ts"], skipDirs = SKIP_DIRS) {
  const out = [];
  const stack = [absRoot];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!skipDirs.has(e.name)) stack.push(full);
      } else if (e.isFile() && isIndexableSource(e.name, exts)) {
        out.push(full);
      }
    }
  }
  out.sort();
  return out;
}

/**
 * Collision-safe note-name map over the full candidate set (pure). Two source files with
 * the same basename in different subdirs would otherwise map to the SAME note name and
 * silently clobber each other (R12 bug caught by the gap audit). Fix: the first (sorted)
 * member keeps the bare name; each subsequent member gets a 6-char path-hash suffix -- so
 * every file gets a note, no orphan is created, and dep wikilinks (bare slug) resolve to
 * the first member. Computed over the FULL candidate set so batching/galaxy filters stay
 * globally consistent.
 */
export function buildNoteNameMap(candidates, hashFn = shortHash) {
  const groups = new Map();
  for (const c of candidates) {
    const base = `reference_code_${c.kind}_${slugify(c.rel.split("/").pop())}`;
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(c);
  }
  const map = new Map();
  for (const [base, members] of groups) {
    if (members.length === 1) { map.set(members[0].rel, base); continue; }
    members.sort((a, b) => a.rel.localeCompare(b.rel));
    // Suffix = an 8-hex (32-bit) hash of the full rel path: stable PER FILE (idempotent
    // across corpus growth, unlike a sort-index which shifts when a sibling is added) and
    // collision-free in practice for any realistic same-basename group size (arm-B P2).
    members.forEach((m, i) => { map.set(m.rel, i === 0 ? base : `${base}_${hashFn(m.rel).slice(0, 8)}`); });
  }
  return map;
}

/** One-line, markdown-safe description for the note frontmatter. */
function buildDescription(facts, digestSummary) {
  const raw =
    digestSummary ||
    (facts.jsdoc ? facts.jsdoc.split("\n").find((l) => l.trim() && !l.startsWith("@")) : "") ||
    `${facts.kind} ${facts.primary || facts.basename}`;
  return String(raw)
    .replace(/\s+/g, " ")
    .replace(/"/g, "'")
    .replace(/\[\[/g, "[ [").replace(/\]\]/g, "] ]") // neutralize [[ ]] -> no phantom wikilinks in notes/MOCs (P3)
    .trim()
    .slice(0, 240);
}

/**
 * Build the per-file summary vault note (pure). `opts.llmSummary` is an optional
 * Ollama-generated prose block; `opts.digestSummary` the ENGINE_DIGEST one-liner.
 */
export function buildNote(facts, opts = {}) {
  const { digestSummary = "", llmSummary = "", generatedAt = nowIso(), sourceHash = "" } = opts;
  const kindLabel = (KINDS[facts.kind] && KINDS[facts.kind].label) || facts.kind;
  const desc = buildDescription(facts, digestSummary);
  // Collision-safe name from the caller (buildNoteNameMap); fall back to the bare slug.
  const noteName = opts.noteName || `reference_code_${facts.kind}_${slugify(facts.basename)}`;

  const summaryBlock =
    (digestSummary ? `${digestSummary}\n\n` : "") +
    (facts.jsdoc ? "```\n" + facts.jsdoc.slice(0, 900) + "\n```\n" : "") +
    (llmSummary ? `\n**Plain-language (local-LLM):** ${llmSummary.trim()}\n` : "");

  const exportsList = facts.exports.length
    ? facts.exports.slice(0, 20).map((e) => `\`${e.name}\` (${e.kind})`).join(", ")
    : "_(no top-level exports detected)_";
  const methodsList = facts.methods.length
    ? facts.methods.slice(0, 24).map((m) => `\`${m}\``).join(", ")
    : "_(none extracted)_";
  // Resolve each dependency to its REAL note across all 14 kinds (opts.slugToNote), so an
  // engine->registry/lib/etc import becomes a correct graph edge instead of a dangling
  // engine-namespace phantom. An external/non-indexed dep (e.g. a util) renders as plain
  // text -- no phantom node. Falls back to engine-namespace only when no resolver is given.
  const resolveDep = opts.slugToNote instanceof Map ? opts.slugToNote : null;
  const depsList = facts.deps.length
    ? facts.deps.slice(0, 24).map((d) => {
        if (!resolveDep) return `[[reference_code_engine_${d.slug}]]`;
        const note = resolveDep.get(d.slug);
        return note ? `[[${note}]]` : `\`${d.module}\``;
      }).join(" | ")
    : "_(no sibling-engine imports)_";
  const galaxyLine = facts.galaxy ? `**${facts.galaxy}**` : "_(cross-cutting / unassigned)_";
  const physicsLine = facts.importsPhysicsConstants
    ? "\n> [physics] Imports canonical physics constants (`src/physics/constants.ts`) -- safety-relevant node.\n"
    : "";

  const note = `---
name: ${noteName}
description: "${desc}"
metadata:
  type: reference
  kind: code-${facts.kind}
  galaxy: ${facts.galaxy || "unassigned"}
  sourcePath: ${facts.path}
  sourceHash: ${sourceHash}
  loc: ${facts.loc}
aliases: ${facts.primary || facts.basename}
---

# ${facts.primary || facts.basename} -- ${kindLabel} SUMMARY

> Auto-generated by \`scripts/code-to-vault.mjs\` (CODE-VAULT-BRIDGE, slot:sierra). Re-run to refresh.
> generatedAt: ${generatedAt}  |  source: \`${facts.path}\` (${facts.loc} LOC)
${physicsLine}
## What it is
${summaryBlock || "_(no header summary -- file has no JSDoc; run with `--llm-synth` for a local-LLM pass)_"}

## Exports
${exportsList}

## Key methods
${methodsList}

## Depends on
${depsList}

## Where it lives
- **Source:** \`${facts.path}\`
- **Galaxy:** ${galaxyLine}
- **Kind:** ${kindLabel}

## How to query it
Recall by meaning via \`/system-viz find ${facts.primary || facts.basename}\` or \`prism_session:master_index_query\`; open the source at \`${facts.path}\`. This note IS the brain connection -- a vault memory node under \`knowledge/memories/reference/\`, graphed by \`generate-memories-atomic\` and indexed by \`build-memory-index-sidecar\`. Related: [[feedback_read_full_content_not_titles]].
`;
  // Strip U+FFFD replacement chars that leak from CP1252-encoded source files read as
  // UTF-8 (gap-audit finding: 5 legacy engines) -- keeps notes clean + YAML-safe.
  return note.replace(new RegExp(String.fromCharCode(0xFFFD), "g"), "");
}

const THIN_MARKER = "no header summary";
/** Extract the `## What it is` body (between that heading and the next `## `). "" if absent. */
export function extractWhatItIs(noteText) {
  const m = String(noteText || "").match(/## What it is\n([\s\S]*?)(?:\n## |\n?$)/);
  return m ? m[1].trim() : "";
}
/**
 * REGEN-SAFE ENRICHMENT PRESERVE. When a source file changes, the note is rebuilt via
 * buildNote WITHOUT --llm-synth, which re-emits the thin placeholder and WIPES any prose an
 * earlier enrichment pass wrote (the 31-note nightly-brain-refresh regression, 2026-07-04).
 * Fix: if the freshly-built note is thin (placeholder) but the existing on-disk note already
 * carries real enriched prose in `## What it is`, splice that prose back in -- so freshness
 * regen (hash/loc/deps update) never destroys enrichment. Pure; returns the new note string,
 * possibly with its `## What it is` body swapped for the preserved prose.
 */
export function preserveEnrichedSummary(newNote, existingNote) {
  if (!existingNote) return newNote;
  const newBody = extractWhatItIs(newNote);
  if (!newBody.includes(THIN_MARKER)) return newNote; // new note already has real prose -- keep it
  const oldBody = extractWhatItIs(existingNote);
  if (!oldBody || oldBody.includes(THIN_MARKER)) return newNote; // nothing worth preserving
  // Swap the placeholder body for the preserved enriched body (first occurrence only).
  return newNote.replace(`## What it is\n${newBody}`, `## What it is\n${oldBody}`);
}

// Fast, small, INSTRUCT model for enrichment -- pinned so ask-ollama doesn't resolve to a
// heavy synthesis default (qwen2.5-coder:32b) that cold-loads/hangs. Override via env for a
// different loaded model. Lesson: a latency-bounded LLM call must pin a fast model + a real
// timeout, never inherit a deep default (see reference_reason_before_action / this note).
// qwen2.5-coder:32b is the code model that actually GENERATES text summaries -- the loaded
// qwen3-vl / qwen2.5vl models are VISION-language and return "" for text-only prompts (the
// enrichment-empty bug). Warm eval ~1-2s/file. Override via env for a different code model.
const ENRICH_MODEL = process.env.PRISM_CODE_VAULT_ENRICH_MODEL || "qwen2.5-coder:32b";
// Hermes (xAI/NVIDIA cloud free lane) enrichment backend -- a SEPARATE resource from the
// local Ollama GPU, so it works when Ollama is 503 under fleet GPU load. Operator directive:
// "utilize hermes agents". A small fast general model summarizes code cleanly.
const HERMES_MODEL = process.env.PRISM_CODE_VAULT_HERMES_MODEL || "meta/llama-3.1-8b-instruct";
const ENRICH_TIMEOUT_MS = Number(process.env.PRISM_CODE_VAULT_ENRICH_TIMEOUT_MS) || 90_000;

/** Run `<cli> explain <file> --model <model>`, clean + prose-guard the output; "" on fail. */
function runExplain(cli, absFile, model) {
  try {
    const r = spawnSync(
      process.execPath,
      // --timeout is MILLISECONDS (>=1000) for both ask-ollama and ask-hermes.
      [cli, "explain", absFile, "--model", model, "--timeout", String(ENRICH_TIMEOUT_MS)],
      { encoding: "utf8", timeout: ENRICH_TIMEOUT_MS + 15_000, windowsHide: true },
    );
    if (r.status === 0 && r.stdout && r.stdout.trim()) {
      // Strip markdown noise the model prepends (### headers, ``` fences, bullets) so a real
      // summary wrapped in markdown survives the prose guard; a pure code-dump won't.
      const cleaned = r.stdout
        .split("\n")
        .filter((l) => !/^\s*(#{1,6}\s|```|[-*]\s*$)/.test(l))
        .join(" ")
        .replace(/\*\*/g, "") // strip **bold** emphasis (markdown, not code) so a "**Overview**..." summary isn't rejected for a leading `*`
        .replace(/\s+/g, " ")
        .trim();
      if (looksLikeProse(cleaned)) return cleaned.slice(0, 600);
    }
  } catch { /* fail-open */ }
  return "";
}

/**
 * Plain-language pass for a thin-header file: Ollama first (local, free, fast when the GPU
 * is available), else Hermes (cloud lane, bypasses the local-GPU 503 contention). Fail-open
 * -> "" so a note keeps its honest placeholder. `PRISM_CODE_VAULT_NO_OLLAMA=1` skips Ollama
 * (go straight to Hermes when the GPU is known-busy).
 */
function llmSummarize(absFile) {
  if (process.env.PRISM_CODE_VAULT_NO_OLLAMA !== "1") {
    const viaOllama = runExplain(ASK_OLLAMA, absFile, ENRICH_MODEL);
    if (viaOllama) return viaOllama;
  }
  return runExplain(ASK_HERMES, absFile, HERMES_MODEL);
}

/** True if `s` reads like a prose summary, not a code dump / fence / fallback notice. */
export function looksLikeProse(s) {
  const t = String(s || "").trim();
  if (t.length < 20) return false;
  if (/^[`{[(#/<]/.test(t)) return false;                 // starts with code/fence/markup
  if (/OLLAMA FALLBACK|You are the fallback|could not run/i.test(t)) return false; // ask-ollama notice
  if (!/[a-zA-Z]/.test(t[0]) || !/[.!?]/.test(t)) return false; // must start with a letter + contain a sentence stop
  const codey = (t.match(/[{};=<>|`]/g) || []).length / t.length;
  return codey < 0.06;                                    // low code-punctuation density
}

export function parseArgs(argv) {
  const a = { kinds: [], galaxy: null, offset: 0, limit: Infinity, json: false, dryRun: false, force: false, llm: false, sweepStale: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === "--json") a.json = true;
    else if (v === "--dry-run") a.dryRun = true;
    else if (v === "--force") a.force = true;
    else if (v === "--llm-synth") a.llm = true;
    else if (v === "--sweep-stale") a.sweepStale = true;
    else if (v === "--kind") a.kinds.push(argv[++i]);
    else if (v === "--galaxy") a.galaxy = argv[++i];
    else if (v === "--offset") { const n = parseInt(argv[++i], 10); a.offset = Number.isFinite(n) && n >= 0 ? n : 0; }
    // --limit: keep an explicit 0 (empty batch) -- `|| Infinity` was the opposite of intent.
    else if (v === "--limit") { const n = parseInt(argv[++i], 10); a.limit = Number.isFinite(n) && n >= 0 ? n : Infinity; }
  }
  if (!a.kinds.length) a.kinds = Object.keys(KINDS);
  // Dedupe kinds -- a repeated `--kind engine` must NOT double-walk the tree (which made
  // every engine self-collide and emit a spurious 8-hex duplicate note). Idempotent input.
  a.kinds = [...new Set(a.kinds)];
  // Force KINDS-definition order so nested-root kinds dedup correctly (first-kind-wins)
  // REGARDLESS of --kind arg order: `module` (root mcp-server/src) MUST resolve after every
  // specific backend kind, and `lib` (scripts/lib) before `script` (scripts). Without this,
  // `--kind module --kind engine` would let `module` claim all 5000+ backend files first and
  // emit spurious code-module notes over the real ones. Unknown kinds sort to the end.
  const kindOrder = Object.keys(KINDS);
  const END = kindOrder.length; // finite sentinel -- unknown kinds sort last WITHOUT Infinity-Infinity=NaN (arm-B P2)
  a.kinds.sort((x, y) => {
    const ix = kindOrder.indexOf(x), iy = kindOrder.indexOf(y);
    return (ix === -1 ? END : ix) - (iy === -1 ? END : iy);
  });
  return a;
}

/**
 * True only for a whole-corpus run that may rewrite the consolidated inventory: EVERY
 * kind, no galaxy filter, no batch window. Gating on `kinds` too is the fix for the
 * arm-C blocker -- a single `--kind X` run (or a mistyped unknown kind) would otherwise
 * rewrite CODE-VAULT-INVENTORY.md with every other kind zeroed (silent count-rot).
 */
export function isFullRun(a, kindKeys = Object.keys(KINDS)) {
  // Set-uniqueness (not just array length) so a duplicate + omission (e.g. `--kind engine`
  // twice while missing another kind) can't masquerade as "all kinds" and re-open the
  // zeroed-count inventory clobber for the omitted kind (arm-C P2 hardening).
  const allKinds = new Set(a.kinds).size === kindKeys.length && a.kinds.every((k) => kindKeys.includes(k));
  return allKinds && a.offset === 0 && a.limit === Infinity && !a.galaxy;
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  const generatedAt = nowIso();
  let digest = new Map();
  try { digest = parseEngineDigest(fs.readFileSync(ENGINE_DIGEST, "utf8")); } catch { /* seed optional */ }

  // Enumerate the full candidate set across requested kinds.
  const candidates = [];
  for (const kind of a.kinds) {
    const spec = KINDS[kind];
    if (!spec) { process.stderr.write(`[code-vault] unknown kind '${kind}' -- skip\n`); continue; }
    for (const abs of walkCode(path.join(REPO_ROOT, spec.root), spec.exts)) {
      const rel = path.relative(REPO_ROOT, abs).replace(/\\/g, "/");
      if (kind === "module" && !isModuleResidual(rel)) continue; // structural residual (arm-A P1)
      candidates.push({ kind, abs, rel });
    }
  }
  // Dedupe by rel path -- FIRST kind (in KINDS order) wins. Guards against nested kind
  // roots (e.g. scripts/lib under scripts) emitting two notes for one file. A file maps
  // to exactly one kind -> exactly one brain node.
  {
    const seen = new Set();
    const uniq = [];
    for (const c of candidates) { if (!seen.has(c.rel)) { seen.add(c.rel); uniq.push(c); } }
    candidates.length = 0;
    candidates.push(...uniq);
  }
  // Collision-safe note names computed over the FULL candidate set (before galaxy/batch).
  const noteNameMap = buildNoteNameMap(candidates);
  // slug -> real note name, for cross-kind dependency-wikilink resolution. Engine-preferred
  // on the rare cross-kind same-basename slug (most deps are engine deps). Built over the
  // full candidate set so a lib/route/etc note's engine/registry deps resolve correctly.
  const slugToNote = new Map();
  for (const c of candidates) {
    const s = slugify(c.rel.split("/").pop());
    if (!slugToNote.has(s) || c.kind === "engine") slugToNote.set(s, noteNameMap.get(c.rel));
  }
  // Galaxy filter (engines only carry a galaxy). Exact path-segment match -- NOT a regex,
  // so a galaxy value with metachars (e.g. a `.`) can't over-match (arm-A P2).
  let filtered = candidates;
  if (a.galaxy) {
    const seg = `engines/${a.galaxy.toLowerCase()}/`;
    filtered = candidates.filter((c) => c.rel.toLowerCase().includes(seg));
  }
  filtered.sort((x, y) => x.rel.localeCompare(y.rel));
  const batch = filtered.slice(a.offset, a.offset === 0 && a.limit === Infinity ? undefined : a.offset + a.limit);

  let wrote = 0, skipped = 0, llmUsed = 0, writeFailed = 0, readFailed = 0;
  const rows = [];
  if (!a.json && !a.dryRun) fs.mkdirSync(VAULT_DIR, { recursive: true });

  for (const c of batch) {
    let text = "";
    // Read failures are counted + surfaced (R12) -- never silently dropped from the tally.
    try { text = fs.readFileSync(c.abs, "utf8"); }
    catch (err) { readFailed++; process.stderr.write(`[code-vault] READ FAIL ${c.rel}: ${err.message}\n`); continue; }
    const facts = extractFacts(c.rel, text, c.kind);
    const sourceHash = shortHash(text);
    const noteName = noteNameMap.get(c.rel) || `reference_code_${c.kind}_${slugify(facts.basename)}`;
    const notePath = path.join(VAULT_DIR, `${noteName}.md`);
    rows.push({ kind: c.kind, name: noteName, primary: facts.primary || facts.basename, galaxy: facts.galaxy || "-", loc: facts.loc, path: c.rel });

    if (a.json || a.dryRun) continue;

    // Idempotency: skip byte-identical source unless --force. EXCEPTION: when enriching
    // (--llm-synth), re-process an otherwise-unchanged note if it still shows the thin-header
    // placeholder -- so enrichment is TARGETED (only ~thin notes rewritten, not all 7.8k) and
    // idempotent (once enriched the placeholder is gone -> skipped on the next run).
    if (!a.force) {
      try {
        const existing = fs.readFileSync(notePath, "utf8");
        if (existing.includes(`sourceHash: ${sourceHash}`)) {
          const needsEnrich = a.llm && existing.includes("no header summary");
          if (!needsEnrich) { skipped++; continue; }
        }
      } catch { /* new note */ }
    }

    const digestSummary = facts.primary ? (digest.get(facts.primary) || "") : "";
    let llmSummary = "";
    if (a.llm && (!facts.jsdoc || facts.jsdoc.length < 80) && !digestSummary) {
      llmSummary = llmSummarize(c.abs);
      if (llmSummary) llmUsed++;
    }
    let note = buildNote(facts, { digestSummary, llmSummary, generatedAt, sourceHash, noteName, slugToNote });
    // Regen-safe: on a non-enriching rebuild (source changed -> new hash -> thin placeholder),
    // preserve any enriched prose the existing note already carries (else the nightly brain-
    // refresh code-vault step wipes enrichment -- the 31-note 2026-07-04 regression). No-op
    // when enriching (--llm-synth builds fresh prose) or when the note is genuinely new.
    if (!a.llm) {
      try { note = preserveEnrichedSummary(note, fs.readFileSync(notePath, "utf8")); } catch { /* new note */ }
    }
    const tmp = `${notePath}.tmp-${process.pid}`;
    // Guard the atomic write: a transient rename EPERM (AV / concurrent overlap) must not
    // abort the whole batch -- count it, clean the tmp, keep going (arm-C P2).
    try {
      fs.writeFileSync(tmp, note, "utf8");
      fs.renameSync(tmp, notePath); // atomic
      wrote++;
    } catch (err) {
      writeFailed++;
      try { fs.unlinkSync(tmp); } catch { /* already gone */ }
      process.stderr.write(`[code-vault] WRITE FAIL ${noteName}: ${err.message}\n`);
    }
  }

  // Sweep stale notes (opt-in, full-run only): delete any generated code note whose name
  // is NOT in the current produced set -- orphaned by a hash-scheme change (the 6->8 hex
  // migration left 10 stale hook dupes) or a deleted source. Safe: only touches files with
  // `kind: code-` frontmatter (ours), never MOCs, never non-generated reference_code_* notes.
  let swept = 0;
  if (!a.json && !a.dryRun && a.sweepStale && isFullRun(a)) {
    // Data-safety guard (arm-B P2): if any requested kind produced 0 candidates, its root is
    // most likely ABSENT on this host (walkCode is fail-soft -> [] for a missing dir), NOT
    // genuinely empty. Sweeping then would delete EVERY note of that kind as "stale" (e.g. a
    // host without the mcp-server/web build tree would nuke all 698 frontend notes). Refuse
    // the whole sweep and fail loud (R12) rather than mass-delete live nodes.
    const perKind = {};
    for (const c of candidates) perKind[c.kind] = (perKind[c.kind] || 0) + 1;
    const emptyKinds = a.kinds.filter((k) => KINDS[k] && !perKind[k]);
    if (emptyKinds.length) {
      process.stderr.write(`[code-vault] SWEEP SKIPPED -- kind(s) produced 0 candidates (root absent?): ${emptyKinds.join(", ")}. Refusing to sweep to avoid mass-deleting live notes.\n`);
    } else {
      const produced = new Set(noteNameMap.values());
      let files = [];
      try { files = fs.readdirSync(VAULT_DIR); } catch { /* none */ }
      for (const f of files) {
        if (!/^reference_code_.+\.md$/.test(f) || /^reference_code_moc_/.test(f)) continue;
        const nm = f.replace(/\.md$/, "");
        if (produced.has(nm)) continue;
        const abs = path.join(VAULT_DIR, f);
        let content = "";
        try { content = fs.readFileSync(abs, "utf8"); } catch { continue; }
        if (!/^\s*kind:\s*code-(?!moc)/m.test(content)) continue; // only OUR generated notes, not MOCs/hand-authored
        try { fs.unlinkSync(abs); swept++; } catch (err) { process.stderr.write(`[code-vault] SWEEP FAIL ${f}: ${err.message}\n`); }
      }
    }
  }

  const byKind = {};
  for (const r of rows) byKind[r.kind] = (byKind[r.kind] || 0) + 1;

  if (a.json) {
    process.stdout.write(JSON.stringify({ generatedAt, total: filtered.length, batch: batch.length, byKind, rows: rows.slice(0, 50) }, null, 2) + "\n");
    return;
  }

  // Consolidated index -- only rewrite on a whole-corpus run (EVERY kind, no galaxy, no
  // batch window) so a partial/single-kind/mistyped-kind run never clobbers the inventory
  // with zeroed counts (arm-C blocker).
  const fullRun = isFullRun(a);
  if (!a.dryRun && fullRun) {
    const kindRows = Object.keys(KINDS)
      .map((k) => `| ${k} | ${byKind[k] || 0} | ${KINDS[k].root} |`)
      .join("\n");
    const index = `# CODE FILES -> OBSIDIAN VAULT INVENTORY

> Auto-generated by \`scripts/code-to-vault.mjs\` (CODE-VAULT-BRIDGE, slot:sierra). generatedAt: ${generatedAt}
> ${filtered.length} code files -> per-file summary notes under knowledge/memories/reference/reference_code_<kind>_<slug>.md.
> Each note is a first-class brain node (graphed + indexed + recall-able). Refresh: \`node scripts/code-to-vault.mjs\`.

| kind | files indexed | source root |
|------|---------------|-------------|
${kindRows}

## Doctrine
Every code-heavy PRISM source file is connected to the Obsidian brain via a
\`reference_code_<kind>_<slug>.md\` summary note (what-it-is + exports + methods +
dependency wikilinks + path + query-hint). Sibling of the DATABASE-VAULT-INVENTORY
(\`databases-to-vault.mjs\`). Fan-out: \`--offset/--limit\` batches for parallel agents;
\`--llm-synth\` adds a local-LLM prose pass for thin headers. Pattern: [[feedback_read_full_content_not_titles]].
`;
    fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
    const idxTmp = `${INDEX_PATH}.tmp-${process.pid}`;
    try { fs.writeFileSync(idxTmp, index, "utf8"); fs.renameSync(idxTmp, INDEX_PATH); } // atomic
    catch (err) { try { fs.unlinkSync(idxTmp); } catch { /* gone */ } process.stderr.write(`[code-vault] INDEX WRITE FAIL: ${err.message}\n`); }
  }

  const failNote = (writeFailed || readFailed) ? ` | FAILED write=${writeFailed} read=${readFailed}` : "";
  const sweepNote = swept ? ` | swept-stale=${swept}` : "";
  process.stdout.write(
    `[code-vault] ${a.dryRun ? "(dry-run) " : ""}kinds=${a.kinds.join(",")}${a.galaxy ? " galaxy=" + a.galaxy : ""} ` +
    `| candidates=${filtered.length} batch=${batch.length} | wrote=${wrote} skipped=${skipped} llm=${llmUsed}${sweepNote}${failNote}\n` +
    Object.entries(byKind).map(([k, n]) => `  ${k.padEnd(11)} ${String(n).padStart(5)}`).join("\n") + "\n" +
    (a.dryRun || a.json ? "" : `[code-vault] notes -> ${path.relative(REPO_ROOT, VAULT_DIR)}/reference_code_*.md${fullRun ? " + index -> " + path.relative(REPO_ROOT, INDEX_PATH) : ""}\n`),
  );
}

// Entrypoint guard: importing buildNote/parseEngineDigest (the test does) never writes.
const __isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (__isCli) main();
