#!/usr/bin/env node
/**
 * session-awareness-bootstrap.mjs — Phase 0.13 Awareness Bootstrap Hook
 *
 * SessionStart hook that verifies registry freshness and ensures
 * awareness score >= 0.80 before allowing first prompt.
 *
 * @phase Universal 0.13 — AGI-Grade Persistent Self-Awareness
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = process.env.PRISM_ROOT || "H:/prism/mcp-server";
const ENGINE_USAGE_PATH = path.join(ROOT, "data/state/ENGINE_USAGE_INDEX.json");
const ACTION_RESOLUTION_PATH = path.join(ROOT, "data/state/ACTION_RESOLUTION_INDEX.json");
const AWARENESS_THRESHOLD = 0.80;

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => main(input));

async function main(rawInput) {
  try {
    const result = await checkAwareness();
    console.log(JSON.stringify(result));
  } catch (error) {
    console.log(JSON.stringify({
      awarenessCheck: "error",
      message: error.message,
      score: 0
    }));
  }
}

async function checkAwareness() {
  let score = 0;
  const checks = [];

  // Check ENGINE_USAGE_INDEX freshness
  try {
    if (fs.existsSync(ENGINE_USAGE_PATH)) {
      const content = JSON.parse(fs.readFileSync(ENGINE_USAGE_PATH, "utf-8"));
      const age = Date.now() - new Date(content.lastUpdated).getTime();
      const ageHours = age / (1000 * 60 * 60);

      if (ageHours < 24) {
        score += 0.25;
        checks.push({ index: "ENGINE_USAGE", status: "fresh", ageHours: ageHours.toFixed(1) });
      } else {
        checks.push({ index: "ENGINE_USAGE", status: "stale", ageHours: ageHours.toFixed(1) });
      }
    } else {
      checks.push({ index: "ENGINE_USAGE", status: "missing" });
    }
  } catch {
    checks.push({ index: "ENGINE_USAGE", status: "error" });
  }

  // Check ACTION_RESOLUTION_INDEX freshness
  try {
    if (fs.existsSync(ACTION_RESOLUTION_PATH)) {
      const content = JSON.parse(fs.readFileSync(ACTION_RESOLUTION_PATH, "utf-8"));
      const age = Date.now() - new Date(content.lastUpdated).getTime();
      const ageHours = age / (1000 * 60 * 60);

      if (ageHours < 24) {
        score += 0.25;
        checks.push({ index: "ACTION_RESOLUTION", status: "fresh", ageHours: ageHours.toFixed(1) });
      } else {
        checks.push({ index: "ACTION_RESOLUTION", status: "stale", ageHours: ageHours.toFixed(1) });
      }
    } else {
      checks.push({ index: "ACTION_RESOLUTION", status: "missing" });
    }
  } catch {
    checks.push({ index: "ACTION_RESOLUTION", status: "error" });
  }

  // Check CLAUDE.md exists and is readable
  const claudeMdPath = path.join(ROOT, "..", "CLAUDE.md");
  try {
    if (fs.existsSync(claudeMdPath)) {
      const stat = fs.statSync(claudeMdPath);
      if (stat.size > 1000) {
        score += 0.25;
        checks.push({ file: "CLAUDE.md", status: "present", size: stat.size });
      }
    }
  } catch {
    checks.push({ file: "CLAUDE.md", status: "error" });
  }

  // Check MEMORY.md exists
  const memoryPath = "C:/Users/Mark Villanueva/.claude/projects/H--prism/memory/MEMORY.md";
  try {
    if (fs.existsSync(memoryPath)) {
      score += 0.25;
      checks.push({ file: "MEMORY.md", status: "present" });
    }
  } catch {
    checks.push({ file: "MEMORY.md", status: "error" });
  }

  const passed = score >= AWARENESS_THRESHOLD;

  return {
    awarenessCheck: passed ? "pass" : "warn",
    score: score.toFixed(2),
    threshold: AWARENESS_THRESHOLD,
    passed,
    checks,
    message: passed
      ? `Awareness ${(score * 100).toFixed(0)}% >= ${AWARENESS_THRESHOLD * 100}% threshold`
      : `Awareness ${(score * 100).toFixed(0)}% < ${AWARENESS_THRESHOLD * 100}% - indexes may need refresh`
  };
}
