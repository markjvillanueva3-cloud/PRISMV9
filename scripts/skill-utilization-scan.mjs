#!/usr/bin/env node
/**
 * skill-utilization-scan.mjs — Skill utilization audit
 *   (CLEANUP-MS0 / U-CLEANUP-H2)
 *
 * Weekly Tue 04:23 cron sweep over the user's skill library:
 *   - ~/.claude/commands/ (user-tier skills, ~390)
 *   - .claude/commands/  (project-tier skills, ~160)
 *
 * Surfaces 30-day-unused skills as PROPOSED archive candidates so the
 * operator can decide whether to demote them to commands-archive/.
 * Addresses HS-06 (~565 user-skill re-injects per prompt → context bloat).
 *
 * **Advisory only — never auto-moves files.** PROPOSED archives are
 * surfaced in SKILL_UTILIZATION_REPORT.md; Mark promotes manually.
 *
 * Signals:
 *   1. invocation_count_30d (from SKILL_QUALITY_REGISTRY.json — primary
 *      signal once U-SKU04 lands; today many entries are null).
 *   2. last_refined (date from registry) + file mtime — fallback proxy
 *      for activity when invocation telemetry is missing.
 *   3. skill-lint-report.json — flags structural problems (stub bodies,
 *      missing frontmatter, broken triggers).
 *
 * Outputs:
 *   - state/shared/SKILL_UTILIZATION_REPORT.md  (human)
 *   - state/shared/SKILL_UTILIZATION_REPORT.json (machine; schemaVersion 1)
 *
 * CLI:
 *   node scripts/skill-utilization-scan.mjs
 *   node scripts/skill-utilization-scan.mjs --json
 *   node scripts/skill-utilization-scan.mjs --frozen-time 2026-05-14T00:00:00Z
 *   node scripts/skill-utilization-scan.mjs --window-days 30
 *   node scripts/skill-utilization-scan.mjs --registry <path> --lint <path>
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-H2.
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  mkdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { dirname, isAbsolute as pathIsAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_REPO = resolve(__dirname, "..");

const DEFAULT_REGISTRY_REL = "state/shared/registries/SKILL_QUALITY_REGISTRY.json";
const DEFAULT_LINT_REL = "state/shared/skill-lint-report.json";
const DEFAULT_OUT_MD_REL = "state/shared/SKILL_UTILIZATION_REPORT.md";
const DEFAULT_OUT_JSON_REL = "state/shared/SKILL_UTILIZATION_REPORT.json";

const DEFAULT_WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Status categories (precedence: stale_30d > active > unknown_recent > unknown).
 *
 *   stale_30d      — invocation_count_30d == 0  (real telemetry says unused)
 *   active         — invocation_count_30d >= 1  (real telemetry says active)
 *   unknown_recent — telemetry null + activity within window (probably fine)
 *   unknown_stale  — telemetry null + activity older than window (proxy proposes archive)
 *   no_path        — registry entry has no resolvable on-disk path
 */
export const STATUS = Object.freeze({
  STALE_30D: "stale_30d",
  ACTIVE: "active",
  UNKNOWN_RECENT: "unknown_recent",
  UNKNOWN_STALE: "unknown_stale",
  NO_PATH: "no_path",
});

/**
 * @param {string[]} argv
 * @returns {{
 *   json: boolean,
 *   help: boolean,
 *   frozenTime: string | null,
 *   windowDays: number,
 *   registryPath: string | null,
 *   lintPath: string | null,
 *   outMd: string | null,
 *   outJson: string | null,
 * }}
 */
export function parseArgs(argv) {
  const opts = {
    json: false,
    help: false,
    frozenTime: null,
    windowDays: DEFAULT_WINDOW_DAYS,
    registryPath: null,
    lintPath: null,
    outMd: null,
    outJson: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--frozen-time") opts.frozenTime = argv[++i] ?? null;
    else if (a === "--window-days") {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) opts.windowDays = Math.floor(n);
    } else if (a === "--registry") opts.registryPath = argv[++i] ?? null;
    else if (a === "--lint") opts.lintPath = argv[++i] ?? null;
    else if (a === "--out-md") opts.outMd = argv[++i] ?? null;
    else if (a === "--out-json") opts.outJson = argv[++i] ?? null;
  }
  return opts;
}

