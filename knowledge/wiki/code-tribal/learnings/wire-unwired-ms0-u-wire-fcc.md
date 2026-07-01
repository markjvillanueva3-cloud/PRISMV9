# WIRE-UNWIRED-MS0/U-WIRE-FCC — wire ConsensusFactCheckerEngine into prism_dev (3 actions)

**Commit:** `4f17ebcf39fe` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T06:14:07-05:00
**Tags:** wire-unwired-ms0, u-wire-fcc, auto-distilled

## Subject
[WIRE-UNWIRED-MS0]/U-WIRE-FCC: wire ConsensusFactCheckerEngine into prism_dev (3 actions)

## Body
```
[WIRE-UNWIRED-MS0]/U-WIRE-FCC: wire ConsensusFactCheckerEngine into prism_dev (3 actions)

INTEL-OLLAMA-OBSIDIAN-MS0/LAYER-3-FACT-CHECK validates external-model
answers (Codex/Grok/Ollama) against PRISM kb (engines from ENGINE_DIGEST
+ optional dispatcher actions) before a roadmap proposal builds on a
fictional foundation. reset() DEFERRED — wipes shared kb cache.

- fcc_check: text + model_name → FactCheckResult
  (totalMentions, verifiedMentions, hallucinations[], verified[], factualityScore)
  Auto-loads kb if not yet cached, keeping the wire stateless for callers.
- fcc_get_knowledge_base: returns currently-cached kb or null (loaded:bool)
- fcc_load_knowledge_base: idempotent explicit load with optional
  dispatcher_actions allowlist; cached after first call

Wire-safety doctrine:
- Auto-load pattern: fcc_check checks getKnowledgeBase() === null first,
  loads if needed, then dispatches. Caller-stateless from MCP perspective.
- loaded:true|false discriminator on get/load (slimResponse strips null)
- DoS guards: text ≤64 KB, dispatcher_actions ≤10000
- Engine regex \b([A-Z][A-Za-z0-9]*Engine)\b requires literal 'Engine'
  suffix — tests use ImaginaryFooBarEngine / NeverEverRealEngine etc.
- closestMatch can be string | null in engine output; slimResponse strips
  null → wire-side undefined. Test contract: 'optional-string-or-absent'.

Tests: 15/15 PASS (5 schema gates incl. 64 KB DoS + dispatcher_actions cap
+ kb pre-warm in beforeAll + fact-check shape: 1 hallucination on bogus +
0 mentions on plain prose with NaN score + VARIABILITY across 3 model_name
values flowing to hallucinations[].modelName + ROUTING PROOF mention-set
parity + closestMatch field-shape contract + idempotent load + 3
schema-reject envelope checks).

Iter fact-finding: schema field-shape inferred BY READING ENGINE SOURCE
(twice this session: PGH+PFH ParserRun/Observation fields, now
FactCheckResult fields). Same class as feedback_verify_actual_contract.
```

## Files touched (4)
- .../dispatcher.consensusFactChecker.test.ts        | 201 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  21 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  44 ++++-
- 3 files changed, 265 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4f17ebcf39fe`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._