---
name: Don't soften code-completeness / correctness gates
description: When fixing hook hangs, never flip continueOnError:true on hooks that enforce "no half-built work" (code-completeness-gate, test-legitimacy, anti-pattern-detector, etc.). They are designed to fail the tool call.
type: feedback
originSessionId: 0377686b-167a-49b9-b92a-e54a6bfb810b
---
Do NOT change `continueOnError: false` to `true` on hooks whose job is to BLOCK incomplete or unsafe work. These are correctness gates, not advisory.

**Why:** The user has been repeatedly shipped partial work in the past. Hooks like `code-completeness-gate.mjs`, `test-legitimacy.mjs`, `anti-pattern-detector.mjs`, `duplication-hard-block.mjs`, `bash-destructive-guard.mjs`, `asset-deletion-block.mjs` exist specifically to fail the tool call when banned patterns are detected (TODO/FIXME/empty-catch/`.skip()`/`.only()`/`@ts-ignore`/SQL-injection/XSS/eval/etc per CLAUDE.md). Flipping them to `continueOnError: true` makes them advisory and lets bad work slip through.

**How to apply:** When the user reports hook-related hangs or errors, the fix is NEVER to soften correctness gates. Instead:
1. Reduce subprocess overhead (collapse advisory hooks, batch them, or use the bypass marker for advisory-only hooks)
2. Identify ACTUAL crashing hooks via smoke tests (feed realistic stdin, look for non-zero exit / malformed JSON)
3. Fix bugs in the crashing hook directly, OR cut its timeout if it's slow
4. Only flip `continueOnError` on hooks that are pure telemetry / advisory (e.g. learning trackers, output compressors), never on safety/correctness blockers

**Hooks that ARE safe to flip to true (advisory only, no enforcement):** posttooluse-compressor, output condensers, path-shortener, loop-detector, posttool-curiosity-tick, posttool-emergence-scan, meta-learning-trigger, efficiency-monitor, error-pattern-memory, tool-pattern-learner, path-frequency-tracker, and similar telemetry/learning hooks.

**Hooks that MUST stay continueOnError:false (block intentionally):** code-completeness-gate, test-legitimacy, anti-pattern-detector, duplication-hard-block, bash-destructive-guard, asset-deletion-block, settings-json-addonly-guard, edit-old-string-verify, physics-canonical-constants-guard, jm-die-provenance-guard, ingestion-cache-root-guard, stop_on_unwired_assets, stop_on_missing_tests, stop_on_failing_tests, stop_on_hook_unregistration, stop_on_skill_unwired.
