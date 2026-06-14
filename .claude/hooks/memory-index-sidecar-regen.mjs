#!/usr/bin/env node
// tier: T3
// memory-index-sidecar-regen.mjs — Stop hook (T3, advisory).
//
// Keeps the U-MEMORY-INDEX-SIDECAR sidecar fresh so the H7 UserPromptSubmit
// hook (memory-index-precheck-inject.mjs) always hits the ~11ms fast-path
// instead of the ~8.7s live-scan fallback.
//
// Logic on Stop:
//  1. If sidecar absent → regen (detached spawn).
//  2. If max(namespace_dir.mtimeMs) > sidecar.mtimeMs → regen.
//  3. Otherwise no-op.
//  4. Global throttle: ≥1 regen per PRISM_MEMORY_INDEX_REGEN_THROTTLE_MS
//     (default 1 hour) — cheap stamp file at state/shared/.memory-index-regen-stamp.
//
// Always exit 0. Detached spawn so the Stop chain is never blocked by the
// 47-second cold-build under heavy fleet load.
//
// Knobs:
//   PRISM_MEMORY_INDEX_REGEN_DISABLE=1     — off entirely
//   PRISM_MEMORY_INDEX_REGEN_THROTTLE_MS=N — minimum gap between regens (default 3,600,000)

import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";

const SIDECAR_PATH = "H:/prism/state/shared/memory-index-sidecar.json";
const STAMP_PATH = "H:/prism/state/shared/.memory-index-regen-stamp";
const BUILDER_SCRIPT = "H:/prism/scripts/build-memory-index-sidecar.mjs";
const VAULT_ROOT = "H:/prism/knowledge/memories";
const NAMESPACES = ["feedback", "reference", "project", "user", "patterns", "mistakes", "inbox"];
const DEFAULT_THROTTLE_MS = 60 * 60 * 1000;

const ENABLED = process.env.PRISM_MEMORY_INDEX_REGEN_DISABLE !== "1";

function clampInt(raw, fallback, min, max) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function readStamp() {
  if (!existsSync(STAMP_PATH)) return 0;
  try {
    const raw = readFileSync(STAMP_PATH, "utf8").trim();
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

function writeStamp(ts) {
  try {
    const dir = dirname(STAMP_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(STAMP_PATH, String(ts), "utf8");
  } catch { /* fail-soft */ }
}

function sidecarMtime() {
  if (!existsSync(SIDECAR_PATH)) return 0;
  try { return statSync(SIDECAR_PATH).mtimeMs; } catch { return 0; }
}

function vaultYoungest() {
  let youngest = 0;
  for (const ns of NAMESPACES) {
    const dir = join(VAULT_ROOT, ns);
    if (!existsSync(dir)) continue;
    try {
      const st = statSync(dir);
      if (st.mtimeMs > youngest) youngest = st.mtimeMs;
    } catch { /* ignore */ }
  }
  return youngest;
}

function shouldRegen() {
  const sc = sidecarMtime();
  if (sc === 0) return { regen: true, reason: "absent" };
  const youngest = vaultYoungest();
  if (youngest > sc) return { regen: true, reason: "stale" };
  return { regen: false, reason: "fresh" };
}

function main() {
  if (!ENABLED) { process.exit(0); }

  const throttleMs = clampInt(process.env.PRISM_MEMORY_INDEX_REGEN_THROTTLE_MS, DEFAULT_THROTTLE_MS, 60_000, 24 * 60 * 60 * 1000);
  const now = Date.now();
  const last = readStamp();
  if (now - last < throttleMs) { process.exit(0); }

  const decision = shouldRegen();
  if (!decision.regen) { process.exit(0); }

  writeStamp(now);

  try {
    const child = spawn(process.execPath, [BUILDER_SCRIPT], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  } catch { /* fail-soft */ }

  process.exit(0);
}

try { main(); }
catch (err) {
  try { process.stderr.write(`[memory-index-sidecar-regen] ${err?.message || err}\n`); }
  catch { /* ignore */ }
  process.exit(0);
}
