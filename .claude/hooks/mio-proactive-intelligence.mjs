#!/usr/bin/env node
// tier: T3
/**
 * MIO Proactive Intelligence — Auto-Fire Hook
 * ============================================
 * Automatically invokes Phase 14 MachiningIntelligenceOrchestrator methods
 * to provide proactive AI intelligence without user intervention.
 *
 * Auto-fires on:
 * - UserPromptSubmit: Analyze intent proactively, detect anomalies
 * - PreToolUse (calc/machining): Failure risk assessment
 * - PostToolUse (results): Learning trigger detection
 *
 * @hook UserPromptSubmit, PreToolUse, PostToolUse
 * @policy Adds proactive AI context without blocking
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// State file for tracking proactive suggestions
const STATE_DIR = process.env.PRISM_STATE_DIR || "H:/prism/mcp-server/data/state";
const PROACTIVE_STATE_FILE = join(STATE_DIR, "mio-proactive-state.json");

// Throttle settings
const MIN_INTERVAL_MS = 30000; // Don't fire more than once per 30s
const MAX_SUGGESTIONS_PER_SESSION = 10;

function readState() {
  try {
    if (existsSync(PROACTIVE_STATE_FILE)) {
      return JSON.parse(readFileSync(PROACTIVE_STATE_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return {
    lastFire: 0,
    suggestionCount: 0,
    sessionId: null,
    detectedPatterns: [],
  };
}

function writeState(state) {
  try {
    writeFileSync(PROACTIVE_STATE_FILE, JSON.stringify(state, null, 2));
  } catch { /* ignore */ }
}

// Keywords that trigger proactive machining intelligence
const MACHINING_TRIGGERS = [
  "speed", "feed", "depth", "rpm", "force", "chatter", "vibration",
  "tool", "material", "roughing", "finishing", "tolerance", "surface",
  "wear", "life", "thermal", "deflection", "stability", "safety",
  "machine", "spindle", "program", "gcode", "cut", "mill", "lathe", "edm",
];

// Anomaly keywords that warrant failure risk analysis
const ANOMALY_TRIGGERS = [
  "problem", "error", "fail", "crash", "break", "wrong", "bad", "issue",
  "noise", "vibration", "overheat", "smoke", "alarm", "warning",
];

// Learning triggers - novel scenarios
const LEARNING_TRIGGERS = [
  "new material", "first time", "never done", "unfamiliar", "exotic",
  "unusual", "experimental", "prototype", "custom", "special",
];

function shouldFire(state) {
  const now = Date.now();
  if (now - state.lastFire < MIN_INTERVAL_MS) return false;
  if (state.suggestionCount >= MAX_SUGGESTIONS_PER_SESSION) return false;
  return true;
}

function containsTriggers(text, triggers) {
  const lower = text.toLowerCase();
  return triggers.some(t => lower.includes(t));
}

function generateProactiveContext(input, hookType) {
  const text = typeof input === "string" ? input : JSON.stringify(input);
  const contexts = [];

  // Check for machining context
  if (containsTriggers(text, MACHINING_TRIGGERS)) {
    contexts.push({
      type: "proactive_machining",
      action: "mio_proactive_analyze",
      reason: "Machining context detected — proactive AI available",
      suggestion: "Use mio_proactive_analyze for anticipatory suggestions",
    });
  }

  // Check for anomaly/failure risk
  if (containsTriggers(text, ANOMALY_TRIGGERS)) {
    contexts.push({
      type: "failure_risk",
      action: "mio_failure_risk",
      reason: "Potential issue detected — failure risk analysis available",
      suggestion: "Use mio_failure_risk to predict and prevent failures",
      priority: "high",
    });
  }

  // Check for learning opportunities
  if (containsTriggers(text, LEARNING_TRIGGERS)) {
    contexts.push({
      type: "learning_trigger",
      action: "mio_learning_triggers",
      reason: "Novel scenario detected — learning opportunity",
      suggestion: "Use mio_learning_triggers to detect what the AI should learn",
    });
  }

  return contexts;
}

export default async function mioProactiveIntelligence(event) {
  const state = readState();

  // Throttle check
  if (!shouldFire(state)) {
    return { decision: "approve" };
  }

  // Get input text based on hook type
  let inputText = "";
  const hookType = event?.hookType || "unknown";

  if (hookType === "UserPromptSubmit") {
    inputText = event?.prompt || "";
  } else if (hookType === "PreToolUse" || hookType === "PostToolUse") {
    inputText = JSON.stringify(event?.tool?.input || {});
  }

  if (!inputText || inputText.length < 10) {
    return { decision: "approve" };
  }

  // Generate proactive context
  const contexts = generateProactiveContext(inputText, hookType);

  if (contexts.length === 0) {
    return { decision: "approve" };
  }

  // Update state
  state.lastFire = Date.now();
  state.suggestionCount++;
  state.detectedPatterns.push(...contexts.map(c => c.type));
  if (state.detectedPatterns.length > 50) {
    state.detectedPatterns = state.detectedPatterns.slice(-50);
  }
  writeState(state);

  // Build additional context for Claude
  const proactiveHints = contexts.map(c =>
    `[MIO-PROACTIVE] ${c.reason}\n  Action: ${c.action} | ${c.suggestion}`
  ).join("\n");

  return {
    decision: "approve",
    additionalContext: `## Proactive AI Intelligence (MIO Phase 14)\n${proactiveHints}\n\nAvailable MIO actions: mio_proactive_analyze, mio_proactive_quick, mio_anomaly_detect, mio_failure_risk, mio_failure_modes, mio_learning_triggers, mio_machine_health`,
  };
}
