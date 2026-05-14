#!/usr/bin/env node
/**
 * hook-orphan-scan.mjs — Hook utilization audit
 *   (CLEANUP-MS0 / U-CLEANUP-H3)
 *
 * Daily 05:31 cron sweep over the 470-hook manifest at
 * state/shared/HOOK_REGISTRY.json, cross-referenced with two telemetry
 * streams (H4 envelope latency + H7 async dispatcher results):
 *   - 30-day-dormant: registered hooks that haven't fired in window
 *   - orphan files:   .mjs files registered but `wired: false`
 *   - tier-mismatch:  T0-claimed hooks that never `decision:"block"`
 *   - sloppy registry: hooks with no event binding / no tier tag
 *
 * Telemetry sources are OPTIONAL — when hook-latency.jsonl /
 * async-hook-results.jsonl are absent, dormant detection degrades to
 * "no telemetry available" notes; orphan detection still works because
 * it's a pure registry-state signal.
 *
 * Outputs:
 *   - state/shared/HOOK_UTILIZATION_REPORT.md  (human dashboard)
 *   - state/shared/HOOK_UTILIZATION_REPORT.json (machine; schemaVersion 1)
 *
 * Advisory only — never auto-disables hooks or rewrites settings.json.
 * Operator reviews and prunes via /hook-disable + settings.json edit.
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-H3.
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

const DEFAULT_REGISTRY_REL = "state/shared/HOOK_REGISTRY.json";
const DEFAULT_LATENCY_REL = "state/shared/hook-latency.jsonl";
const DEFAULT_ASYNC_REL = "state/shared/async-hook-results.jsonl";
const DEFAULT_OUT_MD_REL = "state/shared/HOOK_UTILIZATION_REPORT.md";
const DEFAULT_OUT_JSON_REL = "state/shared/HOOK_UTILIZATION_REPORT.json";

const DEFAULT_WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Tier semantics — match the H3 classifier-output frontmatter.
const T0 = "T0";

/**
 * Issue codes — exported so the dashboard + tests can reference them
 * symbolically rather than by string literal.
 */
export const ISSUE = Object.freeze({
  ORPHAN_FILE: "orphan_file", // wired: false → registered but not invoked
  DORMANT_30D: "dormant_30d", // no firings in window
  TIER_MISMATCH: "tier_mismatch", // T0 claimed but never blocked
  MISSING_TIER: "missing_tier", // tier frontmatter absent
  MISSING_EVENT: "missing_event", // wired but no events listed
  NO_TELEMETRY: "no_telemetry", // wired + telemetry source absent
});

/**
 * Parse CLI args.
 *
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  const opts = {
    json: false,
    help: false,
    frozenTime: null,
    windowDays: DEFAULT_WINDOW_DAYS,
    registryPath: null,
    latencyPath: null,
    asyncPath: null,
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
    else if (a === "--latency") opts.latencyPath = argv[++i] ?? null;
    else if (a === "--async") opts.asyncPath = argv[++i] ?? null;
    else if (a === "--out-md") opts.outMd = argv[++i] ?? null;
    else if (a === "--out-json") opts.outJson = argv[++i] ?? null;
  }
  return opts;
}

/**
 * Parse a JSONL file, returning the array of parsed objects.
 * Malformed lines are silently skipped (telemetry should never crash
 * the audit).
 *
 * @param {string} contents - the raw JSONL text
 * @returns {Array<object>}
 */
export function parseJsonl(contents) {
  if (typeof contents !== "string" || contents.length === 0) return [];
  const out = [];
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch (_) {
      /* skip malformed line */
    }
  }
  return out;
}

/**
 * Aggregate JSONL entries into a `{ hookId: { lastFiredMs, fireCount, blockCount } }` map.
 *
 * The two JSONL formats:
 *   - hook-latency.jsonl: { ts, hook, durationMs, exitCode, signal }
 *   - async-hook-results.jsonl: { jobId, hook, status, exitCode, ts }
 *
 * Both name the hook in `.hook`. Latency rows use `ts` as ISO; async rows
 * also use `ts` as ISO. Tolerant of either; if neither, the entry is dropped.
 *
 * "Block decision" detection: exit code != 0 on a PreToolUse/Stop hook
 * is treated as a block. We can't perfectly know from telemetry which
 * event a hook fired on, so we surface exit-code-nonzero as the proxy.
 *
 * @param {Array<object>} latencyEntries
 * @param {Array<object>} asyncEntries
 * @param {number} windowStartMs
 */
