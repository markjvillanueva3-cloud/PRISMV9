/**
 * SkillLibraryAuditEngine — U-SKU05 (SKILLS-UTILIZATION-MS0).
 *
 * @eng_khairallah1 Phase-4 doctrine: *"One skill is a tool. Ten skills is a
 * workforce."* PRISM ships ~500 skills — 50× the "workforce" bar by raw count.
 * But count is vanity; the real question is **how many are PRODUCTION-GRADE**
 * (linter-clean ∧ 3-Question-satisfied ∧ all-three-scenario-tests-pass). This
 * engine grades the entire library and produces a scorecard:
 *
 *     production_grade  +  needs_refinement  +  stub_or_orphan  ==  total
 *
 * …plus a per-domain breakdown, the *prioritized* gap list (which skills are one
 * fixture-run away from production-grade vs which need real work), the top-N most-
 * invoked skills with their grades, and the @eng_khairallah1 ROI estimate — a
 * RANGE, because the heuristic ("~30 min/wk saved per production-grade skill you
 * actually use weekly") is fuzzy and we don't claim precision.
 *
 * Inputs — all read-only, nothing is mutated:
 *   • `SKILL_QUALITY_REGISTRY.json`  — U-SKU06; per-skill quality fields.
 *   • `skill-lint-report.json`       — U-SKU03; per-skill linter findings.
 *   • the skill files themselves     — re-read for the `skill_type` frontmatter
 *                                      (the registry doesn't persist it yet — a
 *                                      U-SKU06 follow-up) and to locate a sibling
 *                                      `scenarios/` dir (via SkillScenarioTestEngine).
 *   • telemetry: `invocation_count_30d` straight from the registry — `null` until
 *     U-SKU04 wires the counter. When it's all-`null` the audit flags
 *     `invocationUndercounted` and does **not** use invocation to demote a skill
 *     to `stub_or_orphan` (an un-instrumented skill is not a dead skill).
 *
 * The engine writes nothing. The CLI wrapper `scripts/skill-library-audit.mjs`
 * owns the `state/shared/SKILL-LIBRARY-AUDIT-<date>.{md,json}` artifacts (it calls
 * {@link SkillLibraryAuditEngine.audit} then {@link SkillLibraryAuditEngine.renderMarkdown}).
 * The dispatcher action `prism_dev:skill_audit` returns the JSON result.
 *
 * Grading (per skill):
 *   stub_or_orphan   if  parse_error  ∨  body < MIN_BODY_LINES  ∨  description < MIN_DESCRIPTION_CHARS_NONEMPTY chars
 *                        ∨  (invocation == 0  ∧  last_refined > STALE_DAYS  ∧  not brand-new  ∧  not a reference skill)
 *   production_grade if  ¬stub  ∧  linter-clean  ∧  3Q-satisfied  ∧  all-three-scenario-tests == "pass"
 *   needs_refinement otherwise   (a real, non-stub skill that simply isn't verified-production-grade yet)
 *
 *   3Q ≈  Q1 description ≥ MIN_DESCRIPTION_CHARS, not over the 1024-char cap, not a vague opener
 *      ∧  Q2 ≥ SKILL_MIN_TRIGGER_PHRASES distinct trigger phrases  (exempt when disable_model_invocation)
 *      ∧  Q3 has a perfect-output example  (exempt when skill_type ∈ {methodology, reference})
 *
 *   "linter-clean" = the skill has no BROKEN/MAJOR/MINOR finding in skill-lint-report.json
 *                    (ADVISORY-only — e.g. R7 "no output example" — does not block).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SKILL_MIN_TRIGGER_PHRASES,
  SKILL_DESCRIPTION_MAX_CHARS,
  VAGUE_DESCRIPTION_OPENERS,
  coerceSkillType,
  parseSkillFile,
  type SkillType,
} from "../schemas/skillQualitySchema.js";
import { SKILL_QUALITY_REGISTRY_PATH } from "../registries/SkillQualityRegistryBuilder.js";

// ── constants ──────────────────────────────────────────────────────────────

export const SKILL_LIBRARY_AUDIT_SCHEMA_VERSION = "1.0.0";

/** A skill refined within this many days is exempt from the zero-invocation → orphan rule (it just hasn't had time to be used). */
const BRAND_NEW_DAYS = 14;
/** Zero invocation AND last refined more than this many days ago ⇒ candidate `stub_or_orphan` (a dead skill). */
const STALE_DAYS = 180;
/** Q1 floor: a `description` shorter than this is too thin for the model to route on reliably. */
const MIN_DESCRIPTION_CHARS = 40;
/** Below this many chars a `description` is "effectively empty" ⇒ `stub_or_orphan`. */
const MIN_DESCRIPTION_CHARS_NONEMPTY = 10;
/** A skill body shorter than this many lines ⇒ `stub_or_orphan` regardless of anything else. */
const MIN_BODY_LINES = 10;
/** The U-SKU01 3Q-gate's *ideal* trigger-phrase count; the linter's hard floor is the lower SKILL_MIN_TRIGGER_PHRASES. */
const TRIGGER_PHRASE_IDEAL = 5;
/** @eng_khairallah1 heuristic: ~30 min/wk × ~50 wk/yr = ~25 engineer-hours/yr saved per production-grade skill *used weekly*. */
const HRS_PER_PRODUCTION_SKILL_YEAR = 0.5 * 50;
/** Conservative end of "what fraction of the production-grade subset actually gets used weekly" (the ROI lower bound). */
const ROI_LOWER_FRACTION = 0.2;
/** If invocation telemetry covers fewer than this fraction of skills, flag `invocationUndercounted` and use a proxy for "top by invocation". */
const INVOCATION_COVERAGE_FLOOR = 0.8;
/** A domain this size or larger with 0 production-grade skills and at least this share `stub_or_orphan` ⇒ flagged as a structural gap. */
const DOMAIN_MIN_SIZE_FOR_GAP_FLAG = 5;
const DOMAIN_STUB_DOMINANCE_FRACTION = 0.5;
/** More than this many `stub_or_orphan` skills ⇒ advise a SKILL-CLEANUP-MS1 follow-up milestone. */
const STUB_CLEANUP_THRESHOLD = 50;
/** Registry/lint-report timestamps drifting apart by more than this ⇒ advise rebuilding both. */
const INPUT_DRIFT_WARN_MS = 6 * 60 * 60 * 1000;
/** Severities that count as "the linter flagged this" (ADVISORY does not block production-grade). */
const BLOCKING_SEVERITIES = new Set(["BROKEN", "MAJOR", "MINOR"]);
/** The U-SKU02 scenario-fixture filenames; a `<skill>/scenarios/` dir with ≥1 of these is "has fixtures". */
const SCENARIO_FIXTURE_FILENAMES = ["happy.md", "edge.md", "stress.md"];
/** Default size of the "top by invocation" table. */
const DEFAULT_TOP_N = 20;
/** Default cap on each `byGrade` name list — keeps the JSON bounded; the full gap list / markdown carry everything. */
const DEFAULT_GRADE_LIST_CAP = 2000;
/** Default number of gap-list rows rendered into the markdown (the JSON sidecar always has the full list). */
const DEFAULT_MARKDOWN_GAP_ROWS = 60;
const MS_PER_DAY = 86_400_000;

