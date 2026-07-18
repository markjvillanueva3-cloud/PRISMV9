#!/usr/bin/env node
// tier: T2
/**
 * ai-command-awareness.mjs — SessionStart hook (pointer mode by default, Wave 2).
 *
 * History (2026-05-19, [GOLF]/U-WAVE2B): used to emit ~2KB of hardcoded slash
 * command inventory on every SessionStart. The list was stale (no path to
 * regen from `.claude/commands/*.md`) and double-injected work already done
 * per-prompt by `skill-auto-trigger.mjs` (UserPromptSubmit T2 — that hook
 * surfaces top-3 keyword-matched skills on every prompt, which is the
 * actually-useful surface for "what slash command to suggest right now").
 *
 * Now: pointer mode default. Static body lives at
 * state/shared/AI-SLASH-COMMANDS-REFERENCE.md. Legacy full-inject available
 * via env knob.
 *
 * Knobs:
 *   PRISM_AI_COMMAND_AWARENESS_MODE=full     restore the legacy 2KB inject
 *   PRISM_AI_COMMAND_AWARENESS_MODE=pointer  default — 4-line pointer
 *   PRISM_AI_COMMAND_AWARENESS_MODE=silent   emit nothing (recommended:
 *     skill-auto-trigger already covers per-prompt suggestions)
 *
 * Refresh the reference file: edit state/shared/AI-SLASH-COMMANDS-REFERENCE.md
 * directly. There is no auto-regen — slash commands are added/removed by
 * convention (`.claude/commands/<name>.md` files). A future enhancement could
 * auto-list those files at SessionStart instead of relying on a hand-edited
 * card.
 */

import { existsSync, readFileSync } from "node:fs";

const REPO_ROOT = "H:/prism";
const REFERENCE_FILE = `${REPO_ROOT}/state/shared/AI-SLASH-COMMANDS-REFERENCE.md`;

function buildPointer() {
  if (!existsSync(REFERENCE_FILE)) {
    return [
      "⚠ AI Slash Commands reference card missing.",
      `  Expected: ${REFERENCE_FILE}`,
      "  Restore from git (commit landing WAVE2B) or list live commands with: `ls H:/prism/.claude/commands/*.md`.",
    ].join("\n");
  }
  return [
    "## ⌨ PRISM Slash Commands — reference card on disk (Wave 2 pointer mode)",
    "   📍 `state/shared/AI-SLASH-COMMANDS-REFERENCE.md` — STATIC snapshot of slash commands by category + mandatory rules",
    "   Per-prompt auto-suggestion is handled by `.claude/hooks/skill-auto-trigger.mjs` (UserPromptSubmit, top-3 keyword matches).",
    "   Live list: `ls H:/prism/.claude/commands/*.md` + `ls ~/.claude/commands/*.md`. Modes: `PRISM_AI_COMMAND_AWARENESS_MODE=full|silent`.",
  ].join("\n");
}

function buildLegacyFull() {
  if (!existsSync(REFERENCE_FILE)) {
    return `⚠ AI Command Awareness: PRISM_AI_COMMAND_AWARENESS_MODE=full requested but ${REFERENCE_FILE} missing.`;
  }
  return readFileSync(REFERENCE_FILE, "utf8");
}

function main() {
  const mode = String(process.env.PRISM_AI_COMMAND_AWARENESS_MODE || "pointer").toLowerCase();
  if (mode === "silent") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const body = mode === "full" ? buildLegacyFull() : buildPointer();
  process.stdout.write(JSON.stringify({ continue: true, systemMessage: body }));
}

try {
  main();
} catch {
  process.stdout.write(JSON.stringify({ continue: true }));
}
