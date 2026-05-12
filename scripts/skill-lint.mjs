#!/usr/bin/env node
/**
 * skill-lint.mjs — U-SKU03 (SKILLS-UTILIZATION-MS0) static skill-quality linter.
 *
 * @eng_khairallah1 Phase-2 doctrine: "Vague language like 'format nicely' or
 * 'handle appropriately' is banned. Every instruction must be specific and
 * testable. Keep the entire file under 500 lines." This is the cheapest,
 * most-automatable quality lever — a static linter catches the bulk of bad
 * skills without an LLM call.
 *
 * Rules (a flagged skill trips ≥1):
 *   R1  vague-verb ban       — body contains a banned vague phrase outside fenced
 *                              code / quoted spans (`format nicely`, `handle
 *                              appropriately`, `as needed`, `etc.`, `various`, …).
 *   R2  body-line cap        — > 500 *instruction* lines (fenced-code lines are
 *                              excluded so a big embedded example doesn't push a
 *                              small skill over). Advisory R2a when a single
 *                              example block dominates a >500-line file.
 *   R3  trigger-phrase floor — description yields < 3 distinct trigger phrases.
 *                              Exempt when `disable-model-invocation: true`
 *                              (the description isn't loaded for those).
 *   R4  placeholder language — body contains `TODO` / `TBD` / `FIXME` /
 *                              `<insert …>` / `[your …]` / `stub` / `placeholder`
 *                              outside fenced code.
 *   R5  description over cap  — frontmatter `description` > 1024 chars.
 *   R6  stub-assertion smell  — body contains `.toBeDefined()` / bare
 *                              `.toBeTruthy()` / `expect(true).toBe(true)` style
 *                              non-assertions (a skill propagating PRISM-R9-banned
 *                              test stubs). Searched everywhere, incl. code blocks.
 *   R7  no output example    — advisory: body never shows "what perfect output
 *                              looks like" (a fenced block / table near the words
 *                              example / output / perfect / returns / result).
 *   BROKEN  parse error      — frontmatter `---` block opened but never closed,
 *                              or otherwise unparseable.
 *
 * It does NOT re-check the *structural template* (`## PURPOSE` / `## WHEN TO USE`
 * / …) — that's `scripts/skill_validator.py`'s job (a distinct, legacy concern).
 * The vague-/placeholder-/line-count primitives are the ones the U-SKU06 registry
 * builder already uses, imported from `mcp-server/src/schemas/skillQualitySchema.ts`
 * so the linter and the `SKILL_QUALITY_REGISTRY.json` row for a skill never disagree.
 *
 * Modes:
 *   node scripts/skill-lint.mjs                 # full sweep over every skill root → state/shared/skill-lint-report.json; exit = flagged count
 *   node scripts/skill-lint.mjs --project-only  # skip ~/.claude user roots — deterministic CI subset
 *   node scripts/skill-lint.mjs --from-registry # don't re-walk; lint the already-written SKILL_QUALITY_REGISTRY.json (faster; warns if stale)
 *   node scripts/skill-lint.mjs --rebuild-registry  # refresh SKILL_QUALITY_REGISTRY.json + sidecar first, then lint the fresh data
 *   node scripts/skill-lint.mjs --roots <dir>   # lint only the `*.md` files in <dir> (flat layout) — for tests / single-dir audits
 *   node scripts/skill-lint.mjs --self-test     # run R1..R6 + BROKEN against synthetic fixtures; exit 0 iff all behave as specified
 *   node scripts/skill-lint.mjs --fix [--apply] # dry-run fix suggestions (R2 split points, R4 placeholder lines); --apply performs the safe R2 split
 *   node scripts/skill-lint.mjs --json          # machine-readable summary on stdout
 *   node scripts/skill-lint.mjs --report <path> # write the report somewhere other than the default
 *   node scripts/skill-lint.mjs --no-write      # don't write the report file (stdout only)
 *
 * Exit code: number of flagged skills (BROKEN/MAJOR/MINOR — advisory-only skills
 * don't bump it), capped at 250 to stay clear of the shell-reserved range; 0 when
 * clean. `--self-test` exits 0/1 independently of the live library. Hard failure
 * (no roots at all, write error, tsx import failure) → exit 1 with a diagnostic on stderr.
 *
 * @module scripts/skill-lint
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { register } from "tsx/esm/api";

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const REPORT_VERSION = "1.0.0";

// --- argv -------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (...names) => names.some((n) => args.includes(n));
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
};
const OPTS = {
  help: flag("--help", "-h"),
  selfTest: flag("--self-test", "--selftest"),
  projectOnly: flag("--project-only", "--skip-user-roots"),
  fromRegistry: flag("--from-registry"),
  rebuildRegistry: flag("--rebuild-registry"),
  fix: flag("--fix"),
  apply: flag("--apply"),
  json: flag("--json"),
  quiet: flag("--quiet", "-q"),
  noWrite: flag("--no-write"),
  reportPath: opt("--report"),
  rootsDir: opt("--roots"),          // lint only this directory (flat `*.md` layout) — for tests / single-dir audits
};

const USAGE = `skill-lint.mjs — static skill-quality linter (U-SKU03)

  node scripts/skill-lint.mjs [--project-only|--from-registry|--rebuild-registry|--roots <dir>]
  node scripts/skill-lint.mjs --self-test
  node scripts/skill-lint.mjs --fix [--apply]
  flags: --json  --quiet  --no-write  --report <path>

Rules: R1 vague-verb ban · R2 >500 instruction lines · R3 <3 trigger phrases
       R4 placeholder language · R5 description >1024 chars · R6 stub-assertion smell
       R7 (advisory) no output example · BROKEN unparseable frontmatter
Exit code = flagged-skill count (0 = clean). --self-test exits 0/1 vs fixtures.`;

// --- stub-assertion patterns (R6) — not in the shared schema because they're a
//     "skill teaches bad test practice" smell, searched everywhere incl. code ----
const STUB_ASSERTION_PATTERNS = [
  { id: "toBeDefined", re: /\.toBeDefined\s*\(\s*\)/ },
  { id: "toBeUndefined-only", re: /expect\([^)]*\)\.toBeUndefined\s*\(\s*\)/ },
  { id: "toBeTruthy-bare", re: /\.toBeTruthy\s*\(\s*\)\s*;?\s*$/m },
  { id: "tautology-true", re: /expect\(\s*true\s*\)\s*\.toBe\(\s*true\s*\)/ },
  { id: "tautology-num", re: /expect\(\s*(\d+)\s*\)\s*\.toBe\(\s*\1\s*\)/ },
];

// BROKEN > MAJOR > MINOR are "flagging" severities (count toward the exit code and the
// "flagged" headline). ADVISORY findings (R2a large-example, R6 stub-assertion smell,
// R7 missing output example) are always surfaced in the report + byRule tallies but a
// skill whose *only* findings are advisory is not "flagged" and does not bump the exit code.
const SEVERITY_RANK = { BROKEN: 3, MAJOR: 2, MINOR: 1, ADVISORY: 0 };
const SEVERITY_NAMES = ["BROKEN", "MAJOR", "MINOR", "ADVISORY"];
const RULE_SEVERITY = { R1: "MAJOR", R2: "MAJOR", R2a: "ADVISORY", R3: "MAJOR", R4: "MAJOR", R5: "MINOR", R6: "ADVISORY", R7: "ADVISORY", parse: "BROKEN" };

// ============================================================================
//  Core: lint one skill file. Pure (apart from the fs.read). Reused by the
//  live sweep, the --from-registry path, and --self-test.
// ============================================================================

/**
 * Lint a single skill file. Reads `absPath`, parses it, runs R1..R7. The full
 * (un-truncated) `description` is taken from the file's own frontmatter — never
 * from a registry hint, since the registry stores it truncated to the 1024-char
 * cap and that would mask R5. The only hint honoured is `disableModelInvocation`
 * (the registry's normalized value, more reliable than re-deriving the key spelling).
 *
 * @param {string} absPath
 * @param {object} schema   the imported skillQualitySchema module
 * @param {{ disableModelInvocation?: boolean }} [hint]
 * @returns {{ broken: null | { rule:"parse", detail:string }, findings: Array<object>, instructionLines:number, vague:string[] }}
 */
