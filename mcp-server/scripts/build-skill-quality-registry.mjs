#!/usr/bin/env node
/**
 * build-skill-quality-registry.mjs — U-SKU06 (SKILLS-UTILIZATION-MS0) populator.
 *
 * Walks every PRISM skill location (user `~/.claude/{commands,skills,plugins}`,
 * project `.claude/{commands,skills}`, `mcp-server/skills`, `skills-consolidated`)
 * and writes `state/shared/registries/SKILL_QUALITY_REGISTRY.json` — the
 * machine-readable "master document tracking all your Skills, their status, and
 * their last refinement date" from @eng_khairallah1 Phase-4.
 *
 * This is the thin CLI wrapper; all the logic lives in
 * `mcp-server/src/registries/SkillQualityRegistryBuilder.ts` (loaded via tsx so
 * we don't need a `dist/` build first — esbuild bundles to a single chunked
 * `dist/index.js` that does not re-export this builder individually).
 *
 * Usage:
 *   node mcp-server/scripts/build-skill-quality-registry.mjs            # build + write
 *   node mcp-server/scripts/build-skill-quality-registry.mjs --dry-run  # build, print summary, do not write
 *   node mcp-server/scripts/build-skill-quality-registry.mjs --json     # machine-readable summary on stdout
 *
 * Exit code: 0 on success, 1 on hard failure (no roots found at all / write error).
 *
 * @module scripts/build-skill-quality-registry
 */

import { register } from "tsx/esm/api";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || args.includes("--no-write");
const asJson = args.includes("--json");

// Register tsx's ESM loader so we can `import("../src/.../*.ts")` directly.
// (`tsx` resolves from this file's nearest node_modules — i.e. mcp-server/node_modules.)
const unregister = register();
let exitCode = 0;
try {
  const { buildSkillQualityRegistry, SKILL_QUALITY_REGISTRY_PATH, SKILL_QUALITY_PARSE_FAILURES_PATH } = await import(
    "../src/registries/SkillQualityRegistryBuilder.ts"
  );

  const summary = await buildSkillQualityRegistry({ write: !dryRun });

  if (summary.missingRoots.length > 0 && summary.total === 0) {
    // Every root we know about was absent — that's a real failure, not "0 skills".
    console.error(
      `[build-skill-quality-registry] ERROR: no skill roots found on disk (checked ${summary.missingRoots.length}):\n  ` +
        summary.missingRoots.join("\n  "),
    );
    exitCode = 1;
  }

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          ...summary,
          registryPath: dryRun ? null : SKILL_QUALITY_REGISTRY_PATH,
          parseFailuresPath: dryRun ? null : SKILL_QUALITY_PARSE_FAILURES_PATH,
          dryRun,
        },
        null,
        2,
      ),
    );
  } else {
    const tierLine = Object.entries(summary.byTier)
      .map(([t, n]) => `${t}=${n}`)
      .join(" · ");
    console.log(
      `[build-skill-quality-registry] ${summary.total} skills (${tierLine}) · ${summary.parseFailures} parse failure(s)` +
        (summary.missingRoots.length ? ` · ${summary.missingRoots.length} root(s) absent` : ""),
    );
    if (dryRun) {
      console.log("[build-skill-quality-registry] --dry-run: registry NOT written.");
    } else {
      console.log(`[build-skill-quality-registry] → ${SKILL_QUALITY_REGISTRY_PATH}`);
      if (summary.parseFailures > 0) {
        console.log(`[build-skill-quality-registry] → ${SKILL_QUALITY_PARSE_FAILURES_PATH} (${summary.parseFailures})`);
      }
    }
  }
} catch (e) {
  console.error(`[build-skill-quality-registry] FAILED: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
  exitCode = 1;
} finally {
  unregister();
}
process.exit(exitCode);
