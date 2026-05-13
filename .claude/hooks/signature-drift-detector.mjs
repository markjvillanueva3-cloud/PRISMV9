// tier: T3
/**
 * signature-drift-detector.mjs — Phase 0.8 Signature Drift Hook
 *
 * PostToolUse hook that fires after Write/Edit on engine files.
 * Compares new content hash to previous signature and warns callers
 * if significant changes detected.
 *
 * @phase Universal 0.8 — Rename/Delete/Impact Protocol
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = process.env.PRISM_ROOT || "H:/prism/mcp-server";
const SIGNATURE_PATH = path.join(ROOT, "data/state/SIGNATURE_HASH_INDEX.json");
const ENGINE_USAGE_PATH = path.join(ROOT, "data/state/ENGINE_USAGE_INDEX.json");

function computeHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function normalizeContent(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function signatureDriftDetector(params) {
  const { tool_name, tool_input, tool_result } = params;

  // Only check Write/Edit on engine files
  if (tool_name !== "Write" && tool_name !== "Edit") {
    return;
  }

  const filePath = tool_input?.file_path || "";

  // Only monitor engine files
  if (!filePath.includes("/engines/") && !filePath.includes("\\engines\\")) {
    return;
  }

  // Extract engine name
  const match = filePath.match(/[/\\]engines[/\\]([A-Za-z0-9_]+)\.ts$/);
  if (!match) {
    return;
  }

  const engineName = match[1];

  // Read current file content
  let currentContent;
  try {
    currentContent = fs.readFileSync(filePath, "utf-8");
  } catch {
    return; // File doesn't exist yet
  }

  const newFullHash = computeHash(currentContent);
  const newNormalizedHash = computeHash(normalizeContent(currentContent));

  // Compare to previous signature
  try {
    if (!fs.existsSync(SIGNATURE_PATH)) {
      return;
    }

    const sigIndex = JSON.parse(fs.readFileSync(SIGNATURE_PATH, "utf-8"));
    const prevSig = sigIndex.signatures?.[engineName];

    if (!prevSig) {
      console.log(`[signature-drift] New engine detected: ${engineName}`);
      return;
    }

    const fullHashChanged = prevSig.fullHash !== newFullHash;
    const normalizedHashChanged = prevSig.normalizedHash !== newNormalizedHash;

    if (!fullHashChanged) {
      return; // No changes
    }

    // Signature changed — check for callers
    let callers = [];
    try {
      if (fs.existsSync(ENGINE_USAGE_PATH)) {
        const usageIndex = JSON.parse(fs.readFileSync(ENGINE_USAGE_PATH, "utf-8"));
        const usage = usageIndex.engines?.[engineName];
        if (usage) {
          callers = [
            ...(usage.dispatchers || []).map((d) => `dispatcher:${d}`),
            ...(usage.skills || []).map((s) => `skill:${s}`),
          ];
        }
      }
    } catch {
      // Ignore
    }

    if (normalizedHashChanged) {
      // Significant change (not just whitespace/comments)
      console.log(`[signature-drift] SIGNIFICANT change to ${engineName}`);
      console.log(`  Previous hash: ${prevSig.fullHash}`);
      console.log(`  New hash:      ${newFullHash}`);
      console.log(`  Normalized hash also changed — logic modifications detected`);

      if (callers.length > 0) {
        console.log(`  Callers to verify: ${callers.slice(0, 5).join(", ")}${callers.length > 5 ? ` (+${callers.length - 5} more)` : ""}`);
      }
    } else {
      // Whitespace/comment only change
      console.log(`[signature-drift] Minor change to ${engineName} (whitespace/comments only)`);
    }

  } catch (err) {
    console.log(`[signature-drift] Error checking signature: ${err.message}`);
  }
}
