# SLOT-WORKTREE-MS0/U-SLOT-COMMIT-ENFORCE-LIVE — [MAIN-FORCE] [SLOT-WORKTREE-MS0]/U-SLOT-COMMIT-ENFORCE-LIVE (slot:india): make slot-branch commit enforcement ACTUALLY FIRE -- THE build the operator asked to fix.

**Commit:** `6f3f3726cea6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T23:03:27-05:00
**Tags:** slot-worktree-ms0, u-slot-commit-enforce-live, auto-distilled

## Subject
[MAIN-FORCE] [SLOT-WORKTREE-MS0]/U-SLOT-COMMIT-ENFORCE-LIVE (slot:india): make slot-branch commit enforcement ACTUALLY FIRE -- THE build the operator asked to fix.

## Body
```
[MAIN-FORCE] [SLOT-WORKTREE-MS0]/U-SLOT-COMMIT-ENFORCE-LIVE (slot:india): make slot-branch commit enforcement ACTUALLY FIRE -- THE build the operator asked to fix.

ROOT CAUSE (operator 2026-06-11 "commits and staging should always be on chat slot nato name branch ... fix the build that is supposed to make [it] auto enforced for all galaxies and chat slots"): slot-commit-worktree-enforce.mjs HARD-blocks a slot-bound chat from `git commit` unless the live branch is slot/<name> -- but it carried a one-shot migration escape `if (cmd.includes("[BOOTSTRAP-SLOT-ENFORCE]")) allow()`, and that marker became the STANDARD commit prefix on EVERY chat fleet-wide (7 of last 12 commits carry it). So the gate silently fail-opened on every commit: it existed, was wired, and never once fired -> the whole fleet kept committing to shared cad-fusion-live-ms0 -> the index.lock contention.

FIX: route the bypass through pure tested commitBypass(cmd,env) -- [BOOTSTRAP-SLOT-ENFORCE] now bypasses ONLY inside an operator-opened transition window (PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP=1, default OFF -> gate ENFORCES). [MAIN-FORCE] is the narrow audited cross-cutting escape (this commit uses it -- a fleet hook legitimately belongs on the shared tree), mirroring worktree-commit-route + main-tree-write-block (R11, one escape convention across all 3 lane hooks). Golf stays integrator-exempt; PRISM_SLOT_COMMIT_ENFORCE_DISABLE=1 stays the emergency stop.

LIVE-VALIDATED against the real india binding @ cad-fusion-live-ms0: T1 plain [BOOTSTRAP-SLOT-ENFORCE] -> DENY exit 2; T2 [MAIN-FORCE] -> allow; T3 marker+transition-env -> allow; T4 kill switch -> allow. 8/8 lib + 5/5 applier tests; applied via idempotent EOL-aware node-fs applier (Edit tool firewall-blocks worktree chats from harness files). Pairs with U-LANE-CD-AWARE-WIRE (staging half).
```

## Files touched (2)
- .claude/hooks/slot-commit-worktree-enforce.mjs | 8 +++++++-
- 1 file changed, 7 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6f3f3726cea6`
- Milestone envelope: `mcp-server/data/milestones/SLOT-WORKTREE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._