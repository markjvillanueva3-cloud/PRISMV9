# SF-PSN-WIRE-MS0/U-SFPSN-06 — [MAIN] [SF-PSN-WIRE-MS0]/U-SFPSN-06 (slot:juliett iter2): wire SpeedFeedMinerEngine into orchestrator decision prior (audit F8 closed)

**Commit:** `e9f147b684a6` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T15:23:55-05:00
**Tags:** sf-psn-wire-ms0, u-sfpsn-06, auto-distilled

## Subject
[MAIN] [SF-PSN-WIRE-MS0]/U-SFPSN-06 (slot:juliett iter2): wire SpeedFeedMinerEngine into orchestrator decision prior (audit F8 closed)

## Body
```
[MAIN] [SF-PSN-WIRE-MS0]/U-SFPSN-06 (slot:juliett iter2): wire SpeedFeedMinerEngine into orchestrator decision prior (audit F8 closed)

queryMinerEvidence(input) added after queryProvenParameters (line 2148): lazy-loads programDatabaseEngine + speedFeedMinerEngine (avoids circular deps), queries by machine_type + operation_type, caps to 500 records, returns AtomicValue with confidence 0.50 + 0.01*sample_count capped 0.82 (< proven=0.88), sample_count >= 3 threshold, try/catch fall-through to {found:false}.

Call site at compute() step 1.6 after queryProvenParameters. engines_called.push('SpeedFeedMinerEngine') when found.

SpeedFeedMinerEvidenceWire.test.ts: 7/7 PASS in 3.7s. Source-grep verifier + non-fatal compute() + threshold/cap docs. Behavioural spy tests skipped due to vitest CJS/ESM dual-module-resolution (same constraint as queryProvenParameters sibling).

Envelope U-SFPSN-06 -> complete. Pathspec-only commit per reference_sf_psn_peer_sweep_4th_2026_05_23.
```

## Files touched (4)
- mcp-server/data/milestones/SF-PSN-WIRE-MS0.json    |  11 +-
- .../__tests__/SpeedFeedMinerEvidenceWire.test.ts   |  94 +++++++++++++++++
- .../src/engines/SpeedFeedOrchestratorEngine.ts     | 115 +++++++++++++++++++++
- 3 files changed, 214 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e9f147b684a6`
- Milestone envelope: `mcp-server/data/milestones/SF-PSN-WIRE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._