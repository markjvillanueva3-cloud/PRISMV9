/**
 * SkillRefinementDigestEngine — U-SKU04 (SKILLS-UTILIZATION-MS0).
 *
 * @eng_khairallah1 Phase-3: *"Every time you use a Skill and the output is not
 * quite right, update the SKILL.md immediately. Set a calendar reminder to review
 * and refine your Skill every Friday for the first month."* This engine is the
 * "Friday reminder" made live + the "master document tracking status + last
 * refinement date" — it surfaces, weekly, the skills that want attention:
 *
 *   A. output_overridden  — invoked-then-corrected (telemetry). No "override" event
 *                           type exists yet ⇒ a *proxy*: hot (high invocation) but
 *                           not recently refined. Flagged as a proxy until telemetry lands.
 *   B. stale_but_hot      — last_refined > 90d AND invocation_count_30d > 10. Until
 *                           invocation telemetry exists this *degrades* to "stale
 *                           (> 90d)" — every old skill, capped, with the note.
 *   C. linter_flagged     — has a BROKEN/MAJOR/MINOR finding in skill-lint-report.json
 *                           (U-SKU03). Works fully today.
 *
 * Each digest entry is enriched, when a SKILL-LIBRARY-AUDIT-<date>.json (U-SKU05)
 * is available, with the skill's audit grade + gap-distance + the audit's "why"
 * reasons — that's the "suggested-fix pointer". The engine writes nothing and
 * tracks nothing: refinement is a human/forge action (edit the SKILL.md), and
 * `last_refined` auto-updates from the file's mtime via the registry builder.
 *
 * I/O boundary: this engine reads JSON it's pointed at (registry, lint report,
 * latest audit, optional telemetry-events file) — that's it. The CLI
 * `scripts/skill-refinement-digest.mjs` / the `prism_dev:skill_refinement_digest`
 * action own the dated `state/shared/skill-refinement-digest-<date>.{md,json}`
 * artifacts and the chat-bus push.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SKILL_QUALITY_REGISTRY_PATH } from "../registries/SkillQualityRegistryBuilder.js";

// ── constants ──────────────────────────────────────────────────────────────

export const SKILL_REFINEMENT_DIGEST_SCHEMA_VERSION = "1.0.0";

/** `last_refined` older than this many days ⇒ "stale" (and, with telemetry, the floor for "stale_but_hot"). */
const STALE_DAYS = 90;
/** "Hot" threshold once invocation telemetry exists: `invocation_count_30d` strictly above this. */
const HOT_INVOCATION_FLOOR = 10;
/** Cap on each actionable category (first run after the audit can flag hundreds). */
const DEFAULT_CATEGORY_CAP = 15;
/** Severities that count as "the linter flagged this". */
const BLOCKING_SEVERITIES = new Set(["BROKEN", "MAJOR", "MINOR"]);
/** "This week's top focus" — how many skills to spotlight. */
const SPOTLIGHT_N = 3;
const MS_PER_DAY = 86_400_000;
/** A telemetry event newer than this many days counts as "this week" for category A. */
const RECENT_EVENT_DAYS = 7;

// engine at mcp-server/src/engines/X.ts (or mcp-server/dist/engines/X.js) → ../../../.. = repo root
const REPO_ROOT = process.env.PRISM_REPO_ROOT || path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const STATE_SHARED_DIR = path.join(REPO_ROOT, "state", "shared");
/** `state/shared/skill-lint-report.json` — sibling of the registry's grandparent dir. */
const DEFAULT_LINT_REPORT_PATH = path.join(path.dirname(path.dirname(SKILL_QUALITY_REGISTRY_PATH)), "skill-lint-report.json");
/** Where the dated digest artifacts land (the CLI writes them; exported for callers). */
export const SKILL_REFINEMENT_DIGEST_DIR = STATE_SHARED_DIR;

// ── types ──────────────────────────────────────────────────────────────────

export type RefinementCategory = "output_overridden" | "stale_but_hot" | "linter_flagged";

export interface DigestEntry {
  name: string;
  path: string | null;
  category: RefinementCategory;
  /** Plain-language reason this skill is in this category. */
  reason: string;
  lastRefined: string | null;
  lastRefinedDaysAgo: number | null;
  invocationCount30d: number | null;
  lintSeverity: string | null;
  lintRules: string[];
  /** From the latest SKILL-LIBRARY-AUDIT-<date>.json, if available. */
  auditGrade: string | null;
  auditDistance: string | null;
  auditReasons: string[];
  /** A pointer at what to fix — derived from the audit reasons / lint rules. */
  suggestedFix: string;
}

