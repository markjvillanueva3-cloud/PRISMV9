#!/usr/bin/env node
/**
 * extract-skill-triggers.mjs — Phase D.3 of DEV-VELOCITY-AUTOTRIGGER-MS0.
 *
 * Walks every `.claude/commands/*.md` skill manifest (project + global), parses
 * the YAML frontmatter, extracts the `triggers:` block, and writes one JSONL
 * line per trigger to `knowledge/wiki/architecture/_skill-triggers.jsonl`.
 *
 * Consumed by: `skill-auto-trigger.mjs` UserPromptSubmit hook (Phase D.2).
 *
 * Stage-22 integration of `regen-wiki-from-viz.mjs`: shipped as a standalone
 * script here; Phase D.5 wiring step adds it to the regen orchestrator after
 * generate-skill-wiki.mjs (it depends on the same skill discovery walk).
 *
 * Output schema (one JSON object per line):
 *   {
 *     "name": "<skill-name>",
 *     "type": "skill",
 *     "manifest": "<absolute path to .md>",
 *     "matcher": { "type": "keyword", "value": "<regex|alternation>" },
 *     "score": <0..1>,
 *     "action": "suggest"
 *   }
 *
 * Triggers schema in skill frontmatter (per SKILL-AUTO-TRIGGER-PLAN §P3):
 *   triggers:
 *     - event: UserPromptSubmit
 *       matcher:
 *         type: keyword
 *         value: "dispatcher coverage|wiring breakdown"
 *       score: 0.85
 *       action: suggest
 *
 * Idempotency: writes to a temp file then atomic rename; SHA1 of output is
 * compared to last-run fingerprint to skip stable-state regen.
 *
 * Flags:
 *   --dry-run      print summary to stderr; don't write JSONL
 *   --verbose      print per-skill stats
 *   --include-archived   also scan .claude/commands-archive/ (default: skip)
 *   --output=<path>      override default output path
 *
 * Knobs:
 *   PRISM_SKILL_TRIGGERS_MIN_SCORE=<0..1>   floor; triggers below are dropped (default 0.5)
 */
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync, renameSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { createHash } from "node:crypto";

const PRISM_ROOT = "H:/prism";
const OUTPUT_DEFAULT = join(PRISM_ROOT, "knowledge/wiki/architecture/_skill-triggers.jsonl");
const FINGERPRINT_PATH = join(PRISM_ROOT, "knowledge/wiki/architecture/.skill-triggers-fingerprint");

// Skill manifest directories (precedence: project > global > archive)
const SKILL_DIRS = [
  join(PRISM_ROOT, ".claude/commands"),
  "C:/Users/wompu/.claude/commands",
  "C:/Users/Mark Villanueva/.claude/commands",
];
const ARCHIVE_DIRS = [
  join(PRISM_ROOT, ".claude/commands-archive"),
  "C:/Users/wompu/.claude/commands-archive",
];

const MIN_SCORE = parseFloat(process.env.PRISM_SKILL_TRIGGERS_MIN_SCORE || "0.5");

const args = new Set(process.argv.slice(2));
const FLAGS = {
  dryRun: args.has("--dry-run"),
  verbose: args.has("--verbose"),
  includeArchived: args.has("--include-archived"),
};
let outputPath = OUTPUT_DEFAULT;
for (const a of process.argv.slice(2)) {
  if (a.startsWith("--output=")) outputPath = a.slice("--output=".length);
}

function listSkillFiles() {
  const dirs = FLAGS.includeArchived ? [...SKILL_DIRS, ...ARCHIVE_DIRS] : SKILL_DIRS;
  const seen = new Map();   // name -> path (first wins; project beats global beats archive)
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    try {
      for (const f of readdirSync(d)) {
        if (!f.endsWith(".md")) continue;
        const name = f.slice(0, -3);
        if (seen.has(name)) continue;
        seen.set(name, join(d, f));
      }
    } catch { /* skip unreadable dir */ }
  }
  return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

// Naive frontmatter extractor. Skill YAML is small + predictable per the plan;
// we only need to find the `triggers:` block under it. Full YAML parser would
// pull in a dep — this approach is forgiving + fast.
function extractFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  // Find the closing --- on its own line
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  return m ? m[1] : null;
}

/**
 * Parse `triggers:` block out of the YAML frontmatter (naive but robust).
 * Returns an array of { matcher: {type, value, command_regex?}, score, action, event }.
 */
