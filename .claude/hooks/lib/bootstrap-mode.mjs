// tier: T1
/**
 * Bootstrap Mode — shared lib for Phase 0.16 U-OP1 BOOTSTRAP_MODE.flag readers
 *
 * When H:/prism/state/shared/BOOTSTRAP_MODE.flag exists and has active:true,
 * enforcement hooks (0.1 PreTool dedup, 0.13 awareness gate, 0.14 SVI gate,
 * 0.15 managed-block guard) must degrade from BLOCK to WARN-ONLY — otherwise
 * the Phase 0 stack bootstrap-deadlocks: it can't bring itself up if its own
 * gates reject the provisioning writes.
 *
 * Callers:
 *   import { isBootstrapActive, isDowngradedGate } from "./lib/bootstrap-mode.mjs";
 *   if (isBootstrapActive() && isDowngradedGate("0.1")) {
 *     outputWarnOnly("would have blocked X — bootstrap mode warn-only");
 *     return;
 *   }
 *
 * The flag is auto-removed by scripts/phase-0-11-exit-gate.ts after
 * retrofit + 30/30 regression + 100 boot telemetry pass (see flag JSON).
 */

import { promises as fs } from "node:fs";
import { readFileSync, existsSync } from "node:fs";

const FLAG_PATH = "H:/prism/state/shared/BOOTSTRAP_MODE.flag";

let cachedFlag = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5000;

function readFlagSync() {
  const now = Date.now();
  if (cachedFlag !== null && now - cachedAt < CACHE_TTL_MS) {
    return cachedFlag;
  }
  try {
    if (!existsSync(FLAG_PATH)) {
      cachedFlag = { active: false };
      cachedAt = now;
      return cachedFlag;
    }
    const raw = readFileSync(FLAG_PATH, "utf8");
    cachedFlag = JSON.parse(raw);
    cachedAt = now;
    return cachedFlag;
  } catch {
    cachedFlag = { active: false };
    cachedAt = now;
    return cachedFlag;
  }
}

/** true iff flag file exists and .active === true */
export function isBootstrapActive() {
  return readFlagSync().active === true;
}

/** Returns the parsed flag object (or {active:false} on miss/err) */
export function readBootstrapFlag() {
  return readFlagSync();
}

/**
 * Is a specific phase/gate downgraded to warn-only?
 * Matches flag.downgradedGates[].phase — e.g. "0.1", "0.13", "0.14", "0.15".
 */
export function isDowngradedGate(phaseId) {
  const flag = readFlagSync();
  if (!flag.active) return false;
  const gates = Array.isArray(flag.downgradedGates) ? flag.downgradedGates : [];
  return gates.some((g) => g.phase === phaseId);
}

/**
 * Emit a PreToolUse allow-with-warning envelope. Hook callers use this in
 * place of outputBlock() during bootstrap so the write proceeds but the
 * reason is surfaced in Claude's system reminder stream.
 */
export function outputWarnOnly(reason, { phase = "unknown" } = {}) {
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: `⚠️ BOOTSTRAP WARN-ONLY (${phase}): ${reason}`,
    },
  };
  console.log(JSON.stringify(output));
  process.exit(0);
}

/** Async variant for hooks that haven't yet awaited anything. */
export async function isBootstrapActiveAsync() {
  try {
    const raw = await fs.readFile(FLAG_PATH, "utf8");
    const flag = JSON.parse(raw);
    return flag.active === true;
  } catch {
    return false;
  }
}