// repo root — `state/` and `.claude/` live directly under it; mirrors the
// resolution other engines use (PATHS.STATE_DIR/..) without taking a PATHS dep here.
// mcp-server/src/engines/X.ts  (or mcp-server/dist/engines/X.js)  →  ../../../.. = repo root.
const REPO_ROOT =
  process.env.PRISM_REPO_ROOT ||
  path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "..");

/** `state/shared/skill-lint-report.json` — sibling of `state/shared/registries/SKILL_QUALITY_REGISTRY.json`. */
const DEFAULT_LINT_REPORT_PATH = path.join(
  path.dirname(path.dirname(SKILL_QUALITY_REGISTRY_PATH)),
  "skill-lint-report.json"
);

/** Where the dated scorecard artifacts land (the CLI writes them; exported for callers). */
export const SKILL_LIBRARY_AUDIT_DIR = path.join(REPO_ROOT, "state", "shared");

// ── types ──────────────────────────────────────────────────────────────────

export type SkillGrade = "production_grade" | "needs_refinement" | "stub_or_orphan";
/** How far a `needs_refinement` skill is from production-grade. `near` = only the scenario-test run is missing. */
export type GapDistance = "near" | "mid" | "far" | "n/a";

/** A raw record from SKILL_QUALITY_REGISTRY.json — external JSON, every field validated before use. */
interface RawSkillRecord { [key: string]: unknown }
interface RawRegistry { skills?: unknown; generatedAt?: unknown; [key: string]: unknown }
interface RawLintReport { skills?: unknown; generatedAt?: unknown; [key: string]: unknown }

export interface AuditOptions {
  /** Override the registry path (default: the canonical `SKILL_QUALITY_REGISTRY_PATH`). */
  registryPath?: string;
  /** Override the lint-report path (default: `state/shared/skill-lint-report.json`). */
  lintReportPath?: string;
  /** If true, re-read every skill file to extract its `skill_type` frontmatter. Default true (skipped when `registryObject` is injected). */
  rereadFrontmatter?: boolean;
  /** If true, probe the filesystem for each skill's `scenarios/` dir (via SkillScenarioTestEngine). Default true (skipped when `registryObject` is injected). */
  probeScenarioDirs?: boolean;
  /** Size of the "top by invocation" table. Default 20. */
  topN?: number;
  /** Cap on the per-grade name lists in the JSON. Default 2000. */
  gradeListCap?: number;
  /** Inject a synthetic registry object instead of reading from disk (tests). */
  registryObject?: unknown;
  /** Inject a synthetic lint-report object instead of reading from disk (tests). */
  lintReportObject?: unknown;
  /** Clock override (tests) — ms since epoch used for "days since last_refined". */
  nowMs?: number;
}

export interface PerSkillAudit {
  name: string;
  path: string | null;
  tier: string | null;
  grade: SkillGrade;
  domain: string;
  /** For `needs_refinement` skills: how close to production-grade. */
  distance: GapDistance;
  reasons: string[];
  lintSeverity: string | null;
  lintRules: string[];
  threeQ: { q1: boolean; q2: boolean; q3: boolean; ok: boolean };
  scenarioTestsAllPass: boolean;
  hasScenarioFixtures: boolean;
  skillType: SkillType | null;
  bodyLineCount: number | null;
  triggerPhraseCount: number;
  hasOutputExample: boolean;
  lastRefined: string | null;
  lastRefinedDaysAgo: number | null;
  invocationCount30d: number | null;
  isReferenceSkill: boolean;
}

export interface DomainBreakdownRow {
  total: number;
  production_grade: number;
  needs_refinement: number;
  stub_or_orphan: number;
}

