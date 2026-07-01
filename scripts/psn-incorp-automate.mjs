#!/usr/bin/env node
/**
 * psn-incorp-automate.mjs
 *
 * Automation kernel for PSN-INCORPORATION-MS0 deep-learning, machine-learning,
 * and deep-reasoning units (P4-NEURAL + P8-LEARNING + P9-REASONING phases ≈ 58 units).
 *
 * For each pending DL/ML/reasoning unit, emit a concrete per-unit IMPLEMENTATION
 * PLAN to `state/shared/specs/psn-incorp/<unit-id>.md` so fleet slots can pick
 * it up via the standard pick-unit → research-pack → build → close-out flow.
 *
 * STRICT no-stub policy (CLAUDE.md §SAFETY + feedback_dont_soften_completeness_gates):
 *   - Does NOT generate placeholder engine code
 *   - Does NOT auto-flip envelope statuses
 *   - DOES generate concrete implementation specs (file list, dependencies,
 *     dispatcher wiring target, test sketch, exit criteria) for each unit
 *   - Operator/slot reviews the per-unit spec, then implements
 *
 * Usage:
 *   node scripts/psn-incorp-automate.mjs                    # write per-unit specs
 *   node scripts/psn-incorp-automate.mjs --json             # machine output of which units processed
 *   node scripts/psn-incorp-automate.mjs --phase P8         # only P8-LEARNING
 *   node scripts/psn-incorp-automate.mjs --slot charlie     # filter to charlie's wire-EDM domain
 *   node scripts/psn-incorp-automate.mjs --unit U-PSN-R3-VER-02  # single unit
 *
 * Wired by skill /psn-automate. Surfaced by stop-psn-automate-status.mjs.
 *
 * Author: charlie slot (claude-451f7328) /goal-7, 2026-05-23.
 * Source envelope: mcp-server/data/milestones/PSN-INCORPORATION-MS0.json (105 units)
 * Source specs: state/shared/specs/PSN-{HIGH-ROI-SURFACE-AUDIT,INCORPORATION-RESEARCH-R2,INCORPORATION-RESEARCH-R3-LEARNING-REASONING}-2026-05-23.md
 */

import * as fs from "fs";
import * as path from "path";

const REPO = "H:/prism";
const ENVELOPE = path.join(REPO, "mcp-server/data/milestones/PSN-INCORPORATION-MS0.json");
const SPECS_DIR = path.join(REPO, "state/shared/specs/psn-incorp");

// Phases containing DL/ML/deep-reasoning units (per envelope structure).
const ML_PHASES = new Set(["P4-R1-NEURAL", "P8-R3-LEARNING", "P9-R3-REASONING"]);

// Slot-soul domain map (charlie=wire per JULIETT-12CHAT-ALLOCATION-MS0).
// Picks the WEDM-adjacent / spark-relevant unit-IDs first when --slot charlie.
const SLOT_DOMAINS = {
  charlie: { match: /\b(WEDM|wire|spark|recast|HAZ|kerf|flush|electrode|safety_gate|EDM)\b/i, priority: 1 },
  alpha: { match: /\b(mill|milling|kienzle|chatter)\b/i, priority: 1 },
  bravo: { match: /\b(lathe|turning|swiss)\b/i, priority: 1 },
  delta: { match: /\b(CAD|blueprint|OCR|drawing|SAM|CLIP)\b/i, priority: 1 },
  echo: { match: /\b(CAM|toolpath|hyperMILL|Mastercam)\b/i, priority: 1 },
  foxtrot: { match: /\b(tribal|wiki|knowledge|memory)\b/i, priority: 1 },
  hotel: { match: /\b(ERP|cost|quote|workflow|temporal|inngest)\b/i, priority: 1 },
  india: { match: /\b(post|controller|Fanuc|Siemens|Heidenhain|Outlines)\b/i, priority: 1 },
  juliett: { match: /\b(speed|feed|active learning|curriculum)\b/i, priority: 1 },
  kilo: { match: /\b(print-to-program|p2p|intake)\b/i, priority: 1 },
  lima: { match: /\b(academy|mobile|Continue)\b/i, priority: 1 },
};

const args = process.argv.slice(2);
const jsonOut = args.includes("--json");
function getFlag(name) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}
const filterPhase = getFlag("--phase");
const filterSlot = getFlag("--slot");
const filterUnit = getFlag("--unit");

