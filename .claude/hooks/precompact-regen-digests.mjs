#!/usr/bin/env node
// tier: T4
/**
 * precompact-regen-digests.mjs -- regenerate the 4 canonical reference digests on /compact
 *
 * .claude/helpers/regen-digests.mjs rebuilds ENGINE_DIGEST + DISPATCHER_DIGEST +
 * DIRECTORY_DIGEST + MASTER_INDEX_COMPACT in ~0.4s. It was DESIGNED to run as a
 * PreCompact hook ("Designed to run in <=10s as a PreCompact hook") but was never
 * wired, so the digests silently rotted (ENGINE_DIGEST sat a month stale at 3217 vs
 * 3832 live engines until U-DIGEST-REFRESH d4d0b49a77). This wrapper runs the helper
 * as a PreCompact side effect and emits a schema-valid hook response -- the helper's
 * own stdout ({"digestsRegenerated":true}) fails hook-JSON validation if wired raw
 * (the same failure precompact-memo-emit hit 2026-06-18).
 *
 * Fail-safe by construction: ALWAYS returns {continue:true}. A regen failure, timeout,
 * or missing helper NEVER blocks a compact -- worst case the digests are simply not
 * refreshed on that compact (the pre-2026-06-18 status quo).
 *
 * Disable: PRISM_REGEN_DIGESTS_PRECOMPACT_DISABLE=1
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const HELPER = join(HERE, "..", "helpers", "regen-digests.mjs");
const TIMEOUT_MS = Number(process.env.PRISM_REGEN_DIGESTS_PRECOMPACT_TIMEOUT_MS) || 20000;

/**
 * Pure decision core (spawn + exists injected for tests). Returns a valid
 * PreCompact hook response object. Never throws.
 */
export function runRegen({ spawn = spawnSync, exists = existsSync, env = process.env, helper = HELPER } = {}) {
  if (env.PRISM_REGEN_DIGESTS_PRECOMPACT_DISABLE === "1") {
    return { continue: true, suppressOutput: true };
  }
  if (!exists(helper)) {
    return {
      continue: true,
      suppressOutput: true,
      systemMessage: "regen-digests: helper not found (digests not refreshed)",
    };
  }
  try {
    const r = spawn(process.execPath, [helper, "--quiet"], { windowsHide: true,
      timeout: TIMEOUT_MS,
      stdio: ["ignore", "ignore", "ignore"],
    });
    if (r && r.status === 0) {
      return { continue: true, suppressOutput: true };
    }
    return {
      continue: true,
      suppressOutput: true,
      systemMessage: "regen-digests: non-zero exit (digests may be stale)",
    };
  } catch {
    // Fail-safe: a spawn error must never block the compact.
    return { continue: true, suppressOutput: true };
  }
}

const __isMain = import.meta.url === pathToFileURL(process.argv[1] || "").href;
if (__isMain) {
  // Drain stdin best-effort (hook contract); never depend on or block on it.
  try {
    readFileSync(0, "utf-8");
  } catch {
    /* no stdin -- fine */
  }
  console.log(JSON.stringify(runRegen()));
  process.exit(0);
}