function lintOneFile(absPath, schema, hint = {}) {
  let content;
  try {
    content = fs.readFileSync(absPath, "utf8");
  } catch (e) {
    return { broken: { rule: "parse", detail: `unreadable: ${e instanceof Error ? e.message : String(e)}` }, findings: [], instructionLines: 0, vague: [] };
  }
  const parsed = schema.parseSkillFile(content);
  if (parsed.parseError) {
    return { broken: { rule: "parse", detail: parsed.parseError }, findings: [], instructionLines: 0, vague: [] };
  }
  const body = parsed.body ?? "";
  const fm = parsed.frontmatter ?? {};
  const description = typeof fm.description === "string" ? fm.description : "";
  const disableModelInvocation =
    hint.disableModelInvocation === true ||
    fm["disable-model-invocation"] === true ||
    fm.disable_model_invocation === true ||
    fm.disableModelInvocation === true;

  const findings = [];

  // R1 — vague-verb ban (fenced-code + quote aware via the shared helper)
  const vague = schema.detectVagueLanguageViolations(body);
  if (vague.length) findings.push({ rule: "R1", severity: RULE_SEVERITY.R1, phrases: vague });

  // R2 — body instruction-line cap (+ R2a advisory: a single example dominates)
  const lc = schema.countBodyLines(body);
  if (lc.instructionLines > schema.SKILL_BODY_LINE_CAP) {
    findings.push({ rule: "R2", severity: RULE_SEVERITY.R2, instructionLines: lc.instructionLines, cap: schema.SKILL_BODY_LINE_CAP });
  } else if (lc.totalLines > schema.SKILL_BODY_LINE_CAP && lc.codeLines > lc.instructionLines) {
    findings.push({ rule: "R2a", severity: RULE_SEVERITY.R2a, note: "large_example_block", instructionLines: lc.instructionLines, codeLines: lc.codeLines });
  }

  // R3 — trigger-phrase floor (exempt for disable-model-invocation skills)
  if (!disableModelInvocation) {
    const phrases = schema.extractTriggerPhrases(description);
    if (phrases.length < schema.SKILL_MIN_TRIGGER_PHRASES) {
      findings.push({ rule: "R3", severity: RULE_SEVERITY.R3, triggerPhrases: phrases.length, floor: schema.SKILL_MIN_TRIGGER_PHRASES, sample: phrases });
    }
  }

  // R4 — placeholder / stub language (outside fenced code, via the shared helper)
  const placeholders = schema.detectPlaceholderViolations(body);
  if (placeholders.length) findings.push({ rule: "R4", severity: RULE_SEVERITY.R4, markers: placeholders });

  // R5 — description over the 1024-char cap
  if (description.length > schema.SKILL_DESCRIPTION_MAX_CHARS) {
    findings.push({ rule: "R5", severity: RULE_SEVERITY.R5, descLength: description.length, max: schema.SKILL_DESCRIPTION_MAX_CHARS });
  }

  // R6 — stub-assertion smell (anywhere, incl. code blocks)
  const stubHits = STUB_ASSERTION_PATTERNS.filter((p) => p.re.test(body)).map((p) => p.id);
  if (stubHits.length) findings.push({ rule: "R6", severity: RULE_SEVERITY.R6, patterns: stubHits });

  // R7 — advisory: no "perfect output" example
  if (!schema.detectOutputExample(body)) {
    findings.push({ rule: "R7", severity: RULE_SEVERITY.R7, note: "no perfect-output example near 'example/output/perfect/returns'" });
  }

  return { broken: null, findings, instructionLines: lc.instructionLines, vague };
}

