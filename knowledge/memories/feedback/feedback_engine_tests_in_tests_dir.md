---
name: engine-tests-in-tests-dir
description: Engine companion tests MUST live in mcp-server/src/__tests__/ — the stop_on_unwired_assets Stop hook scans ONLY that TESTS_DIR, not src/engines/__tests__/
aliases: feedback_engine_tests_in_tests_dir
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.424Z
---


Put every engine's companion test at `mcp-server/src/__tests__/<Name>.test.ts` and import the engine as `../engines/<Name>.js`. Do NOT co-locate it as `src/engines/<Name>.test.ts`, and do NOT put it in `src/engines/__tests__/` either — neither is scanned.

**Why:** The `stop_on_unwired_assets` Stop hook (HARD BLOCK, in `MINIMAL_ALLOWLIST` — cannot be profiled off) hard-codes `const TESTS_DIR = "mcp-server/src/__tests__"` and recursively scans only that directory (and subdirs of it, e.g. `src/__tests__/engines/`). A test anywhere else is invisible — the engine is reported `UNTESTED ENGINE … no matching test file` and the session cannot Stop, even though the test exists, is committed, and all cases pass. The hook's filename match is lenient (`base.toLowerCase()` exact / prefix / substring) — only the *directory* is strict.

**Verified path history (2026-05-22, slot charlie — WEDMOffsetSPCEngine + SinkerEDMElectrodeInspectionEngine):**
1. Tests co-located at `src/engines/<Name>.test.ts` → Stop BLOCKED.
2. Moved to `src/engines/__tests__/` (commit `ecbeff4837`) → Stop STILL BLOCKED — that dir is NOT under `TESTS_DIR`. This is the trap: a `__tests__/` dir is necessary but not sufficient; it must be `src/__tests__/`, not `src/engines/__tests__/`.
3. Moved to `src/__tests__/` (rename `410f787aa9` + import repoint `6c945e194e`) → Stop CLEARED. All sibling EDM tests (`EDMMultiPassStrategyEngine.test.ts`, `EDMProgramAssemblerEngine.test.ts`, …) already live there — match the neighbours.

**The conflicting signals (all wrong or ambiguous — trust the hook source):**
- The PreToolUse test-coverage hook suggests `src/engines/<Name>.test.ts` (co-located) — wrong.
- `engines/.claude/CLAUDE.md` says "companion test file required in `__tests__/`" — true but ambiguous; the only `__tests__/` that satisfies the gate is `mcp-server/src/__tests__/`.
- Canonical source of truth: `TESTS_DIR` in `.claude/hooks/stop_on_unwired_assets.mjs` (line ~50).

**Gotcha — `git mv` drops an unstaged edit:** if you edit the import then `git mv` the file, `git mv` stages the *HEAD* blob (rename only), leaving your import edit unstaged on the new path. Re-`git add` the new path and commit again, or stage the edit before the move.

**How to apply:** When creating any new engine, write its test directly to `mcp-server/src/__tests__/<Name>.test.ts` from the start, importing the engine as `../engines/<Name>.js`. Related: [[feedback_parallel_scrutiny_per_file]].