export interface SkillRefinementDigest {
  schemaVersion: string;
  generatedAt: string;
  weekLabel: string; // ISO week, e.g. "2026-W20"
  totalSkills: number;
  categories: Record<RefinementCategory, DigestEntry[]>;
  /** A skill is "actionable" if it's in ≥1 category; this is the union (deduped, category-A>B>C precedence). */
  actionableCount: number;
  /** The SPOTLIGHT_N skills to focus on first (highest-priority slice of the union). */
  spotlight: DigestEntry[];
  /** True iff no skill landed in any category — "all skills healthy" (or at least: nothing flagged). */
  allHealthy: boolean;
  caps: { perCategory: number; truncatedCategories: RefinementCategory[] };
  /** "N skills have uncommitted edits — refinement in progress" — populated by the caller (it knows git state); the engine leaves it null. */
  uncommittedNote: string | null;
  telemetryAvailable: boolean;
  advisories: string[];
  sources: {
    registryPath: string;
    registryGeneratedAt: string | null;
    lintReportPath: string | null;
    lintReportFound: boolean;
    auditPath: string | null;
    auditFound: boolean;
    telemetryEventsPath: string | null;
    telemetryEventsFound: boolean;
  };
}

export interface RefinementDigestOptions {
  registryPath?: string;
  lintReportPath?: string;
  /** Path to a SKILL-LIBRARY-AUDIT-*.json; if omitted, the engine globs `state/shared/` for the newest one. */
  auditPath?: string;
  /** Path to a JSONL/JSON telemetry events file (each event `{skill, type, ts}`); optional. */
  telemetryEventsPath?: string;
  perCategoryCap?: number;
  nowMs?: number;
  /** Inject objects instead of reading from disk (tests). */
  registryObject?: unknown;
  lintReportObject?: unknown;
  auditObject?: unknown;
  /** Inject telemetry events (tests): `[{skill, type, ts}]` — `type` includes "override"/"correction" for category A. */
  telemetryEventsObject?: Array<{ skill?: unknown; type?: unknown; ts?: unknown }>;
}

// ── helpers ────────────────────────────────────────────────────────────────

function daysSince(dateStr: unknown, nowMs: number): number | null {
  if (typeof dateStr !== "string" || !dateStr.trim()) return null;
  const t = Date.parse(dateStr);
  if (!Number.isFinite(t)) return null;
  const d = Math.floor((nowMs - t) / MS_PER_DAY);
  return Number.isFinite(d) ? d : null;
}

/** ISO-week label, e.g. "2026-W20". */
function isoWeekLabel(nowMs: number): string {
  const d = new Date(nowMs);
  // Thursday-of-this-week trick for ISO week number
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const fDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fDayNr + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY));
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function asStringArray(v: unknown): string[] { return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []; }

function readJson(p: string): unknown { return JSON.parse(fs.readFileSync(p, "utf-8")); }

/** Newest `SKILL-LIBRARY-AUDIT-*.json` in state/shared/, or null. */
function findLatestAuditPath(): string | null {
  try {
    const files = fs.readdirSync(STATE_SHARED_DIR).filter((f) => /^SKILL-LIBRARY-AUDIT-.*\.json$/.test(f));
    if (files.length === 0) return null;
    files.sort(); // YYYY-MM-DD in the name sorts chronologically; newest last
    return path.join(STATE_SHARED_DIR, files[files.length - 1]);
  } catch { return null; }
}

// ── the engine ─────────────────────────────────────────────────────────────

