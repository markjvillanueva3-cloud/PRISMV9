---
name: reference-golf-canonical-distill-clobber-2026-06-17
description: A tribal-knowledge DISTILL/regen process silently working-tree-deleted 9 hand-curated knowledge/wiki/code-tribal/canonical/*.md entries (workholding/coolant/op-ordering/tooling) and replaced them with auto-distilled hyperMILL-UI tips. Golf restored them from HEAD via the leave-a-copy-behind Stop guard (2026-06-17). The distill process must preserve/allowlist curated canon before regen.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.594Z
aliases: reference_golf_canonical_distill_clobber_2026_06_17
---


# Tribal-distill regen silently clobbered 9 curated canonical entries (2026-06-17, slot:golf)

## What the leave-a-copy-behind Stop guard caught

Stop blocked golf with "9 file(s) moved/deleted without leaving a copy" — all under `knowledge/wiki/code-tribal/canonical/`:
`coolant-chip-evacuation-strategy-flood-mql-tap-air-recutting.md`, `machining-tactics-climb-trochoidal-chip-thinning.md`, `op-order-rough-stress-finish.md`, `operation-ordering-sequencing-roughing-finishing-datums.md`, `part-setup-first-surface-datum.md`, `part-setup-probing-edge-find-wcs-tool-offsets.md`, `tooling-selection-geometry-coating-stickout.md`, `workholding-practices-locating-clamping-distortion-repeatability.md`, `workholding-soft-jaw-cycle.md`.

Golf did NOT touch that dir this session (only AGENT_CHAT bus posts + a C: memory file). The guard fires on the working-tree state, not session attribution.

## Root cause (git evidence)

- All 9 were **unstaged working-tree deletions** (` D` in `git status`), and **HEAD + index still had every one** (`git cat-file -e HEAD:<f>` succeeded) → NOT a committed peer change, an accidental/uncommitted loss.
- Same dir flooded with new untracked files + a `_DISTILL_LOG.json` and a flood of `a-*.md` auto-distilled hyperMILL/OPEN-MIND-UI tips (`a-compound-job-...`, `a-depot-go-to-the-depots-tab-...`). → a **tribal-knowledge canonical DISTILL/regen process** regenerated the directory and dropped the 9 hand-curated entries while writing lower-value auto-distilled ones.

## Fix

`git checkout -- <the 9 paths>` (restores from index; HEAD had them; non-destructive — the new untracked files are untouched). Verified: 0 remaining ` D` in canonical, both spot-checked files present. Stop unblocks.

## Follow-up for the distill owner (not golf's galaxy)

The canonical-distillation process **must preserve or allowlist the hand-curated canon entries before regenerating** `knowledge/wiki/code-tribal/canonical/` — silently overwriting curated machining tribal knowledge (workholding/coolant/op-ordering/tooling, which is safety-relevant: G-code → real iron) with auto-distilled UI tips is the silent-file-loss class the leave-a-copy rule exists to stop. Surfaced to AGENT_CHAT bus. If recurring, the 9 curated names should be added to the distill process's keep-list (or `state/shared/file-relocation-allowlist.json` is the WRONG fix here — that would *permit* the loss, not prevent it).

## Cross-refs
- Leave-a-copy-behind Stop guard: the U-WIRE12 incident rationale (4 engines + 2 schemas stranded across a branch fork).
- `knowledge/wiki/code-tribal/canonical/_DISTILL_LOG.json` — the distill process's own log (start here to find the owner).
