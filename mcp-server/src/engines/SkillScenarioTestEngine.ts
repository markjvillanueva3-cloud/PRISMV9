/**
 * Skill Scenario Test Engine — U-SKU02 (SKILLS-UTILIZATION-MS0).
 *
 * Implements @eng_khairallah1's Phase-3 "Three-Scenario" production-grade bar:
 *   - **happy**  — the normal case (~80% of invocations).
 *   - **edge**   — weird / incomplete / conflicting / already-done input.
 *   - **stress** — the biggest / messiest version of the input.
 * A skill is `production_grade` only when it passes all three with client-ready
 * output. PRISM had no skill-testing protocol; this engine + the `prism_dev:skill_test`
 * action + the `/skill-test` slash command install one.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SPLIT OF RESPONSIBILITY (read this before extending)
 * ──────────────────────────────────────────────────────────────────────────
 * An MCP server-side engine cannot start a Claude agent loop, so it cannot
 * *invoke* a skill body. This engine therefore does the **deterministic** half:
 *   1. {@link SkillScenarioTestEngine.loadScenarios} — locate `<skill>/scenarios/{happy,edge,stress}.md`,
 *      parse each fixture's input prompt + grading rubric, truncate oversized
 *      stress inputs, surface composed-skill recursion hints.
 *   2. {@link SkillScenarioTestEngine.gradeOutput} — a pure grader: keyword presence,
 *      structure (heading count), regex matches, error-marker absence. Grades on
 *      STRUCTURE + KEYWORDS, never exact match (skill outputs are non-deterministic prose).
 *   3. {@link SkillScenarioTestEngine.run} — orchestrate: given the skill's actual
 *      outputs for each scenario, grade them, compute `production_grade`, persist
 *      verdicts to `SKILL_QUALITY_REGISTRY.json`. Without outputs, return the loaded
 *      fixtures so the caller (the `/skill-test` skill, which DOES run in the agent
 *      loop) can invoke the skill and call back with the outputs.
 *   4. {@link SkillScenarioTestEngine.recordVerdicts} — write `quality.scenario_tests`
 *      + recompute `quality.production_grade` + stamp `quality.last_audited` for one
 *      skill in the registry, atomically.
 *
 * The "invoke the skill" half lives in `.claude/commands/skill-test.md` by necessity.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * FIXTURE FORMAT (`<skill-fixture-dir>/scenarios/{happy,edge,stress}.md`)
 * ──────────────────────────────────────────────────────────────────────────
 * Frontmatter carries the rubric as FLAT keys (the shared `parseSkillFile` parser
 * does not handle nested YAML objects):
 *   ```
 *   ---
 *   scenario: happy
 *   skill: de-sloppify
 *   description: a normal sloppy-code review request
 *   rubric_must_contain: ["refactor", "naming"]      # all must appear (case-insensitive)
 *   rubric_must_not_contain: ["I can't", "unable to"] # none may appear
 *   rubric_min_sections: 2                            # ≥ this many `#`/`##` headings
 *   rubric_must_match: ["\b\d+\s*lines?\b"]           # each regex must match (single backslashes; avoid commas)
 *   rubric_error_markers: ["TODO", "FIXME"]           # extra error markers beyond the built-in defaults
 *   rubric_allow_error_markers: ["error handling"]    # substrings that suppress a default-error-marker hit
 *   rubric_max_input_chars: 8000                      # stress only — truncate the input above this many chars
 *   ---
 *   <the input prompt to feed the skill>
 *
 *   ## Expected output shape
 *   <free-form human notes — NOT parsed, just documents intent>
 *   ```
 * The input is the body up to (but not including) the first `## Expected …` heading;
 * if there is no such heading, the whole body is the input. A fixture with no
 * frontmatter (or no rubric keys) is still *loadable* but is graded `fail` with
 * reason `malformed-fixture` (you cannot claim production-grade against an empty rubric).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * ADVERSARIAL CASES (per the atomized spec)
 * ──────────────────────────────────────────────────────────────────────────
 *   - Skill that calls another skill in its body → the engine never recurses (it
 *     never executes anything); it sets `composition_hint` + `max_composition_depth: 3`
 *     so the orchestrator can enforce the depth cap.
 *   - Stress fixture so large it would blow the context window → the input is
 *     truncated to `rubric_max_input_chars` (default {@link DEFAULT_MAX_INPUT_CHARS});
 *     `inputTruncated: true` + `truncatedFrom` recorded. Still a valid test of
 *     "does the skill degrade gracefully".
 *   - Non-deterministic prose output → {@link gradeOutput} is structural/keyword only,
 *     never exact-match. The caller may retry a flaky grade up to 2× (the engine just
 *     grades what it's handed).
 *   - Malicious fixture with `!`shell injection`!` → the engine reads fixture content
 *     as TEXT and does string/regex matching only. It has NO `child_process` import and
 *     NO `eval`/`Function` path — there is nothing to inject into. A fixture whose input
 *     is `$(rm -rf ~)` is returned verbatim as a literal string.
 *
 * @module SkillScenarioTestEngine
 */

