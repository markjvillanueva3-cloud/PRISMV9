#!/usr/bin/env node
// tier: T3
// extraction-intake-trigger.mjs -- EXTRACTION-INTAKE-MS0 (slot:bravo 2026-06-12)
//
// PostToolUse(Bash) hook: when an EXTRACTION command runs (youtube-free-extract,
// pdf/video-learn, batch-pdf-extract, extract-*), auto-fire scripts/extraction-intake.mjs
// so the freshly-extracted wiki entries are auto-ingested into the live tribal index
// (convert + inferDomain galaxy-tag + nomic-embed + clobber-guarded write) -- closing
// the operator's "when we do extractions the data is automatically converted + applied
// to nodes/galaxies + indexed + added to the vault" gap.
//
// SAFETY (mirrors obsidian-viz-edge-autosync.mjs, the tested template):
//   - DETACHED spawn (.unref()) -> never blocks the Bash tool call (~1ms sync cost).
//   - DEBOUNCED per-tree (skip if fired within DEBOUNCE_MS) -> no thrash on a batch loop.
//   - FAIL-SOFT: every error -> {continue:true}, never blocks a Bash command.
//   - Runs the intake against the INTEGRATION tree (where the live 537MB index lives),
//     resolved via PRISM_EXTRACTION_INTAKE_ROOT || PRISM_ROOT || H:/prism. Skips if the
//     intake script is not present there yet (e.g. before the slot/bravo merge lands).
//   - The intake itself self-reexecs with an 8GB heap + uses the safe --add path.
//
// Knobs:
//   PRISM_EXTRACTION_INTAKE_TRIGGER_DISABLE=1   -- disable entirely
//   PRISM_EXTRACTION_INTAKE_DEBOUNCE_MS=N        -- debounce window (default 45000)
//   PRISM_EXTRACTION_INTAKE_VERBOSE=1            -- log decisions to stderr

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_DEBOUNCE_MS = 45000;
// Commands whose completion should trigger an intake drain.
const EXTRACTION_RE = /(youtube-free-extract|youtube-extract|batch-pdf-extract|extract-[a-z0-9_-]+\.(mjs|py)|pdf-learn|video-learn)/i;

/** True when a Bash command is an extraction whose output should be auto-ingested. */
export function qualifies(command) {
  if (typeof command !== "string" || !command) return false;
  return EXTRACTION_RE.test(command);
}

/**
 * Resolve the integration tree that holds the live tribal index + the intake script.
 * Returns the script path if it exists there, else null (fail-soft skip).
 */
export function resolveIntakeScript(env = process.env, exists = fs.existsSync) {
  const root = (env.PRISM_EXTRACTION_INTAKE_ROOT || env.PRISM_ROOT || "H:/prism").replace(/\\/g, "/");
  const script = path.join(root, "scripts/extraction-intake.mjs");
  try {
    return exists(script) ? { root, script } : null;
  } catch {
    return null;
  }
}

/** Debounce: true if the last run stamp is within the window. */
export function isDebounced(stampMs, nowMs, windowMs) {
  if (typeof stampMs !== "number" || !Number.isFinite(stampMs)) return false;
  return nowMs - stampMs < windowMs;
}

function readStamp(stampPath) {
  try {
    return Number(JSON.parse(fs.readFileSync(stampPath, "utf8")).at) || 0;
  } catch {
    return 0;
  }
}

async function main() {
  const done = () => process.stdout.write(JSON.stringify({ continue: true }));
  try {
    if (process.env.PRISM_EXTRACTION_INTAKE_TRIGGER_DISABLE === "1") return done();
    const verbose = process.env.PRISM_EXTRACTION_INTAKE_VERBOSE === "1";
    const windowMs = Number(process.env.PRISM_EXTRACTION_INTAKE_DEBOUNCE_MS) || DEFAULT_DEBOUNCE_MS;

    let stdin = "";
    for await (const c of process.stdin) stdin += c;
    let env;
    try { env = JSON.parse(stdin); } catch { env = {}; }
    const command = env.tool_input?.command;
    if (!qualifies(command)) return done();

    const resolved = resolveIntakeScript();
    if (!resolved) { if (verbose) console.error("[extraction-intake-trigger] intake script not present yet"); return done(); }

    const stampPath = path.join(resolved.root, "state/shared/.extraction-intake-stamp");
    const now = Date.now();
    if (isDebounced(readStamp(stampPath), now, windowMs)) {
      if (verbose) console.error(`[extraction-intake-trigger] debounced (<${windowMs}ms)`);
      return done();
    }

    // Stamp BEFORE spawning so a batch loop debounces even while the child runs.
    try {
      fs.mkdirSync(path.dirname(stampPath), { recursive: true });
      fs.writeFileSync(stampPath, JSON.stringify({ at: now }), "utf8");
    } catch { /* fail-soft */ }

    try {
      const child = spawn(process.execPath, [resolved.script], {
        cwd: resolved.root, detached: true, windowsHide: true, stdio: "ignore",
        env: { ...process.env, PRISM_EXTRACTION_INTAKE_ROOT: resolved.root },
      });
      child.unref();
      if (verbose) console.error(`[extraction-intake-trigger] intake spawned in ${resolved.root} (pid ${child.pid})`);
      // Also run the forge-worthiness detector (light, no index load) so extraction-derived
      // CAPABILITIES get queued for the /loop to /forge-triple. Independent + fail-soft.
      const forge = path.join(resolved.root, "scripts/extraction-forge-detect.mjs");
      if (fs.existsSync(forge)) {
        const fc = spawn(process.execPath, [forge], {
          cwd: resolved.root, detached: true, windowsHide: true, stdio: "ignore",
          env: { ...process.env, PRISM_EXTRACTION_INTAKE_ROOT: resolved.root },
        });
        fc.unref();
        if (verbose) console.error(`[extraction-intake-trigger] forge-detect spawned (pid ${fc.pid})`);
      }
    } catch (e) {
      if (verbose) console.error(`[extraction-intake-trigger] spawn failed: ${e.message}`);
    }
    return done();
  } catch (e) {
    if (process.env.PRISM_EXTRACTION_INTAKE_VERBOSE === "1") console.error(`[extraction-intake-trigger] ${e?.message}`);
    return done();
  }
}

// Only run main() when invoked directly (not when imported by the test).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
}
