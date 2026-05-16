#!/usr/bin/env node
/**
 * build-state-snapshot.mjs
 *
 * Permanent-memory generator for "what's the state of PRISM right now?"
 * Auto-fed by SessionStart and the build-state-inject UserPromptSubmit
 * hook. Replaces ad-hoc derivation in every chat.
 *
 * Four dimensions answered:
 *   1. BUILT          — engines on disk that ARE wired and have wiki entries
 *   2. NEEDS_WIRING   — engines on disk WITHOUT a dispatcher reference
 *   3. NEEDS_BUILDING — units in milestone envelopes NOT yet in git
 *   4. NEEDS_FRONTEND — codex frontend builds awaiting merge into main web
 *
 * Inputs (all already exist on disk — this script only joins them):
 *   - state/shared/UNWIRED-ENGINE-AUDIT-*.json   (audit-unwired-engines.mjs)
 *   - state/shared/MILESTONE_PROGRESS.json       (build-milestone-progress.mjs)
 *   - knowledge/wiki/index.md                    (wiki-bootstrap.mjs)
 *   - mcp-server/web/, cqask/ui, mcp-cadquery/frontend  (frontend trees)
 *
 * Outputs:
 *   - state/shared/BUILD_STATE.json    — machine-readable, token-bounded
 *   - state/shared/BUILD_STATE.md      — human summary
 *
 * Token budget: BUILD_STATE.json kept under 32 KB so the inject hook
 * can ship a one-screen summary derived from it. The MD is for humans.
 *
 * Re-run: idempotent. Safe to chain into any commit hook.
 */

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync, statSync, readdirSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderHtmlPage,
  HTML_REPORT_SCHEMA_VERSION,
} from "./lib/html-report-render.mjs";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const STATE_DIR = resolve(REPO_ROOT, "state/shared");
const OUT_JSON = resolve(STATE_DIR, "BUILD_STATE.json");
const OUT_MD = resolve(STATE_DIR, "BUILD_STATE.md");
const OUT_HTML = resolve(STATE_DIR, "BUILD_STATE.html");

// OBSIDIAN-INTELLIGENCE-MS3/C1: --html flag emits an HTML sibling.
// Strictly additive — JSON + MD continue to write unconditionally.
const CLI_ARGS = new Set(process.argv.slice(2));
const FLAGS = {
  html: CLI_ARGS.has("--html"),
};

// Frontend tree manifest. The two codex builds the user flagged for merge
// are listed first; main is the canonical target.
const FRONTEND_TREES = [
  {
    id: "main-web",
    path: "mcp-server/web",
    role: "canonical",
    stack: "React + Vite",
    merge_status: "merged",
    notes: "Default frontend. CAM/SFC/quote screens live here.",
  },
  {
    id: "cqask-orion-cad",
    path: "cqask/ui",
    role: "codex-build-pending-merge",
    stack: "Next.js 13 + Ant Design + Tailwind",
    merge_status: "PENDING_MERGE",
    notes:
      "CAD-via-LLM UI ('orion-cad'). Generates CadQuery models from natural language. Routes are in pages/ — needs port to mcp-server/web/ App Router or kept as standalone subapp.",
  },
  {
    id: "mcp-cadquery-frontend",
    path: "mcp-cadquery/frontend",
    role: "codex-build-pending-merge",
    stack: "Vite + React 19 + Three.js (@react-three/fiber)",
    merge_status: "PENDING_MERGE",
    notes:
      "3D CAD viewer for CadQuery output. React 19 (newer than main). Embeds via @react-three/fiber. Needs version-align with main React 18 OR sandbox iframe.",
  },
];

