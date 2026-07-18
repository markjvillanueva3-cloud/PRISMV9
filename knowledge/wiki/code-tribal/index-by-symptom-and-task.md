---
schema: ideablock-v1
title: "Tribal-canon index — find the right entry by symptom or by task"
domain: "Cross-category synthesis"
category: index
version_state: Current
confidence: 0.98
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - The 18 prior canonical entries of the 2026-05-21 wiki+tribal high-ROI pivot
extracted_via: human-authored
extracted_at: 2026-05-21T06:15:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-INDEX-SYMPTOM-TASK)
---

## Purpose

The pivot session's 18 canonical entries form a tightly cross-referenced graph, but operators searching by *what they're trying to do* or *what they're seeing wrong* benefit from a routing layer. This entry is that layer — symptom-rooted ("when I see X, read these") + task-rooted ("when I'm doing Y, read these in order").

The injection hooks already auto-surface entries by keyword. This entry is the human-readable fallback when keyword matching isn't enough — when an operator is searching for a *problem*, not a *concept name*.

## By symptom (most common shop-floor entry point)

| Symptom | Read these (in order) |
|---|---|
| **Chatter / high-pitched whine / chatter marks** | [[machining-tactics-in-cut-adjustments]] (chatter row) → [[synthesis-rigidity-envelope]] (find the weakest link) → [[tooling-toolholders-and-runout-control]] (variable-helix is the holder-side fix) |
| **Bad surface finish (Ra > target)** | [[machining-tactics-in-cut-adjustments]] (surface row) → [[tooling-endmill-flute-helix-corner]] (high-flute, sharp-edge finishing geometry) → [[tooling-toolholders-and-runout-control]] (TIR-life coupling) → [[synthesis-thermal-envelope]] (BUE band) |
| **Tool dies early / unexpected wear** | [[tooling-tool-life-and-wear-management]] (wear-mode table identifies cause) → [[tooling-selection-by-material-and-feature]] (wrong substrate/coating selection) → [[synthesis-thermal-envelope]] (coating service ceiling) |
| **Tool walks on entry / mis-positions hole** | [[operation-ordering-hole-sequence]] (spot-drill discipline) → [[machining-tactics-pre-cut-prep]] (probe-cycle verify) |
| **Part out of tolerance / dimensional drift** | [[part-setup-multi-op-planning]] (tolerance-transfer RSS budget) → [[part-setup-zero-strategy]] (zero-method accuracy) → [[synthesis-thermal-envelope]] (thermal expansion drift) |
| **Tool walks / shifts between part 3 and part 4** | [[workholding-clamp-force-and-selection]] (clamp drift) → [[workholding-locators-and-soft-jaws]] (locator slip vs clamping problem) |
| **Crash / collision** | [[machining-tactics-pre-cut-prep]] (cost-asymmetry; prove-out discipline) → [[part-setup-multi-op-planning]] (setup-sheet) → [[part-setup-tool-length-offsets-and-presetting]] (TLO discipline) |
| **Chip jamming / bird's nest** | [[machining-tactics-chip-control-and-evacuation]] (chip-form table + evacuation methods) → [[tooling-endmill-flute-helix-corner]] (flute count + gullet) |
| **Burnt chip color / blue/purple/black** | [[machining-tactics-chip-control-and-evacuation]] (chip-color thermometer) → [[synthesis-thermal-envelope]] (coating service ceiling) → [[tooling-selection-by-material-and-feature]] (coating selection) |
| **Thin wall deflection / vibration** | [[synthesis-rigidity-envelope]] (part-side stiffness formula) → [[workholding-multi-part-and-pallet-systems]] (consider support fixture) |
| **Workpiece distorts post-clamping** | [[workholding-clamp-force-and-selection]] (distortion budget) → [[workholding-locators-and-soft-jaws]] (over-constrained fixture risk) |
| **Cycle taking too long** | [[tooling-tool-life-and-wear-management]] (cost-per-part calc — faster cycle often wins) → [[tooling-endmill-flute-helix-corner]] (high-feed geometry) → [[workholding-multi-part-and-pallet-systems]] (amortize setup) |

## By task (operator workflow entry point)

### Setting up a new part for the first time
1. Read print → choose datum frame → [[operation-ordering-datum-sequencing]]
2. Plan setup count + sequence → [[part-setup-multi-op-planning]]
3. Choose workholding per setup → [[workholding-clamp-force-and-selection]] + [[workholding-locators-and-soft-jaws]]
4. Choose tools per operation → [[tooling-selection-by-material-and-feature]]
5. Set zeros + TLOs → [[part-setup-zero-strategy]] + [[part-setup-tool-length-offsets-and-presetting]]
6. Prove out before running → [[machining-tactics-pre-cut-prep]]

