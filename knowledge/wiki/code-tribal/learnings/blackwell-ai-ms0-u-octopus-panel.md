# BLACKWELL-AI-MS0/U-OCTOPUS-PANEL — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-OCTOPUS-PANEL (slot:india): wire the octopus to the capability-probe keystone — capability-aware default Ollama voice

**Commit:** `c1b40183c130` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T10:37:27-05:00
**Tags:** blackwell-ai-ms0, u-octopus-panel, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-OCTOPUS-PANEL (slot:india): wire the octopus to the capability-probe keystone — capability-aware default Ollama voice

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-OCTOPUS-PANEL (slot:india): wire the octopus to the capability-probe keystone — capability-aware default Ollama voice

The MS0 keystone OllamaCapabilityProbeEngine (U-CAP-PROBE) shipped but the octopus (MultiModelConsensusEngine) was never wired to it: ask() trusted the static DEFAULT_OLLAMA_MODEL strings + resolveOllamaModels(list-substitution), so the consensus voice could still be a model that was `ollama rm`'d (the deepseek-r1:14b-not-installed bug class). bravo's U-OCTOPUS-POWER re-pointed the static defaults but did NOT close the loop to the live capability oracle. This is the missing connective tissue.

SELECTOR (OllamaCapabilityProbeEngine):
- getBestLocalModel(axis, opts) + getBestReasoningModel + getBestChatModel: probe(), then pick the highest-tier RUNNABLE local model (qualityTier for reasoning, codeTier for code). Can ONLY return a model present + fitting free VRAM + runsOn this host. null when none runnable → caller falls back to cloud (R12 fail-loud, never dispatch to a phantom local model).
- Chat-capability gate by TAG not id-regex: tags.includes('chat') && !tags.includes('vision') — excludes embedders, RERANKERS (tags:[rerank], id has no 'embed' substring so an /embed/i filter missed them), and vision-only VLMs. Aligns with resolveDiverseOllamaPanel's vision rejection (R7, one chat-capability rule across both octopus selectors). Ties: paramsB then lexical id (deterministic).

WIRE (MultiModelConsensusEngine.ask legacy branch):
- When input.ollamaModel/secondaryOllamaModel are unset, consult the probe for the default before the static fallback. Chain: input.ollamaModel ?? probedPrimary ?? DEFAULT_OLLAMA_MODEL (explicit override is sacred). try/catch + probe-null → static default, so the legacy degrade path (daemon down / no GPU / nothing pulled) is fully preserved.

TESTS (124/124 green, tsc clean):
- cap-probe +11: happy(reasoning rank) + code-axis rank + 2 variability(4080 tier>size, 3080 small-only) + 3 failure(nothing pulled / daemon down / cloud_only) + 3 adversarial(VRAM-no-fit / embedder-excluded / reranker-excluded).
- MMCE +2: probe-default-voice wire + explicit-override-wins; +probe-null mock in 3 beforeEach blocks (reviewer-P1 hermeticity fix — no live nvidia-smi/HTTP in unit tests).

2-reviewer per-file scrutiny PASS (0 P0/P1 in design). Fixed reviewer P1 (test hermeticity) + 2 P2 (tag-gate, codeTier doc). DEFERRED [SCOPED]: U-OCTOPUS-DIVERSE-PROBE (give resolveDiverseOllamaPanel the same probe oracle); stale MMCE header L9 doc-drift (P3).
```

## Files touched (5)
- mcp-server/src/__tests__/MultiModelConsensusEngine.test.ts   |  63 +++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/OllamaCapabilityProbeEngine.test.ts | 141 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/MultiModelConsensusEngine.ts          |  30 ++++++++++++++-
- mcp-server/src/engines/OllamaCapabilityProbeEngine.ts        |  67 +++++++++++++++++++++++++++++++++
- 4 files changed, 299 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till be a model that was `ollama rm`'d (the deepseek-r1:14b-not-installed bug class). bravo's U-OCTOPUS-POWER re-pointed the static defaults but did NOT close the loop to the live capability oracle. This is the missing connective tissue.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c1b40183c130`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-AI-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._