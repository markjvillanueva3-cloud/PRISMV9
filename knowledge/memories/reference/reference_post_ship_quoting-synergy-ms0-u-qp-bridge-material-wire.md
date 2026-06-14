---
name: reference_post_ship_quoting-synergy-ms0-u-qp-bridge-material-wire
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-BRIDGE-MATERIAL-WIRE (commit 3ed6ba83c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.723Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-bridge-material-wire
---


# QUOTING-SYNERGY-MS0/U-QP-BRIDGE-MATERIAL-WIRE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BRIDGE-MATERIAL-WIRE (slot:charlie iter44 2026-05-26): Phase 1 unit 1 of 15. Wires the canonical material registry (1,047 materials × 127 parameters) into quoting via the smallest-possible bridge engine. Closes the synergy gap named in iter42/iter43 specs: 39 quoting engines, 0 imports of PipelineRegistryBridge before this commit. New engine: mcp-server/src/engines/QuotingMaterialBridgeEngine.ts (188 LOC). Wraps PipelineRegistryBridge::resolveMaterial + adds the cost-relevant derived values quoting needs: ISO-group → USD/kg defaults (2024 commodity-spot averages from MetalBulletin/AluminumNow/USGS, P=1.20/M=4.50/K=1.20/N=5.00/S=32/H=8 — wire MarketMaterialPricingEngine for live spot pricing); buy-to-fly factors per ISO (P=2.0/M=2.5/K=2.0/N=3.0/S=4.5/H=2.2); volume_cm3 × density_kg_m3 × 1e-6 → finished_weight_kg → stock_weight_kg = finished × buy_to_fly → estimated_material_spend_usd. Multiplicative confidence chain (context × cost-source). Override-beats-default for usd_per_kg + buy_to_fly. Fail-soft per PipelineRegistryBridge contract — never throws. 12 vitest tests PASS in 444ms (mocked resolveMaterial). Real reference values: Al 6061 at 250cm³ = 0.675kg finished × 3.0 b2f = 2.025kg stock × 5.00 = 10.13 USD. Inconel 718 at 100cm³ = 0.819kg × 4.5 b2f × 32 = 117.94 USD. Steel 1018 at 500cm³ × 7850 × 2.0 b2f × 1.20 = 9.42 USD. Per-ISO-group bracket physics-reality verified (S > N > P, b2f S > N > P). Adversarial: volume_cm3=0/NaN → null spend; usd_per_kg_override<=0 → falls back to ISO default. ZERO behavior change to existing 39 quoting engines — adoption is opt-in via import. Next: U-QP-BOOTSTRAP-REAL-DEFAULTS (modify quoting-baseline-bootstrap.mjs to consume the same lookups for training-data symmetry).

**Shipped:** 2026-05-26T15:40:04-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[quoting-synergy-ms0-u-qp-bridge-material-wire]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._