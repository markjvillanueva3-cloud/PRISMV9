---
source: gsd_micro
section: Hook Inventory (357 active)
slug: hook-inventory-357-active
indexed_at: 2026-04-28T02:39:36.892Z
---

## Hook Inventory (357 active)

```
Categorized by event:
  SessionStart       (~25 hooks: role inject, briefing, indexes, embedder probe)
  UserPromptSubmit   (~18 hooks: complexity router, skill suggester, RAG,
                       semantic CLAUDE.md, semantic actions, GSD retrieve)
  PreToolUse         (~30 hooks: error prewarn, RTK suggest, dest. guard,
                       script summary inject, file claim guard)
  PostToolUse        (~25 hooks: outcome tracker, meta-learning,
                       4 error capture mirrors, claudemd re-chunk,
                       memory mirror to vault, file ownership tag)
  Stop               (~8 hooks: obsidian extract, consolidate graph,
                       enforce handoff topic, session cleanup,
                       cross-session-aware, scrutinize-before-stop,
                       always-build-guard, file-claim-release)

23 advisory hooks short-circuited 2026-04-23 for token economy
(marker: DISABLED_TOKEN_REDUX_2026_04_23). Audit with
.claude/helpers/apply-hook-fixes.mjs.
```
