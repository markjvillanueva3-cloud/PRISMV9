#!/usr/bin/env node
// tier: T3
/**
 * stop-audit-registry-refresh.mjs — Stop hook
 *
 * SYSTEM-AUDIT-AWARENESS/U-AUDIT-CADENCE (slot:papa 2026-05-26)
 *
 * Keeps state/shared/AUDIT-REGISTRY.json fresh on a 24h cadence so
 * audit-awareness-inject.mjs has current data for the 2-day staleness
 * gate. Detached spawn (Stop returns immediately).
 *
 * Knobs:
 *   PRISM_AUDIT_REG_REFRESH_DISABLE=1
 *   PRISM_AUDIT_REG_REFRESH_THROTTLE_MS  default 24h
 */

import { existsSync, statSync } from "node:fs";
import { spawn as cpSpawn } from "node:child_process";

const REGISTRY = "H:/prism/state/shared/AUDIT-REGISTRY.json";
const SCRIPT = "H:/prism/scripts/build-audit-registry.mjs";
const DEFAULT_THROTTLE_MS = 24 * 60 * 60 * 1000;

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

function main() {
  if (process.env.PRISM_AUDIT_REG_REFRESH_DISABLE === "1") return pass();
  const throttleMs = Number.parseInt(
    process.env.PRISM_AUDIT_REG_REFRESH_THROTTLE_MS ?? String(DEFAULT_THROTTLE_MS),
    10,
  );
  // Skip if registry is fresh enough
  if (existsSync(REGISTRY)) {
    try {
      const st = statSync(REGISTRY);
      if (Date.now() - st.mtimeMs < throttleMs) return pass();
    } catch { /* ignore */ }
  }
  // Detached fire-and-forget regen
  try {
    const child = cpSpawn(process.execPath, [SCRIPT], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    if (child.unref) child.unref();
  } catch { /* ignore — Stop must not block */ }
  pass();
}

try { main(); } catch { pass(); }
