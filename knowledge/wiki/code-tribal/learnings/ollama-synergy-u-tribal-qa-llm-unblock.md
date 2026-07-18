# OLLAMA-SYNERGY/U-TRIBAL-QA-LLM-UNBLOCK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-SYNERGY]/U-TRIBAL-QA-LLM-UNBLOCK (slot:sierra): unblock LLM Q-A in distill-tribal (was heuristic-only on a dead 'Ollama not loaded 2026-05-08' premise)

**Commit:** `6fb278a2ee11` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T14:16:30-05:00
**Tags:** ollama-synergy, u-tribal-qa-llm-unblock, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-SYNERGY]/U-TRIBAL-QA-LLM-UNBLOCK (slot:sierra): unblock LLM Q-A in distill-tribal (was heuristic-only on a dead 'Ollama not loaded 2026-05-08' premise)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-SYNERGY]/U-TRIBAL-QA-LLM-UNBLOCK (slot:sierra): unblock LLM Q-A in distill-tribal (was heuristic-only on a dead 'Ollama not loaded 2026-05-08' premise)

Wire an Ollama-gated LLM Q-A synthesis path into the IdeaBlock distiller, reusing the canonical callOllama + resolveSynthesisModel infra (R8 -- no forked call path). Clustering stays deterministic TF-IDF (R5). Per-cluster fail-soft to the heuristic on model failure / unusable output / daemon-down -- output never regresses, only improves when Ollama is up.

- ollama-up gate: ONE fetchInstalledModels probe up front (no N per-cluster timeouts when down), reused as resolveSynthesisModel's available-set. Down/--no-llm -> heuristic-no-llm; up -> llm:<model>.
- model = host-aware strongest viable (resolveSynthesisModel best tier); --model / PRISM_DISTILL_TRIBAL_MODEL override.
- import-safe: arg-parse + main() behind isMain guard so tests import without triggering a canonical/ wipe; indexPath/outputDir injectable.
- audit schemaVersion 1->2: qaModel + qaCounts{llm,heuristicFallback,heuristic} + honest qaExtractionMethod; frontmatter qa_via per block.

LIVE-VALIDATED (R15): real corpus sample, daemon resolved gpt-oss:120b [blackwell-best], 7/7 clean retrieval questions, 0 heuristic-fallback. Reconciles the prior gpt-oss rejection -- the empty-response was num_predict starvation, not a harmony incompat; callOllama (1024 cap) handles it. QA_NUM_PREDICT default 1024 for reasoning-model headroom.

19/19 tests (clustering intent, prompt build, sanitize adversarial, LLM gate, per-cluster fail-soft, parseArgs, render mutation-verified, main() tmpdir round-trip up/down/--no-llm/dry-run/mixed).
```

## Files touched (3)
- scripts/distill-tribal.mjs      | 565 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/distill-tribal.test.mjs | 359 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 924 insertions(+)

## Lessons surfaced in commit body
- till-tribal (was heuristic-only on a dead 'Ollama not loaded 2026-05-08' premise)
- tiller, reusing the canonical callOllama + resolveSynthesisModel infra (R8 -- no forked call path). Clustering stays deterministic TF-IDF (R5). Per-cluster fail-soft to the heuristic on model failure / unusable output / daemon-down -- output never regresses, only improves when Ollama is up.
- TILL_TRIBAL_MODEL override.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6fb278a2ee11`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._