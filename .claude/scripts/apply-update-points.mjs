#!/usr/bin/env node
/**
 * apply-update-points.mjs — refresh canonical surfaces declared in update-points-registry.json
 *
 * Reads `H:/prism/.claude/scripts/update-points-registry.json` (42 points, tier 0-5) and
 * runs each point's regenerator command. Designed to be called as a postflight from
 * forge-audit / rgs6 / any pipeline that may have invalidated canonical surfaces.
 *
 * Lane discipline:
 *   - Each chat has a stable session id (from helpers/stable-session-id.mjs).
 *   - The registry has a top-level `lanes_locked` map: { "<chat-id>": ["<glob>", ...] }
 *     and per-point `lockedTo: "<chat-id>"`.
 *   - This script SKIPS any point whose path matches a lane lock owned by a peer chat.
 *   - It RUNS points locked to the current chat or with no lock.
 *
 * Staleness gate:
 *   - For trigger "always", run unconditionally.
 *   - Otherwise run only if path mtime > stalenessHours old (or path missing).
 *   - --since-hours <H> overrides the registry stalenessHours globally (lower bound).
 *   - --force ignores staleness entirely.
 *
 * Manual regenerators:
 *   - "manual" or "manual:flag-only" → emit advisory, never spawn.
 *
 * Flags:
 *   --tier <N> [<N>...]      restrict to specific tier(s) (repeatable)
 *   --point <id>             run only the named point (repeatable)
 *   --since-hours <H>        treat anything older than H hours as stale
 *   --force                  ignore staleness check
 *   --dry-run                print what would run, do not spawn
 *   --json                   emit JSON report on stdout
 *   --timeout <ms>           per-point spawn timeout (default 60000)
 *
 * Output:
 *   state/shared/update-points-report.json  — { ts, ranAt, byTier, ranCount, skippedCount, manualCount, failures }
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PRISM = "H:/prism";
const REGISTRY = `${PRISM}/.claude/scripts/update-points-registry.json`;
const REPORT = `${PRISM}/state/shared/update-points-report.json`;
const SESSION_HELPER = `${PRISM}/.claude/helpers/stable-session-id.mjs`;

const DEFAULT_TIMEOUT_MS = 60000;

function args() {
  const a = process.argv.slice(2);
  const o = { tier: [], point: [] };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === "--tier") {
      while (a[i + 1] && !a[i + 1].startsWith("--") && /^[0-5]$/.test(a[i + 1])) o.tier.push(Number(a[++i]));
    } else if (k === "--point") {
      o.point.push(a[++i]);
    } else if (k === "--since-hours") {
      o.sinceHours = Number(a[++i]);
    } else if (k === "--timeout") {
      o.timeout = Number(a[++i]);
    } else if (k.startsWith("--")) {
      o[k.slice(2)] = true;
    }
  }
  return o;
}

function getSessionId() {
  try {
    const r = spawnSync(process.execPath, [SESSION_HELPER], { encoding: "utf8", timeout: 5000 });
    return (r.stdout || "").trim() || null;
  } catch { return null; }
}

function readJSON(p, fb) {
  if (!fs.existsSync(p)) return fb;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; }
}

function writeJSONAtomic(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, p);
}

function globToRegex(g) {
  // minimal glob: ** matches any, * matches non-slash, ? matches one char
  let r = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*" && g[i + 1] === "*") { r += ".*"; i++; }
    else if (c === "*") r += "[^/]*";
    else if (c === "?") r += ".";
    else if (".+^$()|[]{}\\".includes(c)) r += "\\" + c;
    else r += c;
  }
  return new RegExp("^" + r + "$");
}

function matchesAnyGlob(p, globs) {
  if (!globs || globs.length === 0) return false;
  const norm = String(p).replace(/\\/g, "/");
  return globs.some(g => globToRegex(g).test(norm));
}

function isPathOwnedByPeer(pointPath, lanesLocked, currentSession, perPointLockedTo) {
  if (perPointLockedTo && perPointLockedTo !== currentSession) return { peer: perPointLockedTo };
  for (const [chat, globs] of Object.entries(lanesLocked || {})) {
    if (chat === currentSession) continue;
    if (matchesAnyGlob(pointPath, globs)) return { peer: chat };
  }
  return null;
}

function ageHoursMs(p) {
  try {
    const norm = path.isAbsolute(p) ? p : `${PRISM}/${p}`;
    const st = fs.statSync(norm);
    return (Date.now() - st.mtimeMs) / (1000 * 60 * 60);
  } catch { return Infinity; }
}

function pickStalenessHours(pt, sinceHoursOverride) {
  const reg = typeof pt.stalenessHours === "number" ? pt.stalenessHours : 24;
  if (typeof sinceHoursOverride === "number" && !Number.isNaN(sinceHoursOverride)) {
    return Math.min(reg, sinceHoursOverride);
  }
  return reg;
}

function shouldRun(pt, opts) {
  if (opts.force) return { run: true, reason: "force" };
  const triggers = Array.isArray(pt.triggers) ? pt.triggers : [];
  if (triggers.includes("always")) return { run: true, reason: "always-trigger" };
  const staleness = pickStalenessHours(pt, opts.sinceHours);
  const age = ageHoursMs(pt.path);
  if (age === Infinity) return { run: true, reason: "missing-path" };
  if (age > staleness) return { run: true, reason: `stale ${age.toFixed(1)}h > ${staleness}h` };
  return { run: false, reason: `fresh ${age.toFixed(1)}h <= ${staleness}h` };
}

function spawnRegenerator(cmd, timeoutMs) {
  // Split into argv via shell-lite — registry uses simple `node script --flag` shapes
  const parts = String(cmd).match(/[^\s"']+|"([^"]*)"|'([^']*)'/g) || [];
  const argv = parts.map(p => p.replace(/^["']|["']$/g, ""));
  if (argv.length === 0) return { ok: false, error: "empty-command", code: -1 };
  const exe = argv[0];
  const rest = argv.slice(1);
  const r = spawnSync(exe, rest, {
    cwd: PRISM,
    encoding: "utf8",
    timeout: timeoutMs,
    shell: false,
    windowsHide: true,
  });
  return {
    ok: r.status === 0,
    code: r.status ?? -1,
    signal: r.signal || null,
    stdoutTail: (r.stdout || "").slice(-500),
    stderrTail: (r.stderr || "").slice(-500),
    error: r.error?.message || null,
  };
}

function main() {
  const opts = args();
  const timeout = Number(opts.timeout) || DEFAULT_TIMEOUT_MS;
  const session = getSessionId() || "unknown-session";

  const reg = readJSON(REGISTRY, null);
  if (!reg || !Array.isArray(reg.points)) {
    console.error(`update-points-registry.json missing or malformed at ${REGISTRY}`);
    process.exit(2);
  }

  const lanesLocked = reg.lanes_locked || {};
  let candidates = reg.points.slice();

  // Filter by --tier and --point
  if (opts.tier.length > 0) {
    const wanted = new Set(opts.tier);
    candidates = candidates.filter(p => wanted.has(Number(p.tier)));
  }
  if (opts.point.length > 0) {
    const wanted = new Set(opts.point);
    candidates = candidates.filter(p => wanted.has(p.id));
  }

  const report = {
    schemaVersion: "1.0.0",
    ts: new Date().toISOString(),
    session,
    flags: { tier: opts.tier, point: opts.point, sinceHours: opts.sinceHours, force: !!opts.force, dryRun: !!opts.dry_run || !!opts["dry-run"] },
    counts: { evaluated: 0, ran: 0, skippedFresh: 0, skippedPeerLane: 0, manualAdvisory: 0, failures: 0 },
    byTier: {},
    points: [],
  };

  const dryRun = !!opts.dry_run || !!opts["dry-run"];

  for (const pt of candidates) {
    report.counts.evaluated++;
    const tierKey = String(pt.tier);
    report.byTier[tierKey] = (report.byTier[tierKey] || 0) + 1;

    // Lane lock — peer ownership check
    const peerLock = isPathOwnedByPeer(pt.path, lanesLocked, session, pt.lockedTo);
    if (peerLock) {
      report.counts.skippedPeerLane++;
      report.points.push({ id: pt.id, tier: pt.tier, action: "skip-peer-lane", peer: peerLock.peer, path: pt.path });
      continue;
    }

    // Manual regenerators are advisory only
    if (typeof pt.regenerator !== "string" || pt.regenerator.startsWith("manual")) {
      report.counts.manualAdvisory++;
      report.points.push({ id: pt.id, tier: pt.tier, action: "manual-advisory", path: pt.path, rationale: pt.rationale });
      continue;
    }

    // Staleness gate
    const decision = shouldRun(pt, opts);
    if (!decision.run) {
      report.counts.skippedFresh++;
      report.points.push({ id: pt.id, tier: pt.tier, action: "skip-fresh", reason: decision.reason });
      continue;
    }

    if (dryRun) {
      report.points.push({ id: pt.id, tier: pt.tier, action: "would-run", reason: decision.reason, regenerator: pt.regenerator });
      continue;
    }

    // Spawn
    const t0 = Date.now();
    const result = spawnRegenerator(pt.regenerator, timeout);
    const durMs = Date.now() - t0;
    if (result.ok) {
      report.counts.ran++;
      report.points.push({ id: pt.id, tier: pt.tier, action: "ran", durMs, reason: decision.reason });
    } else {
      report.counts.failures++;
      report.points.push({
        id: pt.id, tier: pt.tier, action: "failed", durMs,
        code: result.code, signal: result.signal,
        error: result.error,
        stderrTail: result.stderrTail,
      });
    }
  }

  writeJSONAtomic(REPORT, report);

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const c = report.counts;
    const verdict = c.failures > 0 ? "FAILURES" : (dryRun ? "DRY-RUN" : "OK");
    console.log(`apply-update-points — ${verdict}`);
    console.log(`  session: ${session}`);
    console.log(`  evaluated: ${c.evaluated}  ran: ${c.ran}  skipped-fresh: ${c.skippedFresh}  skipped-peer-lane: ${c.skippedPeerLane}  manual-advisory: ${c.manualAdvisory}  failures: ${c.failures}`);
    console.log(`  by tier: ${Object.entries(report.byTier).map(([t,n]) => `t${t}=${n}`).join(", ")}`);
    if (c.failures > 0) {
      console.log(`  failures:`);
      for (const p of report.points.filter(p => p.action === "failed")) {
        console.log(`    ${p.id}  code=${p.code}  ${(p.stderrTail || "").split("\n")[0].slice(0, 120)}`);
      }
    }
    console.log(`  report: ${REPORT}`);
  }

  process.exit(report.counts.failures > 0 ? 1 : 0);
}

try { main(); } catch (e) { console.error(`apply-update-points error: ${e.message}\n${e.stack}`); process.exit(2); }
