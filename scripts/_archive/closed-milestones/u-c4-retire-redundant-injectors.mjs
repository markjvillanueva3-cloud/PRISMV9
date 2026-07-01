#!/usr/bin/env node
/**
 * u-c4-retire-redundant-injectors.mjs — PRISM-STAB-MS0/U-C4 (2026-05-09).
 *
 * Removes UserPromptSubmit hook registrations whose content is now covered
 * by the prompt-context-inject hook (U-C2) reading the C1 bundle.
 *
 * Scope: ONLY UserPromptSubmit. Every other event left alone.
 * Per-prompt savings: 10 node forks (21 → 11 UserPromptSubmit hooks).
 *
 * Usage:
 *   node scripts/u-c4-retire-redundant-injectors.mjs              # dry-run (default)
 *   node scripts/u-c4-retire-redundant-injectors.mjs --apply --confirm
 *   node scripts/u-c4-retire-redundant-injectors.mjs --rollback
 *
 * The --confirm flag is required for --apply (extra safety since this
 * touches 10 hooks). Rollback restores from settings.json.u-c4.bak.
 *
 * Rationale per candidate is in CANDIDATES below — each says WHY the bundle
 * covers it. KEEP-listed hooks at the bottom document why they stay.
 */

import fs from "node:fs";
import { execSync } from "node:child_process";

const SETTINGS_C = "C:/Users/wompu/.claude/settings.json";
const SETTINGS_BAK = "C:/Users/wompu/.claude/settings.json.u-c4.bak";
const SETTINGS_H = "H:/.claude/settings.json";

// Hooks to retire — each entry is (filename, rationale).
const CANDIDATES = [
  ["claude-brief-staleness-check.mjs", "bundle includes generation timestamp; freshness shown in injection header"],
  ["prompt-rules-inject.mjs",          "operating rules cached in bundle body; injected once per prompt by C2"],
  ["discipline-expert-inject.mjs",     "expert role rotation surface available in bundle; can be made deterministic later"],
  ["reference-value-injector.mjs",     "reference indexes (SOURCES) included in bundle aggregation"],
  ["build-state-inject.mjs",           "BUILD_STATE.{md,json} read by bundle daemon; included in body"],
  ["ollama-skill-suggester.mjs",       "skill catalog in bundle; suggestion logic moves to MCP routing if needed"],
  ["shortcode-injector.mjs",           "shortcode reference table in bundle (wiki section)"],
  ["skill-chain-suggest.mjs",          "skill chain hints can be derived from bundle's MCP access tables"],
  ["gsd-section-retrieve.mjs",         "GSD_QUICK.md read by bundle daemon (full mode); included in body when relevant"],
  ["memory-rag-inject.mjs",            "memory index in bundle; per-prompt RAG retrieval can be a Skill invocation when needed"],
];

// Hooks intentionally KEPT (here for documentation; not touched by this script):
//   prompt-context-inject       — THE bundle reader; the whole point of C4
//   ollama-auto-router          — active routing decisions, side-effect-bearing
//   session-id-pin              — multi-chat safety, writes PID pin file
//   session-reorient-inject     — active session state management
//   stale-state-warn            — warns about stale state files (different signal)
//   prompt-rewriter-ollama      — transforms the prompt itself; not just additive
//   local-compute-intent        — routing decision
//   ollama-task-offloader       — routing decision, side effect
//   comprehensive-build-enforce — load-bearing build discipline gate per user feedback
//   token-budget-gate           — active gate on token budget
//   auto-consensus-userprompt   — manages async consensus queue (side effect)

function isCandidate(cmd) {
  return CANDIDATES.some(([name]) => cmd.includes(`/${name}`));
}

function rationaleFor(cmd) {
  for (const [name, why] of CANDIDATES) {
    if (cmd.includes(`/${name}`)) return why;
  }
  return null;
}

function processSettings(settings) {
  const removed = [];
  const ups = settings.hooks?.UserPromptSubmit;
  if (!Array.isArray(ups)) return { removed };
  for (const matcher of ups) {
    if (!Array.isArray(matcher.hooks)) continue;
    matcher.hooks = matcher.hooks.filter((h) => {
      const cmd = h.command || "";
      if (isCandidate(cmd)) {
        removed.push({ matcher: matcher.matcher || "(empty)", cmd, why: rationaleFor(cmd) });
        return false;
      }
      return true;
    });
  }
  return { removed };
}

function syncMirror() {
  try {
    fs.copyFileSync(SETTINGS_C, SETTINGS_H);
    return true;
  } catch (e) {
    process.stderr.write(`Mirror sync failed: ${e.message}\n`);
    return false;
  }
}

function main() {
  const apply = process.argv.includes("--apply");
  const confirm = process.argv.includes("--confirm");
  const rollback = process.argv.includes("--rollback");

  if (rollback) {
    if (!fs.existsSync(SETTINGS_BAK)) {
      console.error(`No backup at ${SETTINGS_BAK}`);
      process.exit(1);
    }
    fs.copyFileSync(SETTINGS_BAK, SETTINGS_C);
    syncMirror();
    console.log("Rolled back C: + H: from .u-c4.bak");
    return;
  }

  const original = fs.readFileSync(SETTINGS_C, "utf-8");
  const settings = JSON.parse(original);
  const { removed } = processSettings(settings);

  console.log(`Would remove ${removed.length} UserPromptSubmit hooks (out of ${CANDIDATES.length} candidates):\n`);
  for (const r of removed) {
    const name = (r.cmd.match(/hooks\/([^\.]+)\.mjs/) || [])[1] || (r.cmd.match(/helpers\/([^\.]+)\.mjs/) || [])[1];
    console.log(`  - ${name.padEnd(36)} ${r.why}`);
  }
  const missingFromCandidates = CANDIDATES.length - removed.length;
  if (missingFromCandidates > 0) {
    console.log(`\nNote: ${missingFromCandidates} candidate(s) not found in current settings (already removed).`);
  }

  if (!apply) {
    console.log("\nDry-run. To apply: --apply --confirm");
    return;
  }
  if (!confirm) {
    console.log("\nERROR: --apply requires --confirm to acknowledge the blast radius.");
    process.exit(1);
  }

  fs.copyFileSync(SETTINGS_C, SETTINGS_BAK);
  fs.writeFileSync(SETTINGS_C, JSON.stringify(settings, null, 2) + "\n");
  syncMirror();
  // Validate
  try {
    JSON.parse(fs.readFileSync(SETTINGS_C, "utf-8"));
    JSON.parse(fs.readFileSync(SETTINGS_H, "utf-8"));
  } catch (e) {
    console.error(`POST-WRITE VALIDATION FAILED: ${e.message}`);
    console.error("Rolling back automatically...");
    fs.copyFileSync(SETTINGS_BAK, SETTINGS_C);
    syncMirror();
    process.exit(1);
  }
  console.log(`\nApplied. Backup at ${SETTINGS_BAK}.`);
  console.log(`Mirror C: → H: synced. Verify: node -e "console.log(require('crypto').createHash('sha256').update(require('fs').readFileSync('${SETTINGS_C}')).digest('hex'))"`);
  console.log(`\nRollback: node scripts/u-c4-retire-redundant-injectors.mjs --rollback`);
}

main();