import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";
import { PATHS } from "../constants.js";
import { log } from "../utils/Logger.js";
import {
  parseSkillFile,
  SKILL_BODY_LINE_CAP,
  type SkillQualityRegistry,
  type SkillQualityRecord,
  type ScenarioVerdict,
} from "../schemas/skillQualitySchema.js";
import { SKILL_QUALITY_REGISTRY_PATH } from "../registries/SkillQualityRegistryBuilder.js";

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/** The three production-grade scenarios, in canonical order. */
export const SCENARIO_NAMES = ["happy", "edge", "stress"] as const;
export type ScenarioName = (typeof SCENARIO_NAMES)[number];

/** Default cap for a (stress) fixture input before truncation. ~2k tokens of slack. */
export const DEFAULT_MAX_INPUT_CHARS = 8000;

/** Max skill-composition depth a fixture orchestrator must honour (recursion guard). */
export const MAX_COMPOSITION_DEPTH = 3;

/** Built-in error markers a passing output must NOT contain (case-insensitive, substring).
 *  These are the "the skill blew up / punted" signatures. A rubric's `allow_error_markers`
 *  list suppresses any of these whose own substring appears in an allowed phrase. */
export const DEFAULT_ERROR_MARKERS: readonly string[] = [
  "traceback (most recent call last)",
  "referenceerror",
  "typeerror:",
  "is not a function",
  "is not defined",
  "cannot read propert",
  "unhandled rejection",
  "internal server error",
  "i cannot help with that",
  "i can't help with that",
  "i'm unable to",
  "i am unable to",
  "no fixtures",
  "command not found",
];

/** Repo root — `state/` and `.claude/` live directly under it. */
const PRISM_ROOT = path.resolve(PATHS.STATE_DIR, "..");

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

/** A grading rubric parsed from a fixture's frontmatter. */
export interface ScenarioRubric {
  /** Phrases the output must contain (case-insensitive substring). */
  mustContain: string[];
  /** Phrases the output must NOT contain (case-insensitive substring). */
  mustNotContain: string[];
  /** Minimum number of markdown headings (`#`…`######`) the output must have. 0 = no requirement. */
  minSections: number;
  /** Regex source strings; each must match the output. Invalid regex → graded fail with reason. */
  mustMatch: string[];
  /** Extra error markers beyond {@link DEFAULT_ERROR_MARKERS}. */
  errorMarkers: string[];
  /** Substrings that suppress a (default or extra) error-marker hit when present in the output. */
  allowErrorMarkers: string[];
  /** Input-char cap for this scenario (stress fixtures use this; others default to {@link DEFAULT_MAX_INPUT_CHARS}). */
  maxInputChars: number;
  /** True when the fixture had no parseable rubric keys at all. */
  empty: boolean;
}

/** A single loaded scenario fixture. */
export interface LoadedScenario {
  /** Absolute path to the fixture `.md`. */
  path: string;
  /** The input prompt to feed the skill (post-truncation). */
  input: string;
  /** Original input length, when {@link inputTruncated} is true. */
  truncatedFrom?: number;
  /** True when the input was truncated to fit `rubric.maxInputChars`. */
  inputTruncated: boolean;
  /** The grading rubric. */
  rubric: ScenarioRubric;
  /** True when the fixture frontmatter failed to parse or had no rubric keys → grade `fail`. */
  malformed: boolean;
  /** Human-readable reason when {@link malformed}. */
  malformedReason?: string;
  /** True when the input text references another `/skill` invocation (composition hint). */
  composition: boolean;
}