export function buildFiringMap({ latencyEntries, asyncEntries, windowStartMs }) {
  const map = new Map();
  function bump(hookId, ts, exitCode) {
    if (!hookId || typeof hookId !== "string") return;
    const t = Number.isFinite(ts) ? ts : Number.isFinite(Date.parse(ts)) ? Date.parse(ts) : null;
    if (t === null || t < windowStartMs) return;
    let row = map.get(hookId);
    if (!row) {
      row = { lastFiredMs: 0, fireCount: 0, blockCount: 0 };
      map.set(hookId, row);
    }
    row.fireCount += 1;
    if (t > row.lastFiredMs) row.lastFiredMs = t;
    if (Number.isFinite(exitCode) && exitCode !== 0) row.blockCount += 1;
  }

  for (const e of latencyEntries) {
    if (!e || typeof e !== "object") continue;
    bump(canonicalHookId(e.hook), e.ts, e.exitCode);
  }
  for (const e of asyncEntries) {
    if (!e || typeof e !== "object") continue;
    bump(canonicalHookId(e.hook), e.ts, e.exitCode);
  }

  return map;
}

/**
 * Normalize hook identifier — strip directory prefix + .mjs suffix so
 * `H:/prism/.claude/hooks/foo.mjs` and `.claude/hooks/foo.mjs` and
 * `foo` all resolve to `foo`.
 *
 * @param {string|undefined|null} raw
 * @returns {string|null}
 */
export function canonicalHookId(raw) {
  if (typeof raw !== "string" || raw.length === 0) return null;
  const slashIdx = Math.max(raw.lastIndexOf("/"), raw.lastIndexOf("\\"));
  let base = slashIdx >= 0 ? raw.slice(slashIdx + 1) : raw;
  if (base.endsWith(".mjs")) base = base.slice(0, -4);
  if (base.endsWith(".js")) base = base.slice(0, -3);
  if (base.endsWith(".cjs")) base = base.slice(0, -4);
  return base || null;
}

/**
 * Classify one hook from registry + firing map.
 *
 * @param {object} args
 * @param {object} args.hook            registry entry
 * @param {Map<string, object>} args.firingMap   hookId → { lastFiredMs, fireCount, blockCount }
 * @param {boolean} args.hasTelemetry   true if any telemetry source loaded
 * @param {number} args.windowDays
 * @param {string} args.nowIso
 * @returns {{
 *   id: string,
 *   file: string,
 *   wired: boolean,
 *   tier: string|null,
 *   events: string[],
 *   firings: number,
 *   lastFiredIso: string|null,
 *   ageDays: number|null,
 *   blocks: number,
 *   issues: string[],
 * }}
 */
