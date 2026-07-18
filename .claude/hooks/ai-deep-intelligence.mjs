#!/usr/bin/env node
// tier: T2
/**
 * ai-deep-intelligence.mjs — SessionStart hook (pointer mode by default).
 *
 * History (2026-05-19, [GOLF]/U-WAVE2): this hook used to emit ~4.4KB of
 * static reference text on every SessionStart. The counts were stale (said
 * 2,495 engines, actual is 3,284) and there was no regen — pure injection.
 * That injection bloat compounded with /compact resumes (every /compact
 * fires SessionStart again → re-floods the post-compact context window) and
 * was the load-bearing line item in the 2026-05-11 handoff/compact analysis.
 *
 * Now: the static body lives at state/shared/AI-DEEP-INTELLIGENCE-REFERENCE.md
 * (extracted 2026-05-19) and this hook emits a 5-line pointer instead. Agents
 * Read the file on demand when they need the reference card. ~95% injection
 * savings per SessionStart.
 *
 * Knobs:
 *   PRISM_AI_DEEP_INTEL_MODE=full      restore the legacy full inject (in-context)
 *   PRISM_AI_DEEP_INTEL_MODE=pointer   default — emit 5-line pointer (this file)
 *   PRISM_AI_DEEP_INTEL_MODE=silent    emit nothing
 *
 * The reference file is checked-in static content. To refresh counts or
 * rules, edit state/shared/AI-DEEP-INTELLIGENCE-REFERENCE.md directly OR
 * regenerate from live sources via PRISM-INVENTORY-LATEST.md + BUILD_STATE.md.
 */

import { existsSync } from "node:fs";

const REPO_ROOT = "H:/prism";
const REFERENCE_FILE = `${REPO_ROOT}/state/shared/AI-DEEP-INTELLIGENCE-REFERENCE.md`;

// The reference file is a STATIC snapshot (extracted 2026-05-19). It has no
// auto-regen — counts in it will rot. The pointer text below intentionally
// does NOT emit a freshness-age badge because operators would misread it as
// alarming for a file that's supposed to be old. To refresh the reference
// content, edit state/shared/AI-DEEP-INTELLIGENCE-REFERENCE.md directly
// (cite live sources: PRISM-INVENTORY-LATEST.md + BUILD_STATE.md + extraction-log.json).
function buildPointer() {
  const exists = existsSync(REFERENCE_FILE);
  if (!exists) {
    return [
      "⚠ AI Deep Intelligence reference card missing.",
      `  Expected: ${REFERENCE_FILE}`,
      "  Restore from git (commit 64d1793dc4 + WAVE2) or rebuild by extracting from PRISM-INVENTORY-LATEST.md + BUILD_STATE.md + extraction-log.json.",
    ].join("\n");
  }
  return [
    "## 🧠 PRISM AI Deep Intelligence — reference card on disk (Wave 2 pointer mode)",
    "   📍 `state/shared/AI-DEEP-INTELLIGENCE-REFERENCE.md` — STATIC snapshot of engines · reasoning modes · slash commands · mandatory rules · extracted sources",
    "   For LIVE counts always prefer: `PRISM-INVENTORY-LATEST.md` + `state/shared/BUILD_STATE.md` + `mcp-server/data/state/extraction-log.json`",
    "   Restore legacy in-context inject: `PRISM_AI_DEEP_INTEL_MODE=full`. Silence entirely: `=silent`.",
  ].join("\n");
}

async function generateLegacyFull() {
  // Legacy escape hatch: if PRISM_AI_DEEP_INTEL_MODE=full, read the reference
  // file and inject its body directly. This is the SAME content the hook used
  // to hardcode — but now sourced from a file so edits propagate.
  try {
    const { readFileSync } = await import("node:fs");
    if (!existsSync(REFERENCE_FILE)) {
      return `⚠ AI Deep Intelligence: PRISM_AI_DEEP_INTEL_MODE=full requested but ${REFERENCE_FILE} missing.`;
    }
    return readFileSync(REFERENCE_FILE, "utf8");
  } catch (e) {
    return `⚠ AI Deep Intelligence legacy-full inject failed: ${e.message}`;
  }
}

async function main() {
  const mode = String(process.env.PRISM_AI_DEEP_INTEL_MODE || "pointer").toLowerCase();
  if (mode === "silent") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const body = mode === "full" ? await generateLegacyFull() : buildPointer();
  process.stdout.write(JSON.stringify({ continue: true, systemMessage: body }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
