---
source: project
section: MASTER INDEX + AWARENESS STACK (search-first discipline)
slug: master-index-awareness-stack-search-first-discipline
indexed_at: 2026-06-06T05:18:39.029Z
---

## MASTER INDEX + AWARENESS STACK (search-first discipline)

Before Grep/Glob/Agent, hit the unified index. Auto-injects top-5 hits on every UserPromptSubmit (`master-index-precheck-inject.mjs` T2) + 15-line awareness digest on every SessionStart (`awareness-snapshot-inject.mjs` T2). Surfaces: `prism_session:master_index_query` + `master_index_node_status` + `master_index_utilization_dashboard`; skills `/master-index`, `/utilization-dashboard`, `/awareness-snapshot`, `/orphan-inventory`, `/deep-search`. Full surface table + hit-shape doc + knobs at [`knowledge/wiki/architecture/master-index-surface.md`](knowledge/wiki/architecture/master-index-surface.md) (U-CLEANUP-D2). Memory: [[reference_master_index_surface]], [[reference_awareness_stack]]. Knobs: `PRISM_MASTER_INDEX_INJECT=0`, `PRISM_MASTER_INDEX_K=N`, `PRISM_AWARENESS_INJECT=0`.

**Wiring verification (2026-05-14 orphan-rescue by claude-a2b1b5ca):** both injectors were in `.claude/hooks/` but NOT wired in any bundle or `settings.json` between 2026-05-12 (initial engine ship) and 2026-05-14 (wiring landed). Stale-claim hazard: this CLAUDE.md section and the memory `reference_master_index_surface` both asserted "auto-injects on every UserPromptSubmit" while the wiring was missing — verify before relying. Now wired as individual entries in `C:/Users/wompu/.claude/settings.json` (UserPromptSubmit after `prompt-context-inject.mjs`, SessionStart after `build-state-inject.mjs`); auto-mirrored to `H:/.claude/settings.json` by the `c-to-h-mirror` hook. **DO NOT** wire either into `sessionstart-bundle.mjs` going forward — the bundle is high-contention peer-claimed real-estate; individual entries survive multi-chat bundle churn. Verify wiring with `echo '{"prompt":"test"}' | "H:/.claude/bin/portable-node" .claude/hooks/master-index-precheck-inject.mjs` (expect exit 0 + JSON `hookSpecificOutput.additionalContext`).
