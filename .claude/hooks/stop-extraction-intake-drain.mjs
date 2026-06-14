#!/usr/bin/env node
// tier: T3
// stop-extraction-intake-drain.mjs -- EXTRACTION-INTAKE-MS0 (slot:bravo 2026-06-12)
//
// Stop hook BACKSTOP for the extraction auto-intake. At session end, if there are
// extraction wiki entries newer than the last drain (e.g. produced by a cron run, a
// peer, or an extraction the PostToolUse trigger missed), detached-spawn a BOUNDED
// extraction-intake drain. This clears the backlog incrementally over a few session
// ends -- the reaper-safe alternative to one long backfill (the fleet-reaper orphans
// any job that outlives ~10 min).
//
// CHEAP GATE: a readdir + mtime check decides whether to spawn at all, so the heavy
// 537MB index load only happens when there is genuinely new extraction output. A
// debounce stamp prevents draining on every single Stop.
//
// FAIL-SOFT + advisory: never blocks Stop; every error -> {continue:true}.
//
// Knobs: PRISM_EXTRACTION_INTAKE_DRAIN_DISABLE=1 | PRISM_EXTRACTION_INTAKE_DRAIN_DEBOUNCE_MS=N
//        | PRISM_EXTRACTION_INTAKE_DRAIN_MAX=N | PRISM_EXTRACTION_INTAKE_ROOT=<repo>

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_DEBOUNCE_MS = 600000; // 10 min -- a Stop backstop, not a per-Stop job
const DEFAULT_DRAIN_MAX = 8;        // bounded per drain so no single run is reaper-long
const WATCH_SUBDIR = "knowledge/wiki/code-tribal";
const WATCH_PREFIX = "youtube-";

/**
 * Pure: true if any candidate {name, mtimeMs} is newer than the last-drain stamp
 * (and matches the extraction prefix). A 0/NaN stamp means "never drained" -> true
 * if any candidate exists at all.
 */
export function hasNewExtractionSince(candidates, stampMs, prefix = WATCH_PREFIX) {
  if (!Array.isArray(candidates) || candidates.length === 0) return false;
  const since = Number.isFinite(stampMs) ? stampMs : 0;
  return candidates.some(
    (c) => c && typeof c.name === "string" && c.name.startsWith(prefix) &&
      c.name.endsWith(".md") && Number(c.mtimeMs) > since,
  );
}

/** Debounce: true if the last run stamp is within the window. */
export function isDebounced(stampMs, nowMs, windowMs) {
  if (typeof stampMs !== "number" || !Number.isFinite(stampMs)) return false;
  return nowMs - stampMs < windowMs;
}

/** Resolve the integration tree that holds the intake script. Returns {root,script} or null. */
export function resolveIntakeScript(env = process.env, exists = fs.existsSync) {
  const root = (env.PRISM_EXTRACTION_INTAKE_ROOT || env.PRISM_ROOT || "H:/prism").replace(/\\/g, "/");
  const script = path.join(root, "scripts/extraction-intake.mjs");
  try {
    return exists(script) ? { root, script } : null;
  } catch {
    return null;
  }
}

function readStamp(stampPath) {
  try { return Number(JSON.parse(fs.readFileSync(stampPath, "utf8")).at) || 0; } catch { return 0; }
}

function listWithMtime(dir) {
  try {
    return fs.readdirSync(dir).map((name) => {
      try { return { name, mtimeMs: fs.statSync(path.join(dir, name)).mtimeMs }; }
      catch { return { name, mtimeMs: 0 }; }
    });
  } catch { return []; }
}

async function main() {
  const done = () => process.stdout.write(JSON.stringify({ continue: true }));
  try {
    if (process.env.PRISM_EXTRACTION_INTAKE_DRAIN_DISABLE === "1") return done();
    const windowMs = Number(process.env.PRISM_EXTRACTION_INTAKE_DRAIN_DEBOUNCE_MS) || DEFAULT_DEBOUNCE_MS;
    const max = Number(process.env.PRISM_EXTRACTION_INTAKE_DRAIN_MAX) || DEFAULT_DRAIN_MAX;

    const resolved = resolveIntakeScript();
    if (!resolved) return done();

    const stampPath = path.join(resolved.root, "state/shared/.extraction-intake-drain-stamp");
    const stamp = readStamp(stampPath);
    const now = Date.now();
    if (isDebounced(stamp, now, windowMs)) return done(); // drained recently

    const candidates = listWithMtime(path.join(resolved.root, WATCH_SUBDIR));
    if (!hasNewExtractionSince(candidates, stamp)) return done(); // nothing new -> no heavy load

    // Stamp before spawn so a rapid second Stop debounces while the child runs.
    try {
      fs.mkdirSync(path.dirname(stampPath), { recursive: true });
      fs.writeFileSync(stampPath, JSON.stringify({ at: now }), "utf8");
    } catch { /* fail-soft */ }

    try {
      const child = spawn(process.execPath, [resolved.script, "--max", String(max)], {
        cwd: resolved.root, detached: true, stdio: "ignore",
        env: { ...process.env, PRISM_EXTRACTION_INTAKE_ROOT: resolved.root },
      });
      child.unref();
    } catch { /* fail-soft */ }
    return done();
  } catch {
    return done();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
}
