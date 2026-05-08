#!/usr/bin/env node
/**
 * skill-trigger-backfill.mjs
 *
 * OBSIDIAN-COMPOUND-MS1/S5/U-SKILL-TRIGGER-META
 *
 * Proposes + applies `trigger.autoSuggest.keywords` YAML frontmatter on
 * skill .md files that lack auto-suggest metadata. The Skill Utilization
 * Analyst (Agent 9) found that ~500 skills exist, ~11 are invoked, and
 * many high-suggestion-zero-invocation candidates (e.g. /continue-roadmap
 * 273/0) would benefit from the harness pushing them at the right keyword
 * instead of waiting for the user to type the slash command.
 *
 * NEVER auto-execute — the harness merely surfaces a hint. The user retains
 * the final invocation decision.
 *
 * Keyword extraction strategy
 * ---------------------------
 * For each skill body we extract candidate keywords using:
 *   1. The `# /skill-name — title` heading (the title fragment after the dash)
 *   2. The first paragraph after the heading (top-N noun-like tokens)
 *   3. Existing `description:` frontmatter field
 *   4. The skill's own slug (broken on dashes)
 *
 * The result is deduped, lower-cased, multi-word phrases preserved, and
 * capped at MAX_KEYWORDS_PER_SKILL. We pin a marker key (`_triggerBackfill`)
 * so `--revert` can reverse only what we wrote.
 *
 * Safety contract
 * ---------------
 *   - Default mode is dry-run; `--apply` is required to write.
 *   - Skips any skill that already has `trigger:` (any subkey) in frontmatter.
 *   - Skips skills with malformed frontmatter (logged, not modified).
 *   - Atomic write: tmp file + rename; tmp cleaned on failure.
 *   - `--revert` removes only marker-bearing trigger blocks, never
 *     touches pre-existing `trigger:` blocks.
 *   - `--top N` caps the number of skills modified per run (default 50).
 *
 * Usage:
 *   node scripts/skill-trigger-backfill.mjs                     # dry-run, top 50
 *   node scripts/skill-trigger-backfill.mjs --apply             # write
 *   node scripts/skill-trigger-backfill.mjs --apply --top 200   # widen batch
 *   node scripts/skill-trigger-backfill.mjs --revert --apply    # reverse
 *   node scripts/skill-trigger-backfill.mjs --root /tmp/test    # test override
 *
 * @milestone OBSIDIAN-COMPOUND-MS1/S5/U-SKILL-TRIGGER-META
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const MARKER_KEY = "_triggerBackfill";
const MAX_KEYWORDS_PER_SKILL = 8;
const MIN_KEYWORD_LEN = 4;
const DEFAULT_TOP = 50;

const DEFAULT_ROOTS = [
  "H:/.claude/commands",
  join(REPO_ROOT, ".claude", "commands"),
];

// Stopwords narrow on purpose — domain terms (kienzle, edm, lathe) survive.
const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "have", "from", "into",
  "your", "their", "when", "what", "which", "where", "while", "after",
  "before", "about", "would", "could", "should", "must", "skill", "command",
  "tool", "tools", "help", "use", "uses", "using", "user", "users",
  "make", "makes", "made", "create", "created", "creates",
]);

const HIGH_VALUE_PATTERNS = [
  // Verbs & nouns common to manufacturing-intelligence work — keep.
  /\b(audit|review|validate|verify|generate|extract|analyze|optimize|harden|recommend|search|find|discover)\b/gi,
  /\b(milling|turning|grinding|drilling|threading|edm|lathe|mill|wedm|sinker)\b/gi,
  /\b(speed|feed|kienzle|taylor|deflection|chatter|surface|tolerance|thread)\b/gi,
];

// ─────────────────────────────────────────────────────────────────────────────
// Frontmatter parsing
// ─────────────────────────────────────────────────────────────────────────────

function splitFrontmatter(raw) {
  if (!raw.startsWith("---")) {
    return { frontmatter: null, body: raw };
  }
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return { frontmatter: null, body: raw, malformed: true };
  return {
    frontmatter: raw.slice(4, end).replace(/^\n/, ""),
    body: raw.slice(end + 4).replace(/^\n/, ""),
  };
}

/** Tiny heuristic YAML check — looks for `trigger:` block at top level. */
function frontmatterHasTrigger(frontmatter) {
  if (!frontmatter) return false;
  return /^trigger\s*:/m.test(frontmatter);
}

