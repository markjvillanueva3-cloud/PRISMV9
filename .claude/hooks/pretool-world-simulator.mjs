#!/usr/bin/env node
// tier: T4
/**
 * pretool-world-simulator.mjs — U-AI01 WorldSimulator PreTool Hook
 * PP-0.18 U-AGI9
 *
 * Predicts tool outcomes before execution using PredictiveWorldSimulatorEngine.
 * Logs predictions to WORLD_SIM_PREDICTIONS.jsonl for PostTool calibration.
 *
 * Latency budget: ≤300ms (falls back to proceed on timeout)
 * Target accuracy: ≥60% over ≥200 calls
 */

import * as fs from "fs";
import * as path from "path";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const PREDICTIONS_FILE = "H:/prism/mcp-server/data/state/WORLD_SIM_PREDICTIONS.jsonl";
const TIMEOUT_MS = 200; // Conservative to stay under 300ms budget
const CRITICAL_FILES = [
  "src/physics/constants.ts",
  "src/registries/",
  "CLAUDE.md",
  "package.json",
  "tsconfig.json",
];

/**
 * Simplified in-hook predictor (avoids TypeScript import overhead).
 * Full PredictiveWorldSimulatorEngine can be called via MCP for complex cases.
 */
function predictOutcome(toolName, toolInput) {
  const predictions = {
    willSucceed: 0.8,
    risk: "low",
    warnings: [],
    likelyAffected: [],
  };

  // Analyze based on tool type
  if (toolName === "Write" || toolName === "Edit") {
    const filePath = toolInput.file_path || "";
    const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();

    // Check critical files
    for (const critical of CRITICAL_FILES) {
      if (normalizedPath.includes(critical.toLowerCase())) {
        predictions.willSucceed *= 0.7;
        predictions.risk = "high";
        predictions.warnings.push(`Touches critical file: ${critical}`);
      }
    }

    // Check file extension for test likelihood
    if (normalizedPath.includes("__tests__") || normalizedPath.endsWith(".test.ts")) {
      predictions.likelyAffected.push("test suite");
    }

    // Large edits are riskier
    if (toolInput.content && toolInput.content.length > 5000) {
      predictions.willSucceed *= 0.9;
      predictions.risk = predictions.risk === "low" ? "medium" : predictions.risk;
      predictions.warnings.push("Large content change (>5KB)");
    }
  } else if (toolName === "Bash") {
    const command = toolInput.command || "";

    // Dangerous commands
    if (command.includes("rm -rf") || command.includes("--force")) {
      predictions.willSucceed *= 0.85;
      predictions.risk = "high";
      predictions.warnings.push("Destructive command detected");
    }

    // Git commands with risk
    if (command.includes("git push") || command.includes("git reset")) {
      predictions.willSucceed *= 0.9;
      predictions.risk = "medium";
      predictions.warnings.push("Git operation with side effects");
    }

    // Build commands - usually safe
    if (command.includes("npm run build") || command.includes("vitest")) {
      predictions.willSucceed = 0.95;
    }
  }

  // Clamp probability
  predictions.willSucceed = Math.max(0.1, Math.min(0.99, predictions.willSucceed));

  return predictions;
}

function logPrediction(prediction) {
  try {
    const dir = path.dirname(PREDICTIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(PREDICTIONS_FILE, JSON.stringify(prediction) + "\n");
  } catch {
    // Ignore logging errors - don't block tool execution
  }
}

async function main() {
  const startTime = Date.now();

  // Read stdin
  const input = readStdinSafe();

  let data;
  try {
    data = JSON.parse(input);
  } catch {
    // Invalid input - proceed without prediction
    process.exit(0);
  }

  const toolName = data.tool_name || "";
  const toolInput = data.tool_input || {};

  // Skip prediction for read-only tools
  if (["Read", "Glob", "Grep", "LS"].includes(toolName)) {
    process.exit(0);
  }

  // Run prediction with timeout
  const prediction = {
    id: `pred-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    tool: toolName,
    inputSummary: JSON.stringify(toolInput).slice(0, 200),
    ...predictOutcome(toolName, toolInput),
    latencyMs: 0,
    outcome: null, // Filled by PostTool hook
  };

  prediction.latencyMs = Date.now() - startTime;

  // Log prediction for PostTool calibration
  logPrediction(prediction);

  // Check latency budget
  if (prediction.latencyMs > TIMEOUT_MS) {
    // Exceeded budget - just proceed
    process.exit(0);
  }

  // Output decision
  const output = {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: "",
    },
  };

  // Only inject context for high-risk predictions
  if (prediction.risk === "high" && prediction.warnings.length > 0) {
    output.hookSpecificOutput.additionalContext = `[WorldSim] Risk: ${prediction.risk} | Warnings: ${prediction.warnings.join("; ")} | P(success): ${(prediction.willSucceed * 100).toFixed(0)}%`;
  }

  // Don't block - just provide advisory context
  console.log(JSON.stringify(output));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
