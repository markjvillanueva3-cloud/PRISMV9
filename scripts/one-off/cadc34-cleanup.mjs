#!/usr/bin/env node
/**
 * CADC34 Cleanup — Round 5 envelope remediation.
 *
 * U-CADC34 (CADGauntletTestEngine) caused git object corruption (tree
 * 18b53fe1232524bb3adafaacf7131ddfbb972005 missing on disk). User has
 * authorized deletion. This mutator removes/supersedes all envelope
 * references to U-CADC34 while preserving the capability via successor
 * units (U-CADC-MSR05 + CAD-UIX-MS0 P8 gauntlet stack).
 *
 * Plan: H:/.claude/plans/piped-soaring-crab.md (CADC34 Remediation).
 * Track B (envelope-only, zero git-surgery).
 */
import { readFileSync, writeFileSync } from "node:fs";

const CC = "H:/PRISM/mcp-server/data/milestones/CAD-COMPLETE-MS0.json";
const IDX = "H:/PRISM/mcp-server/data/roadmap-index.json";
const DATE = "2026-04-21";
const CORRUPTED_TREE_OID = "18b53fe1232524bb3adafaacf7131ddfbb972005";

const cc = JSON.parse(readFileSync(CC, "utf8"));
const idx = JSON.parse(readFileSync(IDX, "utf8"));

// ── 1. Mark U-CADC34 superseded (keep spec for audit) ───────────────────
const u34 = cc.units["U-CADC34"];
if (!u34) throw new Error("U-CADC34 not found in units map");
if (u34.status === "superseded") {
  console.log("U-CADC34 already superseded — idempotent run");
} else {
  u34.status = "superseded";
  u34.superseded_at = DATE;
  u34.superseded_by = ["U-CADC-MSR05", "CAD-UIX-MS0:P8-SHOP-REAL-TIME"];
  u34.superseded_reason =
    "Git object corruption in implementation branch (tree " +
    CORRUPTED_TREE_OID +
    " missing on disk); user authorized deletion 2026-04-21. Capability preserved by successor units: U-CADC-MSR05 (regen-full wrapper) and CAD-UIX-MS0 P8-SHOP-REAL-TIME phase (48 per-CAD real-time tests + 8 shared infra). No loss of scope.";
}

// ── 2. Drop U-CADC34 placeholder from PHASE-7.units[] ───────────────────
const phase7 = cc.phases.find((p) => p.id === "PHASE-7");
if (!phase7) throw new Error("PHASE-7 not found");
const before7 = phase7.units.length;
phase7.units = phase7.units.filter((u) => {
  const id = typeof u === "string" ? u : u.id;
  return id !== "U-CADC34";
});
const removed7 = before7 - phase7.units.length;
console.log(`PHASE-7 placeholders removed: ${removed7}`);

// ── 3. Strip U-CADC34 from downstream entry_conditions ──────────────────
const downstreamUpdates = [];
for (const [k, v] of Object.entries(cc.units)) {
  if (k === "U-CADC34") continue;
  if (!Array.isArray(v.entry_conditions)) continue;
  const before = v.entry_conditions.length;
  v.entry_conditions = v.entry_conditions.filter(
    (c) => !/U-CADC34\b/.test(c),
  );
  const after = v.entry_conditions.length;
  if (after !== before) downstreamUpdates.push({ unit: k, dropped: before - after });
}
console.log("Downstream entry_condition cleanups:", downstreamUpdates);

// ── 4. Record Round 5 cleanup block ─────────────────────────────────────
cc.scrutiny_round_5_cleanup = {
  date: DATE,
  action: "U-CADC34 superseded + envelope dangling-reference cleanup",
  rationale:
    "U-CADC34 (CADGauntletTestEngine — Draw every file from scratch) caused git object corruption during implementation. Tree OID " +
    CORRUPTED_TREE_OID +
    " is missing on disk, which blocks git status/fsck/diff operations. User authorized deletion. Track B (this block) cleans the envelope; Track A (separate) repairs the git repo.",
  corrupted_tree_oid: CORRUPTED_TREE_OID,
  affected_units: ["U-CADC34", ...downstreamUpdates.map((u) => u.unit)],
  phase7_placeholders_removed: removed7,
  downstream_entry_conditions_stripped: downstreamUpdates,
  capability_preserved_by: [
    "U-CADC-MSR05 (Regen-Full — All 9,794 files; was described as 'existing U-CADC34 gauntlet wrapped')",
    "CAD-UIX-MS0 / P8-SHOP-REAL-TIME / U-CUIX-P8-INFRA-02 (GoldenCorpusRegistryEngine)",
    "CAD-UIX-MS0 / P8-SHOP-REAL-TIME / U-CUIX-P8-MSTR-03, P2-HCAD-03, P3-F360-02, P4-INV-02, P5-SW-03, P6-FC-03 (Print→CAD round-trip per priority CAD)",
  ],
  track_a_git_repair_status: "pending — planned as separate step (fresh clone + patch replay) per Plan Track A.option-1",
};
cc.scrutiny_round_5_complete = true;

writeFileSync(CC, JSON.stringify(cc, null, 2) + "\n", "utf8");

// ── 5. Mirror in roadmap-index.json ─────────────────────────────────────
const entry = idx.milestones.find((m) => m.id === "CAD-COMPLETE-MS0");
if (!entry) throw new Error("CAD-COMPLETE-MS0 not in roadmap-index");
if (!entry.description) entry.description = "";
if (!entry.description.includes("Round 5 cleanup")) {
  entry.description = entry.description.replace(/\s*$/, "") +
    ` Round 5 cleanup (${DATE}): U-CADC34 superseded — git corruption (tree ${CORRUPTED_TREE_OID.slice(0, 8)}… missing on disk), capability preserved by U-CADC-MSR05 + CAD-UIX-MS0 P8 gauntlet units.`;
}
entry.scrutiny_round_5_complete = true;
idx.updated_at = new Date().toISOString();

writeFileSync(IDX, JSON.stringify(idx, null, 2) + "\n", "utf8");

// ── 6. Summary ──────────────────────────────────────────────────────────
console.log("\n── CADC34 Cleanup summary ──");
console.log("U-CADC34 status:", cc.units["U-CADC34"].status);
console.log("PHASE-7 unit count:", phase7.units.length);
console.log(
  "MSR01 entry_conditions:",
  JSON.stringify(cc.units["U-CADC-MSR01"]?.entry_conditions),
);
console.log(
  "MSR05 entry_conditions:",
  JSON.stringify(cc.units["U-CADC-MSR05"]?.entry_conditions),
);
console.log("Round 5 block present:", !!cc.scrutiny_round_5_cleanup);
console.log("Index entry updated:", entry.description.includes("Round 5 cleanup"));