/** Result of {@link SkillScenarioTestEngine.loadScenarios}. */
export interface LoadScenariosResult {
  skill: string;
  /** `ok` = ≥1 fixture found; `no-fixtures` = scenarios/ dir absent or empty; `not-found` = no such skill. */
  status: "ok" | "no-fixtures" | "not-found";
  /** Absolute fixture directory that was used (the `scenarios/` dir), or null. */
  scenariosDir: string | null;
  /** Per-scenario loaded fixtures; a scenario with no `<name>.md` is `null`. */
  scenarios: Record<ScenarioName, LoadedScenario | null>;
  /** Directories that were probed for a `scenarios/` dir (diagnostic). */
  probedDirs: string[];
  /** Recursion-depth cap the orchestrator must honour when a fixture composes other skills. */
  maxCompositionDepth: number;
}

/** Outcome of grading one output against one rubric. */
export interface GradeResult {
  verdict: "pass" | "fail";
  /** Each rubric check, in order. */
  checks: Array<{ name: string; ok: boolean; detail: string }>;
  /** Names of the checks that failed (empty when verdict === "pass"). */
  failed: string[];
}

/** One scenario's run outcome. */
export interface ScenarioRunResult {
  scenario: ScenarioName;
  /** `pass`/`fail` from grading, `skip` when no fixture exists, `pending` when no output was supplied. */
  status: "pass" | "fail" | "skip" | "pending";
  /** Grading detail when status is pass/fail. */
  grade?: GradeResult;
  /** Reason for a `fail`/`skip`/`pending` status. */
  reason?: string;
  /** Whether the (stress) input was truncated. */
  inputTruncated?: boolean;
}

/** Result of {@link SkillScenarioTestEngine.run}. */
export interface SkillTestRunResult {
  skill: string;
  /** Overall status: `graded` = outputs supplied & graded; `awaiting-outputs` = fixtures returned, caller must run the skill; `no-fixtures`/`not-found` as in {@link LoadScenariosResult}. */
  status: "graded" | "awaiting-outputs" | "no-fixtures" | "not-found";
  /** Per-scenario results. */
  results: Record<ScenarioName, ScenarioRunResult>;
  /** Per-scenario pass|fail|null verdicts (the shape persisted into the registry). */
  scenarioTests: { happy: ScenarioVerdict; edge: ScenarioVerdict; stress: ScenarioVerdict };
  /** True only when every scenario that has a fixture passed AND all three fixtures exist. */
  productionGrade: boolean;
  /** When `awaiting-outputs`: the loaded fixtures (so the caller can run the skill). */
  loaded?: LoadScenariosResult;
  /** When verdicts were persisted: the registry path; null when not persisted (or no registry). */
  persistedTo: string | null;
  /** Advisory note for the caller. */
  note: string;
  maxCompositionDepth: number;
}

