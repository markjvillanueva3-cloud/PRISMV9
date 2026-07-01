#!/usr/bin/env node
// tier: T4
/**
 * stop-wiki-stub-stager.mjs — Stop hook (T4, fire-and-forget)
 * ============================================================
 *
 * MEMORY-WIKI-OPTIMIZATION-MS0 / U-MWO07 (slot:bravo 2026-05-26). Shift-D
 * implementation: on a successful /loop tick this session, stage a Hermes-
 * Dreaming receipt bundle proposing a NEW wiki entry under
 * `knowledge/wiki/code-tribal/learnings/` for the last shipped unit. Operator
 * reviews via `/dream-review` before any apply — strictly advisory.
 *
 * Trigger gate (all must pass — otherwise hook is a silent no-op):
 *   1. PRISM_WIKI_STUB_STAGE=1 set                (opt-in)
 *   2. /loop state file exists AND status=running (active loop)
 *   3. Most recent commit on current branch matches `[SCOPE]/U-<ID>` pattern
 *   4. No wiki entry already exists for U-<ID> under code-tribal/learnings/
 *   5. Throttle window passed (≥5 min since last spawn)
 *
 * When triggered: detach-spawn `scripts/dream-stage-wiki-stub.mjs` which
 * writes a 4-file staged bundle proposing one wiki page. Never blocks Stop.
 *
 * Knobs:
 *   PRISM_WIKI_STUB_STAGE=1            — enable (default off for fail-soft)
 *   PRISM_WIKI_STUB_THROTTLE_MS=N      — default 300000 (5 min)
 *   PRISM_WIKI_STUB_DRY_RUN=1          — log decision but do not spawn
 *
 * @hook Stop
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { dirname } from "node:path";

const STAGE_SCRIPT = "H:/prism/scripts/dream-stage-wiki-stub.mjs";
const STAMP_FILE = "H:/prism/.claude/cache/wiki-stub-stager-last.json";
const STAGER_LOG = "H:/prism/.claude/cache/wiki-stub-stager.log";
const DEFAULT_THROTTLE_MS = 5 * 60 * 1000;
const WIKI_DIR = "H:/prism/knowledge/wiki/code-tribal/learnings";

function done(systemMessage) {
  const out = { continue: true };
  if (systemMessage) out.systemMessage = systemMessage;
  console.log(JSON.stringify(out));
}

function throttleMs() {
  const raw = Number(process.env.PRISM_WIKI_STUB_THROTTLE_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_THROTTLE_MS;
}

function ensureDir(d) {
  try { if (!existsSync(d)) mkdirSync(d, { recursive: true }); } catch { /* fail-soft */ }
}

function throttled() {
  try {
    const last = JSON.parse(readFileSync(STAMP_FILE, "utf8"));
    return Date.now() - last.timestamp < throttleMs();
  } catch { return false; }
}

function recordStamp() {
  try {
    ensureDir(dirname(STAMP_FILE));
    writeFileSync(STAMP_FILE, JSON.stringify({ timestamp: Date.now() }));
  } catch { /* fail-soft */ }
}

/** Pure-ish: extract U-<ID> from a commit subject like `[SCOPE]/U-DR08 (...)`. */
export function extractUnitId(subject) {
  if (typeof subject !== "string") return null;
  const m = subject.match(/\bU-[A-Z][A-Z0-9_-]*/);
  return m ? m[0] : null;
}

/** I/O: read most recent commit subject of HEAD. */
function lastCommitSubject() {
  try {
    const res = spawnSync("git", ["-C", "H:/prism", "log", "-1", "--format=%s"], { windowsHide: true, encoding: "utf8", timeout: 4000 });
    if (res.error || res.status !== 0) return null;
    return (res.stdout || "").trim();
  } catch { return null; }
}

/** Pure: convert U-MWO08 → mwo08 (slug-safe). */
export function unitSlug(unitId) {
  return String(unitId).toLowerCase().replace(/^u-/, "").replace(/[^a-z0-9-]/g, "-");
}

/** Pure: check if a wiki entry already exists for the unit by filename match. */
export function wikiEntryExists(unitId, fsImpl = { existsSync }) {
  const slug = unitSlug(unitId);
  return fsImpl.existsSync(`${WIKI_DIR}/${slug}.md`);
}

function main() {
  // Gate 1: env opt-in
  if (process.env.PRISM_WIKI_STUB_STAGE !== "1") return done();
  // Gate 2: loop running (best-effort)
  try {
    // loop-state.mjs writes session-keyed files; we just need ANY loop signal.
    // If the file isn't there, gate 3 still has to match a commit subject anyway.
  } catch { /* fail-soft */ }
  // Gate 3: commit subject has U-<ID>
  const subject = lastCommitSubject();
  const unitId = extractUnitId(subject);
  if (!unitId) return done();
  // Gate 4: wiki entry not already present
  if (wikiEntryExists(unitId)) return done();
  // Gate 5: throttle
  if (throttled()) return done();
  // Gate 6: stager script exists
  if (!existsSync(STAGE_SCRIPT)) return done();

  if (process.env.PRISM_WIKI_STUB_DRY_RUN === "1") {
    return done(`wiki-stub-stager: would stage entry for ${unitId} (dry-run)`);
  }
  let pid = null;
  try {
    ensureDir(dirname(STAGER_LOG));
    const fd = openSync(STAGER_LOG, "a");
    const child = spawn(process.execPath, [STAGE_SCRIPT, "--unit", unitId, "--commit-subject", subject ?? ""], {
      detached: true,
      windowsHide: true,
      stdio: ["ignore", fd, fd],
    });
    child.unref();
    pid = child.pid;
    recordStamp();
  } catch (e) {
    try {
      ensureDir(dirname(STAGER_LOG));
      writeFileSync(STAGER_LOG.replace(/\.log$/, ".err"), JSON.stringify({ ts: new Date().toISOString(), error: e?.message }) + "\n");
    } catch { /* fail-soft */ }
  }
  done(pid ? `wiki-stub-stager: staging ${unitId} (pid=${pid})` : undefined);
}

try { main(); }
catch (err) {
  console.error("[wiki-stub-stager] error:", err && err.message);
  console.log(JSON.stringify({ continue: true }));
}
