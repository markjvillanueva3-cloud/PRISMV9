# SF-PSN-WIRE-MS0/U-SFPSN-08 — [MAIN] [SF-PSN-WIRE-MS0]/U-SFPSN-08 (slot:juliett iter4): wire wiki/tribal evidence into orchestrator (audit F4 closed)

**Commit:** `62dfe7a1158f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T15:51:08-05:00
**Tags:** sf-psn-wire-ms0, u-sfpsn-08, auto-distilled

## Subject
[MAIN] [SF-PSN-WIRE-MS0]/U-SFPSN-08 (slot:juliett iter4): wire wiki/tribal evidence into orchestrator (audit F4 closed)

## Body
```
[MAIN] [SF-PSN-WIRE-MS0]/U-SFPSN-08 (slot:juliett iter4): wire wiki/tribal evidence into orchestrator (audit F4 closed)

queryWikiEvidence(input) added after queryMinerEvidence (line 2270): lazy-loads prismSelfAwarenessEngine, two-pass query (combined material+operation, material-only fallback), returns top-3 citations with confidence cap 0.75 (< proven=0.88, < miner=0.82), query-token gate, try/catch fall-through non-fatal.

Call site at compute() step 1.7 after queryMinerEvidence. engines_called.push('PRISMSelfAwarenessEngine') + formulas_used.push('Wiki evidence: ...') when found.

SFWikiEvidenceWire.test.ts: 8/8 PASS. Source-grep verifier + step-1.7 marker + two-pass fallback + 0.75 cap + non-fatal compute + query-token gate.

Pattern-equivalent to queryProvenParameters / queryMinerEvidence. Typecheck clean.

Envelope U-SFPSN-08 -> complete. Pathspec-only commit per reference_sf_psn_peer_sweep_4th_2026_05_23.
```

## Files touched (4)
- mcp-server/data/milestones/SF-PSN-WIRE-MS0.json    | 11 ++-
- .../src/__tests__/SFWikiEvidenceWire.test.ts       | 98 ++++++++++++++++++++++
- .../src/engines/SpeedFeedOrchestratorEngine.ts     | 80 ++++++++++++++++++
- 3 files changed, 183 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 62dfe7a1158f`
- Milestone envelope: `mcp-server/data/milestones/SF-PSN-WIRE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._