#!/usr/bin/env node
/**
 * dedup-detect.mjs — Detect creation intent and inject dedup warning
 *
 * Runs on UserPromptSubmit. Scans the prompt for creation keywords and
 * injects a warning to check for duplicates before proceeding.
 *
 * This is the automation that CLAUDE.md claims exists but didn't.
 */

import fs from "node:fs";

const CREATION_PATTERNS = [
  /\b(create|build|add|implement|make|write|develop)\s+(a\s+)?(new\s+)?(engine|algorithm|formula|dispatcher|action|hook|skill)/i,
  /\bnew\s+(engine|algorithm|formula|dispatcher|action|hook|skill)/i,
  /\b(engine|algorithm|formula)\s+for\b/i,
  /\bforge[\s-]+(engine|triple)/i,
];

const EXTRACTION_PATTERNS = [
  /\b(extract|harvest|import|ingest|parse)\s+(from\s+)?(pdf|video|document|manual|catalog)/i,
  /\bpdf[\s-]?learn/i,
  /\bvideo[\s-]?learn/i,
];

function main() {
  let input = "";

  // Read stdin (the prompt)
  try {
    input = fs.readFileSync(0, "utf-8");
    const parsed = JSON.parse(input);
    input = parsed.prompt || parsed.content || parsed.message || "";
  } catch {
    // If not JSON, use raw input
  }

  if (!input || input.length < 5) {
    // No meaningful input
    return;
  }

  const isCreation = CREATION_PATTERNS.some(p => p.test(input));
  const isExtraction = EXTRACTION_PATTERNS.some(p => p.test(input));

  if (isCreation) {
    const warning = [
      "## DUPLICATION CHECK REQUIRED",
      "",
      "You mentioned creating a new asset. BEFORE proceeding:",
      "",
      "1. **RUN /dedup** — Check if this already exists",
      "2. **Search ENGINE_DIGEST.md** — 1,559 engines already exist",
      "3. **Check FormulaRegistry** — 499 formulas registered",
      "4. **Use existing engines** — Don't rebuild what exists",
      "",
      "DuplicationGuardEngine.checkBeforeCreating() will BLOCK duplicates.",
      "If you skip this check and create a duplicate, the build will fail.",
    ].join("\n");

    console.log(JSON.stringify({
      systemMessage: "Duplication check required — see context",
      additionalContext: warning,
    }));
    return;
  }

  if (isExtraction) {
    // Check extraction log for already-extracted sources
    let alreadyExtracted = [];
    try {
      const log = JSON.parse(fs.readFileSync("H:/prism/mcp-server/data/state/extraction-log.json", "utf-8"));
      if (log.extractions) {
        alreadyExtracted = log.extractions
          .filter(e => e.status === "completed")
          .slice(-10)
          .map(e => e.source || e.name);
      }
    } catch { /* no log */ }

    const warning = [
      "## EXTRACTION CHECK REQUIRED",
      "",
      "You mentioned extracting content. Check these first:",
      "",
      "1. **extraction-log.json** — Don't re-extract completed sources",
      "2. **DuplicationGuardEngine.mustNotReExtract(sourceId)** — Will throw if already done",
      "",
      alreadyExtracted.length > 0 ? `Recent extractions: ${alreadyExtracted.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    console.log(JSON.stringify({
      additionalContext: warning,
    }));
    return;
  }

  // No creation/extraction detected
}

main();
