/**
 * skillLibraryAudit.test.ts — U-SKU05 (SKILLS-UTILIZATION-MS0) coverage for the
 * skill-library audit: the {@link SkillLibraryAuditEngine}, the CLI wrapper
 * `scripts/skill-library-audit.mjs`, and the `prism_dev:skill_audit` dispatcher
 * action.
 *
 * Layers
 *  1. Hermetic grading — synthetic SKILL_QUALITY_REGISTRY + skill-lint-report
 *     objects injected straight into `audit()`; assert each skill lands in the
 *     specified bucket (production_grade / needs_refinement / stub_or_orphan),
 *     the sum invariant holds, the gap list is prioritized, and the ROI estimate
 *     is a range with stated assumptions.
 *  2. Failure modes & adversarial input — missing/malformed registry → throws;
 *     missing lint report → tolerated with an advisory; unparseable `last_refined`
 *     → graded without crashing; empty registry → empty-but-consistent scorecard;
 *     `quality` field absent → handled; garbage entries skipped; vague opener → Q1 fails.
 *  3. Variability — 3-skill mostly-stub vs ~30-skill mixed registries; then the
 *     *real* live registry (full path: frontmatter re-read + `scenarios/` probe)
 *     — assert the structural invariants without coupling to the count-of-the-day.
 *  4. renderMarkdown — produces the scorecard sections; 0-skill safe; pipes escaped.
 *  5. CLI — `--self-test` exits 0; `--help` exits 0; `--json --no-write --from <tmp>`
 *     emits internally-consistent JSON; the exit code = (needs_refinement + stub).
 *  6. prism_dev:skill_audit — handler captured via a mock McpServer (not just the
 *     engine singleton): default summary, `full:true`, `markdown:true`, and a
 *     bad-path call that surfaces an error rather than crashing the dispatcher.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  skillLibraryAuditEngine,
  SkillLibraryAuditEngine,
  SKILL_LIBRARY_AUDIT_SCHEMA_VERSION,
  type SkillGrade,
} from "../engines/SkillLibraryAuditEngine.js";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { SKILL_QUALITY_REGISTRY_PATH } from "../registries/SkillQualityRegistryBuilder.js";

// repo root — mcp-server/src/__tests__/ → ../../.. = repo root
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CLI_PATH = path.join(REPO_ROOT, "scripts", "skill-library-audit.mjs");
const NOW = Date.now();
const HRS_PER_PRODUCTION_SKILL_YEAR = 25; // 0.5 h/wk × 50 wk — must match the engine

// ── synthetic-fixture builders ─────────────────────────────────────────────

function daysAgoISO(n: number, nowMs = NOW): string {
  const d = new Date(nowMs);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

type Over = Record<string, unknown> & { quality?: Record<string, unknown> };

/** A baseline skill that, with an empty lint report, grades `needs_refinement` only because it has no scenario results. */
function mkSkill(name: string, over: Over = {}): Record<string, unknown> {
  const baseQuality: Record<string, unknown> = {
    production_grade: false,
    last_refined: daysAgoISO(30),
    trigger_phrases: ["alpha trigger", "beta trigger", "gamma trigger"],
    has_output_example: true,
    body_line_count: 40,
    scenario_tests: { happy: null, edge: null, stress: null },
    vague_language_violations: [],
    last_audited: null,
    invocation_count_30d: null,
  };
  const { quality: qOver, ...restOver } = over;
  return {
    name,
    path: null,
    tier: "user",
    description: "A clear, specific description that comfortably exceeds the forty-character Q1 floor — used for fixtures.",
    description_over_limit: false,
    disable_model_invocation: false,
    user_invocable: true,
    quality: { ...baseQuality, ...(qOver ?? {}) },
    ...restOver,
  };
}

function mkRegistry(skills: Array<unknown>): Record<string, unknown> {
  return { schemaVersion: "1.0.0", generatedAt: new Date(NOW).toISOString(), total: skills.length, byTier: { user: skills.length }, parseFailures: 0, skills };
}

