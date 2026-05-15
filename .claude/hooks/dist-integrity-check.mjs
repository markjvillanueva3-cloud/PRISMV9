#!/usr/bin/env node
// tier: T2
/**
 * dist-integrity-check.mjs — SessionStart hook (PILLAR-TELEMETRY-RECOVERY-MS0/U-PTR04)
 *
 * Defense-in-depth against the dist-wipe vulnerability that triggered
 * pillar-telemetry rot 2026-05-15:
 *   - 8 zombie MCP procs from 7:26-7:37 AM held stale handles to a dist/
 *     that had been wiped on disk (likely during the 2026-05-12 git history
 *     strip event). All prism_* calls returned ERR_MODULE_NOT_FOUND for chunks
 *     like DispatcherMapEngine-NHPZ54BA.js until a clean rebuild + restart.
 *
 * This hook fires once per session and emits additionalContext when
 * mcp-server/dist/ is missing key artifacts (index.js OR chunks/ subdir empty).
 * The chat operator sees the warning *before* their first prism_* call fails,
 * so they know to run `npm run build:fast` (or have the chat run it).
 *
 * Block contract:
 *   - stdin:  standard SessionStart JSON
 *   - healthy: exit 0, no stdout
 *   - degraded: exit 0 with {"hookSpecificOutput":{"hookEventName":"SessionStart",
 *               "additionalContext":"⚠️ dist integrity: ..."}}
 *
 * This hook never blocks — it's a warning surface, not a gate. A real gate
 * would interfere with rebuild-from-scratch workflows (you can't rebuild dist
 * without first launching a chat to run the rebuild command).
 *
 * Knobs:
 *   PRISM_DIST_INTEGRITY_DISABLE=1   — skip the check entirely
 *   PRISM_DIST_INTEGRITY_MAX_AGE_HRS=N  — warn if dist/index.js mtime > N hours old
 *                                         (default 720 = 30 days; covers active dev)
 *
 * Companion: reference_pillar_telemetry_recovery_ms0.md (U-PTR04 row).
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

// ─── Configuration ───────────────────────────────────────────────────────

const REPO_ROOT = "H:/prism";
const DIST_DIR = join(REPO_ROOT, "mcp-server", "dist");
const DIST_INDEX = join(DIST_DIR, "index.js");
const DIST_CHUNKS = join(DIST_DIR, "chunks");
const NODE_MODULES_ESBUILD = join(REPO_ROOT, "mcp-server", "node_modules", "esbuild");

const DEFAULT_MAX_AGE_HRS = 720; // 30 days
const ENV_DISABLE = "PRISM_DIST_INTEGRITY_DISABLE";
const ENV_MAX_AGE = "PRISM_DIST_INTEGRITY_MAX_AGE_HRS";

// ─── Pure check (testable in isolation) ──────────────────────────────────

/**
 * Inspect a dist directory and return a structured health report.
 * Pure — accepts directory paths so tests can point at fixtures.
 * @param {object} paths
 * @param {string} paths.distDir
 * @param {string} paths.distIndex
 * @param {string} paths.distChunks
 * @param {string} paths.nodeModulesEsbuild
 * @param {number} maxAgeHrs
 * @returns {{healthy: boolean, issues: string[], recommendations: string[], details: Record<string, unknown>}}
 */
