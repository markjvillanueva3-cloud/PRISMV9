---
source: gsd_micro
section: Boot Protocol
slug: boot-protocol
indexed_at: 2026-04-28T02:50:03.679Z
---

## Boot Protocol

```
SessionStart (auto-fire):
  prism_dev:session_boot          load baseline + claim session id
  prism_context:todo_update       anchor task focus
  embedder-inject-qdrant          Ollama + Qdrant smoke (P0-U01)
  expert-role-inject              polymath role
  prism-intelligence-briefing     system overview

UserPromptSubmit (auto-fire — semantic routing layer):
  claudemd-ollama-enforcer        top-3 CLAUDE.md (P1-U05)
  ollama-obsidian-rag             memory keywords → vault hits (P3-U05)
  ollama-skill-suggester          top-5 skills semantic (P3-U01)
  ollama-route-recommender        top-3 dispatcher actions (P3-U04)
  gsd-section-retrieve            top-3 GSD sections (P4-U01)
  self-awareness-auto-inject      JM Die paths, dedup, customer ctx
  ai-auto-command-router          slash command suggestions

PreToolUse (auto-fire):
  error-block-prewarn             past similar errors via Qdrant (P2-U04)
  rtk-auto-suggest                rtk prefix for Bash token economy
  script-summary-inject           cached 1-line per script (P3-U02)
  bash-destructive-guard          HARD BLOCK rm -rf, force push, etc.
  commit-ownership-guard          per-session ownership check
  file-claim-guard                15-min lease on edits
  worktree-commit-route           lane discipline (NOT YET WIRED)

PostToolUse (auto-fire):
  4 error capture mirrors         → UNIFIED_ERROR_LEDGER (P2-U02)
  claudemd-section-update         re-chunk on CLAUDE.md edit (P1-U05)
  gsd-section-update              re-chunk on GSD edit (P4-U01)
  memory-mirror-to-vault          mirror MEMORY.md (P1-U04)
  token-economy-hook              tracking, waste detection
  dev-outcome-tracker             outcome logging
  meta-learning-trigger           learning activation

Stop (auto-fire):
  stop-obsidian-memory-extract    Obsidian sync (P1-U01)
  session-consolidate-graph       N=5 distillation (P1-U02)
  enforce-handoff-topic           rename topicless handoffs
  stop-auto-wire                  multi-source wire audit
  stop_on_unwired_assets          BLOCK on orphan engines
  scrutinize-before-stop          BLOCK on uncommitted unreviewed
  always-build-guard              BLOCK on missing builds
  prism_session:state_save        persist for resume
```