/** Result of {@link SkillScenarioTestEngine.recordVerdicts}. */
export interface RecordVerdictsResult {
  updated: boolean;
  /** Why the update was skipped (when `updated` is false): `no-registry` | `skill-not-in-registry`. */
  reason?: string;
  /** The registry path that was (or would have been) written. */
  registryPath: string;
  /** The updated record (when `updated`). */
  record?: SkillQualityRecord;
  /** When the skill name appeared more than once (shadowed copies), the names that were skipped. */
  skippedShadows?: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers (exported for the tests + the linter)
// ────────────────────────────────────────────────────────────────────────────

/** True when a string looks like an array (frontmatter inline-array or list). */
function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function toPositiveInt(v: unknown, dflt: number): number {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return Math.floor(v);
  if (typeof v === "string") {
    const n = Number(v.trim());
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return dflt;
}

/** Build a rubric from a fixture's parsed frontmatter. */
export function rubricFromFrontmatter(fm: Record<string, unknown> | null, isStress: boolean): ScenarioRubric {
  const f = fm ?? {};
  const mustContain = toStringArray(f["rubric_must_contain"] ?? f["rubric_mustcontain"]);
  const mustNotContain = toStringArray(f["rubric_must_not_contain"] ?? f["rubric_mustnotcontain"]);
  const mustMatch = toStringArray(f["rubric_must_match"] ?? f["rubric_mustmatch"]);
  const errorMarkers = toStringArray(f["rubric_error_markers"]);
  const allowErrorMarkers = toStringArray(f["rubric_allow_error_markers"]);
  const minSections = toPositiveInt(f["rubric_min_sections"], 0);
  const maxInputChars = toPositiveInt(f["rubric_max_input_chars"], DEFAULT_MAX_INPUT_CHARS) || DEFAULT_MAX_INPUT_CHARS;
  const hasAnyRubricKey =
    mustContain.length > 0 ||
    mustNotContain.length > 0 ||
    mustMatch.length > 0 ||
    errorMarkers.length > 0 ||
    minSections > 0 ||
    "rubric_max_input_chars" in f;
  return {
    mustContain,
    mustNotContain,
    minSections,
    mustMatch,
    errorMarkers,
    allowErrorMarkers,
    maxInputChars: isStress ? maxInputChars : DEFAULT_MAX_INPUT_CHARS,
    empty: !hasAnyRubricKey,
  };
}

/** Count `#`…`######` markdown headings in a body (outside fenced code blocks). */
export function countHeadings(text: string): number {
  if (!text) return 0;
  let inFence = false;
  let n = 0;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && /^#{1,6}\s+\S/.test(line)) n++;
  }
  return n;
}

/** Split a fixture body into `{ input, notes }` — `notes` is the `## Expected …` tail (ignored). */
export function splitFixtureBody(body: string): { input: string; notes: string } {
  if (!body) return { input: "", notes: "" };
  const lines = body.split(/\r?\n/);
  let cut = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,6}\s+expected\b/i.test(lines[i])) {
      cut = i;
      break;
    }
  }
  if (cut === -1) return { input: body.trim(), notes: "" };
  return { input: lines.slice(0, cut).join("\n").trim(), notes: lines.slice(cut).join("\n").trim() };
}

/** Does the text reference another slash-skill invocation? (Composition hint, not a recursion engine.) */
export function looksLikeSkillComposition(text: string): boolean {
  if (!text) return false;
  // `/skill-name` at a word boundary, or "invoke the X skill" / "run the X skill"
  return /(^|\s)\/[a-z][a-z0-9-]{2,}\b/i.test(text) || /\b(?:invoke|run|use|call)\s+the\s+[\w-]+\s+skill\b/i.test(text);
}

// ────────────────────────────────────────────────────────────────────────────
// Engine
// ────────────────────────────────────────────────────────────────────────────

/** Options shared by the engine's public methods (mostly for tests). */
export interface SkillScenarioTestOptions {
  /** Extra absolute directories to probe for a `<skill>/scenarios/` dir, BEFORE the defaults. */
  fixtureRoots?: string[];
  /** Override the SKILL_QUALITY_REGISTRY.json path (tests). */
  registryPath?: string;
  /** When false, {@link SkillScenarioTestEngine.run} does not persist verdicts. Default true. */
  persist?: boolean;
}

/**
 * The skill scenario test engine. Stateless beyond the singleton.
 */
export class SkillScenarioTestEngine {
  /** Candidate `scenarios/` parent directories for a skill name, in priority order. */
  private fixtureDirCandidates(skill: string, extraRoots: string[]): string[] {
    const home = os.homedir();
    const safe = skill.replace(/[/\\]/g, path.sep).replace(/:/g, path.sep); // plugin "x:y" → x/y dir
    const candidates: string[] = [];
    for (const r of extraRoots) candidates.push(path.join(r, safe, "scenarios"));
    // project: .claude/skills/<skill>/scenarios, .claude/commands/<skill>/scenarios, mcp-server/skills/<skill>/scenarios
    candidates.push(path.join(PRISM_ROOT, ".claude", "skills", safe, "scenarios"));
    candidates.push(path.join(PRISM_ROOT, ".claude", "commands", safe, "scenarios"));
    candidates.push(path.join(PRISM_ROOT, "mcp-server", "skills", safe, "scenarios"));
    candidates.push(path.join(PRISM_ROOT, "skills-consolidated", safe, "scenarios"));
    // user: ~/.claude/skills/<skill>/scenarios, ~/.claude/commands/<skill>/scenarios
    candidates.push(path.join(home, ".claude", "skills", safe, "scenarios"));
    candidates.push(path.join(home, ".claude", "commands", safe, "scenarios"));
    return candidates;
  }

