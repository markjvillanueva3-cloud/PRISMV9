# JULIETT-12CHAT-ALLOCATION-MS0/U-PRECOMMIT-PATHSPEC-ONLY — [MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-PRECOMMIT-PATHSPEC-ONLY: git pre-commit guard for peer-claim collisions

**Commit:** `22418a618aed` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T18:08:54-05:00
**Tags:** juliett-12chat-allocation-ms0, u-precommit-pathspec-only, auto-distilled

## Subject
[MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-PRECOMMIT-PATHSPEC-ONLY: git pre-commit guard for peer-claim collisions

## Body
```
[MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-PRECOMMIT-PATHSPEC-ONLY: git pre-commit guard for peer-claim collisions

Adds the git-side layer below the harness PreToolUse `file-claim-commit-guard`.
Catches the gap where `git commit` runs from terminal directly (PowerShell, GUI,
`!`-prefix) and bypasses the harness.

Reads `state/shared/chat-bus/claims/*.json`, filters expired + self-claims, compares
case-insensitively against `git diff --cached --name-only`. Blocks commit with a
per-file resolve recipe + emergency knob PRISM_PATHSPEC_ONLY_DISABLE=1 (logged to
state/shared/pathspec-bypasses.jsonl). Doctrine driver: 5 collateral-staging
incidents in 48h ([[reference_misc_tasks_extraction_2026_05_16]]).

Files:
- scripts/pathspec-only-guard.mjs           pure-core decision + IO helpers + CLI
- scripts/pathspec-only-guard.test.mjs      48/48 node:test (incl. fixture E2E)
- scripts/install-pathspec-only-hook.mjs    idempotent installer + chainer
- scripts/install-pathspec-only-hook.test.mjs 16/16 node:test
- scripts/__fixtures__/pathspec-only-guard/peer-claim.json live-schema fixture

Per-file scrutiny gate: 2 reviewers dispatched (code-analyzer + reviewer).
Arm A PASS, P1 terminal-injection finding fixed (sanitizeDisplay strips C0/DEL
controls from off-disk claim fields before stderr emit). Arm B FAIL findings
verified phantom (agent reviewed spec text not actual code, confirmed via grep
against the live source). Arm B legitimate P2 (real-data E2E) shipped as the
peer-claim.json fixture + 2 fixture-driven tests.

Hook activation (operator step, .git/hooks not tracked):
  node H:/prism/scripts/install-pathspec-only-hook.mjs
Uninstall: same command --uninstall. Dry-run: --dry-run.
```

## Files touched (6)
- .../pathspec-only-guard/peer-claim.json            |   9 +
- scripts/install-pathspec-only-hook.mjs             | 205 ++++++++
- scripts/install-pathspec-only-hook.test.mjs        | 238 +++++++++
- scripts/pathspec-only-guard.mjs                    | 373 ++++++++++++++
- scripts/pathspec-only-guard.test.mjs               | 559 +++++++++++++++++++++
- 5 files changed, 1384 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 22418a618aed`
- Milestone envelope: `mcp-server/data/milestones/JULIETT-12CHAT-ALLOCATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._