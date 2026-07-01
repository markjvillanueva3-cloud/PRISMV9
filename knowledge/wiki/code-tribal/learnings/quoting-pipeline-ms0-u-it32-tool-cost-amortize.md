# QUOTING-PIPELINE-MS0/U-IT32-TOOL-COST-AMORTIZE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-IT32-TOOL-COST-AMORTIZE (slot:foxtrot /loop iter32): ToolCostAmortizationEngine — per-part tool + setup + overhead cost (4th P1 closure this session)

**Commit:** `f6b037905783` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T16:34:15-05:00
**Tags:** quoting-pipeline-ms0, u-it32-tool-cost-amortize, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-IT32-TOOL-COST-AMORTIZE (slot:foxtrot /loop iter32): ToolCostAmortizationEngine — per-part tool + setup + overhead cost (4th P1 closure this session)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-IT32-TOOL-COST-AMORTIZE (slot:foxtrot /loop iter32): ToolCostAmortizationEngine — per-part tool + setup + overhead cost (4th P1 closure this session)

Closes iter20 P1 "tool cost amortization" gap. Quoting + ERP need accurate per-part tool cost
including insert/end-mill cost ÷ tool-life, resharpen credit, multi-tool Σ-aggregation, setup
amortization across batch, overhead burden, short-run premium below MOQ.

Per-tool breakdown with pct_of_total surfaced (quoting team sees WHICH tool drives cost).
Kennametal sanity check: per-part tool cost > $50 triggers warning (target ≤ 3-5% of sell
price per Kennametal §4).

Reference: AIAG QS-9000 §3 + Sandvik Tooling Economy §B-2 + Kennametal §4 + Modern Machine Shop.

Files:
  + src/engines/ToolCostAmortizationEngine.ts (Σ-amortization + resharpen-credit clamp +
    short-run premium + Kennametal sanity warning + per-tool breakdown)
  + src/__tests__/ToolCostAmortizationEngine.test.ts (19 tests, all PASS)
  + src/tools/dispatchers/safetyDispatcher.ts — tool_cost_amortize action routable

Tests: 19/19 PASS (8ms). Variability: 3 tool types × 5 batch sizes spanning MOQ. Adversarial:
$5000 mega-tool, negative-net resharpen, $0 setup, batch=1. Pathspec-staged per
BOOTSTRAP-SLOT-ENFORCE.
```

## Files touched (4)
- .../__tests__/ToolCostAmortizationEngine.test.ts   | 153 +++++++++++++++++++
- .../src/engines/ToolCostAmortizationEngine.ts      | 169 +++++++++++++++++++++
- .../src/tools/dispatchers/safetyDispatcher.ts      |   7 +
- 3 files changed, 329 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f6b037905783`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-PIPELINE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._