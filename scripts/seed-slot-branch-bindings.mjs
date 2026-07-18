#!/usr/bin/env node
/**
 * seed-slot-branch-bindings.mjs — close the slot-worktree auto-invoke gap.
 *
 * BACKGROUND (2026-05-26, slot:alpha, [SLOT-BRIDGE-MS0]/U-SBB01):
 * U-WAVE5a built the per-slot branch-binding sidecar so the 3 lane-routing
 * hooks (worktree-commit-route + git-add-lane-guard + main-tree-write-block)
 * arm whenever chat-slots.json[slot].branch starts with "slot/". The
 * mechanism reads from state/shared/slot-branch-bindings.json and forces
 * input.branch=bound when a binding exists. Without the binding, hooks stay
 * dormant (allow-mode) because input.branch defaults to "cad-fusion-live-ms0"
 * when /checkin runs from H:/prism.
 *
 * THE GAP (discovered 2026-05-26):
 * slot-branch-bindings.json only contained alpha. 25 of 26 NATO slots were
 * unarmed — every peer's commits/edits routed to the shared tree, causing
 * the 3-absorbed-commits regression (per [[feedback_commit_to_slot_worktree]])
 * and silent corruption of peer attribution.
 *
 * THIS FIX:
 * Seed all 25 work slots (alpha..foxtrot + hotel..zulu). golf is EXEMPT
 * because it is the integrator slot (per main-tree-write-block.mjs:108 const
 * INTEGRATOR_SLOT = "golf"; it fast-forwards cad-fusion-live-ms0 and must
 * remain free to write the main tree).
 *
 * CONTRACT:
 * - Idempotent: re-runs replace nothing, only adds missing slots
 * - Uses the public writeSlotBranchBindings() API (validated schema)
 * - golf NEVER gets a binding (would deny its integrator role)
 * - One-shot — companion claimSlot() patch self-seeds new claims going forward
 *
 * USAGE:
 *   node scripts/seed-slot-branch-bindings.mjs           # apply (default)
 *   node scripts/seed-slot-branch-bindings.mjs --dry-run # print only
 */

import {
  SLOT_NAMES,
  readSlotBranchBindings,
  writeSlotBranchBindings,
} from "../.claude/helpers/chat-slots.mjs";

const INTEGRATOR_SLOT = "golf"; // matches main-tree-write-block.mjs:108

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run") || args.includes("-n");

function main() {
  const existing = readSlotBranchBindings();
  /** @type {Record<string,string>} */
  const incoming = {};
  for (const slot of SLOT_NAMES) {
    if (slot === INTEGRATOR_SLOT) continue;
    const want = `slot/${slot}`;
    if (existing[slot] !== want) {
      incoming[slot] = want;
    }
  }

  const summary = {
    slotCount: SLOT_NAMES.length,
    integratorExempt: INTEGRATOR_SLOT,
    alreadyBound: Object.keys(existing).length,
    toSeed: Object.keys(incoming).length,
    seedList: Object.keys(incoming).sort(),
  };

  if (Object.keys(incoming).length === 0) {
    console.log(JSON.stringify({ ok: true, action: "noop", reason: "all-work-slots-already-bound", ...summary }, null, 2));
    return 0;
  }

  if (DRY_RUN) {
    console.log(JSON.stringify({ ok: true, action: "dry-run", ...summary, wouldWrite: incoming }, null, 2));
    return 0;
  }

  const result = writeSlotBranchBindings(incoming);
  if (!result.ok) {
    console.error(JSON.stringify({ ok: false, error: result.error || "write_failed", ...summary }, null, 2));
    return 1;
  }

  const after = readSlotBranchBindings();
  console.log(JSON.stringify({
    ok: true,
    action: "seeded",
    ...summary,
    bindingsAfter: Object.keys(after).sort(),
    written: result.written,
  }, null, 2));
  return 0;
}

process.exit(main());
