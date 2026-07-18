#!/usr/bin/env node
// tier: T3
/**
 * stop-psn-automate-status.mjs
 *
 * Stop-hook advisory. Surfaces the build-readiness state of
 * PSN-INCORPORATION-MS0 DL/ML/reasoning units:
 *   - How many implementation plans exist in state/shared/specs/psn-incorp/
 *   - How many pending DL/ML units in the envelope still lack a plan
 *   - Slot-domain-filtered count for the current chat's slot (if detectable)
 *
 * Pure suggest-only. NEVER blocks, NEVER auto-runs the generator.
 *
 * Knobs:
 *   PRISM_PSN_AUTOMATE_STATUS_DISABLE=1   disable entirely
 *
 * Author: charlie slot (claude-451f7328) /goal-7, 2026-05-23.
 * Companion: scripts/psn-incorp-automate.mjs (the generator)
 *            .claude/commands/psn-automate.md (the skill)
 */

import * as fs from "fs";
import * as path from "path";

const REPO = "H:/prism";
const ENVELOPE = path.join(REPO, "mcp-server/data/milestones/PSN-INCORPORATION-MS0.json");
const SPECS_DIR = path.join(REPO, "state/shared/specs/psn-incorp");

const ML_PHASES = new Set(["P4-R1-NEURAL", "P8-R3-LEARNING", "P9-R3-REASONING"]);

function disabled() {
  return process.env.PRISM_PSN_AUTOMATE_STATUS_DISABLE === "1";
}

function safeRead(p, fallback) {
  try { return fs.readFileSync(p, "utf8"); } catch { return fallback; }
}

function loadEnvelope() {
  try {
    return JSON.parse(safeRead(ENVELOPE, "{}"));
  } catch {
    return {};
  }
}

function eligibleUnitIds(env) {
  if (!Array.isArray(env.phases) || !Array.isArray(env.unit_list)) return [];
  const mlPhaseUnitIds = new Set();
  for (const p of env.phases) {
    if (ML_PHASES.has(p.id)) for (const u of p.units || []) mlPhaseUnitIds.add(u);
  }
  return env.unit_list
    .filter(u => mlPhaseUnitIds.has(u.id) && u.status !== "complete" && u.status !== "completed")
    .map(u => u.id);
}

function existingPlanIds() {
  try {
    return new Set(
      fs.readdirSync(SPECS_DIR)
        .filter(f => f.endsWith(".md"))
        .map(f => f.replace(/\.md$/, ""))
    );
  } catch {
    return new Set();
  }
}

function main() {
  if (disabled()) return;
  const env = loadEnvelope();
  if (!env.id) return;
  const eligible = eligibleUnitIds(env);
  if (eligible.length === 0) return;
  const plans = existingPlanIds();
  const planned = eligible.filter(id => plans.has(id));
  const unplanned = eligible.filter(id => !plans.has(id));

  // Only surface if there's coverage drift worth reporting
  if (unplanned.length === 0 && planned.length === 0) return;

  const lines = [
    "## 🧠 PSN automation kernel status",
    "",
    `Envelope: \`${env.id}\` (${eligible.length} eligible DL/ML/reasoning units)`,
    `Implementation plans on disk: **${planned.length}** of ${eligible.length}`,
  ];
  if (unplanned.length > 0) {
    lines.push(`Without plans: **${unplanned.length}**`);
    lines.push("");
    lines.push(`Regenerate via: \`node scripts/psn-incorp-automate.mjs\` (or skill \`/psn-automate\`)`);
    if (unplanned.length <= 5) {
      lines.push("");
      lines.push("Missing:");
      for (const id of unplanned) lines.push(`  - ${id}`);
    }
  } else {
    lines.push("All eligible units have implementation plans ready for slot pickup.");
  }
  lines.push("");
  lines.push("Doctrine: `feedback_psn_definition` · `feedback_auto_close_out` · CLAUDE.md §PER-FILE SCRUTINY GATE on build.");

  const payload = {
    decision: "approve",
    systemMessage: lines.join("\n"),
  };
  process.stdout.write(JSON.stringify(payload));
}

try { main(); } catch (err) {
  process.stderr.write(`[stop-psn-automate-status] error: ${err && err.message ? err.message : err}\n`);
}