/** Highest severity among a skill's findings ("BROKEN" if it failed to parse, "OK" if none). */
function worstSeverity(findings, broken) {
  if (broken) return "BROKEN";
  if (!findings.length) return "OK";
  let rank = SEVERITY_RANK.ADVISORY;
  for (const f of findings) rank = Math.max(rank, SEVERITY_RANK[f.severity] ?? SEVERITY_RANK.ADVISORY);
  return SEVERITY_NAMES.find((n) => SEVERITY_RANK[n] === rank) ?? "ADVISORY";
}

/** A skill counts toward the "flagged" headline + the exit code iff its worst severity outranks ADVISORY. */
function isFlagging(sev) {
  return sev === "BROKEN" || sev === "MAJOR" || sev === "MINOR";
}

// ============================================================================
//  --fix suggestions
// ============================================================================

function suggestSplit(absPath) {
  const content = fs.readFileSync(absPath, "utf8");
  const lines = content.split(/\r?\n/);
  // find `## ` (and `### `) headings outside fenced code, with their line spans
  const sections = [];
  let inFence = false;
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) inFence = !inFence;
    if (!inFence && /^#{2,3}\s+\S/.test(lines[i])) {
      if (cur) { cur.end = i - 1; sections.push(cur); }
      cur = { title: lines[i].replace(/^#{2,3}\s+/, "").trim(), start: i, end: lines.length - 1 };
    }
  }
  if (cur) sections.push(cur);
  for (const s of sections) s.lineCount = s.end - s.start + 1;
  sections.sort((a, b) => b.lineCount - a.lineCount);
  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "section";
  const base = path.basename(absPath).replace(/\.md$/i, "");
  return sections.slice(0, 3).map((s) => ({
    section: s.title,
    lines: s.lineCount,
    suggestedFile: `${base}-${slug(s.title)}.md`,
    span: `${s.start + 1}-${s.end + 1}`,
  }));
}

