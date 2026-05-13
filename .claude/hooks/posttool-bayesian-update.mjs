#!/usr/bin/env node
// tier: T4
/**
 * posttool-bayesian-update.mjs — U-AI02 Bayesian Posterior Update
 *
 * Reads predictions from WORLD_SIM_PREDICTIONS.jsonl, compares to actual
 * tool outcomes, and updates the posterior in BANDIT_POSTERIOR.json.
 *
 * Closes the prediction-actual loop for calibration.
 * Target: calibration error ≤5% after 100 observations.
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
const POSTERIOR_FILE = "H:/prism/mcp-server/data/state/WORLD_SIM_CALIBRATION.json";
const MAX_PREDICTION_AGE_MS = 30000; // 30 seconds

function loadPosterior() {
  try {
    if (fs.existsSync(POSTERIOR_FILE)) {
      return JSON.parse(fs.readFileSync(POSTERIOR_FILE, "utf-8"));
    }
  } catch {
    // Start fresh
  }
  return {
    schemaVersion: 1,
    algorithm: "thompson",
    arms: {
      write_success: { alpha: 1, beta: 1, pulls: 0 },
      write_fail: { alpha: 1, beta: 1, pulls: 0 },
      edit_success: { alpha: 1, beta: 1, pulls: 0 },
      edit_fail: { alpha: 1, beta: 1, pulls: 0 },
      bash_success: { alpha: 1, beta: 1, pulls: 0 },
      bash_fail: { alpha: 1, beta: 1, pulls: 0 },
    },
    calibration: {
      totalPredictions: 0,
      correctPredictions: 0,
      calibrationError: 0,
      lastUpdate: null,
    },
    history: [],
  };
}

function savePosterior(posterior) {
  try {
    const dir = path.dirname(POSTERIOR_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(POSTERIOR_FILE, JSON.stringify(posterior, null, 2));
  } catch {
    // Ignore save errors
  }
}

function findRecentPrediction(toolName, inputSummary) {
  try {
    if (!fs.existsSync(PREDICTIONS_FILE)) return null;

    const content = fs.readFileSync(PREDICTIONS_FILE, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    // Search from most recent
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const pred = JSON.parse(lines[i]);
        const predTime = new Date(pred.timestamp).getTime();
        const age = Date.now() - predTime;

        if (age > MAX_PREDICTION_AGE_MS) break; // Too old

        if (pred.tool === toolName && pred.outcome === null) {
          return { prediction: pred, lineIndex: i };
        }
      } catch {
        continue;
      }
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

function updatePredictionOutcome(lineIndex, outcome) {
  try {
    const content = fs.readFileSync(PREDICTIONS_FILE, "utf-8");
    const lines = content.trim().split("\n");

    if (lineIndex >= 0 && lineIndex < lines.length) {
      const pred = JSON.parse(lines[lineIndex]);
      pred.outcome = outcome;
      lines[lineIndex] = JSON.stringify(pred);
      fs.writeFileSync(PREDICTIONS_FILE, lines.join("\n") + "\n");
    }
  } catch {
    // Ignore update errors
  }
}

function updateBayesianPosterior(posterior, toolName, predicted, actual) {
  const armKey = `${toolName.toLowerCase()}_${actual ? "success" : "fail"}`;

  if (!posterior.arms[armKey]) {
    posterior.arms[armKey] = { alpha: 1, beta: 1, pulls: 0 };
  }

  const arm = posterior.arms[armKey];
  arm.pulls++;

  // Thompson sampling update: success adds to alpha, failure adds to beta
  if (actual) {
    arm.alpha++;
  } else {
    arm.beta++;
  }

  // Update calibration stats
  const predictedSuccess = predicted.willSucceed >= 0.5;
  const isCorrect = predictedSuccess === actual;

  posterior.calibration.totalPredictions++;
  if (isCorrect) {
    posterior.calibration.correctPredictions++;
  }

  // Calculate calibration error (Brier score approximation)
  const accuracy = posterior.calibration.correctPredictions / posterior.calibration.totalPredictions;
  posterior.calibration.calibrationError = 1 - accuracy;
  posterior.calibration.lastUpdate = new Date().toISOString();

  // Keep recent history (last 50)
  posterior.history.push({
    tool: toolName,
    predicted: predicted.willSucceed,
    actual: actual,
    correct: isCorrect,
    timestamp: new Date().toISOString(),
  });
  if (posterior.history.length > 50) {
    posterior.history = posterior.history.slice(-50);
  }

  return posterior;
}

async function main() {
  // Read stdin
  const input = readStdinSafe();

  let data;
  try {
    data = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const toolName = data.tool_name || "";
  const toolResponse = data.tool_response || {};

  // Skip read-only tools
  if (["Read", "Glob", "Grep", "LS"].includes(toolName)) {
    process.exit(0);
  }

  // Determine actual outcome
  const isSuccess = !toolResponse.error && toolResponse.success !== false;

  // Find matching prediction
  const match = findRecentPrediction(toolName, JSON.stringify(data.tool_input || {}).slice(0, 200));

  if (match) {
    // Update prediction with outcome
    updatePredictionOutcome(match.lineIndex, isSuccess);

    // Update Bayesian posterior
    const posterior = loadPosterior();
    const updated = updateBayesianPosterior(posterior, toolName, match.prediction, isSuccess);
    savePosterior(updated);

    // Output calibration status if error is high
    if (updated.calibration.calibrationError > 0.1 && updated.calibration.totalPredictions > 20) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `[Bayesian] Calibration drift: ${(updated.calibration.calibrationError * 100).toFixed(1)}% error over ${updated.calibration.totalPredictions} predictions`,
        },
      }));
      return;
    }
  }

  // Normal exit - no output needed
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: "",
    },
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