export interface RoiEstimate {
  productionGradeCount: number;
  perSkillHrsYr: number;
  lowerBoundHrsYr: number;
  upperBoundHrsYr: number;
  /** If you wrote+ran fixtures for every skill that already passes linter+3Q, the library would gain this many production-grade skills. */
  potentialIfFixturesWritten: { extraSkills: number; upperBoundHrsYr: number };
  heuristic: string;
  assumptions: string[];
}

export interface SkillLibraryAuditResult {
  schemaVersion: string;
  generatedAt: string;
  total: number;
  counts: Record<SkillGrade, number>;
  sumInvariantOk: boolean;
  byDomain: Record<string, DomainBreakdownRow>;
  byGrade: Record<SkillGrade, string[]>;
  /** Prioritized: `near` first (one fixture-run from production-grade), then `mid`, then `far`, then `stub_or_orphan`. */
  gapList: Array<{ name: string; grade: SkillGrade; distance: GapDistance; domain: string; reasons: string[]; path: string | null }>;
  topByInvocation: {
    available: boolean;
    proxy: string | null;
    entries: Array<{ name: string; value: number; grade: SkillGrade; domain: string }>;
  };
  roiEstimate: RoiEstimate;
  invocationUndercounted: boolean;
  skillTypeSource: "frontmatter-reread" | "registry" | "mixed" | "none";
  advisories: string[];
  sources: {
    registryPath: string;
    registryGeneratedAt: string | null;
    lintReportPath: string | null;
    lintReportGeneratedAt: string | null;
    lintReportFound: boolean;
    scenarioDirRootsProbed: boolean;
  };
  /** Per-skill detail (always present; the markdown renderer condenses it). */
  skills: PerSkillAudit[];
}

// ── domain bucketing ───────────────────────────────────────────────────────

/** First name segment → coarse domain. Aggressively lumps into "Other" — this is a navigation aid, not load-bearing. */
const DOMAIN_BY_PREFIX: Record<string, string> = {
  cad: "CAD",
  cam: "CAM", cnc: "CAM", gcode: "CAM", post: "CAM", ppg: "CAM", toolpath: "CAM", program: "CAM", machining: "CAM",
  lathe: "Lathe/Turning", turning: "Lathe/Turning", turn: "Lathe/Turning", swiss: "Lathe/Turning", hard: "Lathe/Turning",
  wedm: "WEDM/EDM", edm: "WEDM/EDM", wire: "WEDM/EDM", sinker: "WEDM/EDM",
  hypermill: "CAM-vendor", mastercam: "CAM-vendor", powermill: "CAM-vendor", solidcam: "CAM-vendor",
  catia: "CAM-vendor", nx: "CAM-vendor", fusion: "CAM-vendor", esprit: "CAM-vendor",
  mill: "Milling", grinder: "Grinding", grinding: "Grinding", welder: "Welding", welding: "Welding",
  wiki: "Wiki/Knowledge", learn: "Wiki/Knowledge", pdf: "Wiki/Knowledge", video: "Wiki/Knowledge", shop: "Shop-floor",
  forge: "Dev-pipeline", forge2: "Dev-pipeline", forge3: "Dev-pipeline", forge4: "Dev-pipeline",
  forge5: "Dev-pipeline", forge6: "Dev-pipeline", forge7: "Dev-pipeline", rgs: "Dev-pipeline", rgs2: "Dev-pipeline",
  rgs3: "Dev-pipeline", rgs4: "Dev-pipeline", rgs5: "Dev-pipeline", rgs6: "Dev-pipeline",
  autopilot: "Dev-pipeline", yolo: "Dev-pipeline", sparc: "Dev-pipeline",
  quote: "Business", bid: "Business", cost: "Business", job: "Business", erp: "Business", biz: "Business",
  order: "Business", invoice: "Business", capacity: "Business", roi: "Business",
  hook: "Hooks/Harness", harness: "Hooks/Harness", session: "Hooks/Harness", context: "Hooks/Harness",
  skill: "Skills-meta", commands: "Skills-meta",
  github: "GitHub", git: "GitHub",
};

function domainOf(name: string): string {
  const first = (name.split(/[-:.]/, 1)[0] || "").toLowerCase().replace(/^_+/, "");
  return DOMAIN_BY_PREFIX[first] ?? "Other/cross-cutting";
}

// ── helpers ────────────────────────────────────────────────────────────────

interface LintEntry { severity: string | null; rules: string[]; parseError: boolean; }

function indexLintReport(report: unknown): { byName: Map<string, LintEntry>; generatedAt: string | null } {
  const byName = new Map<string, LintEntry>();
  let generatedAt: string | null = null;
  if (report && typeof report === "object") {
    const r = report as RawLintReport;
    if (typeof r.generatedAt === "string") generatedAt = r.generatedAt;
    const skills = Array.isArray(r.skills) ? r.skills : [];
    for (const entry of skills) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as RawSkillRecord;
      const name = typeof e.name === "string" ? e.name : null;
      if (!name) continue;
      const rules = Array.isArray(e.rules) ? e.rules.filter((x): x is string => typeof x === "string") : [];
      const severity = typeof e.severity === "string" ? e.severity : null;
      const parseError = severity === "BROKEN" || rules.includes("parse");
      byName.set(name, { severity, rules, parseError });
    }
  }
  return { byName, generatedAt };
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function daysSince(dateStr: unknown, nowMs: number): number | null {
  if (typeof dateStr !== "string" || !dateStr.trim()) return null;
  const t = Date.parse(dateStr);
  if (!Number.isFinite(t)) return null;
  const d = Math.floor((nowMs - t) / MS_PER_DAY);
  return Number.isFinite(d) ? d : null;
}