/**
 * Compute days between `then` (ISO) and `now` (ISO). Returns null if
 * either is unparseable. Always non-negative (clamps at 0).
 */
function daysBetween(thenIso, nowIso) {
  if (!thenIso || !nowIso) return null;
  const t = Date.parse(thenIso);
  const n = Date.parse(nowIso);
  if (!Number.isFinite(t) || !Number.isFinite(n)) return null;
  return Math.max(0, Math.round((n - t) / MS_PER_DAY));
}

/**
 * Classify a single skill against the window.
 *
 * Pure: injection-style — caller provides mtimeIso (filesystem lookups
 * happen outside this function).
 *
 * @param {object} args
 * @param {{
 *   name: string,
 *   path?: string,
 *   tier?: string,
 *   quality?: {
 *     invocation_count_30d?: number | null,
 *     last_refined?: string | null,
 *   },
 * }} args.skill
 * @param {string|null} args.mtimeIso
 * @param {string} args.nowIso
 * @param {number} args.windowDays
 * @returns {{
 *   name: string,
 *   tier: string,
 *   path: string,
 *   status: string,
 *   invocationCount30d: number | null,
 *   activityIso: string | null,
 *   activityAgeDays: number | null,
 *   activitySource: 'invocation_count_30d' | 'last_refined' | 'mtime' | 'none',
 *   onDisk: boolean,
 * }}
 */
export function classifySkill({ skill, mtimeIso, nowIso, windowDays }) {
  const name = skill?.name ?? "(unnamed)";
  const tier = typeof skill?.tier === "string" ? skill.tier : "unknown";
  const path = typeof skill?.path === "string" ? skill.path : "";
  const onDisk = !!mtimeIso;
  const invocationCount30d =
    skill?.quality && Number.isFinite(skill.quality.invocation_count_30d)
      ? skill.quality.invocation_count_30d
      : null;

  // Pick the freshest activity timestamp from registry vs mtime.
  const lastRefined =
    skill?.quality?.last_refined && typeof skill.quality.last_refined === "string"
      ? skill.quality.last_refined
      : null;
  let activityIso = null;
  let activitySource = "none";
  const lastRefinedMs = lastRefined ? Date.parse(lastRefined) : NaN;
  const mtimeMs = mtimeIso ? Date.parse(mtimeIso) : NaN;
  if (Number.isFinite(lastRefinedMs) && Number.isFinite(mtimeMs)) {
    if (mtimeMs >= lastRefinedMs) {
      activityIso = mtimeIso;
      activitySource = "mtime";
    } else {
      activityIso = lastRefined;
      activitySource = "last_refined";
    }
  } else if (Number.isFinite(mtimeMs)) {
    activityIso = mtimeIso;
    activitySource = "mtime";
  } else if (Number.isFinite(lastRefinedMs)) {
    activityIso = lastRefined;
    activitySource = "last_refined";
  }

  const activityAgeDays = daysBetween(activityIso, nowIso);

  // Classification — precedence is intentional:
  // 1) telemetry-driven decisions first (any non-null invocation count)
  // 2) on-disk presence / fallback proxies last
  let status;
  if (!onDisk && !path) status = STATUS.NO_PATH;
  else if (!onDisk) status = STATUS.NO_PATH; // listed in registry but file missing
  else if (invocationCount30d !== null && invocationCount30d === 0) {
    status = STATUS.STALE_30D;
  } else if (invocationCount30d !== null && invocationCount30d >= 1) {
    status = STATUS.ACTIVE;
    // Even if it's "active", if it has activity source, expose it. Otherwise treat as null.
    if (activitySource === "invocation_count_30d") activitySource = "last_refined";
  } else if (activityAgeDays !== null && activityAgeDays > windowDays) {
    status = STATUS.UNKNOWN_STALE;
  } else if (activityAgeDays !== null) {
    status = STATUS.UNKNOWN_RECENT;
  } else {
    status = STATUS.UNKNOWN_RECENT; // No activity signal at all — keep conservative
  }

  return {
    name,
    tier,
    path,
    status,
    invocationCount30d,
    activityIso,
    activityAgeDays,
    activitySource,
    onDisk,
  };
}