async function loadJSON(path, fallback = null) {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function findLatestUnwiredAudit() {
  const files = await readdir(STATE_DIR).catch(() => []);
  const candidates = files
    .filter((f) => /^UNWIRED-ENGINE-AUDIT-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  if (candidates.length === 0) return null;
  const path = join(STATE_DIR, candidates[candidates.length - 1]);
  return { path, json: await loadJSON(path) };
}

async function loadMilestoneProgress() {
  return loadJSON(join(STATE_DIR, "MILESTONE_PROGRESS.json"));
}

async function loadWikiTitles() {
  // Lightweight: only count [[entries]]. Full body parse is wiki's job.
  try {
    const raw = await readFile(
      join(REPO_ROOT, "knowledge/wiki/index.md"),
      "utf8",
    );
    const matches = raw.match(/\[\[[^\]]+\]\]/g) ?? [];
    const set = new Set(matches.map((m) => m.slice(2, -2).trim()));
    return set;
  } catch {
    return new Set();
  }
}

async function frontendStat(rel) {
  const abs = resolve(REPO_ROOT, rel);
  if (!existsSync(abs)) return { exists: false };
  try {
    const s = await stat(abs);
    return { exists: true, mtime: s.mtimeMs };
  } catch {
    return { exists: false };
  }
}

function bucketUnwired(audit) {
  // audit-unwired-engines.mjs schema: { counts, unwiredEngines: [{ engine, mtime, size_kb, suggestedDispatcher }, ...] }
  if (!audit?.unwiredEngines) return [];
  return audit.unwiredEngines.map((e) => ({
    name: e.engine || e.name || "?",
    suggestedDispatcher: e.suggestedDispatcher ?? null,
    mtime: e.mtime ?? null,
    sizeKB: e.size_kb ?? null,
  }));
}

function topPendingUnits(milestoneProgress, n = 20) {
  if (!milestoneProgress?.milestones) return [];
  // Pick milestones with ≥1 shipped unit (active) but pending units left.
  const active = milestoneProgress.milestones.filter(
    (m) => m.shipped > 0 && m.pending > 0,
  );
  active.sort(
    (a, b) =>
      (b.lastShippedDate || "").localeCompare(a.lastShippedDate || "") ||
      b.pending - a.pending,
  );
  const rows = [];
  for (const m of active.slice(0, 10)) {
    const pendingUnits = (m.units || []).filter((u) => !u.shipped);
    for (const u of pendingUnits.slice(0, 4)) {
      rows.push({
        milestone: m.id,
        unit: u.id,
        title: u.title,
        phase: u.phase,
      });
      if (rows.length >= n) return rows;
    }
  }
  return rows;
}

function domainOf(engineName) {
  // First Capitalized run, e.g., "LatheBayesian..." → "Lathe".
  const m = engineName.match(/^([A-Z][a-z]+)/);
  return m ? m[1] : "Other";
}

function categorizeUnwiredByDomain(unwired) {
  // Group by leading prefix of engine name to make the wire backlog
  // actionable: a planner sees "98 lathe engines unwired" and knows
  // which domain to staff.
  const buckets = new Map();
  for (const e of unwired) {
    const prefix = domainOf(e.name);
    buckets.set(prefix, (buckets.get(prefix) ?? 0) + 1);
  }
  const rows = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  return rows.slice(0, 25).map(([domain, count]) => ({ domain, count }));
}

/**
 * Per-domain coverage table. For each domain prefix, count engines on
 * disk (from the audit's `counts.totalCanonicalEngines` distribution
 * via the unwired list and enginesIndex) and how many are wired.
 *
 * Total-on-disk for a domain = wired + unwired in that domain. The
 * audit doesn't list wired engines, so we approximate: every engine
 * that ISN'T in the unwired list is treated as wired or wire-exempt.
 * For per-domain wired counts we walk the engines/ folder names and
 * subtract the unwired set.
 */
async function computeCoverageByDomain(unwired, totalEngines, enginesDir) {
  const unwiredNames = new Set(unwired.map((e) => e.name));
  let allEngineFiles = [];
  try {
    allEngineFiles = await readdir(enginesDir);
  } catch {
    /* fall through with empty list */
  }
  const enginesByDomain = new Map();
  for (const file of allEngineFiles) {
    if (!file.endsWith(".ts")) continue;
    const name = file.slice(0, -3);
    const domain = domainOf(name);
    if (!enginesByDomain.has(domain)) {
      enginesByDomain.set(domain, { total: 0, wired: 0, unwired: 0, sample: [] });
    }
    const bucket = enginesByDomain.get(domain);
    bucket.total++;
    const isUnwired = unwiredNames.has(name);
    if (isUnwired) {
      bucket.unwired++;
      if (bucket.sample.length < 6) bucket.sample.push(name);
    } else {
      bucket.wired++;
    }
  }
  const rows = [...enginesByDomain.entries()]
    .map(([domain, b]) => ({
      domain,
      total: b.total,
      wired: b.wired,
      unwired: b.unwired,
      coverage_pct: b.total > 0 ? Math.round((b.wired / b.total) * 100) : 0,
      sample_unwired: b.sample,
    }))
    .sort((a, b) => b.unwired - a.unwired || b.total - a.total);
  return rows;
}

/**
 * Stale milestones: any milestone with `pending > 0` whose
 * `lastShippedDate` is older than STALE_AGE_DAYS (default 30) — or
 * whose `shipped === 0` and the envelope claims `not_started` (never
 * picked up). These are abandoned-roadmap candidates.
 */
const STALE_AGE_DAYS = 30;

function computeStaleMilestones(ms) {
  if (!ms?.milestones) return [];
  const now = Date.now();
  const cutoff = now - STALE_AGE_DAYS * 24 * 3600 * 1000;
  const stale = [];
  for (const m of ms.milestones) {
    if (m.total === 0) continue; // no units defined; not stale, just empty
    if (m.pending === 0) continue; // fully shipped
    let reason;
    if (m.shipped === 0 && m.claimedStatus === "not_started") {
      reason = "never_started";
    } else if (m.lastShippedDate) {
      const t = Date.parse(m.lastShippedDate);
      if (!Number.isNaN(t) && t < cutoff) {
        reason = `last_shipped_${Math.round((now - t) / (24 * 3600 * 1000))}d_ago`;
      }
    }
    if (reason) {
      stale.push({
        id: m.id,
        track: m.track,
        pending: m.pending,
        shipped: m.shipped,
        total: m.total,
        lastShippedDate: m.lastShippedDate || null,
        reason,
      });
    }
  }
  // Most-stale first: prefer never-started, then largest backlog.
  stale.sort(
    (a, b) =>
      (a.reason === "never_started" ? -1 : 1) -
        (b.reason === "never_started" ? -1 : 1) ||
      b.pending - a.pending,
  );
  return stale;
}

/**
 * Wiki cross-ref: for every engine in the unwired sample, attach the
 * matching wiki entry name (so `[[<wiki-title>]]` resolves directly).
 */
function attachWikiCrossRefs(samples, wikiTitles) {
  return samples.map((s) => {
    // Wiki entries are typically the engine name without the "Engine"
    // suffix (e.g., "AdaptiveFeedModulation" for "AdaptiveFeedModulationEngine").
    const stripped = s.name.replace(/Engine$/, "");
    const has = wikiTitles.has(stripped);
    return { ...s, wikiTitle: has ? stripped : null };
  });
}

// Atomic write — tmp + rename prevents byte-interleaved partial reads when
// 6 concurrent Claude chats all trigger build-state-inject on SessionStart.
function atomicWriteFileSync(targetPath, contents) {
  const tmp = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(tmp, contents, "utf8");
    renameSync(tmp, targetPath);
  } catch (err) {
    try { unlinkSync(tmp); } catch { /* tmp may not exist */ }
    throw err;
  }
}

