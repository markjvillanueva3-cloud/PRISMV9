/**
 * SkillScenarioTestEngine tests — U-SKU02 (SKILLS-UTILIZATION-MS0).
 *
 * Hermetic: every test builds its own synthetic skill + `scenarios/{happy,edge,stress}.md`
 * fixtures in a fresh tmp dir and (where persistence is exercised) its own
 * SKILL_QUALITY_REGISTRY.json copy — nothing here touches the real `.claude/skills/`
 * tree or the committed registry.
 *
 * Coverage: happy path · ≥4 failure modes (no-fixtures / not-found / malformed / persist-misses)
 * · ≥4 adversarial inputs (oversized stress → truncation, shell-injection text → literal,
 * composed-skill recursion hint, NaN/empty/invalid-regex into the grader) · variability
 * (rigid numeric rubric vs flexible structural rubric vs methodology process rubric;
 * scenario restriction; shadowed-name registry) · a real `prism_dev:skill_test` dispatcher
 * round-trip (handler captured via a mock McpServer, not just the engine singleton).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import {
  SkillScenarioTestEngine,
  skillScenarioTestEngine,
  rubricFromFrontmatter,
  countHeadings,
  splitFixtureBody,
  looksLikeSkillComposition,
  DEFAULT_MAX_INPUT_CHARS,
  MAX_COMPOSITION_DEPTH,
  type ScenarioName,
} from "../engines/SkillScenarioTestEngine.js";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

// ────────────────────────────────────────────────────────────────────────────
// helpers
// ────────────────────────────────────────────────────────────────────────────

let tmpRoot: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "sku02-"));
});
afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
});

/** Write `<tmpRoot>/<skill>/scenarios/<name>.md` with the given frontmatter + body. */
async function writeFixture(skill: string, name: ScenarioName, frontmatter: Record<string, string | number>, body: string): Promise<void> {
  const dir = path.join(tmpRoot, skill, "scenarios");
  await fs.mkdir(dir, { recursive: true });
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  await fs.writeFile(path.join(dir, `${name}.md`), `---\n${fm}\n---\n${body}\n`, "utf-8");
}

/** Convenience: make a skill the engine treats as "exists" by also dropping a SKILL.md. */
async function markSkillExists(skill: string): Promise<void> {
  const dir = path.join(tmpRoot, skill);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "SKILL.md"), "---\nname: " + skill + "\ndescription: synthetic\n---\nbody\n", "utf-8");
}

const eng = () => new SkillScenarioTestEngine();
const ROOTS = () => [tmpRoot];

/** A minimal valid registry with one entry for `skill`. */
function registryWith(skill: string, qualityOverride: Record<string, unknown> = {}): {
  schemaVersion: string;
  generatedAt: string;
  total: number;
  byTier: Record<string, number>;
  parseFailures: number;
  skills: Array<Record<string, unknown>>;
} {
  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date(2020, 0, 1).toISOString(),
    total: 1,
    byTier: { project: 1 },
    parseFailures: 0,
    skills: [
      {
        name: skill,
        path: `/synthetic/${skill}.md`,
        tier: "project",
        description: "synthetic",
        description_over_limit: false,
        disable_model_invocation: false,
        user_invocable: true,
        quality: {
          production_grade: false,
          last_refined: "2020-01-01",
          trigger_phrases: [],
          has_output_example: false,
          body_line_count: 10,
          scenario_tests: { happy: null, edge: null, stress: null },
          vague_language_violations: [],
          last_audited: null,
          invocation_count_30d: null,
          ...qualityOverride,
        },
      },
    ],
  };
}

// dispatcher round-trip plumbing (mirrors distributedCriticalPath.dispatcher.e2e.test.ts)
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
      if (name === "prism_dev") {
        handler = cb;
        actions = enumValues((schema as { action?: unknown }).action);
      } else if (!handler) {
        handler = cb; // fallback if the tool name differs
      }
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

// ────────────────────────────────────────────────────────────────────────────
// pure helpers
// ────────────────────────────────────────────────────────────────────────────

