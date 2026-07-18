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
import { fileURLToPath } from "node:url";

const PRISM_ROOT = "H:/prism";
const OUTPUT_DEFAULT = join(PRISM_ROOT, "knowledge/wiki/architecture/_skill-triggers.jsonl");
const FINGERPRINT_PATH = join(PRISM_ROOT, "knowledge/wiki/architecture/.skill-triggers-fingerprint");

// Skill manifest directories (precedence: project > global > archive).
// PRISM_SKILL_DIRS / PRISM_SKILL_ARCHIVE_DIRS override the defaults — semicolon-
// or path-separator-delimited; used by the regression test to point at tmpdirs.
function fromEnvDirs(envVal, defaults) {
  if (!envVal) return defaults;
  // Windows uses `;` between paths (drive letters contain `:`); POSIX uses `:`.
  // Splitting on `[;:]` on Windows corrupts `C:/Users/...` into `["C", "/Users/..."]`.
  const sep = process.platform === "win32" ? ";" : ":";
  return envVal.split(sep).map(s => s.trim()).filter(Boolean);
}
const SKILL_DIRS = fromEnvDirs(process.env.PRISM_SKILL_DIRS, [
  join(PRISM_ROOT, ".claude/commands"),
  // 2026-05-28 slot:alpha — drive-swap portability rule (CLAUDE.md): user-authored
  // skills live at H:/.claude/<authored> for portability. Pre-add this BEFORE the
  // C: path so H:-authored skills win the precedence race (project > global).
  // Without this entry, skills authored at H:/.claude/commands/ (the canonical
  // user-globals path per the c-to-h mirror rule) are silently ignored by the
  // extractor → never reach _skill-triggers.jsonl → skill-auto-trigger.mjs never
  // fires them → INVOKE_NOW directive never emits for them. forge-audit-v3 hit
  // this gap on first ship.
  "H:/.claude/commands",
  "C:/Users/wompu/.claude/commands",
  "C:/Users/Mark Villanueva/.claude/commands",
]);
const ARCHIVE_DIRS = fromEnvDirs(process.env.PRISM_SKILL_ARCHIVE_DIRS, [
  join(PRISM_ROOT, ".claude/commands-archive"),
  "C:/Users/wompu/.claude/commands-archive",
]);

const MIN_SCORE = parseFloat(process.env.PRISM_SKILL_TRIGGERS_MIN_SCORE || "0.5");

// INVOKE_NOW (2026-05-28 slot:alpha) — extractor-side allowlist that promotes
// these 17 imperative skills from action:"suggest" → action:"invoke" with a
// score floor of 0.85 so the consumer hook (skill-auto-trigger.mjs) emits a
// MANDATORY directive instead of an advisory nudge. Per 2026-05-19 audit:
// Layer-2 hooks cannot themselves invoke skills, but a sufficiently directive
// nudge moves the model from "ignore" to "invoke". Keep this list tight
// (≤20) — every entry erodes the precision of the top-K BM25 surface.
const INVOKE_NOW_MIN_SCORE = parseFloat(process.env.PRISM_SKILL_INVOKE_NOW_MIN || "0.85");
const INVOKE_NOW_SKILLS = new Set([
  // Pre-build / anti-duplication gates (Karpathy R8: read-before-write)
  "dedup",
  // Build orchestration (operator-facing imperatives)
  "forge7", "forge-audit-v2", "forge-audit-v3", "forge-triple", "scrutinize",
  // Session-lifecycle skills (precompact/compact/handoff/checkpoint) are
  // DELIBERATELY EXCLUDED -- STATE-gated, not keyword-gated. Promoting them to
  // action:invoke made a prompt that merely *mentions* compaction/handoff emit a
  // MANDATORY /precompact directive (slot:alpha 2026-06-11, fired at 18% context).
  // Pressure-based compaction is owned by precompact-auto-trigger.mjs; handoff
  // fires on Stop. Consumer skill-auto-trigger.mjs also skips them.
  // Domain studios (100%-domain-specific keywords)
  "wire-edm-studio", "lathe-studio", "quote-to-ship",
  // Consensus + index
  "octopus", "wiki-query", "master-index",
  // Pick discipline
  "pick-unit", "pick-build-close",
]);

