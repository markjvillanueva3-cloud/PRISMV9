#!/usr/bin/env node
// tier: T4
/**
 * goal-stack-inject.mjs — Phase 0.13 Goal Stack Injection Hook
 *
 * UserPromptSubmit hook that injects top-5 goals into context
 * to maintain goal continuity across the session.
 *
 * @phase Universal 0.13 — AGI-Grade Persistent Self-Awareness
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = process.env.PRISM_ROOT || "H:/prism/mcp-server";
const GOAL_STACK_PATH = path.join(ROOT, "data/state/GOAL_STACK.json");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => main(input));

async function main(rawInput) {
  try {
    const goals = await getTopGoals(5);

    if (goals.length > 0) {
      const goalList = goals.map((g, i) => `${i + 1}. ${g.description}`).join("\n");

      console.log(JSON.stringify({
        additionalContext: `## Active Goals\n${goalList}\n\nKeep these goals in mind as you respond.`
      }));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }
  } catch (error) {
    console.log(JSON.stringify({ continue: true }));
  }
}

async function getTopGoals(limit) {
  try {
    if (!fs.existsSync(GOAL_STACK_PATH)) {
      return [];
    }

    const content = JSON.parse(fs.readFileSync(GOAL_STACK_PATH, "utf-8"));
    const stack = content.stack || [];

    return stack
      .filter((g) => g.status === "active" || g.status === "in_progress")
      .slice(0, limit)
      .map((g) => ({
        id: g.id,
        description: g.description,
        priority: g.priority || 0,
        createdAt: g.createdAt
      }));
  } catch {
    return [];
  }
}