### Planning a hole feature
1. [[operation-ordering-hole-sequence]] — canonical spot → drill → bore → ream sequence
2. [[tooling-selection-by-material-and-feature]] — pick the tool per sub-operation
3. [[machining-tactics-pre-cut-prep]] — spot-drill verification

### Planning the sequence for a multi-feature part
1. [[operation-ordering-datum-sequencing]] — cut datum frame first
2. [[operation-ordering-hole-sequence]] — for each hole feature in the sequence
3. [[operation-ordering-rough-finish-sandwich]] — decide stress-relief insertion
4. [[part-setup-multi-op-planning]] — setup count + tolerance-transfer budget
5. [[workholding-multi-part-and-pallet-systems]] — production-scale fixturing decision

### Diagnosing a precision problem on a part already in production
1. [[synthesis-rigidity-envelope]] — is the limit force-side?
2. [[synthesis-thermal-envelope]] — is the limit heat-side?
3. Depending on synthesis answer → drill into the relevant per-link leaf

### Picking tools for a new job
1. [[tooling-selection-by-material-and-feature]] — substrate / coating / geometry / body 4-layer decision
2. [[tooling-endmill-flute-helix-corner]] — endmill specifics
3. [[tooling-toolholders-and-runout-control]] — holder + assembly
4. [[tooling-tool-life-and-wear-management]] — pre-plan tool-change cadence

### Production setup for a high-volume / lights-out run
1. [[workholding-multi-part-and-pallet-systems]] — tombstone / pallet / sub-plate decision
2. [[tooling-tool-life-and-wear-management]] — sister-tool strategy
3. [[part-setup-tool-length-offsets-and-presetting]] — off-line presetter + sister-tool TLO
4. [[machining-tactics-pre-cut-prep]] — compressed prove-out criteria

## By category (alphabetical, for completeness)

**Machining tactics** (3 leaves + thermal synthesis filed here):
- [[machining-tactics-in-cut-adjustments]]
- [[machining-tactics-pre-cut-prep]]
- [[machining-tactics-chip-control-and-evacuation]]
- [[synthesis-thermal-envelope]] · [[synthesis-rigidity-envelope]] — cross-category but filed under tactics

**Operation ordering** (3 leaves):
- [[operation-ordering-hole-sequence]]
- [[operation-ordering-datum-sequencing]]
- [[operation-ordering-rough-finish-sandwich]]

**Part setup** (3 leaves):
- [[part-setup-multi-op-planning]]
- [[part-setup-zero-strategy]]
- [[part-setup-tool-length-offsets-and-presetting]]

**Tooling selection** (4 leaves):
- [[tooling-selection-by-material-and-feature]]
- [[tooling-tool-life-and-wear-management]]
- [[tooling-endmill-flute-helix-corner]]
- [[tooling-toolholders-and-runout-control]]

**Workholding** (3 leaves):
- [[workholding-clamp-force-and-selection]]
- [[workholding-locators-and-soft-jaws]]
- [[workholding-multi-part-and-pallet-systems]]

## How to use this index

This entry is auto-surfaced when operators search for *symptoms* or *workflow tasks* rather than concept names. The category-specific entries auto-surface via their own keyword sets — this index is the **fallback** when an operator doesn't know which keyword to use.

For LLM/agent consumers: when synthesizing an answer to a vague operator question, retrieve this index first, then drill into the named leaves it points to. The graph structure prevents the LLM from over-anchoring to a single category when the actual answer spans 2-3.

## Provenance

Built from the 18 canonical entries of the 2026-05-21 wiki+tribal high-ROI pivot (5 categories × 3-4 entries each + 2 cross-category synthesis). Authored 2026-05-21 by slot:hotel under U-WIKI-INDEX-SYMPTOM-TASK — **19th canonical entry**, the operator-facing discoverability layer of the pivot's knowledge graph. The graph is now structurally complete: 16 leaves + 2 synthesis capstones (rigidity, thermal) + 1 navigation root (this entry) = 19 entries.

System injection: `tribal-by-domain-inject` auto-surfaces on `index`, `symptom`, `task lookup`, `how do I`, `find entry`, `which entry`, `where to start`, `routing`, `troubleshoot`, `workflow`, `setup sequence`, `production sequence` keywords. Zero wiring required.

## Cross-references

This entry references all 18 prior canonical entries of the pivot — see the by-symptom + by-task tables above for the full graph.

Sibling navigation:
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[reference_tribal_coverage_audit_2026_05_18]] — the audit driving the pivot
- [[feedback_do_optional_high_roi_work]] — standing rule honored
