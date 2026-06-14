---
name: reference-memory-recall-supersede-exclusion-2026-06-01
description: "MEMORY-RECALL-SUPERSEDE/U-MRS-EXCLUDE (slot:golf, commit 06a6de1b51) — recall now EXCLUDES formally-superseded memories so no galaxy surfaces stale doctrine as current. Detector isSupersededMemory() keys on the canonical past-tense redirect syntax [SUPERSEDED ... [[target]]] / > **SUPERSEDED. The vault uses NO status:/superseded_by: frontmatter — supersession is a PROSE convention, now load-bearing for recall."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.207Z
aliases: reference_memory_recall_supersede_exclusion_2026_06_01
---


# Supersession-aware recall exclusion (U-MRS-EXCLUDE, 2026-06-01 slot:golf)

Commit `06a6de1b51` `[MEMORY-RECALL-SUPERSEDE]/U-MRS-EXCLUDE`.

## What shipped
`isSupersededMemory(body)` + `SUPERSEDED_DECL_RE` + `supersededExclusionEnabled()`
exported from `scripts/lib/memory-index-search-lib.mjs`. Wired into:
- `scripts/build-memory-index-sidecar.mjs#buildSidecar` (the BM25 sidecar — the
  **embeddings sidecar derives from it**, so this ONE filter point covers both
  arms; emits `supersededSkipped` in the sidecar + CLI output).
- `runMemoryIndexSearch` live-scan fallback (consistency when the sidecar is stale).
- **Galaxy brains are NEVER filtered** — they are the per-domain context anchors.

## The convention this makes load-bearing
The vault carries **NO** structured `status:` / `superseded_by:` frontmatter key
(verified: 0 of 11,493 files). Supersession is a PROSE convention with two forms:
- description field:  `[SUPERSEDED <date> → [[target]]]`
- body blockquote:    `> **SUPERSEDED <date> — see [[target]].**`

`SUPERSEDED_DECL_RE = /\[SUPERSEDED\b|(?:^|\n)\s*>\s*\*\*SUPERSEDED\b/` — **case-
sensitive** on the past-tense token. To mark a memory superseded so recall drops
it: add `[SUPERSEDED <date> → [[new-memory]]]` to its description (and keep the
file — never delete, per [[feedback_never_delete_only_disable]]).

## The precision trap (why a naive grep is wrong)
A loose `/superseded/i` matches **86** files; the canonical-syntax detector matches
exactly the **genuine redirects** (1 unique today: `feedback_alpha_owns_reaper`).
The ~79 difference are memories that merely DISCUSS supersession — and 3 specific
traps the detector MUST clear:
- `feedback_golf_owns_reaper` — says "SUPERSEDES" (present tense) = the SUPERSEDER,
  the CURRENT doctrine; must STAY.
- `reference_unblock_detect` — lists `superseded` as a DONE_STATUSES enum value.
- `feedback_never_delete_only_disable` — discusses the supersession concept.
All three correctly NOT matched (case-sensitivity + the `[`/`> **` anchor).

## Scope honesty
Excludes 1 stale memory today; primary value = **future-proofing** (every future
`[SUPERSEDED → [[]]]` auto-excludes) + the reusable detector for the planned
generation-side memory lint. Reversible: `PRISM_MEMORY_INDEX_KEEP_SUPERSEDED=1`.

## Lesson reinforced (false-gap discipline)
Two same-session hypotheses were DISPROVEN by verification before any build:
(1) "brain-refresh wiki→tribal step is mis-gated on dead /api/chat" — FALSE, it
correctly uses `requires:"embeddings"` (the 31.5% wiki-tribal coverage is a long
30-min batch + a 57h-stale audit, not a gate bug). (2) "nested `galaxies/<domain>/`
memories are missing from recall" — FALSE, they are duplicates of flat
`reference/`/`project/` twins that the namespace loop already indexes. Verify the
marker/gate/index BEFORE editing — the precise pattern often differs from the
obvious one. See [[feedback_verify_actual_contract_not_proxy]].

## Related
[[feedback_never_delete_only_disable]] · [[feedback_verify_actual_contract_not_proxy]]
· [[reference_alpha_memory_index_nofire_2026_05_29]] · [[reference_brain_refresh_scheduled_2026_05_31]]
· [[reference_alpha_galaxy_brain_recall_indexing_a3_2026_05_29]]
