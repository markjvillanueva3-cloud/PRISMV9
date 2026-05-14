#!/usr/bin/env node
// build-envelope-drift.mjs — CLEANUP-MS0/U-CLEANUP-F2
//
// Detects envelope drift trend changes and posts to AGENT_CHAT when drift INCREASES.
// Drift = the canonical totals.drift from MILESTONE_PROGRESS.json (milestones whose
// envelope-claimed completion count disagrees with git-observed shipped count).
//
// Flow:
//   1. Run scripts/build-milestone-progress.mjs to ensure MILESTONE_PROGRESS is fresh.
//   2. Read MILESTONE_PROGRESS.json -> extract totals.drift + canonicalized hash.
//   3. Compare against state/shared/envelope-drift-last.json.
//   4. If drift increased, post structured event to agent-coordination chat bus.
//   5. Write the new snapshot back to envelope-drift-last.json.
//   6. Append a row to state/shared/envelope-drift-trends.jsonl (windowed by caller).
//
// Cadence: invoked by scripts/system-health/08-envelope-drift.ps1 every 30 minutes.
//
// Flags:
//   --json                  emit machine-readable JSON to stdout
//   --frozen-time <iso>     override generatedAt (for hermetic tests)
//   --skip-trends-append    don't write to envelope-drift-trends.jsonl
//   --skip-bus-post         don't post to AGENT_CHAT.md (dry-run)
//   --force-post            post regardless of drift delta (manual trigger)
//   --repo <path>           override H:/prism repo root

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  statSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

const DEFAULT_REPO              = "H:/prism";
const TRENDS_BASENAME           = "envelope-drift-trends.jsonl";
const LAST_BASENAME             = "envelope-drift-last.json";
const PROGRESS_BASENAME         = "MILESTONE_PROGRESS.json";
const MAX_TREND_SAMPLE_BYTES    = 4 * 1024 * 1024; // 4 MiB cap before forcing rotation
const SUBPROCESS_TIMEOUT_MS     = 60_000;
const SCHEMA_VERSION            = 1;

function parseArgs(argv) {
  const out = { repo: DEFAULT_REPO, frozenTime: null, json: false, skipTrendsAppend: false, skipBusPost: false, forcePost: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--frozen-time") out.frozenTime = argv[++i];
    else if (a === "--skip-trends-append") out.skipTrendsAppend = true;
    else if (a === "--skip-bus-post") out.skipBusPost = true;
    else if (a === "--force-post") out.forcePost = true;
    else if (a === "--repo") out.repo = argv[++i];
  }
  return out;
}

