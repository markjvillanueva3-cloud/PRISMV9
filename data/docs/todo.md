# PRISM Active Task: W1 — Stop the Bleeding
## Session: Audit & Roadmap | Updated: 2026-02-10T02:50:00Z

## 🎯 CURRENT FOCUS (ATTENTION ANCHOR)
> Phase W1: Knowledge Preservation. GSD reads from files, doc anti-regression, changelogs.
> Roadmap: C:\PRISM\mcp-server\data\docs\WIRING_ROADMAP_W1-W5.md

## Context
Full system audit completed (FULL_SYSTEM_AUDIT.md). Found:
- 51 Python modules (25K+ lines) sitting unwired
- gsd_sync.py exists to solve stale GSD — never connected
- phase0_hooks.py has 39 hook definitions — never registered
- 127 of 154 scripts not in registry
- Skills overwritten with no anti-regression
- GSD is hardcoded strings, lost on every rewrite

## Next Session: W1 Implementation
1. W1.1: Create data/docs/gsd/ files, refactor gsdDispatcher to read from disk
2. W1.2: Update gsd_sync.py for new structure, wire as post-build
3. W1.3: Add autoDocAntiRegression to cadenceExecutor
4. W1.4: Add changelogs to updated skills

## Quality Gates
- After W1: `prism_gsd action=quick` returns content from disk files (not hardcoded)
- After W1: Skill rewrites that lose >30% content get ⚠️ warning
- After W1: gsd_sync.py fires after successful builds
