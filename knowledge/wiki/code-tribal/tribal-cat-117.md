---
name: tribal-cat-117
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "deep-hole", "gun-drill", "through-coolant", "drilling"]
confidence: 87
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-117.md
promoted_at: 2026-06-09T22:31:16.057Z
---

# Deep Hole Drilling Beyond 10xD Requires Gun Drill Strategy

For holes deeper than 10x diameter in CATIA, switch from twist drill peck cycles to gun drilling (single-lip drill with through-coolant). Define the gun drill in the CATIA tool catalog with the correct flute geometry (single flute, V-shaped chip groove). Program a pilot hole to 2xD depth with a twist drill first, then the gun drill operation with continuous feed (no pecking) at 0.01-0.03mm/rev. CATIA's deep-hole drilling cycle handles the slow entry feed (50% for the first 1xD) and the transition to full feed automatically.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:catia-docs
**Operations:** drilling

## Related
- [[catia-cam-tips-cat-112|Peck Drilling Cycle Configuration for Deep Holes]]
- [[edgecam-cam-tips-ec-101|Deep Hole Drilling with Gun Drill Support]]
- [[esprit-cam-tips-esp-084|Deep Hole Drilling with Gun Drill Strategy]]
- [[catia-cam-tips-cat-042|Axial Operations Center Drill Before Deep Hole Drilling]]
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
