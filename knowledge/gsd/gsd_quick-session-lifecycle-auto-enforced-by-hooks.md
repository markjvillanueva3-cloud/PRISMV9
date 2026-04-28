---
source: gsd_quick
section: SESSION LIFECYCLE (AUTO-ENFORCED BY HOOKS)
slug: session-lifecycle-auto-enforced-by-hooks
indexed_at: 2026-04-28T02:50:03.655Z
---

## SESSION LIFECYCLE (AUTO-ENFORCED BY HOOKS)

```
SessionStart → 25+ hooks fire automatically:
  - expert-role-inject (polymath role)
  - prism-intelligence-briefing (system overview)
  - skill-utilization-index (503 skills indexed)
  - ai-deep-intelligence (AI system activation)
  - self-improvement-activate (feedback loops)
  - sync-h-c-drives (H: drive canonical)
  - embedder-inject-qdrant (Qdrant + Ollama smoke test — INTEL P0-U01)

UserPromptSubmit → 18+ hooks fire:
  - neural-ai-optimizer (complexity detection → neural engines)
  - smart-skill-suggest (context-aware skill matching)
  - ai-auto-command-router (slash command suggestions)
  - self-awareness-auto-inject (JM Die paths, dedup)
  - claudemd-ollama-enforcer (semantic top-3 over CLAUDE.md chunks — INTEL P1-U05)
  - ollama-obsidian-rag (memory keywords → top-5 vault hits — INTEL P3-U05)
  - ollama-skill-suggester (semantic top-5 skills — INTEL P3-U01)
  - ollama-route-recommender (semantic top-3 dispatcher actions — INTEL P3-U04)
  - gsd-section-retrieve (GSD keywords → top-3 sections — INTEL P4-U01)

PreToolUse → 20+ hooks fire (Bash matcher):
  - error-block-prewarn (queries Qdrant for past similar errors — INTEL P2-U04)
  - rtk-auto-suggest (rtk prefix for token economy)
  - script-summary-inject (cached 1-line per script — INTEL P3-U02)
  - bash-destructive-guard (HARD BLOCK on rm -rf, force push, etc.)

PostToolUse → 25+ hooks fire:
  - token-economy-hook (token tracking, waste detection)
  - dev-outcome-tracker (build/test outcome logging)
  - meta-learning-trigger (learning activation)
  - error-block-capture / error-pattern-memory / error-recovery-memory /
    error-learner-hook (all mirror to UNIFIED_ERROR_LEDGER — INTEL P2-U02)
  - claudemd-section-update (re-chunks CLAUDE.md on edit — INTEL P1-U05)
  - memory-mirror-to-vault (mirrors MEMORY.md changes — INTEL P1-U04)
  - cache hooks (file/grep/bash deduplication)

Stop → 8+ hooks fire:
  - stop-obsidian-memory-extract (Obsidian sync — INTEL P1-U01)
  - session-consolidate-graph (every N=5 sessions, runs MemoryConsolidationEngine — INTEL P1-U02)
  - enforce-handoff-topic (renames topicless handoffs)
```
