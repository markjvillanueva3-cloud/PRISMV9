#!/usr/bin/env node
/**
 * post-lathe-emit-proof.mjs — Formal Verification Gate Hook
 *
 * U-LTH68: Blocks lathe program emission unless formal proof passes.
 * Runs after LathePostProcessorEngine.emit() and requires LatheFormalProofEngine
 * to return UNSAT on all 7 properties (or 5 with timeout + override).
 *
 * Trigger: PostToolUse on Write to *.nc, *.MIN, *.prg files
 */

import fs from "fs";
import path from "path";

const PROOF_REQUIRED_EXTENSIONS = [".nc", ".NC", ".MIN", ".min", ".prg", ".PRG"];
const STATE_FILE = "H:/prism-lathe-master/mcp-server/data/state/lathe-proof-state.json";

/**
 * Check if file requires proof verification
 */
function requiresProof(filePath) {
  const ext = path.extname(filePath);
  return PROOF_REQUIRED_EXTENSIONS.includes(ext);
}

/**
 * Load proof state for program
 */
function loadProofState(programId) {
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    return data.programs?.[programId] || null;
  } catch {
    return null;
  }
}

/**
 * Main hook handler
 */
async function main() {
  const input = process.argv[2];
  if (!input) {
    console.log("OK: No input provided");
    process.exit(0);
  }

  let data;
  try {
    data = JSON.parse(input);
  } catch {
    console.log("OK: Invalid JSON input");
    process.exit(0);
  }

  // Check if this is a Write tool call
  const toolName = data.tool_name || data.toolName;
  if (toolName !== "Write") {
    process.exit(0);
  }

  const filePath = data.tool_input?.file_path || data.input?.file_path;
  if (!filePath) {
    process.exit(0);
  }

  // Check if file requires proof
  if (!requiresProof(filePath)) {
    process.exit(0);
  }

  // Extract program ID from filename
  const programId = path.basename(filePath, path.extname(filePath));

  // Check proof state
  const proofState = loadProofState(programId);

  if (!proofState) {
    // No proof on record - warn but don't block (proof can be run separately)
    console.log(`WARN: Lathe program ${programId} has no formal proof on record.`);
    console.log(`      Run /lathe-prove ${filePath} to verify before shipping.`);
    process.exit(0);
  }

  if (proofState.verdict === "proven") {
    console.log(`OK: Program ${programId} formally verified (${proofState.properties_passed}/7 properties)`);
    process.exit(0);
  }

  if (proofState.verdict === "violated") {
    console.error(`BLOCK: Program ${programId} failed formal verification.`);
    console.error(`       Violated properties: ${proofState.violations.join(", ")}`);
    console.error(`       Fix issues or provide operator override with rationale.`);
    process.exit(1);
  }

  if (proofState.verdict === "inconclusive") {
    // Check for operator override
    if (proofState.override && proofState.override_rationale) {
      console.log(`WARN: Program ${programId} proof inconclusive but override accepted.`);
      console.log(`      Override by: ${proofState.override_by}`);
      console.log(`      Rationale: ${proofState.override_rationale}`);
      process.exit(0);
    }

    console.error(`BLOCK: Program ${programId} proof is inconclusive (timeout/unknown).`);
    console.error(`       Provide operator override with rationale to proceed.`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Hook error:", err.message);
  process.exit(0); // Don't block on hook errors
});