/**
 * Candidate `<skill>/scenarios/` directories for the U-SKU02 fixture convention —
 * mirrors {@link SkillScenarioTestEngine}'s private `fixtureDirCandidates` (kept
 * in sync by hand; if that list changes, update here too, or — better — expose it
 * publicly in a U-SKU02 follow-up). Synchronous on purpose so `audit()` stays sync.
 */
function scenarioFixtureDirCandidates(skillName: string): string[] {
  const names = new Set<string>();
  names.add(skillName.replace(/[^\w.-]+/g, "-")); // fs-safe form of the full name
  const colon = skillName.lastIndexOf(":");
  if (colon > 0) names.add(skillName.slice(colon + 1).replace(/[^\w.-]+/g, "-")); // `plugin:skill` → also try `skill`
  const home = os.homedir();
  const out: string[] = [];
  for (const n of names) {
    out.push(
      path.join(REPO_ROOT, ".claude", "skills", n, "scenarios"),
      path.join(REPO_ROOT, ".claude", "commands", n, "scenarios"),
      path.join(REPO_ROOT, "mcp-server", "skills", n, "scenarios"),
      path.join(REPO_ROOT, "skills-consolidated", n, "scenarios"),
      path.join(home, ".claude", "skills", n, "scenarios"),
      path.join(home, ".claude", "commands", n, "scenarios"),
    );
  }
  return out;
}

/** True iff a `<skill>/scenarios/` dir exists with ≥1 of `happy.md` / `edge.md` / `stress.md`. */
function hasScenarioFixturesOnDisk(skillName: string): boolean {
  for (const dir of scenarioFixtureDirCandidates(skillName)) {
    try {
      if (!fs.statSync(dir).isDirectory()) continue;
    } catch { continue; /* not here */ }
    for (const f of SCENARIO_FIXTURE_FILENAMES) {
      if (fs.existsSync(path.join(dir, f))) return true;
    }
  }
  return false;
}

// ── the engine ─────────────────────────────────────────────────────────────

