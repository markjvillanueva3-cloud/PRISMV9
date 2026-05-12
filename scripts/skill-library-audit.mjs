#!/usr/bin/env node
/**
 * skill-library-audit.mjs — U-SKU05 (SKILLS-UTILIZATION-MS0).
 *
 * @eng_khairallah1 Phase-4: *"One skill is a tool. Ten skills is a workforce."*
 * PRISM has ~500 skills. Count is vanity — this grades the WHOLE library against
 * the production-grade bar (linter-clean ∧ 3-Question-satisfied ∧ all-three-
 * scenario-tests pass) and writes a scorecard:
 *
 *   state/shared/SKILL-LIBRARY-AUDIT-<YYYY-MM-DD>.md    (human scorecard)
 *   state/shared/SKILL-LIBRARY-AUDIT-<YYYY-MM-DD>.json  (machine-readable)
 *
 * Grading lives in `mcp-server/src/engines/SkillLibraryAuditEngine.ts` (so the
 * dispatcher action `prism_dev:skill_audit` and the vitest suite share it). This
 * file is the CLI shim: register tsx → import the engine → audit → render → write.
 *
 * Inputs (read-only): SKILL_QUALITY_REGISTRY.json (U-SKU06) · skill-lint-report.json
 * (U-SKU03) · the skill files (for `skill_type` frontmatter + `scenarios/` dirs) ·
 * `invocation_count_30d` straight from the registry (null until U-SKU04).
 *
 * Modes:
 *   node scripts/skill-library-audit.mjs                # full audit → writes both artifacts; exit = (needs_refinement + stub_or_orphan), capped 250
 *   node scripts/skill-library-audit.mjs --json         # machine-readable summary on stdout (pure JSON); still writes the artifacts unless --no-write
 *   node scripts/skill-library-audit.mjs --no-write     # compute + print summary, write nothing
 *   node scripts/skill-library-audit.mjs --rebuild      # rebuild SKILL_QUALITY_REGISTRY.json + skill-lint-report.json first (via skill-lint.mjs --rebuild-registry), then audit
 *   node scripts/skill-library-audit.mjs --from <path>  # read the registry from <path> instead of the canonical location
 *   node scripts/skill-library-audit.mjs --lint <path>  # read the lint report from <path>
 *   node scripts/skill-library-audit.mjs --out <dir>    # write the artifacts into <dir> instead of state/shared/
 *   node scripts/skill-library-audit.mjs --self-test    # run the grader against synthetic fixtures; exit 0 iff every bucket + the sum invariant behaves
 *   node scripts/skill-library-audit.mjs --help
 *
 * Cron: `0 8 1 * *` (1st of month, 8am) — registered in mcp-server/data/state/cron-jobs.json as `skill-library-audit-monthly`.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { register } from "tsx/esm/api";

// scripts/skill-library-audit.mjs → repo root is one dir up.
const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const EXIT_CODE_CAP = 250;

const args = process.argv.slice(2);
function flag(...names) { return names.some((n) => args.includes(n)); }
function valueOf(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}
const OPTS = {
  help: flag("--help", "-h"),
  json: flag("--json"),
  noWrite: flag("--no-write"),
  rebuild: flag("--rebuild"),
  selfTest: flag("--self-test", "--selftest"),
  quiet: flag("--quiet", "-q"),
  from: valueOf("--from"),
  lint: valueOf("--lint"),
  out: valueOf("--out"),
};

const HELP = `skill-library-audit.mjs — grade PRISM's skill library (production_grade / needs_refinement / stub_or_orphan)

  node scripts/skill-library-audit.mjs                 full audit → state/shared/SKILL-LIBRARY-AUDIT-<date>.{md,json}
  node scripts/skill-library-audit.mjs --json          machine-readable summary on stdout
  node scripts/skill-library-audit.mjs --no-write      compute only, write nothing
  node scripts/skill-library-audit.mjs --rebuild       rebuild the registry + lint report first
  node scripts/skill-library-audit.mjs --from <path>   override the registry path
  node scripts/skill-library-audit.mjs --lint <path>   override the lint-report path
  node scripts/skill-library-audit.mjs --out <dir>     write artifacts into <dir>
  node scripts/skill-library-audit.mjs --self-test     synthetic-fixture self-check; exit 0/1

Exit code = (needs_refinement + stub_or_orphan), capped at ${EXIT_CODE_CAP} (0 = whole library production-grade). --self-test exits 0/1 vs fixtures.`;

// ── tsx register (so we can import the .ts engine) ─────────────────────────
// MUST await `fn` before unregistering: the tsx ESM loader hook has to stay
// installed until the dynamic `import("…ts")` inside `fn` has fully resolved.

async function withTsx(fn) {
  const unregister = register();
  try { return await fn(); } finally { unregister(); }
}

// ── self-test: synthetic fixtures, no live library ────────────────────────

async function runSelfTest() {
  // Build a tiny synthetic registry + lint report covering every grade + the sum invariant,
  // then assert the grader buckets each skill as specified. Independent of the live library.
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
  const mkSkill = (name, over) => ({
    name, path: null, tier: "user",
    description: "A clear, specific description that comfortably exceeds the forty-character Q1 floor.",
    description_over_limit: false, disable_model_invocation: false, user_invocable: true,
    quality: {
      production_grade: false, last_refined: daysAgo(30), trigger_phrases: ["alpha trigger", "beta trigger", "gamma trigger"],
      has_output_example: true, body_line_count: 40, scenario_tests: { happy: null, edge: null, stress: null },
      vague_language_violations: [], last_audited: null, invocation_count_30d: null,
    },
    ...over,
  });
  const skills = [
    // production_grade: clean + 3Q + all-3-scenario-tests pass
    mkSkill("synthetic-prod", { quality: { ...mkSkill("synthetic-prod").quality, scenario_tests: { happy: "pass", edge: "pass", stress: "pass" } } }),
    // needs_refinement: 3Q-OK, clean, but no scenario results
    mkSkill("synthetic-needs-noscenario"),
    // needs_refinement: linter-flagged (will be in the lint report as MAJOR)
    mkSkill("synthetic-needs-lintflagged"),
    // stub_or_orphan: 5-line body
    mkSkill("synthetic-stub-shortbody", { quality: { ...mkSkill("x").quality, body_line_count: 5 } }),
    // stub_or_orphan: zero invocations, last refined 200d ago
    mkSkill("synthetic-stub-orphan", { quality: { ...mkSkill("x").quality, invocation_count_30d: 0, last_refined: daysAgo(200) } }),
    // NOT stub_or_orphan: zero invocations but refined 5d ago (brand-new exemption)
    mkSkill("synthetic-brandnew", { quality: { ...mkSkill("x").quality, invocation_count_30d: 0, last_refined: daysAgo(5) } }),
    // NOT stub_or_orphan: zero invocations, old, but a reference skill (user_invocable false)
    mkSkill("synthetic-reference", { user_invocable: false, quality: { ...mkSkill("x").quality, invocation_count_30d: 0, last_refined: daysAgo(300) } }),
    // needs_refinement: methodology skill (Q3-exempt via skill_type) but no scenario results
    mkSkill("synthetic-methodology", { skill_type: "methodology", quality: { ...mkSkill("x").quality, has_output_example: false } }),
  ];
  const registryObject = { schemaVersion: "1.0.0", generatedAt: today.toISOString(), total: skills.length, byTier: { user: skills.length }, parseFailures: 0, skills };
  const lintReportObject = { schemaVersion: "1.0.0", generatedAt: today.toISOString(), scanned: skills.length, flagged: 1, advisoryOnly: 0, parseFailures: 0, skills: [{ name: "synthetic-needs-lintflagged", path: null, tier: "user", severity: "MAJOR", rules: ["R3"], findings: [{ rule: "R3", severity: "MAJOR" }] }] };

  let pass = 0, fail = 0;
  const check = (cond, msg) => { if (cond) pass++; else { fail++; console.error(`  ✗ ${msg}`); } };

  const { skillLibraryAuditEngine } = await import("../mcp-server/src/engines/SkillLibraryAuditEngine.ts");
  const r = skillLibraryAuditEngine.audit({ registryObject, lintReportObject, nowMs: today.getTime() });
  const gradeOf = (n) => r.skills.find((s) => s.name === n)?.grade;

  check(r.sumInvariantOk, "sum invariant: production + needs + stub == total");
  check(r.counts.production_grade + r.counts.needs_refinement + r.counts.stub_or_orphan === skills.length, `counts sum to ${skills.length} (got ${r.counts.production_grade}+${r.counts.needs_refinement}+${r.counts.stub_or_orphan})`);
  check(gradeOf("synthetic-prod") === "production_grade", `synthetic-prod → production_grade (got ${gradeOf("synthetic-prod")})`);
  check(gradeOf("synthetic-needs-noscenario") === "needs_refinement", `synthetic-needs-noscenario → needs_refinement (got ${gradeOf("synthetic-needs-noscenario")})`);
  check(gradeOf("synthetic-needs-lintflagged") === "needs_refinement", `synthetic-needs-lintflagged → needs_refinement (got ${gradeOf("synthetic-needs-lintflagged")})`);
  check(gradeOf("synthetic-stub-shortbody") === "stub_or_orphan", `synthetic-stub-shortbody → stub_or_orphan (got ${gradeOf("synthetic-stub-shortbody")})`);
  check(gradeOf("synthetic-stub-orphan") === "stub_or_orphan", `synthetic-stub-orphan → stub_or_orphan (got ${gradeOf("synthetic-stub-orphan")})`);
  check(gradeOf("synthetic-brandnew") !== "stub_or_orphan", `synthetic-brandnew → NOT stub_or_orphan (got ${gradeOf("synthetic-brandnew")})`);
  check(gradeOf("synthetic-reference") !== "stub_or_orphan", `synthetic-reference → NOT stub_or_orphan (got ${gradeOf("synthetic-reference")})`);
  check(r.skills.find((s) => s.name === "synthetic-methodology")?.threeQ.q3 === true, "synthetic-methodology: Q3 exempt (skill_type=methodology)");
  check(gradeOf("synthetic-methodology") === "needs_refinement", `synthetic-methodology → needs_refinement (no scenarios) (got ${gradeOf("synthetic-methodology")})`);
  check(typeof skillLibraryAuditEngine.renderMarkdown(r) === "string" && skillLibraryAuditEngine.renderMarkdown(r).includes("# PRISM Skill-Library Audit"), "renderMarkdown produces a scorecard");
  check(r.roiEstimate.upperBoundHrsYr === Math.round(r.counts.production_grade * r.roiEstimate.perSkillHrsYr), "ROI upper bound = N × perSkillHrsYr");

  const ok = fail === 0;
  if (!OPTS.quiet) console.log(`[skill-library-audit --self-test] ${pass}/${pass + fail} checks passed`);
  return ok ? 0 : 1;
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  if (OPTS.help) { console.log(HELP); return 0; }
  if (OPTS.selfTest) return withTsx(() => runSelfTest());

  if (OPTS.rebuild) {
    if (!OPTS.quiet && !OPTS.json) console.error("[skill-library-audit] --rebuild: regenerating SKILL_QUALITY_REGISTRY.json + skill-lint-report.json …");
    try {
      execFileSync(process.execPath, [path.join(REPO_ROOT, "scripts", "skill-lint.mjs"), "--rebuild-registry", "--quiet"], { cwd: REPO_ROOT, stdio: OPTS.quiet || OPTS.json ? "ignore" : "inherit" });
    } catch (e) {
      console.error(`[skill-library-audit] --rebuild failed: ${e?.message ?? e} — proceeding with the existing files.`);
    }
  }

  return withTsx(async () => {
    const { skillLibraryAuditEngine } = await import("../mcp-server/src/engines/SkillLibraryAuditEngine.ts");
    const auditOpts = {};
    if (OPTS.from) auditOpts.registryPath = path.resolve(REPO_ROOT, OPTS.from);
    if (OPTS.lint) auditOpts.lintReportPath = path.resolve(REPO_ROOT, OPTS.lint);

    let result;
    try {
      result = skillLibraryAuditEngine.audit(auditOpts);
    } catch (e) {
      console.error(`[skill-library-audit] ${e?.message ?? e}`);
      return 1;
    }

    const dateLabel = result.generatedAt.slice(0, 10);
    const outDir = OPTS.out ? path.resolve(REPO_ROOT, OPTS.out) : path.join(REPO_ROOT, "state", "shared");
    const mdPath = path.join(outDir, `SKILL-LIBRARY-AUDIT-${dateLabel}.md`);
    const jsonPath = path.join(outDir, `SKILL-LIBRARY-AUDIT-${dateLabel}.json`);

    if (!OPTS.noWrite) {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(mdPath, skillLibraryAuditEngine.renderMarkdown(result, { dateLabel }), "utf-8");
      fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + "\n", "utf-8");
    }

    if (OPTS.json) {
      // pure JSON on stdout — a compact summary, not the full per-skill detail
      const summary = {
        schemaVersion: result.schemaVersion, generatedAt: result.generatedAt, total: result.total,
        counts: result.counts, sumInvariantOk: result.sumInvariantOk, byDomain: result.byDomain,
        gapListSize: result.gapList.length, gapListTop10: result.gapList.slice(0, 10),
        topByInvocation: result.topByInvocation, roiEstimate: result.roiEstimate,
        invocationUndercounted: result.invocationUndercounted, skillTypeSource: result.skillTypeSource,
        advisories: result.advisories, sources: result.sources,
        written: OPTS.noWrite ? null : { md: mdPath, json: jsonPath },
      };
      process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
    } else if (!OPTS.quiet) {
      const r = result;
      console.log(`\nPRISM Skill-Library Audit — ${dateLabel}`);
      console.log(`  total=${r.total}  production_grade=${r.counts.production_grade}  needs_refinement=${r.counts.needs_refinement}  stub_or_orphan=${r.counts.stub_or_orphan}  (sum-invariant ${r.sumInvariantOk ? "OK" : "FAILED"})`);
      const near = r.gapList.filter((g) => g.distance === "near").length;
      console.log(`  gap list: ${r.gapList.length} (${near} 'near' — one fixture-run from production-grade)`);
      console.log(`  ROI: ≈${r.roiEstimate.lowerBoundHrsYr}–${r.roiEstimate.upperBoundHrsYr} hrs/yr realized · up to ≈${r.roiEstimate.potentialIfFixturesWritten.upperBoundHrsYr} hrs/yr if the +${r.roiEstimate.potentialIfFixturesWritten.extraSkills} linter+3Q-clean skills get fixtures`);
      for (const a of r.advisories) console.log(`  ⚠ ${a}`);
      if (!OPTS.noWrite) { console.log(`  written: ${path.relative(REPO_ROOT, mdPath)}`); console.log(`           ${path.relative(REPO_ROOT, jsonPath)}`); }
      console.log("");
    }

    const dirty = result.counts.needs_refinement + result.counts.stub_or_orphan;
    return Math.min(dirty, EXIT_CODE_CAP);
  });
}

main()
  .then((code) => process.exit(typeof code === "number" ? code : 0))
  .catch((e) => { console.error(`[skill-library-audit] fatal: ${e?.stack ?? e}`); process.exit(1); });