function loadEnvelope() {
  return JSON.parse(fs.readFileSync(ENVELOPE, "utf8"));
}

function eligibleUnits(env) {
  const mlPhaseUnitIds = new Set();
  for (const p of env.phases || []) {
    if (!ML_PHASES.has(p.id)) continue;
    if (filterPhase && p.id !== filterPhase) continue;
    for (const u of p.units || []) mlPhaseUnitIds.add(u);
  }
  return (env.unit_list || []).filter(u => {
    if (!mlPhaseUnitIds.has(u.id)) return false;
    if (u.status === "complete" || u.status === "completed") return false;
    if (filterUnit && u.id !== filterUnit) return false;
    if (filterSlot && SLOT_DOMAINS[filterSlot]) {
      const m = SLOT_DOMAINS[filterSlot].match;
      const text = (u.title || "") + " " + (u.note || "");
      if (!m.test(text)) return false;
    }
    return true;
  });
}

/**
 * Per-unit implementation-plan generator.
 * Emits a concrete plan based on the unit's metadata. No code stubs —
 * just an actionable scaffold the operator/slot can review then implement.
 */
function planUnit(unit) {
  const cost = unit.cost || "M";
  const legs = unit.legs || [];
  const source = unit.source || "?";
  const title = unit.title || unit.id;
  const note = unit.note || "(no note)";

  const slotHint = Object.entries(SLOT_DOMAINS)
    .filter(([, def]) => def.match.test(title + " " + note))
    .map(([slot]) => slot);

  const targetEngineGuess = title.match(/^([A-Z][A-Za-z0-9_]+Engine)/);
  const targetEngineName = targetEngineGuess
    ? targetEngineGuess[1]
    : unit.id.replace(/^U-PSN-/, "").replace(/-/g, "") + "Engine";

  const lines = [
    `# ${unit.id} — ${title}`,
    "",
    `> Auto-generated implementation plan by \`scripts/psn-incorp-automate.mjs\` from PSN-INCORPORATION-MS0.`,
    `> Source spec round: ${source}. Estimated cost: ${cost}. PSN legs touched: ${legs.join(", ") || "(unspecified)"}.`,
    `> Slot-soul match: ${slotHint.length > 0 ? slotHint.join(", ") : "(no domain match — needs operator triage)"}`,
    "",
    "## Rationale",
    "",
    note,
    "",
    "## Concrete build plan (no stubs allowed per CLAUDE.md §SAFETY)",
    "",
    "1. **Pre-flight (mandatory):**",
    "   - Run `duplicationGuardEngine.mustCheckBeforeCreating({assetType:\"engine\", proposedName, keywords, description})` first.",
    "   - Verify the engine name does NOT exist in `ENGINE_DIGEST.md`.",
    "   - Check `master-index-query` for existing similar capability.",
    "",
    "2. **Engine target:**",
    "",
    `   - Candidate name: \`${targetEngineName}\` (verify via dedup before committing).`,
    "   - File: `mcp-server/src/engines/<EngineName>.ts`",
    "   - Singleton export pattern: `export const <camelName>Engine = new <EngineName>();`",
    `   - Cost class ${cost} → expected size: ${cost === "S" ? "<300 LOC, 1-2 days" : cost === "M" ? "300-800 LOC, 1-2 weeks" : ">800 LOC, 2-6 weeks"}.`,
    "",
    "3. **Test target:**",
    "",
    `   - File: \`mcp-server/src/__tests__/${targetEngineName}.test.ts\` (per [[feedback_engine_tests_in_tests_dir]]).`,
    "   - Real-behavior tests only (no `toBeDefined()` stubs — hook-rejected per CLAUDE.md §SAFETY).",
    "",
    "4. **Dispatcher wiring (engine-wire-to-all-sources doctrine):**",
    "",
    "   - Wire to EVERY dispatcher that would naturally consume it (CLAUDE.md §ENGINE WIRING).",
    "   - For DL/ML units: typically `prism_ai` AND `prism_dev` AND a domain-specific dispatcher.",
    "   - For reasoning units: typically `prism_ai` AND `prism_intelligence`.",
    `   - Verify with \`stop_on_unwired_assets.mjs\` (Stop hook) before committing.`,
    "",
    "5. **PSN-leg integration per `feedback_psn_definition`:**",
    "",
    legs.map(l => `   - Leg #${l} — must verify integration (see leg map in feedback_psn_definition.md table)`).join("\n"),
    "",
    "6. **Per-file scrutiny gate (multi-file build):**",
    "",
    "   - Dispatch 2 parallel reviewer agents after each file (CLAUDE.md §PER-FILE SCRUTINY GATE).",
    "   - Agent A: content-specialist by file type (physics-review-agent for physics, code-analyzer for utility).",
    "   - Agent B: independent second-pass `reviewer`.",
    "",
    "7. **Exit criteria:**",
    "",
    "   - Engine produces a non-stub, verifiable output on at least one real input.",
    "   - Tests pass via `npx vitest run mcp-server/src/__tests__/<EngineName>.test.ts`.",
    "   - Build clean: `npm run build` from `mcp-server/`.",
    "   - Dispatcher wired + actionable via `prism_<dispatcher>:<action>`.",
    "   - Wiki entry written to `knowledge/wiki/architecture/<slug>.md`.",
    "   - Memory reference written to `knowledge/memories/reference/reference_<slug>_2026_<date>.md`.",
    "   - 3-of-3 Stop scrutiny ledger entry PASS.",
    "",
    "8. **Close-out (4 surfaces per `feedback_roadmap_close_out`):**",
    "",
    "   - Envelope `unit_list[].status: pending → complete` + `completed_at` + `closeout_note`.",
    "   - `node scripts/build-milestone-progress.mjs` (regen MILESTONE_PROGRESS).",
    "   - `node scripts/build-state-snapshot.mjs` (regen BUILD_STATE).",
    "   - `node scripts/close-out-milestone.mjs --milestone PSN-INCORPORATION-MS0` (orchestrator).",
    "   - Post commit to `AGENT_CHAT.jsonl`.",
    "",
    "## Out-of-scope per R12 fail-loud (named, deferred):",
    "",
    cost === "L"
      ? "- This unit is L-cost — DO NOT attempt in a single /loop iter. Decompose into phases first."
      : "- (None for this unit at current scope)",
    "",
    "## Cross-refs",
    "",
    `- Source envelope: \`mcp-server/data/milestones/PSN-INCORPORATION-MS0.json\` (commit 4606d6066a)`,
    "- [[feedback_psn_definition]] — 11-leg canonical PSN map",
    "- [[feedback_auto_close_out]] — close-out doctrine",
    "- [[feedback_dont_soften_completeness_gates]] — no stubs",
    "- [[reference_psn_incorporation_ms0_2026_05_23]] — envelope ship reference",
    "",
    `_Generated: ${new Date().toISOString()}_`,
  ];
  return lines.join("\n");
}

