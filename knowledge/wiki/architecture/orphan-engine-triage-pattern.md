---
schema: ideablock-v1
title: "Orphan engine triage pattern — closing the 12,460 orphan nodes + 125 'Other' catchall"
domain: "PRISM architecture"
category: architecture
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - PRISM-INVENTORY-LATEST.md (3314 engines, 97 dispatchers)
  - BUILD_STATE.md (Other domain: 125 unwired; 639 total unwired)
  - state/shared/system-viz/system-graph.json (12460 orphan nodes — utilization data)
  - duplicationGuardEngine + WIRE-EXEMPT convention
extracted_via: human-authored
extracted_at: 2026-05-21T09:55:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-ARCH-ORPHAN-TRIAGE)
---

## Question

PRISM has 12,460 orphan nodes (per system-graph.json) and 125 "Other" unwired engines. Not all of them should be wired — some are stubs to delete, some are wrappers to tag WIRE-EXEMPT. What's the canonical triage workflow?

## Answer (canonical — 4-class taxonomy; read each engine before any action)

### The 4 orphan classes — distinct fixes

| Class | Symptom | Fix | Frequency in "Other" 125 |
|---|---|---|---|
| **Wireable** | Engine has public API, dispatcher fits | Wire per [[wiring-pattern-engine-to-dispatcher]] | ~50-60 % |
| **Wrapper** | Engine wraps a singleton or facade pattern; consumer is the wrapper | Tag `// WIRE-EXEMPT: <wrapper-name>` + verify wrapper IS wired | ~15-20 % |
| **Legacy stub** | Engine returns placeholder, throws, or empty data; never finished | Delete the file + log archive note in `_legacy-deleted` index | ~15-20 % |
| **Orphaned by rename** | Old engine name from a prior rename; the work moved to a renamed engine | Delete + verify the renamed engine is wired | ~5-10 % |

The first action on EVERY orphan: **read it.** The class isn't visible from the filename — only from the file content.

### Stage 1 — read the engine (no exceptions)

`Read mcp-server/src/engines/<EngineName>.ts` and look for:

1. **Public method signatures** — are there real input/output contracts, or is the file empty / stub?
2. **Body content** — real logic, or placeholder returns (`return { ok: true }` with no work, or `throw new Error("not implemented")`)?
3. **Imports** — what does this engine depend on? Active engines, or other orphans?
4. **Exports** — `export default class` vs `export const singleton =` vs no exports at all?
5. **Date / author** — git log first commit. Engines pre-2026-04 are higher-risk for "renamed-from" orphans.

Classification is a 30-second read decision, NOT a tool-call decision.

### Stage 2 — class-specific action

**Class: Wireable** (50-60 % of orphans). Apply the 6-step pattern from [[wiring-pattern-engine-to-dispatcher]]. The "Other" domain catchall is the hardest because there's no automatic dispatcher mapping — pick by reading the engine's domain:
- Material engines → `prism_data` or `prism_calc` (depending on whether they query a registry or compute)
- Visualization engines → `prism_l2:viz_*`
- Reporting engines → `prism_business:reporting_*` or `prism_export`
- Hook-related engines → typically wrappers (see WIRE-EXEMPT pattern); read carefully

**Class: Wrapper** (15-20 %). Pattern:
```typescript
// WIRE-EXEMPT: wraps QdrantMemoryEngineSingleton (consumed via prism_memory:qdrant_vector_*)
export class QdrantMemoryEngine { /* ... */ }
```
Tag with the wrapper name + the canonical wired consumer. Verify the wrapper IS wired (`grep -r 'QdrantMemoryEngineSingleton' src/tools/dispatchers/`). If the wrapper itself is orphaned → recurse to wrapper, not this engine.

**Class: Legacy stub** (15-20 %). Verify it's a true stub:
```bash
# Check for any production code that imports the engine
rtk grep -r "from.*<EngineName>" src/ --include="*.ts" | grep -v "__tests__" | grep -v "engines/<EngineName>"
# If empty → true orphan, safe to delete
# If hits → engine is consumed; reclassify as Wireable or Wrapper
```
Delete the file + log to `state/shared/_legacy-deleted-engines.jsonl`:
```json
{"date":"2026-05-21","engine":"<EngineName>","reason":"stub-with-no-consumers","sha-before-delete":"<sha>","verified-by":"<slot>"}
```

**Class: Orphaned by rename** (5-10 %). Search git log for `git log --all --follow -- src/engines/<EngineName>.ts` — find the rename commit (`R<N>` op). Verify the renamed-to engine is wired + tested. Delete the old name if confirmed superseded; cross-reference in the deletion log.

### Stage 3 — the 12,460 orphan-node graph problem

`system-graph.json` (110K nodes) marks orphans by "no inbound + no outbound edges." 12,460 is the count from the latest utilization scan. Decomposition:

| Source of orphans | Approx count | Fix |
|---|---|---|
| Engine files unwired (the 639) | ~639 | Wire per the wiring pattern |
| Wrapper engines (wire-exempt) | ~200-300 | Tag WIRE-EXEMPT + verify wrapper consumer |
| Test fixtures / mock data | ~1500-2000 | Move to `__fixtures__/` (out of graph scope) |
| Type definitions / interfaces | ~500-1000 | Re-classify as L1 type nodes, not L7 engine nodes |
| Stale rename leftovers | ~200-500 | Delete + log |
| Genuine legacy stubs | ~1000-1500 | Stage-2 delete workflow |
| Edge-case graph nodes (utility scripts, one-off code) | ~remainder | Project-by-project triage |

