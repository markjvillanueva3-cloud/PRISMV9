# AI-SYSTEMS-NEURAL/U-XPROC-ORCH-FANOUT-HONESTY — [MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-XPROC-ORCH-FANOUT-HONESTY (slot:india): orchestrator fail-loud stub-vs-real fan_out_mode signal

**Commit:** `884542bc5acc` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T14:55:01-05:00
**Tags:** ai-systems-neural, u-xproc-orch-fanout-honesty, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-XPROC-ORCH-FANOUT-HONESTY (slot:india): orchestrator fail-loud stub-vs-real fan_out_mode signal

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-XPROC-ORCH-FANOUT-HONESTY (slot:india): orchestrator fail-loud stub-vs-real fan_out_mode signal

CrossProcessHierarchicalNeuralOrchestratorEngine.orchestrate() ran its built-in defaultInvoker (a placeholder echo) whenever no tier_invoker was supplied, yet still returned primary_answer.headline as 'Primary answer from T8-03 ... at confidence X' and rationale 'N succeeded' -- presenting a STUB echo as a real answer with NO machine-readable signal. A consumer could not tell stub from real (R12 silent-trust hazard; the only clue was a human-readable echo string buried in provenance).

Fix (additive, R12 fail-loud): new top-level fan_out_mode: 'supplied' | 'default_stub' | 'none' on OrchestrateResult + orchestrateBrief; in default_stub mode the headline now discloses it is a placeholder echo, NOT a real answer. Routing/provenance/tier_id unchanged. All 22 existing tests stay green (they inject tier_invoker = supplied path); +7 new real-value tests (supplied/default_stub/none modes, stub headline fails loud, supplied-vs-stub headline delta for same query, brief forwarding, dispatcher surfacing). 29/29 green, tsc-clean. No assertion weakened (R9). Routing built (U-NN-TIER05 done); wiring the 10 available tiers to real engines remains a separate multi-session unit.
```

## Files touched (3)
- .../src/__tests__/CrossProcessHierarchicalNeuralOrchestratorEngine.test.ts  | 67 +++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/CrossProcessHierarchicalNeuralOrchestratorEngine.ts  | 21 +++++++++++-
- 2 files changed, 87 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till returned primary_answer.headline as 'Primary answer from T8-03 ... at confidence X' and rationale 'N succeeded' -- presenting a STUB echo as a real answer with NO machine-readable signal. A consumer could not tell stub from real (R12 silent-trust hazard; the only clue was a human-readable echo string buried in provenance).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 884542bc5acc`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-NEURAL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._