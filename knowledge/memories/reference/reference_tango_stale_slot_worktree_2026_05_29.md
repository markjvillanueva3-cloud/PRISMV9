---
name: reference-tango-stale-slot-worktree-2026-05-29
description: slot/tango worktree was ~1900 commits behind integration; galaxy work lands on cad-fusion-live-ms0 [MAIN]
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.220Z
aliases: reference_tango_stale_slot_worktree_2026_05_29
---


At the 2026-05-29 galaxy buildout, the `H:/prism-slot-tango` worktree (branch `slot/tango`, HEAD `a87f10e75c [ALGO-SYNERGY-MS0]`) was ~1900 commits BEHIND the integration branch `cad-fusion-live-ms0`. It was missing the entire galaxy-buildout scaffolding: `state/shared/slot-souls/`, `.claude/hooks/slot-context-bundle-inject.mjs`, the assessment doc, and ALL sibling galaxies.

**Decision (R7 — surface conflict, don't average):** build the discovery galaxy in the shared `H:/prism` tree on `cad-fusion-live-ms0` and commit with a `[MAIN]` prefix — exactly the pattern every shipped sibling galaxy used (golf `a9562a791c`, echo, kilo all committed [MAIN] on integration, NOT via slot-branch merge). Building on the stale `slot/tango` branch would have produced orphaned, unmergeable work that future sessions never see — defeating the operator's goal.

**Lesson for future tango sessions:** the slot worktree being current is NOT guaranteed. Before galaxy/doc work, check `git log -1 slot/tango` vs `cad-fusion-live-ms0`; if far behind, work on integration with [MAIN]. The slot-worktree commit discipline applies to feature code that genuinely merges through the slot branch — not to fleet-wide additive galaxy docs.
