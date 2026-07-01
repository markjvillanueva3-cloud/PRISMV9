---
name: reference_stopgate_session_attribution_2026_06_24
description: "stop_on_failing_tests freshness gate now attributes stale tests per-session (via transcript edits) so a peer slot's edit no longer thrashes an innocent slot's Stop. Reusable lib + a caught rename under-block."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.211Z
aliases: reference_stopgate_session_attribution_2026_06_24
---


**U-STOPGATE-SESSION-ATTRIBUTION (commit `4e684d9d2a`, slot:papa, 2026-06-24, branch cad-fusion-live-ms0).**

**Problem (the live blocker):** the `stop_on_failing_tests.mjs` Stop gate's stale-GREEN freshness sub-check ran `git status` over the WHOLE shared `H:/prism` tree, so with 26 concurrent slots a PEER slot's uncommitted `mcp-server/**/*.test.ts` edit blocked an INNOCENT slot's Stop. (The documented thrash: [[reference_test_freshness_gate_thrash_concurrent_fleet_2026_06_24]].) The gate's own comment already prescribed the fix: a CALLER-layer "session attribution" — *do NOT loosen the pure `pickStaleTestFromStatus` decision*.

**Fix (the technique):** the Claude Code Stop hook stdin carries `transcript_path`. The transcript JSONL is the authoritative per-session edit record — every `Edit/Write/MultiEdit/NotebookEdit` is a `tool_use` block `{type:"tool_use", name, input:{file_path|notebook_path}}` in `message.content[]`. Intersect the conservative git-status stale candidates with THIS session's edited set → block only on the session's OWN stale test. No new PostToolUse hook / no settings.json wiring.

**What shipped:**
- NEW pure lib `.claude/helpers/lib/session-edited-files.mjs` (19 tests): `toRepoRel` (normalize any abs-Windows / slot-worktree / rel path → lowercased repo-rel key), `extractSessionEditedFiles(transcriptText)`, `filterToSessionOwned`.

**CORRECTION (R12, verified by reading `leave-a-copy-behind-guard.mjs` after the commit):** the lib does NOT cleanly transfer to that sibling. `extractSessionEditedFiles` captures only `Edit/Write/MultiEdit/NotebookEdit` `tool_use` blocks — but leave-a-copy-behind detects git `D`/`R` (delete/rename), which a session performs via **`Bash` (`rm`/`git rm`/`git mv`)**, NOT an edit tool. So that gate would need a SEPARATE, fragile deletion/move-command extractor over Bash `tool_use` command strings, AND it is a higher-stakes gate (its job is preventing SILENT FILE LOSS — the U-WIRE12 incident, 4 engines lost), where a false-negative is the exact disaster it exists to stop. Only `toRepoRel` is cleanly reusable. Deliberately NOT built reflexively — needs operator-aware scoping + its own test gauntlet, lower priority than the test-gate thrash (deletes are rarer than test edits, and it already has an allowlist + `BYPASS_LEAVE_COPY=1`).
- `stop_on_failing_tests.mjs`: `collectStaleTestsFromStatus` (array; `pickStaleTestFromStatus` delegates byte-identical), `pickOwnStaleTest` (attribution + conservative fallback), `newestChangedTestNewerThan` threads `stdin.transcript_path` + bounded 64MB transcript reader. 34 tests.

**Safety invariant (load-bearing):** only ever REMOVES a proven false-positive. A test THIS session edited still blocks; attribution uncertainty (transcript unreadable / >64MB / empty) falls back to blocking `candidate[0]` — never under-block.

**Lesson (the adversarial-review catch — R9/R16):** my own unit tests passed but two parallel reviewers (sonnet) caught a REAL P1 under-block I introduced: `git status` emits a rename as `R  old.test.ts -> new.test.ts`; the collector took the whole composite `"old -> new"` as the candidate, which `toRepoRel` could never match against the session's transcript edit (the destination) → the renaming session slipped a stale-green report through. Pre-fix this case blocked (conservatively); the attribution layer introduced the hole. **Fixed:** decompose rename/copy lines to the DESTINATION path before they enter candidates. Pinned by a regression test. → a freshness/attribution layer over `git status --porcelain` MUST handle the `R/C old -> new` composite, or it silently under-blocks on renames.

**Live validation:** real session transcript with ~10 uncommitted peer `mcp-server` test edits → `{continue:true}` CLEARED; a crafted transcript that edited `erp-rfq-routes.test.ts` → `{continue:false}` BLOCKED. Active path confirmed: `stop-regression-bundle.mjs` (`HOOK_BASE=H:/prism/.claude/hooks`) spawns the hook with full stdin (transcript_path) piped through; no C: copy exists.

**Verify:** `git -C H:/prism show 4e684d9d2a` · `node .claude/helpers/lib/session-edited-files.test.mjs` (19) · `node .claude/hooks/__tests__/stop_on_failing_tests.test.mjs` (34).

**Sibling-gate reuse audit (read-only, 2026-06-24, slot:papa — bounds where the lib applies, so a future chat doesn't re-derive it).** 14 `.claude/hooks/*.mjs` reference `git status --porcelain`. Classified for clean session-attribution reuse of `extractSessionEditedFiles` (edit-scanning HARD-BLOCK on the whole shared tree = thrash candidate):
- `stop_on_failing_tests` — edit-scan HARD-BLOCK → **FIXED here** (the one clean, high-value reuse).
- `leave-a-copy-behind-guard` — blocks on git `D`/`R` (delete/rename via Bash `rm`/`git rm`/`git mv`) → NOT a clean reuse (needs a separate Bash-command deletion/move extractor; higher-stakes silent-file-loss gate). Deferred.
- `stop_on_uncommitted_critical` — emits `{result:"warn"}` = ADVISORY, does NOT block → no thrash; reuse would only de-noise a warning (marginal). Skip.
- `scrutinize-before-stop` — blocks on uncommitted-changes + no 3-of-3 ledger (edit-scan) → genuine thrash candidate BUT high-stakes (gates the mandatory review); deserves its own careful unit + adversarial review, NOT a tail-of-session sweep. Candidate follow-up.
- Remainder (`stop-cross-tree-collision-advisory`, `stop-auto-wire`, `skill-lint-stop`, `git-health-guard`, `quality-dashboard-inject`, `pre-flight-check`, `chat-cleanup-on-stop`, `auto-postmortem-on-failure-restart`, `auto-fork-executor`, `blueprint-coverage-floor-guard`) — advisory / non-session-blocking / different purpose. Not thrash blockers.
CONCLUSION: the lib's one clean high-value reuse (stop_on_failing_tests) is shipped; `scrutinize-before-stop` is the only remaining genuine (but high-stakes) candidate.
