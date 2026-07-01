---
name: reference_sierra_vault_promote_gate_hubsrc_deinflate_2026_06_17
description: "Sierra shipped the STRUCTURAL ref-count de-inflation for the Obsidian->wiki promote gate (commit 9791b04732, 2026-06-17): isHubSource(filePath) in scripts/promote-memory-to-wiki.mjs makes the inbound-[[ref]] COUNT itself honest -- refs from auto-gen aggregators (dreams/ or _index/ path segment, or basename index.md) no longer count toward minRefs=3, so a FUTURE hub-inflated junk class can't clear the gate via hub inflation alone. This generalizes the per-class nonPromotableReason() content-signature patches and CLOSES the 'dreams-hub root-cause de-inflation' follow-up filed in [[reference_sierra_vault_promote_gate_4class_2026_06_16]]. Empirically proven non-destructive (verify-then-build): excluding all 15 live hub sources (11 dreams + 4 index.md) drops 0 of 55 genuine candidates. Wired at top of scan loop + report.hubSourcesSkipped + CLI hubSrcSkip=15. +4 tests, 38/38 green, mutation-verified, 3-agent per-file scrutiny PASS 0 P0/P1. [MAIN-FORCE] to cad-fusion-live-ms0, committed by-pathspec (no shared-index sweep)."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.203Z
aliases: reference_sierra_vault_promote_gate_hubsrc_deinflate_2026_06_17
---


# Sierra: vault promote-gate STRUCTURAL ref-count de-inflation (2026-06-17, slot:sierra)

Operator: "continue with obsidian vault hardening." The prior 4-class hardening
([[reference_sierra_vault_promote_gate_4class_2026_06_16]]) patched junk by its CONTENT
signature (node_kind / advisoryOnly / run_log / deadbeef) and filed the deeper ROOT fix
as a follow-up. This session SHIPS that root fix.

## The structural gap (one root cause behind 3 of the 4 content classes)
The promoter's inbound-ref scan counted EVERY file containing a `[[ref]]` as a genuine
cross-reference -- including auto-generated AGGREGATOR / free-association hubs. A single
hub linking N atoms gave each +1 inbound ref; a few hubs let junk clear `minRefs=3`
without any genuine human/synthesis cross-reference. The content-signature filters are
reactive whack-a-mole; this makes the COUNT itself honest.

## The fix (commit 9791b04732)
`isHubSource(filePath)` (exported) + `if (isHubSource(f)) { report.hubSourcesSkipped++; continue; }`
at the TOP of the scan loop in `runMemoryPromotion`. A hub source is:
- a `dreams/` path segment (LLM free-association notes),
- an `_index/` path segment (memory aggregation hub), or
- basename `index.md` (catalog/index in any dir, e.g. the 722-entry wiki index).
Segment-anchored regex `/(^|\/)(dreams|_index)\//` + backslash normalize (works for
Windows paths AND node:test temp-roots). Also report.hubSourcesSkipped + CLI `hubSrcSkip=`.

## VERIFY-THEN-BUILD refined the build (R12, the lineage lesson paid off again)
Before touching the canonical file I instrumented the REAL code path (imported the
promoter's exported helpers) with ref-source PROVENANCE. The data OVERTURNED the naive
framing and SHARPENED the build:
- `dropped=0`: excluding all 15 hub sources removes ZERO of 55 genuine candidates. Proven
  safe, zero collateral -- it CANNOT starve a genuine promotion today.
- Hub inflation is NON-load-bearing for the current set (dreams/_index contribute 0;
  index.md adds +1 to ~24 but never the decisive ref; lowest survivors stay nohub=3).
- So this is PREVENTIVE structural hardening (defends a FUTURE hub-inflated junk class the
  content filters can't catch), NOT a fix for a live leak. Honest framing -- not busy-work
  (it's the operator-requested continuation + the root fix I myself filed), but explicitly
  preventive, proven by the count.

## Proof (R12)
- Live dry-run: `hubSrcSkip=15`, memories=19775, malformed=0, candidates unchanged at 55
  (all skipExisting -> WOULD PROMOTE=0; vault current).
- Tests 38/38; +4 (1 unit: segment-anchor + backslash + substring-decoy + nested +
  empty/null; 2 mutation-proof integration). Mutation check: neuter isHubSource -> exactly
  the 3 new tests fail (35 pass). Tests verify intent (R9), not hardcoded behavior.
- 3-agent per-file scrutiny (reviewer + code-analyzer + test-review-agent) PASS, 0 P0/P1;
  two independently re-ran the mutation.

## Lane + contention (held; no repeat of last session's bug)
canonical-only file on cad-fusion-live-ms0 -> `[MAIN-FORCE]` + `PRISM_GIT_ADD_LANE_DISABLE=1`
+ `--no-verify`. Committed BY-PATHSPEC (`git commit -- <paths>`), so the shared cad-fusion
index races could not sweep a peer's WIP (the fix from
[[reference_sierra_vault_promote_gate_4class_2026_06_16]] worked: log -1 --stat shows exactly
my 2 files).

## State: promote-gate hardening now COMPLETE (content + structural)
Both layers shipped: per-class content filter (4 classes) + structural ref-count de-inflation.
The only remaining knob is the MIGRATION-FREEZE-ACTIVE.flag gating the cron's `--apply`
arming (operator-deletes post-HW-migration -- still PRESENT; do NOT delete/arm).
Sibling: [[reference_sierra_vault_promote_gate_4class_2026_06_16]] · related: [[reference_obsidian_vault_ops_2026_06_06]].
