---
name: system-viz-dsl-ms0-2026-05-16
description: SYSTEM-VIZ-DSL-MS0 shipped — extends CODE_SYSTEM_INDEX.json with 5 new categories (AC/SK/ML/FM/GH) for system-viz graph node types
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.976Z
aliases: reference_system_viz_dsl_ms0_2026_05_16
---


2026-05-16 SYSTEM-VIZ-DSL-MS0/U-DSL-EXTEND shipped in commit `a0b7091266` (slot alpha, claude-b6c4b196 on DESKTOP-N7MI1VB).

**Extends `CodeSystemIndexEngine`'s CODE_SYSTEM_INDEX.json** with system-viz graph node types the file-tree scanner misses:
- AC = Action (kind:dispatcher.action) — 0 codes added (graph nodes still typed `wiki_entry`)
- SK = Skill (kind:skill) — 0 codes added (same)
- ML = Milestone (kind:milestone) — **381 codes added** (ML0001..ML0381)
- FM = Formula (kind:formula) — 0 codes added (same)
- GH = Ghost L13 (kind:ghost.*) — **57 codes added** (GH0001..GH0057)

**Live state:** 3,742 → **4,180 codes** (+438). `_meta.version` bumped 2.0.0 → 3.0.0.

**Predicate-kind-not-layer rule (load-bearing):** L# bands in the graph hold heterogeneous types. L8 has 21,774 nodes mostly `wiki_entry` (NOT skills); L9 has 28,589 mixed. Predicates MUST use `kind` field only. First attempt used `layer === "L8"` and matched 21K wiki entries as bogus skills — rolled back via surgical clean script + re-applied with tightened predicates.

**Files:**
- `scripts/regen-dsl-shortcodes.mjs` — pure-export, atomic writer, 7 exports
- `scripts/regen-dsl-shortcodes.test.mjs` — 24 `node:test` cases (assignment determinism, preservation of existing codes, overflow telemetry, name extraction by kind, dedup, case-insensitive, end-to-end)

**Token efficiency:** 50-80% saving on cross-referenced asset names in prompts. `WiringBatchExecutorEngine` (5 tokens) → `E1234` (2 tokens). Only matters for asset types in *conversation*, NOT L10-L12 mass (372K nodes — graph-walk targets, never cross-references).

**Determinism contract:** `assignShortcodes` is pure — same input → identical output. Existing codes preserved verbatim. New names sorted ASC for stable assignment. Gap-fill before extension (if AC0001 + AC0003 exist, AC0002 fills next).

**Deferred to SYSTEM-VIZ-DSL-MS1 (NOT in this milestone):**
1. Extract typed nodes from `wiki_entry` corpus → fills AC/SK/FM (currently 0)
2. DSL emission in `master-index-precheck-inject` hits → token-efficient prompt cross-refs
3. L12-canonical-file `FN###` category (only if file cross-refs become common in prompts)

Wiki: [[system-viz-dsl-ms0]] · Companion: [[code-system-index-engine]] · Sister: [[system-viz-fs-coverage-ms1]].


## Related
[[engines/CodeSystemIndexEngine|CodeSystemIndexEngine]] • [[engines/WiringBatchExecutorEngine|WiringBatchExecutorEngine]] • [[skills/regen-dsl-shortcodes|/regen-dsl-shortcodes]]