  /** Does a skill by this name physically exist anywhere we look (a SKILL.md / command .md / scenarios dir)? */
  private async skillExists(skill: string, extraRoots: string[]): Promise<boolean> {
    const home = os.homedir();
    const safe = skill.replace(/[/\\:]/g, path.sep);
    const probes: string[] = [...this.fixtureDirCandidates(skill, extraRoots)];
    // extra roots: <root>/<skill>/SKILL.md, <root>/<skill>.md, <root>/<skill>/ (a bare skill dir)
    for (const r of extraRoots) {
      probes.push(path.join(r, safe, "SKILL.md"), path.join(r, `${skill}.md`), path.join(r, safe));
    }
    probes.push(
      path.join(PRISM_ROOT, ".claude", "commands", `${skill}.md`),
      path.join(home, ".claude", "commands", `${skill}.md`),
      path.join(PRISM_ROOT, ".claude", "skills", safe, "SKILL.md"),
      path.join(home, ".claude", "skills", safe, "SKILL.md"),
    );
    for (const p of probes) {
      try {
        await fs.access(p);
        return true;
      } catch {
        /* keep probing */
      }
    }
    return false;
  }

  /** Locate + parse the `{happy,edge,stress}.md` fixtures for a skill. Never throws. */
  async loadScenarios(skill: string, opts: SkillScenarioTestOptions = {}): Promise<LoadScenariosResult> {
    const extraRoots = opts.fixtureRoots ?? [];
    const probed: string[] = [];
    const blank: Record<ScenarioName, LoadedScenario | null> = { happy: null, edge: null, stress: null };
    if (!skill || typeof skill !== "string" || !skill.trim()) {
      return { skill: String(skill ?? ""), status: "not-found", scenariosDir: null, scenarios: { ...blank }, probedDirs: [], maxCompositionDepth: MAX_COMPOSITION_DEPTH };
    }
    let scenariosDir: string | null = null;
    for (const dir of this.fixtureDirCandidates(skill, extraRoots)) {
      probed.push(dir);
      try {
        const st = await fs.stat(dir);
        if (st.isDirectory()) {
          scenariosDir = dir;
          break;
        }
      } catch {
        /* not here */
      }
    }
    if (!scenariosDir) {
      const exists = await this.skillExists(skill, extraRoots);
      return {
        skill,
        status: exists ? "no-fixtures" : "not-found",
        scenariosDir: null,
        scenarios: { ...blank },
        probedDirs: probed,
        maxCompositionDepth: MAX_COMPOSITION_DEPTH,
      };
    }
    const scenarios: Record<ScenarioName, LoadedScenario | null> = { ...blank };
    let found = 0;
    for (const name of SCENARIO_NAMES) {
      const file = path.join(scenariosDir, `${name}.md`);
      let content: string;
      try {
        content = await fs.readFile(file, "utf-8");
      } catch {
        continue; // fixture missing → leave null
      }
      found++;
      const parsed = parseSkillFile(content);
      const rubric = rubricFromFrontmatter(parsed.frontmatter, name === "stress");
      const { input: rawInput } = splitFixtureBody(parsed.body);
      let input = rawInput;
      let inputTruncated = false;
      let truncatedFrom: number | undefined;
      if (input.length > rubric.maxInputChars) {
        truncatedFrom = input.length;
        input = input.slice(0, rubric.maxInputChars) + `\n\n[…truncated ${input.length - rubric.maxInputChars} chars for the stress test cap of ${rubric.maxInputChars}…]`;
        inputTruncated = true;
      }
      const malformed = !!parsed.parseError || rubric.empty || input.trim().length === 0;
      const malformedReason = parsed.parseError
        ? `frontmatter parse error: ${parsed.parseError}`
        : rubric.empty
          ? "fixture has no rubric_* keys — cannot grade against an empty rubric"
          : input.trim().length === 0
            ? "fixture has no input text"
            : undefined;
      scenarios[name] = {
        path: file,
        input,
        ...(truncatedFrom !== undefined ? { truncatedFrom } : {}),
        inputTruncated,
        rubric,
        malformed,
        ...(malformedReason ? { malformedReason } : {}),
        composition: looksLikeSkillComposition(rawInput),
      };
    }
    return {
      skill,
      status: found > 0 ? "ok" : "no-fixtures",
      scenariosDir,
      scenarios,
      probedDirs: probed,
      maxCompositionDepth: MAX_COMPOSITION_DEPTH,
    };
  }