// Chain-regen: if a dependency's output is older than this, fire its
// generator before reading. Keeps the snapshot honest across SessionStart
// fires of build-state-inject without needing a separate daily cron.
const DEPENDENCY_STALENESS_HOURS = 24;

function ageHours(p) {
  if (!existsSync(p)) return Infinity;
  return (Date.now() - statSync(p).mtimeMs) / (1000 * 60 * 60);
}

function spawnRegen(label, script, timeoutMs = 120_000) {
  process.stderr.write(`[build-state] regenerating ${label}\n`);
  const node = process.execPath || "node";
  const r = spawnSync(node, [script], { timeout: timeoutMs, stdio: "ignore" });
  if (r.status !== 0) {
    process.stderr.write(`[build-state] WARN ${label} regen exited ${r.status}\n`);
  }
}

function refreshDependenciesIfStale() {
  // Milestone progress.
  const msPath = join(STATE_DIR, "MILESTONE_PROGRESS.json");
  if (ageHours(msPath) > DEPENDENCY_STALENESS_HOURS) {
    spawnRegen("MILESTONE_PROGRESS", join(REPO_ROOT, "scripts/build-milestone-progress.mjs"));
  }
  // Unwired-audit (find latest dated file; if oldest of all candidates is
  // stale, regenerate).
  try {
    const files = readdirSync(STATE_DIR).filter((f) =>
      /^UNWIRED-ENGINE-AUDIT-\d{4}-\d{2}-\d{2}\.json$/.test(f),
    );
    const latest = files.sort().slice(-1)[0];
    const latestAge = latest ? ageHours(join(STATE_DIR, latest)) : Infinity;
    if (latestAge > DEPENDENCY_STALENESS_HOURS) {
      spawnRegen("UNWIRED-ENGINE-AUDIT", join(REPO_ROOT, "scripts/audit-unwired-engines.mjs"), 180_000);
    }
  } catch {
    // No problem — best-effort.
  }
}