function parseTriggers(fm) {
  if (!fm) return [];
  const lines = fm.split(/\r?\n/);

  // Find `triggers:` line
  let i = 0;
  while (i < lines.length && !/^triggers:\s*$/.test(lines[i])) i++;
  if (i >= lines.length) return [];
  i++; // past `triggers:`

  // Each entry starts with `  - event:` or `  -` then nested 4-space indents
  // We tolerate 2- or 4-space outer indent, but require consistent within a doc.
  const entries = [];
  let current = null;
  let inMatcher = false;
  const ENTRY_RE = /^(\s+)- (.*)$/;
  const KV_RE = /^(\s+)([\w_-]+):\s*(.*)$/;

  for (; i < lines.length; i++) {
    const line = lines[i];
    // Empty line or different top-level key → stop
    if (/^\S/.test(line) && line.trim().length > 0 && !line.startsWith("#")) break;
    if (line.trim() === "") continue;

    const em = line.match(ENTRY_RE);
    if (em) {
      // New entry
      if (current) entries.push(current);
      current = { event: null, matcher: {}, score: undefined, action: "suggest" };
      inMatcher = false;
      // Inline KV after the dash, e.g. `- event: UserPromptSubmit`
      const rest = em[2].trim();
      const inlineKv = rest.match(/^([\w_-]+):\s*(.*)$/);
      if (inlineKv) {
        const k = inlineKv[1];
        const v = stripQuotes(inlineKv[2]);
        if (k === "event") current.event = v;
        else if (k === "score") current.score = parseFloat(v);
        else if (k === "action") current.action = v;
      }
      continue;
    }
    const km = line.match(KV_RE);
    if (km && current) {
      const k = km[2];
      const v = stripQuotes(km[3]);
      if (k === "matcher") {
        inMatcher = true;
        continue;
      }
      if (inMatcher) {
        // Detect end of matcher block by indent comparison — naive: if next key
        // is at outer indent of the entry, stop nesting. We treat all keys
        // appearing AFTER `matcher:` as matcher children until we hit `score`,
        // `action`, or `event` again (which are top-level entry keys).
        if (["score", "action", "event"].includes(k)) {
          inMatcher = false;
          if (k === "event") current.event = v;
          else if (k === "score") current.score = parseFloat(v);
          else if (k === "action") current.action = v;
        } else {
          current.matcher[k] = v;
        }
      } else {
        if (k === "event") current.event = v;
        else if (k === "score") current.score = parseFloat(v);
        else if (k === "action") current.action = v;
      }
      continue;
    }
    // Anything else → treat as block-end (defensive)
    break;
  }
  if (current) entries.push(current);
  return entries;
}

function stripQuotes(s) {
  s = (s || "").trim();
  // Trim trailing comment
  const hash = s.indexOf(" #");
  if (hash >= 0) s = s.slice(0, hash).trim();
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  return s;
}

function extractName(fm, fallback) {
  if (!fm) return fallback;
  const m = fm.match(/^name:\s*(.+)$/m);
  if (m) return stripQuotes(m[1]) || fallback;
  return fallback;
}

function djb2Hex(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function atomicWrite(path, content) {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

function main() {
  const files = listSkillFiles();
  const out = [];
  let scanned = 0, withTriggers = 0, totalTriggers = 0, dropped = 0;

  for (const [name, path] of files) {
    scanned++;
    let text = "";
    try { text = readFileSync(path, "utf8"); } catch { continue; }
    const fm = extractFrontmatter(text);
    if (!fm) continue;
    // Only emit `event: UserPromptSubmit` triggers for now (D.2 hook only cares about that event)
    const entries = parseTriggers(fm);
    if (!entries.length) continue;
    withTriggers++;
    const skillName = extractName(fm, name);
    for (const e of entries) {
      if (e.event && e.event !== "UserPromptSubmit") continue;
      if (!e.matcher || !e.matcher.value) continue;
      const score = typeof e.score === "number" ? e.score : 0.7;
      if (score < MIN_SCORE) { dropped++; continue; }
      const action = e.action || "suggest";
      out.push({
        name: skillName,
        type: "skill",
        manifest: path.replace(/\\/g, "/"),
        matcher: e.matcher,
        score,
        action,
      });
      totalTriggers++;
    }
    if (FLAGS.verbose) {
      try { process.stderr.write(`  ${name}: ${entries.length} entries, ${out.filter(x => x.name === skillName).length} emitted\n`); } catch { /* */ }
    }
  }

  // Idempotency fingerprint
  const content = out.map(o => JSON.stringify(o)).join("\n") + "\n";
  const hash = createHash("sha1").update(content).digest("hex");
  const lastHash = existsSync(FINGERPRINT_PATH) ? readFileSync(FINGERPRINT_PATH, "utf8").trim() : "";

  process.stderr.write(`extract-skill-triggers: scanned=${scanned} withTriggers=${withTriggers} totalTriggers=${totalTriggers} dropped(<${MIN_SCORE})=${dropped}\n`);

  if (FLAGS.dryRun) {
    process.stderr.write(`DRY-RUN — would write ${out.length} triggers to ${outputPath}\n`);
    process.stderr.write(`hash: ${hash.slice(0, 16)} (last: ${lastHash.slice(0, 16) || "none"})\n`);
    return 0;
  }
  if (hash === lastHash) {
    process.stderr.write(`extract-skill-triggers: no changes (fingerprint match) — skipping write\n`);
    return 0;
  }
  atomicWrite(outputPath, content);
  atomicWrite(FINGERPRINT_PATH, hash + "\n");
  process.stderr.write(`extract-skill-triggers: wrote ${out.length} lines to ${outputPath}\n`);
  return 0;
}

try {
  process.exit(main());
} catch (e) {
  process.stderr.write(`extract-skill-triggers fatal: ${e.message}\n${e.stack}\n`);
  process.exit(1);
}
