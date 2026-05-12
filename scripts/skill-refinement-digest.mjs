#!/usr/bin/env node
/**
 * skill-refinement-digest.mjs — U-SKU04 (SKILLS-UTILIZATION-MS0).
 *
 * @eng_khairallah1 Phase-3 "review and refine your Skill every Friday" — the
 * weekly digest of skills wanting attention (linter-flagged / stale / output-
 * overridden). Writes:
 *
 *   state/shared/skill-refinement-digest-<YYYY-MM-DD>.md    (human Friday digest)
 *   state/shared/skill-refinement-digest-<YYYY-MM-DD>.json  (machine-readable)
 *
 * Categorization lives in `mcp-server/src/engines/SkillRefinementDigestEngine.ts`
 * (shared with the `prism_dev:skill_refinement_digest` action + vitest). This file
 * is the I/O shim: pick up git state for the "uncommitted edits" note → call the
 * engine → write artifacts → optionally push a one-line summary to the chat bus.
 *
 * Modes:
 *   node scripts/skill-refinement-digest.mjs                 build the digest → write artifacts; exit 0
 *   node scripts/skill-refinement-digest.mjs --json          machine-readable summary on stdout
 *   node scripts/skill-refinement-digest.mjs --no-write      compute only, write nothing
 *   node scripts/skill-refinement-digest.mjs --push-bus      also post a one-line summary to the agent chat bus
 *   node scripts/skill-refinement-digest.mjs --top-n 20      raise the per-category cap (default 15)
 *   node scripts/skill-refinement-digest.mjs --telemetry <f> read skill-invocation/override events from <f> (JSON array or JSONL)
 *   node scripts/skill-refinement-digest.mjs --registry <f>  override the registry path (tests / offline)
 *   node scripts/skill-refinement-digest.mjs --self-test     synthetic-fixture self-check; exit 0/1
 *   node scripts/skill-refinement-digest.mjs --help
 *
 * Cron: `13 9 * * 5` (Friday 09:13 local — the @eng_khairallah1 "Friday reminder") — registered in
 * mcp-server/data/state/cron-jobs.json as `skill-refinement-digest-weekly`, invoked with `--push-bus`.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { register } from "tsx/esm/api";

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");

const args = process.argv.slice(2);
const flag = (...n) => n.some((x) => args.includes(x));
const valueOf = (n) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined; };
const OPTS = {
  help: flag("--help", "-h"),
  json: flag("--json"),
  noWrite: flag("--no-write"),
  pushBus: flag("--push-bus"),
  selfTest: flag("--self-test", "--selftest"),
  quiet: flag("--quiet", "-q"),
  topN: valueOf("--top-n"),
  telemetry: valueOf("--telemetry"),
  registry: valueOf("--registry"),
};

const HELP = `skill-refinement-digest.mjs — weekly "Friday review" digest of skills wanting refinement

  node scripts/skill-refinement-digest.mjs                build → state/shared/skill-refinement-digest-<date>.{md,json}
  node scripts/skill-refinement-digest.mjs --json         machine-readable summary on stdout
  node scripts/skill-refinement-digest.mjs --no-write     compute only
  node scripts/skill-refinement-digest.mjs --push-bus     also post a one-line summary to the agent chat bus
  node scripts/skill-refinement-digest.mjs --top-n 20     per-category cap (default 15)
  node scripts/skill-refinement-digest.mjs --telemetry f  read invocation/override events from f
  node scripts/skill-refinement-digest.mjs --self-test    synthetic-fixture self-check; exit 0/1

Exit 0 on success. --self-test exits 0/1 vs fixtures.`;

async function withTsx(fn) { const un = register(); try { return await fn(); } finally { un(); } }

/** Count uncommitted `.md` skill files (commands / skills dirs) for the digest's "refinement in progress" note. */
function uncommittedSkillEditsNote() {
  try {
    const out = execFileSync("git", ["-C", REPO_ROOT, "status", "--porcelain", "--", ".claude/commands", ".claude/skills"], { encoding: "utf-8", timeout: 10_000 });
    const n = out.split(/\r?\n/).filter((l) => l.trim() && /\.md\b/.test(l)).length;
    return n > 0 ? `${n} skill .md file(s) have uncommitted edits — refinement may be in progress; the digest reflects committed state.` : null;
  } catch { return null; }
}