function listPlaceholders(absPath, schema) {
  const content = fs.readFileSync(absPath, "utf8");
  const parsed = schema.parseSkillFile(content);
  const body = parsed.body ?? content;
  const ids = schema.detectPlaceholderViolations(body);
  if (!ids.length) return [];
  // re-scan the body line-by-line (outside fences) so we can give file:line
  const lines = body.split(/\r?\n/);
  const out = [];
  let inFence = false;
  const PATS = [
    { id: "todo", re: /\bTODO\b/ }, { id: "tbd", re: /\bTBD\b/ }, { id: "fixme", re: /\bFIXME\b/ },
    { id: "insert-here", re: /<\s*insert\b/i }, { id: "your-placeholder", re: /\[\s*your\s+\w+/i },
    { id: "stub", re: /\bstub\b/i }, { id: "placeholder", re: /\bplaceholder\b/i },
  ];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) { inFence = !inFence; continue; }
    if (inFence) continue;
    for (const p of PATS) if (p.re.test(lines[i])) out.push({ line: i + 1, marker: p.id, text: lines[i].trim().slice(0, 100) });
  }
  return out;
}

/** Perform the one safe auto-fix: split an over-length skill's largest section into a sibling file. */
function applySplit(absPath) {
  // refuse on a dirty working tree (don't clobber WIP)
  try {
    const st = execFileSync("git", ["status", "--porcelain", "--", absPath], { cwd: path.dirname(absPath), encoding: "utf8" }).trim();
    if (st) return { ok: false, reason: `working-tree changes present for ${path.basename(absPath)} — commit/stash them first` };
  } catch {
    /* not a git repo, or git missing — fall through; we still write a .lint-bak */
  }
  const suggestions = suggestSplit(absPath);
  if (!suggestions.length) return { ok: false, reason: "no `##` sections to split" };
  const content = fs.readFileSync(absPath, "utf8");
  const lines = content.split(/\r?\n/);
  // re-locate the largest section's span (suggestSplit sorted by size; [0] is largest)
  const top = suggestions[0];
  const [startLine, endLine] = top.span.split("-").map((n) => parseInt(n, 10));
  const sectionText = lines.slice(startLine - 1, endLine).join("\n");
  const siblingPath = path.join(path.dirname(absPath), top.suggestedFile);
  if (fs.existsSync(siblingPath)) return { ok: false, reason: `sibling ${top.suggestedFile} already exists` };
  fs.writeFileSync(`${absPath}.lint-bak`, content);
  fs.writeFileSync(siblingPath, `<!-- split out of ${path.basename(absPath)} by skill-lint --fix --apply to stay under the ${500}-line cap -->\n\n${sectionText}\n`);
  const pointer = `> 📎 **${top.section}** moved to [\`${top.suggestedFile}\`](./${top.suggestedFile}) — kept under the 500-line cap (skill-lint --fix).`;
  const next = [...lines.slice(0, startLine - 1), pointer, ...lines.slice(endLine)];
  fs.writeFileSync(absPath, next.join("\n"));
  // re-lint the trimmed file
  return { ok: true, sibling: siblingPath, backup: `${absPath}.lint-bak`, movedSection: top.section, movedLines: top.lines };
}

// ============================================================================
//  --self-test : synthetic fixtures
// ============================================================================