// Defense-in-depth (slot:alpha 2026-06-11): session-lifecycle skills must NEVER
// be promoted to action:invoke -- they are STATE-gated (see the consumer
// skill-auto-trigger.mjs LIFECYCLE_STATE_GATED_SKILLS). Fail LOUD at extraction
// if a future edit re-adds one, instead of silently re-stamping the jsonl.
const LIFECYCLE_NEVER_INVOKE = ["precompact", "compact", "handoff", "checkpoint"];
for (const s of LIFECYCLE_NEVER_INVOKE) {
  if (INVOKE_NOW_SKILLS.has(s)) {
    throw new Error(`extract-skill-triggers: lifecycle skill "${s}" must NOT be in INVOKE_NOW_SKILLS (state-gated; see skill-auto-trigger.mjs).`);
  }
}

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

// Returns EVERY (name,path) tuple across given dirs — no first-wins dedup.
// Same-name skills in multiple trees both feed the parser; trigger-row dedup
// happens at emission, keyed (name, event, matcher.value).
export function listSkillSources(dirs) {
  const out = [];
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    try {
      for (const f of readdirSync(d)) {
        if (!f.endsWith(".md")) continue;
        out.push({ name: f.slice(0, -3), path: join(d, f) });
      }
    } catch { /* skip unreadable dir */ }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

function listSkillFiles() {
  const seen = new Map();
  for (const { name, path } of listSkillSources(SKILL_DIRS)) {
    if (!seen.has(name)) seen.set(name, path);
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
      current = { event: null, matcher: {}, score: undefined, action: "suggest", pathGlob: null };
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
      } else {
        // Flat-string trigger shape, e.g. `  - "why this prediction"` or `  - wedm explain`.
        // Common in WEDM/wiring/lathe/mill skill manifests where triggers are bare keywords.
        // Synthesize a default UserPromptSubmit/keyword/suggest record; subsequent nested
        // keys (score, action, matcher) on later lines still override these defaults.
        const flat = stripQuotes(rest);
        // Guard YAML null/empty scalars (~ null Null NULL [] {}) — would otherwise emit
        // a meaningless trigger row. Per Arm A scrutiny P1.
        const YAML_NULL_RE = /^(~|null|Null|NULL|\[\]|\{\})$/;
        if (flat && !YAML_NULL_RE.test(flat)) {
          current.event = "UserPromptSubmit";
          current.matcher = { type: "keyword", value: flat };
          // 0.7 = "synthesized default" — curated entries score 0.75–0.85, so synthesized
          // never out-ranks a curated trigger on the same prompt. Do not raise without
          // re-evaluating top-K drown risk in skill-auto-trigger.mjs.
          current.score = 0.7;
          current.action = "suggest";
        }
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
        // `action`, `event`, or `pathGlob` again (which are top-level entry keys).
        if (["score", "action", "event", "pathGlob"].includes(k)) {
          inMatcher = false;
          if (k === "event") current.event = v;
          else if (k === "score") current.score = parseFloat(v);
          else if (k === "action") current.action = v;
          else if (k === "pathGlob") current.pathGlob = v;
        } else {
          current.matcher[k] = v;
        }
      } else {
        if (k === "event") current.event = v;
        else if (k === "score") current.score = parseFloat(v);
        else if (k === "action") current.action = v;
        else if (k === "pathGlob") current.pathGlob = v;
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
  const sources = listSkillSources(FLAGS.includeArchived ? [...SKILL_DIRS, ...ARCHIVE_DIRS] : SKILL_DIRS);
  const out = [];
  // emission-level dedup: same (name, event, matcher.value) collapses across trees
  const seenTriggers = new Set();
  const namesWithTriggers = new Set();
  let scanned = 0, totalTriggers = 0, dropped = 0, dedupedCrossTree = 0;
  const perSkillEmitted = new Map(); // for --verbose stats

  for (const { name, path } of sources) {
    scanned++;
    let text = "";
    try { text = readFileSync(path, "utf8"); } catch { continue; }
    const fm = extractFrontmatter(text);
    if (!fm) continue;
    const entries = parseTriggers(fm);
    if (!entries.length) continue;
    const skillName = extractName(fm, name);
    let emittedHere = 0;
    for (const e of entries) {
      if (e.event && e.event !== "UserPromptSubmit") continue;
      if (!e.matcher || !e.matcher.value) continue;
      const score = typeof e.score === "number" ? e.score : 0.7;
      if (score < MIN_SCORE) { dropped++; continue; }
      const event = e.event || "UserPromptSubmit";
      // Dedup key — (name, event, matcher.value). Same trigger appearing in both
      // project + user trees collapses to a single emission; the first one wins
      // (precedence is project < user-globals via SKILL_DIRS order, so the
      // higher-precedence project version wins identical triggers).
      // U+241F unit-separator: disjoint from any name/event/value char, so
      // "fooBar"+"" cannot collide with "foo"+"Bar". (was bare U+0001 SOH.)
      const dedupKey = `${skillName}␟${event}␟${e.matcher.value}`;
      if (seenTriggers.has(dedupKey)) { dedupedCrossTree++; continue; }
      seenTriggers.add(dedupKey);
      // INVOKE_NOW promotion (2026-05-28 slot:alpha — operator: "I have to tell you
      // to use forge commands and most slash commands"): allowlisted imperative
      // skills get action:"invoke" + score upgraded to ≥0.85 so the consumer hook
      // (skill-auto-trigger.mjs) emits a directive instead of an advisory nudge.
      // Per 2026-05-19 audit: Layer-2 hooks cannot themselves invoke skills, but a
      // sufficiently directive nudge moves the model from "ignore" to "invoke".
      const isInvokeNow = INVOKE_NOW_SKILLS.has(skillName);
      const finalScore = isInvokeNow ? Math.max(score, INVOKE_NOW_MIN_SCORE) : score;
      const finalAction = isInvokeNow ? "invoke" : (e.action || "suggest");
      const triggerOut = {
        name: skillName,
        type: "skill",
        manifest: path.replace(/\\/g, "/"),
        matcher: e.matcher,
        score: finalScore,
        action: finalAction,
      };
      // E1 (DOMAIN-GALAXY-DOCTRINE-MS1): emit pathGlob only when explicitly set
      // on the skill frontmatter — keeps the JSONL minimal for the ~95% of
      // skills that don't need path-scoping. Consumer (skill-auto-trigger.mjs
      // matchesPathGlob) treats absent field as "always applicable".
      if (e.pathGlob != null && e.pathGlob !== "") triggerOut.pathGlob = e.pathGlob;
      out.push(triggerOut);
      totalTriggers++;
      emittedHere++;
      namesWithTriggers.add(skillName);
    }
    if (emittedHere > 0) {
      perSkillEmitted.set(skillName, (perSkillEmitted.get(skillName) || 0) + emittedHere);
    }
    if (FLAGS.verbose && emittedHere > 0) {
      try { process.stderr.write(`  ${name}: ${entries.length} entries, ${emittedHere} emitted (${path.replace(/\\/g, "/")})\n`); } catch { /* */ }
    }
  }
  const withTriggers = namesWithTriggers.size;

  // Idempotency fingerprint
  const content = out.map(o => JSON.stringify(o)).join("\n") + "\n";
  const hash = createHash("sha1").update(content).digest("hex");
  const lastHash = existsSync(FINGERPRINT_PATH) ? readFileSync(FINGERPRINT_PATH, "utf8").trim() : "";

  process.stderr.write(`extract-skill-triggers: scanned=${scanned} withTriggers=${withTriggers} totalTriggers=${totalTriggers} dedupedCrossTree=${dedupedCrossTree} dropped(<${MIN_SCORE})=${dropped}\n`);

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

// CLI entry — guarded so `import`ing this module (for listSkillSources) does
// NOT run the extractor or call process.exit().
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    process.exit(main());
  } catch (e) {
    process.stderr.write(`extract-skill-triggers fatal: ${e.message}\n${e.stack}\n`);
    process.exit(1);
  }
}
