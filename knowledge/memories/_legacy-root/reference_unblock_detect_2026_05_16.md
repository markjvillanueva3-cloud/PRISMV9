---
name: reference-unblock-detect-2026-05-16
description: "SYSTEM-VIZ-BRAIN-MS0 /loop iter — scripts/unblock-detect.mjs SHIPPED 2026-05-16 commit 44ac1b52c slot echo. Peer-commit unblock detector: reads roadmap-index.json milestones[] dependencies[], classifies DONE/READY/BLOCKED via a ONE-LEVEL (non-recursive, cycle-safe) dep check, cross-refs git-log scoped commits. 49 node:test PASS. KEY: roadmap-index status spellings are chaotic (complete 364 vs completed 2, not_started vs not-started) — use a closed DONE_STATUSES allowlist + treat unknown status as not-done (safe direction). Reuses goal-ship-report.mjs utils by import (reuse not dup — isMain guard makes import side-effect-free)."
source: prism-memory
synced: 2026-05-18T01:02:10.027Z
aliases: reference_unblock_detect_2026_05_16
---


# U-P5-MULTI-CHAT-UNBLOCK-DETECT — scripts/unblock-detect.mjs

## What shipped

`scripts/unblock-detect.mjs` (+ `unblock-detect.test.mjs`, 49 node:test cases) — the
**peer-commit unblock detector**. In the 12-chat PRISM fleet, milestones in
`roadmap-index.json` carry `dependencies[]` (arrays of milestone-id strings). A chat
working milestone M is BLOCKED while M's dependency milestones are unfinished — work
done by PEER chats. The script reads roadmap-index, classifies every milestone
DONE/READY/BLOCKED, cross-refs recent `git log` scoped `[MILESTONE-ID]` commits, and
emits a Markdown unblock report — **focus mode** (`--milestone M` → is M unblocked,
on what is it waiting) and **fleet mode** (every READY pickup candidate, newly-unblocked
first). Operator-invoked CLI, no hook wiring (per [[feedback_dont_wire_for_wiring_sake_2026_05_16]]).

## Design decisions (reusable)

- **One-level dependency check = cycle-safe by construction.** `classifyMilestone`
  checks only whether each DIRECT dep `isDone` — it never recurses into a dep's own
  dependencies. So a dependency cycle (A→B→A) cannot hang the classifier. M is READY
  iff every direct dep is DONE; transitive readiness is deliberately NOT computed (M
  genuinely can't start until a direct dep actually ships, not merely becomes ready).
- **roadmap-index status spellings are chaotic** — live data: `complete` (364) vs
  `completed` (2), `not_started` (293) vs `not-started` (1), plus `consolidated`,
  `superseded`, `in_progress`, `ready`. Use a **closed `DONE_STATUSES` allowlist**
  (`complete/completed/consolidated/superseded/done`) and treat any UNRECOGNIZED status
  as not-done. That makes the safety-critical direction correct: a not-actually-done
  dependency can never let its dependent read READY (the dangerous false-positive). A
  typo'd terminal status over-blocks instead — the safe failure direction.
- **`gitLogScoped` returns `{ok, commits}`**, not a bare `[]`. A git failure (binary
  missing, not a repo, timeout) must be distinguishable from a genuinely empty log —
  else the report silently omits the "a peer just unblocked you" signal and looks
  authoritative. `ok:false` drives a fail-loud advisory (Karpathy R12).
- **Reuse-by-import, not duplication.** `unblock-detect.mjs` imports `inlineSafe`/
  `clip`/`writeFileAtomic`/`loadJson`/`resolveOutPath` from the sibling
  [[reference_goal_ship_report_2026_05_16]] (`goal-ship-report.mjs`). This is valid
  reuse — that file has an `isMain` guard so importing it runs no `main()`. `gitLogScoped`
  is NOT imported (it needs commit timestamps the sibling's `gitLog` lacks) — a
  genuinely different function, not a duplicate. Pattern: reuse a sibling script's
  generic exports rather than extracting a premature shared lib; extract a lib only
  when a 3rd consumer appears (R2 simplicity).
- **`resolveOutPath` reuse with a foreign default**: the imported `resolveOutPath`
  bakes in goal-ship-report's default out-path. `main()` always passes a non-null
  `args.out || DEFAULT_OUT_REL` (local constant) so the foreign default is provably
  unreachable. Reuse a parameterized function by always supplying the parameter.

## Scrutiny journey

Both files FAIL'd round 1 of the per-file 2-arm gate:
- File 1 (Arm A): 3 P1s — done-branch dropped `deps`; fleet `newlyCount` over full
  array not shown-rows; `parseArgs` value-flags ate the next `--flag` (`--window
  --json` silently dropped `--json`). Fixed all 3 + 2 Arm-B P2s (gitLogScoped
  `{ok,commits}`, fleet loop `index.values()` dedup).
- File 2 (Arm B): 3 P1s — MAX_ROWS truncation path uncovered; `gitLogScoped`
  happy-path conditionally-skipped + non-hermetic + tab-in-subject untested;
  `newly`-first sort never asserted. Fixed: a 205-milestone truncation test, a
  **hermetic git-fixture repo** (git init a throwaway repo, commit with a tab in the
  subject), a sort-order test, +2 additions.
Round 2: both files PASS/PASS. Universal 3-of-3 Stop gate: A+B+C all PASS
(`ubd-44ac1b52c` ledger cleared).

**Reviewer-quality note**: the `test-review-agent` (per-file Arm A) truncated its
output twice this session — Arm B's mutation-testing ("mutate the source to the bug,
confirm the test goes red") is the reliable signal. When a reviewer FAILs on findings
that mutation-testing shows are caught, the FAIL is overgraded — fix the legitimate
sub-findings, demonstrate the false ones wrong (Karpathy R7), don't blindly obey.

## Verify

```bash
node --test H:/prism/scripts/unblock-detect.test.mjs   # 49 pass 0 fail
node H:/prism/scripts/unblock-detect.mjs --milestone CLEANUP-MS0 --json
node H:/prism/scripts/unblock-detect.mjs --json        # fleet: ready/blocked/done counts
```


## Related
[[skills/unblock-detect|/unblock-detect]] • [[skills/completed|/completed]] • [[skills/consolidated|/consolidated]] • [[skills/superseded|/superseded]] • [[skills/done|/done]] • [[skills/prism|/prism]] • [[skills/scripts|/scripts]] • [[skills/blocked|/blocked]]