async function main() {
  refreshDependenciesIfStale();

  const audit = await findLatestUnwiredAudit();
  const ms = await loadMilestoneProgress();
  const wikiTitles = await loadWikiTitles();

  const unwired = bucketUnwired(audit?.json);

  // Frontend tree freshness.
  const frontends = await Promise.all(
    FRONTEND_TREES.map(async (ft) => ({
      ...ft,
      ...(await frontendStat(ft.path)),
    })),
  );

  // audit-unwired-engines.mjs schema: { counts: { totalCanonicalEngines, "WIRED-DIRECT", UNWIRED, "WIRED-VIA-ORCH", "WIRE-EXEMPT", ...} }
  const c = audit?.json?.counts ?? {};
  const stat = audit?.json
    ? {
        totalEngines: c.totalCanonicalEngines ?? 0,
        unwired: c.UNWIRED ?? unwired.length,
        wiredDirect: c["WIRED-DIRECT"] ?? 0,
        wireExempt: c["WIRE-EXEMPT"] ?? 0,
        wiredViaHook: c["WIRED-VIA-HOOK"] ?? 0,
        wiredViaOrch: c["WIRED-VIA-ORCH"] ?? 0,
        wiredViaRoute: c["WIRED-VIA-ROUTE"] ?? 0,
        wiredViaSingleton: c["WIRED-VIA-SINGLETON"] ?? 0,
      }
    : { totalEngines: 0, unwired: unwired.length };

  const built = stat.totalEngines - stat.unwired;
  const topPending = topPendingUnits(ms, 24);
  const wireDomains = categorizeUnwiredByDomain(unwired);

  const enginesDir = resolve(REPO_ROOT, "mcp-server/src/engines");
  const coverageByDomain = await computeCoverageByDomain(
    unwired,
    stat.totalEngines,
    enginesDir,
  );
  const staleMilestones = computeStaleMilestones(ms);
  const sampleUnwired = attachWikiCrossRefs(unwired.slice(0, 25), wikiTitles);

  const out = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),

    headline: {
      built_engines: built,
      built_with_wiki: wikiTitles.size,
      needs_wiring: stat.unwired,
      needs_building_active_units: ms?.totals?.pending ?? 0,
      needs_frontend_merge_count: frontends.filter(
        (f) => f.merge_status === "PENDING_MERGE",
      ).length,
      pending_milestones_with_activity:
        ms?.milestones?.filter?.((m) => m.pending > 0 && m.shipped > 0).length ??
        0,
      drift_milestones:
        ms?.milestones?.filter?.(
          (m) => m.drift && m.drift !== "consistent" && m.drift !== "n/a",
        ).length ?? 0,
      stale_milestones: staleMilestones.length,
      domains_tracked: coverageByDomain.length,
    },

    sources: {
      unwired_audit: audit?.path ?? null,
      milestone_progress: join(STATE_DIR, "MILESTONE_PROGRESS.json"),
      wiki_index: join(REPO_ROOT, "knowledge/wiki/index.md"),
      engines_index: join(REPO_ROOT, "mcp-server/data/state/ENGINES_INDEX.json"),
    },

    BUILT: {
      summary: `${built}/${stat.totalEngines} engines wired (${stat.totalEngines > 0 ? Math.round((built / stat.totalEngines) * 100) : 0}%); ${wikiTitles.size} wiki entries indexed.`,
      breakdown: stat,
    },

    NEEDS_WIRING: {
      summary: `${stat.unwired} engines on disk with no dispatcher reference. Top domains by count:`,
      top_domains: wireDomains,
      sample_engines: sampleUnwired,
      next_action:
        "Pick a top-domain bucket; wire to the matching dispatcher in batches of 5–6 engines (see U-WIRE-LATHE-BATCHN pattern). Wiki cross-refs in `wikiTitle` resolve via `/wiki-query <name>`.",
    },

    COVERAGE_BY_DOMAIN: {
      summary: `Per-domain wired/unwired breakdown across ${coverageByDomain.length} domain prefixes.`,
      rows: coverageByDomain,
    },

    STALE_MILESTONES: {
      summary: `${staleMilestones.length} milestones flagged as stale (pending > 0 AND last shipped > ${STALE_AGE_DAYS}d ago, OR never started).`,
      threshold_days: STALE_AGE_DAYS,
      rows: staleMilestones.slice(0, 40),
      next_action:
        "Review with planner; either pick up the next unit, sunset the milestone, or update its envelope status. /envelope-sync handles status drift.",
    },

    NEEDS_BUILDING: {
      summary: `${ms?.totals?.pending ?? 0} units across ${ms?.totals?.milestones ?? 0} milestones not yet in git.`,
      drift_cases:
        ms?.milestones
          ?.filter?.(
            (m) => m.drift && m.drift !== "consistent" && m.drift !== "n/a",
          )
          ?.map?.((m) => ({
            id: m.id,
            claimed: m.claimedStatus,
            real: m.derivedStatus,
            drift: m.drift,
          })) ?? [],
      top_pending_units: topPending,
      next_action:
        "Cross-reference MILESTONE_PROGRESS.json. Avoid units already in `shipped` arrays — those are committed but envelope status is stale.",
    },

    NEEDS_FRONTEND: {
      summary: `${frontends.filter((f) => f.merge_status === "PENDING_MERGE").length} codex frontend build(s) pending merge into ${frontends.find((f) => f.role === "canonical")?.path ?? "main web"}.`,
      trees: frontends,
      next_action:
        "Decide per build: (a) port to mcp-server/web App Router, (b) keep as standalone subapp under /apps/ with shared auth, or (c) deprecate. Two builds use different React majors (18 vs 19) — version align before merge.",
    },
  };

  atomicWriteFileSync(OUT_JSON, JSON.stringify(out, null, 2) + "\n");
  atomicWriteFileSync(OUT_MD, renderMD(out));

  if (FLAGS.html) {
    atomicWriteFileSync(OUT_HTML, renderHtml(out));
    process.stderr.write(`[build-state] wrote ${OUT_HTML}\n`);
  }

  process.stderr.write(
    `[build-state] wrote ${OUT_JSON}\n[build-state] wrote ${OUT_MD}\n`,
  );
  process.stderr.write(
    `[build-state] BUILT=${built}  NEEDS_WIRING=${stat.unwired}  NEEDS_BUILDING=${out.headline.needs_building_active_units}  NEEDS_FRONTEND=${out.headline.needs_frontend_merge_count}\n`,
  );
}