export function classifyHook({ hook, firingMap, hasTelemetry, windowDays, nowIso }) {
  const id = hook?.id ?? canonicalHookId(hook?.file) ?? "(unnamed)";
  const wired = !!hook?.wired;
  const disabled = !!hook?.disabled;
  const tier = typeof hook?.tier === "string" && hook.tier ? hook.tier : null;
  const events = Array.isArray(hook?.events) ? hook.events.slice() : [];
  const firingRow = firingMap.get(id);
  const firings = firingRow ? firingRow.fireCount : 0;
  const lastFiredMs = firingRow ? firingRow.lastFiredMs : 0;
  const blocks = firingRow ? firingRow.blockCount : 0;

  let lastFiredIso = null;
  let ageDays = null;
  if (lastFiredMs > 0) {
    lastFiredIso = new Date(lastFiredMs).toISOString();
    const nowMs = Date.parse(nowIso);
    if (Number.isFinite(nowMs)) {
      ageDays = Math.max(0, Math.round((nowMs - lastFiredMs) / MS_PER_DAY));
    }
  }

  const issues = [];

  // Orphan file: registered but `wired: false`.
  // Disabled hooks are NOT orphans — operator intentionally disabled them.
  if (!wired && !disabled) {
    issues.push(ISSUE.ORPHAN_FILE);
  }

  // Dormant: WIRED + has telemetry + no firings in window.
  if (wired && hasTelemetry && firings === 0) {
    issues.push(ISSUE.DORMANT_30D);
  }

  // No-telemetry: WIRED + telemetry source absent (can't determine activity).
  if (wired && !hasTelemetry) {
    issues.push(ISSUE.NO_TELEMETRY);
  }

  // Tier mismatch: T0 claimed but never produced a block (exit≠0).
  // Only meaningful when telemetry IS available AND we observed firings.
  if (wired && hasTelemetry && tier === T0 && firings > 0 && blocks === 0) {
    issues.push(ISSUE.TIER_MISMATCH);
  }

  // Sloppy registry — missing-tier or missing-event are real
  // signals that the registry entry isn't fully populated.
  if (!tier) issues.push(ISSUE.MISSING_TIER);
  if (wired && events.length === 0) issues.push(ISSUE.MISSING_EVENT);

  return {
    id,
    file: hook?.file ?? "",
    wired,
    tier,
    events,
    firings,
    lastFiredIso,
    ageDays,
    blocks,
    issues,
  };
}

/**
 * Build the aggregate report.
 *
 * @param {object} args
 */
export function buildReport({
  classifiedHooks,
  registry,
  hasTelemetry,
  windowDays,
  nowIso,
  telemetryCounts,
}) {
  const notes = [];

  if (!hasTelemetry) {
    notes.push(
      "no hook-latency / async-hook-results telemetry present — dormant detection skipped; orphan + tier-frontmatter signals are valid",
    );
  }

  const total = classifiedHooks.length;
  const wired = classifiedHooks.filter((h) => h.wired).length;
  const disabled = classifiedHooks.filter((h) => !h.wired && registry?.hooks?.find?.((r) => (r.id ?? r.file) === h.id)?.disabled).length;
  const orphans = classifiedHooks.filter((h) => h.issues.includes(ISSUE.ORPHAN_FILE));
  const dormant = classifiedHooks.filter((h) => h.issues.includes(ISSUE.DORMANT_30D));
  const tierMismatch = classifiedHooks.filter((h) => h.issues.includes(ISSUE.TIER_MISMATCH));
  const missingTier = classifiedHooks.filter((h) => h.issues.includes(ISSUE.MISSING_TIER));
  const missingEvent = classifiedHooks.filter((h) => h.issues.includes(ISSUE.MISSING_EVENT));

  const issueCounts = {
    orphan_file: orphans.length,
    dormant_30d: dormant.length,
    tier_mismatch: tierMismatch.length,
    missing_tier: missingTier.length,
    missing_event: missingEvent.length,
    no_telemetry: classifiedHooks.filter((h) => h.issues.includes(ISSUE.NO_TELEMETRY)).length,
  };

  // Sort top archive candidates: orphan + missing-event + missing-tier all
  // suggest "this hook may not be doing anything"; sort by issue count desc.
  const topCandidates = classifiedHooks
    .slice()
    .sort((a, b) => b.issues.length - a.issues.length || (a.id || "").localeCompare(b.id || ""));

  return {
    schemaVersion: 1,
    generatedAt: nowIso,
    windowDays,
    hasTelemetry,
    telemetryCounts,
    totals: { hooks: total, wired },
    issueCounts,
    orphans,
    dormant,
    tierMismatch,
    missingTier,
    missingEvent,
    topCandidates,
    notes,
  };
}

/**
 * Render markdown dashboard.
 *
 * @param {ReturnType<typeof buildReport>} report
 */
