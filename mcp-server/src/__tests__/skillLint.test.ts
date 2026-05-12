/**
 * skillLint.test.ts — U-SKU03 (SKILLS-UTILIZATION-MS0) coverage for the static
 * skill-quality linter `scripts/skill-lint.mjs`.
 *
 * Two layers:
 *  1. Hermetic rule cases — write a fixed set of synthetic skill `.md` fixtures
 *     into a temp dir, run `skill-lint.mjs --roots <dir>`, and assert the *exact*
 *     report it produces: which fixtures are flagged, with which rule(s), and the
 *     concrete payload on each finding (instruction-line count, trigger-phrase
 *     count, description length, marker ids). Covers R1 vague verbs · R2 >500
 *     instruction lines · R3 <3 trigger phrases · R4 placeholder language · R5
 *     description >1024 chars · BROKEN unparseable frontmatter · R3-exempt for
 *     `disable-model-invocation` · clean skill → zero findings.
 *  2. Live-tool smoke — `--self-test` exits 0 with every internal case passing;
 *     `--project-only --json` emits an internally-consistent report over the
 *     real library; `--fix` on an over-length fixture suggests a sibling split
 *     without writing anything; `--help` exits 0.
 *
 * The linter is a CLI (no exported surface), so everything runs through
 * `spawnSync('node', ['scripts/skill-lint.mjs', ...])`, which also exercises the
 * real exit-code contract (= flagged-skill count, capped at 250; 0 when clean).
 * Plugin-tier *discovery* (`<plugin>:<skill>` naming, version-dir dedup) is
 * covered by skillRegistry.test.ts, not here.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "skill-lint.mjs");

interface LintRun { status: number; stdout: string; stderr: string; json: any }
function runLint(extraArgs: string[]): LintRun {
  const r = spawnSync(process.execPath, [SCRIPT, ...extraArgs], { cwd: REPO_ROOT, encoding: "utf8", timeout: 120_000 });
  let json: any = null;
  if (extraArgs.includes("--json")) { try { json = JSON.parse(r.stdout); } catch { json = null; } }
  return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "", json };
}

const CLEAN_DESC = 'Use when the user asks to "validate a config", "check a manifest", or "audit settings before deploy" — runs the schema checker.';
const skill = (frontmatter: string, body: string) => `---\n${frontmatter}\n---\n${body}\n`;
const findingFor = (report: any, name: string, rule: string) =>
  (report.skills.find((s: any) => s.name === name)?.findings ?? []).find((f: any) => f.rule === rule);

describe("skill-lint.mjs — hermetic rule cases (--roots over fixed fixtures)", () => {
  let dir: string;
  let report: any;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-lint-vitest-"));
    // 8 fixtures with deterministic outcomes: 6 flagged (vague→R1, long→R2, onephrase→R3,
    // placeholder→R4, bigdesc→R3+R5, broken→parse), 2 clean (clean, exempt). 0 advisory-only.
    fs.writeFileSync(path.join(dir, "clean.md"), skill(`name: clean-skill\ndescription: ${CLEAN_DESC}`,
      "# /clean\n\nValidates configuration files against the project schema.\n\n## Steps\n1. Read the file.\n2. Parse it.\n3. Report any keys that violate the schema.\n\n## Output\n```\nconfig.yml: 2 violations — `port` must be int, `host` required\n```"));
    fs.writeFileSync(path.join(dir, "vague.md"), skill(`name: vague-skill\ndescription: ${CLEAN_DESC}`,
      "# /vague\n\nFormat it nicely and handle it appropriately.\n\n## Output\n```\nok\n```"));
    fs.writeFileSync(path.join(dir, "long.md"), skill(`name: long-skill\ndescription: ${CLEAN_DESC}`,
      "# /long\n\n" + Array.from({ length: 600 }, (_, i) => `Step ${i + 1}: do the specific concrete thing number ${i + 1}.`).join("\n")));
    fs.writeFileSync(path.join(dir, "onephrase.md"), skill(`name: terse-skill\ndescription: Helps with various stuff.`,
      "# /terse\n\nDoes the thing.\n\n## Output\n```\nok\n```"));
    fs.writeFileSync(path.join(dir, "placeholder.md"), skill(`name: ph-skill\ndescription: ${CLEAN_DESC}`,
      "# /ph\n\nFirst do step one.\n\nTODO: finish this section.\n\n## Output\n```\nok\n```"));
    fs.writeFileSync(path.join(dir, "bigdesc.md"), skill(`name: bigdesc-skill\ndescription: "Use when the user runs ${"x".repeat(1100)} — specific."`,
      "# /bd\n\nDo the thing.\n\n## Output\n```\nok\n```"));
    fs.writeFileSync(path.join(dir, "broken.md"),
      `---\nname: broken-skill\ndescription: ${CLEAN_DESC}\n# this block is never closed with another ---\n# /broken\n\nbody here\n`);
    fs.writeFileSync(path.join(dir, "exempt.md"), skill(`name: exempt-skill\ndescription: Internal helper.\ndisable-model-invocation: true`,
      "# /exempt\n\nDoes an internal thing.\n\n## Output\n```\nok\n```"));

    const reportPath = path.join(os.tmpdir(), `skill-lint-vitest-report-${process.pid}.json`);
    try {
      const r = runLint(["--roots", dir, "--quiet", "--report", reportPath]);
      expect(r.status).toBe(6);                       // exit code == flagged count
      report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    } finally {
      try { fs.rmSync(reportPath, { force: true }); } catch { /* best effort */ }
    }
  });

  afterAll(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } });

  it("emits the expected aggregate report scoped to the fixture dir", () => {
    expect(report.schemaVersion).toBe("1.0.0");
    expect(report.mode).toBe("roots-override");
    expect(report.repoRoot).toBe(REPO_ROOT);
    expect(report.scanned).toBe(8);
    expect(report.flagged).toBe(6);
    expect(report.advisoryOnly).toBe(0);
    expect(report.parseFailures).toBe(1);             // broken.md
    expect(report.byTier).toEqual({ project: 6 });    // --roots forces tier="project"
    expect(report.bySeverity).toEqual({ BROKEN: 1, MAJOR: 5, MINOR: 0, ADVISORY: 0 });
    expect(Object.keys(report.ruleLegend).sort()).toEqual(["R1", "R2", "R2a", "R3", "R4", "R5", "R6", "R7", "parse"]);
    expect(report.flaggedSkillNames).toBeUndefined();  // (only present in --json mode)
    expect(report.skills.map((s: any) => s.name).sort()).toEqual(["bigdesc", "broken", "long", "onephrase", "placeholder", "vague"]);
  });

  it("clean skill — zero findings, absent from the report", () => {
    expect(report.skills.map((s: any) => s.name)).not.toContain("clean");
  });

  it("R1 — banned vague verbs in the body", () => {
    expect(report.skills.find((s: any) => s.name === "vague").rules).toEqual(["R1"]);
    expect(findingFor(report, "vague", "R1").phrases).toEqual(expect.arrayContaining(["format-nicely", "handle-appropriately"]));
  });

  it("R2 — body over the 500-instruction-line cap", () => {
    expect(report.skills.find((s: any) => s.name === "long").rules).toEqual(expect.arrayContaining(["R2"]));
    const f = findingFor(report, "long", "R2");
    expect(f.instructionLines).toBeGreaterThan(500);
    expect(f.cap).toBe(500);
  });

  it("R3 — description yields fewer than 3 distinct trigger phrases", () => {
    expect(report.skills.find((s: any) => s.name === "onephrase").rules).toEqual(["R3"]);
    const f = findingFor(report, "onephrase", "R3");
    expect(f.triggerPhrases).toBeLessThan(3);
    expect(f.floor).toBe(3);
  });

  it("R4 — placeholder/stub language (TODO) in the body", () => {
    expect(report.skills.find((s: any) => s.name === "placeholder").rules).toEqual(["R4"]);
    expect(findingFor(report, "placeholder", "R4").markers).toContain("todo");
  });

  it("R5 — description over the 1024-char cap (also trips R3 — one long 'use when' clause)", () => {
    expect(report.skills.find((s: any) => s.name === "bigdesc").rules.sort()).toEqual(["R3", "R5"]);
    const f = findingFor(report, "bigdesc", "R5");
    expect(f.descLength).toBeGreaterThan(1024);
    expect(f.max).toBe(1024);
  });

  it("BROKEN — frontmatter '---' block opened but never closed", () => {
    const b = report.skills.find((s: any) => s.name === "broken");
    expect(b.severity).toBe("BROKEN");
    expect(b.rules).toEqual(["parse"]);
    expect(b.findings[0].detail).toMatch(/never closed/i);
  });

  it("R3 is exempt when disable-model-invocation: true (terse description tolerated)", () => {
    expect(report.skills.map((s: any) => s.name)).not.toContain("exempt");
  });
});