/**
 * OBSIDIAN-INTELLIGENCE-MS3/C1: render BUILD_STATE.json as an HTML report.
 * Pure function — takes the same `out` object that goes to JSON/MD and
 * produces a standalone HTML5 page via the shared html-report-render lib.
 * Air-gap safe (no CDN); see scripts/lib/html-report-render.mjs.
 */
function renderHtml(out) {
  const sections = [];
  const hl = out.headline || {};

  sections.push({
    kind: "headline",
    cards: [
      { label: "Engines wired", value: String(hl.built_engines ?? 0), status: "ok" },
      { label: "With wiki entry", value: String(hl.built_with_wiki ?? 0), status: "info" },
      { label: "Needs wiring", value: String(hl.needs_wiring ?? 0), status: (hl.needs_wiring ?? 0) > 0 ? "warn" : "ok" },
      { label: "Pending units", value: String(hl.needs_building_active_units ?? 0), status: "info" },
      { label: "Active milestones", value: String(hl.pending_milestones_with_activity ?? 0), status: "info" },
      { label: "Frontend pending", value: String(hl.needs_frontend_merge_count ?? 0), status: (hl.needs_frontend_merge_count ?? 0) > 0 ? "warn" : "ok" },
      { label: "Envelope drift", value: String(hl.drift_milestones ?? 0), status: (hl.drift_milestones ?? 0) > 0 ? "warn" : "ok" },
      { label: "Stale milestones", value: String(hl.stale_milestones ?? 0), status: (hl.stale_milestones ?? 0) > 0 ? "warn" : "ok" },
    ],
  });

  const topDomains = (out.NEEDS_WIRING && Array.isArray(out.NEEDS_WIRING.top_domains))
    ? out.NEEDS_WIRING.top_domains
    : [];
  if (topDomains.length > 0) {
    sections.push({
      kind: "barchart",
      label: "Top unwired engine domains",
      data: topDomains.slice(0, 10).map((d) => ({
        label: d.domain,
        value: Number(d.count) || 0,
        status: "warn",
      })),
    });
  }

  const driftCases = (out.NEEDS_BUILDING && Array.isArray(out.NEEDS_BUILDING.drift_cases))
    ? out.NEEDS_BUILDING.drift_cases
    : [];
  if (driftCases.length > 0) {
    sections.push({
      kind: "table",
      caption: "Envelope-status drift (claim vs git)",
      headers: ["Milestone", "Claimed", "Real", "Drift"],
      rows: driftCases.map((d) => [
        d.id,
        d.claimed,
        { value: d.real, status: "warn" },
        { value: d.drift, status: "fail" },
      ]),
    });
  }

  const frontends = (out.NEEDS_FRONTEND && Array.isArray(out.NEEDS_FRONTEND.trees))
    ? out.NEEDS_FRONTEND.trees
    : [];
  if (frontends.length > 0) {
    sections.push({
      kind: "table",
      caption: "Frontend trees",
      headers: ["ID", "Path", "Stack", "Status"],
      rows: frontends.map((f) => [
        f.id,
        f.path,
        f.stack,
        { value: f.merge_status, status: f.merge_status === "merged" ? "ok" : "warn" },
      ]),
    });
  }

  const coverage = (out.COVERAGE_BY_DOMAIN && Array.isArray(out.COVERAGE_BY_DOMAIN.rows))
    ? out.COVERAGE_BY_DOMAIN.rows
    : [];
  if (coverage.length > 0) {
    sections.push({
      kind: "table",
      caption: `Coverage by domain (top 15 of ${coverage.length})`,
      headers: ["Domain", "Total", "Wired", "Unwired", "Coverage %"],
      rows: coverage.slice(0, 15).map((r) => [
        r.domain,
        { value: String(r.total), right: true },
        { value: String(r.wired), right: true, status: "ok" },
        { value: String(r.unwired), right: true, status: r.unwired > 0 ? "warn" : "ok" },
        { value: `${r.coverage_pct}%`, right: true, status: r.coverage_pct >= 80 ? "ok" : r.coverage_pct >= 50 ? "warn" : "fail" },
      ]),
    });
  }

  const staleRows = (out.STALE_MILESTONES && Array.isArray(out.STALE_MILESTONES.rows))
    ? out.STALE_MILESTONES.rows
    : [];
  if (staleRows.length > 0) {
    sections.push({
      kind: "table",
      caption: `Stale milestones (top 15 of ${staleRows.length})`,
      headers: ["Milestone", "Track", "Reason", "Pending", "Shipped/Total", "Last shipped"],
      rows: staleRows.slice(0, 15).map((r) => [
        r.id,
        r.track || "—",
        r.reason,
        { value: String(r.pending), right: true },
        `${r.shipped}/${r.total}`,
        (r.lastShippedDate || "never").slice(0, 10),
      ]),
    });
  }

  const topPending = (out.NEEDS_BUILDING && Array.isArray(out.NEEDS_BUILDING.top_pending_units))
    ? out.NEEDS_BUILDING.top_pending_units
    : [];
  if (topPending.length > 0) {
    sections.push({
      kind: "table",
      caption: `Top pending units (most-recently-active milestones first, top 15 of ${topPending.length})`,
      headers: ["Milestone", "Phase", "Unit", "Title"],
      rows: topPending.slice(0, 15).map((u) => [u.milestone, u.phase, u.unit, u.title]),
    });
  }

  return renderHtmlPage({
    title: "PRISM — BUILD_STATE",
    subtitle: "What's built / wiring / pending / frontend",
    generatedAt: out.generatedAt,
    sections,
    note: `Source JSON: state/shared/BUILD_STATE.json · render schema ${HTML_REPORT_SCHEMA_VERSION}`,
  });
}

