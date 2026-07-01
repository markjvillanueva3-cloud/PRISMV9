# QUOTING-SYNERGY-MS0/U-DYNAMIC-SHOP-RATE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-DYNAMIC-SHOP-RATE (slot:charlie /goal-20 iter19): utilization-aware rate adjustment. DynamicShopRateEngine.adjust(input, opts) wraps ShopProfile.getMachineRate w/ capacity-band multipliers: rush(>=0.85)=+20%, busy(0.7-0.85)=+5%, baseline(0.5-0.7)=0%, capture(0.25-0.5)=-8%, deep_discount(<0.25)=-15%. Rush-lead uplift (+10%) stacks when hours_until_delivery < 7 days. Total clamped to +/-50% from baseline. Operator iter11 gap-axis 'dynamic shop rate'. Closes the static-rate-only flaw — a shop at 95% capacity now bids like one (rush uplift); a shop at 40% captures work at discount. Operator-supplied loading for iter19 (future tick reads from scheduler). Configurable bands + rush-lead via constructor. New dispatcher action quoting_dynamic_shop_rate. 14/14 tests covering all 5 bands, rush-lead apply/skip, ±50% clamp w/ extreme custom bands, unknown-machine warn-and-default-rate, custom-bands override, delta-sign consistency across band spectrum. Total 11 new prism_quoting actions across iters 11-15+17-19.

**Commit:** `b9c6ac1b55f7` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T21:45:01-05:00
**Tags:** quoting-synergy-ms0, u-dynamic-shop-rate, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-DYNAMIC-SHOP-RATE (slot:charlie /goal-20 iter19): utilization-aware rate adjustment. DynamicShopRateEngine.adjust(input, opts) wraps ShopProfile.getMachineRate w/ capacity-band multipliers: rush(>=0.85)=+20%, busy(0.7-0.85)=+5%, baseline(0.5-0.7)=0%, capture(0.25-0.5)=-8%, deep_discount(<0.25)=-15%. Rush-lead uplift (+10%) stacks when hours_until_delivery < 7 days. Total clamped to +/-50% from baseline. Operator iter11 gap-axis 'dynamic shop rate'. Closes the static-rate-only flaw — a shop at 95% capacity now bids like one (rush uplift); a shop at 40% captures work at discount. Operator-supplied loading for iter19 (future tick reads from scheduler). Configurable bands + rush-lead via constructor. New dispatcher action quoting_dynamic_shop_rate. 14/14 tests covering all 5 bands, rush-lead apply/skip, ±50% clamp w/ extreme custom bands, unknown-machine warn-and-default-rate, custom-bands override, delta-sign consistency across band spectrum. Total 11 new prism_quoting actions across iters 11-15+17-19.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-DYNAMIC-SHOP-RATE (slot:charlie /goal-20 iter19): utilization-aware rate adjustment. DynamicShopRateEngine.adjust(input, opts) wraps ShopProfile.getMachineRate w/ capacity-band multipliers: rush(>=0.85)=+20%, busy(0.7-0.85)=+5%, baseline(0.5-0.7)=0%, capture(0.25-0.5)=-8%, deep_discount(<0.25)=-15%. Rush-lead uplift (+10%) stacks when hours_until_delivery < 7 days. Total clamped to +/-50% from baseline. Operator iter11 gap-axis 'dynamic shop rate'. Closes the static-rate-only flaw — a shop at 95% capacity now bids like one (rush uplift); a shop at 40% captures work at discount. Operator-supplied loading for iter19 (future tick reads from scheduler). Configurable bands + rush-lead via constructor. New dispatcher action quoting_dynamic_shop_rate. 14/14 tests covering all 5 bands, rush-lead apply/skip, ±50% clamp w/ extreme custom bands, unknown-machine warn-and-default-rate, custom-bands override, delta-sign consistency across band spectrum. Total 11 new prism_quoting actions across iters 11-15+17-19.
```

## Files touched (5)
- mcp-server/src/__tests__/DynamicShopRate.test.ts   | 154 +++++++++++++++++++
- mcp-server/src/engines/DynamicShopRateEngine.ts    | 169 +++++++++++++++++++++
- mcp-server/src/schemas/quotingActionSchemas.ts     |   8 +
- .../src/tools/dispatchers/quotingDispatcher.ts     |  10 ++
- 4 files changed, 341 insertions(+)

## Lessons surfaced in commit body
- tilization-aware rate adjustment. DynamicShopRateEngine.adjust(input, opts) wraps ShopProfile.getMachineRate w/ capacity-band multipliers: rush(>=0.85)=+20%, busy(0.7-0.85)=+5%, baseline(0.5-0.7)=0%, capture(0.25-0.5)=-8%, deep_discount(<0.25)=-15%. Rush-lead uplift (+10%) stacks when hours_until_delivery < 7 days. Total clamped to +/-50% from baseline. Operator iter11 gap-axis 'dynamic shop rate'. C

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b9c6ac1b55f7`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._