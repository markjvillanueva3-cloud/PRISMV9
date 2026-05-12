/**
 * SkillRefinementDigestEngine.test.ts — U-SKU04 (SKILLS-UTILIZATION-MS0) coverage
 * for the weekly skill-refinement digest: the {@link SkillRefinementDigestEngine},
 * the CLI `scripts/skill-refinement-digest.mjs`, and the `prism_dev:skill_refinement_digest`
 * dispatcher action.
 *
 * Layers
 *  1. Hermetic categorization — synthetic registry / lint-report / audit / telemetry objects;
 *     assert which skill lands in which of {output_overridden, stale_but_hot, linter_flagged},
 *     the union + spotlight precedence (A>B>C, deduped), allHealthy, caps, and audit enrichment.
 *  2. Degradation — no telemetry ⇒ category A empty + advisory; no invocation counts ⇒ B is
 *     "stale (>90d)" not "stale-but-hot" + advisory; no lint report ⇒ C empty; no audit ⇒ entries
 *     carry null grade/distance + advisory.
 *  3. Failure modes / adversarial — missing/non-object registry ⇒ throws; empty registry ⇒ allHealthy;
 *     unparseable last_refined ⇒ not flagged stale; garbage records skipped; weekLabel is ISO-week shaped.
 *  4. renderMarkdown — header, the "refinement is a human/forge action" caveat, the 3 sections, the
 *     all-healthy variant, pipe-escaping.
 *  5. CLI via spawnSync — --help / --self-test exit 0; --json --no-write --registry <tmp> emits
 *     internally-consistent JSON without writing.
 *  6. prism_dev:skill_refinement_digest — handler captured via a mock McpServer: enum membership,
 *     digest returned, markdown=true attaches the rendered digest.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  skillRefinementDigestEngine,
  SkillRefinementDigestEngine,
  SKILL_REFINEMENT_DIGEST_SCHEMA_VERSION,
  type RefinementCategory,
} from "../engines/SkillRefinementDigestEngine.js";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CLI_PATH = path.join(REPO_ROOT, "scripts", "skill-refinement-digest.mjs");
const NOW = Date.now();

// ── synthetic-fixture builders ─────────────────────────────────────────────

const daysAgoISO = (n: number) => { const d = new Date(NOW); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
type Q = Record<string, unknown>;
function mkSkill(name: string, q: Q = {}): Record<string, unknown> {
  return { name, path: null, tier: "user", description: "A perfectly reasonable description over the forty-character floor.", quality: { production_grade: false, last_refined: daysAgoISO(30), trigger_phrases: ["a", "b", "c"], has_output_example: true, body_line_count: 40, scenario_tests: { happy: null, edge: null, stress: null }, vague_language_violations: [], last_audited: null, invocation_count_30d: null, ...q } };
}
function mkRegistry(skills: Array<unknown>): Record<string, unknown> { return { schemaVersion: "1.0.0", generatedAt: new Date(NOW).toISOString(), total: skills.length, byTier: { user: skills.length }, parseFailures: 0, skills }; }
function mkLint(flagged: Array<{ name: string; rules?: string[]; severity?: string }>): Record<string, unknown> { return { schemaVersion: "1.0.0", generatedAt: new Date(NOW).toISOString(), scanned: 99, flagged: flagged.length, advisoryOnly: 0, parseFailures: 0, skills: flagged.map((f) => ({ name: f.name, path: null, tier: "user", severity: f.severity ?? "MAJOR", rules: f.rules ?? ["R3"], findings: [] })) }; }
function mkAudit(entries: Array<{ name: string; grade?: string; distance?: string; reasons?: string[] }>): Record<string, unknown> { return { schemaVersion: "1.0.0", generatedAt: new Date(NOW).toISOString(), total: entries.length, skills: entries.map((e) => ({ name: e.name, grade: e.grade ?? "needs_refinement", distance: e.distance ?? "mid", reasons: e.reasons ?? ["fix the thing"] })) }; }
function tmpRegistryFile(skills: Array<unknown>): string { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-sku04-")); const p = path.join(dir, "SKILL_QUALITY_REGISTRY.json"); fs.writeFileSync(p, JSON.stringify(mkRegistry(skills))); return p; }

const inCat = (d: ReturnType<typeof skillRefinementDigestEngine.digest>, cat: RefinementCategory, name: string) => d.categories[cat].some((e) => e.name === name);
const entry = (d: ReturnType<typeof skillRefinementDigestEngine.digest>, cat: RefinementCategory, name: string) => d.categories[cat].find((e) => e.name === name)!;

// ── dispatcher round-trip plumbing ─────────────────────────────────────────

type McpHandler = (a: { action: string; params?: Record<string, unknown> }) => Promise<{ content?: Array<{ type: "text"; text: string }>; isError?: boolean } | Record<string, unknown>>;
function captureDevHandler(): { handler: McpHandler; actions: readonly string[] } {
  let handler: McpHandler | null = null; let actions: readonly string[] = [];
  const enumValues = (a: unknown): readonly string[] => { const z = a as { options?: readonly string[]; _def?: { values?: readonly string[]; entries?: Record<string, unknown> } }; if (Array.isArray(z?.options)) return z.options; if (Array.isArray(z?._def?.values)) return z._def!.values!; if (z?._def?.entries && typeof z._def.entries === "object") return Object.keys(z._def.entries); return []; };
  const server = { tool(name: string, _d: string, schema: Record<string, unknown>, cb: McpHandler) { if (name === "prism_dev") { handler = cb; actions = enumValues((schema as { action?: unknown }).action); } else if (!handler) handler = cb; } };
  registerDevDispatcher(server as unknown as Parameters<typeof registerDevDispatcher>[0]);
  if (!handler) throw new Error("registerDevDispatcher did not register a handler");
  return { handler, actions };
}
async function invokeDev(handler: McpHandler, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> { const r = await handler({ action, params }); const c = (r as { content?: Array<{ text: string }> }).content; return Array.isArray(c) ? JSON.parse(c[0]?.text ?? "{}") : (r as Record<string, unknown>); }

// ── 1. Hermetic categorization ─────────────────────────────────────────────

describe("SkillRefinementDigestEngine.digest() — categorization", () => {
  function full() {
    const skills = [
      mkSkill("healthy-skill"),
      mkSkill("stale-skill", { last_refined: daysAgoISO(120) }),
      mkSkill("linter-bad-skill"),
      mkSkill("overridden-skill"),
      mkSkill("double-trouble", { last_refined: daysAgoISO(200) }), // stale AND linter-flagged ⇒ in 2 categories, once in the union
    ];
    return skillRefinementDigestEngine.digest({
      registryObject: mkRegistry(skills),
      lintReportObject: mkLint([{ name: "linter-bad-skill", rules: ["R3", "R4"] }, { name: "double-trouble", rules: ["R7"], severity: "MINOR" }]),
      telemetryEventsObject: [{ skill: "overridden-skill", type: "override", ts: new Date(NOW).toISOString() }],
      auditObject: mkAudit([{ name: "linter-bad-skill", grade: "needs_refinement", distance: "far", reasons: ["Q2: 0 trigger phrases"] }, { name: "stale-skill", grade: "needs_refinement", distance: "mid", reasons: ["no scenarios/ fixtures yet"] }]),
      nowMs: NOW,
    });
  }

  it("places each skill in the right category and excludes the healthy one", () => {
    const d = full();
    expect(d.totalSkills).toBe(5);
    expect(inCat(d, "linter_flagged", "linter-bad-skill")).toBe(true);
    expect(inCat(d, "stale_but_hot", "stale-skill")).toBe(true);
    expect(inCat(d, "output_overridden", "overridden-skill")).toBe(true);
    expect(inCat(d, "linter_flagged", "double-trouble")).toBe(true);
    expect(inCat(d, "stale_but_hot", "double-trouble")).toBe(true);
    expect(inCat(d, "linter_flagged", "healthy-skill")).toBe(false);
    expect(inCat(d, "stale_but_hot", "healthy-skill")).toBe(false);
    expect(inCat(d, "output_overridden", "healthy-skill")).toBe(false);
    expect(d.allHealthy).toBe(false);
  });

  it("the union dedups a multi-category skill and the spotlight obeys A>B>C precedence", () => {
    const d = full();
    expect(d.actionableCount).toBe(4); // overridden-skill, stale-skill, linter-bad-skill, double-trouble
    expect(d.spotlight.length).toBeLessThanOrEqual(3);
    expect(d.spotlight[0].name).toBe("overridden-skill"); // category A first
    expect(d.spotlight[0].category).toBe("output_overridden");
    expect(new Set(d.spotlight.map((e) => e.name)).size).toBe(d.spotlight.length); // no dup
  });

  it("entries are enriched from the latest audit (grade / distance / reasons → suggestedFix)", () => {
    const d = full();
    const e = entry(d, "linter_flagged", "linter-bad-skill");
    expect(e.auditGrade).toBe("needs_refinement");
    expect(e.auditDistance).toBe("far");
    expect(e.auditReasons).toEqual(["Q2: 0 trigger phrases"]);
    expect(e.suggestedFix).toMatch(/Q2: 0 trigger phrases/);
    // a skill with no audit entry falls back to a lint-rule pointer
    const o = entry(d, "stale_but_hot", "double-trouble");
    expect(o.auditGrade).toBe(null);
    expect(o.suggestedFix.length).toBeGreaterThan(0);
  });

  it("respects the per-category cap and flags which categories were truncated", () => {
    const stale = Array.from({ length: 20 }, (_, i) => mkSkill(`stale-${i}`, { last_refined: daysAgoISO(100 + i) }));
    const d = skillRefinementDigestEngine.digest({ registryObject: mkRegistry(stale), lintReportObject: mkLint([]), auditObject: mkAudit([]), perCategoryCap: 5, nowMs: NOW });
    expect(d.categories.stale_but_hot.length).toBe(5);
    expect(d.caps.perCategory).toBe(5);
    expect(d.caps.truncatedCategories).toContain("stale_but_hot");
    expect(d.advisories.join(" ")).toMatch(/capped at 5/i);
  });

  it("all-healthy registry ⇒ allHealthy with the 'not the same as production-grade' caveat advisory", () => {
    const d = skillRefinementDigestEngine.digest({ registryObject: mkRegistry([mkSkill("only-healthy")]), lintReportObject: mkLint([]), telemetryEventsObject: [], auditObject: mkAudit([]), nowMs: NOW });
    expect(d.allHealthy).toBe(true);
    expect(d.actionableCount).toBe(0);
    expect(d.advisories.join(" ")).toMatch(/no skill landed|nothing acutely broken|production-grade/i);
    expect(d.weekLabel).toMatch(/^\d{4}-W\d{2}$/);
    expect(d.schemaVersion).toBe(SKILL_REFINEMENT_DIGEST_SCHEMA_VERSION);
  });
});

// ── 2. Degradation ─────────────────────────────────────────────────────────

describe("SkillRefinementDigestEngine.digest() — graceful degradation", () => {
  it("no telemetry events ⇒ output_overridden is empty with an advisory; linter_flagged still works", () => {
    const d = skillRefinementDigestEngine.digest({ registryObject: mkRegistry([mkSkill("a"), mkSkill("bad")]), lintReportObject: mkLint([{ name: "bad", rules: ["R3"] }]), auditObject: mkAudit([]), nowMs: NOW });
    expect(d.categories.output_overridden.length).toBe(0);
    expect(d.advisories.join(" ")).toMatch(/output_overridden.*empty|no telemetry|override-event/i);
    expect(inCat(d, "linter_flagged", "bad")).toBe(true);
  });

  it("no invocation counts ⇒ 'stale_but_hot' degrades to 'stale (>90d)' with an advisory", () => {
    const d = skillRefinementDigestEngine.digest({ registryObject: mkRegistry([mkSkill("old", { last_refined: daysAgoISO(150) }), mkSkill("new")]), lintReportObject: mkLint([]), auditObject: mkAudit([]), nowMs: NOW });
    expect(inCat(d, "stale_but_hot", "old")).toBe(true);
    expect(inCat(d, "stale_but_hot", "new")).toBe(false);
    expect(entry(d, "stale_but_hot", "old").reason).toMatch(/stale|>\s*90d/i);
    expect(d.advisories.join(" ")).toMatch(/invocation telemetry unavailable|narrow to stale-AND-/i);
  });

  it("no lint report ⇒ linter_flagged is empty with an advisory", () => {
    const d = skillRefinementDigestEngine.digest({ registryObject: mkRegistry([mkSkill("a")]), lintReportPath: path.join(os.tmpdir(), "no-such-lint-sku04.json"), auditObject: mkAudit([]), nowMs: NOW });
    expect(d.categories.linter_flagged.length).toBe(0);
    expect(d.sources.lintReportFound).toBe(false);
    expect(d.advisories.join(" ")).toMatch(/lint report not found/i);
  });

  it("no audit ⇒ entries carry null grade/distance and an advisory is raised", () => {
    const d = skillRefinementDigestEngine.digest({ registryObject: mkRegistry([mkSkill("bad")]), lintReportObject: mkLint([{ name: "bad" }]), auditPath: path.join(os.tmpdir(), "no-such-audit-sku04.json"), telemetryEventsObject: [], nowMs: NOW });
    expect(entry(d, "linter_flagged", "bad").auditGrade).toBe(null);
    expect(d.sources.auditFound).toBe(false);
    expect(d.advisories.join(" ")).toMatch(/audit.*not readable|skill-library audit/i);
  });
});

// ── 3. Failure modes / adversarial ─────────────────────────────────────────

describe("SkillRefinementDigestEngine.digest() — failure modes & adversarial", () => {
  it("throws when the registry can't be read", () => {
    expect(() => skillRefinementDigestEngine.digest({ registryPath: path.join(os.tmpdir(), "no-such-registry-sku04.json") })).toThrow(/cannot read SKILL_QUALITY_REGISTRY/i);
  });
  it("rejects a non-object registryObject", () => {
    expect(() => skillRefinementDigestEngine.digest({ registryObject: 42 })).toThrow(/must be an object/i);
  });
  it("empty registry ⇒ 0 skills, allHealthy, sensible markdown", () => {
    const d = skillRefinementDigestEngine.digest({ registryObject: mkRegistry([]), lintReportObject: mkLint([]), telemetryEventsObject: [], auditObject: mkAudit([]), nowMs: NOW });
    expect(d.totalSkills).toBe(0);
    expect(d.allHealthy).toBe(true);
    expect(skillRefinementDigestEngine.renderMarkdown(d)).toContain("No action needed this week");
  });
  it("unparseable last_refined ⇒ the skill is not flagged stale (unknown age)", () => {
    const d = skillRefinementDigestEngine.digest({ registryObject: mkRegistry([mkSkill("weird", { last_refined: "not-a-date" })]), lintReportObject: mkLint([]), auditObject: mkAudit([]), nowMs: NOW });
    expect(inCat(d, "stale_but_hot", "weird")).toBe(false);
  });
  it("skips garbage records in skills[]", () => {
    const reg = mkRegistry([mkSkill("good"), null, 7, "x", { description: "no name here but long enough" }]);
    const d = skillRefinementDigestEngine.digest({ registryObject: reg, lintReportObject: mkLint([]), auditObject: mkAudit([]), nowMs: NOW });
    expect(d.totalSkills).toBe(2); // "good" + "(unnamed)"
  });
  it("a telemetry event older than the week window does not count for category A", () => {
    const d = skillRefinementDigestEngine.digest({ registryObject: mkRegistry([mkSkill("old-override")]), lintReportObject: mkLint([]), auditObject: mkAudit([]), telemetryEventsObject: [{ skill: "old-override", type: "override", ts: daysAgoISO(30) }], nowMs: NOW });
    expect(inCat(d, "output_overridden", "old-override")).toBe(false);
  });
});

// ── 4. renderMarkdown ──────────────────────────────────────────────────────

describe("SkillRefinementDigestEngine.renderMarkdown()", () => {
  it("renders the header, the human-action caveat, and the three category sections", () => {
    const d = skillRefinementDigestEngine.digest({ registryObject: mkRegistry([mkSkill("a"), mkSkill("bad"), mkSkill("old", { last_refined: daysAgoISO(150) })]), lintReportObject: mkLint([{ name: "bad" }]), telemetryEventsObject: [], auditObject: mkAudit([]), nowMs: NOW });
    const md = skillRefinementDigestEngine.renderMarkdown(d, { dateLabel: "2026-05-15" });
    expect(md).toContain("# PRISM Weekly Skill-Refinement Digest — 2026-05-15");
    expect(md).toMatch(/Refinement is a human\/forge action/i);
    expect(md).toContain("A. Output overridden");
    expect(md).toContain("B. Stale");
    expect(md).toContain("C. Linter-flagged");
    expect(md).toMatch(/prism_dev:skill_refinement_digest/);
    expect(md).toMatch(/`bad`/);  // the linter-flagged skill shows in section C
  });
  it("escapes pipes in entry fields", () => {
    const d = skillRefinementDigestEngine.digest({ registryObject: mkRegistry([mkSkill("bad")]), lintReportObject: mkLint([{ name: "bad" }]), auditObject: mkAudit([{ name: "bad", reasons: ["a | b | c"] }]), telemetryEventsObject: [], nowMs: NOW });
    const md = skillRefinementDigestEngine.renderMarkdown(d);
    const row = md.split("\n").find((l) => l.startsWith("| `bad`")) ?? "";
    expect(row).toMatch(/^\| `bad` \|/);
    expect((row.match(/(?<!\\)\|/g) || []).length).toBe(6); // 5-cell row: Skill|Why|Last refined|Audit|Suggested fix
  });
});

// ── 5. CLI — scripts/skill-refinement-digest.mjs ───────────────────────────

describe("CLI — scripts/skill-refinement-digest.mjs", () => {
  const run = (args: string[]) => spawnSync(process.execPath, [CLI_PATH, ...args], { cwd: REPO_ROOT, encoding: "utf-8", timeout: 60_000 });
  it("--help exits 0 and prints usage", () => { const r = run(["--help"]); expect(r.status).toBe(0); expect(r.stdout).toMatch(/skill-refinement-digest\.mjs/); expect(r.stdout).toMatch(/Friday review/i); });
  it("--self-test exits 0 with every internal check passing", () => { const r = run(["--self-test"]); expect(r.status).toBe(0); expect(r.stdout + r.stderr).toMatch(/checks passed/); });
  it("--json --no-write --registry <tmp> emits internally-consistent JSON without writing", () => {
    const regFile = tmpRegistryFile([mkSkill("a"), mkSkill("b", { last_refined: daysAgoISO(200) })]);
    const r = run(["--json", "--no-write", "--registry", regFile]);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.totalSkills).toBe(2);
    expect(out.counts.stale_but_hot).toBe(1); // "b" is 200d stale
    expect(out.written).toBe(null);
    expect(out.schemaVersion).toBe(SKILL_REFINEMENT_DIGEST_SCHEMA_VERSION);
    expect(out.weekLabel).toMatch(/^\d{4}-W\d{2}$/);
  });
});

// ── 6. prism_dev:skill_refinement_digest — dispatcher round-trip ──────────

describe("prism_dev:skill_refinement_digest — dispatcher round-trip", () => {
  it("the action is registered in the prism_dev enum", () => { expect(captureDevHandler().actions).toContain("skill_refinement_digest"); });

  it("returns the flat summary (counts as numbers — survives the shared response-slimmer); full=true returns the whole digest; markdown=true attaches the report", async () => {
    const regFile = tmpRegistryFile([mkSkill("a"), mkSkill("b", { last_refined: daysAgoISO(200) }), mkSkill("bad")]);
    const { handler } = captureDevHandler();
    const lintFile = (() => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-sku04-")); const p = path.join(dir, "skill-lint-report.json"); fs.writeFileSync(p, JSON.stringify(mkLint([{ name: "bad", rules: ["R3"] }]))); return p; })();
    const summary = await invokeDev(handler, "skill_refinement_digest", { registry_path: regFile, lint_report_path: lintFile, audit_path: path.join(os.tmpdir(), "nope.json") });
    expect(summary.totalSkills).toBe(3);
    expect((summary.counts as Record<string, number>).linter_flagged).toBe(1);   // "bad" is flagged
    expect((summary.counts as Record<string, number>).stale_but_hot).toBe(1);     // "b" is 200d stale
    expect((summary.counts as Record<string, number>).output_overridden).toBe(0); // no telemetry
    expect(summary.actionableCount).toBe(2);
    expect(summary.weekLabel as string).toMatch(/^\d{4}-W\d{2}$/);
    expect(Array.isArray(summary.spotlight)).toBe(true);
    // full=true exposes the per-category arrays (non-empty ones survive slimming)
    const full = await invokeDev(handler, "skill_refinement_digest", { registry_path: regFile, lint_report_path: lintFile, full: true });
    expect(Array.isArray((full.categories as Record<string, unknown[]>).linter_flagged)).toBe(true);
    expect((full.categories as Record<string, Array<{ name: string }>>).linter_flagged.map((e) => e.name)).toContain("bad");
    // markdown=true attaches the rendered digest
    const withMd = await invokeDev(handler, "skill_refinement_digest", { registry_path: regFile, markdown: true });
    expect(withMd.markdown as string).toContain("# PRISM Weekly Skill-Refinement Digest");
  });
});