function frontmatterHasMarker(frontmatter) {
  if (!frontmatter) return false;
  return new RegExp(`^${MARKER_KEY}\\s*:`, "m").test(frontmatter);
}

function extractDescription(frontmatter) {
  if (!frontmatter) return "";
  const m = frontmatter.match(/^description\s*:\s*(.*)$/m);
  if (!m) return "";
  let desc = m[1].trim();
  // Strip surrounding quotes if present.
  if ((desc.startsWith("\"") && desc.endsWith("\"")) ||
      (desc.startsWith("'") && desc.endsWith("'"))) {
    desc = desc.slice(1, -1);
  }
  return desc;
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword extraction
// ─────────────────────────────────────────────────────────────────────────────

function tokenize(text) {
  return text.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);
}

function extractTitlePhrase(body) {
  // Match `# /name — long title` or `# Title`. Capture the part after the dash.
  const m = body.match(/^#\s+(?:\/[\w-]+\s*[—\-–]\s*)?(.+)$/m);
  if (!m) return "";
  return m[1].trim().replace(/\.+$/, "");
}

function extractFirstParagraph(body) {
  // Take the first ~400 chars after stripping headings + horizontal rules.
  const stripped = body.replace(/^#+.*$/gm, "").replace(/^---+$/gm, "").trim();
  return stripped.split(/\n\s*\n/)[0]?.trim() ?? "";
}

function isMeaningfulKeyword(word) {
  if (!word) return false;
  if (word.length < MIN_KEYWORD_LEN) return false;
  if (STOPWORDS.has(word)) return false;
  if (/^\d+$/.test(word)) return false;
  return true;
}

function extractKeywords(filename, frontmatter, body) {
  const out = [];
  const seen = new Set();

  function addPhrase(phrase) {
    if (!phrase) return;
    const cleaned = phrase.toLowerCase().replace(/[^a-z0-9 -]/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned || cleaned.length < MIN_KEYWORD_LEN) return;
    if (seen.has(cleaned)) return;
    seen.add(cleaned);
    out.push(cleaned);
  }

  // 1) Slug (filename without .md), broken on dashes.
  const slug = basename(filename, ".md").toLowerCase();
  if (slug && !STOPWORDS.has(slug)) addPhrase(slug.replace(/-/g, " "));

  // 2) Title phrase from `# /name — title`.
  const titlePhrase = extractTitlePhrase(body).toLowerCase();
  if (titlePhrase) addPhrase(titlePhrase);

  // 3) Description.
  const desc = extractDescription(frontmatter ?? "").toLowerCase();
  if (desc) {
    // Take first 50 chars / first sentence whichever is shorter.
    const firstSentence = desc.split(/[.!?]/)[0]?.trim() ?? "";
    if (firstSentence) addPhrase(firstSentence.slice(0, 60));
  }

  // 4) High-value pattern matches in body (single-word keywords).
  const para = extractFirstParagraph(body);
  for (const re of HIGH_VALUE_PATTERNS) {
    const matches = para.toLowerCase().matchAll(re);
    for (const m of matches) {
      const tok = m[0];
      if (isMeaningfulKeyword(tok)) addPhrase(tok);
      if (out.length >= MAX_KEYWORDS_PER_SKILL) break;
    }
    if (out.length >= MAX_KEYWORDS_PER_SKILL) break;
  }

  // 5) Top-3 unique meaningful tokens from first paragraph (fallback).
  if (out.length < MAX_KEYWORDS_PER_SKILL) {
    const tokens = tokenize(para);
    for (const tok of tokens) {
      if (out.length >= MAX_KEYWORDS_PER_SKILL) break;
      if (!isMeaningfulKeyword(tok)) continue;
      addPhrase(tok);
    }
  }

  return out.slice(0, MAX_KEYWORDS_PER_SKILL);
}

// ─────────────────────────────────────────────────────────────────────────────
// File processing
// ─────────────────────────────────────────────────────────────────────────────

function listSkillFiles(roots) {
  const out = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    let entries;
    try { entries = readdirSync(root, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      if (!ent.name.endsWith(".md")) continue;
      out.push(join(root, ent.name));
    }
  }
  return out;
}

function buildTriggerBlock(keywords, nowIso) {
  const list = keywords.map((k) => JSON.stringify(k)).join(", ");
  return [
    "trigger:",
    "  autoSuggest:",
    `    keywords: [${list}]`,
    `${MARKER_KEY}: ${nowIso}`,
  ].join("\n");
}

function atomicWrite(filePath, content) {
  const tmp = `${filePath}.trigger.tmp`;
  writeFileSync(tmp, content, "utf8");
  try { renameSync(tmp, filePath); }
  catch (err) {
    try { unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

function processFile(filePath, opts) {
  const result = { path: filePath, action: "skip", reason: "", keywords: [] };
  let raw;
  try { raw = readFileSync(filePath, "utf8"); }
  catch (err) {
    result.action = "error";
    result.reason = `read-fail: ${err?.message ?? err}`;
    return result;
  }

  const split = splitFrontmatter(raw);
  if (split.malformed) {
    result.reason = "malformed-frontmatter";
    return result;
  }

  const frontmatter = split.frontmatter;
  const body = split.body;

  if (opts.mode === "revert") {
    if (!frontmatter || !frontmatterHasMarker(frontmatter)) {
      result.reason = "no-marker";
      return result;
    }
    // Strip our trigger block by removing trigger: + autoSuggest: + keywords: + marker.
    const cleanedFm = frontmatter
      .split("\n")
      .filter((line) => !/^trigger\s*:/.test(line))
      .filter((line) => !/^\s+autoSuggest\s*:/.test(line))
      .filter((line) => !/^\s+keywords\s*:/.test(line))
      .filter((line) => !new RegExp(`^${MARKER_KEY}\\s*:`).test(line))
      .join("\n");
    const out = `---\n${cleanedFm}\n---\n${body}`;
    if (opts.apply) {
      try { atomicWrite(filePath, out); }
      catch (err) {
        result.action = "error";
        result.reason = `write-fail: ${err?.message ?? err}`;
        return result;
      }
    }
    result.action = "revert";
    result.reason = "marker-removed";
    return result;
  }

  // Default: backfill mode.
  if (frontmatter && frontmatterHasTrigger(frontmatter)) {
    result.reason = "already-has-trigger";
    return result;
  }

  const keywords = extractKeywords(filePath, frontmatter, body);
  if (keywords.length === 0) {
    result.reason = "no-keywords-extractable";
    return result;
  }
  result.keywords = keywords;

  const triggerBlock = buildTriggerBlock(keywords, opts.nowIso);
  let nextFrontmatter;
  if (frontmatter !== null) {
    nextFrontmatter = `${frontmatter}\n${triggerBlock}`;
  } else {
    // No frontmatter at all — synthesize one.
    nextFrontmatter = triggerBlock;
  }
  const out = `---\n${nextFrontmatter}\n---\n${body}`;

  // Round-trip verify: re-parse and confirm trigger: is present.
  const verify = splitFrontmatter(out);
  if (!verify.frontmatter || !frontmatterHasTrigger(verify.frontmatter)) {
    result.action = "error";
    result.reason = "roundtrip-fail";
    return result;
  }

  if (opts.apply) {
    try { atomicWrite(filePath, out); }
    catch (err) {
      result.action = "error";
      result.reason = `write-fail: ${err?.message ?? err}`;
      return result;
    }
  }
  result.action = "backfill";
  result.reason = `added ${keywords.length} keywords`;
  return result;
}

export function runTriggerBackfill(opts = {}) {
  const roots = opts.roots ?? DEFAULT_ROOTS;
  const apply = !!opts.apply;
  const mode = opts.revert ? "revert" : "backfill";
  const nowIso = opts.nowIso ?? new Date().toISOString();
  const top = opts.top ?? DEFAULT_TOP;

  const allFiles = listSkillFiles(roots).sort();

  const counters = {
    scanned: 0,
    backfilled: 0,
    reverted: 0,
    alreadyHasTrigger: 0,
    noMarker: 0,
    malformed: 0,
    noKeywords: 0,
    errored: 0,
  };
  const results = [];

  let modifiedCount = 0;
  for (const f of allFiles) {
    counters.scanned++;
    if (mode === "backfill" && modifiedCount >= top) {
      // Cap reached — record as scanned-but-skipped for transparency.
      results.push({ path: f, action: "skip", reason: "top-cap-reached", keywords: [] });
      continue;
    }
    const r = processFile(f, { apply, mode, nowIso });
    results.push(r);
    switch (r.action) {
      case "backfill": counters.backfilled++; modifiedCount++; break;
      case "revert": counters.reverted++; break;
      case "error": counters.errored++; break;
      case "skip":
        if (r.reason === "already-has-trigger") counters.alreadyHasTrigger++;
        else if (r.reason === "malformed-frontmatter") counters.malformed++;
        else if (r.reason === "no-keywords-extractable") counters.noKeywords++;
        else if (r.reason === "no-marker") counters.noMarker++;
        break;
    }
  }

  return { mode, apply, roots, top, counters, results };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { apply: false, revert: false, json: false, roots: undefined, top: DEFAULT_TOP, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--revert") out.revert = true;
    else if (a === "--json") out.json = true;
    else if (a === "--root") {
      out.roots ??= [];
      out.roots.push(resolve(argv[++i]));
    }
    else if (a === "--top") out.top = parseInt(argv[++i], 10);
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`skill-trigger-backfill.mjs — add trigger.autoSuggest.keywords to skills lacking it

Modes:
  (default)   dry-run — prints what WOULD change, writes nothing
  --apply     actually write skill .md files (atomic, idempotent)
  --revert    remove only marker-bearing trigger blocks (preserves pre-existing)

Options:
  --top N     cap modifications per run (default ${DEFAULT_TOP})
  --root <p>  override default scan root (repeatable)
  --json      emit machine-readable JSON summary
  -h, --help  this help
`);
}

const isMain = (() => {
  try { return resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (isMain) {
  const args = parseArgs(process.argv);
  if (args.help) { printHelp(); process.exit(0); }
  const summary = runTriggerBackfill({ apply: args.apply, revert: args.revert, roots: args.roots, top: args.top });
  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    const { mode, apply, top, counters } = summary;
    console.log(`skill-trigger-backfill: mode=${mode} apply=${apply} top=${top}`);
    console.log(`  scanned:             ${counters.scanned}`);
    console.log(`  backfilled:          ${counters.backfilled}`);
    console.log(`  reverted:            ${counters.reverted}`);
    console.log(`  already-has-trigger: ${counters.alreadyHasTrigger}`);
    console.log(`  no-marker (revert):  ${counters.noMarker}`);
    console.log(`  malformed:           ${counters.malformed}`);
    console.log(`  no-keywords:         ${counters.noKeywords}`);
    console.log(`  errored:             ${counters.errored}`);
    if (!apply && counters.backfilled + counters.reverted > 0) {
      console.log(`  (DRY-RUN — pass --apply to write)`);
    }
  }
  process.exit(summary.counters.errored > 0 ? 1 : 0);
}
