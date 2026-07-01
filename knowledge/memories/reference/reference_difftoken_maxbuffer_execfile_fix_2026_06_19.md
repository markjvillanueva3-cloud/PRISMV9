---
name: reference_difftoken_maxbuffer_execfile_fix_2026_06_19
description: "DiffTokenEstimatorEngine silent ENOBUFS lie on large diffs + the shell-exec to execFileSync Windows-git-PATH trap; three reusable lessons (maxBuffer, GIT_BIN, replace_all-misses-sibling-callsites)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.553Z
aliases: reference_difftoken_maxbuffer_execfile_fix_2026_06_19
---


**U-DIFFTOKEN-MAXBUFFER-FALLBACK** (slot:alpha, 2026-06-19, commit `c11a0f8393`, branch cad-fusion-live-ms0). Fixed a silent R12 bug in `mcp-server/src/engines/DiffTokenEstimatorEngine.ts` + 2 test files. Surfaced by a pre-existing failing test (`contextDispatcher.token-economy-wire.test.ts` "uncommitted returns DiffEstimate") that was also contaminating the U-TOKENECON-ROI file.

**Bug (proven with live numbers):** the three live-git methods (estimateUncommitted/Staged/Between) ran a shell git-diff via the child_process sync-exec helper with NO maxBuffer option (the helper default = 1MB). PRISM's uncommitted working-tree diff is ~108MB / ~3940 files, so the call threw ENOBUFS and the catch returned emptyEstimate = filesChanged:0 / perFile:[] / recommendation "skip" -- a LIE (says nothing changed when everything did). Then slimResponse stripped the empty perFile array, breaking the dispatcher contract.

**Three reusable lessons:**
1. **The sync-exec helper default maxBuffer is 1MB.** Any child-process call whose stdout can be large MUST set maxBuffer explicitly, or it throws ENOBUFS and (if caught) silently degrades. For git-diff a large working tree blows past 1MB instantly. Fix: a bounded 64MB cap + a cheap `git diff --numstat` fallback (one line per file, never overflows) that reports HONEST file counts instead of "0 files".
2. **Shell-exec to execFileSync LOSES Windows git resolution.** The repo's security hook blocks the shell sync-exec helper when the command string is backtick-interpolated (injection risk). Switching to the execFile family (args passed as an array, no shell) is injection-safe BUT on Windows it does NOT resolve a bare "git" via PATH/PATHEXT -- it throws ENOENT. The old shell path worked only because the SHELL resolved git.exe. Fix: resolve an absolute GIT_BIN the way `.claude/helpers/git-log-tail.mjs` does -- PRISM_GIT_BIN env (existsSync) then "C:/Program Files/Git/mingw64/bin/git.exe" (existsSync) then "git" (POSIX, where execFile DOES resolve via PATH).
3. **replace_all on a specific arg-array form MISSES sibling call sites with different args.** I swapped the bare-git primary call to GIT_BIN via replace_all, but the numstat fallback had a DIFFERENT args array (with "--numstat") so the same-text match skipped it -- it kept bare "git". The 2-arm review caught this self-undermining P1 (the fallback, the whole point of the fix, would ENOENT on the exact Windows condition it exists for). Lesson: after a replace_all, grep for the bare pattern to confirm ALL variants were caught; add a structural regression-lock test (source-scan asserting zero bare-git spawns + both sites via GIT_BIN) when a behavioral invariant cannot catch the regression (here perFile.length===filesChanged passes at 0===0 when the fallback dies).

**Validation (R15, live):** through the real engine, estimateUncommitted() returned filesChanged=3941, ~11.8M est tokens, "skip" (was 0). Also added a log.warn so a fallback failure is surfaced, not swallowed (R12). 42/42 affected tests. Same alpha token-telemetry loop as [[reference_tokenecon_roi_wire_2026_06_19]] + [[reference_tokenledger_mostexpensive]]; the slimResponse strips-empty-array behavior is the same envelope gotcha as the Infinity->null case in the ROI memory.