export class SkillLibraryAuditEngine {
  /**
   * Grade the whole skill library. Read-only with respect to the filesystem (the
   * optional re-read of skill files and `scenarios/`-dir probing are both reads).
   * Throws if the registry can't be read/parsed (a hard prerequisite); a missing
   * lint report is tolerated (every skill treated as linter-clean, with an advisory).
   */
  audit(opts: AuditOptions = {}): SkillLibraryAuditResult {
    const nowMs = opts.nowMs ?? Date.now();
    const topN = opts.topN ?? DEFAULT_TOP_N;
    const gradeListCap = opts.gradeListCap ?? DEFAULT_GRADE_LIST_CAP;
    const advisories: string[] = [];

    // —— load the registry (hard prerequisite) ——
    const registryPath = opts.registryPath ?? SKILL_QUALITY_REGISTRY_PATH;
    let registry: RawRegistry;
    if (opts.registryObject !== undefined) {
      if (!opts.registryObject || typeof opts.registryObject !== "object") throw new Error("SkillLibraryAuditEngine: registryObject must be an object.");
      registry = opts.registryObject as RawRegistry;
    } else {
      let raw: string;
      try {
        raw = fs.readFileSync(registryPath, "utf-8");
      } catch (e) {
        throw new Error(
          `SkillLibraryAuditEngine: cannot read SKILL_QUALITY_REGISTRY.json at ${registryPath} (${(e as Error)?.message ?? e}). ` +
          `Run prism_dev:skill_quality_registry_build (or scripts/skill-lint.mjs --rebuild-registry) first.`
        );
      }
      try {
        registry = JSON.parse(raw) as RawRegistry;
      } catch (e) {
        throw new Error(`SkillLibraryAuditEngine: SKILL_QUALITY_REGISTRY.json at ${registryPath} is not valid JSON (${(e as Error)?.message ?? e}).`);
      }
    }
    const skillRecords: RawSkillRecord[] = Array.isArray(registry.skills) ? (registry.skills as RawSkillRecord[]) : [];
    const registryGeneratedAt: string | null = typeof registry.generatedAt === "string" ? registry.generatedAt : null;

    // —— load the lint report (soft prerequisite) ——
    const lintReportPath = opts.lintReportObject !== undefined ? null : (opts.lintReportPath ?? DEFAULT_LINT_REPORT_PATH);
    let lintReportObj: unknown = opts.lintReportObject;
    let lintReportFound = opts.lintReportObject !== undefined;
    if (opts.lintReportObject === undefined && lintReportPath) {
      try {
        lintReportObj = JSON.parse(fs.readFileSync(lintReportPath, "utf-8"));
        lintReportFound = true;
      } catch {
        advisories.push(`Lint report not found/parseable at ${lintReportPath} — grading every skill as linter-clean. Run scripts/skill-lint.mjs first for an accurate audit.`);
      }
    }
    const { byName: lintByName, generatedAt: lintReportGeneratedAt } = indexLintReport(lintReportObj);

    // staleness cross-check between the two inputs
    if (registryGeneratedAt && lintReportGeneratedAt) {
      const drift = Math.abs(Date.parse(registryGeneratedAt) - Date.parse(lintReportGeneratedAt));
      if (Number.isFinite(drift) && drift > INPUT_DRIFT_WARN_MS) {
        advisories.push(`Registry (${registryGeneratedAt}) and lint report (${lintReportGeneratedAt}) differ by >6h — consider rebuilding both before trusting the scorecard.`);
      }
    }

    // —— per-skill grading ——
    const skills: PerSkillAudit[] = [];
    let skillTypeFromFrontmatter = 0;
    let skillTypeFromRegistry = 0;
    let invocationKnownCount = 0;
    const probeScenarioDirs = opts.probeScenarioDirs !== false && opts.registryObject === undefined;
    const rereadFrontmatter = opts.rereadFrontmatter !== false && opts.registryObject === undefined;

    for (const rec of skillRecords) {
      if (!rec || typeof rec !== "object") continue;
      const name: string = typeof rec.name === "string" ? rec.name : "(unnamed)";
      const skillPath: string | null = typeof rec.path === "string" ? rec.path : null;
      const tier: string | null = typeof rec.tier === "string" ? rec.tier : null;
      const q: Record<string, unknown> = (rec.quality && typeof rec.quality === "object") ? (rec.quality as Record<string, unknown>) : {};
      const description: string = typeof rec.description === "string" ? rec.description : "";
      const descriptionOverLimit: boolean = rec.description_over_limit === true || description.length > SKILL_DESCRIPTION_MAX_CHARS;
      const disableModelInvocation: boolean = rec.disable_model_invocation === true;
      const userInvocable: boolean = rec.user_invocable !== false; // default true
      const bodyLineCount: number | null = typeof q.body_line_count === "number" && Number.isFinite(q.body_line_count) ? q.body_line_count : null;
      const triggerPhrases: string[] = asStringArray(q.trigger_phrases);
      const hasOutputExample: boolean = q.has_output_example === true;
      const lastRefined: string | null = typeof q.last_refined === "string" ? q.last_refined : null;
      const lastRefinedDaysAgo = daysSince(lastRefined, nowMs);
      const invocationCount30d: number | null = (typeof q.invocation_count_30d === "number" && Number.isFinite(q.invocation_count_30d)) ? q.invocation_count_30d : null;
      if (invocationCount30d != null) invocationKnownCount++;
      const scenarioTestsRaw = (q.scenario_tests && typeof q.scenario_tests === "object") ? (q.scenario_tests as Record<string, unknown>) : {};
      const scenarioTestsAllPass = scenarioTestsRaw.happy === "pass" && scenarioTestsRaw.edge === "pass" && scenarioTestsRaw.stress === "pass";
      const anyScenarioVerdict = scenarioTestsRaw.happy != null || scenarioTestsRaw.edge != null || scenarioTestsRaw.stress != null;

      // skill_type: registry first, then frontmatter re-read, then null
      let skillType: SkillType | null =
        coerceSkillType(rec.skill_type) ?? coerceSkillType(rec.skillType) ?? coerceSkillType(q.skill_type) ?? null;
      if (skillType) skillTypeFromRegistry++;
      if (!skillType && rereadFrontmatter && skillPath) {
        try {
          const parsed = parseSkillFile(fs.readFileSync(skillPath, "utf-8"));
          const ft = coerceSkillType(parsed.frontmatter?.["skill_type"]) ?? coerceSkillType(parsed.frontmatter?.["skill-type"]);
          if (ft) { skillType = ft; skillTypeFromFrontmatter++; }
        } catch { /* file gone / unreadable — fall back to null, audit still works */ }
      }
      const isReferenceSkill = userInvocable === false || disableModelInvocation === true || skillType === "reference";

      // scenarios/ dir probe — synchronous fs check (mirrors SkillScenarioTestEngine's candidate roots).
      // When probing is off (synthetic registry), fall back to "a recorded scenario verdict implies fixtures existed".
      const hasScenarioFixtures = probeScenarioDirs ? hasScenarioFixturesOnDisk(name) : anyScenarioVerdict;

      // —— linter ——
      const lintEntry = lintByName.get(name);
      const lintSeverity = lintEntry?.severity ?? null;
      const lintRules = lintEntry?.rules ?? [];
      const parseError = (rec._parse_error === true) || (rec.parse_error === true) || (lintEntry?.parseError === true);
      const lintClean = !lintEntry || !(lintEntry.severity != null && BLOCKING_SEVERITIES.has(lintEntry.severity));

      // —— 3Q ——
      const descTrim = description.trim();
      const vagueOpener = VAGUE_DESCRIPTION_OPENERS.some((re) => re.test(descTrim));
      const q1 = descTrim.length >= MIN_DESCRIPTION_CHARS && !descriptionOverLimit && !vagueOpener;
      const q2 = disableModelInvocation || triggerPhrases.length >= SKILL_MIN_TRIGGER_PHRASES;
      const q3 = skillType === "methodology" || skillType === "reference" || hasOutputExample;
      const threeQok = q1 && q2 && q3;

      // —— grade ——
      const descriptionEmpty = descTrim.length < MIN_DESCRIPTION_CHARS_NONEMPTY;
      const bodyTooShort = (bodyLineCount ?? Number.MAX_SAFE_INTEGER) < MIN_BODY_LINES;
      const deadOrphan =
        invocationCount30d === 0 &&
        lastRefinedDaysAgo != null && lastRefinedDaysAgo > STALE_DAYS &&
        !(lastRefinedDaysAgo < BRAND_NEW_DAYS) &&
        !isReferenceSkill;

      let grade: SkillGrade;
      const reasons: string[] = [];
      if (parseError || bodyTooShort || descriptionEmpty || deadOrphan) {
        grade = "stub_or_orphan";
        if (parseError) reasons.push("frontmatter parse error");
        if (bodyTooShort) reasons.push(`body only ${bodyLineCount} lines (< ${MIN_BODY_LINES})`);
        if (descriptionEmpty) reasons.push(`description effectively empty (${descTrim.length} chars)`);
        if (deadOrphan) reasons.push(`zero invocations in 30d and last refined ${lastRefinedDaysAgo}d ago (> ${STALE_DAYS}d)`);
      } else if (lintClean && threeQok && scenarioTestsAllPass) {
        grade = "production_grade";
        reasons.push("linter-clean ∧ 3Q ∧ all-3-scenario-tests pass");
      } else {
        grade = "needs_refinement";
        if (!lintClean) reasons.push(`linter: ${lintSeverity ?? "flagged"} (${lintRules.join(",") || "?"})`);
        if (!q1) reasons.push(vagueOpener ? "Q1: vague description opener" : descriptionOverLimit ? `Q1: description > ${SKILL_DESCRIPTION_MAX_CHARS} chars` : `Q1: description < ${MIN_DESCRIPTION_CHARS} chars (${descTrim.length})`);
        if (!q2) reasons.push(`Q2: ${triggerPhrases.length} trigger phrase(s) (< ${SKILL_MIN_TRIGGER_PHRASES})`);
        if (!q3) reasons.push("Q3: no perfect-output example" + (skillType ? "" : " (no skill_type — would be exempt if tagged methodology/reference)"));
        if (!scenarioTestsAllPass) {
          reasons.push(hasScenarioFixtures
            ? "has scenarios/ dir — but the 3 tests haven't been run yet (prism_dev:skill_test)"
            : "no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test)");
        }
        if (q2 && !disableModelInvocation && triggerPhrases.length < TRIGGER_PHRASE_IDEAL) {
          reasons.push(`(note: ${triggerPhrases.length} trigger phrases — below the 3Q-gate's ≥${TRIGGER_PHRASE_IDEAL} ideal, above the linter's ≥${SKILL_MIN_TRIGGER_PHRASES} floor)`);
        }
      }

      // distance-to-production (meaningful only for `needs_refinement`)
      let distance: GapDistance = "n/a";
      if (grade === "needs_refinement") {
        if (lintClean && threeQok && !scenarioTestsAllPass) distance = hasScenarioFixtures ? "near" : "mid";
        else if (lintClean && (Number(q1) + Number(q2) + Number(q3) >= 2)) distance = "mid";
        else distance = "far";
      }

      skills.push({
        name, path: skillPath, tier, grade, domain: domainOf(name), distance, reasons,
        lintSeverity, lintRules,
        threeQ: { q1, q2, q3, ok: threeQok },
        scenarioTestsAllPass, hasScenarioFixtures, skillType,
        bodyLineCount, triggerPhraseCount: triggerPhrases.length, hasOutputExample,
        lastRefined, lastRefinedDaysAgo, invocationCount30d, isReferenceSkill,
      });
    }

    // —— aggregate ——
    const total = skills.length;
    const counts: Record<SkillGrade, number> = { production_grade: 0, needs_refinement: 0, stub_or_orphan: 0 };
    const byGrade: Record<SkillGrade, string[]> = { production_grade: [], needs_refinement: [], stub_or_orphan: [] };
    const byDomain: Record<string, DomainBreakdownRow> = {};
    for (const s of skills) {
      counts[s.grade]++;
      if (byGrade[s.grade].length < gradeListCap) byGrade[s.grade].push(s.name);
      const row = byDomain[s.domain] ?? (byDomain[s.domain] = { total: 0, production_grade: 0, needs_refinement: 0, stub_or_orphan: 0 });
      row.total++; row[s.grade]++;
    }
    const sumInvariantOk = counts.production_grade + counts.needs_refinement + counts.stub_or_orphan === total;
    if (!sumInvariantOk) advisories.push(`INTERNAL: grade counts (${counts.production_grade}+${counts.needs_refinement}+${counts.stub_or_orphan}) do not sum to total (${total}) — this is a bug.`);

    // —— gap list (prioritized: needs_refinement[near→mid→far] then stub_or_orphan) ——
    const distanceRank: Record<GapDistance, number> = { near: 0, mid: 1, far: 2, "n/a": 3 };
    const gradeRank: Record<SkillGrade, number> = { needs_refinement: 0, stub_or_orphan: 1, production_grade: 2 };
    const gapList = skills
      .filter((s) => s.grade !== "production_grade")
      .sort((a, b) =>
        (gradeRank[a.grade] - gradeRank[b.grade]) ||
        (distanceRank[a.distance] - distanceRank[b.distance]) ||
        a.name.localeCompare(b.name)
      )
      .map((s) => ({ name: s.name, grade: s.grade, distance: s.distance, domain: s.domain, reasons: s.reasons, path: s.path }));

    // —— top by invocation (or proxy) ——
    const invocationUndercounted = total === 0 ? true : invocationKnownCount < total * INVOCATION_COVERAGE_FLOOR;
    let topByInvocation: SkillLibraryAuditResult["topByInvocation"];
    if (invocationKnownCount > 0 && !invocationUndercounted) {
      topByInvocation = {
        available: true, proxy: null,
        entries: [...skills].sort((a, b) => (b.invocationCount30d ?? 0) - (a.invocationCount30d ?? 0)).slice(0, topN)
          .map((s) => ({ name: s.name, value: s.invocationCount30d ?? 0, grade: s.grade, domain: s.domain })),
      };
    } else {
      if (invocationKnownCount === 0) advisories.push("Invocation telemetry unavailable (all invocation_count_30d are null — U-SKU04 pending). 'Top by invocation' falls back to trigger-phrase count as a breadth-of-applicability proxy; the zero-invocation → orphan rule is disabled.");
      else advisories.push(`Invocation telemetry covers only ${invocationKnownCount}/${total} skills (< ${Math.round(INVOCATION_COVERAGE_FLOOR * 100)}%) — flagged invocationUndercounted; 'Top by invocation' uses a proxy.`);
      topByInvocation = {
        available: false, proxy: "trigger_phrase_count",
        entries: [...skills].sort((a, b) => (b.triggerPhraseCount - a.triggerPhraseCount) || a.name.localeCompare(b.name)).slice(0, topN)
          .map((s) => ({ name: s.name, value: s.triggerPhraseCount, grade: s.grade, domain: s.domain })),
      };
    }

    // —— ROI estimate ——
    const N = counts.production_grade;
    const lintCleanThreeQNoScenario = skills.filter((s) => s.grade === "needs_refinement" && s.lintSeverity == null && s.threeQ.ok && !s.scenarioTestsAllPass).length;
    const roiEstimate: RoiEstimate = {
      productionGradeCount: N,
      perSkillHrsYr: HRS_PER_PRODUCTION_SKILL_YEAR,
      lowerBoundHrsYr: Math.round(N * HRS_PER_PRODUCTION_SKILL_YEAR * ROI_LOWER_FRACTION),
      upperBoundHrsYr: Math.round(N * HRS_PER_PRODUCTION_SKILL_YEAR),
      potentialIfFixturesWritten: {
        extraSkills: lintCleanThreeQNoScenario,
        upperBoundHrsYr: Math.round((N + lintCleanThreeQNoScenario) * HRS_PER_PRODUCTION_SKILL_YEAR),
      },
      heuristic: "@eng_khairallah1: a production-grade skill you use weekly saves ≈30 min/wk ⇒ ≈25 engineer-hours/year",
      assumptions: [
        `${HRS_PER_PRODUCTION_SKILL_YEAR} hrs/yr per production-grade skill assumes weekly use; the lower bound assumes only ${Math.round(ROI_LOWER_FRACTION * 100)}% of the production-grade subset is used weekly.`,
        "This is a deliberately fuzzy heuristic, presented as a range — do not cite it as a precise figure.",
        N === 0 ? "N = 0 today (the 3-scenario protocol shipped in U-SKU02 and no skill has been run through prism_dev:skill_test yet) ⇒ realized ROI is $0; the estimate becomes meaningful as the gap list is worked." : "",
      ].filter((s): s is string => s.length > 0),
    };

    // —— skill_type provenance + advisories ——
    let skillTypeSource: SkillLibraryAuditResult["skillTypeSource"] = "none";
    if (skillTypeFromRegistry > 0 && skillTypeFromFrontmatter > 0) skillTypeSource = "mixed";
    else if (skillTypeFromRegistry > 0) skillTypeSource = "registry";
    else if (skillTypeFromFrontmatter > 0) skillTypeSource = "frontmatter-reread";
    if (skillTypeFromRegistry === 0 && total > 0) {
      advisories.push("SKILL_QUALITY_REGISTRY.json does not persist `skill_type` — the audit re-derives it from each skill's frontmatter. Consider extending SkillQualityRegistryBuilder (U-SKU06 follow-up) so the registry carries it.");
    }
    if (counts.production_grade === 0 && total > 0) {
      advisories.push("0 production-grade skills — expected on the first audit after U-SKU02: production-grade requires all three scenario tests to PASS, and no skill has been run through prism_dev:skill_test yet. The actionable output is the gap list (which skills are `near` — already linter-clean + 3Q-OK, just missing the fixture run).");
    }
    if (counts.stub_or_orphan > STUB_CLEANUP_THRESHOLD) {
      advisories.push(`${counts.stub_or_orphan} skills graded stub_or_orphan (> ${STUB_CLEANUP_THRESHOLD}) — consider a SKILL-CLEANUP-MS1 follow-up milestone (disable, never delete, per the reversibility rule).`);
    }
    for (const [dom, row] of Object.entries(byDomain)) {
      if (row.total >= DOMAIN_MIN_SIZE_FOR_GAP_FLAG && row.production_grade === 0 && row.stub_or_orphan >= row.total * DOMAIN_STUB_DOMINANCE_FRACTION) {
        advisories.push(`Domain "${dom}": ${row.total} skills, 0 production-grade, ${row.stub_or_orphan} stub_or_orphan — a structural gap; consider SKILL-GAP-FILL-MS1 for this domain.`);
      }
    }

    return {
      schemaVersion: SKILL_LIBRARY_AUDIT_SCHEMA_VERSION,
      generatedAt: new Date(nowMs).toISOString(),
      total, counts, sumInvariantOk, byDomain, byGrade, gapList, topByInvocation, roiEstimate,
      invocationUndercounted, skillTypeSource, advisories,
      sources: {
        registryPath, registryGeneratedAt,
        lintReportPath, lintReportGeneratedAt, lintReportFound,
        scenarioDirRootsProbed: probeScenarioDirs,
      },
      skills,
    };
  }