function runSelfTest(schema) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-lint-selftest-"));
  const cases = [];
  const w = (name, text) => { const p = path.join(dir, name); fs.writeFileSync(p, text); return p; };

  const cleanDesc = 'Use when the user asks to "validate a config", "check a manifest", or "audit settings before deploy" — runs the schema checker.';
  const cleanBody = [
    "# /clean-skill", "", "Validates configuration files against the project schema.", "",
    "## Steps", "1. Read the target file.", "2. Parse it.", "3. Report any keys that violate the schema.", "",
    "## Output", "```", "config.yml: 2 violations — `port` must be int, `host` required", "```", "",
  ].join("\n");
  cases.push({ name: "clean", file: w("clean.md", `---\nname: clean-skill\ndescription: ${cleanDesc}\n---\n${cleanBody}`), expect: { broken: false, has: [], hasNot: ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "parse"] } });

  cases.push({ name: "vague-body", file: w("vague.md", `---\nname: vague-skill\ndescription: ${cleanDesc}\n---\n# /vague\n\nFormat it nicely and handle the result appropriately.\n\n## Output\n\`\`\`\nok\n\`\`\`\n`), expect: { broken: false, has: ["R1"], hasNot: ["parse"] } });

  const longBody = ["# /long", "", "## Body"].concat(Array.from({ length: 600 }, (_, i) => `Step ${i + 1}: do the specific concrete thing number ${i + 1}.`)).join("\n");
  cases.push({ name: "long-body", file: w("long.md", `---\nname: long-skill\ndescription: ${cleanDesc}\n---\n${longBody}\n`), expect: { broken: false, has: ["R2"], hasNot: ["parse"] } });

  cases.push({ name: "one-phrase", file: w("onephrase.md", `---\nname: terse-skill\ndescription: Helps with various stuff.\n---\n# /terse\n\nDoes the thing.\n\n## Output\n\`\`\`\nok\n\`\`\`\n`), expect: { broken: false, has: ["R3"], hasNot: ["parse"] } });

  cases.push({ name: "placeholder-body", file: w("placeholder.md", `---\nname: ph-skill\ndescription: ${cleanDesc}\n---\n# /ph\n\nFirst do step one.\n\nTODO: finish this section.\n\n## Output\n\`\`\`\nok\n\`\`\`\n`), expect: { broken: false, has: ["R4"], hasNot: ["parse"] } });

  const longDesc = "Use when " + Array.from({ length: 60 }, (_, i) => `the user does specific concrete action number ${i + 1}`).join(", ") + ".";
  cases.push({ name: "long-desc", file: w("longdesc.md", `---\nname: longdesc-skill\ndescription: ${longDesc}\n---\n# /ld\n\nDo the thing.\n\n## Output\n\`\`\`\nok\n\`\`\`\n`), expect: { broken: false, has: ["R5"], hasNot: ["parse"] } });

  // (heading deliberately *not* "stub" so this case isolates R6 — the bare word "stub"/"placeholder" also trips R4 via the shared helper)
  cases.push({ name: "stub-assert", file: w("stubassert.md", `---\nname: demo-test-skill\ndescription: ${cleanDesc}\n---\n# /demo-test\n\nWrite a test like:\n\n\`\`\`js\nexpect(result).toBeDefined();\n\`\`\`\n\n## Output\n\`\`\`\nok\n\`\`\`\n`), expect: { broken: false, has: ["R6"], hasNot: ["R4", "parse"] } });

  cases.push({ name: "broken-fm", file: w("broken.md", `---\nname: broken-skill\ndescription: ${cleanDesc}\n# (no closing --- !)\n# /broken\n\nbody here\n`), expect: { broken: true, has: ["parse"], hasNot: [] } });

  cases.push({ name: "disabled-terse", file: w("disabled.md", `---\nname: disabled-skill\ndescription: Internal helper.\ndisable-model-invocation: true\n---\n# /disabled\n\nDoes an internal thing.\n\n## Output\n\`\`\`\nok\n\`\`\`\n`), expect: { broken: false, has: [], hasNot: ["R3", "parse"] } });

  let pass = 0;
  const lines = [];
  for (const c of cases) {
    const r = lintOneFile(c.file, schema);
    const ruleSet = new Set(r.broken ? ["parse"] : r.findings.map((f) => f.rule));
    const missing = (c.expect.has || []).filter((x) => !ruleSet.has(x));
    const surprise = (c.expect.hasNot || []).filter((x) => ruleSet.has(x));
    const brokenOk = !!r.broken === !!c.expect.broken;
    const ok = brokenOk && missing.length === 0 && surprise.length === 0;
    if (ok) pass++;
    lines.push(`  ${ok ? "✓" : "✗"} ${c.name.padEnd(18)} rules={${[...ruleSet].sort().join(",") || "—"}}${ok ? "" : `  ← missing=[${missing.join(",")}] surprise=[${surprise.join(",")}]${brokenOk ? "" : ` broken-mismatch(got ${!!r.broken}, want ${!!c.expect.broken})`}`}`);
  }
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
  const allOk = pass === cases.length;
  if (!OPTS.quiet && !OPTS.json) {                    // --json ⇒ machine output only (stdout = pure JSON)
    console.log(`[skill-lint --self-test] ${pass}/${cases.length} cases passed`);
    console.log(lines.join("\n"));
  }
  if (OPTS.json) console.log(JSON.stringify({ selfTest: true, passed: pass, total: cases.length, ok: allOk }, null, 2));
  return allOk ? 0 : 1;
}

