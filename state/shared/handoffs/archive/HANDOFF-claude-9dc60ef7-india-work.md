---
session: claude-9dc60ef7
topic: india-work
slot: india
written_at: 2026-06-19T16:12:17.278Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-9dc60ef7
status: active
---

# HANDOFF: claude-9dc60ef7
Updated: 2026-06-19T16:12:17.279Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-9dc60ef7

## STATE
Substrate+keystone+1 consumer done. KEY LESSON: each delegation site has its OWN upstream hasValidApiKey gate that ALSO must be relaxed (R16 seam) -- migrating only callClaude leaves the free path unreachable. STANDING RULE: self-compact at YELLOW without asking (compact SendKeys may not actuate if WT tab unnamed; handoff+/checkin is the reliable resume). Lane: patch chat-slots india.branch->cad-fusion-live-ms0 before staging (NOTE: never put the staging-command phrase in handoff prose -- lane-guard scans the bash string). Commits landing attributed when chained add+commit.

## RESUME
/startup-india /loop [10m] /goal -- FREE-AI-MIGRATION. 4 units shipped (38fde7cc48 Ollama-first, dd0b90b0f0 capability-backup, 42a6108e07 system-override keystone, 9faccd3cea ManusATCSBridge first-consumer+seam-fix). CONTINUE per-site with the PROVEN 3-EDIT RECIPE (in reference_llm_ollama_first_2026_06_19): (1) route callClaude->llmEngine.query{system,complexity:high} + map shape; (2) SEAM FIX: relax the upstream hasValidApiKey gate so the free path is reachable without a Claude key + drop unused getApiKey import; (3) R12: offline result -> mark FAILED not completed + record real r.model. NEXT in order: manusDispatcher.callClaude (3 gates @169/224/238), ralphDispatcher.callClaudeApi (returns string), atcsDispatcher.callClaudeForUnit (manus_delegate path). THEN AgentExecutor (CHECK tools/multi-turn first -- may not fit single prompt->text). SKIP PromptCachingEngine+PerformanceBudgetEngine. BIGGER UNIT: add llmEngine.queryVision({prompt,images[]}) -> ollama vision (qwen2.5vl/qwen3-vl)+Claude vision backup, then migrate the 4 vision engines (the print-to-CNC/CAD-drawing features). Each: export-for-test + test under VITEST hermeticity + 2-arm scrutiny + attributed commit.

## CONTEXT

