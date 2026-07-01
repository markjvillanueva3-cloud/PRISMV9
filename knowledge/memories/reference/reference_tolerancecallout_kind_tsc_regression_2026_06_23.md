---
name: reference_tolerancecallout_kind_tsc_regression_2026_06_23
description: "SHARED-BRANCH tsc regression on cad-fusion-live-ms0 (observed 2026-06-23 ~08:5x by slot:india): 19 tsc errors, 16 in src/data/cad-validation-corpus.ts ('kind' does not exist in type 'ToleranceCallout') + 1 PowerMillAIOrchestrationEngine + 2 ReinforcementLearningCAMFeedbackEngine. PEER-introduced (delta CAD / kilo CAM), NOT india. Build was 0-error ~15min earlier; 3 peer commits landed since (xray 815567da84, zulu 07fe88a068, sierra 481b96a479)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.223Z
aliases: reference_tolerancecallout_kind_tsc_regression_2026_06_23
---


# ToleranceCallout.kind tsc regression on cad-fusion-live-ms0 (peer, for delta/kilo)

**Observed 2026-06-23 (slot:india), surfacing per R12 — NOT india's to fix (CAD/CAM domain).**

`npx tsc --noEmit` (mcp-server) = **19 errors**, none in india files:
- `src/data/cad-validation-corpus.ts` x16 -- `error TS2353: Object literal may only specify known
  properties, and 'kind' does not exist in type 'ToleranceCallout'` (lines 34/35/36/54/...).
- `src/engines/PowerMillAIOrchestrationEngine.ts` x1.
- `src/engines/ReinforcementLearningCAMFeedbackEngine.ts` x2.

## Likely cause
`ToleranceCallout` (a CAD/GD&T type) was changed to REMOVE/RENAME a `kind` field (or the corpus added
`kind` without updating the type). `cad-validation-corpus.ts` data literals still specify `kind`. A peer
commit between india's `2f75447dab` and `836c9bd937` introduced it -- the build was full-tsc 0-errors
~15 min earlier (verified by india after commit `c6c3d77bf9`). Candidate commits in that window:
xray `815567da84`, zulu `07fe88a068`, sierra `481b96a479` (none obviously CAD -- the corpus/type edit may
be in an UNcommitted peer working tree that tsc still sees, or an earlier commit's type change only now
surfaced by a corpus edit).

## Action (delta = cad-validation-corpus / ToleranceCallout type; kilo = CAM engines)
Reconcile `ToleranceCallout` type vs `cad-validation-corpus.ts` usage: either re-add `kind` to the
`ToleranceCallout` interface or strip `kind` from the corpus literals + fix the 2 CAM engine consumers.
Run `npx tsc --noEmit | grep cad-validation-corpus` to enumerate.

## india note
india's same-session work (xproc/deepai/hookexec/selfaware/video-playbook-rules, 9 commits) is tsc-clean
in its own files (filtered tsc empty); these 19 errors are orthogonal. india's prior "tsc 0 across importers"
claims were true at their commit time. Lesson: on a fast-advancing shared branch, a fleet-wide `tsc` count
reflects PEER state -- always filter tsc to your own touched files before attributing errors to your change.
