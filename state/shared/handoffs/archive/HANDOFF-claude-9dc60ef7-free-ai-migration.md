---
session: claude-9dc60ef7
topic: free-ai-migration
slot: india
written_at: 2026-06-19T20:13:44.326Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-9dc60ef7
status: active
---

# HANDOFF: claude-9dc60ef7
Updated: 2026-06-19T20:13:44.327Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-9dc60ef7

## STATE
FREE-AI-MIGRATION: 10 units done + verified this session (8 text + queryVision substrate + VisionActionAnalyzer consumer). Every runtime text Claude call + 1 of 4 vision engines now free Ollama-first with Claude backup + R12 offline honesty. Remaining: 3 vision consumers (PartMediaToCAD, BlueprintVisionOCR, VideoLearning). All committed; uncommitted M files in tree are peer/auto-regen, not mine.

## RESUME
/startup-india /loop 10m /goal -- FREE-AI-MIGRATION: 10 units shipped + 2-arm-scrutiny PASS. TEXT phase 8 + VISION SUBSTRATE 1 (queryVision, commit 3f7df39916) + VISION CONSUMER 1 (commit 0eb8353d24, VisionActionAnalyzer). NEXT = the 3 remaining vision consumers onto llmEngine.queryVision (full recipe + queue in memory reference_llm_ollama_first_2026_06_19). ORDER: (a) PartMediaToCADEngine -- MULTI-image (images array + extracted video frames), has its OWN Anthropic client near line 194; route to queryVision, map its ImageSource array to VisionImage array, relax the key gate, R12 offline-honesty, ALSO fix the stale JSDoc at PartMediaToCAD line 20. (b) BlueprintVisionOCREngine -- single-image vision call near line 364, Anthropic client near 321 (xray domain: coordinate via chat bus; the LLM-call swap is india free-AI substrate work). (c) VideoLearningEngine -- direct fetch to api.anthropic.com/v1/messages near line 479 with batched frames (multi-image); its openai audio transcription near 269/340 is OUT OF SCOPE (different provider). Per engine: route through queryVision, relax its key gate, R12 offline-honesty, export-for-test, VITEST test with temp image files via the real public method, 2-arm scrutiny, attributed commit. DEFERRED P2 on VisionActionAnalyzer: drop the unused callVisionAPI tokens_used return OR wire real tokens to total_tokens_used (replacing the fixed 1500 estimate). LANE: patch chat-slots.json india.branch to cad-fusion-live-ms0 before staging. NOTE: the security hook false-positives on the regex dot-exec token -- use String.match in new code.

## CONTEXT