export class SkillRefinementDigestEngine {
  /**
   * Build the weekly refinement digest. Read-only. Throws if the registry can't be
   * read (hard prereq); a missing lint report / audit / telemetry file is tolerated
   * (the affected category degrades, with an advisory).
   */
  digest(opts: RefinementDigestOptions = {}): SkillRefinementDigest {
    const nowMs = opts.nowMs ?? Date.now();
    const cap = typeof opts.perCategoryCap === "number" && opts.perCategoryCap > 0 ? Math.floor(opts.perCategoryCap) : DEFAULT_CATEGORY_CAP;
    const advisories: string[] = [];

    // —— registry (hard prereq) ——
    const registryPath = opts.registryPath ?? SKILL_QUALITY_REGISTRY_PATH;
    let registry: { skills?: unknown; generatedAt?: unknown };
    if (opts.registryObject !== undefined) {
      if (!opts.registryObject || typeof opts.registryObject !== "object") throw new Error("SkillRefinementDigestEngine: registryObject must be an object.");
      registry = opts.registryObject as { skills?: unknown; generatedAt?: unknown };
    } else {
      try { registry = readJson(registryPath) as { skills?: unknown; generatedAt?: unknown }; }
      catch (e) { throw new Error(`SkillRefinementDigestEngine: cannot read SKILL_QUALITY_REGISTRY.json at ${registryPath} (${(e as Error)?.message ?? e}). Run prism_dev:skill_quality_registry_build first.`); }
    }
    const skillRecords: Array<Record<string, unknown>> = Array.isArray(registry.skills) ? (registry.skills as Array<Record<string, unknown>>) : [];
    const registryGeneratedAt = typeof registry.generatedAt === "string" ? registry.generatedAt : null;

    // —— lint report (soft) ——
    const lintReportPath = opts.lintReportObject !== undefined ? null : (opts.lintReportPath ?? DEFAULT_LINT_REPORT_PATH);
    let lintReportObj: unknown = opts.lintReportObject;
    let lintReportFound = opts.lintReportObject !== undefined;
    if (opts.lintReportObject === undefined && lintReportPath) {
      try { lintReportObj = readJson(lintReportPath); lintReportFound = true; }
      catch { advisories.push(`Lint report not found at ${lintReportPath} — the "linter-flagged" category will be empty. Run scripts/skill-lint.mjs.`); }
    }
    const lintByName = new Map<string, { severity: string | null; rules: string[] }>();
    if (lintReportObj && typeof lintReportObj === "object") {
      const arr = Array.isArray((lintReportObj as { skills?: unknown }).skills) ? (lintReportObj as { skills: unknown[] }).skills : [];
      for (const e of arr) {
        if (!e || typeof e !== "object") continue;
        const r = e as Record<string, unknown>;
        if (typeof r.name === "string") lintByName.set(r.name, { severity: typeof r.severity === "string" ? r.severity : null, rules: asStringArray(r.rules) });
      }
    }

    // —— latest audit (soft) — enrichment ——
    const auditPath = opts.auditObject !== undefined ? null : (opts.auditPath ?? findLatestAuditPath());
    let auditObj: unknown = opts.auditObject;
    let auditFound = opts.auditObject !== undefined;
    if (opts.auditObject === undefined && auditPath) {
      try { auditObj = readJson(auditPath); auditFound = true; }
      catch { advisories.push(`Latest skill-library audit not readable at ${auditPath} — digest entries won't carry audit grade/distance. Run scripts/skill-library-audit.mjs.`); }
    }
    if (opts.auditObject === undefined && !auditPath) advisories.push("No SKILL-LIBRARY-AUDIT-*.json found in state/shared/ — digest entries won't carry the audit's grade/distance/suggested-fix. Run scripts/skill-library-audit.mjs first.");
    const auditByName = new Map<string, { grade: string | null; distance: string | null; reasons: string[] }>();
    if (auditObj && typeof auditObj === "object") {
      const arr = Array.isArray((auditObj as { skills?: unknown }).skills) ? (auditObj as { skills: unknown[] }).skills : [];
      for (const e of arr) {
        if (!e || typeof e !== "object") continue;
        const r = e as Record<string, unknown>;
        if (typeof r.name === "string") auditByName.set(r.name, { grade: typeof r.grade === "string" ? r.grade : null, distance: typeof r.distance === "string" ? r.distance : null, reasons: asStringArray(r.reasons) });
      }
    }

    // —— telemetry events (optional) — category A ——
    const telemetryEventsPath = opts.telemetryEventsObject !== undefined ? null : (opts.telemetryEventsPath ?? null);
    let telemetryEvents: Array<{ skill?: unknown; type?: unknown; ts?: unknown }> = opts.telemetryEventsObject ?? [];
    let telemetryEventsFound = opts.telemetryEventsObject !== undefined;
    if (opts.telemetryEventsObject === undefined && telemetryEventsPath) {
      try {
        const raw = fs.readFileSync(telemetryEventsPath, "utf-8").trim();
        telemetryEvents = raw.startsWith("[") ? (JSON.parse(raw) as Array<{ skill?: unknown; type?: unknown; ts?: unknown }>) : raw.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l) as { skill?: unknown; type?: unknown; ts?: unknown });
        telemetryEventsFound = true;
      } catch { telemetryEvents = []; }
    }
    const overrideEventTypes = new Set(["override", "overridden", "correction", "corrected", "rejected", "edited_output"]);
    const overriddenSkillsThisWeek = new Set<string>();
    for (const ev of telemetryEvents) {
      if (!ev || typeof ev !== "object") continue;
      const skill = typeof ev.skill === "string" ? ev.skill : null;
      const type = typeof ev.type === "string" ? ev.type.toLowerCase() : "";
      if (!skill || !overrideEventTypes.has(type)) continue;
      const ageDays = daysSince(ev.ts, nowMs);
      if (ageDays == null || ageDays <= RECENT_EVENT_DAYS) overriddenSkillsThisWeek.add(skill);
    }
    const telemetryAvailable = telemetryEventsFound && telemetryEvents.length > 0;

    // —— build the per-skill view ——
    type Row = { name: string; path: string | null; lastRefined: string | null; daysAgo: number | null; inv: number | null; lintSeverity: string | null; lintRules: string[] };
    const rows: Row[] = [];
    let invocationKnown = 0;
    for (const rec of skillRecords) {
      if (!rec || typeof rec !== "object") continue;
      const name = typeof rec.name === "string" ? rec.name : "(unnamed)";
      const q = (rec.quality && typeof rec.quality === "object") ? (rec.quality as Record<string, unknown>) : {};
      const lastRefined = typeof q.last_refined === "string" ? q.last_refined : null;
      const inv = (typeof q.invocation_count_30d === "number" && Number.isFinite(q.invocation_count_30d)) ? q.invocation_count_30d : null;
      if (inv != null) invocationKnown++;
      const lint = lintByName.get(name);
      rows.push({ name, path: typeof rec.path === "string" ? rec.path : null, lastRefined, daysAgo: daysSince(lastRefined, nowMs), inv, lintSeverity: lint?.severity ?? null, lintRules: lint?.rules ?? [] });
    }
    const totalSkills = rows.length;
    const invocationTelemetry = invocationKnown >= totalSkills * 0.8 && totalSkills > 0;

    // —— assemble each category ——
    const mk = (r: Row, category: RefinementCategory, reason: string): DigestEntry => {
      const a = auditByName.get(r.name);
      const lintFix = r.lintRules.length ? `linter rules ${r.lintRules.join(",")} — see scripts/skill-lint.mjs` : "";
      const auditFix = a && a.reasons.length ? a.reasons.join("; ") : "";
      return {
        name: r.name, path: r.path, category, reason,
        lastRefined: r.lastRefined, lastRefinedDaysAgo: r.daysAgo, invocationCount30d: r.inv,
        lintSeverity: r.lintSeverity, lintRules: r.lintRules,
        auditGrade: a?.grade ?? null, auditDistance: a?.distance ?? null, auditReasons: a?.reasons ?? [],
        suggestedFix: auditFix || lintFix || "review SKILL.md for clarity / output example / trigger phrases",
      };
    };

    // C: linter-flagged (works fully)
    const linterFlagged = rows
      .filter((r) => r.lintSeverity != null && BLOCKING_SEVERITIES.has(r.lintSeverity))
      .sort((a, b) => (b.lintRules.length - a.lintRules.length) || ((b.inv ?? 0) - (a.inv ?? 0)) || a.name.localeCompare(b.name))
      .map((r) => mk(r, "linter_flagged", `linter: ${r.lintSeverity} (${r.lintRules.join(",") || "?"})`));

    // B: stale_but_hot — full when invocation telemetry exists, else "stale (>90d)"
    let staleButHot: DigestEntry[];
    if (invocationTelemetry) {
      staleButHot = rows
        .filter((r) => r.daysAgo != null && r.daysAgo > STALE_DAYS && (r.inv ?? 0) > HOT_INVOCATION_FLOOR)
        .sort((a, b) => ((b.inv ?? 0) - (a.inv ?? 0)) || ((b.daysAgo ?? 0) - (a.daysAgo ?? 0)) || a.name.localeCompare(b.name))
        .map((r) => mk(r, "stale_but_hot", `last refined ${r.daysAgo}d ago, invoked ${r.inv}×/30d (stale-but-hot)`));
    } else {
      staleButHot = rows
        .filter((r) => r.daysAgo != null && r.daysAgo > STALE_DAYS)
        .sort((a, b) => ((b.daysAgo ?? 0) - (a.daysAgo ?? 0)) || a.name.localeCompare(b.name))
        .map((r) => mk(r, "stale_but_hot", `last refined ${r.daysAgo}d ago (> ${STALE_DAYS}d) — listed as "stale"; would be filtered to stale-AND-hot once invocation telemetry is wired (U-SKU04 telemetry leg)`));
      if (staleButHot.length) advisories.push(`Invocation telemetry unavailable — the "stale_but_hot" category lists ALL skills not refined in > ${STALE_DAYS}d (it will narrow to stale-AND-invoked-> ${HOT_INVOCATION_FLOOR}× once invocation_count_30d is populated).`);
    }

    // A: output_overridden — telemetry events, else a proxy (hot + not recently refined)
    let outputOverridden: DigestEntry[];
    if (overriddenSkillsThisWeek.size > 0) {
      outputOverridden = rows.filter((r) => overriddenSkillsThisWeek.has(r.name)).map((r) => mk(r, "output_overridden", `output overridden/corrected in the last ${RECENT_EVENT_DAYS}d (telemetry)`));
    } else if (invocationTelemetry) {
      // proxy: invoked recently but not refined recently
      outputOverridden = rows
        .filter((r) => (r.inv ?? 0) > HOT_INVOCATION_FLOOR && r.daysAgo != null && r.daysAgo > STALE_DAYS)
        .sort((a, b) => (b.inv ?? 0) - (a.inv ?? 0))
        .map((r) => mk(r, "output_overridden", `invoked ${r.inv}×/30d but not refined in ${r.daysAgo}d — PROXY for "output_overridden" until an override-event type exists`));
      if (outputOverridden.length) advisories.push('The "output_overridden" category is a PROXY (hot-but-not-recently-refined) — no override-event type is recorded yet. It will become exact once skill invocations log a correction event.');
    } else {
      outputOverridden = [];
      advisories.push('The "output_overridden" category is empty: no telemetry events file was supplied and invocation counts are null. Wire skill-invocation telemetry (incl. a correction/override event) to populate it.');
    }

    // —— caps ——
    const truncatedCategories: RefinementCategory[] = [];
    const applyCap = (arr: DigestEntry[], cat: RefinementCategory): DigestEntry[] => { if (arr.length > cap) { truncatedCategories.push(cat); return arr.slice(0, cap); } return arr; };
    const categories: Record<RefinementCategory, DigestEntry[]> = {
      output_overridden: applyCap(outputOverridden, "output_overridden"),
      stale_but_hot: applyCap(staleButHot, "stale_but_hot"),
      linter_flagged: applyCap(linterFlagged, "linter_flagged"),
    };
    if (truncatedCategories.length) advisories.push(`Capped at ${cap} per category (${truncatedCategories.join(", ")}) — the full lists are derivable from the registry / lint report / latest audit.`);

    // —— union + spotlight (precedence A > B > C) ——
    const unionSeen = new Set<string>();
    const union: DigestEntry[] = [];
    for (const cat of ["output_overridden", "stale_but_hot", "linter_flagged"] as const) for (const e of categories[cat]) if (!unionSeen.has(e.name)) { unionSeen.add(e.name); union.push(e); }
    const spotlight = union.slice(0, SPOTLIGHT_N);
    const allHealthy = union.length === 0;
    if (allHealthy) advisories.push("No skill landed in any refinement category this week — nothing flagged by the linter, none stale beyond the window, no override events. (Note: with 0 production-grade skills overall, this means 'nothing acutely broken', not 'everything is production-grade' — see the latest SKILL-LIBRARY-AUDIT for the broader gap list.)");

    return {
      schemaVersion: SKILL_REFINEMENT_DIGEST_SCHEMA_VERSION,
      generatedAt: new Date(nowMs).toISOString(),
      weekLabel: isoWeekLabel(nowMs),
      totalSkills,
      categories,
      actionableCount: union.length,
      spotlight,
      allHealthy,
      caps: { perCategory: cap, truncatedCategories },
      uncommittedNote: null,
      telemetryAvailable,
      advisories,
      sources: {
        registryPath, registryGeneratedAt,
        lintReportPath, lintReportFound,
        auditPath, auditFound,
        telemetryEventsPath, telemetryEventsFound,
      },
    };
  }

  /** Render the human-facing Friday digest markdown. */
  renderMarkdown(d: SkillRefinementDigest, opts: { dateLabel?: string } = {}): string {
    const dateLabel = opts.dateLabel ?? d.generatedAt.slice(0, 10);
    const esc = (s: string) => s.replace(/\|/g, "\\|");
    const L: string[] = [];
    L.push(`# PRISM Weekly Skill-Refinement Digest — ${dateLabel} (${d.weekLabel})`);
    L.push("");
    L.push(`> @eng_khairallah1 Phase-3: *"…review and refine your Skill every Friday for the first month."* This is that Friday review — the skills wanting attention this week. **Refinement is a human/forge action: edit the SKILL.md** (the registry picks up the new \`last_refined\` from the file mtime; no bookkeeping).`);
    L.push("");
    L.push(`*Generated ${d.generatedAt} · schema ${d.schemaVersion} · ${d.totalSkills} skills tracked · ${d.actionableCount} actionable this week*`);
    L.push("");
    if (d.uncommittedNote) { L.push(`> ⚠️ ${d.uncommittedNote}`); L.push(""); }
    if (d.allHealthy) {
      L.push(`## ✅ No action needed this week`);
      L.push("");
      L.push(`Nothing landed in any category. (See Advisories for what this does and doesn't mean.)`);
      L.push("");
    } else {
      L.push(`## 🎯 This week's focus (top ${d.spotlight.length})`);
      L.push("");
      for (const e of d.spotlight) L.push(`1. \`${esc(e.name)}\` — ${esc(e.reason)}. Fix: ${esc(e.suggestedFix)}${e.auditDistance ? ` (audit distance: ${e.auditDistance})` : ""}.`);
      L.push("");
    }
    const section = (title: string, cat: RefinementCategory) => {
      const entries = d.categories[cat];
      L.push(`## ${title} — ${entries.length}${d.caps.truncatedCategories.includes(cat) ? ` (capped at ${d.caps.perCategory})` : ""}`);
      L.push("");
      if (entries.length === 0) { L.push(`*(none)*`); L.push(""); return; }
      L.push(`| Skill | Why | Last refined | Audit | Suggested fix |`);
      L.push(`|---|---|---|---|---|`);
      for (const e of entries) L.push(`| \`${esc(e.name)}\` | ${esc(e.reason)} | ${e.lastRefined ?? "?"}${e.lastRefinedDaysAgo != null ? ` (${e.lastRefinedDaysAgo}d)` : ""} | ${e.auditGrade ?? "?"}${e.auditDistance ? `/${e.auditDistance}` : ""} | ${esc(e.suggestedFix)} |`);
      L.push("");
    };
    section("A. Output overridden / corrected (proxy until telemetry)", "output_overridden");
    section("B. Stale — not refined recently (→ stale-but-hot once telemetry lands)", "stale_but_hot");
    section("C. Linter-flagged", "linter_flagged");
    if (d.advisories.length) { L.push(`## Advisories`); L.push(""); for (const a of d.advisories) L.push(`- ${a}`); L.push(""); }
    L.push(`## Sources`);
    L.push("");
    L.push(`- Registry: \`${d.sources.registryPath}\` (generated ${d.sources.registryGeneratedAt ?? "?"})`);
    L.push(`- Lint report: ${d.sources.lintReportFound ? `\`${d.sources.lintReportPath}\`` : "*(not found)*"}`);
    L.push(`- Latest audit: ${d.sources.auditFound ? `\`${d.sources.auditPath}\`` : "*(not found — run scripts/skill-library-audit.mjs)*"}`);
    L.push(`- Telemetry events: ${d.sources.telemetryEventsFound ? `\`${d.sources.telemetryEventsPath ?? "(injected)"}\`` : "*(none — invocation/override telemetry not wired yet)*"}`);
    L.push("");
    L.push(`*Re-run: \`node scripts/skill-refinement-digest.mjs\` · weekly cron \`13 9 * * 5\` (Friday 9:13am — cron id \`skill-refinement-digest-weekly\`) · dispatcher \`prism_dev:skill_refinement_digest\`.*`);
    L.push("");
    return L.join("\n");
  }
}

export const skillRefinementDigestEngine = new SkillRefinementDigestEngine();
