#!/usr/bin/env npx tsx
/**
 * Pre-Build Enforcement Script
 *
 * Runs extraction pipeline enforcement checks before build.
 * Blocks build if:
 *   - Extraction files haven't been ingested
 *   - Ingestion is stale (> 7 days)
 *   - Workflow templates are missing
 *   - Engine wiring is incomplete
 *
 * Exit codes:
 *   0 = All checks passed
 *   1 = Enforcement failed (build should be blocked)
 *   2 = Auto-fix attempted
 *
 * Usage:
 *   npx tsx scripts/pre-build-enforce.ts
 *   npx tsx scripts/pre-build-enforce.ts --auto-fix
 *   npx tsx scripts/pre-build-enforce.ts --skip (bypass enforcement)
 *
 * @module scripts/pre-build-enforce
 */

import { enforceExtractionPipeline, autoFixIngestion } from "../src/hooks/extractionEnforcementHooks.js";

const SKIP_FLAG = process.argv.includes("--skip") || process.env.SKIP_EXTRACTION_ENFORCE === "1";
const AUTO_FIX_FLAG = process.argv.includes("--auto-fix") || process.env.AUTO_FIX_EXTRACTION === "1";

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║       PRE-BUILD EXTRACTION ENFORCEMENT                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  if (SKIP_FLAG) {
    console.log("⚠️  SKIP_EXTRACTION_ENFORCE=1 — Enforcement bypassed");
    console.log("   This should only be used in emergencies.\n");
    process.exit(0);
  }

  const result = await enforceExtractionPipeline({
    operation: "build",
    phase: "pre",
  });

  if (result.passed) {
    console.log("✅ All extraction pipeline checks passed\n");
    process.exit(0);
  }

  console.log("❌ BLOCKED by:", result.blocker);
  console.log("   Reason:", result.reason);
  console.log("");

  if (result.pending_actions) {
    console.log("Required actions:");
    for (const action of result.pending_actions) {
      console.log("  →", action);
    }
    console.log("");
  }

  if (result.auto_fix_available && AUTO_FIX_FLAG) {
    console.log("🔧 Auto-fix enabled, attempting to fix...\n");

    const fixResult = await autoFixIngestion();

    if (fixResult.fixed) {
      console.log(`✅ Auto-fix successful: ${fixResult.items_ingested} items ingested`);
      console.log("   Re-running enforcement check...\n");

      const recheck = await enforceExtractionPipeline({
        operation: "build",
        phase: "pre",
      });

      if (recheck.passed) {
        console.log("✅ All checks now pass. Build can proceed.\n");
        process.exit(0);
      } else {
        console.log("❌ Still blocked after auto-fix:", recheck.reason);
        process.exit(1);
      }
    } else {
      console.log("❌ Auto-fix failed:", fixResult.error);
      process.exit(1);
    }
  }

  if (result.auto_fix_available) {
    console.log("💡 Tip: Run with --auto-fix to attempt automatic resolution\n");
  }

  console.log("Build blocked. Fix the issues above and try again.\n");
  process.exit(1);
}

main().catch((err) => {
  console.error("Enforcement check failed:", err);
  process.exit(1);
});