describe("pure helpers", () => {
  it("rubricFromFrontmatter parses flat rubric_* keys; non-stress uses the default cap", () => {
    const r = rubricFromFrontmatter(
      { rubric_must_contain: ["a", "b"], rubric_must_not_contain: ["x"], rubric_min_sections: 2, rubric_must_match: ["\\d+"], rubric_error_markers: ["TODO"], rubric_allow_error_markers: ["ok TODO"], rubric_max_input_chars: 50 },
      false,
    );
    expect(r.mustContain).toEqual(["a", "b"]);
    expect(r.mustNotContain).toEqual(["x"]);
    expect(r.minSections).toBe(2);
    expect(r.mustMatch).toEqual(["\\d+"]);
    expect(r.errorMarkers).toEqual(["TODO"]);
    expect(r.allowErrorMarkers).toEqual(["ok TODO"]);
    expect(r.maxInputChars).toBe(DEFAULT_MAX_INPUT_CHARS); // ignored unless isStress
    expect(r.empty).toBe(false);
  });

  it("rubricFromFrontmatter honours rubric_max_input_chars only for stress, and flags empty rubrics", () => {
    expect(rubricFromFrontmatter({ rubric_max_input_chars: 64 }, true).maxInputChars).toBe(64);
    expect(rubricFromFrontmatter({}, false).empty).toBe(true);
    expect(rubricFromFrontmatter({ description: "just a description, no rubric keys" }, false).empty).toBe(true);
    expect(rubricFromFrontmatter(null, true).empty).toBe(true);
  });

  it("countHeadings counts markdown headings outside fenced code blocks", () => {
    expect(countHeadings("# A\n## B\nplain\n```\n# not a heading\n```\n### C")).toBe(3);
    expect(countHeadings("no headings here")).toBe(0);
    expect(countHeadings("")).toBe(0);
  });

  it("splitFixtureBody strips the `## Expected …` tail", () => {
    const s = splitFixtureBody("do the thing\nwith care\n## Expected output shape\nblah blah");
    expect(s.input).toBe("do the thing\nwith care");
    expect(s.notes).toContain("Expected output shape");
    expect(splitFixtureBody("just an input, no expected section").input).toBe("just an input, no expected section");
  });

  it("looksLikeSkillComposition detects /slash and 'run the X skill' references", () => {
    expect(looksLikeSkillComposition("first run /de-sloppify then summarise")).toBe(true);
    expect(looksLikeSkillComposition("invoke the scrutinize skill afterwards")).toBe(true);
    expect(looksLikeSkillComposition("plain text with no skill references")).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// gradeOutput — pure grader, structural/keyword, never exact match
// ────────────────────────────────────────────────────────────────────────────

describe("gradeOutput", () => {
  const baseRubric = rubricFromFrontmatter({ rubric_must_contain: ["refactor", "naming"], rubric_must_not_contain: ["i can't help"], rubric_min_sections: 1, rubric_must_match: ["\\b\\d+\\b"] }, false);

  it("passes when every check is satisfied — and two DIFFERENT prose outputs both pass (non-deterministic-output adversarial case)", () => {
    const a = "# Findings\nRename `x` for better naming. I'd refactor the 3 branches into a switch.";
    const b = "## Review\nNaming: `r` -> `result`. Refactor: collapse to 1 early return. Touches 12 lines.";
    const ra = eng().gradeOutput(a, baseRubric);
    const rb = eng().gradeOutput(b, baseRubric);
    expect(ra.verdict).toBe("pass");
    expect(ra.failed).toEqual([]);
    expect(rb.verdict).toBe("pass");
    expect(rb.failed).toEqual([]);
  });

  it("fails (does not throw) on empty / undefined / NaN output — coerces, never crashes (adversarial)", () => {
    // empty string and undefined both coerce to "" → the non-empty check trips
    expect(eng().gradeOutput("", baseRubric).verdict).toBe("fail");
    expect(eng().gradeOutput("", baseRubric).failed).toContain("non-empty-output");
    expect(eng().gradeOutput(undefined as unknown as string, baseRubric).verdict).toBe("fail");
    expect(eng().gradeOutput(undefined as unknown as string, baseRubric).failed).toContain("non-empty-output");
    // NaN coerces to the literal string "NaN" (3 chars, non-empty) — so it fails on the keyword
    // checks, not on emptiness; the point is it does not throw and returns a coherent fail verdict
    const nanResult = eng().gradeOutput(NaN as unknown as string, baseRubric);
    expect(nanResult.verdict).toBe("fail");
    expect(nanResult.failed).toContain("must-contain:refactor");
    expect(nanResult.failed).not.toContain("non-empty-output");
  });

  it("flags a forbidden phrase, a missing required phrase, and too few sections", () => {
    const out = "naming refactor 5"; // has must-contain + must-match but 0 headings, and contains a forbidden phrase
    const r = eng().gradeOutput("i can't help — " + out, baseRubric);
    expect(r.verdict).toBe("fail");
    expect(r.failed).toContain("must-not-contain:i can't help");
    expect(r.failed).toContain("min-sections:1");
  });

  it("treats an invalid rubric regex as a failed check, not a crash", () => {
    const bad = rubricFromFrontmatter({ rubric_must_match: ["(unclosed-group"] }, false);
    const r = eng().gradeOutput("# H\nanything", bad);
    expect(r.verdict).toBe("fail");
    const check = r.checks.find((c) => c.name.startsWith("must-match:"));
    expect(check?.detail).toMatch(/invalid rubric regex/i);
  });

  it("fails on a default error marker, but the allow-list suppresses it", () => {
    const r1 = eng().gradeOutput("# H\nthe call site is not defined yet", rubricFromFrontmatter({ rubric_min_sections: 1 }, false));
    expect(r1.verdict).toBe("fail");
    expect(r1.failed.some((f) => f.startsWith("no-error-marker:"))).toBe(true);

    const allowed = rubricFromFrontmatter({ rubric_min_sections: 1, rubric_allow_error_markers: ["the call site is not defined yet — intentional"] }, false);
    const r2 = eng().gradeOutput("# H\nthe call site is not defined yet — intentional", allowed);
    expect(r2.verdict).toBe("pass");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// loadScenarios — fixture discovery + parsing + truncation + adversarial
// ────────────────────────────────────────────────────────────────────────────

describe("loadScenarios", () => {
  it("loads all three fixtures and reports status 'ok'", async () => {
    await writeFixture("good", "happy", { scenario: "happy", rubric_must_contain: '["x"]' }, "happy input");
    await writeFixture("good", "edge", { scenario: "edge", rubric_must_contain: '["y"]' }, "edge input");
    await writeFixture("good", "stress", { scenario: "stress", rubric_must_contain: '["z"]' }, "stress input");
    const r = await eng().loadScenarios("good", { fixtureRoots: ROOTS() });
    expect(r.status).toBe("ok");
    expect(r.scenarios.happy?.input).toBe("happy input");
    expect(r.scenarios.edge?.input).toBe("edge input");
    expect(r.scenarios.stress?.input).toBe("stress input");
    expect(r.maxCompositionDepth).toBe(MAX_COMPOSITION_DEPTH);
    expect(r.scenarios.happy?.malformed).toBe(false);
  });

  it("returns 'no-fixtures' when the skill exists but has no scenarios/ dir, and 'not-found' when it doesn't exist at all", async () => {
    await markSkillExists("bare");
    const a = await eng().loadScenarios("bare", { fixtureRoots: ROOTS() });
    expect(a.status).toBe("no-fixtures");
    const b = await eng().loadScenarios("does-not-exist-anywhere-xyz", { fixtureRoots: ROOTS() });
    expect(b.status).toBe("not-found");
  });

  it("truncates an oversized stress input to the rubric cap and records truncatedFrom (adversarial: input too big for the context window)", async () => {
    const big = "X".repeat(5000);
    await writeFixture("huge", "stress", { scenario: "stress", rubric_max_input_chars: 200, rubric_must_contain: '["x"]' }, big);
    const r = await eng().loadScenarios("huge", { fixtureRoots: ROOTS() });
    const fx = r.scenarios.stress!;
    expect(fx.inputTruncated).toBe(true);
    expect(fx.truncatedFrom).toBe(5000);
    expect(fx.input.length).toBeLessThan(5000);
    expect(fx.input).toContain("truncated");
  });

  it("treats shell-injection text in a fixture as a LITERAL string — no execution, no crash (adversarial)", async () => {
    const evil = "Clean this up: $(rm -rf ~) ; echo `whoami` ; cat /etc/passwd";
    await writeFixture("evil", "happy", { scenario: "happy", rubric_must_contain: '["x"]' }, evil);
    const r = await eng().loadScenarios("evil", { fixtureRoots: ROOTS() });
    expect(r.scenarios.happy?.input).toBe(evil); // verbatim, untouched, unexecuted
    // and the engine module *imports* nothing that can execute a shell / eval (a doc comment
    // may mention `child_process` — we only care that there is no import/require of it, and no eval)
    const src = await fs.readFile(path.join(__dirname, "..", "engines", "SkillScenarioTestEngine.ts"), "utf-8").catch(() => "");
    expect(src.length).toBeGreaterThan(100);
    expect(src).not.toMatch(/(?:import[^\n;]*from\s*["'][^"']*child_process["']|require\(\s*["'][^"']*child_process["']\s*\))/);
    expect(src).not.toMatch(/\beval\s*\(|new\s+Function\s*\(/);
  });

  it("flags a composed-skill fixture with the composition hint, does not recurse (adversarial: skill-calls-skill)", async () => {
    await writeFixture("composer", "happy", { scenario: "happy", rubric_must_contain: '["x"]' }, "First run /de-sloppify on this, then summarise the result.");
    const r = await eng().loadScenarios("composer", { fixtureRoots: ROOTS() });
    expect(r.scenarios.happy?.composition).toBe(true);
    expect(r.maxCompositionDepth).toBe(3);
  });

  it("marks a fixture with no rubric keys (or no input) as malformed but still loadable — not a crash (failure mode)", async () => {
    await writeFixture("noru", "happy", { scenario: "happy", description: "no rubric here" }, "some input but zero rubric_ keys");
    const r1 = await eng().loadScenarios("noru", { fixtureRoots: ROOTS() });
    expect(r1.scenarios.happy?.malformed).toBe(true);
    expect(r1.scenarios.happy?.malformedReason).toMatch(/rubric/i);

    await writeFixture("noin", "edge", { scenario: "edge", rubric_must_contain: '["x"]' }, "## Expected output shape\nonly notes, no input above");
    const r2 = await eng().loadScenarios("noin", { fixtureRoots: ROOTS() });
    expect(r2.scenarios.edge?.malformed).toBe(true);
    expect(r2.scenarios.edge?.malformedReason).toMatch(/no input/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// run — orchestration: grading, production_grade, awaiting-outputs, persistence
// ────────────────────────────────────────────────────────────────────────────

describe("run", () => {
  async function writeGoodTriple(skill: string): Promise<void> {
    // a flexible-style structural rubric
    await writeFixture(skill, "happy", { scenario: "happy", rubric_must_contain: '["refactor"]', rubric_min_sections: 1 }, "happy input here");
    await writeFixture(skill, "edge", { scenario: "edge", rubric_must_not_contain: '["traceback"]' }, "edge input here");
    await writeFixture(skill, "stress", { scenario: "stress", rubric_max_input_chars: 50, rubric_must_match: '["truncat"]' }, "S".repeat(400));
  }

  it("happy: all three outputs pass → status 'graded', productionGrade true", async () => {
    await writeGoodTriple("flex");
    const r = await eng().run("flex", { happy: "# Findings\nI would refactor this.", edge: "looks clean, nothing to change", stress: "# Note\nthe input was truncated; here are the visible fixes" }, "all", { fixtureRoots: ROOTS(), persist: false });
    expect(r.status).toBe("graded");
    expect(r.scenarioTests).toEqual({ happy: "pass", edge: "pass", stress: "pass" });
    expect(r.productionGrade).toBe(true);
    expect(r.results.stress.inputTruncated).toBe(true);
  });

  it("failure mode: one failing output → productionGrade false, reason names the failed checks", async () => {
    await writeGoodTriple("flex");
    const r = await eng().run("flex", { happy: "no headings and no keyword", edge: "fine", stress: "# N\nthe input was truncated" }, "all", { fixtureRoots: ROOTS(), persist: false });
    expect(r.scenarioTests.happy).toBe("fail");
    expect(r.productionGrade).toBe(false);
    expect(r.results.happy.reason).toMatch(/failed checks/i);
  });

  it("no outputs supplied → status 'awaiting-outputs' with the loaded fixtures and the composition-depth cap", async () => {
    await writeGoodTriple("flex");
    const r = await eng().run("flex", undefined, "all", { fixtureRoots: ROOTS() });
    expect(r.status).toBe("awaiting-outputs");
    expect(r.loaded?.scenarios.happy?.input).toBe("happy input here");
    expect(r.note).toMatch(/max_composition_depth=3/);
    expect(r.results.happy.status).toBe("pending");
  });

  it("missing scenarios/ dir → status 'no-fixtures', productionGrade false, not a crash (failure mode)", async () => {
    await markSkillExists("bare2");
    const r = await eng().run("bare2", { happy: "x" }, "all", { fixtureRoots: ROOTS() });
    expect(r.status).toBe("no-fixtures");
    expect(r.productionGrade).toBe(false);
    expect(r.note).toMatch(/no scenarios\/ dir/i);
  });

  it("skill not found anywhere → status 'not-found' (failure mode)", async () => {
    const r = await eng().run("totally-made-up-skill-name", { happy: "x" }, "all", { fixtureRoots: ROOTS() });
    expect(r.status).toBe("not-found");
  });

  it("malformed fixture → that scenario is graded 'fail' with a malformed-fixture reason (failure mode)", async () => {
    await writeFixture("mal", "happy", { scenario: "happy", description: "no rubric" }, "input present, rubric absent");
    await writeFixture("mal", "edge", { scenario: "edge", rubric_must_contain: '["x"]' }, "x present");
    await writeFixture("mal", "stress", { scenario: "stress", rubric_must_contain: '["x"]' }, "x present");
    const r = await eng().run("mal", { happy: "anything", edge: "x", stress: "x" }, "all", { fixtureRoots: ROOTS(), persist: false });
    expect(r.results.happy.status).toBe("fail");
    expect(r.results.happy.reason).toMatch(/malformed-fixture/);
    expect(r.scenarioTests.happy).toBe("fail");
    expect(r.productionGrade).toBe(false);
  });

  it("variability: a rigid numeric rubric, restricted to a single scenario, leaves the others null", async () => {
    // single backslashes in the fixture file (parseSkillFile does no un-escaping) → the engine
    // does new RegExp("\\b10[0-5](\\.\\d+)?\\b"); the JS-string here uses \\ to put a single \ in the file
    await writeFixture("rigidcalc", "happy", { scenario: "happy", rubric_must_match: '["\\b10[0-5](\\.\\d+)?\\b"]' }, "Calc SFM for 0.5in HSS at 800 rpm");
    await writeFixture("rigidcalc", "edge", { scenario: "edge", rubric_must_contain: '["need"]' }, "Calc the feed rate");
    await writeFixture("rigidcalc", "stress", { scenario: "stress", rubric_must_contain: '["rpm"]' }, "batch of 5");
    const r = await eng().run("rigidcalc", { happy: "SFM = pi * 0.5 * 800 / 12 = 104.7 SFM" }, "happy", { fixtureRoots: ROOTS(), persist: false });
    expect(r.results.happy.status).toBe("pass");
    expect(r.results.edge.status).toBe("skip");
    expect(r.results.stress.status).toBe("skip");
    expect(r.scenarioTests).toEqual({ happy: "pass", edge: null, stress: null });
    expect(r.productionGrade).toBe(false); // not all three exist+pass
  });

  it("variability: a methodology-style process rubric grades on structure markers", async () => {
    await writeFixture("methodm", "happy", { scenario: "happy", skill_type: "methodology", rubric_must_match: '["(codex|gemini)"]', rubric_min_sections: 0 }, "scrutinize my changes");
    const r = await eng().run("methodm", { happy: "I'll run the Codex + Gemini reviews then dispatch the Opus reviewer; verdict pending." }, "happy", { fixtureRoots: ROOTS(), persist: false });
    expect(r.results.happy.status).toBe("pass");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// recordVerdicts — persistence into SKILL_QUALITY_REGISTRY.json
// ────────────────────────────────────────────────────────────────────────────

describe("recordVerdicts", () => {
  async function writeRegistry(obj: unknown): Promise<string> {
    const p = path.join(tmpRoot, "SKILL_QUALITY_REGISTRY.json");
    await fs.writeFile(p, JSON.stringify(obj, null, 2), "utf-8");
    return p;
  }

  it("writes scenario_tests + last_audited + recomputes production_grade (all pass + lint-clean)", async () => {
    const regPath = await writeRegistry(registryWith("desloppy"));
    const res = await eng().recordVerdicts("desloppy", { happy: "pass", edge: "pass", stress: "pass" }, { registryPath: regPath });
    expect(res.updated).toBe(true);
    const back = JSON.parse(await fs.readFile(regPath, "utf-8"));
    expect(back.skills[0].quality.scenario_tests).toEqual({ happy: "pass", edge: "pass", stress: "pass" });
    expect(typeof back.skills[0].quality.last_audited).toBe("string");
    expect(back.skills[0].quality.last_audited).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(back.skills[0].quality.production_grade).toBe(true);
    expect(res.record?.quality.scenario_tests.stress).toBe("pass");
  });

  it("does NOT mark production_grade when the linter already flagged the skill, even with all-pass tests", async () => {
    const regPath = await writeRegistry(registryWith("vagueskill", { vague_language_violations: ["appropriately"] }));
    const res = await eng().recordVerdicts("vagueskill", { happy: "pass", edge: "pass", stress: "pass" }, { registryPath: regPath });
    expect(res.updated).toBe(true);
    const back = JSON.parse(await fs.readFile(regPath, "utf-8"));
    expect(back.skills[0].quality.scenario_tests.happy).toBe("pass");
    expect(back.skills[0].quality.production_grade).toBe(false); // lint not clean
  });

  it("returns {updated:false, reason} for a missing registry and for a skill not in the registry (failure modes)", async () => {
    const miss = await eng().recordVerdicts("x", { happy: "pass", edge: "pass", stress: "pass" }, { registryPath: path.join(tmpRoot, "nope.json") });
    expect(miss.updated).toBe(false);
    expect(miss.reason).toBe("no-registry");

    const regPath = await writeRegistry(registryWith("present"));
    const notin = await eng().recordVerdicts("absent", { happy: "pass", edge: "pass", stress: "pass" }, { registryPath: regPath });
    expect(notin.updated).toBe(false);
    expect(notin.reason).toBe("skill-not-in-registry");
  });

  it("picks the non-shadowed copy when a name appears twice and reports the skipped shadows (R7)", async () => {
    const reg = registryWith("dup");
    reg.skills.push({ ...JSON.parse(JSON.stringify(reg.skills[0])), tier: "user", shadowed_by: "dup@project" });
    reg.skills[0] = { ...reg.skills[0], shadows: ["dup@user"] };
    const regPath = await writeRegistry(reg);
    const res = await eng().recordVerdicts("dup", { happy: "pass", edge: "fail", stress: null }, { registryPath: regPath });
    expect(res.updated).toBe(true);
    expect(res.skippedShadows).toEqual(["dup@user"]);
    const back = JSON.parse(await fs.readFile(regPath, "utf-8"));
    const projRow = back.skills.find((s: { tier: string }) => s.tier === "project");
    expect(projRow.quality.scenario_tests).toEqual({ happy: "pass", edge: "fail", stress: null });
    expect(projRow.quality.production_grade).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// dispatcher round-trip — prism_dev:skill_test (handler captured, not engine singleton)
// ────────────────────────────────────────────────────────────────────────────

describe("prism_dev:skill_test — dispatcher round-trip", () => {
  it("exposes skill_test + skill_quality_registry_build + skill_quality_registry_read in the action enum", () => {
    const { actions } = captureDevHandler();
    expect(actions).toContain("skill_test");
    expect(actions).toContain("skill_quality_registry_build");
    expect(actions).toContain("skill_quality_registry_read");
  });

  it("skill_quality_registry_read on a missing registry → {found:false} with a hint (no crash)", async () => {
    const { handler } = captureDevHandler();
    const r = await invokeDev(handler, "skill_quality_registry_read", { path: path.join(tmpRoot, "no-such-registry.json") });
    expect(r.found).toBe(false);
    expect(String(r.hint)).toMatch(/skill_quality_registry_build/);
  });

  it("skill_quality_registry_build (hermetic — roots scoped to a tmp dir with one SKILL.md) → counts it", async () => {
    await markSkillExists("foo"); // writes <tmpRoot>/foo/SKILL.md
    const { handler } = captureDevHandler();
    const r = await invokeDev(handler, "skill_quality_registry_build", { write: false, roots: [{ dir: tmpRoot, tier: "project", layout: "tree" }] });
    expect(typeof r.total).toBe("number");
    expect(r.total as number).toBeGreaterThanOrEqual(1);
    // write:false → nothing written to disk (the dispatcher may strip the null `writtenTo` from the JSON)
    expect(r.writtenTo == null).toBe(true);
  });

  it("round-trips: no outputs → awaiting-outputs with fixtures; then with outputs → graded + persisted", async () => {
    await writeFixture("rt", "happy", { scenario: "happy", rubric_must_contain: '["ok"]', rubric_min_sections: 1 }, "happy in");
    await writeFixture("rt", "edge", { scenario: "edge", rubric_must_not_contain: '["traceback"]' }, "edge in");
    await writeFixture("rt", "stress", { scenario: "stress", rubric_max_input_chars: 30, rubric_must_match: '["truncat"]' }, "Z".repeat(200));
    const regPath = path.join(tmpRoot, "REG.json");
    await fs.writeFile(regPath, JSON.stringify(registryWith("rt"), null, 2), "utf-8");

    const { handler } = captureDevHandler();

    const step1 = await invokeDev(handler, "skill_test", { skill: "rt", fixture_roots: [tmpRoot] });
    expect(step1.status).toBe("awaiting-outputs");
    expect((step1 as { loaded?: { scenarios?: { happy?: { input?: string } } } }).loaded?.scenarios?.happy?.input).toBe("happy in");

    const step2 = await invokeDev(handler, "skill_test", {
      skill: "rt",
      fixture_roots: [tmpRoot],
      registry_path: regPath,
      outputs: { happy: "# Findings\nok looks fine", edge: "no issues", stress: "# N\nthe input was truncated; visible part handled" },
    });
    expect(step2.status).toBe("graded");
    expect(step2.scenarioTests).toEqual({ happy: "pass", edge: "pass", stress: "pass" });
    expect(step2.productionGrade).toBe(true);
    expect(step2.persistedTo).toBe(regPath);
    const back = JSON.parse(await fs.readFile(regPath, "utf-8"));
    expect(back.skills[0].quality.scenario_tests).toEqual({ happy: "pass", edge: "pass", stress: "pass" });
    expect(back.skills[0].quality.production_grade).toBe(true);
  });

  it("round-trips an error: missing skill param → {error: ...}", async () => {
    const { handler } = captureDevHandler();
    const r = await invokeDev(handler, "skill_test", {});
    expect(r.error).toMatch(/skill is required/i);
  });

  it("the engine singleton and a fresh instance behave identically (smoke)", async () => {
    await writeFixture("smk", "happy", { scenario: "happy", rubric_must_contain: '["x"]' }, "in");
    const a = await skillScenarioTestEngine.loadScenarios("smk", { fixtureRoots: [tmpRoot] });
    const b = await eng().loadScenarios("smk", { fixtureRoots: [tmpRoot] });
    expect(a.status).toBe("ok");
    expect(b.status).toBe("ok");
    expect(a.scenarios.happy?.input).toBe(b.scenarios.happy?.input);
  });
});