// ============================================================================
//  main
// ============================================================================

async function main() {
  if (OPTS.help) { console.log(USAGE); return 0; }

  const unregister = register();
  let schema, builderMod;
  try {
    schema = await import("../mcp-server/src/schemas/skillQualitySchema.ts");
    builderMod = await import("../mcp-server/src/registries/SkillQualityRegistryBuilder.ts");
  } catch (e) {
    unregister();
    console.error(`[skill-lint] FAILED to load the U-SKU06 modules via tsx: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
    return 1;
  }

  try {
    if (OPTS.selfTest) return runSelfTest(schema);

    // ---- discovery: how do we get the list of skills to lint? -------------
    /** @type {Array<{name:string,path:string,tier:string,plugin?:string,quality?:any,disable_model_invocation?:boolean,description?:string}>} */
    let records = [];
    /** @type {Array<{path:string,error:string}>} */
    let parseFailureEntries = [];
    let registryGeneratedAt = null;
    let registryDriftCount = 0;
    let mode = "live-sweep";

    if (OPTS.fromRegistry) {
      mode = "from-registry";
      const p = builderMod.SKILL_QUALITY_REGISTRY_PATH;
      if (!fs.existsSync(p)) {
        console.error(`[skill-lint] --from-registry: ${p} does not exist — run \`node mcp-server/scripts/build-skill-quality-registry.mjs\` first (or drop --from-registry for a live sweep).`);
        return 1;
      }
      const reg = JSON.parse(fs.readFileSync(p, "utf8"));
      records = reg.skills ?? [];
      registryGeneratedAt = reg.generatedAt ?? null;
      const sidecar = builderMod.SKILL_QUALITY_PARSE_FAILURES_PATH;
      if (fs.existsSync(sidecar)) {
        try { parseFailureEntries = JSON.parse(fs.readFileSync(sidecar, "utf8")).failures ?? []; } catch { /* ignore */ }
      }
    } else if (OPTS.rootsDir) {
      mode = "roots-override";
      const dir = path.resolve(OPTS.rootsDir);
      if (!fs.existsSync(dir)) {
        console.error(`[skill-lint] --roots: ${dir} does not exist.`);
        return 1;
      }
      const built = await builderMod.skillQualityRegistryBuilder.build({ write: false, roots: [{ dir, tier: "project", layout: "flat" }] });
      records = built.registry.skills ?? [];
      registryGeneratedAt = built.registry.generatedAt ?? null;
      // no sidecar in --roots mode (the populator's sidecar is about the real library, not this dir)
    } else {
      if (OPTS.rebuildRegistry) {
        mode = "rebuilt-then-linted";
        await builderMod.buildSkillQualityRegistry({ write: true, skipUserRoots: OPTS.projectOnly });
      }
      const built = await builderMod.skillQualityRegistryBuilder.build({ write: false, skipUserRoots: OPTS.projectOnly });
      if (built.missingRoots.length > 0 && built.registry.total === 0) {
        console.error(`[skill-lint] no skill roots found on disk (checked ${built.missingRoots.length}):\n  ${built.missingRoots.join("\n  ")}`);
        return 1;
      }
      records = built.registry.skills ?? [];
      registryGeneratedAt = built.registry.generatedAt ?? null;
      // surface persisted parse-failures from the last populator run (build({write:false}) doesn't repersist them)
      const sidecar = builderMod.SKILL_QUALITY_PARSE_FAILURES_PATH;
      if (fs.existsSync(sidecar)) {
        try { parseFailureEntries = JSON.parse(fs.readFileSync(sidecar, "utf8")).failures ?? []; } catch { /* ignore */ }
      }
    }

    // ---- lint every record ----------------------------------------------
    /** Every skill with ≥1 finding (advisory, hard, or broken). Partitioned after the loop. */
    const allEntries = [];
    const byRule = {};                                  // every rule id (incl. advisory), tallied across all entries
    const bySeverity = { BROKEN: 0, MAJOR: 0, MINOR: 0, ADVISORY: 0 };
    const byTier = {};                                  // tier → count of *flagged* (severity ≥ MINOR) skills
    let stale = false;

    // The populator's parse-failures sidecar lists files it couldn't parse at all
    // (so they're absent from `records`). Surface them as BROKEN. The sidecar may
    // be from an older run than `records`, so tag the source.
    const brokenPaths = new Set(parseFailureEntries.map((f) => path.resolve(f.path)));
    for (const f of parseFailureEntries) {
      allEntries.push({
        name: path.basename(f.path).replace(/\.md$/i, ""), path: f.path, tier: "unknown",
        severity: "BROKEN", rules: ["parse"],
        findings: [{ rule: "parse", severity: "BROKEN", detail: f.error || "unparseable (from populator sidecar)", source: "populator-sidecar" }],
      });
      bySeverity.BROKEN++; byRule.parse = (byRule.parse || 0) + 1; byTier.unknown = (byTier.unknown || 0) + 1;
    }

    for (const rec of records) {
      const abs = path.resolve(rec.path);
      if (brokenPaths.has(abs)) continue;               // already accounted for as BROKEN
      if (registryGeneratedAt) {                        // staleness: skill file newer than the registry it came from
        try { if (fs.statSync(abs).mtimeMs > Date.parse(registryGeneratedAt)) stale = true; } catch { /* ignore */ }
      }
      const r = lintOneFile(abs, schema, { disableModelInvocation: rec.disable_model_invocation === true ? true : undefined });
      // drift: the registry's recorded vague set vs what we just recomputed
      if (rec.quality && Array.isArray(rec.quality.vague_language_violations)) {
        if ([...rec.quality.vague_language_violations].sort().join(",") !== [...r.vague].sort().join(",")) registryDriftCount++;
      }
      const sev = worstSeverity(r.findings, r.broken);
      if (sev === "OK") continue;                        // clean — not in the report
      const entry = {
        name: rec.name, path: rec.path, tier: rec.tier ?? "unknown",
        ...(rec.plugin ? { plugin: rec.plugin } : {}),
        severity: sev,
        rules: r.broken ? ["parse"] : r.findings.map((f) => f.rule),
        findings: r.broken ? [{ ...r.broken, severity: "BROKEN" }] : r.findings,
      };
      allEntries.push(entry);
      bySeverity[sev] = (bySeverity[sev] || 0) + 1;
      if (isFlagging(sev)) byTier[entry.tier] = (byTier[entry.tier] || 0) + 1;
      for (const ruleId of entry.rules) byRule[ruleId] = (byRule[ruleId] || 0) + 1;
    }

    allEntries.sort((a, b) => (SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]) || a.name.localeCompare(b.name));
    const allFlagged = allEntries.filter((e) => isFlagging(e.severity));   // BROKEN/MAJOR/MINOR — count toward exit
    const advisoryOnly = allEntries.filter((e) => e.severity === "ADVISORY");
    const parseFailures = allEntries.filter((e) => e.severity === "BROKEN").length;

    const report = {
      schemaVersion: REPORT_VERSION,
      generatedAt: new Date().toISOString(),
      mode,
      repoRoot: REPO_ROOT,
      sourceRegistryGeneratedAt: registryGeneratedAt,
      registryStale: stale || undefined,
      registryDrift: registryDriftCount || undefined,
      scanned: records.length,
      flagged: allFlagged.length,         // BROKEN/MAJOR/MINOR — these bump the exit code
      advisoryOnly: advisoryOnly.length,  // skills whose ONLY findings are advisory (R2a/R6/R7)
      parseFailures,
      bySeverity,
      byRule,
      byTier,                             // tier → flagged count (advisory-only skills excluded)
      ruleLegend: {
        R1: "vague-verb ban (body, outside code/quotes)", R2: ">500 instruction lines", R2a: "advisory: large example block in a >500-line file",
        R3: "<3 distinct trigger phrases in description (exempt if disable-model-invocation)", R4: "placeholder/stub language in body",
        R5: "description > 1024 chars", R6: "advisory: stub-assertion smell (toBeDefined / tautology / bare toBeTruthy)", R7: "advisory: no perfect-output example", parse: "BROKEN: unparseable frontmatter",
      },
      skills: allEntries,                 // every flagged + advisory skill, sorted by severity; filter by `.severity`
    };

    // ---- write the report -----------------------------------------------
    // `--report <p>` always writes to <p> (it's an explicit destination); `--no-write`
    // suppresses only the *default* `state/shared/skill-lint-report.json`.
    const reportPath = OPTS.reportPath
      ? path.resolve(OPTS.reportPath)
      : path.join(REPO_ROOT, "state", "shared", "skill-lint-report.json");
    const writeReport = OPTS.reportPath ? true : !OPTS.noWrite;
    if (writeReport) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
    }

    // ---- --fix suggestions ----------------------------------------------
    if (OPTS.fix) {
      const r2 = allFlagged.filter((s) => s.rules.includes("R2"));
      const r4 = allFlagged.filter((s) => s.rules.includes("R4"));
      if (!OPTS.quiet) {
        console.log(`\n[skill-lint --fix] ${r2.length} skill(s) over the 500-line cap, ${r4.length} with placeholder language.${OPTS.apply ? " (--apply: performing the safe R2 split)" : " (dry-run — pass --apply to perform the R2 split)"}`);
      }
      for (const s of r2) {
        const suggestions = suggestSplit(path.resolve(s.path));
        console.log(`  ${s.name} (${s.path})`);
        for (const sug of suggestions) console.log(`    → move "${sug.section}" (${sug.lines} lines, L${sug.span}) to ${sug.suggestedFile}`);
        if (OPTS.apply) {
          const res = applySplit(path.resolve(s.path));
          console.log(res.ok ? `    ✓ split: "${res.movedSection}" → ${path.basename(res.sibling)} (${res.movedLines} lines); backup ${path.basename(res.backup)}` : `    ✗ skipped: ${res.reason}`);
        }
      }
      for (const s of r4) {
        const phs = listPlaceholders(path.resolve(s.path), schema);
        console.log(`  ${s.name} — placeholder language (manual fix required):`);
        for (const ph of phs) console.log(`    L${ph.line} [${ph.marker}] ${ph.text}`);
      }
    }

    // ---- human / json summary -------------------------------------------
    if (OPTS.json) {
      console.log(JSON.stringify({ ...report, reportPath: writeReport ? reportPath : null, skills: undefined, flaggedSkillNames: allFlagged.map((s) => s.name) }, null, 2));
    } else if (!OPTS.quiet) {
      const tierLine = Object.entries(byTier).map(([t, n]) => `${t}=${n}`).join(" ") || "—";
      const ruleLine = Object.entries(byRule).sort().map(([r, n]) => `${r}=${n}`).join(" ") || "—";
      console.log(`[skill-lint] scanned ${report.scanned} skill(s) · ${report.flagged} flagged (${bySeverity.BROKEN} BROKEN · ${bySeverity.MAJOR} MAJOR · ${bySeverity.MINOR} MINOR) · ${bySeverity.ADVISORY} advisory-only`);
      console.log(`             by rule: ${ruleLine}`);
      console.log(`             by tier (flagged): ${tierLine}`);
      if (stale) console.log(`             ⚠ at least one skill file is newer than the source registry — re-run \`node mcp-server/scripts/build-skill-quality-registry.mjs\``);
      if (registryDriftCount) console.log(`             ⚠ ${registryDriftCount} skill(s) drifted vs the registry's recorded quality — re-run the populator`);
      if (writeReport) console.log(`             → ${reportPath}`);
      const top = allFlagged.slice(0, 10);
      if (top.length) {
        console.log(`             worst ${top.length}:`);
        for (const s of top) console.log(`               [${s.severity}] ${s.name} (${s.tier}) — ${s.rules.join(",")}`);
      }
    }

    return Math.min(allFlagged.length, 250);
  } finally {
    unregister();
  }
}

main()
  .then((code) => process.exit(code ?? 0))
  .catch((e) => {
    console.error(`[skill-lint] CRASHED: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
    process.exit(1);
  });
