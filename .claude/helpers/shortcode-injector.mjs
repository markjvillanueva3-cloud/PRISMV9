#!/usr/bin/env node
// DISABLED_TOKEN_REDUX_2026_04_23: short-circuited by user-approved token-reduction pass.
// Remove the next 2 lines to re-enable. See .claude/helpers/apply-hook-fixes.mjs
process.stdout.write(JSON.stringify({ continue: true })); process.exit(0);
/**
 * shortcode-injector.mjs — UserPromptSubmit hook for shortcode expansion
 *
 * Detects shortcodes in user messages and injects their expansions:
 *   - PC:sfs → "PC:sfs = prism_calc:speed_feed_solve"
 *   - E0001 → "E0001 = src/engines/AHPEngine.ts"
 *   - @sf-full → "Sequence: material_lookup → tool_lookup → ..."
 *
 * This allows Claude to understand shortcodes in the user's message
 * and respond with the expanded forms.
 */

import { promises as fs } from "node:fs";
import process from "node:process";

const CODE_INDEX_PATH = "H:/prism/mcp-server/data/docs/CODE_SYSTEM_INDEX.json";

// Action shortcuts (subset)
const ACTION_SHORTCUTS = {
  // Calculations
  "PC:sfs": "prism_calc:speed_feed_solve",
  "PC:sfv": "prism_calc:speed_feed_validate",
  "PC:tl": "prism_calc:tool_life_calculate",
  "PC:cf": "prism_calc:cutting_force",
  "PC:ct": "prism_calc:cycle_time",
  // Data
  "PD:ml": "prism_data:material_lookup",
  "PD:tl": "prism_data:tool_lookup",
  "PD:mch": "prism_data:machine_lookup",
  // Safety
  "PS:chk": "prism_safety:safety_check",
  "PS:col": "prism_safety:collision_check",
  // Dev
  "PDV:bld": "prism_dev:build",
  "PDV:tst": "prism_dev:test_run",
  "PDV:cov": "prism_dev:test_coverage",
  "PDV:aud": "prism_dev:security_audit",
  // Orchestration
  "POR:nxt": "prism_orchestrate:roadmap_next",
  "POR:clm": "prism_orchestrate:roadmap_claim",
  "POR:rel": "prism_orchestrate:roadmap_release",
  "POR:hb": "prism_orchestrate:roadmap_heartbeat",
  // Knowledge
  "PKN:trb": "prism_knowledge:tribal_search",
  // EDM
  "PEDM:mp": "prism_edm:wedm_multipass",
  // Distributed Locking
  "LOCK:acq": "prism_orchestrate:lock_acquire",
  "LOCK:rel": "prism_orchestrate:lock_release",
  "LOCK:chk": "prism_orchestrate:lock_status",
  // Dead Letter Queue
  "DLQ:peek": "prism_orchestrate:dlq_peek",
  "DLQ:retry": "prism_orchestrate:dlq_retry",
  // Schema
  "SV:chk": "prism_dev:schema_check",
  "SV:ver": "prism_dev:schema_version",
};

// Sequence macros
const SEQUENCE_MACROS = {
  // Manufacturing
  "@sf-full": ["prism_data:material_lookup", "prism_data:tool_lookup", "prism_calc:speed_feed_solve", "prism_safety:limit_check"],
  "@quote-job": ["prism_calc:cycle_time", "prism_data:material_lookup", "prism_business:material_cost", "prism_business:job_estimate"],
  // DevOps
  "@validate": ["prism_dev:build", "prism_dev:test_run", "prism_dev:lint"],
  "@validate-full": ["prism_dev:build", "prism_dev:test_run", "prism_dev:lint", "prism_dev:test_coverage", "prism_dev:security_audit"],
  "@health": ["prism_dev:health_check", "prism_dev:audit", "prism_quality:quality_score"],
  "@ci-local": ["prism_dev:build", "prism_dev:test_coverage", "prism_dev:schema_check", "prism_dev:security_audit"],
  // Orchestration
  "@milestone": ["prism_orchestrate:roadmap_next", "prism_orchestrate:roadmap_claim"],
  "@claim-safe": ["prism_orchestrate:lock_acquire", "prism_orchestrate:roadmap_claim", "prism_orchestrate:roadmap_heartbeat"],
  // Pipeline
  "@pipeline-check": ["prism_orchestrate:lock_status", "prism_orchestrate:dlq_peek", "prism_orchestrate:swarm_status"],
};

let codeIndex = null;

async function loadCodeIndex() {
  if (codeIndex) return codeIndex;
  try {
    const raw = await fs.readFile(CODE_INDEX_PATH, "utf8");
    codeIndex = JSON.parse(raw);
    return codeIndex;
  } catch {
    return null;
  }
}

async function resolveFileCode(code) {
  const index = await loadCodeIndex();
  if (!index?.codes) return null;
  const entry = index.codes[code.toUpperCase()];
  return entry ? { path: entry.path, name: entry.name } : null;
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const userMessage = process.env.USER_MESSAGE || process.env.PROMPT || "";
  if (!userMessage) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const expansions = [];

  // 1. Detect action shortcuts (PC:sfs, PD:ml, etc.)
  const actionPattern = /\b([A-Z]{2,4}:[a-z]{2,4})\b/g;
  let match;
  while ((match = actionPattern.exec(userMessage)) !== null) {
    const code = match[1];
    if (ACTION_SHORTCUTS[code]) {
      expansions.push(`${code}=${ACTION_SHORTCUTS[code]}`);
    }
  }

  // 2. Detect file codes (E0001, D01, A05, etc.)
  const filePattern = /\b([A-Z]{1,3}\d{1,4})\b/g;
  while ((match = filePattern.exec(userMessage)) !== null) {
    const code = match[1];
    // Skip if it looks like a milestone ID (CAMX-MS0, etc.)
    if (/-MS\d/.test(userMessage.substring(match.index - 10, match.index + 10))) continue;

    const resolved = await resolveFileCode(code);
    if (resolved) {
      expansions.push(`${code}=${resolved.path}`);
    }
  }

  // 3. Detect sequence macros (@sf-full, @validate, etc.)
  const macroPattern = /@([a-z][a-z0-9-]*)/g;
  while ((match = macroPattern.exec(userMessage)) !== null) {
    const macro = `@${match[1]}`;
    if (SEQUENCE_MACROS[macro]) {
      expansions.push(`${macro}=[${SEQUENCE_MACROS[macro].join(" → ")}]`);
    }
  }

  if (expansions.length > 0) {
    process.stdout.write(JSON.stringify({
      additionalContext: `SHORTCODE EXPANSION: ${expansions.join(" | ")}. Use the expanded forms in MCP tool calls.`,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