function postToChatBus(summary) {
  try {
    execFileSync(process.execPath, [path.join(REPO_ROOT, ".claude", "helpers", "agent-coordination.mjs"), "post", "--agent", "skill-refinement-cron", "--status", "active", "--message", summary], { cwd: REPO_ROOT, stdio: "ignore", timeout: 15_000 });
    return true;
  } catch { return false; }
}

// ── self-test ──────────────────────────────────────────────────────────────

async function runSelfTest() {
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
  const mk = (name, q = {}) => ({ name, path: null, tier: "user", description: "x".repeat(60), quality: { production_grade: false, last_refined: daysAgo(30), trigger_phrases: ["a", "b", "c"], has_output_example: true, body_line_count: 40, scenario_tests: { happy: null, edge: null, stress: null }, vague_language_violations: [], last_audited: null, invocation_count_30d: null, ...q } });
  const registryObject = { schemaVersion: "1.0.0", generatedAt: today.toISOString(), total: 4, byTier: { user: 4 }, parseFailures: 0, skills: [
    mk("healthy-skill"),
    mk("stale-skill", { last_refined: daysAgo(120) }),
    mk("linter-bad-skill"),
    mk("overridden-skill"),
  ] };
  const lintReportObject = { schemaVersion: "1.0.0", generatedAt: today.toISOString(), scanned: 4, flagged: 1, advisoryOnly: 0, parseFailures: 0, skills: [{ name: "linter-bad-skill", path: null, tier: "user", severity: "MAJOR", rules: ["R3", "R4"], findings: [] }] };
  const telemetryEventsObject = [{ skill: "overridden-skill", type: "override", ts: today.toISOString() }];

  let pass = 0, fail = 0;
  const check = (c, m) => { if (c) pass++; else { fail++; console.error(`  ✗ ${m}`); } };
  const { skillRefinementDigestEngine } = await import("../mcp-server/src/engines/SkillRefinementDigestEngine.ts");
  const d = skillRefinementDigestEngine.digest({ registryObject, lintReportObject, telemetryEventsObject, auditObject: { skills: [] }, nowMs: today.getTime() });
  const inCat = (cat, name) => d.categories[cat].some((e) => e.name === name);
  check(d.totalSkills === 4, `totalSkills === 4 (got ${d.totalSkills})`);
  check(inCat("linter_flagged", "linter-bad-skill"), "linter-bad-skill → linter_flagged");
  check(inCat("stale_but_hot", "stale-skill"), "stale-skill → stale_but_hot (degraded 'stale' mode)");
  check(inCat("output_overridden", "overridden-skill"), "overridden-skill → output_overridden (telemetry event)");
  check(!d.categories.linter_flagged.some((e) => e.name === "healthy-skill") && !d.categories.stale_but_hot.some((e) => e.name === "healthy-skill"), "healthy-skill is in no category");
  check(d.actionableCount === 3 && !d.allHealthy, `actionableCount === 3, not allHealthy (got ${d.actionableCount}/${d.allHealthy})`);
  check(d.spotlight.length >= 1 && d.spotlight.length <= 3, `spotlight has 1..3 entries (got ${d.spotlight.length})`);
  // all-healthy path
  const d2 = skillRefinementDigestEngine.digest({ registryObject: { ...registryObject, skills: [mk("only-healthy")] }, lintReportObject: { skills: [] }, telemetryEventsObject: [], auditObject: { skills: [] }, nowMs: today.getTime() });
  check(d2.allHealthy && d2.actionableCount === 0, "single-healthy-skill registry → allHealthy");
  // telemetry missing → category A empty, B degraded, C works
  const d3 = skillRefinementDigestEngine.digest({ registryObject, lintReportObject, auditObject: { skills: [] }, nowMs: today.getTime() });
  check(d3.categories.output_overridden.length === 0, "no telemetry → output_overridden empty");
  check(inCat.call(null, "linter_flagged", "linter-bad-skill") || d3.categories.linter_flagged.some((e) => e.name === "linter-bad-skill"), "no telemetry → linter_flagged still works");
  check(typeof skillRefinementDigestEngine.renderMarkdown(d) === "string" && skillRefinementDigestEngine.renderMarkdown(d).includes("# PRISM Weekly Skill-Refinement Digest"), "renderMarkdown produces a digest");
  const ok = fail === 0;
  if (!OPTS.quiet) console.log(`[skill-refinement-digest --self-test] ${pass}/${pass + fail} checks passed`);
  return ok ? 0 : 1;
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  if (OPTS.help) { console.log(HELP); return 0; }
  if (OPTS.selfTest) return withTsx(() => runSelfTest());

  return withTsx(async () => {
    const { skillRefinementDigestEngine } = await import("../mcp-server/src/engines/SkillRefinementDigestEngine.ts");
    const digestOpts = {};
    if (OPTS.registry) digestOpts.registryPath = path.resolve(REPO_ROOT, OPTS.registry);
    if (OPTS.telemetry) digestOpts.telemetryEventsPath = path.resolve(REPO_ROOT, OPTS.telemetry);
    if (OPTS.topN != null && Number.isFinite(Number(OPTS.topN))) digestOpts.perCategoryCap = Number(OPTS.topN);

    let d;
    try { d = skillRefinementDigestEngine.digest(digestOpts); }
    catch (e) { console.error(`[skill-refinement-digest] ${e?.message ?? e}`); return 1; }
    d.uncommittedNote = uncommittedSkillEditsNote();

    const dateLabel = d.generatedAt.slice(0, 10);
    const outDir = path.join(REPO_ROOT, "state", "shared");
    const jsonPath = path.join(outDir, `skill-refinement-digest-${dateLabel}.json`);
    const mdPath = path.join(outDir, `skill-refinement-digest-${dateLabel}.md`);
    if (!OPTS.noWrite) {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(jsonPath, JSON.stringify(d, null, 2) + "\n", "utf-8");
      fs.writeFileSync(mdPath, skillRefinementDigestEngine.renderMarkdown(d, { dateLabel }), "utf-8");
    }

    const oneLine = d.allHealthy
      ? `Skill-refinement digest ${dateLabel} (${d.weekLabel}): no skill flagged this week (${d.totalSkills} tracked).`
      : `Skill-refinement digest ${dateLabel} (${d.weekLabel}): ${d.actionableCount} skill(s) want attention — A(overridden)=${d.categories.output_overridden.length} B(stale)=${d.categories.stale_but_hot.length} C(lint)=${d.categories.linter_flagged.length}. Spotlight: ${d.spotlight.map((e) => e.name).join(", ") || "—"}.${OPTS.noWrite ? "" : ` See ${path.relative(REPO_ROOT, mdPath)}`}`;
    let pushed = false;
    if (OPTS.pushBus) pushed = postToChatBus(oneLine);

    if (OPTS.json) {
      process.stdout.write(JSON.stringify({
        schemaVersion: d.schemaVersion, generatedAt: d.generatedAt, weekLabel: d.weekLabel, totalSkills: d.totalSkills,
        actionableCount: d.actionableCount, allHealthy: d.allHealthy,
        counts: { output_overridden: d.categories.output_overridden.length, stale_but_hot: d.categories.stale_but_hot.length, linter_flagged: d.categories.linter_flagged.length },
        spotlight: d.spotlight.map((e) => ({ name: e.name, category: e.category, reason: e.reason, suggestedFix: e.suggestedFix })),
        caps: d.caps, telemetryAvailable: d.telemetryAvailable, uncommittedNote: d.uncommittedNote, advisories: d.advisories, sources: d.sources,
        written: OPTS.noWrite ? null : { md: mdPath, json: jsonPath }, pushedToBus: OPTS.pushBus ? pushed : null,
      }, null, 2) + "\n");
    } else if (!OPTS.quiet) {
      console.log(`\n${oneLine}`);
      for (const a of d.advisories) console.log(`  ⚠ ${a}`);
      if (!OPTS.noWrite) { console.log(`  written: ${path.relative(REPO_ROOT, mdPath)}`); console.log(`           ${path.relative(REPO_ROOT, jsonPath)}`); }
      if (OPTS.pushBus) console.log(`  chat bus: ${pushed ? "posted" : "post failed (file written; no bus)"}`);
      console.log("");
    }
    return 0;
  });
}

main().then((code) => process.exit(typeof code === "number" ? code : 0)).catch((e) => { console.error(`[skill-refinement-digest] fatal: ${e?.stack ?? e}`); process.exit(1); });
