---
title: SYSTEM-VIZ-DSL-MS0 — DSL shortcode extension to system-viz graph nodes
type: architecture
milestone: SYSTEM-VIZ-DSL-MS0
status: complete
shipped_at: 2026-05-16
shipped_by: claude-b6c4b196 (slot alpha)
shipped_commit: a0b7091266
depends_on:
  - SYSTEM-VIZ-FS-COVERAGE-MS1
---

# SYSTEM-VIZ-DSL-MS0

Extends `CodeSystemIndexEngine`'s `CODE_SYSTEM_INDEX.json` (3,742 codes covering 14
file-tree-scanned categories) with system-viz graph node types that the file-tree scanner
misses. Adds **5 new categories**: AC (action), SK (skill), ML (milestone), FM (formula),
GH (ghost L13). Live state after apply: **3,742 → 4,180 codes** (+438: 381 milestones +
57 ghosts).

## Why a DSL extension matters

Token cost of cross-references in prompts, hooks, agent output, and wiki entries:

- Full name `WiringBatchExecutorEngine` ≈ 5 Claude tokens
- Shortcode `E1234` ≈ 2 tokens → **60 % saving**
- Full name `ai_route_mill_pipeline` ≈ 6 tokens
- Shortcode `AC0042` ≈ 3 tokens → **50 % saving**

The savings only matter for asset types that appear in *conversation* — engines,
dispatchers, actions, hooks, skills, milestones, formulas. They do NOT matter for the
L10-L12 mass (372 k graph nodes — files, bundles, canonical-file nodes) which are
graph-walk targets, never cross-references. This milestone scopes accordingly.

## What ships

| Artifact | Role |
|---|---|
| `scripts/regen-dsl-shortcodes.mjs` | Pure-export script. Atomic JSON writer. 7 exports: `assignShortcodes`, `extractNewNamesFromGraph`, `NEW_CATEGORIES`, `DSL_VERSION`, `SHORTCODE_BODY_DIGITS`, `SHORTCODE_CAPACITY_PER_CATEGORY`, `main`. CLI: `--dry-run` / `--apply` / `--json`. |
| `scripts/regen-dsl-shortcodes.test.mjs` | 24 `node:test` cases — assignment determinism, preservation of existing codes, overflow telemetry, name extraction by `kind`, deduplication, case-insensitive matching, end-to-end. |
| `mcp-server/data/docs/CODE_SYSTEM_INDEX.json` | Extended file — `_meta.version: 3.0.0`, `_meta.total_codes: 4180`, new `categories.AC/SK/ML/FM/GH` entries with `source: system-viz-graph`. |

## New category schema

| prefix | kind matcher | typical width |
|--------|--------------|----------------|
| `AC` | `kind === "dispatcher.action"` | `AC0001`..`AC9999` |
| `SK` | `kind === "skill"` | `SK0001`..`SK9999` |
| `ML` | `kind === "milestone"` | `ML0001`..`ML9999` |
| `FM` | `kind === "formula"` | `FM0001`..`FM9999` |
| `GH` | `kind.startsWith("ghost.")` | `GH0001`..`GH9999` |

**Predicate rule:** uses `kind` ONLY, NOT `layer`. The L# bands in the graph hold
heterogeneous types — L8 has 21,774 nodes mostly `wiki_entry` (not `skill`), L9 has 28,589
nodes mostly mixed. The discriminator that *actually identifies the intended type* is the
explicit `kind` field set by graph builders. The original attempt used `layer === "L8"` and
matched 21K wiki entries as bogus skills — that was rolled back; see [[feedback_predicates_use_kind_not_layer]] (TODO link to be added).

## Capacity

- Body: 4 digits → max 9,999 codes per prefix
- Alphanumeric expansion if needed: 62 chars × 4 positions = **14.8 M per prefix**
- 372 k total graph nodes would fit in a single 4-char alphanumeric body (`62^4 = 14.8 M`)
- BUT — 278 k of those are `fs.file` (L12 canonical files) which are NOT cross-referenced
  and stay outside the DSL by design (see "Why" above)

## Live state after this ship

```
total codes:    4,180 (was 3,742)
+ 381 ML codes (milestones from graph kind=milestone)
+  57 GH codes (ghosts from graph kind=ghost.*)
+   0 AC codes (current graph has 0 nodes tagged kind=dispatcher.action — those live as wiki_entry)
+   0 SK codes (current graph has 0 nodes tagged kind=skill — those live as wiki_entry)
+   0 FM codes (current graph has 0 nodes tagged kind=formula — those live as wiki_entry)
```

The AC/SK/FM zero-counts are NOT a bug — the graph builders haven't typed those node
classes yet. **Follow-up unit**: extract dispatcher actions / skills / formulas from
`wiki_entry` nodes by inspecting `wiki_entry.entry_type` (the file-level category in the
wiki frontmatter). That unit is deferred to `SYSTEM-VIZ-DSL-MS1` — not in this milestone's
scope.

## Determinism contract

`assignShortcodes(existingCodes, newNamesByCategory, opts)` is a **pure function**:

1. Same input → identical output (sort order, body assignment, overflow ledger)
2. Existing codes preserved VERBATIM — no reassignment
3. New names assigned in sorted-ASC order — `alpha` < `mike` < `zebra` regardless of
   input array order
4. Code-body assignment fills gaps before extending — if `AC0001` and `AC0003` exist, a
   new name takes `AC0002`

## Knobs (env)

None at runtime — all parameters are constructor opts to `assignShortcodes` (used
internally only). CLI flags are `--dry-run` / `--apply` / `--json` / `--graph <path>` /
`--index <path>`.

## Companion surfaces

- [[code-system-index-engine]] — the engine that resolves shortcodes (already deployed)
- `mcp-server/data/docs/CODE_SYSTEM_INDEX.json` — the index file
- [[system-viz-fs-coverage-ms1]] — sibling milestone that ships in the same commit
- [[fast-resource-lookup]] — the broader DSL surface in CLAUDE.md

## Future work (NOT in this milestone)

- **SYSTEM-VIZ-DSL-MS1**: extract typed nodes from `wiki_entry` corpus → fills AC/SK/FM
- **DSL emission in master-index hits**: surface shortcode alongside name in every
  `master-index-precheck-inject` block (token-efficient cross-references in prompts)
- **L12-canonical-file shortcoding**: if cross-references to specific files become common
  in prompts (currently rare), add `FN###` category with sequential body
