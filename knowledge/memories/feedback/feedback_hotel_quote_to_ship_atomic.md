---
name: feedback_hotel_quote_to_ship_atomic
description: quote_to_ship_run is the canonical orchestrator; never partial-update the chain
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.429Z
aliases: feedback_hotel_quote_to_ship_atomic
---


quote_to_ship_run is THE canonical accepted-quote -> order -> work-order -> traveler -> invoice -> GL orchestrator. Never partial-update the chain.

**Why:** a half-applied run leaves orphan work-orders + broken AR; hotel soul refuse #3 (silent financial clobber).

**How to apply:** validate end-to-end or roll back; do not hand-chain the steps through individual dispatcher actions.
