/**
 * skillRegistry.test.ts — U-SKU06 (SKILLS-UTILIZATION-MS0).
 *
 * Verifies the skill-quality registry foundation:
 *   - the pure parsing/extraction helpers in `skillQualitySchema.ts`
 *     (parseSkillFile, extractTriggerPhrases, detectOutputExample, countBodyLines,
 *      detectVagueLanguageViolations, detectPlaceholderViolations, coerceSkillType,
 *      defaultSkillQuality) and the Zod schemas;
 *   - the `SkillQualityRegistryBuilder` walk over synthetic root trees spanning
 *     the source tiers (user/project/plugin), flat + tree layouts, and
 *     frontmatter completeness full/partial/none/malformed;
 *   - the adversarial cases from the atomized spec: >1024-char description,
 *     same-name-across-tiers shadowing (R7 — surface, don't average), unclosed
 *     frontmatter → parse failure, missing root → graceful skip;
 *   - a smoke run against PRISM's real project skill library (the parser must not
 *     crash on any real SKILL.md; parse failures bounded; every row schema-valid).
 *
 * Acceptance: `cd mcp-server && npx vitest run skillRegistry`.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";

import {
  SKILL_QUALITY_SCHEMA_VERSION,
  SKILL_DESCRIPTION_MAX_CHARS,
  SKILL_BODY_LINE_CAP,
  parseSkillFile,
  extractTriggerPhrases,
  detectOutputExample,
  detectVagueLanguageViolations,
  detectPlaceholderViolations,
  countBodyLines,
  coerceSkillType,
  defaultSkillQuality,
  SkillQualityRecordZ,
  SkillQualityRegistryZ,
} from "../schemas/skillQualitySchema.js";
import {
  SkillQualityRegistryBuilder,
  skillQualityRegistryBuilder,
  buildSkillQualityRegistry,
  type SkillSourceRoot,
} from "../registries/SkillQualityRegistryBuilder.js";

// ────────────────────────────────────────────────────────────────────────────
// helpers
// ────────────────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];
async function mkTmp(prefix = "prism-sku06-"): Promise<string> {
  const d = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tmpDirs.push(d);
  return d;
}
async function writeFile(p: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, "utf-8");
}
function fm(obj: Record<string, string>): string {
  return "---\n" + Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join("\n") + "\n---\n";
}
async function exists(p: string): Promise<boolean> {
  return fs.access(p).then(() => true).catch(() => false);
}

afterAll(async () => {
  for (const d of tmpDirs) await fs.rm(d, { recursive: true, force: true }).catch(() => {});
});

// ────────────────────────────────────────────────────────────────────────────
// 1. parseSkillFile
// ────────────────────────────────────────────────────────────────────────────

describe("parseSkillFile", () => {
  it("parses a minimal frontmatter + body", () => {
    const r = parseSkillFile("---\nname: foo\ndescription: bar baz\n---\n# Body\nhello\n");
    expect(r.frontmatter).toEqual({ name: "foo", description: "bar baz" });
    expect(r.body).toBe("# Body\nhello\n");
    expect("parseError" in r).toBe(false);
  });

  it("parses a full frontmatter — block scalar, inline array, bool, number, quoted, comment line", () => {
    const content = [
      "---",
      "# this is a comment, must be skipped",
      "name: full-skill",
      "description: |",
      "  Multi-line description",
      "  second line",
      "trigger_phrases: [alpha, bravo, charlie]",
      'model: "opus"',
      "max_turns: 12",
      "disable-model-invocation: true",
      "user-invocable: false",
      "skill_type: methodology",
      "---",
      "body content here",
    ].join("\n");
    const f = parseSkillFile(content).frontmatter ?? {};
    expect(f.name).toBe("full-skill");
    expect(String(f.description)).toBe("Multi-line description\nsecond line");
    expect(f.trigger_phrases).toEqual(["alpha", "bravo", "charlie"]);
    expect(f.model).toBe("opus");
    expect(f.max_turns).toBe(12);
    expect(f["disable-model-invocation"]).toBe(true);
    expect(f["user-invocable"]).toBe(false);
    expect(f.skill_type).toBe("methodology");
    expect(parseSkillFile(content).body.trim()).toBe("body content here");
  });

  it("treats a file with NO frontmatter as a legacy flat command — frontmatter null, body = whole file, no error", () => {
    const content = "# Legacy command\nDo the thing.\nNo frontmatter at all.\n";
    const r = parseSkillFile(content);
    expect(r.frontmatter).toBe(null);
    expect(r.body).toBe(content);
    expect("parseError" in r).toBe(false);
  });

  it("flags a frontmatter block that opens with '---' but never closes — parseError mentions the cause, body preserved, no throw", () => {
    const content = "---\nname: broken\ndescription: never closed\n# (no closing dashes)\nbody flows on\n";
    let r!: ReturnType<typeof parseSkillFile>;
    expect(() => { r = parseSkillFile(content); }).not.toThrow();
    expect(r.frontmatter).toBe(null);
    expect(r.parseError).toMatch(/opened.*never closed/i);
    expect(r.body).toBe(content);
  });

  it("skips unparseable lines inside the frontmatter block but keeps the valid keys", () => {
    const content = ["---", "name: ok", "]]]garbage line", ": : :", "valid_key: value", "---", "body"].join("\n");
    let r!: ReturnType<typeof parseSkillFile>;
    expect(() => { r = parseSkillFile(content); }).not.toThrow();
    expect(r.frontmatter?.name).toBe("ok");
    expect(r.frontmatter?.valid_key).toBe("value");
    expect(r.body.trim()).toBe("body");
  });

  it("handles empty / whitespace-only input without throwing", () => {
    expect(parseSkillFile("")).toEqual({ frontmatter: null, body: "" });
    expect(() => parseSkillFile("   \n\n  ")).not.toThrow();
    expect(parseSkillFile("   \n\n  ").frontmatter).toBe(null);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. extractTriggerPhrases
// ────────────────────────────────────────────────────────────────────────────

describe("extractTriggerPhrases", () => {
  it("extracts ≥5 phrases from a description that lists 5+ quoted trigger phrases", () => {
    const desc =
      'Use when the user says "lint my skills", "check skill quality", "find vague language in skills", "skill over 500 lines", "show the skill lint report".';
    const phrases = extractTriggerPhrases(desc);
    expect(phrases.length).toBeGreaterThanOrEqual(5);
    expect(phrases).toContain("lint my skills");
    expect(phrases).toContain("check skill quality");
    expect(phrases).toContain("show the skill lint report");
  });

  it("collapses near-duplicate phrases (stem similarity ≥ 0.8) — 'write email' / 'write an email' / 'write the email' count as one", () => {
    const desc = 'Triggers on "write email", "write an email", "write the email", "write my email".';
    const phrases = extractTriggerPhrases(desc);
    const emailish = phrases.filter((p) => /write.*email/i.test(p));
    expect(emailish.length).toBe(1);
  });

  it("picks up 'use when X' clauses when there are no quotes", () => {
    const desc = "Use when importing a STEP file. Use when analyzing part geometry. Use when recognizing features.";
    const phrases = extractTriggerPhrases(desc);
    expect(phrases.length).toBeGreaterThanOrEqual(2);
    expect(phrases.some((p) => /step file/i.test(p))).toBe(true);
  });

  it("returns [] for an empty / missing description", () => {
    expect(extractTriggerPhrases("")).toEqual([]);
    expect(extractTriggerPhrases(undefined as unknown as string)).toEqual([]);
  });

  it("caps the result at 24 phrases (given >24 pairwise-distinct candidates)", () => {
    // 30 hand-distinct phrases — pairwise stem-similarity well below the 0.8 dedup
    // threshold, so none collapse and the only thing trimming the list is the 24-cap.
    const distinct = [
      "import a step file", "recognize milling features", "compute cutting forces", "select a drill size",
      "generate a fanuc post", "validate machine envelope", "estimate part cost", "design a fixture",
      "check collision clearance", "calculate spindle speed", "plan toolpath strategy", "audit skill quality",
      "lint vague language", "merge two designs", "export a tool library", "probe part alignment",
      "harden a controller", "optimize feed rate", "analyze tool wear", "quote a job",
      "simulate g-code output", "tokenize cad geometry", "reason over tribal knowledge", "build a roadmap",
      "schedule a cron job", "scan the marketplace", "refine a stale skill", "test the happy path",
      "grade the library", "bundle a plugin",
    ];
    const phrases = extractTriggerPhrases(`Triggers on ${distinct.map((p) => `"${p}"`).join(", ")}.`);
    expect(phrases.length).toBe(24);
    expect(phrases).toContain("import a step file");
    expect(phrases).toContain("compute cutting forces");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. detectOutputExample / countBodyLines / vague + placeholder / coerce / defaults / zod
// ────────────────────────────────────────────────────────────────────────────

describe("detectOutputExample", () => {
  it("is true when a fenced code block sits within 3 lines of 'example' / 'output'", () => {
    expect(detectOutputExample("## Example output\nHere is what perfect output looks like:\n```\n{ \"ok\": true }\n```\n")).toBe(true);
  });
  it("is true when a markdown table sits near 'returns' / 'result'", () => {
    expect(detectOutputExample("It returns the following result:\n\n| field | value |\n|---|---|\n| ok | true |\n")).toBe(true);
  });
  it("is false when a code block exists but is nowhere near an anchor word, and false for empty body", () => {
    const body = "Step one. Step two.\n\n\n\n\n```\nsnippet\n```\n\n\n\n\nUnrelated trailing prose with no anchor near the fence.";
    expect(detectOutputExample(body)).toBe(false);
    expect(detectOutputExample("")).toBe(false);
  });
});

describe("countBodyLines", () => {
  it("separates instruction lines from fenced-code lines (the 500-cap is checked against instruction lines)", () => {
    const body = ["instr 1", "instr 2", "```", "code a", "code b", "code c", "```", "instr 3"].join("\n");
    expect(countBodyLines(body)).toEqual({ instructionLines: 3, codeLines: 5, totalLines: 8 });
  });
  it("returns zeros for an empty body, and SKILL_BODY_LINE_CAP is the documented 500", () => {
    expect(countBodyLines("")).toEqual({ instructionLines: 0, codeLines: 0, totalLines: 0 });
    expect(SKILL_BODY_LINE_CAP).toBe(500);
  });
});

describe("detectVagueLanguageViolations", () => {
  it("flags banned vague verbs in instruction prose", () => {
    const v = detectVagueLanguageViolations("Format it nicely and handle the rest appropriately. Then deal with the leftovers.");
    expect(v).toContain("format-nicely");
    expect(v).toContain("appropriately");
    expect(v).toContain("deal-with");
  });
  it("does NOT flag a banned phrase that only appears inside a fenced code block or a quoted string", () => {
    const body = ['A skill ABOUT errors documents the phrase "handle appropriately".', "```", "format nicely", "```"].join("\n");
    expect(detectVagueLanguageViolations(body)).toEqual([]);
  });
  it("returns [] for clean prose and for empty input", () => {
    expect(detectVagueLanguageViolations("Run `tsc --noEmit`; assert exit code 0.")).toEqual([]);
    expect(detectVagueLanguageViolations("")).toEqual([]);
  });
});

describe("detectPlaceholderViolations", () => {
  it("flags TODO / <insert / [your X / stub markers in instruction prose", () => {
    expect(detectPlaceholderViolations("TODO: finish this. <insert details>. [your value here]. This is a stub.")).toEqual(
      expect.arrayContaining(["todo", "insert-here", "your-placeholder", "stub"]),
    );
  });
  it("ignores those tokens when they only appear in a fenced code block", () => {
    expect(detectPlaceholderViolations("Real content.\n```\nTODO\nFIXME\n```\n")).toEqual([]);
  });
});

describe("coerceSkillType", () => {
  it("coerces the four valid kinds (case-insensitive, trims)", () => {
    expect(coerceSkillType("rigid")).toBe("rigid");
    expect(coerceSkillType("FLEXIBLE")).toBe("flexible");
    expect(coerceSkillType("  Methodology ")).toBe("methodology");
    expect(coerceSkillType("reference")).toBe("reference");
  });
  it("returns undefined for anything else", () => {
    expect(coerceSkillType("bogus")).toBe(undefined);
    expect(coerceSkillType(123)).toBe(undefined);
    expect(coerceSkillType(undefined)).toBe(undefined);
  });
});

describe("defaultSkillQuality + zod schemas", () => {
  it("default quality block has the expected shape and the given last_refined date", () => {
    expect(defaultSkillQuality("2026-05-01")).toEqual({
      production_grade: false,
      last_refined: "2026-05-01",
      trigger_phrases: [],
      has_output_example: false,
      body_line_count: 0,
      scenario_tests: { happy: null, edge: null, stress: null },
      vague_language_violations: [],
      last_audited: null,
      invocation_count_30d: null,
    });
  });
  it("SkillQualityRecordZ accepts a well-formed record and rejects malformed ones", () => {
    const good = {
      name: "x",
      path: "/abs/x/SKILL.md",
      tier: "project" as const,
      description: "ok",
      description_over_limit: false,
      disable_model_invocation: false,
      user_invocable: true,
      quality: defaultSkillQuality("2026-05-01"),
    };
    expect(SkillQualityRecordZ.safeParse(good).success).toBe(true);
    expect(SkillQualityRecordZ.safeParse({ ...good, quality: { ...good.quality, body_line_count: -1 } }).success).toBe(false);
    expect(SkillQualityRecordZ.safeParse({ ...good, tier: "galaxy" }).success).toBe(false);
    expect(SkillQualityRecordZ.safeParse({ ...good, name: "" }).success).toBe(false);
  });
  it("SkillQualityRegistryZ accepts a minimal valid registry and rejects one with a bad skills entry", () => {
    const reg = {
      schemaVersion: SKILL_QUALITY_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      total: 0,
      byTier: {},
      parseFailures: 0,
      skills: [],
    };
    expect(SkillQualityRegistryZ.safeParse(reg).success).toBe(true);
    expect(SkillQualityRegistryZ.safeParse({ ...reg, skills: [{ name: "x" }] }).success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. SkillQualityRegistryBuilder — synthetic library
// ────────────────────────────────────────────────────────────────────────────

async function seedSyntheticLibrary(root: string): Promise<SkillSourceRoot[]> {
  await writeFile(
    path.join(root, "proj", "commands", "good-cmd.md"),
    // NB: the description value must NOT start with a quote — parseSkillFile strips a
    // leading/trailing wrapping quote, which would swallow the first quoted phrase.
    fm({ name: "good-cmd", description: 'use when "alpha", "beta", "gamma", "delta", "epsilon" — a flat command skill', skill_type: "rigid" }) +
      "## Example\n```\nresult: ok\n```\n",
  );
  await writeFile(path.join(root, "proj", "commands", "legacy-cmd.md"), "# Legacy\nJust prose, no frontmatter.\n");
  await writeFile(
    path.join(root, "proj", "skills", "tree-skill", "SKILL.md"),
    fm({ name: "tree-skill", description: "a tree-layout skill", "disable-model-invocation": "true" }) + "body\n",
  );
  await writeFile(
    path.join(root, "plugins", "myplug", "skills", "pskill", "SKILL.md"),
    fm({ name: "pskill", description: "a plugin skill", "user-invocable": "false" }) + "plugin body\n",
  );
  await writeFile(
    path.join(root, "proj", "skills", "vague-one", "SKILL.md"),
    fm({ name: "vague-one", description: "vague skill" }) + "Format it nicely. Handle the rest as needed.\n",
  );
  await writeFile(
    path.join(root, "proj", "skills", "explicit-tp", "SKILL.md"),
    fm({ name: "explicit-tp", description: "no inline phrases here", trigger_phrases: "[one, two, three, four, five]" }) + "body\n",
  );
  await writeFile(
    path.join(root, "proj", "skills", "longdesc", "SKILL.md"),
    fm({ name: "longdesc", description: "x".repeat(SKILL_DESCRIPTION_MAX_CHARS + 250) }) + "body\n",
  );
  await writeFile(
    path.join(root, "proj", "skills", "malformed-fm", "SKILL.md"),
    "---\nname: malformed-fm\ndescription: never closed\nbody flows straight on with no closing dashes\n",
  );
  return [
    { dir: path.join(root, "proj", "commands"), tier: "project", layout: "flat" },
    { dir: path.join(root, "proj", "skills"), tier: "project", layout: "tree" },
    { dir: path.join(root, "plugins"), tier: "plugin", layout: "tree" },
    { dir: path.join(root, "does-not-exist"), tier: "user", layout: "flat" }, // → missingRoots
  ];
}

describe("SkillQualityRegistryBuilder — synthetic library", () => {
  let root: string;
  let result: Awaited<ReturnType<SkillQualityRegistryBuilder["build"]>>;

  beforeAll(async () => {
    root = await mkTmp();
    const roots = await seedSyntheticLibrary(root);
    result = await new SkillQualityRegistryBuilder().build({ roots, write: false });
  });

  it("discovers every seeded skill across flat + tree + plugin layouts and skips the missing root", () => {
    expect(result.registry.skills.map((s) => s.name).sort()).toEqual(
      ["explicit-tp", "good-cmd", "legacy-cmd", "longdesc", "malformed-fm", "myplug:pskill", "tree-skill", "vague-one"].sort(),
    );
    expect(result.registry.total).toBe(8);
    expect(result.missingRoots.some((r) => r.endsWith("does-not-exist"))).toBe(true);
    expect(result.writtenTo).toBe(null);
  });

  it("byTier counts add up to the total and the registry validates against the Zod schema", () => {
    expect(Object.values(result.registry.byTier).reduce((a, b) => a + b, 0)).toBe(result.registry.total);
    expect(result.registry.byTier.project).toBe(7);
    expect(result.registry.byTier.plugin).toBe(1);
    expect(SkillQualityRegistryZ.safeParse(result.registry).success).toBe(true);
    expect(result.registry.schemaVersion).toBe(SKILL_QUALITY_SCHEMA_VERSION);
  });

  it("a legacy no-frontmatter command → name=filename, description='', trigger_phrases=[]", () => {
    const legacy = result.registry.skills.find((s) => s.name === "legacy-cmd")!;
    expect(legacy.description).toBe("");
    expect(legacy.quality.trigger_phrases).toEqual([]);
    expect(legacy.tier).toBe("project");
    expect("_parse_error" in legacy).toBe(false);
  });

  it("a plugin skill records its namespace; flags carry through; skill_type parsed; output example detected", () => {
    const p = result.registry.skills.find((s) => s.name === "myplug:pskill")!;
    expect(p.tier).toBe("plugin");
    expect(p.plugin).toBe("myplug");
    expect(p.user_invocable).toBe(false);
    const tree = result.registry.skills.find((s) => s.name === "tree-skill")!;
    expect(tree.disable_model_invocation).toBe(true);
    expect("skill_type" in tree).toBe(false);
    const good = result.registry.skills.find((s) => s.name === "good-cmd")!;
    expect(good.skill_type).toBe("rigid");
    expect(good.quality.has_output_example).toBe(true);
    expect(good.quality.trigger_phrases.length).toBeGreaterThanOrEqual(5);
  });

  it("an over-long description is truncated to the cap and flagged description_over_limit", () => {
    const ld = result.registry.skills.find((s) => s.name === "longdesc")!;
    expect(ld.description.length).toBe(SKILL_DESCRIPTION_MAX_CHARS);
    expect(ld.description_over_limit).toBe(true);
  });

  it("an explicit frontmatter trigger_phrases array overrides the heuristic", () => {
    expect(result.registry.skills.find((s) => s.name === "explicit-tp")!.quality.trigger_phrases).toEqual([
      "one", "two", "three", "four", "five",
    ]);
  });

  it("a body with banned vague language is captured in quality.vague_language_violations", () => {
    expect(result.registry.skills.find((s) => s.name === "vague-one")!.quality.vague_language_violations).toEqual(
      expect.arrayContaining(["format-nicely", "as-needed"]),
    );
  });

  it("a SKILL.md with malformed (unclosed) frontmatter → row still produced, _parse_error set, counted in parseFailures (R12)", () => {
    const m = result.registry.skills.find((s) => s.name === "malformed-fm")!;
    expect(m._parse_error).toMatch(/never closed/i);
    expect(m.description).toBe(""); // frontmatter unparseable → no description salvaged
    expect(result.registry.parseFailures).toBeGreaterThanOrEqual(1);
    expect(result.parseFailures).toBe(result.registry.parseFailures);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Adversarial: same skill name across tiers → shadowing pointers, never silent overwrite (R7)
// ────────────────────────────────────────────────────────────────────────────

describe("SkillQualityRegistryBuilder — name shadowing across tiers (R7)", () => {
  it("records BOTH copies with shadows / shadowed_by pointers, winner = higher-precedence tier", async () => {
    const root = await mkTmp();
    await writeFile(path.join(root, "userc", "dup.md"), fm({ name: "dup", description: "user copy" }) + "u\n");
    await writeFile(path.join(root, "projc", "dup.md"), fm({ name: "dup", description: "project copy" }) + "p\n");
    const { registry } = await new SkillQualityRegistryBuilder().build({
      roots: [
        { dir: path.join(root, "userc"), tier: "user", layout: "flat" },
        { dir: path.join(root, "projc"), tier: "project", layout: "flat" },
      ],
      write: false,
    });
    const dups = registry.skills.filter((s) => s.name === "dup");
    expect(dups.length).toBe(2);
    expect(dups.find((s) => s.tier === "user")!.shadows).toEqual(["dup@project"]);
    expect(dups.find((s) => s.tier === "project")!.shadowed_by).toBe("dup@user");
    expect(registry.total).toBe(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Persist round-trip + buildSkillQualityRegistry() convenience + read()
// ────────────────────────────────────────────────────────────────────────────

describe("SkillQualityRegistryBuilder — persist + read round-trip", () => {
  it("write:true emits a schema-valid JSON + parse-failure sidecar; read() round-trips; read(missing) → null", async () => {
    const root = await mkTmp();
    await writeFile(path.join(root, "c", "a.md"), fm({ name: "a", description: "skill a" }) + "body\n");
    const outPath = path.join(root, "out", "SKILL_QUALITY_REGISTRY.json");
    const failPath = path.join(root, "out", "parse-failures.json");

    const res = await new SkillQualityRegistryBuilder().build({
      roots: [{ dir: path.join(root, "c"), tier: "project", layout: "flat" }],
      write: true,
      outPath,
      parseFailuresPath: failPath,
    });
    expect(res.writtenTo).toBe(outPath);
    expect(await exists(outPath)).toBe(true);

    const raw = JSON.parse(await fs.readFile(outPath, "utf-8"));
    expect(SkillQualityRegistryZ.safeParse(raw).success).toBe(true);
    expect(raw.total).toBe(1);
    expect(raw.skills[0].name).toBe("a");

    const failRaw = JSON.parse(await fs.readFile(failPath, "utf-8"));
    expect(failRaw.count).toBe(0);
    expect(failRaw.failures).toEqual([]);

    const back = await new SkillQualityRegistryBuilder().read(outPath);
    expect(back?.total).toBe(1);
    expect(back?.skills[0].name).toBe("a");
    expect(await new SkillQualityRegistryBuilder().read(path.join(root, "nope.json"))).toBe(null);
  });

  it("buildSkillQualityRegistry() convenience returns a compact summary and honors write:false", async () => {
    const root = await mkTmp();
    await writeFile(path.join(root, "c", "x.md"), fm({ name: "x", description: "x" }) + "b\n");
    await writeFile(path.join(root, "c", "y.md"), fm({ name: "y", description: "y" }) + "b\n");
    const summary = await buildSkillQualityRegistry({
      roots: [{ dir: path.join(root, "c"), tier: "project", layout: "flat" }],
      write: false,
    });
    expect(summary.total).toBe(2);
    expect(summary.parseFailures).toBe(0);
    expect(summary.writtenTo).toBe(null);
    expect(summary.byTier.project).toBe(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 7. Smoke: parse the REAL skill library available on this machine without crashing
// ────────────────────────────────────────────────────────────────────────────

describe("SkillQualityRegistryBuilder — real library smoke", () => {
  it(
    "walks the live skill roots (production behaviour): ≥1 skill, parse failures bounded, every record schema-valid, byTier consistent, names well-formed",
    { timeout: 60_000 },
    async () => {
      // Scan whatever roots exist on THIS machine — exactly what the populator does in
      // production. On a bare CI checkout without ~/.claude/* the user/plugin roots simply
      // land in missingRoots and we fall back to the (small) project roots; the assertions
      // below are deliberately count-tolerant so this is still a real, non-crashing smoke run.
      const { registry, parseFailures, missingRoots } = await skillQualityRegistryBuilder.build({ write: false });
      expect(registry.total).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(missingRoots)).toBe(true);

      // never more than ~10% of rows may have failed frontmatter parsing (and the two counts agree)
      expect(parseFailures).toBeLessThanOrEqual(Math.max(2, Math.ceil(registry.total * 0.1)));
      expect(registry.parseFailures).toBe(parseFailures);

      // every emitted row is schema-valid (R12 — surface the first offender loudly)
      const firstBad = registry.skills
        .map((rec) => ({ rec, r: SkillQualityRecordZ.safeParse(rec) }))
        .find(({ r }) => !r.success);
      if (firstBad) {
        throw new Error(`record ${firstBad.rec.name} (${firstBad.rec.path}) failed schema: ${JSON.stringify(firstBad.r.error!.issues[0])}`);
      }

      // byTier is a histogram that sums to the total; every tier key is one of the four
      expect(Object.values(registry.byTier).reduce((a, b) => a + b, 0)).toBe(registry.total);
      for (const t of Object.keys(registry.byTier)) {
        expect(["enterprise", "user", "project", "plugin"]).toContain(t);
      }

      // names are non-empty and unique within a (name, tier, path) triple; plugin rows carry a namespace
      expect(registry.skills.every((s) => s.name.length > 0 && s.path.length > 0)).toBe(true);
      expect(registry.skills.filter((s) => s.tier === "plugin").every((s) => typeof s.plugin === "string" && s.plugin!.length > 0)).toBe(true);
      const triples = new Set(registry.skills.map((s) => `${s.name} ${s.tier} ${s.path}`));
      expect(triples.size).toBe(registry.skills.length);

      // Sanity, gated on a non-trivial library: when we actually scanned a real skill set
      // (user commands + plugins are present on the dev box → dozens-to-hundreds of skills),
      // the heuristic MUST have extracted trigger phrases for at least one skill. With only
      // the 2 project commands on a bare CI checkout that is not a meaningful expectation, so
      // it is skipped there.
      if (registry.total >= 20) {
        expect(registry.skills.some((s) => s.quality.trigger_phrases.length > 0)).toBe(true);
        expect(registry.skills.some((s) => s.quality.body_line_count > 0)).toBe(true);
      }
    },
  );

  it(
    "scoped to project roots only (skipUserRoots) it still produces a valid registry — used by CI / determinism",
    { timeout: 30_000 },
    async () => {
      const { registry, parseFailures } = await skillQualityRegistryBuilder.build({ write: false, skipUserRoots: true });
      expect(registry.total).toBeGreaterThanOrEqual(1);
      expect(parseFailures).toBeLessThanOrEqual(Math.max(2, Math.ceil(registry.total * 0.1)));
      expect(SkillQualityRegistryZ.safeParse(registry).success).toBe(true);
      // project roots are flat command files → all rows are tier "project"
      expect(registry.skills.every((s) => s.tier === "project")).toBe(true);
    },
  );
});