  /**
   * Grade one skill output against one rubric. PURE — no I/O, no execution.
   * Grades on STRUCTURE + KEYWORD PRESENCE + ERROR-MARKER ABSENCE, never exact match.
   */
  gradeOutput(output: string, rubric: ScenarioRubric): GradeResult {
    const checks: GradeResult["checks"] = [];
    const text = typeof output === "string" ? output : String(output ?? "");
    const lower = text.toLowerCase();

    // non-empty
    checks.push({ name: "non-empty-output", ok: text.trim().length > 0, detail: text.trim().length > 0 ? `${text.length} chars` : "output is empty" });

    // must-contain
    for (const phrase of rubric.mustContain) {
      const ok = lower.includes(phrase.toLowerCase());
      checks.push({ name: `must-contain:${phrase}`, ok, detail: ok ? "present" : "missing" });
    }
    // must-not-contain
    for (const phrase of rubric.mustNotContain) {
      const ok = !lower.includes(phrase.toLowerCase());
      checks.push({ name: `must-not-contain:${phrase}`, ok, detail: ok ? "absent" : "PRESENT (forbidden)" });
    }
    // min-sections
    if (rubric.minSections > 0) {
      const n = countHeadings(text);
      checks.push({ name: `min-sections:${rubric.minSections}`, ok: n >= rubric.minSections, detail: `found ${n} heading(s)` });
    }
    // must-match (regex) — case-INSENSITIVE by default (a rubric is a keyword/structure check,
    // not an exact-match check; skill outputs are non-deterministic prose)
    for (const src of rubric.mustMatch) {
      let ok = false;
      let detail: string;
      try {
        const re = new RegExp(src, "i");
        ok = re.test(text);
        detail = ok ? "matched" : "no match";
      } catch (e) {
        ok = false;
        detail = `invalid rubric regex: ${e instanceof Error ? e.message : String(e)}`;
      }
      checks.push({ name: `must-match:${src}`, ok, detail });
    }
    // error markers (default + extra), with allow-list suppression
    const allow = rubric.allowErrorMarkers.map((s) => s.toLowerCase());
    const markers = [...DEFAULT_ERROR_MARKERS, ...rubric.errorMarkers.map((s) => s.toLowerCase())];
    for (const m of markers) {
      const idx = lower.indexOf(m);
      if (idx === -1) continue;
      // suppressed if the hit sits inside an allowed phrase
      const suppressed = allow.some((a) => a.includes(m) && lower.includes(a));
      if (suppressed) continue;
      checks.push({ name: `no-error-marker:${m}`, ok: false, detail: `output contains the error marker "${m}"` });
    }

    const failed = checks.filter((c) => !c.ok).map((c) => c.name);
    return { verdict: failed.length === 0 ? "pass" : "fail", checks, failed };
  }

