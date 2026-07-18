---
name: reference_papa_vault_graph_coverage_2026_06_12
description: Obsidian vault IS already in the master graph (memories 17,388 + wiki 43,531 nodes); the "99.98% invisible" claim was a delta-vs-total misread. Real gap = ~4,460 non-wiki/non-memories files (tribal/claude-md/gsd/Skills/decisions).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.725Z
aliases: reference_papa_vault_graph_coverage_2026_06_12
---


Slot papa, 2026-06-12 (session 14ef4ae0), R12 catch during the efficiency/skill audit `/goal`.

**Verified-live facts about Obsidian-vault → master-graph coverage:**
- `grep -oE '"id":"memory_[^"]+"' state/shared/system-viz/system-graph.json | wc -l` = **17,388** → the entire `knowledge/memories` vault (17,991 .md) is ALREADY first-class graph nodes.
- `knowledge/wiki` = **43,531** graph nodes (43,798 .md) — already in-graph.
- Real gap (files-on-disk but ~1 graph node): `tribal/` **4,247**, `claude-md/` 88, `gsd/` 69, `Skills/` 41, `decisions/` 5 ≈ **~4,460 files** → the correct build is `U-VAULT-ATOMIC-COVERAGE` (clone `generate-memories-atomic.mjs` for the other namespaces).

**The bug class (why an ultracode synthesis agent got it wrong):** `state/shared/system-viz/memories-atomic-augmentation.json` is an **INCREMENTAL DELTA**, not a total. `scripts/generate-memories-atomic.mjs:84` (`if (existingIds.has(id) || seenId.has(id)) continue;`) emits a node ONLY when it's not already in `system-graph.json`. Its `nodesEmitted:4 / parentExisting:4` means "4 new since last merge; the other 17,372 already in-graph." The agent read `nodesEmitted:4` as "only 4 of the vault is indexed → 99.98% invisible." **Always verify an augmentation generator's coverage against the actual graph node count (`grep '"id":"<prefix>_'`), NOT its delta-file's `nodesEmitted`.** Sibling of [[feedback_read_full_content_not_titles]] + [[feedback_verify_actual_contract_not_proxy]]. The 10-agent fan-out (`wf_04e4f627`) was rate-limited so only the lone synthesis agent ran — single-agent audit claims have no corroboration; treat as hypotheses (R12).
