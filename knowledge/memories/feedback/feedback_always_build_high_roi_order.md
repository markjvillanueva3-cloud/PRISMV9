---
name: feedback_always_build_high_roi_order
description: Operator standing directive — always build without asking, always build in high-ROI order. Don't end a turn with only a report when a safe in-lane build is available.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.397Z
aliases: feedback_always_build_high_roi_order
---


**Operator directive (2026-06-15, slot tango, FLEET-WIDE intent):** "always build without asking, always build in high roi order."

**Why:** the operator does not want check-in questions ("which avenue next?") or report-only turns when a concrete, safe, in-lane build is available. Pick the highest-ROI buildable item and SHIP it autonomously, then continue to the next by ROI.

**How to apply:**
1. **No "which should I do?" questions** when a clear high-ROI build exists — rank by ROI and build the top one. Reserve questions for genuinely ambiguous scope or destructive/cross-lane decisions.
2. **ROI ranking is COST-ADJUSTED:** value × (prevents-recurrence / compounding) ÷ (build cost + ongoing cost). E.g. a new per-Edit PreToolUse hook has high prevent-value but adds fork-storm cost → net lower than a one-shot fix or a Stop-throttled check. Concrete code fixes with no ongoing cost often out-rank new audit infra.
3. **Stay in-lane + safe:** tango builds discovery/audit/dedup infra + concrete dedup fixes. Cross-domain physics remediation (inline-constants), engine→dispatcher wiring (romeo/papa), and system-viz graph (sierra) get SURFACED, not blind-built — that boundary is not a "report-only" excuse, it's correct routing.
4. **Comprehensive-build still applies:** real tests (reference values/invariants, never `toBeDefined()`), wire it, validate on live data, no stubs/partials. "Build without asking" ≠ "build sloppy."
5. **Order:** highest-ROI first, then next, until token zone forces a checkpoint (commit + handoff at YELLOW→RED, never spiral).

Pairs with [[feedback_do_optional_high_roi_work]], [[feedback_build_comprehensive_route]], [[feedback_net_benefit_auto_build]], [[feedback_prioritize_devtools_backend]].
