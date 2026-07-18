# PSN-SYNERGY-COLLECT-MS2/U-TRIBAL-LEG-EDGES — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS2]/U-TRIBAL-LEG-EDGES (slot:alpha): tribal outbound provenance edges 0->3 peers (coverage 0->30%) via bounded source histogram

**Commit:** `81c2c476d1a6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-02T19:47:03-05:00
**Tags:** psn-synergy-collect-ms2, u-tribal-leg-edges, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS2]/U-TRIBAL-LEG-EDGES (slot:alpha): tribal outbound provenance edges 0->3 peers (coverage 0->30%) via bounded source histogram

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS2]/U-TRIBAL-LEG-EDGES (slot:alpha): tribal outbound provenance edges 0->3 peers (coverage 0->30%) via bounded source histogram

tribal was the most-isolated leg — cross_refs={} (outbound). Added streamSourceHistogram:
one bounded fail-soft pass over the 530MB index tallying the per-entry `source` field
(matchAll, tail-after-last-match leftover so no double-count, MAX_TAIL>token bridges a
boundary split). Full histogram: wiki 765, memory 191, external 19430, tribal-jsonl 12377,
tribal-knowledge-store 296. Only wiki/memory map to PSN legs, so tribal cross_refs =
{wiki:765, memories:191, obsidian_brain:191}; external/jsonl/self sources get NO edge
(honest — no fabricated connectivity, R12). E2E: tribal coverage_pct 0->30% (capped by its
genuinely-external provenance). +2 tests (11/11 pass).

Synergy graph coverage now: obsidian/memories/wiki 100%, engines 90%, system_viz 70%,
algorithms/formulas/prism_os 50%, nn_gnn/prism_ai 40%, tribal 30%. p0_critical held at 37
(adding real edges did not reduce it) — re-confirms densityFloor needs recalibration (top
next fix; coverage_pct is the trustworthy band).
```

## Files touched (5)
- scripts/psn-synergy-collect.mjs        | 59 ++++++++++++++++++++++++++++++++++++++++++++++++++++-------
- scripts/psn-synergy-collect.test.mjs   | 26 +++++++++++++++++++++++++-
- state/shared/psn-synergy-snapshot.json | 16 ++++++++++------
- state/shared/psn-synergy-snapshot.md   |  8 ++++----
- 4 files changed, 91 insertions(+), 18 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 81c2c476d1a6`
- Milestone envelope: `mcp-server/data/milestones/PSN-SYNERGY-COLLECT-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._