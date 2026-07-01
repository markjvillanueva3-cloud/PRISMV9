---
name: tribal-f360-132
category: code-tribal
subdomain: speeds_feeds
domain: tribal-knowledge
tags: ["fusion360", "turning", "boring-bar", "deflection", "internal-turning"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-132.md
promoted_at: 2026-06-09T22:31:16.284Z
---

# Turning Boring Bar Deflection Compensation

For internal turning with boring bars at depth-to-diameter ratios above 3:1, compensate for bar deflection by programming 0.01-0.03mm additional stock removal on the finish pass. The boring bar deflects away from the cut, leaving excess material. Calculate deflection as delta = (F × L³) / (3 × E × I) where F is cutting force, L is overhang, E is Young's modulus (for carbide bars E=580 GPa, steel bars E=210 GPa). Reduce the feed rate to 50-60% of external turning values to reduce cutting force and thus deflection. Anti-vibration boring bars (with tuned mass dampers) allow 7:1 ratios.

**Category:** speeds_feeds
**Confidence:** 0.87
**Source:** web:fusion360-docs
**Operations:** turning_boring

## Related
- [[fusion360-cam-tips-ext-f360-074|Turning Roughing Profile with DOC Pattern Selection]]
- [[fusion360-cam-tips-ext-f360-075|Turning Face Operation with Constant Surface Speed]]
- [[fusion360-cam-tips-ext-f360-076|Grooving with Peck Cycle for Deep Narrow Slots]]
- [[fusion360-cam-tips-ext-f360-077|Single-Point Threading with Spring Passes]]
- [[fusion360-cam-tips-ext-f360-126|Turning Profile Roughing with Chip Breaking]]