  /**
   * Run the three-scenario protocol for a skill.
   *
   * @param skill   skill name (`de-sloppify`, `calc`, `plugin:figma-use`, …)
   * @param outputs the skill's actual output text per scenario; omit (or pass `{}`) to get
   *                back the loaded fixtures so a caller in the agent loop can run the skill
   * @param scenario restrict to one scenario; default = all three
   * @param opts    fixture roots / registry path / persist flag
   */
  async run(
    skill: string,
    outputs?: Partial<Record<ScenarioName, string>>,
    scenario: ScenarioName | "all" = "all",
    opts: SkillScenarioTestOptions = {},
  ): Promise<SkillTestRunResult> {
    const loaded = await this.loadScenarios(skill, opts);
    const wantScenarios: ScenarioName[] = scenario === "all" ? [...SCENARIO_NAMES] : [scenario];
    const results: Record<ScenarioName, ScenarioRunResult> = {
      happy: { scenario: "happy", status: "skip", reason: "not requested" },
      edge: { scenario: "edge", status: "skip", reason: "not requested" },
      stress: { scenario: "stress", status: "skip", reason: "not requested" },
    };

    if (loaded.status === "not-found") {
      return {
        skill,
        status: "not-found",
        results,
        scenarioTests: { happy: null, edge: null, stress: null },
        productionGrade: false,
        persistedTo: null,
        note: `no skill named "${skill}" found in any known skill location`,
        maxCompositionDepth: MAX_COMPOSITION_DEPTH,
      };
    }
    if (loaded.status === "no-fixtures") {
      return {
        skill,
        status: "no-fixtures",
        results,
        scenarioTests: { happy: null, edge: null, stress: null },
        productionGrade: false,
        persistedTo: null,
        note: `skill "${skill}" has no scenarios/ dir — create <skill>/scenarios/{happy,edge,stress}.md. U-SKU05 treats no-fixtures as production_grade:false.`,
        maxCompositionDepth: MAX_COMPOSITION_DEPTH,
      };
    }

    const haveOutputs = !!outputs && Object.values(outputs).some((v) => typeof v === "string" && v.length > 0);
    let anyGraded = false;

    for (const name of SCENARIO_NAMES) {
      if (!wantScenarios.includes(name)) {
        results[name] = { scenario: name, status: "skip", reason: "not requested" };
        continue;
      }
      const fx = loaded.scenarios[name];
      if (!fx) {
        results[name] = { scenario: name, status: "skip", reason: `no ${name}.md fixture` };
        continue;
      }
      if (fx.malformed) {
        results[name] = { scenario: name, status: "fail", reason: `malformed-fixture: ${fx.malformedReason ?? "unknown"}`, inputTruncated: fx.inputTruncated };
        anyGraded = true;
        continue;
      }
      const out = outputs?.[name];
      if (typeof out !== "string" || out.length === 0) {
        results[name] = { scenario: name, status: "pending", reason: "no output supplied — run the skill against this fixture's input then call back with outputs", inputTruncated: fx.inputTruncated };
        continue;
      }
      const grade = this.gradeOutput(out, fx.rubric);
      results[name] = { scenario: name, status: grade.verdict, grade, inputTruncated: fx.inputTruncated, ...(grade.verdict === "fail" ? { reason: `failed checks: ${grade.failed.join(", ")}` } : {}) };
      anyGraded = true;
    }

    const verdictOf = (r: ScenarioRunResult): ScenarioVerdict => (r.status === "pass" ? "pass" : r.status === "fail" ? "fail" : null);
    const scenarioTests = { happy: verdictOf(results.happy), edge: verdictOf(results.edge), stress: verdictOf(results.stress) };

    // production_grade requires ALL THREE fixtures to exist AND all three to pass.
    const allThreeExist = SCENARIO_NAMES.every((n) => !!loaded.scenarios[n]);
    const allThreePass = scenarioTests.happy === "pass" && scenarioTests.edge === "pass" && scenarioTests.stress === "pass";
    const productionGrade = allThreeExist && allThreePass;

    if (!haveOutputs && !anyGraded) {
      // pure "give me the fixtures" call
      return {
        skill,
        status: "awaiting-outputs",
        results,
        scenarioTests,
        productionGrade: false,
        loaded,
        persistedTo: null,
        note:
          `Run "${skill}" against each scenario's \`input\`, then call prism_dev:skill_test again with ` +
          `outputs:{happy:"…", edge:"…", stress:"…"}. Honour max_composition_depth=${MAX_COMPOSITION_DEPTH} if a fixture composes other skills.`,
        maxCompositionDepth: MAX_COMPOSITION_DEPTH,
      };
    }

    // graded — optionally persist
    let persistedTo: string | null = null;
    if (opts.persist !== false && anyGraded) {
      try {
        const rec = await this.recordVerdicts(skill, scenarioTests, { registryPath: opts.registryPath, productionGrade });
        persistedTo = rec.updated ? rec.registryPath : null;
        if (!rec.updated) log.debug(`skill_test: verdicts not persisted for "${skill}" — ${rec.reason}`);
      } catch (e) {
        log.warn(`skill_test: persist failed for "${skill}": ${e instanceof Error ? e.message : String(e)}`);
        persistedTo = null;
      }
    }

    return {
      skill,
      status: "graded",
      results,
      scenarioTests,
      productionGrade,
      persistedTo,
      note: productionGrade
        ? `"${skill}" is PRODUCTION-GRADE — all three scenarios pass.`
        : `"${skill}" is NOT production-grade yet (` +
          SCENARIO_NAMES.map((n) => `${n}=${results[n].status}`).join(", ") +
          (allThreeExist ? "" : "; missing fixture(s)") +
          `).`,
      maxCompositionDepth: MAX_COMPOSITION_DEPTH,
    };
  }