function atomicWrite(filePath, content) {
  const dir = path.dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`);
  try {
    writeFileSync(tmp, content, "utf8");
    renameSync(tmp, filePath);
  } catch (e) {
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* ignore */ }
    throw e;
  }
}

function regenerateMilestoneProgress(repo) {
  const script = path.join(repo, "scripts", "build-milestone-progress.mjs");
  if (!existsSync(script)) {
    return { ok: false, reason: `script missing: ${script}` };
  }
  const r = spawnSync(process.execPath, [script], { encoding: "utf8", timeout: SUBPROCESS_TIMEOUT_MS });
  if (r.error) return { ok: false, reason: `spawn error: ${r.error.message}` };
  if (r.signal) return { ok: false, reason: `timed out (signal=${r.signal})` };
  if (r.status !== 0) return { ok: false, reason: `exit=${r.status} stderr=${(r.stderr || "").slice(0, 200)}` };
  return { ok: true };
}

function canonicalize(obj) {
  // Stable stringification that ignores key ordering — needed so two
  // semantically-identical JSONs produce the same hash.
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(canonicalize).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") + "}";
}

function readProgress(repo) {
  const p = path.join(repo, "state", "shared", PROGRESS_BASENAME);
  if (!existsSync(p)) return null;
  const txt = readFileSync(p, "utf8");
  let json;
  try { json = JSON.parse(txt); } catch (e) { return { _error: `parse failed: ${e.message}` }; }
  const drift = json?.totals?.drift ?? 0;
  const milestones = json?.totals?.milestones ?? 0;
  const units = json?.totals?.units ?? 0;
  const shipped = json?.totals?.shipped ?? 0;
  // Canonicalize only the totals + drifted-milestone IDs (not the entire 670-entry list)
  // so the hash changes when drift state changes, not when timestamps shift.
  const driftedIds = (json.milestones || [])
    .filter(m => m.drift && m.drift !== "n/a" && m.drift !== "match")
    .map(m => ({ id: m.id, drift: m.drift, shipped: m.shipped, total: m.total }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const sample = { totals: { drift, milestones, units, shipped }, driftedIds };
  const hash = createHash("sha256").update(canonicalize(sample)).digest("hex");
  return { drift, milestones, units, shipped, driftedIds, hash };
}

function readLastSnapshot(repo) {
  const p = path.join(repo, "state", "shared", LAST_BASENAME);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

function writeLastSnapshot(repo, snap) {
  const p = path.join(repo, "state", "shared", LAST_BASENAME);
  atomicWrite(p, JSON.stringify(snap, null, 2));
}

function appendTrendRow(repo, row) {
  const p = path.join(repo, "state", "shared", TRENDS_BASENAME);
  try {
    if (existsSync(p) && statSync(p).size > MAX_TREND_SAMPLE_BYTES) {
      // Rotate: rename current to .1 (overwriting any prior .1)
      const rotated = `${p}.1`;
      try { if (existsSync(rotated)) unlinkSync(rotated); } catch { /* ignore */ }
      renameSync(p, rotated);
    }
  } catch { /* rotation is best-effort */ }
  appendFileSync(p, JSON.stringify(row) + "\n", "utf8");
}

function postToBus(repo, payload) {
  const helper = path.join(repo, ".claude", "helpers", "agent-coordination.mjs");
  if (!existsSync(helper)) return { ok: false, reason: `helper missing: ${helper}` };
  const r = spawnSync(process.execPath, [helper, "post", "--message", JSON.stringify(payload)], {
    encoding: "utf8",
    timeout: SUBPROCESS_TIMEOUT_MS,
  });
  if (r.error) return { ok: false, reason: `spawn error: ${r.error.message}` };
  if (r.signal) return { ok: false, reason: `timed out (signal=${r.signal})` };
  if (r.status !== 0) return { ok: false, reason: `exit=${r.status}`, stderr: (r.stderr || "").slice(0, 200) };
  return { ok: true };
}

// ------- main -------
const args = parseArgs(process.argv.slice(2));
const generatedAt = args.frozenTime || new Date().toISOString();

const regen = regenerateMilestoneProgress(args.repo);
if (!regen.ok) {
  const errMsg = `build-milestone-progress.mjs failed: ${regen.reason}`;
  if (args.json) console.log(JSON.stringify({ ok: false, generatedAt, error: errMsg }, null, 2));
  else console.error(errMsg);
  process.exit(2);
}

const current = readProgress(args.repo);
if (!current || current._error) {
  const errMsg = `MILESTONE_PROGRESS.json read failed: ${current?._error ?? "missing"}`;
  if (args.json) console.log(JSON.stringify({ ok: false, generatedAt, error: errMsg }, null, 2));
  else console.error(errMsg);
  process.exit(3);
}

const last = readLastSnapshot(args.repo);
const drift = current.drift;
const prevDrift = last?.drift ?? null;
const driftDelta = prevDrift === null ? null : drift - prevDrift;
const hashChanged = !last || last.hash !== current.hash;
const driftIncreased = prevDrift !== null && drift > prevDrift;
const shouldPost = args.forcePost || driftIncreased;

const result = {
  schemaVersion: SCHEMA_VERSION,
  generatedAt,
  current: { drift, milestones: current.milestones, units: current.units, shipped: current.shipped, hash: current.hash },
  previous: last ? { drift: last.drift, hash: last.hash, generatedAt: last.generatedAt } : null,
  driftDelta,
  driftIncreased,
  hashChanged,
  posted: false,
  postReason: shouldPost ? (args.forcePost ? "forced" : "drift_increased") : "no_change_or_decreased",
};

if (shouldPost && !args.skipBusPost) {
  const payload = {
    from: "build-envelope-drift",
    scope: "CLEANUP-MS0",
    unit: "U-CLEANUP-F2",
    event: "envelope-drift-alert",
    summary: `Envelope drift ${prevDrift ?? "?"} -> ${drift}` +
             (driftDelta !== null ? ` (delta +${driftDelta})` : "") +
             ` across ${current.milestones} milestones. Run /close-out-audit + reconcile.`,
    drift,
    prevDrift,
    delta: driftDelta,
    drifted_sample: current.driftedIds.slice(0, 5).map(m => m.id),
    generatedAt,
  };
  const post = postToBus(args.repo, payload);
  result.posted = post.ok;
  result.postError = post.ok ? null : (post.reason + (post.stderr ? ` :: ${post.stderr}` : ""));
}

// Always update the last snapshot so the next run compares against the latest state.
writeLastSnapshot(args.repo, {
  schemaVersion: SCHEMA_VERSION,
  generatedAt,
  drift,
  milestones: current.milestones,
  units: current.units,
  shipped: current.shipped,
  hash: current.hash,
});

if (!args.skipTrendsAppend) {
  appendTrendRow(args.repo, {
    ts: generatedAt,
    drift,
    delta: driftDelta,
    hash: current.hash,
    posted: result.posted,
  });
}

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const trend = driftDelta === null ? "first-run" : (driftDelta > 0 ? `+${driftDelta}` : driftDelta === 0 ? "0" : `${driftDelta}`);
  console.log(`envelope-drift: ${prevDrift ?? "—"} → ${drift} (${trend}) hash=${current.hash.slice(0, 10)} posted=${result.posted}`);
}

process.exit(0);