/**
 * Aggregate per-skill classifications into the report.
 *
 * Pure: relies entirely on provided inputs.
 *
 * @param {object} args
 * @param {Array<object>} args.classifiedSkills
 * @param {object} args.registry
 * @param {object|null} args.lintReport
 * @param {string} args.nowIso
 * @param {number} args.windowDays
 * @returns {{
 *   schemaVersion: number,
 *   generatedAt: string,
 *   windowDays: number,
 *   totals: {
 *     skills: number,
 *     onDisk: number,
 *     missingFromDisk: number,
 *     telemetryAvailable: number,
 *   },
 *   counts: { stale_30d: number, active: number, unknown_recent: number, unknown_stale: number, no_path: number },
 *   byTier: Record<string, {total:number, proposed_archive:number, active:number}>,
 *   proposedArchive: Array<object>,
 *   active: Array<object>,
 *   lintHook: { available: boolean, problems: number | null },
 *   notes: string[],
 * }}
 */
export function buildReport({ classifiedSkills, registry, lintReport, nowIso, windowDays }) {
  const notes = [];
  const total = classifiedSkills.length;
  const onDisk = classifiedSkills.filter((s) => s.onDisk).length;
  const missing = classifiedSkills.filter((s) => !s.onDisk).length;
  const telemetryAvailable = classifiedSkills.filter((s) => s.invocationCount30d !== null).length;

  if (telemetryAvailable === 0) {
    notes.push(
      "invocation_count_30d is null for every skill — proposed archives derive from mtime/last_refined proxy only; treat as advisory until U-SKU04 lands real telemetry",
    );
  }
  if (registry?.parseFailures && Number.isFinite(registry.parseFailures) && registry.parseFailures > 0) {
    notes.push(`SKILL_QUALITY_REGISTRY reported ${registry.parseFailures} parseFailures during last regen`);
  }

  const counts = {
    stale_30d: 0,
    active: 0,
    unknown_recent: 0,
    unknown_stale: 0,
    no_path: 0,
  };
  const byTier = {};
  for (const s of classifiedSkills) {
    counts[s.status] = (counts[s.status] ?? 0) + 1;
    const tier = s.tier || "unknown";
    if (!byTier[tier]) byTier[tier] = { total: 0, proposed_archive: 0, active: 0 };
    byTier[tier].total += 1;
    if (s.status === STATUS.STALE_30D || s.status === STATUS.UNKNOWN_STALE) {
      byTier[tier].proposed_archive += 1;
    }
    if (s.status === STATUS.ACTIVE) {
      byTier[tier].active += 1;
    }
  }

  // Proposed archive set = stale_30d ∪ unknown_stale; sorted by age desc.
  const proposedArchive = classifiedSkills
    .filter((s) => s.status === STATUS.STALE_30D || s.status === STATUS.UNKNOWN_STALE)
    .slice()
    .sort((a, b) => {
      const ax = a.activityAgeDays ?? -1;
      const bx = b.activityAgeDays ?? -1;
      if (bx !== ax) return bx - ax;
      return (a.name || "").localeCompare(b.name || "");
    });

  const active = classifiedSkills
    .filter((s) => s.status === STATUS.ACTIVE)
    .slice()
    .sort((a, b) => (b.invocationCount30d ?? 0) - (a.invocationCount30d ?? 0));

  const lintHook = {
    available: !!lintReport,
    problems:
      lintReport && Array.isArray(lintReport.issues)
        ? lintReport.issues.length
        : lintReport && Number.isFinite(lintReport.totalIssues)
          ? lintReport.totalIssues
          : null,
  };

  return {
    schemaVersion: 1,
    generatedAt: nowIso,
    windowDays,
    totals: {
      skills: total,
      onDisk,
      missingFromDisk: missing,
      telemetryAvailable,
    },
    counts,
    byTier,
    proposedArchive,
    active,
    lintHook,
    notes,
  };
}

/**
 * Render a report to markdown.
 *
 * @param {ReturnType<typeof buildReport>} report
 * @returns {string}
 */
