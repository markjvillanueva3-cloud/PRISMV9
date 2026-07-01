---
name: cross-pc-verify-wire-2026-06-14
description: 2026-06-14 (slot:bravo) — wired the unwired cross-pc-handoff-verify audit into a lightweight advisory Stop hook (newest-5 handoffs, reuses the script's pure helpers). Fixed a latent OOM: the script's bare endsWith() main-guard ran main() on import from a SUPERSTRING-named consumer -> full-repo scan -> OOM. Commit f9f5770cd2, 9 tests, 2/2 scrutiny.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.534Z
aliases: reference_cross_pc_verify_wire_2026_06_14
---


2026-06-14 (slot:bravo, session 17b9f42e, AGENTIC-SUBSTRATE-BRIDGE /loop iter5) — `U-CROSS-PC-VERIFY-WIRE` (round-1 #5).

## What shipped (commit f9f5770cd2, [MAIN-FORCE] cad-fusion-live-ms0)
- `.claude/hooks/stop-cross-pc-handoff-verify.mjs` -- advisory Stop hook guarding the operator's "H: is master, must work after an SSD swap" invariant: a C: path in a RECENT handoff = critical (breaks resume on another machine). SCOPED to the newest 5 handoffs (cheap per-Stop) vs the script's full-repo scan. Reuses the script's exported PURE helpers (classifyPath/extractPathRefs/severityFor/aggregateFindings) -- R8, no duplication. Advisory (warn|pass), fail-soft. Wired into settings.json Stop (C:->H: mirror verified, wired=true).
- 9 R9 tests (`stop-cross-pc-handoff-verify.test.mjs`); live `echo '{}' | node hook` -> `{"result":"pass"}`.

## THE BUG (fleet-wide lesson): a bare endsWith() main-guard is import-UNSAFE for superstring filenames
`scripts/cross-pc-handoff-verify.mjs` had `if (process.argv[1]?.endsWith("cross-pc-handoff-verify.mjs")) main();`. My hook is named `stop-cross-pc-handoff-verify.mjs` -- a SUPERSTRING of that basename. So `"....../stop-cross-pc-handoff-verify.mjs".endsWith("cross-pc-handoff-verify.mjs")` === **true** -> importing the helpers from my hook RAN the script's `main()` -> its full recursive `state/shared` audit -> **OOM** (`<--- Last few GCs --->`). Diagnosed via R8 (files were tiny -- 4-6KB -- so NOT file size; it was the import running the full audit).
**FIX:** require a path SEPARATOR before the basename -- normalize backslashes then `endsWith("/cross-pc-handoff-verify.mjs")`. The CLI path (`.../scripts/cross-pc-handoff-verify.mjs`) still fires main(); a superstring sibling (char before "cross-pc" is "-", not "/") does not. Empirically proven by both reviewers (CLI runs main, import does not).
**DOCTRINE (fleet-wide):** a node `isMain`/main-guard must use either resolved-path equality (`path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)`) OR a separator-anchored endsWith. A BARE `endsWith("name.mjs")` auto-runs on import from ANY file whose name ends with that string -- a latent OOM/side-effect bomb. → [[feedback_commit_msg_backtick_substitution]] (sibling git/script gotcha)

## NOTE (R12, pre-existing, queued separately)
The script's CLI FULL audit still OOMs on the current large `state/shared` (recursive .json scan doesn't scale) -- independent of this unit; the lightweight hook avoids that path. Follow-up: bound the script's scan (size caps / skip the huge graph augmentation .json).

→ [[reference_agentic_substrate_bridge_2026_06_14]] · [[reference_loop_state_read_api_2026_06_14]]