  /**
   * Persist the scenario verdicts for ONE skill into SKILL_QUALITY_REGISTRY.json.
   * Atomic (write-temp-then-rename). Returns `{updated:false, reason}` rather than throwing
   * when the registry doesn't exist or the skill isn't in it.
   *
   * `production_grade` in the registry is recomputed as: all three scenario verdicts === "pass"
   * AND no `vague_language_violations` AND no `_parse_error` on the skill. (A skill that the
   * linter flagged or whose own frontmatter is broken cannot be production-grade even with green tests.)
   */
  async recordVerdicts(
    skill: string,
    verdicts: { happy: ScenarioVerdict; edge: ScenarioVerdict; stress: ScenarioVerdict },
    opts: { registryPath?: string; productionGrade?: boolean } = {},
  ): Promise<RecordVerdictsResult> {
    const registryPath = opts.registryPath ?? SKILL_QUALITY_REGISTRY_PATH;
    let raw: string;
    try {
      raw = await fs.readFile(registryPath, "utf-8");
    } catch {
      return { updated: false, reason: "no-registry", registryPath };
    }
    let registry: SkillQualityRegistry;
    try {
      registry = JSON.parse(raw) as SkillQualityRegistry;
    } catch (e) {
      return { updated: false, reason: `registry-parse-error: ${e instanceof Error ? e.message : String(e)}`, registryPath };
    }
    if (!registry || !Array.isArray(registry.skills)) {
      return { updated: false, reason: "registry-shape-invalid", registryPath };
    }
    // Prefer the non-shadowed copy; if several share the name, take the first that isn't shadowed,
    // else the first. Record which others we skipped (R7 — surface, don't silently pick).
    const matches = registry.skills.filter((s) => s.name === skill);
    if (matches.length === 0) {
      return { updated: false, reason: "skill-not-in-registry", registryPath };
    }
    const target = matches.find((s) => !s.shadowed_by) ?? matches[0];
    const skippedShadows = matches.filter((s) => s !== target).map((s) => `${s.name}@${s.tier}`);

    target.quality.scenario_tests = { happy: verdicts.happy, edge: verdicts.edge, stress: verdicts.stress };
    target.quality.last_audited = new Date().toISOString();
    const linterClean = (target.quality.vague_language_violations ?? []).length === 0 && !target._parse_error;
    const allPass = verdicts.happy === "pass" && verdicts.edge === "pass" && verdicts.stress === "pass";
    target.quality.production_grade = !!(opts.productionGrade ?? allPass) && allPass && linterClean;

    // bump generatedAt so consumers see the registry moved
    registry.generatedAt = new Date().toISOString();

    const tmp = `${registryPath}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmp, JSON.stringify(registry, null, 2), "utf-8");
    await fs.rename(tmp, registryPath);
    log.info(`skill_test: recorded scenario verdicts for "${skill}" (h=${verdicts.happy} e=${verdicts.edge} s=${verdicts.stress}, production_grade=${target.quality.production_grade}) → ${registryPath}`);
    return { updated: true, registryPath, record: target, ...(skippedShadows.length ? { skippedShadows } : {}) };
  }

  /** Convenience for the linter / audit (U-SKU03/U-SKU05): is this skill's body within the line cap? */
  static withinBodyCap(bodyLineCount: number): boolean {
    return bodyLineCount <= SKILL_BODY_LINE_CAP;
  }
}

/** Singleton — `import { skillScenarioTestEngine } from ".../SkillScenarioTestEngine.js"`. */
export const skillScenarioTestEngine = new SkillScenarioTestEngine();