export function renderMarkdown(report) {
  const lines = [];
  lines.push(`# Skill Utilization Audit`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Window: ${report.windowDays} days`);
  lines.push("");
  lines.push(`## Totals`);
  lines.push("");
  lines.push(`- Total skills: **${report.totals.skills}**`);
  lines.push(`- On disk: **${report.totals.onDisk}**`);
  lines.push(`- Missing from disk: **${report.totals.missingFromDisk}**`);
  lines.push(`- Telemetry available (invocation_count_30d != null): **${report.totals.telemetryAvailable}**`);
  lines.push("");
  lines.push(`## Status counts`);
  lines.push("");
  lines.push(`- 🟢 active (telemetry≥1): **${report.counts.active}**`);
  lines.push(`- 🟡 unknown_recent (no telemetry, activity≤${report.windowDays}d): **${report.counts.unknown_recent}**`);
  lines.push(`- 🟠 unknown_stale (no telemetry, activity>${report.windowDays}d): **${report.counts.unknown_stale}**`);
  lines.push(`- 🔴 stale_30d (telemetry==0): **${report.counts.stale_30d}**`);
  lines.push(`- ⚫ no_path (registry has no resolvable file): **${report.counts.no_path}**`);
  lines.push("");
  lines.push(`## By tier`);
  lines.push("");
  if (Object.keys(report.byTier).length === 0) {
    lines.push(`_no tier data_`);
  } else {
    lines.push(`| Tier | Total | Proposed Archive | Active |`);
    lines.push(`|---|---:|---:|---:|`);
    for (const [tier, t] of Object.entries(report.byTier).sort()) {
      lines.push(`| ${tier} | ${t.total} | ${t.proposed_archive} | ${t.active} |`);
    }
  }
  lines.push("");
  lines.push(`## Proposed archive candidates (advisory — Mark promotes manually)`);
  lines.push("");
  lines.push(`> Triggers an HS-06 mitigation: each archived skill cuts ~50-200 token re-inject per UserPromptSubmit.`);
  lines.push("");
  if (report.proposedArchive.length === 0) {
    lines.push(`_no proposed archive candidates_`);
  } else {
    lines.push(`| Skill | Tier | Last activity | Age (days) | Source | Status |`);
    lines.push(`|---|---|---|---:|---|---|`);
    for (const s of report.proposedArchive) {
      lines.push(
        `| ${s.name} | ${s.tier} | ${s.activityIso ?? "(none)"} | ${s.activityAgeDays ?? "n/a"} | ${s.activitySource} | ${s.status} |`,
      );
    }
  }
  lines.push("");
  lines.push(`## Top 10 active skills (telemetry)`);
  lines.push("");
  if (report.active.length === 0) {
    lines.push(`_no telemetry-active skills_`);
  } else {
    lines.push(`| Skill | Tier | invocation_count_30d |`);
    lines.push(`|---|---|---:|`);
    for (const s of report.active.slice(0, 10)) {
      lines.push(`| ${s.name} | ${s.tier} | ${s.invocationCount30d} |`);
    }
  }
  lines.push("");
  lines.push(`## Lint signal`);
  lines.push("");
  if (!report.lintHook.available) {
    lines.push(`_skill-lint-report.json not present — run \`/skill-lint\` to populate_`);
  } else {
    lines.push(`- Lint problems: **${report.lintHook.problems ?? "n/a"}**`);
  }
  lines.push("");
  if (report.notes.length > 0) {
    lines.push(`## Notes`);
    lines.push("");
    for (const n of report.notes) lines.push(`- ${n}`);
    lines.push("");
  }
  lines.push(`---`);
  lines.push(`Source: CLEANUP-MS0 / U-CLEANUP-H2 skill-utilization-scan.mjs`);
  return lines.join("\n") + "\n";
}

function readJsonSafe(path) {
  try {
    const raw = readFileSync(path, "utf-8");
    return { ok: true, value: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function getMtimeIso(path) {
  try {
    return statSync(path).mtime.toISOString();
  } catch (_) {
    return null;
  }
}

function abs(repo, p) {
  return pathIsAbsolute(p) ? p : resolve(repo, p);
}

/**
 * Atomic write — tmp file + rename with retry on EEXIST.
 */
function writeAtomic(dest, contents) {
  const destDir = dirname(dest);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const tag = `${process.pid}-${Date.now()}-${randomBytes(4).toString("hex")}`;
    const tmp = `${dest}.tmp-${tag}`;
    try {
      writeFileSync(tmp, contents, "utf-8");
      renameSync(tmp, dest);
      return;
    } catch (e) {
      lastErr = e;
      try {
        if (existsSync(tmp)) unlinkSync(tmp);
      } catch (_) {
        /* ignore tmp cleanup failure */
      }
    }
  }
  throw lastErr ?? new Error(`writeAtomic failed for ${dest}`);
}

/**
 * CLI entry-point.
 *
 * @param {object} env
 * @param {string[]} env.argv
 * @param {string} [env.repo]
 * @param {(...a:any[])=>void} [env.out]
 * @param {(...a:any[])=>void} [env.err]
 * @returns {Promise<{exitCode: number, report?: any}>}
 */
export async function main({
  argv,
  repo = DEFAULT_REPO,
  out = (...a) => console.log(...a),
  err = (...a) => console.error(...a),
} = {}) {
  const opts = parseArgs(argv ?? []);
  if (opts.help) {
    out(
      [
        "skill-utilization-scan.mjs — Skill utilization audit",
        "",
        "Flags:",
        "  --json                 emit machine JSON to stdout (no MD write)",
        "  --window-days N        window for stale classification (default 30)",
        "  --frozen-time ISO      freeze 'now' for deterministic output",
        "  --registry <path>      override SKILL_QUALITY_REGISTRY.json path",
        "  --lint <path>          override skill-lint-report.json path",
        "  --out-md <path>        override SKILL_UTILIZATION_REPORT.md path",
        "  --out-json <path>      override SKILL_UTILIZATION_REPORT.json path",
        "  -h, --help             print help and exit",
      ].join("\n"),
    );
    return { exitCode: 0 };
  }

  const registryPath = abs(repo, opts.registryPath ?? DEFAULT_REGISTRY_REL);
  const lintPath = abs(repo, opts.lintPath ?? DEFAULT_LINT_REL);
  const outMd = abs(repo, opts.outMd ?? DEFAULT_OUT_MD_REL);
  const outJson = abs(repo, opts.outJson ?? DEFAULT_OUT_JSON_REL);
  const nowIso = opts.frozenTime ?? new Date().toISOString();

  const regRes = readJsonSafe(registryPath);
  if (!regRes.ok) {
    err(`[H2] FATAL: cannot read ${registryPath} — ${regRes.error?.message ?? regRes.error}`);
    return { exitCode: 1 };
  }
  const registry = regRes.value;
  const skills = Array.isArray(registry?.skills) ? registry.skills : [];

  const lintRes = readJsonSafe(lintPath);
  const lintReport = lintRes.ok ? lintRes.value : null;

  const classifiedSkills = [];
  for (const s of skills) {
    if (!s || typeof s.name !== "string") continue;
    const mtimeIso = s.path ? getMtimeIso(s.path) : null;
    classifiedSkills.push(
      classifySkill({
        skill: s,
        mtimeIso,
        nowIso,
        windowDays: opts.windowDays,
      }),
    );
  }

  const report = buildReport({
    classifiedSkills,
    registry,
    lintReport,
    nowIso,
    windowDays: opts.windowDays,
  });

  if (opts.json) {
    out(JSON.stringify(report, null, 2));
    return { exitCode: 0, report };
  }

  writeAtomic(outJson, JSON.stringify(report, null, 2) + "\n");
  writeAtomic(outMd, renderMarkdown(report));

  out(
    `[H2] skill utilization — ${report.totals.skills} skills, ${report.counts.active} active, ` +
      `${report.proposedArchive.length} proposed archive ` +
      `(${report.counts.stale_30d} telemetry-zero + ${report.counts.unknown_stale} mtime-proxy), ` +
      `${report.totals.missingFromDisk} missing-from-disk`,
  );
  if (report.totals.telemetryAvailable === 0) {
    out(`[H2] NOTE: invocation_count_30d telemetry not yet populated — proxy-based proposals only`);
  }

  return { exitCode: 0, report };
}

const invokedAsScript = (() => {
  try {
    const argv1 = process.argv[1];
    if (!argv1) return false;
    return resolve(argv1) === resolve(__filename);
  } catch (_) {
    return false;
  }
})();

if (invokedAsScript) {
  main({ argv: process.argv.slice(2) }).then(
    (r) => process.exit(r.exitCode),
    (e) => {
      console.error("[H2] uncaught:", e);
      process.exit(1);
    },
  );
}

export const _internals = {
  DEFAULT_WINDOW_DAYS,
};
