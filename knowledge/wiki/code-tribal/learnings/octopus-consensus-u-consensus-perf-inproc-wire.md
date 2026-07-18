# OCTOPUS-CONSENSUS/U-CONSENSUS-PERF-INPROC-WIRE — [MAIN-FORCE] [OCTOPUS-CONSENSUS]/U-CONSENSUS-PERF-INPROC-WIRE (slot:india): close the vendor-performance loop -- ask() feeds an actual back per vendor

**Commit:** `3c459180b2cd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T02:32:58-05:00
**Tags:** octopus-consensus, u-consensus-perf-inproc-wire, auto-distilled

## Subject
[MAIN-FORCE] [OCTOPUS-CONSENSUS]/U-CONSENSUS-PERF-INPROC-WIRE (slot:india): close the vendor-performance loop -- ask() feeds an actual back per vendor

## Body
```
[MAIN-FORCE] [OCTOPUS-CONSENSUS]/U-CONSENSUS-PERF-INPROC-WIRE (slot:india): close the vendor-performance loop -- ask() feeds an actual back per vendor

THE GAP (open-loop scan, R8-verified -- the one genuinely-open india unit):
recommendVendors (the READ side, MultiModelConsensusEngine.ts ~L546) consults the
per-vendor reward EMA to down-select the consensus fan-out, but NOTHING fed an
actual reward back. The EMA stayed frozen at cold-start and the usePerformanceWeights
gate was inert. U-CONSENSUS-PERF-PERSIST (5bbaac1503) added the WRITE primitives
(saveState + recordOutcomeAndPersist) on the WIRE-EXEMPT ConsensusModelPerformanceEngine
but left the in-process caller unwired -- so the loop's feedback arrow was still missing.

THE CLOSURE (WIRE-EXEMPT -> in-process, NOT a dispatcher action):
- New pure exported helper deriveVendorRewards(responses, consensus): a vendor
  "agreed" iff its MODEL is among consensus.voters (the models that produced the
  winning answer) -> reward 1, else 0. ok:false responses + a null consensus
  contribute nothing; deduped by vendor (first ok response wins). Pure (no I/O).
- ask() now iterates deriveVendorRewards after a round and persists each via
  consensusModelPerformanceEngine.recordOutcomeAndPersist(vendor, taskType, reward,
  {filePath}). Gated IDENTICALLY to the READ (usePerformanceWeights === true + a real
  taskType, which recordOutcome requires). Fire-and-forget under the same contract as
  the persist block above: a perf-write failure must NEVER break consensus delivery.

This closes the octopus vendor-performance loop end-to-end: the WRITE (this commit)
feeds the READ (recommendVendors) so next round down-selects on real agreement history.

TEST: +7 R9 deriveVendorRewards cases (voter->1/dissenter->0; null consensus->[];
ok:false excluded; dedup-by-vendor first-wins; agreement keyed on MODEL not vendor;
agreed<->reward invariant; empty/non-array->[]). 58/58 file pass. Changed files tsc-clean
(the 2 pre-existing tsc errors in ReinforcementLearningCAMFeedbackEngine.ts are a
separate cross-lane MillingRL.step() signature break -- flagged, NOT mine to guess).

[MAIN-FORCE]: fleet-AI india unit on the shared cad-fusion-live-ms0 tree.
```

## Files touched (3)
- mcp-server/src/__tests__/MultiModelConsensusEngine.test.ts | 85 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/MultiModelConsensusEngine.ts        | 54 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 139 insertions(+)

## Lessons surfaced in commit body
- till missing.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3c459180b2cd`
- Milestone envelope: `mcp-server/data/milestones/OCTOPUS-CONSENSUS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._