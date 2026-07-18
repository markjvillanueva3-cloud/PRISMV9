---
type: tribal-consolidation
topic: speeds
iso_week: 2026-24
cluster_size: 3
cluster_size_synthesized: 3
aggregate_confidence: 87.7
tags: ["chip-load", "rubbing", "minimum-feed", "tool-wear", "carbide", "chip-thinning", "radial-engagement", "hsm"]
materials: ["P", "M", "K", "N", "S"]
operations: ["hsm"]
_consolidatedAt: 2026-06-09T06:33:51.702Z
epistemic_only: true
consumed_by_machining: false
milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
---
# Tribal: speeds — 2026-24

_3 tips clustered on 'speeds' with mean confidence 87.7/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._

## Top Tips (3)

### 1. Never let chip load drop below 0.004" — rubbing destroys tools

- **id:** `TK-DL-cnc-006` · **confidence:** 90/100 · **usage:** 0
- **source:** document:cnc-feeds-speeds-guide@ch5
- **tags:** chip-load, rubbing, minimum-feed, tool-wear, carbide

Minimum chip load threshold for carbide end mills is approximately 0.004" (0.1mm) per tooth. Below this, the tool rubs instead of cutting, generating excessive heat and accelerating wear. This is the #1 cause of premature tool failure in ho…

### 2. Chip thinning with radial engagement <50%: increase feed to maintain chip load

- **id:** `TK-DL-cnc-020` · **confidence:** 88/100 · **usage:** 0
- **source:** document:cnc-feeds-speeds-guide@ch6
- **tags:** chip-thinning, radial-engagement, hsm, feed-rate, stepover, operation:hsm

When radial engagement (stepover/tool diameter) drops below 50%, the actual chip thickness is less than the programmed feed per tooth due to geometry. At 25% radial engagement, actual chip is ~71% of programmed. At 10%, it's ~45%. Increase …

### 3. HSS surface speed table: Al 250, Brass 200, Mild Steel 110, Stainless 30 SFM

- **id:** `TK-DL-cnc-005` · **confidence:** 85/100 · **usage:** 0
- **source:** document:cnc-feeds-speeds-guide@ch3
- **tags:** sfm, hss, surface-speed, material, baseline, material:P

HSS baseline surface speeds (SFM): Aluminum 6061=250, Brass=200, Bronze=100, Cast Iron=80, Mild Steel (1018)=110, Alloy Steel (4140)=80, Tool Steel (D2)=60, Stainless 303=45, Stainless 316=30, Titanium 6Al-4V=50. Carbide tooling runs 3-4× t…

## Common Threads

Top tags across the cluster: `chip-load`, `rubbing`, `minimum-feed`, `tool-wear`, `carbide`, `chip-thinning`, `radial-engagement`, `hsm`.

## Sources Cited

- document:cnc-feeds-speeds-guide@ch5 (1)
- document:cnc-feeds-speeds-guide@ch6 (1)
- document:cnc-feeds-speeds-guide@ch3 (1)

## Citations

- [[TK-DL-cnc-006]]
- [[TK-DL-cnc-020]]
- [[TK-DL-cnc-005]]

