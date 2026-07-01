# SFC-CONVERGENCE/U-SFC-PREVIEW — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-PREVIEW (slot:oscar): wire read-only sfc_convergence_preview into prism_calc -- per-input orchestrator-vs-engine delta + safety_flags to de-risk operator PRISM_SFC_CONVERGE enable; fixed 2 agent result-unwrap bugs (compute() AtomicValue.value + Ultimate cutting_speed/spindle_rpm/feed_per_tooth OptimizedValue field names, masked by flat mocks); 25/25 tests incl real-engine round-trip, full tsc clean

**Commit:** `10d7942143ad` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T10:24:37-05:00
**Tags:** sfc-convergence, u-sfc-preview, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-PREVIEW (slot:oscar): wire read-only sfc_convergence_preview into prism_calc -- per-input orchestrator-vs-engine delta + safety_flags to de-risk operator PRISM_SFC_CONVERGE enable; fixed 2 agent result-unwrap bugs (compute() AtomicValue.value + Ultimate cutting_speed/spindle_rpm/feed_per_tooth OptimizedValue field names, masked by flat mocks); 25/25 tests incl real-engine round-trip, full tsc clean

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-PREVIEW (slot:oscar): wire read-only sfc_convergence_preview into prism_calc -- per-input orchestrator-vs-engine delta + safety_flags to de-risk operator PRISM_SFC_CONVERGE enable; fixed 2 agent result-unwrap bugs (compute() AtomicValue.value + Ultimate cutting_speed/spindle_rpm/feed_per_tooth OptimizedValue field names, masked by flat mocks); 25/25 tests incl real-engine round-trip, full tsc clean
```

## Files touched (4)
- scripts/merge-augmentations.mjs       |  2 +-
- scripts/regen-viz-fast-order.test.mjs | 55 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/regen-viz.mjs                 |  8 ++++++++
- 3 files changed, 64 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 10d7942143ad`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._