/** A lint report flagging the named skills (default severity MAJOR, rule R3). */
function mkLintReport(flagged: Array<{ name: string; rules?: string[]; severity?: string }>): Record<string, unknown> {
  return {
    schemaVersion: "1.0.0", generatedAt: new Date(NOW).toISOString(), scanned: 999, flagged: flagged.length, advisoryOnly: 0, parseFailures: 0,
    skills: flagged.map((f) => ({ name: f.name, path: null, tier: "user", severity: f.severity ?? "MAJOR", rules: f.rules ?? ["R3"], findings: (f.rules ?? ["R3"]).map((r) => ({ rule: r, severity: f.severity ?? "MAJOR" })) })),
  };
}

function tmpFile(name: string, obj: unknown): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-sku05-"));
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf-8");
  return p;
}

// ── dispatcher round-trip plumbing (mirrors SkillScenarioTestEngine.test.ts) ─

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<
  { content?: Array<{ type: "text"; text: string }>; isError?: boolean } | Record<string, unknown>
>;
function captureDevHandler(): { handler: McpHandler; actions: readonly string[] } {
  let handler: McpHandler | null = null;
  let actions: readonly string[] = [];
  const enumValues = (a: unknown): readonly string[] => {
    const z = a as { options?: readonly string[]; _def?: { values?: readonly string[]; entries?: Record<string, unknown> } };
    if (Array.isArray(z?.options)) return z.options;
    if (Array.isArray(z?._def?.values)) return z._def!.values!;
    if (z?._def?.entries && typeof z._def.entries === "object") return Object.keys(z._def.entries);
    return [];
  };
  const server = {
    tool(name: string, _d: string, schema: Record<string, unknown>, cb: McpHandler) {
      if (name === "prism_dev") { handler = cb; actions = enumValues((schema as { action?: unknown }).action); }
      else if (!handler) { handler = cb; }
    },
  };
  registerDevDispatcher(server as unknown as Parameters<typeof registerDevDispatcher>[0]);
  if (!handler) throw new Error("registerDevDispatcher did not register a handler");
  return { handler, actions };
}
async function invokeDev(handler: McpHandler, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const r = await handler({ action, params });
  const content = (r as { content?: Array<{ text: string }> }).content;
  if (!Array.isArray(content)) return r as Record<string, unknown>;
  return JSON.parse(content[0]?.text ?? "{}");
}

// ───────────────────────────────────────────────────────────────────────────
// 1. Hermetic grading
// ───────────────────────────────────────────────────────────────────────────

