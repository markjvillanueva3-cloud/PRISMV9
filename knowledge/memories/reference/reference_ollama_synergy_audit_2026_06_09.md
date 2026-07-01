---
name: reference_ollama_synergy_audit_2026_06_09
description: "Ollama-synergy 6-surface audit (sierra 2026-06-09, wf_7f974777-bf2): rejected 7 dead premises (incl router-widening), confirmed punch-list #5 SHIPPED, ranked 9 viable units. SHIPPED T2 — wired the orphan ollama-pipeline-injector hook. The real lever is BEHAVIORAL (surface routes), not classifier-widening."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.682Z
aliases: reference_ollama_synergy_audit_2026_06_09
---


**Ollama-synergy audit + ship** (slot:sierra, 2026-06-09). Operator goal: utilize Ollama more across tool-calls/system-viz/vault/memory/wiki/tribal creation+injection. Answered evidence-first (Workflow `wf_7f974777-bf2`, 7 agents, all claims HEAD-verified) instead of guessing — because token-savings premises in this exact area were FALSIFIED today ([[reference_obsidian_tokensavings_premise_falsified_2026_06_09]]).

## Live truth
Ollama daemon healthy — 10 models on the idle 96GB Blackwell (qwen2.5-coder:1.5b/7b/32b, gpt-oss:20b/120b, 4 vision, nomic-embed-text). The ~5% offload is **session shape (orchestration-heavy), not a bug** — the offloader correctly keeps judgment work on Claude (R5). Sits inside the known [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]] pattern (88% of Ollama hook surface was unwired-on-disk).

## SHIPPED — T2 (sierra, LIVE)
**U-OLLAMA-PIPELINE-INJECTOR-WIRE** — `.claude/hooks/ollama-pipeline-injector.mjs` was an orphan (built+tested, 0 settings refs). Wired into `C:/Users/wompu/.claude/settings.json` UserPromptSubmit after `master-index-precheck-inject` (timeout 8000, mirrored C→H). Verified live: `/rgs`→634-char route block, `summarize the diff`→verb route, plain prompt→suppressed. Advisory/fail-open; kill-switch `PRISM_OLLAMA_PIPELINE_INJECT=0`. Surfaces concrete routes (RGS→gpt-oss:120b, scrutinize→32b reviewer-D, pdf-learn→vision, summarize/explain/classify→`prism_dev:ollama_hook_query`) for already-eligible pipelines — the BEHAVIORAL lever, NOT a classifier widen (avoids the rejected premise). NOT a git artifact (settings lives outside H:/prism, mirrored).

## REJECTED (verified dead — do NOT rebuild)
R1 widen WORK_CLASS_PATTERNS (keeps are correct R5 judgment work); R2 session-end-goal LLM (dormant+stale); R3 "synthesis scripts hardcode 7b" (FALSE — all resolve to 32b, #5 shipped 5/6); R4 LLM-rerank findInGraph (1060×/day substring filter); R5 LLM-rerank tribal/memory injection hot path; R6 bigger embedder (nomic is smallest dedicated); R7 LLM-summarize memory-compact (byte-truncation deterministic).

## KEEP backlog (lane-assigned, full table in the spec)
sierra: #1 U-VIZ-WIKI-NARRATIVE (reuse `generateBlurb` from contextual-blurb.mjs, gpt-oss:20b, FLAG-GATE off hot path — child generators generate-{layer,domain,dispatcher}-wiki.mjs). alpha: distill-tribal Q-A unblock, wiki-NLI-lint, memo-extract-throttle (fleet→per-session), memo-cache-consolidate (42MB JSONL→int8), prewarm-wire (after #1), CLAUDE.md 7b→32b doc-fix. bravo-adj: WeeklySynthesisEngine resolver (lone open #5). alpha+freeze-gated: weekly-memory-synth schedule.

## Reuse-not-fork (dedup)
Canonical local-LLM call helpers: `scripts/ask-ollama.mjs:366 callOllama(model,prompt,opts)` (generate) + `scripts/lib/contextual-blurb.mjs:74 generateBlurb(content,opts)` (content→narrative, fail-soft, mtime-cache — IDEAL for U-VIZ-WIKI-NARRATIVE) + `resolveSynthesisModel` from `scripts/lib/host-aware-synthesis-model.mjs` (host-aware 32b pick). Do NOT fork a new ollama call.

## Spec / provenance
`state/shared/specs/OLLAMA-SYNERGY-AUDIT-2026-06-09.md` (committed — the fleet's actionable backlog). Pairs with [[reference_alpha_forge_punchlist_2026_06_04]], [[feedback_ollama_token_routing]].
