# CAD-LEARNING-AI/U-BPA-DRAIN-NOOP-COUNT — [MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-DRAIN-NOOP-COUNT (slot:india): drainEvents no longer counts a no-dispatch-fn (plan-only) run as a real dispatch -- closes the arm-C P2 from U-BPA-LOOP-DRAIN-CORE. New dispatchedNoop counter + a per-row dispatched:true/false flag so a caller reading dispatchedOk never sees a phantom dispatch. 15/15 (rewrote the no-op test to the corrected intent + added a real-vs-noop lock).

**Commit:** `179ca3d7238a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T00:49:23-05:00
**Tags:** cad-learning-ai, u-bpa-drain-noop-count, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-DRAIN-NOOP-COUNT (slot:india): drainEvents no longer counts a no-dispatch-fn (plan-only) run as a real dispatch -- closes the arm-C P2 from U-BPA-LOOP-DRAIN-CORE. New dispatchedNoop counter + a per-row dispatched:true/false flag so a caller reading dispatchedOk never sees a phantom dispatch. 15/15 (rewrote the no-op test to the corrected intent + added a real-vs-noop lock).

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-DRAIN-NOOP-COUNT (slot:india): drainEvents no longer counts a no-dispatch-fn (plan-only) run as a real dispatch -- closes the arm-C P2 from U-BPA-LOOP-DRAIN-CORE. New dispatchedNoop counter + a per-row dispatched:true/false flag so a caller reading dispatchedOk never sees a phantom dispatch. 15/15 (rewrote the no-op test to the corrected intent + added a real-vs-noop lock).
```

## Files touched (3)
- scripts/lib/blueprint-loop-drain-lib.mjs      | 18 ++++++++++++++----
- scripts/lib/blueprint-loop-drain-lib.test.mjs | 17 ++++++++++++++---
- 2 files changed, 28 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 179ca3d7238a`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._