function main() {
  const env = loadEnvelope();
  const units = eligibleUnits(env);

  if (jsonOut) {
    process.stdout.write(JSON.stringify({
      generated_at: new Date().toISOString(),
      envelope: env.id,
      ml_phases: [...ML_PHASES],
      filters: { phase: filterPhase, slot: filterSlot, unit: filterUnit },
      eligible_count: units.length,
      eligible_ids: units.map(u => u.id),
    }, null, 2) + "\n");
    return;
  }

  fs.mkdirSync(SPECS_DIR, { recursive: true });
  const written = [];
  for (const u of units) {
    const outPath = path.join(SPECS_DIR, u.id + ".md");
    fs.writeFileSync(outPath, planUnit(u));
    written.push(u.id);
  }
  process.stdout.write(`[psn-incorp-automate] envelope=${env.id} ml_phases=${[...ML_PHASES].join(",")} eligible=${units.length}\n`);
  if (filterSlot) process.stdout.write(`[psn-incorp-automate] slot-filter=${filterSlot}\n`);
  if (filterPhase) process.stdout.write(`[psn-incorp-automate] phase-filter=${filterPhase}\n`);
  if (filterUnit) process.stdout.write(`[psn-incorp-automate] unit-filter=${filterUnit}\n`);
  process.stdout.write(`[psn-incorp-automate] wrote ${written.length} implementation plans to ${SPECS_DIR}\n`);
  if (written.length <= 20) {
    for (const id of written) process.stdout.write(`  - ${id}.md\n`);
  } else {
    for (const id of written.slice(0, 5)) process.stdout.write(`  - ${id}.md\n`);
    process.stdout.write(`  ... (${written.length - 5} more)\n`);
  }
}

main();