The 12,460 number is **not** a 12,460-engine deletion task. Most are graph-side classification issues, not file-deletion work. The canonical fix is the L1/L7 layer-tagging refinement in `scripts/build-system-graph.mjs` — not engine cleanup.

### Stage 4 — verify post-triage

For each engine you handle:
1. `rtk npm run build:fast` — ensure no import errors.
2. `rtk npx vitest run --reporter=verbose` — run affected tests. Particularly the dispatcher test that owns the engine you wired.
3. Re-run `BUILD_STATE.md` regen: `node scripts/build-state-snapshot.mjs`. The unwired count should decrease by exactly the number you wired.
4. Re-run `audit-unwired-engines.mjs`: the engines you handled should disappear from the orphan list OR appear as WIRE-EXEMPT.

### Anti-patterns from the floor

- **"Just wire everything in 'Other' to a single catchall dispatcher."** Wrong — every dispatcher has a domain. `prism_other` doesn't exist for a reason. Read each engine.

- **"WIRE-EXEMPT silences the hook, so use it liberally."** No. `WIRE-EXEMPT` is for **wrappers that route through a wired consumer**. Using it on a non-wrapper to silence the hook is the precise reason for the `stop_on_unwired_assets` hard-block. Each tag must name the wired consumer.

- **"Delete every stub immediately."** Some "stubs" are placeholder engines with active consumers that are themselves orphans. Deleting them breaks downstream. Always grep for consumers FIRST.

- **"The 12,460 orphan count is alarming — emergency cleanup needed."** No — the count is mostly graph-classification artifacts (test fixtures, types, utility scripts). The actionable subset is the 639 unwired engines + 125 "Other" catchall. The other 11,000+ are graph-side concerns.

- **"Wire-by-pattern-match."** Engines aren't filename-mappable to dispatchers. The "Mill" prefix doesn't mean `prism_mill` — some Mill engines belong in `prism_safety` (force limits), some in `prism_cam` (toolpath), some in `prism_calc` (kinematics). Read the engine.

- **"Run dispatcher-wirer agent without reading."** The dispatcher-wirer subagent will wire correctly *if you've already classified the engine*. Feed it pre-classified engines, not raw orphans.

### Operator picks — next 3 batches I recommend

| Priority | Batch | Why FIRST |
|---|---|---|
| **P0** | "Other" catchall (125 engines): read + classify each | Largest single bucket; high signal-to-noise; classifying alone unlocks subsequent batches |
| **P0** | AISubsystem + Agent + Alarm (top 3 named orphans) | Foundational engines; their orphan status blocks downstream consumers |
| **P1** | Outcome (8 unwired analytics engines) | Closes the closed-loop-learning bridge ([[deep-integration-bridge-pattern]] #10) |

### Tie-ins (PRISM-side)

- `audit-unwired-engines.mjs` — script to refresh the unwired list
- `BUILD_STATE.md` / `.json` — auto-snapshot of unwired counts
- `stop_on_unwired_assets` Stop hook — HARD-BLOCK on orphans (this is what makes wiring discipline matter)
- `duplicationGuardEngine.mustCheckBeforeCreating()` — pre-create dedup
- `dispatcher-wirer` subagent — automated wiring after triage
- `state/shared/_legacy-deleted-engines.jsonl` — deletion audit log
- `system-graph.json` — graph-side orphan source

### Tie-ins (tribal canonical + sibling bridges)

- [[wiring-pattern-engine-to-dispatcher]] — the wiring half of the workflow (stage 2 class: Wireable)
- [[lathe-wiring-backlog-bridge]] · [[cam-engine-wiring-bridge]] — domain-specific wiring bridges
- [[envelope-drift-close-out-pattern]] — sibling close-out pattern
- [[deep-integration-bridge-pattern]] — sibling: 16 deep-integration bridges
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (phase 2C)

## Provenance

Distilled from PRISM-INVENTORY-LATEST.md (2026-05-21: 3314 engines, 97 dispatchers) + BUILD_STATE.md (639 unwired, 125 in "Other" catchall) + system-graph.json (12,460 orphan nodes) + CLAUDE.md §ENGINE WIRING + duplicationGuardEngine + WIRE-EXEMPT convention. Authored 2026-05-21 by slot:hotel under U-WIKI-ARCH-ORPHAN-TRIAGE — **32nd canonical entry**, **6th bridge-class entry** of the wiki+tribal pivot phase 2C. Provides 4-class orphan taxonomy + per-class action workflow + 12,460-orphan graph decomposition.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` auto-surface on `orphan engine`, `orphan triage`, `WIRE-EXEMPT`, `legacy stub`, `delete stub engine`, `engine rename`, `Other catchall`, `12460 orphan nodes`, `audit unwired engines`, `_legacy-deleted-engines.jsonl` keywords. Zero new wiring required.

## Cross-references

- [[wiring-pattern-engine-to-dispatcher]] · [[lathe-wiring-backlog-bridge]] · [[cam-engine-wiring-bridge]] · [[envelope-drift-close-out-pattern]] · [[deep-integration-bridge-pattern]] — sibling architecture bridges
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (phase 2C)
- [[feedback_never_delete_only_disable]] — standing rule (apply with care; legacy-deleted log is the audit trail)
- [[feedback_high_roi_backend_first_slot_queue]] — backend-first picks
- [[feedback_do_optional_high_roi_work]] — standing rule
