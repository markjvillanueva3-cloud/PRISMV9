#!/usr/bin/env node
// overnight-vault-compound.mjs -- all-night Obsidian 2nd-brain pipeline (zulu, 2026-06-09)
// Phase 1: mine every unpopulated galaxy (1 at a time, bounded --limit 8, resumable).
// Phase 2: compound -- memory index sidecar + embeddings (resume) + galaxy-synthesis-refresh.
// Detach via: Start-Process node -ArgumentList "H:/prism/scripts/overnight-vault-compound.mjs"
// Log: state/shared/galaxy-transcript-mining/_overnight.log . Stop: create _overnight.stop
import { execFileSync } from "node:child_process";
import { readdirSync, existsSync, appendFileSync, writeFileSync, rmSync } from "node:fs";

const ROOT = "H:/prism";
const LOG = `${ROOT}/state/shared/galaxy-transcript-mining/_overnight.log`;
const STOP = `${ROOT}/state/shared/galaxy-transcript-mining/_overnight.stop`;
const LOCK = `${ROOT}/state/shared/galaxy-transcript-mining/_overnight.lock`;
const VAULT_REF = `${ROOT}/knowledge/memories/reference`;
const GALAXY_TOTAL = 34;
const MAX_PHASE1_ROUNDS = 40; // hard backstop vs infinite loop (R6)

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  appendFileSync(LOG, line, "utf8");
  process.stdout.write(line);
}
function memoCount() {
  try {
    return readdirSync(VAULT_REF).filter((f) => /_transcript_synthesis\.md$/.test(f)).length;
  } catch { return -1; }
}
function run(cmd, args, timeoutMs) {
  try {
    const out = execFileSync(cmd, args, { encoding: "utf8", timeout: timeoutMs, cwd: ROOT, windowsHide: true });
    return { ok: true, out: out.slice(-1500) };
  } catch (err) {
    return { ok: false, out: String((err.stdout || "") + (err.stderr || "") + (err.message || "")).slice(-1500) };
  }
}

// single-instance lock (stale after 8h)
if (existsSync(LOCK)) {
  const ageMs = Date.now() - (await import("node:fs")).statSync(LOCK).mtimeMs;
  if (ageMs < 8 * 3600_000) { log("another overnight run holds the lock; exiting"); process.exit(0); }
}
writeFileSync(LOCK, String(process.pid), "utf8");

try {
  log(`START overnight pipeline pid=${process.pid} memos=${memoCount()}/${GALAXY_TOTAL}`);

  // PHASE 1: populate all galaxies
  let rounds = 0;
  let lastCount = memoCount();
  let stall = 0;
  while (lastCount >= 0 && lastCount < GALAXY_TOTAL && rounds < MAX_PHASE1_ROUNDS) {
    if (existsSync(STOP)) { log("stop-file detected; aborting"); process.exit(0); }
    rounds++;
    log(`phase1 round ${rounds}: mining next unpopulated galaxy (memos=${lastCount})`);
    const r = run("node", [`${ROOT}/scripts/mine-galaxy-transcripts.mjs`, "--next-unpopulated", "--next-count", "1", "--limit", "8"], 100 * 60_000);
    log(`phase1 round ${rounds} ${r.ok ? "ok" : "FAILED"}: ${r.out.split("\n").filter(Boolean).slice(-3).join(" | ")}`);
    const now = memoCount();
    if (now <= lastCount) { stall++; } else { stall = 0; }
    lastCount = now;
    if (stall >= 3) { log(`3 stalled rounds (memo count stuck at ${lastCount}); moving to phase 2 with partial coverage`); break; }
  }
  log(`phase1 done: memos=${lastCount}/${GALAXY_TOTAL} rounds=${rounds}`);

  // PHASE 2: compound into recall brains
  if (existsSync(STOP)) { log("stop-file before phase2; exiting"); process.exit(0); }
  const steps = [
    ["memory-index", "node", [`${ROOT}/scripts/build-memory-index-sidecar.mjs`], 30 * 60_000],
    ["embeddings", "node", [`${ROOT}/scripts/build-memory-embeddings-sidecar.mjs`, "--resume"], 240 * 60_000],
    ["galaxy-synthesis-refresh", "node", [`${ROOT}/scripts/galaxy-synthesis-refresh.mjs`], 60 * 60_000],
  ];
  for (const [name, cmd, args, t] of steps) {
    if (existsSync(STOP)) { log("stop-file mid-phase2; exiting"); process.exit(0); }
    log(`phase2 ${name}: starting`);
    const r = run(cmd, args, t);
    log(`phase2 ${name} ${r.ok ? "ok" : "FAILED"}: ${r.out.split("\n").filter(Boolean).slice(-3).join(" | ")}`);
  }
  log(`DONE overnight pipeline. memos=${memoCount()}/${GALAXY_TOTAL}`);
} finally {
  try { rmSync(LOCK, { force: true }); } catch {}
}
