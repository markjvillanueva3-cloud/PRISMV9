---
schema: ideablock-v1
title: "Shop-floor spindle/feed override — when the operator dial and the adaptive loop disagree"
domain: "Shop-floor live machining control"
category: shopfloor-adaptive
version_state: Current
confidence: 0.9
cluster_size: 1
canonical_sha256: authored-2026-06-09-bravo
sources:
  - "PRISM AdaptiveOverrideEngine (mcp-server/src/engines/AdaptiveOverrideEngine.ts) — intelligent feed/speed override control"
  - "PRISM AdaptiveSpindleControlEngine — real-time spindle speed adaptation"
  - "Machinery's Handbook 31e — surface speed / constant-SFM control"
extracted_via: human-authored
extracted_at: 2026-06-09T00:00:00Z
authored_by: bravo (slot:bravo, U-GALAXY-SHOPFLOOR-TRIBAL)
galaxy: shop-floor
---

## Question
The machine has a manual feed/speed override dial AND PRISM's adaptive override running. Which wins, and how do you avoid them fighting?

## Answer
Treat the manual dial as an OUTER bound and the adaptive loop as the INNER controller. `AdaptiveOverrideEngine` should never command above the operator's posted ceiling — the dial is a safety/comfort limit the operator owns, and silently exceeding it destroys trust (and can exceed what the setup was proven for). Inside that ceiling, the adaptive loop modulates feed/speed on measured load. The failure mode is two controllers chasing the same variable: if the operator winds the dial down to 60% while the adaptive loop is also cutting feed for load, the effects MULTIPLY and the cut stalls/rubs. Fix: the adaptive command is expressed as a fraction of the *operator-allowed* envelope, not of the programmed value — so 60% dial × adaptive means "60% is the new 100% the loop works within." `AdaptiveSpindleControlEngine` adapts RPM for constant SFM on tapering diameters; keep its authority separate from the feed loop so a speed change doesn't get mis-read as a load event by the feed PID.