describe("SkillLibraryAuditEngine.audit() — grading", () => {
  function gradedRegistry() {
    const skills = [
      // production_grade: clean (absent from the lint report) + 3Q + all-3-scenario-tests pass
      mkSkill("prod-skill", { quality: { scenario_tests: { happy: "pass", edge: "pass", stress: "pass" } } }),
      // needs_refinement: 3Q-OK, clean, but no scenario results
      mkSkill("needs-noscenario"),
      // needs_refinement: linter-flagged (MAJOR/R3+R7 in the lint report)
      mkSkill("needs-lintflagged"),
      // needs_refinement: Q1 fails — description present (≥10 chars) but under the 40-char floor
      mkSkill("needs-shortdesc", { description: "short description" }),
      // needs_refinement: Q1 fails — vague opener ("a tool for stuff")
      mkSkill("needs-vague", { description: "a tool for stuff" }),
      // needs_refinement: Q2 fails — only 1 trigger phrase (not exempt)
      mkSkill("needs-fewtriggers", { quality: { trigger_phrases: ["only one"] } }),
      // needs_refinement: Q2 exempt (disable_model_invocation); still no scenarios ⇒ needs_refinement
      mkSkill("needs-exemptq2", { disable_model_invocation: true, quality: { trigger_phrases: [] } }),
      // needs_refinement: methodology — Q3-exempt (no output example); still no scenarios ⇒ needs_refinement
      mkSkill("needs-methodology", { skill_type: "methodology", quality: { has_output_example: false } }),
      // stub_or_orphan: 5-line body
      mkSkill("stub-shortbody", { quality: { body_line_count: 5 } }),
      // stub_or_orphan: zero invocations, last refined 200d ago
      mkSkill("stub-orphan", { quality: { invocation_count_30d: 0, last_refined: daysAgoISO(200) } }),
      // NOT stub_or_orphan: zero invocations but refined 5d ago (brand-new exemption)
      mkSkill("brandnew", { quality: { invocation_count_30d: 0, last_refined: daysAgoISO(5) } }),
      // NOT stub_or_orphan: zero invocations + old, but a reference skill (user_invocable false)
      mkSkill("ref-skill", { user_invocable: false, quality: { invocation_count_30d: 0, last_refined: daysAgoISO(300) } }),
      // stub_or_orphan: effectively empty description
      mkSkill("stub-nodesc", { description: "  " }),
    ];
    return skillLibraryAuditEngine.audit({ registryObject: mkRegistry(skills), lintReportObject: mkLintReport([{ name: "needs-lintflagged", rules: ["R3", "R7"] }]), nowMs: NOW });
  }
  const gradeOf = (r: ReturnType<typeof skillLibraryAuditEngine.audit>, name: string): SkillGrade | undefined => r.skills.find((s) => s.name === name)?.grade;

  it("buckets each skill exactly as specified", () => {
    const r = gradedRegistry();
    expect(gradeOf(r, "prod-skill")).toBe("production_grade");
    expect(gradeOf(r, "needs-noscenario")).toBe("needs_refinement");
    expect(gradeOf(r, "needs-lintflagged")).toBe("needs_refinement");
    expect(gradeOf(r, "needs-shortdesc")).toBe("needs_refinement");
    expect(gradeOf(r, "needs-vague")).toBe("needs_refinement");
    expect(gradeOf(r, "needs-fewtriggers")).toBe("needs_refinement");
    expect(gradeOf(r, "needs-exemptq2")).toBe("needs_refinement");
    expect(gradeOf(r, "needs-methodology")).toBe("needs_refinement");
    expect(gradeOf(r, "stub-shortbody")).toBe("stub_or_orphan");
    expect(gradeOf(r, "stub-orphan")).toBe("stub_or_orphan");
    expect(gradeOf(r, "brandnew")).toBe("needs_refinement");
    expect(gradeOf(r, "ref-skill")).toBe("needs_refinement");
    expect(gradeOf(r, "stub-nodesc")).toBe("stub_or_orphan");
  });

  it("sum invariant: production_grade + needs_refinement + stub_or_orphan == total", () => {
    const r = gradedRegistry();
    expect(r.counts.production_grade + r.counts.needs_refinement + r.counts.stub_or_orphan).toBe(r.total);
    expect(r.sumInvariantOk).toBe(true);
    expect(r.total).toBe(13);
    expect(r.counts).toEqual({ production_grade: 1, needs_refinement: 9, stub_or_orphan: 3 });
    expect(r.gapList.length).toBe(12);
    expect(r.byGrade.production_grade).toEqual(["prod-skill"]);
    expect(r.byGrade.stub_or_orphan).toEqual(expect.arrayContaining(["stub-shortbody", "stub-orphan", "stub-nodesc"]));
  });

  it("Q-flags and lint fields reflect the right reasons", () => {
    const r = gradedRegistry();
    const find = (n: string) => r.skills.find((s) => s.name === n)!;
    expect(find("needs-shortdesc").threeQ.q1).toBe(false);
    expect(find("needs-vague").threeQ.q1).toBe(false);
    expect(find("needs-fewtriggers").threeQ.q2).toBe(false);
    expect(find("needs-exemptq2").threeQ.q2).toBe(true);
    expect(find("needs-methodology").threeQ.q3).toBe(true);
    expect(find("needs-methodology").skillType).toBe("methodology");
    expect(find("needs-lintflagged").lintSeverity).toBe("MAJOR");
    expect(find("needs-lintflagged").lintRules).toEqual(expect.arrayContaining(["R3", "R7"]));
    expect(find("needs-lintflagged").reasons.join(" ")).toMatch(/linter/);
    expect(find("prod-skill").reasons.join(" ")).toMatch(/scenario/);
    expect(find("ref-skill").isReferenceSkill).toBe(true);
    expect(find("needs-noscenario").distance).toBe("mid"); // 3Q-OK + clean, no fixtures ⇒ "mid" (one fixture-write + run away once written)
  });

  it("gap list is prioritized: every needs_refinement entry precedes every stub_or_orphan entry", () => {
    const r = gradedRegistry();
    const grades = r.gapList.map((g) => g.grade);
    const firstStub = grades.indexOf("stub_or_orphan");
    const lastNeeds = grades.lastIndexOf("needs_refinement");
    expect(firstStub).toBeGreaterThan(0);
    expect(lastNeeds).toBeGreaterThan(-1);
    expect(lastNeeds).toBeLessThan(firstStub);
    for (const g of r.gapList) expect(g.reasons.length).toBeGreaterThan(0);
  });

  it("ROI estimate is a range with stated assumptions; scales with the production-grade count", () => {
    const r0 = skillLibraryAuditEngine.audit({ registryObject: mkRegistry([mkSkill("a"), mkSkill("b"), mkSkill("c")]), lintReportObject: mkLintReport([]), nowMs: NOW });
    expect(r0.counts.production_grade).toBe(0);
    expect(r0.roiEstimate.lowerBoundHrsYr).toBe(0);
    expect(r0.roiEstimate.upperBoundHrsYr).toBe(0);
    expect(r0.roiEstimate.perSkillHrsYr).toBe(HRS_PER_PRODUCTION_SKILL_YEAR);
    expect(r0.roiEstimate.potentialIfFixturesWritten.extraSkills).toBe(3);
    expect(r0.roiEstimate.potentialIfFixturesWritten.upperBoundHrsYr).toBe(3 * HRS_PER_PRODUCTION_SKILL_YEAR);
    expect(r0.roiEstimate.assumptions.length).toBeGreaterThanOrEqual(2);
    expect(r0.roiEstimate.assumptions.join(" ")).toMatch(/fuzzy|range/i);

    const r1 = skillLibraryAuditEngine.audit({ registryObject: mkRegistry([mkSkill("p", { quality: { scenario_tests: { happy: "pass", edge: "pass", stress: "pass" } } })]), lintReportObject: mkLintReport([]), nowMs: NOW });
    expect(r1.counts.production_grade).toBe(1);
    expect(r1.roiEstimate.upperBoundHrsYr).toBe(HRS_PER_PRODUCTION_SKILL_YEAR);
  });

  it("domain bucketing maps known prefixes and lumps the rest into Other; byDomain rows sum to total", () => {
    const r = skillLibraryAuditEngine.audit({ registryObject: mkRegistry([mkSkill("cad-extract"), mkSkill("wedm-program"), mkSkill("lathe-thread"), mkSkill("hypermill-drill"), mkSkill("mystery-thing"), mkSkill("forge-audit")]), lintReportObject: mkLintReport([]), nowMs: NOW });
    const dom = (n: string) => r.skills.find((s) => s.name === n)!.domain;
    expect(dom("cad-extract")).toBe("CAD");
    expect(dom("wedm-program")).toBe("WEDM/EDM");
    expect(dom("lathe-thread")).toBe("Lathe/Turning");
    expect(dom("hypermill-drill")).toBe("CAM-vendor");
    expect(dom("forge-audit")).toBe("Dev-pipeline");
    expect(dom("mystery-thing")).toBe("Other/cross-cutting");
    expect(Object.values(r.byDomain).reduce((a, x) => a + x.total, 0)).toBe(r.total);
  });

  it("reports the audit schema version and surfaces the telemetry advisory", () => {
    const r = gradedRegistry();
    expect(r.schemaVersion).toBe(SKILL_LIBRARY_AUDIT_SCHEMA_VERSION);
    expect(r.invocationUndercounted).toBe(true);
    expect(r.advisories.join(" ")).toMatch(/telemetry/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 2. Failure modes & adversarial input
// ───────────────────────────────────────────────────────────────────────────

describe("SkillLibraryAuditEngine.audit() — failure modes & adversarial input", () => {
  it("throws a helpful error when the registry file does not exist", () => {
    expect(() => skillLibraryAuditEngine.audit({ registryPath: path.join(os.tmpdir(), "no-such-registry-xyz.json") })).toThrow(/cannot read SKILL_QUALITY_REGISTRY/i);
  });

  it("throws when the registry file is not valid JSON", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-sku05-"));
    const p = path.join(dir, "broken.json");
    fs.writeFileSync(p, "{ not: valid json,,, ", "utf-8");
    expect(() => skillLibraryAuditEngine.audit({ registryPath: p })).toThrow(/not valid JSON/i);
  });

  it("tolerates a missing lint report — every skill graded linter-clean, with an advisory", () => {
    const r = skillLibraryAuditEngine.audit({ registryObject: mkRegistry([mkSkill("x"), mkSkill("y")]), lintReportPath: path.join(os.tmpdir(), "no-such-lint-report-xyz.json"), nowMs: NOW });
    expect(r.sources.lintReportFound).toBe(false);
    expect(r.advisories.join(" ")).toMatch(/lint report not found/i);
    expect(r.skills.every((s) => s.lintSeverity === null)).toBe(true);
    expect(r.sumInvariantOk).toBe(true);
    expect(r.counts.needs_refinement).toBe(2);
  });

  it("handles an unparseable last_refined without crashing (unknown age ⇒ the orphan rule cannot fire)", () => {
    const r = skillLibraryAuditEngine.audit({ registryObject: mkRegistry([mkSkill("weird-date", { quality: { last_refined: "not-a-date", invocation_count_30d: 0 } })]), lintReportObject: mkLintReport([]), nowMs: NOW });
    const s = r.skills.find((x) => x.name === "weird-date")!;
    expect(s.lastRefinedDaysAgo).toBe(null);
    expect(s.grade).toBe("needs_refinement");
  });

  it("empty registry ⇒ empty-but-consistent scorecard (0 == 0)", () => {
    const r = skillLibraryAuditEngine.audit({ registryObject: mkRegistry([]), lintReportObject: mkLintReport([]), nowMs: NOW });
    expect(r.total).toBe(0);
    expect(r.counts).toEqual({ production_grade: 0, needs_refinement: 0, stub_or_orphan: 0 });
    expect(r.sumInvariantOk).toBe(true);
    expect(r.gapList).toEqual([]);
    expect(r.roiEstimate.upperBoundHrsYr).toBe(0);
    expect(skillLibraryAuditEngine.renderMarkdown(r)).toContain("## Scorecard");
  });

  it("handles a record with the quality field entirely absent", () => {
    const r = skillLibraryAuditEngine.audit({ registryObject: mkRegistry([{ name: "no-quality", path: null, tier: "user", description: "A perfectly reasonable description that exceeds the forty-character floor for Q1." }]), lintReportObject: mkLintReport([]), nowMs: NOW });
    const s = r.skills.find((x) => x.name === "no-quality")!;
    expect(s.bodyLineCount).toBe(null);
    expect(s.triggerPhraseCount).toBe(0);
    expect(s.grade).toBe("needs_refinement"); // Q2 fails (0 trigger phrases), body not "too short" (line count unknown), description fine ⇒ needs_refinement
    expect(r.sumInvariantOk).toBe(true);
  });

  it("skips garbage records (null / number / string / nameless) in skills[]", () => {
    const reg = mkRegistry([mkSkill("good"), null, 42, "nope", { /* no name */ description: "a description that is plenty long enough to clear the forty-character floor" }]);
    const r = skillLibraryAuditEngine.audit({ registryObject: reg, lintReportObject: mkLintReport([]), nowMs: NOW });
    expect(r.skills.some((s) => s.name === "good")).toBe(true);
    expect(r.skills.some((s) => s.name === "(unnamed)")).toBe(true);
    expect(r.skills.length).toBe(2); // null/42/"nope" dropped; "good" + "(unnamed)" kept
    expect(r.sumInvariantOk).toBe(true);
  });

  it("rejects a non-object registryObject", () => {
    expect(() => skillLibraryAuditEngine.audit({ registryObject: "not an object" })).toThrow(/must be an object/i);
  });

  it("a description over the 1024-char cap fails Q1 and the reason names the cap", () => {
    const r = skillLibraryAuditEngine.audit({ registryObject: mkRegistry([mkSkill("oversize", { description: "x".repeat(2000) })]), lintReportObject: mkLintReport([]), nowMs: NOW });
    const s = r.skills.find((x) => x.name === "oversize")!;
    expect(s.threeQ.q1).toBe(false);
    expect(s.grade).toBe("needs_refinement");
    expect(s.reasons.join(" ")).toMatch(/1024/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 3. Variability
// ───────────────────────────────────────────────────────────────────────────

describe("SkillLibraryAuditEngine.audit() — variability", () => {
  it("3-skill mostly-stub registry → 2 stub, 1 needs", () => {
    const r = skillLibraryAuditEngine.audit({ registryObject: mkRegistry([mkSkill("s1", { quality: { body_line_count: 3 } }), mkSkill("s2", { description: "x" }), mkSkill("s3")]), lintReportObject: mkLintReport([]), nowMs: NOW });
    expect(r.total).toBe(3);
    expect(r.counts.stub_or_orphan).toBe(2);
    expect(r.counts.needs_refinement).toBe(1);
    expect(r.sumInvariantOk).toBe(true);
  });

  it("30-skill mixed registry → 10 prod / 12 needs / 8 stub, sum invariant intact", () => {
    const skills: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 10; i++) skills.push(mkSkill(`mix-prod-${i}`, { quality: { scenario_tests: { happy: "pass", edge: "pass", stress: "pass" } } }));
    for (let i = 0; i < 12; i++) skills.push(mkSkill(`mix-needs-${i}`));
    for (let i = 0; i < 8; i++) skills.push(mkSkill(`mix-stub-${i}`, { quality: { body_line_count: 2 } }));
    const r = skillLibraryAuditEngine.audit({ registryObject: mkRegistry(skills), lintReportObject: mkLintReport([]), nowMs: NOW });
    expect(r.total).toBe(30);
    expect(r.counts).toEqual({ production_grade: 10, needs_refinement: 12, stub_or_orphan: 8 });
    expect(r.sumInvariantOk).toBe(true);
    expect(r.gapList.length).toBe(20);
    expect(r.gapList.every((g) => g.grade !== "production_grade")).toBe(true);
  });

  it("grades the real live SKILL_QUALITY_REGISTRY.json with the structural invariants intact", () => {
    const engine = new SkillLibraryAuditEngine();
    const r = engine.audit({ nowMs: NOW }); // full path: reads the lint report, re-reads frontmatter, probes scenarios/
    expect(r.total).toBeGreaterThan(100);
    expect(r.counts.production_grade + r.counts.needs_refinement + r.counts.stub_or_orphan).toBe(r.total);
    expect(r.sumInvariantOk).toBe(true);
    expect(r.gapList.length).toBe(r.counts.needs_refinement + r.counts.stub_or_orphan);
    expect(r.roiEstimate.productionGradeCount).toBe(r.counts.production_grade);
    expect(Object.values(r.byDomain).reduce((a, x) => a + x.total, 0)).toBe(r.total);
    expect(engine.renderMarkdown(r)).toContain("# PRISM Skill-Library Audit");
    const allNames = new Set(r.skills.map((s) => s.name));
    for (const g of ["production_grade", "needs_refinement", "stub_or_orphan"] as const) for (const n of r.byGrade[g]) expect(allNames.has(n)).toBe(true);
  }, 30_000);
});

// ───────────────────────────────────────────────────────────────────────────
// 4. renderMarkdown
// ───────────────────────────────────────────────────────────────────────────

describe("SkillLibraryAuditEngine.renderMarkdown()", () => {
  it("produces the expected scorecard sections and counts", () => {
    const r = skillLibraryAuditEngine.audit({ registryObject: mkRegistry([mkSkill("a"), mkSkill("b", { quality: { scenario_tests: { happy: "pass", edge: "pass", stress: "pass" } } }), mkSkill("c", { quality: { body_line_count: 1 } })]), lintReportObject: mkLintReport([]), nowMs: NOW });
    const md = skillLibraryAuditEngine.renderMarkdown(r, { dateLabel: "2026-05-12" });
    expect(md).toContain("# PRISM Skill-Library Audit — 2026-05-12");
    expect(md).toContain("## Scorecard");
    expect(md).toContain("## Per-domain breakdown");
    expect(md).toContain("## Gap list");
    expect(md).toContain("## ROI estimate");
    expect(md).toMatch(/prism_dev:skill_audit/);
    expect(md).toMatch(/production_grade \| \*\*1\*\*/);
    expect(md).toMatch(/stub_or_orphan \| \*\*1\*\*/);
  });

  it("escapes pipe characters in gap-list reasons so the markdown table row stays well-formed", () => {
    const r = skillLibraryAuditEngine.audit({ registryObject: mkRegistry([mkSkill("pipey", { description: "x".repeat(2000) })]), lintReportObject: mkLintReport([]), nowMs: NOW });
    const md = skillLibraryAuditEngine.renderMarkdown(r);
    const rows = md.split("\n").filter((l) => l.startsWith("| `pipey`"));
    expect(rows.length).toBe(1);
    // a well-formed 5-column row: leading "| " + 5 cells + trailing " |" ⇒ exactly 6 unescaped pipes
    const unescaped = (rows[0].match(/(?<!\\)\|/g) || []).length;
    expect(unescaped).toBe(6);
  });

  it("0-skill result renders without throwing", () => {
    const r = skillLibraryAuditEngine.audit({ registryObject: mkRegistry([]), nowMs: NOW });
    expect(skillLibraryAuditEngine.renderMarkdown(r)).toContain("| **total** | **0** | 100% |");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 5. CLI — scripts/skill-library-audit.mjs
// ───────────────────────────────────────────────────────────────────────────

describe("CLI — scripts/skill-library-audit.mjs", () => {
  const run = (args: string[]) => spawnSync(process.execPath, [CLI_PATH, ...args], { cwd: REPO_ROOT, encoding: "utf-8", timeout: 60_000 });

  it("--help exits 0 and prints usage", () => {
    const r = run(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/skill-library-audit\.mjs/);
    expect(r.stdout).toMatch(/production_grade/);
  });

  it("--self-test exits 0 with every internal check passing", () => {
    const r = run(["--self-test"]);
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).toMatch(/checks passed/);
  });

  it("--json --no-write --from <synthetic> emits internally-consistent JSON without writing artifacts", () => {
    const regPath = tmpFile("synthetic-registry.json", mkRegistry([mkSkill("cli-prod", { quality: { scenario_tests: { happy: "pass", edge: "pass", stress: "pass" } } }), mkSkill("cli-needs"), mkSkill("cli-stub", { quality: { body_line_count: 2 } })]));
    const lintPath = tmpFile("synthetic-lint.json", mkLintReport([]));
    const r = run(["--json", "--no-write", "--from", regPath, "--lint", lintPath]);
    expect(r.status).toBe(2); // exit code = needs_refinement(1) + stub_or_orphan(1)
    const out = JSON.parse(r.stdout);
    expect(out.total).toBe(3);
    expect(out.counts).toEqual({ production_grade: 1, needs_refinement: 1, stub_or_orphan: 1 });
    expect(out.sumInvariantOk).toBe(true);
    expect(Array.isArray(out.gapListTop10)).toBe(true);
    expect(out.roiEstimate.perSkillHrsYr).toBe(HRS_PER_PRODUCTION_SKILL_YEAR);
    expect(out.written).toBe(null);
  });

  it("--from a nonexistent registry exits 1 with a clear message", () => {
    const r = run(["--from", path.join(os.tmpdir(), "definitely-not-here.json"), "--no-write"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/cannot read SKILL_QUALITY_REGISTRY/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 6. prism_dev:skill_audit — dispatcher round-trip (handler, not engine singleton)
// ───────────────────────────────────────────────────────────────────────────

describe("prism_dev:skill_audit — dispatcher round-trip", () => {
  it("the action is registered in the prism_dev enum", () => {
    const { actions } = captureDevHandler();
    expect(actions).toContain("skill_audit");
  });

  it("default invocation returns the summary (no per-skill array) with the sum invariant", async () => {
    const regPath = tmpFile("rt-registry.json", mkRegistry([mkSkill("rt-prod", { quality: { scenario_tests: { happy: "pass", edge: "pass", stress: "pass" } } }), mkSkill("rt-needs"), mkSkill("rt-stub", { description: "x" })]));
    const lintPath = tmpFile("rt-lint.json", mkLintReport([]));
    const { handler } = captureDevHandler();
    const r = await invokeDev(handler, "skill_audit", { from: regPath, lint: lintPath });
    expect(r.total).toBe(3);
    expect((r.counts as Record<string, number>)).toEqual({ production_grade: 1, needs_refinement: 1, stub_or_orphan: 1 });
    expect(r.sumInvariantOk).toBe(true);
    expect((r.byDomain as Record<string, unknown>) && Object.keys(r.byDomain as object).length).toBeGreaterThan(0);
    expect(Array.isArray(r.gapListTop)).toBe(true);
    expect(r.perSkillCount).toBe(3);
    expect(Array.isArray(r.skills)).toBe(false); // summary mode omits the heavy array
  });

  it("full=true returns the per-skill detail; markdown=true attaches the rendered scorecard", async () => {
    const regPath = tmpFile("rt-registry2.json", mkRegistry([mkSkill("rt2-a"), mkSkill("rt2-b")]));
    const lintPath = tmpFile("rt-lint2.json", mkLintReport([]));
    const { handler } = captureDevHandler();
    const full = await invokeDev(handler, "skill_audit", { from: regPath, lint: lintPath, full: true });
    expect(Array.isArray(full.skills)).toBe(true);
    expect((full.skills as unknown[]).length).toBe(2);
    const withMd = await invokeDev(handler, "skill_audit", { from: regPath, lint: lintPath, markdown: true });
    expect(typeof withMd.markdown).toBe("string");
    expect(withMd.markdown as string).toContain("# PRISM Skill-Library Audit");
  });

  it("a bad registry path surfaces an error rather than crashing the dispatcher", async () => {
    const { handler } = captureDevHandler();
    const r = await invokeDev(handler, "skill_audit", { from: path.join(os.tmpdir(), "rt-no-such.json") });
    expect(r.sumInvariantOk).not.toBe(true);
    expect(JSON.stringify(r)).toMatch(/error|cannot read|not valid/i);
  });
});