function renderMD(out) {
  const lines = [];
  lines.push("# BUILD_STATE — what's built / what needs wiring / what's pending / what's awaiting frontend merge");
  lines.push("");
  lines.push(`> Generated: ${out.generatedAt}`);
  lines.push(`> Source: \`scripts/build-state-snapshot.mjs\` — read \`BUILD_STATE.json\` for the machine-queryable form.`);
  lines.push("");

  lines.push("## At a glance");
  lines.push("");
  lines.push(`- **${out.headline.built_engines}** engines built and wired (of ${out.BUILT.breakdown.totalEngines})`);
  lines.push(`- **${out.headline.built_with_wiki}** wiki entries indexed`);
  lines.push(`- **${out.headline.needs_wiring}** engines awaiting dispatcher wiring`);
  lines.push(`- **${out.headline.needs_building_active_units}** units pending across ${out.headline.pending_milestones_with_activity} active milestones`);
  lines.push(`- **${out.headline.needs_frontend_merge_count}** codex frontend builds awaiting merge`);
  lines.push(`- **${out.headline.drift_milestones}** milestones with envelope-status drift`);
  lines.push("");

  lines.push("## BUILT");
  lines.push("");
  lines.push(out.BUILT.summary);
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(out.BUILT.breakdown, null, 2));
  lines.push("```");
  lines.push("");

  lines.push("## NEEDS_WIRING");
  lines.push("");
  lines.push(out.NEEDS_WIRING.summary);
  lines.push("");
  lines.push("| Domain | Unwired count |");
  lines.push("|--------|---------------|");
  for (const d of out.NEEDS_WIRING.top_domains) {
    lines.push(`| ${d.domain} | ${d.count} |`);
  }
  lines.push("");
  lines.push(`**Next action:** ${out.NEEDS_WIRING.next_action}`);
  lines.push("");

  lines.push("## NEEDS_BUILDING");
  lines.push("");
  lines.push(out.NEEDS_BUILDING.summary);
  lines.push("");
  if (out.NEEDS_BUILDING.drift_cases.length) {
    lines.push("### Envelope-status drift");
    lines.push("");
    lines.push("| Milestone | Envelope says | Git says | Drift |");
    lines.push("|-----------|---------------|----------|-------|");
    for (const d of out.NEEDS_BUILDING.drift_cases) {
      lines.push(`| ${d.id} | ${d.claimed} | ${d.real} | ${d.drift} |`);
    }
    lines.push("");
  }
  lines.push("### Top pending units (most-recently-active milestones first)");
  lines.push("");
  lines.push("| Milestone | Phase | Unit | Title |");
  lines.push("|-----------|-------|------|-------|");
  for (const u of out.NEEDS_BUILDING.top_pending_units) {
    lines.push(`| ${u.milestone} | ${u.phase} | ${u.unit} | ${u.title} |`);
  }
  lines.push("");
  lines.push(`**Next action:** ${out.NEEDS_BUILDING.next_action}`);
  lines.push("");

  lines.push("## NEEDS_FRONTEND");
  lines.push("");
  lines.push(out.NEEDS_FRONTEND.summary);
  lines.push("");
  lines.push("| ID | Path | Stack | Status | Notes |");
  lines.push("|----|------|-------|--------|-------|");
  for (const f of out.NEEDS_FRONTEND.trees) {
    lines.push(`| ${f.id} | \`${f.path}\` | ${f.stack} | **${f.merge_status}** | ${f.notes} |`);
  }
  lines.push("");
  lines.push(`**Next action:** ${out.NEEDS_FRONTEND.next_action}`);
  lines.push("");

  lines.push("## COVERAGE_BY_DOMAIN");
  lines.push("");
  lines.push(out.COVERAGE_BY_DOMAIN.summary);
  lines.push("");
  lines.push("| Domain | Total | Wired | Unwired | Coverage % |");
  lines.push("|--------|-------|-------|---------|-----------|");
  for (const r of out.COVERAGE_BY_DOMAIN.rows.slice(0, 30)) {
    lines.push(`| ${r.domain} | ${r.total} | ${r.wired} | ${r.unwired} | ${r.coverage_pct}% |`);
  }
  lines.push("");

  lines.push("## STALE_MILESTONES");
  lines.push("");
  lines.push(out.STALE_MILESTONES.summary);
  lines.push("");
  if (out.STALE_MILESTONES.rows.length === 0) {
    lines.push("_No stale milestones detected._");
  } else {
    lines.push("| Milestone | Track | Reason | Pending | Shipped/Total | Last shipped |");
    lines.push("|-----------|-------|--------|---------|---------------|--------------|");
    for (const r of out.STALE_MILESTONES.rows.slice(0, 30)) {
      lines.push(`| ${r.id} | ${r.track || "—"} | ${r.reason} | ${r.pending} | ${r.shipped}/${r.total} | ${(r.lastShippedDate || "never").slice(0, 10)} |`);
    }
  }
  lines.push("");
  lines.push(`**Next action:** ${out.STALE_MILESTONES.next_action}`);
  lines.push("");

  lines.push("## How sessions consume this");
  lines.push("");
  lines.push("- The `build-state-inject` UserPromptSubmit hook reads `BUILD_STATE.json` and emits a ≤500-token summary on every prompt.");
  lines.push("- The `/build-state` skill prints this MD in full and offers drill-down.");
  lines.push("- Audit chats subtract `MILESTONE_PROGRESS.json:milestones[].units[].shipped` from their gap lists before flagging missing.");
  lines.push("- Wiki entries answer per-engine \"what does it do?\" — query `/wiki-query <name>`.");
  lines.push("");

  return lines.join("\n");
}

main().catch((err) => {
  process.stderr.write(`[build-state] FAILED: ${err.stack || err.message}\n`);
  process.exit(1);
});
