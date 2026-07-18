# XGAL-WIRE/U-XGAL-EMBEDDING-GUARD — [MAIN-FORCE] [XGAL-WIRE]/U-XGAL-EMBEDDING-GUARD (slot:sierra, cross-galaxy authorized): wire unwired EmbeddingGuardEngine -> prism_guard:embedding_guard_evaluate

**Commit:** `bb9cc7d6399d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T21:05:11-05:00
**Tags:** xgal-wire, u-xgal-embedding-guard, auto-distilled

## Subject
[MAIN-FORCE] [XGAL-WIRE]/U-XGAL-EMBEDDING-GUARD (slot:sierra, cross-galaxy authorized): wire unwired EmbeddingGuardEngine -> prism_guard:embedding_guard_evaluate

## Body
```
[MAIN-FORCE] [XGAL-WIRE]/U-XGAL-EMBEDDING-GUARD (slot:sierra, cross-galaxy authorized): wire unwired EmbeddingGuardEngine -> prism_guard:embedding_guard_evaluate

EmbeddingGuardEngine (tiered cosine dup guard: green<0.70/yellow/red>0.85, exact-name fast-path -> red, embedder-offline -> yellow) was UNWIRED (zero dispatcher refs) + had NO test. Wired to prism_guard beside its TF-IDF sibling sem_sim_guard_compute, injecting localEmbeddingEngine directly (EmbedResult {ok,vector,error} structurally satisfies GuardEmbedder, tsc-enforced at the constructor call). references pass a precomputed vector OR are embedded server-side name+description (\n-joined to MATCH the engine candidate format -- scrutiny P1). +embedding_guard_evaluate schema + dynamic descriptor action-count (was stale '8'). 22 tests (16 engine band-logic via fake embedder + 6 dispatcher round-trip incl 2 vi.mock cosine-path regression guards for the \n format). 0-new tsc. 2-agent scrutiny PASS (both P1s fixed + re-verified). Other 5 discovery 'unwired engines' are NOT mechanical wires (function-valued input / EventBus bridge / creds / Qdrant) -> owned-elsewhere integration (india/juliett/hotel), in handoff.
```

## Files touched (5)
- mcp-server/src/__tests__/EmbeddingGuardEngine.test.ts                | 152 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/guardDispatcher.embeddingGuard-wire.test.ts | 141 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/guardActionSchemas.ts                         |  23 +++++++++++++++++
- mcp-server/src/tools/dispatchers/guardDispatcher.ts                  |  34 +++++++++++++++++++++++--
- 4 files changed, 348 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bb9cc7d6399d`
- Milestone envelope: `mcp-server/data/milestones/XGAL-WIRE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._