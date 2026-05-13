#!/usr/bin/env node
// tier: T4
/**
 * neural-roadmap-resume-detect.mjs
 * UserPromptSubmit hook
 *
 * When the user types "continue neural network work" (or one of the configured
 * resume phrases), inject a system reminder that pins the XPROC-NEURAL-OPTIMIZE-MS0
 * milestone as the active target and surfaces the first not_started unit. This
 * routes the generic /continue-roadmap dispatcher to a specific milestone instead
 * of picking whichever in_progress milestone is first in the index.
 *
 * Behavior:
 *   - Reads the user prompt from stdin (Claude Code hook protocol)
 *   - Matches against milestone's resume_phrases array
 *   - On match, prints additional context to stdout (the hook's contract)
 *   - On no match, exits silently (zero output)
 *
 * Doctrine: this hook is read-only on the milestone JSON. It does NOT mutate
 * status. The user (or /continue-roadmap) will mark in_progress when they
 * actually start work.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MILESTONE_JSON = path.join(ROOT, "mcp-server/data/milestones/XPROC-NEURAL-OPTIMIZE-MS0.json");

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function loadMilestone() {
  if (!existsSync(MILESTONE_JSON)) return null;
  try {
    return JSON.parse(readFileSync(MILESTONE_JSON, "utf8"));
  } catch {
    return null;
  }
}

function extractPrompt(input) {
  // Hook stdin is JSON with the user's prompt.
  try {
    const parsed = JSON.parse(input);
    return parsed.prompt ?? parsed.userPrompt ?? parsed.message ?? "";
  } catch {
    return input;
  }
}

function findFirstNotStartedUnit(ms) {
  for (const phase of ms.phases ?? []) {
    for (const unit of phase.units ?? []) {
      if (!unit.status || unit.status === "not_started") {
        return { phaseId: phase.id, unit };
      }
    }
  }
  return null;
}

function main() {
  const stdin = readStdin();
  const prompt = extractPrompt(stdin).toLowerCase().trim();
  if (!prompt) return;

  const ms = loadMilestone();
  if (!ms) return;

  const phrases = (ms.resume_phrases ?? []).map((p) => p.toLowerCase());
  const matched = phrases.some((p) => prompt.includes(p));
  if (!matched) return;

  const firstUnit = findFirstNotStartedUnit(ms);
  const startCue = firstUnit
    ? `${firstUnit.phaseId}/${firstUnit.unit.id}: ${firstUnit.unit.title}`
    : "(all units completed — milestone done)";

  // Output: hook contract is to print additional context. Claude Code will
  // surface this as a system reminder on the next user-prompt-submit.
  const lines = [
    "🎯 NEURAL ROADMAP RESUME — pinned milestone",
    "",
    `Milestone: ${ms.id}`,
    `Title: ${ms.title}`,
    `Envelope: mcp-server/data/milestones/XPROC-NEURAL-OPTIMIZE-MS0.json`,
    `Linked assessment: state/shared/NEURAL-ASSESSMENT-CONTEXT.md`,
    `Branch target: ${ms.branch_target ?? "cad-fusion-live-ms0"}`,
    `Status: ${ms.status}`,
    "",
    `▶ START AT: ${startCue}`,
    "",
    "Phase order: P1-CORRECTNESS → P2-FEATURIZE → P3-CLOSED-LOOP → P4-REAL-DATA → P5-ARCH-MODERN → P6-TIER-COMPOSE",
    "",
    "Phase 1 (CORRECTNESS) blocks everything — must ship first:",
    "  • U-NN-FIX01 — W2 update-order backprop bug (line 647-664)",
    "  • U-NN-FIX02 — response_summary.success label leakage (line 314)",
    "  • U-NN-FIX03 — Honest finalLoss reporting (post-update measurement)",
    "  • U-NN-FIX04 — True minibatch SGD with gradient averaging",
    "  • U-NN-FIX05 — Statistical convergence test (5-seed CI)",
    "",
    "Begin by reading the envelope, then U-NN-FIX01.",
  ].join("\n");

  process.stdout.write(lines + "\n");
}

main();
