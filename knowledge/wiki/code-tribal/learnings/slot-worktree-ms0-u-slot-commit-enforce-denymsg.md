# SLOT-WORKTREE-MS0/U-SLOT-COMMIT-ENFORCE-DENYMSG — [MAIN-FORCE] [SLOT-WORKTREE-MS0]/U-SLOT-COMMIT-ENFORCE-DENYMSG (slot:india): fix now-lying escape instruction in the deny message (scrutiny P2, R12). The block message told users to add [BOOTSTRAP-SLOT-ENFORCE] -- which no longer bypasses after U-SLOT-COMMIT-ENFORCE-LIVE. Replaced with the real escapes: [MAIN-FORCE] for genuine cross-cutting fleet infra, PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP=1 for the operator transition window, kill switch unchanged. Message-only; bypass logic untouched (3-of-3 already PASS on the functional change).

**Commit:** `800a1778501a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T23:18:16-05:00
**Tags:** slot-worktree-ms0, u-slot-commit-enforce-denymsg, auto-distilled

## Subject
[MAIN-FORCE] [SLOT-WORKTREE-MS0]/U-SLOT-COMMIT-ENFORCE-DENYMSG (slot:india): fix now-lying escape instruction in the deny message (scrutiny P2, R12). The block message told users to add [BOOTSTRAP-SLOT-ENFORCE] -- which no longer bypasses after U-SLOT-COMMIT-ENFORCE-LIVE. Replaced with the real escapes: [MAIN-FORCE] for genuine cross-cutting fleet infra, PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP=1 for the operator transition window, kill switch unchanged. Message-only; bypass logic untouched (3-of-3 already PASS on the functional change).

## Body
```
[MAIN-FORCE] [SLOT-WORKTREE-MS0]/U-SLOT-COMMIT-ENFORCE-DENYMSG (slot:india): fix now-lying escape instruction in the deny message (scrutiny P2, R12). The block message told users to add [BOOTSTRAP-SLOT-ENFORCE] -- which no longer bypasses after U-SLOT-COMMIT-ENFORCE-LIVE. Replaced with the real escapes: [MAIN-FORCE] for genuine cross-cutting fleet infra, PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP=1 for the operator transition window, kill switch unchanged. Message-only; bypass logic untouched (3-of-3 already PASS on the functional change).
```

## Files touched (2)
- state/shared/specs/RGS-PLANNING-LOOP-BRIDGE-MS0-DESIGN-2026-06-11.md | 16 ++++++++++++++++
- 1 file changed, 16 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 800a1778501a`
- Milestone envelope: `mcp-server/data/milestones/SLOT-WORKTREE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._