export function renderMarkdown(report) {
  const lines = [];
  lines.push(`# Hook Utilization Audit`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Window: ${report.windowDays} days`);
  lines.push(
    `Telemetry: ${report.hasTelemetry ? "AVAILABLE" : "ABSENT"} ` +
      `(latency=${report.telemetryCounts.latencyEntries}, async=${report.telemetryCounts.asyncEntries})`,
  );
  lines.push("");
  lines.push(`## Totals`);
  lines.push("");
  lines.push(`- Hooks in registry: **${report.totals.hooks}**`);
  lines.push(`- Wired: **${report.totals.wired}**`);
  lines.push("");
  lines.push(`## Issue counts`);
  lines.push("");
  lines.push(`- 🔴 orphan_file (registered, wired:false): **${report.issueCounts.orphan_file}**`);
  lines.push(`- 🟠 dormant_30d (wired, 0 fires in window): **${report.issueCounts.dormant_30d}**`);
  lines.push(`- 🟡 tier_mismatch (T0, fired but never blocked): **${report.issueCounts.tier_mismatch}**`);
  lines.push(`- ⚪ missing_tier (no tier frontmatter): **${report.issueCounts.missing_tier}**`);
  lines.push(`- ⚪ missing_event (wired but events:[]): **${report.issueCounts.missing_event}**`);
  lines.push(`- ⚫ no_telemetry (wired, no firing data): **${report.issueCounts.no_telemetry}**`);
  lines.push("");

  lines.push(`## Orphan files (wired:false)`);
  lines.push("");
  if (report.orphans.length === 0) {
    lines.push(`_none — every registered hook is wired_`);
  } else {
    lines.push(`> ${report.orphans.length} hook file(s) registered in HOOK_REGISTRY but not invoked from any settings.json layer.`);
    lines.push(`> Top 25 shown (sorted by id).`);
    lines.push("");
    lines.push(`| Hook | File | Tier |`);
    lines.push(`|---|---|---|`);
    for (const h of report.orphans.slice().sort((a, b) => (a.id || "").localeCompare(b.id || "")).slice(0, 25)) {
      lines.push(`| ${h.id} | ${h.file} | ${h.tier ?? "n/a"} |`);
    }
  }
  lines.push("");

  lines.push(`## Dormant hooks (no firings in ${report.windowDays}d)`);
  lines.push("");
  if (!report.hasTelemetry) {
    lines.push(`_telemetry absent — dormant detection skipped_`);
  } else if (report.dormant.length === 0) {
    lines.push(`_no dormant hooks_`);
  } else {
    lines.push(`| Hook | Events | Tier | Last fired |`);
    lines.push(`|---|---|---|---|`);
    for (const h of report.dormant.slice(0, 25)) {
      lines.push(`| ${h.id} | ${h.events.join(", ")} | ${h.tier ?? "n/a"} | ${h.lastFiredIso ?? "(never)"} |`);
    }
  }
  lines.push("");

  lines.push(`## Tier mismatch (T0 claimed, never blocked)`);
  lines.push("");
  if (!report.hasTelemetry) {
    lines.push(`_telemetry absent — tier-mismatch detection skipped_`);
  } else if (report.tierMismatch.length === 0) {
    lines.push(`_no T0 hooks observed without blocks_`);
  } else {
    lines.push(`| Hook | Firings | Blocks |`);
    lines.push(`|---|---:|---:|`);
    for (const h of report.tierMismatch) {
      lines.push(`| ${h.id} | ${h.firings} | ${h.blocks} |`);
    }
  }
  lines.push("");

  if (report.notes.length > 0) {
    lines.push(`## Notes`);
    lines.push("");
    for (const n of report.notes) lines.push(`- ${n}`);
    lines.push("");
  }
  lines.push(`---`);
  lines.push(`Source: CLEANUP-MS0 / U-CLEANUP-H3 hook-orphan-scan.mjs`);
  return lines.join("\n") + "\n";
}

function readTextSafe(path) {
  try {
    return { ok: true, value: readFileSync(path, "utf-8") };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function readJsonSafe(path) {
  const r = readTextSafe(path);
  if (!r.ok) return r;
  try {
    return { ok: true, value: JSON.parse(r.value) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function abs(repo, p) {
  return pathIsAbsolute(p) ? p : resolve(repo, p);
}

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
        /* ignore */
      }
    }
  }
  throw lastErr ?? new Error(`writeAtomic failed for ${dest}`);
}

/**
 * CLI entry.
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
        "hook-orphan-scan.mjs — Hook utilization audit",
        "",
        "Flags:",
        "  --json                 emit machine JSON to stdout (no MD write)",
        "  --window-days N        firing-history window (default 30)",
        "  --frozen-time ISO      freeze 'now' for deterministic output",
        "  --registry <path>      override HOOK_REGISTRY.json path",
        "  --latency <path>       override hook-latency.jsonl path",
        "  --async <path>         override async-hook-results.jsonl path",
        "  --out-md <path>        override HOOK_UTILIZATION_REPORT.md path",
        "  --out-json <path>      override HOOK_UTILIZATION_REPORT.json path",
        "  -h, --help             print help and exit",
      ].join("\n"),
    );
    return { exitCode: 0 };
  }

  const registryPath = abs(repo, opts.registryPath ?? DEFAULT_REGISTRY_REL);
  const latencyPath = abs(repo, opts.latencyPath ?? DEFAULT_LATENCY_REL);
  const asyncPath = abs(repo, opts.asyncPath ?? DEFAULT_ASYNC_REL);
  const outMd = abs(repo, opts.outMd ?? DEFAULT_OUT_MD_REL);
  const outJson = abs(repo, opts.outJson ?? DEFAULT_OUT_JSON_REL);
  const nowIso = opts.frozenTime ?? new Date().toISOString();

  const regRes = readJsonSafe(registryPath);
  if (!regRes.ok) {
    err(`[H3] FATAL: cannot read ${registryPath} — ${regRes.error?.message ?? regRes.error}`);
    return { exitCode: 1 };
  }
  const registry = regRes.value;
  const hooks = Array.isArray(registry?.hooks) ? registry.hooks : [];

  const latRes = readTextSafe(latencyPath);
  const asyncRes = readTextSafe(asyncPath);
  const hasTelemetry = latRes.ok || asyncRes.ok;
  const latencyEntries = latRes.ok ? parseJsonl(latRes.value) : [];
  const asyncEntries = asyncRes.ok ? parseJsonl(asyncRes.value) : [];

  const nowMs = Date.parse(nowIso);
  const windowStartMs = Number.isFinite(nowMs)
    ? nowMs - opts.windowDays * MS_PER_DAY
    : Date.now() - opts.windowDays * MS_PER_DAY;

  const firingMap = buildFiringMap({ latencyEntries, asyncEntries, windowStartMs });

  const classifiedHooks = [];
  for (const h of hooks) {
    classifiedHooks.push(
      classifyHook({
        hook: h,
        firingMap,
        hasTelemetry,
        windowDays: opts.windowDays,
        nowIso,
      }),
    );
  }

  const telemetryCounts = {
    latencyEntries: latencyEntries.length,
    asyncEntries: asyncEntries.length,
    latencyAvailable: latRes.ok,
    asyncAvailable: asyncRes.ok,
  };

  const report = buildReport({
    classifiedHooks,
    registry,
    hasTelemetry,
    windowDays: opts.windowDays,
    nowIso,
    telemetryCounts,
  });

  if (opts.json) {
    out(JSON.stringify(report, null, 2));
    return { exitCode: 0, report };
  }

  writeAtomic(outJson, JSON.stringify(report, null, 2) + "\n");
  writeAtomic(outMd, renderMarkdown(report));

  out(
    `[H3] hook utilization — ${report.totals.hooks} hooks (${report.totals.wired} wired), ` +
      `${report.issueCounts.orphan_file} orphan, ${report.issueCounts.dormant_30d} dormant, ` +
      `${report.issueCounts.tier_mismatch} tier-mismatch, ${report.issueCounts.missing_tier} missing-tier, ` +
      `${report.issueCounts.missing_event} missing-event` +
      `${hasTelemetry ? "" : " (no telemetry)"}`,
  );
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
      console.error("[H3] uncaught:", e);
      process.exit(1);
    },
  );
}

export const _internals = {
  DEFAULT_WINDOW_DAYS,
  T0,
};
