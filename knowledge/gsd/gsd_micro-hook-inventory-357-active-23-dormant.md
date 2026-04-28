---
source: gsd_micro
section: Hook Inventory (357 active, 23 dormant)
slug: hook-inventory-357-active-23-dormant
indexed_at: 2026-04-28T02:50:03.685Z
---

## Hook Inventory (357 active, 23 dormant)

```
Categorized by event:
  SessionStart       ~25 hooks (role inject, briefing, indexes,
                       embedder probe)
  UserPromptSubmit   ~18 hooks (complexity router, skill suggester,
                       RAG, semantic CLAUDE.md, semantic actions,
                       GSD retrieve)
  PreToolUse         ~30 hooks (error prewarn, RTK suggest,
                       destructive guard, script summary inject,
                       file claim guard, commit ownership)
  PostToolUse        ~25 hooks (outcome tracker, meta-learning,
                       4 error capture mirrors, claudemd re-chunk,
                       gsd re-chunk, memory mirror to vault,
                       file ownership tag)
  Stop               ~8 hooks (obsidian extract, consolidate graph,
                       enforce handoff topic, stop-auto-wire,
                       stop_on_unwired_assets, scrutinize-before-stop,
                       always-build-guard, file-claim-release)

Dormant (DISABLED_TOKEN_REDUX_2026_04_23 — opt-in):
  prism-awareness-v2     350-tok SessionStart briefing
  task-goal-tracker      drift detector
  reference-value-injector  Kienzle/Taylor injection
  prompt-rewriter-ollama    prompt clarification
  + 19 more advisory hooks

Audit: .claude/helpers/apply-hook-fixes.mjs (reverses with marker
removal). Re-enable selectively if a domain needs the signal.

Newly wired this milestone:
  embedder-inject-qdrant       SessionStart (P0-U01)
  session-consolidate-graph    Stop (P1-U02)
  memory-mirror-to-vault       PostToolUse (P1-U04)
  claudemd-section-update      PostToolUse (P1-U05)
  gsd-section-update           PostToolUse (P4-U01)
  ollama-obsidian-rag          UserPromptSubmit (P3-U05 — was already)
  script-summary-inject        PreToolUse Bash (P3-U02)
  stop-auto-wire               Stop (NEW — multi-source wire audit)
```
