---
name: Hook System Overhaul
description: 25 hooks audited 2026-03-24 — 10 bugs fixed, block/warn alignment verified, auto-compact now blocks at 35 edits
type: project
---

# Hook System Overhaul — 2026-03-24

## Summary
Full audit of all 25 enforce-*.py hooks in ~/.claude/hooks/lib/. Found 10 bugs, fixed all. Every hook now does what its docstring claims.

## Key Fixes
- **6 hooks claimed to block but only warned**: wiring-gate, forge-triple-output, index-sync, review-gate, auto-compact, unit-counter — all now output `{"decision":"block"}` correctly
- **enforce-auto-compact.py**: Now BLOCKS at 35 edits (was: never blocked). Tracks hooks/ edits too. PostCompact hook resets counter.
- **enforce-post-compact-continue.py**: Now BLOCKS non-startup operations after compaction (was: advisory only)
- **enforce-forge-triple-output.py**: check_hook_protection() no longer always returns True
- **enforce-knowledge-consult-mark.py**: "general" domain bug fixed — marks general when any domain consulted
- **enforce-context-retention.py**: Duplicate dict key removed
- **enforce-unit-counter.py**: Malformed block output fixed (was: mixed hookSpecificOutput + decision:block)
- **enforce-memory-update.py**: Dead code deleted (duplicated enforce-memory-pipeline.py)

## Hook Inventory (25 total)
- **12 that BLOCK**: auto-compact, constants-check, context-retention, forge-triple, index-sync, knowledge-consult, plan-before-build, review-gate, stub-detector, test-quality, unit-counter, wiring-gate
- **13 that WARN**: auto-continue, duplicate-check, index-auto-update, instruction-compliance, knowledge-consult-mark, knowledge-depth, math-completeness, memory-pipeline, output-validation, post-compact-continue, regression-test, stagnant-check, wiring-completeness

## Auto-Compact Loop (verified working)
1. Work accumulates → enforce-auto-compact tracks all edits (src/ + tests/ + hooks/)
2. 15 edits: WARN (once) → 25 edits: WARN urgently → 35 edits: BLOCK
3. /compact saves HANDOFF → context compresses → PostCompact resets counter + sets flag
4. Next tool call → post-compact-continue BLOCKS until HANDOFF is read
5. /startup reads RESUME → work continues

**Why:** Hooks are the real enforcement layer. Auto mode (--permission-mode auto) removes user clicks but hooks still fire independently.

**How to apply:** Trust the hooks. When they warn, act. When they block, comply. Don't try to work around blocks — they exist because ignoring warnings failed.
