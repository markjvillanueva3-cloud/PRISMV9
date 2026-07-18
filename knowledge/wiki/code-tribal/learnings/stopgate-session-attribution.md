---
title: stop_on_failing_tests session attribution (concurrent-fleet thrash fix)
type: code-tribal
domain: dev-infra
unit: TEST-INTEGRITY/U-STOPGATE-SESSION-ATTRIBUTION
commit: 4e684d9d2a
slot: papa
date: 2026-06-24
tags: [stop-hook, test-gate, concurrent-fleet, false-positive, session-attribution, git-status, under-block]
---

# stop_on_failing_tests — per-session stale-test attribution

## Symptom
With the 26-slot fleet building concurrently in the shared `H:/prism` tree, the
`stop_on_failing_tests` Stop gate blocked an **innocent** slot's Stop because a **peer**
slot had an uncommitted `mcp-server/**/*.test.ts` edit newer than `VITEST_REPORT.json`.
The gate's stale-GREEN freshness check ran `git status` over the whole shared tree and
could not tell whose edit it was → cross-chat thrash.

## Root cause
`git status` cannot attribute a working-tree edit to a session. The pure decision
(`pickStaleTestFromStatus`) correctly over-blocks given its input; the fix belongs at the
**caller layer** — scope the INPUT to the current session's own changes (the gate's own
comment said exactly this).

## Fix
Claude Code Stop-hook stdin carries `transcript_path`. The transcript JSONL is the
authoritative per-session edit record (`Edit/Write/MultiEdit/NotebookEdit` `tool_use`
blocks with `input.file_path` / `input.notebook_path`). New pure lib
`.claude/helpers/lib/session-edited-files.mjs` extracts the session's edited files and
intersects them with the conservative stale candidates; the hook blocks only on the
session's **own** stale test. Transcript unreadable / >64 MB / empty → conservative
fallback (block) so the **never-under-block** invariant holds.

## The adversarial-review catch (R9/R16)
Unit tests passed, but two independent reviewers found a **real P1 under-block** the
attribution layer introduced: `git status` emits a rename as `R  old.test.ts -> new.test.ts`;
the collector took the composite `"old -> new"` string as the candidate, which never
matched the session's transcript edit (the destination) → the **renaming** session slipped
a stale-green report through. Pre-fix this blocked conservatively. **Lesson:** any freshness
/ attribution layer over `git status --porcelain` MUST decompose `R`/`C` rename/copy lines
to the **destination** path, or it silently under-blocks on renames. Fixed + regression-locked.

## Reuse (corrected after reading the sibling — R12)
Only `toRepoRel` transfers cleanly. The sibling thrash hook `leave-a-copy-behind-guard`
detects git `D`/`R` (delete/rename), which a session performs via **Bash** (`rm`/`git rm`/
`git mv`) — NOT an `Edit`/`Write` `tool_use` — so `extractSessionEditedFiles` does NOT capture
it. That gate needs a SEPARATE deletion/move-command extractor over Bash `tool_use` strings,
and it is higher-stakes (it prevents SILENT FILE LOSS; a false-negative is the exact U-WIRE12
disaster). Lower priority + must not be built reflexively: deletes are rarer than test edits,
and it already has an allowlist + `BYPASS_LEAVE_COPY=1`. Follow-up, NOT done here.

## Verify
- `git -C H:/prism show 4e684d9d2a`
- `node .claude/helpers/lib/session-edited-files.test.mjs` (19) ·
  `node .claude/hooks/__tests__/stop_on_failing_tests.test.mjs` (34)
- Live: real transcript w/ peer test edits → `{continue:true}`; own-edit → `{continue:false}`.

Related: [[reference_test_freshness_gate_thrash_concurrent_fleet_2026_06_24]] ·
[[reference_stopgate_session_attribution_2026_06_24]]
