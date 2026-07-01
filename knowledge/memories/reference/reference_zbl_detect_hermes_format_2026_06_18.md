---
name: reference_zbl_detect_hermes_format_2026_06_18
description: "Build-loop cron bug (slot:bravo, commit a8c650fc78): the PRISM Zulu Build Loop's parseShippedFromCommits (scripts/lib/zulu-build-queue.mjs) recognized only U-ZBL-C<n> / U-ZULU-CAP-C<n> commit subjects, but the Hermes capability arc wires its C-units under [HERMES-CAPABILITY-C<n>]/U-C<n>-<slug>. So the cron's git-reality shipped signal missed every [HERMES-CAPABILITY-...] ship -> false-pending -> would perpetually re-drive an already-built queue. Fix: a third detector branch anchored to the HERMES-CAPABILITY-C<n> scope (NOT the bare U-C<n>, so a foreign-galaxy U-C<n> never false-marks). 22/22 tests + live-validated; 2-arm scrutiny PASS. Cron re-run -> pointer now correctly DRAINED."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.280Z
aliases: reference_zbl_detect_hermes_format_2026_06_18
---


# Zulu build-loop cron blind to the [HERMES-CAPABILITY-C<n>] commit format (2026-06-18, slot:bravo, a8c650fc78)

## The bug
`parseShippedFromCommits` (`scripts/lib/zulu-build-queue.mjs`) is the git-reality shipped signal for the `PRISM Zulu Build Loop` cron (it greps recent commit subjects so a drifted/missing brief can't make the queue falsely show pending). It matched ONLY `U-ZBL-C<n>` and `U-ZULU-CAP-C<n>`. But this session's Hermes arc wired its units under `[HERMES-CAPABILITY-C<n>]/U-C<n>-<slug>` -- a THIRD subject shape the detector did not know. Net effect: the cron would not see C1-C5 (wired this session) as shipped via their actual commits and could perpetually re-drive an already-built queue (the exact false-pending class the function exists to kill -- third instance, after the 2026-06-16 git-grounding fix [[reference_zulu_build_cron_git_grounded_2026_06_16]] and the 2026-06-15 prose-miscount fix [[reference_zulu_parseshipped_prose_miscount_fix_2026_06_15]]).

## The fix
Added a third detector branch `for (const m of line.matchAll(/HERMES-CAPABILITY-C(\d+)\b/gi)) shipped.add("C" + m[1])`. ANCHORED to the `HERMES-CAPABILITY-C<n>` scope, NOT the bare `U-C<n>` unit id -- so an unrelated `U-C<n>` from another galaxy (`[MILL-OPS]/U-C4-...`) can NEVER false-mark a capability id (precision test pins this). The per-line revert-guard (`^\S+\s+revert`) runs before the new branch, so a reverted HERMES commit is still un-shipped. U-ZBL / U-ZULU-CAP / combined-form / back-compat byte-unchanged. +2 tests (22/22): real C3/C4/C5 subjects detected, bare-U-C4 negative control, reverted-HERMES negative control, mixed-union. LIVE-VALIDATED on the real `git log --oneline -400`. Re-ran the cron -> pointer correctly `drained:true done:8 next:null`.

## Two lessons
1. **A git-commit-subject detector must know EVERY subject format the units actually ship under.** The same capability set shipped under shifting scope labels over time (`U-ZBL-C<n>` engine-build phase -> `[HERMES-CAPABILITY-C<n>]` wiring phase). A detector pinned to one format silently goes blind when the convention shifts. When you change a commit-scope convention, update the detector that greps for it (sibling of "prove shipped by REALITY, not prose" -- but the reality-grep itself must track the format).
2. **"shipped/done" in the build-loop = engine-BUILT, not live-WIRED.** The C1-C8 `Zulu*Engine.ts` exist (U-ZBL), so the loop reports `drained`. But C1-C5 were WIRED this session and C6-C8 wiring is spec-deferred. The build-vs-wire distinction lives in the per-chat handoff + [[reference_c5_backpressure_throttle_2026_06_18]], NOT the build-loop pointer. A reader of `zulu-build-loop-next.json drained` should not infer C6-C8 are live-wired (a "drained" pointer is the engine-build signal -- the same existence!=working trap at the orchestration layer). Follow-up (P2, 2-arm-flagged): a wiring-aware second signal before the directive note asserts "all units shipped".