  /** Render the human-facing scorecard markdown (the `state/shared/SKILL-LIBRARY-AUDIT-<date>.md` artifact). */
  renderMarkdown(r: SkillLibraryAuditResult, opts: { dateLabel?: string; maxGapRows?: number } = {}): string {
    const dateLabel = opts.dateLabel ?? r.generatedAt.slice(0, 10);
    const maxGapRows = opts.maxGapRows ?? DEFAULT_MARKDOWN_GAP_ROWS;
    const pct = (n: number) => (r.total ? `${((n / r.total) * 100).toFixed(1)}%` : "0%");
    const L: string[] = [];
    L.push(`# PRISM Skill-Library Audit — ${dateLabel}`);
    L.push("");
    L.push(`> @eng_khairallah1 Phase-4: *"One skill is a tool. Ten skills is a workforce."* — but count is vanity. This grades all **${r.total}** skills against the production-grade bar (linter-clean ∧ 3-Question-satisfied ∧ all-three-scenario-tests pass).`);
    L.push("");
    L.push(`*Generated ${r.generatedAt} · schema ${r.schemaVersion} · sum-invariant ${r.sumInvariantOk ? "OK ✓" : "FAILED ✗"}*`);
    L.push("");
    L.push(`## Scorecard`);
    L.push("");
    L.push(`| Grade | Count | Share |`);
    L.push(`|---|---:|---:|`);
    L.push(`| ✅ production_grade | **${r.counts.production_grade}** | ${pct(r.counts.production_grade)} |`);
    L.push(`| 🛠️ needs_refinement | **${r.counts.needs_refinement}** | ${pct(r.counts.needs_refinement)} |`);
    L.push(`| 🗑️ stub_or_orphan | **${r.counts.stub_or_orphan}** | ${pct(r.counts.stub_or_orphan)} |`);
    L.push(`| **total** | **${r.total}** | 100% |`);
    L.push("");
    if (r.advisories.length) {
      L.push(`## Advisories`);
      L.push("");
      for (const a of r.advisories) L.push(`- ${a}`);
      L.push("");
    }
    L.push(`## Per-domain breakdown`);
    L.push("");
    L.push(`| Domain | Total | ✅ prod | 🛠️ needs | 🗑️ stub |`);
    L.push(`|---|---:|---:|---:|---:|`);
    for (const [dom, row] of Object.entries(r.byDomain).sort((a, b) => b[1].total - a[1].total)) {
      L.push(`| ${dom} | ${row.total} | ${row.production_grade} | ${row.needs_refinement} | ${row.stub_or_orphan} |`);
    }
    L.push("");
    L.push(`## Top ${r.topByInvocation.entries.length} by ${r.topByInvocation.available ? "invocation (last 30d)" : `\`${r.topByInvocation.proxy}\` (proxy — invocation telemetry unavailable)`}`);
    L.push("");
    L.push(`| # | Skill | ${r.topByInvocation.available ? "Invocations/30d" : "Trigger phrases"} | Grade | Domain |`);
    L.push(`|---:|---|---:|---|---|`);
    r.topByInvocation.entries.forEach((e, i) => L.push(`| ${i + 1} | \`${e.name}\` | ${e.value} | ${e.grade} | ${e.domain} |`));
    L.push("");
    L.push(`## Gap list — prioritized (top ${Math.min(maxGapRows, r.gapList.length)} of ${r.gapList.length})`);
    L.push("");
    L.push(`Worked top-to-bottom this is the fastest path to growing the production-grade count. \`near\` = already linter-clean + 3Q-OK, just needs \`happy/edge/stress.md\` written + a \`prism_dev:skill_test\` run.`);
    L.push("");
    L.push(`| Skill | Grade | Distance | Domain | Why |`);
    L.push(`|---|---|---|---|---|`);
    for (const g of r.gapList.slice(0, maxGapRows)) {
      L.push(`| \`${g.name}\` | ${g.grade} | ${g.distance} | ${g.domain} | ${g.reasons.join("; ").replace(/\|/g, "\\|")} |`);
    }
    if (r.gapList.length > maxGapRows) L.push(`| … | | | | *(${r.gapList.length - maxGapRows} more — see the JSON sidecar)* |`);
    L.push("");
    L.push(`## ROI estimate (@eng_khairallah1 heuristic — a range, not a precise figure)`);
    L.push("");
    L.push(`- Heuristic: ${r.roiEstimate.heuristic}.`);
    L.push(`- Production-grade today: **${r.roiEstimate.productionGradeCount}** ⇒ realized ≈ **${r.roiEstimate.lowerBoundHrsYr}–${r.roiEstimate.upperBoundHrsYr} engineer-hours/year**.`);
    L.push(`- Potential: writing+running fixtures for the **${r.roiEstimate.potentialIfFixturesWritten.extraSkills}** skills that already pass linter+3Q would lift the library to **${r.roiEstimate.productionGradeCount + r.roiEstimate.potentialIfFixturesWritten.extraSkills}** production-grade ⇒ up to ≈ **${r.roiEstimate.potentialIfFixturesWritten.upperBoundHrsYr} engineer-hours/year**.`);
    for (const a of r.roiEstimate.assumptions) L.push(`- ${a}`);
    L.push("");
    L.push(`## Sources`);
    L.push("");
    L.push(`- Registry: \`${r.sources.registryPath}\` (generated ${r.sources.registryGeneratedAt ?? "?"})`);
    L.push(`- Lint report: ${r.sources.lintReportFound ? `\`${r.sources.lintReportPath}\` (generated ${r.sources.lintReportGeneratedAt ?? "?"})` : "*(not found — every skill graded linter-clean)*"}`);
    L.push(`- skill_type provenance: ${r.skillTypeSource}`);
    L.push(`- \`scenarios/\` dirs probed on disk: ${r.sources.scenarioDirRootsProbed ? "yes" : "no"}`);
    L.push("");
    L.push(`*Re-run: \`node scripts/skill-library-audit.mjs\` · monthly cron \`0 8 1 * *\` (cron id \`skill-library-audit-monthly\`) · dispatcher \`prism_dev:skill_audit\`.*`);
    L.push("");
    return L.join("\n");
  }
}

export const skillLibraryAuditEngine = new SkillLibraryAuditEngine();