export function checkDistIntegrity(paths, maxAgeHrs = DEFAULT_MAX_AGE_HRS) {
  const issues = [];
  const recommendations = [];
  const details = {};

  // 1. dist directory exists?
  if (!existsSync(paths.distDir)) {
    issues.push("dist/ directory missing entirely");
    recommendations.push("cd mcp-server && npm run build:fast");
    details.distDir = "MISSING";
    return { healthy: false, issues, recommendations, details };
  }
  details.distDir = "exists";

  // 2. dist/index.js exists?
  if (!existsSync(paths.distIndex)) {
    issues.push("dist/index.js missing — MCP server cannot boot");
    recommendations.push("cd mcp-server && npm run build:fast");
    details.distIndex = "MISSING";
  } else {
    const st = statSync(paths.distIndex);
    const ageHrs = (Date.now() - st.mtimeMs) / 3600000;
    details.distIndex = {
      size: st.size,
      mtime: st.mtime.toISOString(),
      ageHrs: Math.round(ageHrs * 10) / 10,
    };
    if (st.size === 0) {
      issues.push("dist/index.js is zero bytes");
      recommendations.push("cd mcp-server && npm run build:fast");
    } else if (ageHrs > maxAgeHrs) {
      issues.push(
        `dist/index.js is ${Math.round(ageHrs)}h old (threshold ${maxAgeHrs}h) — likely stale`,
      );
      recommendations.push("cd mcp-server && npm run build:fast");
    }
  }

  // 3. dist/chunks/ exists + non-empty?
  if (!existsSync(paths.distChunks)) {
    issues.push("dist/chunks/ missing — lazy imports will fail");
    recommendations.push("cd mcp-server && npm run build:fast");
    details.distChunks = "MISSING";
  } else {
    try {
      const entries = readdirSync(paths.distChunks);
      details.distChunks = { fileCount: entries.length };
      if (entries.length === 0) {
        issues.push("dist/chunks/ is empty — lazy imports will fail");
        recommendations.push("cd mcp-server && npm run build:fast");
      }
    } catch (err) {
      issues.push(`dist/chunks/ unreadable: ${err instanceof Error ? err.message : String(err)}`);
      details.distChunks = "UNREADABLE";
    }
  }

  // 4. node_modules/esbuild present? (required to rebuild if dist is wiped)
  if (!existsSync(paths.nodeModulesEsbuild)) {
    issues.push("node_modules/esbuild missing — rebuild will fail until npm ci runs");
    recommendations.push("cd mcp-server && npm ci --prefer-offline");
    details.esbuild = "MISSING";
  } else {
    details.esbuild = "exists";
  }

  return {
    healthy: issues.length === 0,
    issues,
    recommendations,
    details,
  };
}

/**
 * Format a degraded report as the additionalContext block we inject into
 * the SessionStart context. Plain markdown — no ANSI escapes, no emoji-only
 * lines that get lost in a log search.
 */
export function formatDegradedContext(report) {
  const lines = [];
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("⚠️  DIST INTEGRITY DEGRADED — MCP dispatchers will fail until fixed");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push("Issues detected:");
  for (const issue of report.issues) {
    lines.push(`  • ${issue}`);
  }
  lines.push("");
  if (report.recommendations.length > 0) {
    const unique = [...new Set(report.recommendations)];
    lines.push("Recommended fix (run in order):");
    for (const rec of unique) {
      lines.push(`  $ ${rec}`);
    }
    lines.push("");
  }
  lines.push("This is the same rot class that triggered PILLAR-TELEMETRY-RECOVERY-MS0");
  lines.push("on 2026-05-15 — see reference_pillar_telemetry_recovery_ms0.md for the full");
  lines.push("history. Disable this check with PRISM_DIST_INTEGRITY_DISABLE=1.");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  return lines.join("\n");
}

// ─── Hook entry point ────────────────────────────────────────────────────

async function main() {
  // Read stdin (SessionStart JSON), but we don't actually need it — the check
  // is filesystem-bound, not session-bound. Drain to avoid SIGPIPE.
  try {
    for await (const _ of process.stdin) {
      // intentional drain
    }
  } catch {
    // stdin may be closed already (e.g. when invoked manually)
  }

  // Honor the disable knob
  if (process.env[ENV_DISABLE] === "1") {
    process.exit(0);
  }

  // Parse the max-age knob; fall back to default on invalid input
  const envMaxAge = process.env[ENV_MAX_AGE];
  const parsedMaxAge = envMaxAge ? Number.parseFloat(envMaxAge) : NaN;
  const maxAgeHrs = Number.isFinite(parsedMaxAge) && parsedMaxAge > 0 ? parsedMaxAge : DEFAULT_MAX_AGE_HRS;

  const report = checkDistIntegrity(
    {
      distDir: DIST_DIR,
      distIndex: DIST_INDEX,
      distChunks: DIST_CHUNKS,
      nodeModulesEsbuild: NODE_MODULES_ESBUILD,
    },
    maxAgeHrs,
  );

  if (report.healthy) {
    process.exit(0);
  }

  const additionalContext = formatDegradedContext(report);
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext,
      },
    }),
  );
  process.exit(0);
}

// Only run as hook when invoked directly (skip when imported by tests)
const isMain = import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop() || "");
if (isMain) {
  main().catch((err) => {
    // Never block SessionStart on hook crashes — log to stderr + exit 0
    process.stderr.write(`[dist-integrity-check] crashed: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(0);
  });
}
