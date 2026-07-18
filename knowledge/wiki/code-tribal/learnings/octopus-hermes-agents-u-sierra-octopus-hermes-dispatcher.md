# OCTOPUS-HERMES-AGENTS/U-SIERRA-OCTOPUS-HERMES-DISPATCHER — [MAIN-FORCE] [OCTOPUS-HERMES-AGENTS]/U-SIERRA-OCTOPUS-HERMES-DISPATCHER (slot:sierra): expose the hermes-agent panel control on prism_ai:consensus (R15 dispatcher surface)

**Commit:** `302b09d76794` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T21:28:09-05:00
**Tags:** octopus-hermes-agents, u-sierra-octopus-hermes-dispatcher, auto-distilled

## Subject
[MAIN-FORCE] [OCTOPUS-HERMES-AGENTS]/U-SIERRA-OCTOPUS-HERMES-DISPATCHER (slot:sierra): expose the hermes-agent panel control on prism_ai:consensus (R15 dispatcher surface)

## Body
```
[MAIN-FORCE] [OCTOPUS-HERMES-AGENTS]/U-SIERRA-OCTOPUS-HERMES-DISPATCHER (slot:sierra): expose the hermes-agent panel control on prism_ai:consensus (R15 dispatcher surface)

Completes the OCTOPUS-HERMES-AGENTS control surface at the primary dispatcher. consensus_decide schema gains hermesAgents?: boolean (.describe documents: default-ON when the Hermes proxy is reachable; false = opt out for a quick single-voice baseline; true = force; global kill PRISM_OCTOPUS_HERMES_AGENTS=0). The dispatcher threads it to MultiModelConsensusEngine.ask() as includeHermesAgentLenses, and the Voice-block inline type gains the field. includeGrok stays voice-gated (no forced grok -> no dispatcher-test breakage); the engine still backend-gates the hermes path so off-proxy hosts are unchanged. With iter15 default-on, a consensus_decide caller listing grok ALREADY gets the 5 personas; this adds the per-call opt-out/force override. 23/23 AIDispatcherConsensusDecide tests; tsc type-clean for the changed files (the 3 errors -- ReinforcementLearningCAMFeedbackEngine x2, routes/cost.ts -- are PRE-EXISTING/peer in files I never touched, R12).
```

## Files touched (3)
- mcp-server/src/schemas/aiReasoningActionSchemas.ts        | 7 +++++++
- mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts | 5 +++++
- 2 files changed, 12 insertions(+)

## Lessons surfaced in commit body
- till backend-gates the hermes path so off-proxy hosts are unchanged. With iter15 default-on, a consensus_decide caller listing grok ALREADY gets the 5 personas; this adds the per-call opt-out/force override. 23/23 AIDispatcherConsensusDecide tests; tsc type-clean for the changed files (the 3 errors -- ReinforcementLearningCAMFeedbackEngine x2, routes/cost.ts -- are PRE-EXISTING/peer in files I never

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 302b09d76794`
- Milestone envelope: `mcp-server/data/milestones/OCTOPUS-HERMES-AGENTS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._