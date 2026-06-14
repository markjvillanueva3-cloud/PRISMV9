---
name: reference_post_ship_quoting-synergy-ms0-u-dynamic-shop-rate
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-DYNAMIC-SHOP-RATE (commit b9c6ac1b5). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.717Z
aliases: reference_post_ship_quoting-synergy-ms0-u-dynamic-shop-rate
---


# QUOTING-SYNERGY-MS0/U-DYNAMIC-SHOP-RATE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-DYNAMIC-SHOP-RATE (slot:charlie /goal-20 iter19): utilization-aware rate adjustment. DynamicShopRateEngine.adjust(input, opts) wraps ShopProfile.getMachineRate w/ capacity-band multipliers: rush(>=0.85)=+20%, busy(0.7-0.85)=+5%, baseline(0.5-0.7)=0%, capture(0.25-0.5)=-8%, deep_discount(<0.25)=-15%. Rush-lead uplift (+10%) stacks when hours_until_delivery < 7 days. Total clamped to +/-50% from baseline. Operator iter11 gap-axis 'dynamic shop rate'. Closes the static-rate-only flaw — a shop at 95% capacity now bids like one (rush uplift); a shop at 40% captures work at discount. Operator-supplied loading for iter19 (future tick reads from scheduler). Configurable bands + rush-lead via constructor. New dispatcher action quoting_dynamic_shop_rate. 14/14 tests covering all 5 bands, rush-lead apply/skip, ±50% clamp w/ extreme custom bands, unknown-machine warn-and-default-rate, custom-bands override, delta-sign consistency across band spectrum. Total 11 new prism_quoting actions across iters 11-15+17-19.

**Shipped:** 2026-05-25T21:45:01-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[quoting-synergy-ms0-u-dynamic-shop-rate]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._