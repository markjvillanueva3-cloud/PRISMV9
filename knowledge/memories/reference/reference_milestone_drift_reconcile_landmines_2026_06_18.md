---
name: reference_milestone_drift_reconcile_landmines_2026_06_18
description: "#4 milestone status-drift reconcile (192 envelopes claim not_started but have shipped units) is a CAREFUL unit, not a batch flip: 116 ->completed need git-VERIFICATION (correctness assertion), 76 ->in_progress are safe; landmine = TWO divergent milestone trees (mcp-server/data/milestones=753 canonical vs data/milestones=383 that reconcile-milestones.mjs wrongly targets)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.657Z
aliases: reference_milestone_drift_reconcile_landmines_2026_06_18
---


**Milestone status-drift reconcile (#4) -- scope + landmines (2026-06-18, slot:golf).**

`build-milestone-progress.mjs` (read-only, canonical detector) reports **192 drift cases** with
`drift==="claims_not_started_but_has_shipped_units"`. They split deterministically:
- **116x `not_started -> completed_real`** (shipped==total): envelope top `status:"not_started"` while ALL units
  `status:"complete"`. Flipping to `completed` is a CORRECTNESS ASSERTION (the milestone is DONE), so it needs
  per-milestone VERIFICATION that the shipping commits are real -- NOT a blind flip on git-id-matching (R12: marking
  116 milestones "completed" unverified is the "migration completed is a lie" trap). **This is the genuine free-model
  job** (verify each of the 116 off the rate-limited API).
- **76x `not_started -> in_progress_real`** (shipped<total): SAFE to flip to `in_progress` (work demonstrably started);
  no completeness claim. The lower-risk subset.
- (Separate, not the 192: 67 `n/a`/`no_units` drift -- milestones with no resolvable units; ignore for this reconcile.)

**LANDMINES (verified live this session -- do NOT rush):**
1. **TWO divergent milestone trees.** Canonical = `mcp-server/data/milestones/` (753 envelopes; used by
   `build-milestone-progress.mjs` + `close-out-milestone.mjs` + CLAUDE.md canonical-sources). Secondary/stale =
   `H:/prism/data/milestones/` (383 envelopes). Resolve which is authoritative + whether the 383 tree is live
   ANYWHERE before mutating either. (Likely the 383 tree is stale and should be reconciled/retired, but that is a
   separate audit -- do not assume.)
2. **`reconcile-milestones.mjs` is mis-targeted + insufficient.** Line 13 `join(import.meta.dirname,'..','data')`
   resolves to `H:/prism/data` (the 383 tree), NOT `mcp-server/data`. AND its status-resolver only fires for
   `status==='unknown' || !status` -- it SKIPS explicit `not_started`, so it would NOT fix any of the 192 even if
   pointed at the right tree. Its step-3 syncs index status FROM envelope status, so running it as-is could PROPAGATE
   the wrong not_started to the index. Needs a fix/rewrite, not a re-run.
3. **`close-out-milestone.mjs` is the DOWNSTREAM propagator only** -- it REFUSES unless `envelope.status` is already
   `completed`/`complete` (needs `--force` otherwise). It updates roadmap-index + regens MILESTONE_PROGRESS/BUILD_STATE
   + chat-bus. So the correct flow per verified-complete milestone: flip envelope `status` -> `completed`, THEN
   `close-out-milestone.mjs --milestone <ID>` to propagate. Envelope status vocab: `completed` (envelope word) ==
   `complete` (index canonical word, 345 entries); both accepted fleet-wide.

**Recommended next-pass plan:** (a) resolve the two-tree divergence FIRST; (b) build a correct reconciler (dry-run
default) for the canonical 753 tree; (c) auto-flip the SAFE 76 `->in_progress`; (d) for the 116 `->completed`, run a
free-model verification pass (does git show every unit shipped with a real commit?) then flip+close-out only the
verified ones, R12-reporting any that fail verification. Per-file scrutiny + tests required (load-bearing roadmap
state). Spec: `state/shared/specs/SYSTEM-APPLY-EFFICIENCY-ASSESSMENT-2026-06-17.md` (#4). Sibling
[[feedback_measure_injection_before_dedup_fix]] (the injection-side #1-#3 of the same spec, ALREADY-DONE).