describe("skill-lint.mjs — live-tool smoke", () => {
  it("--self-test exits 0 with every internal case passing (≥7 cases)", () => {
    const r = runLint(["--self-test", "--json"]);
    expect(r.status).toBe(0);
    expect(r.json.selfTest).toBe(true);
    expect(r.json.ok).toBe(true);
    expect(r.json.passed).toBe(r.json.total);
    expect(r.json.total).toBeGreaterThanOrEqual(7);
  });

  it("--project-only --json emits an internally-consistent report over the real library", () => {
    const r = runLint(["--project-only", "--json", "--no-write"]);
    const j = r.json;
    expect(j.schemaVersion).toBe("1.0.0");
    expect(j.mode).toBe("live-sweep");
    expect(j.scanned).toBeGreaterThanOrEqual(1);
    expect(j.flagged).toBe(j.flaggedSkillNames.length);
    expect(j.flaggedSkillNames.every((n: unknown) => typeof n === "string" && (n as string).length > 0)).toBe(true);
    expect(r.status).toBe(Math.min(j.flagged, 250));   // exit code == capped flagged count
    for (const ruleId of Object.keys(j.byRule)) expect(Object.keys(j.ruleLegend)).toContain(ruleId);
    const sevTotal = j.bySeverity.BROKEN + j.bySeverity.MAJOR + j.bySeverity.MINOR + j.bySeverity.ADVISORY;
    expect(sevTotal).toBe(j.flagged + j.advisoryOnly);
  });

  it("--fix suggests a sibling-file split for an over-length skill (dry-run; nothing written)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-lint-fix-"));
    try {
      fs.writeFileSync(path.join(dir, "huge.md"), skill(`name: huge-skill\ndescription: ${CLEAN_DESC}`,
        "# /huge\n\n## Intro\nshort.\n\n## TheBigSection\n" + Array.from({ length: 560 }, (_, i) => `Line ${i + 1}: concrete instruction number ${i + 1}.`).join("\n") + "\n\n## Outro\nshort.\n"));
      const r = runLint(["--roots", dir, "--fix", "--no-write", "--quiet"]);
      expect(r.status).toBe(1);                          // exactly one flagged (huge → R2)
      expect(r.stdout).toMatch(/→ move "TheBigSection"/);
      expect(r.stdout).toMatch(/huge-thebigsection\.md/);
      expect(fs.readdirSync(dir)).toEqual(["huge.md"]);  // dry-run wrote nothing new
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("--help prints usage and exits 0", () => {
    const r = runLint(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/skill-lint\.mjs/);
    expect(r.stdout).toMatch(/--self-test/);
  });
});
