---
name: tribal-cat-046
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "core-roughing", "outside-in", "mold", "deflection"]
confidence: 86
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-046.md
promoted_at: 2026-06-09T22:31:16.041Z
---

# Core Roughing for Tall Thin Features Requires Outside-In Strategy

When roughing tall core features (mold cores, bosses) in CATIA, use an outside-in strategy that removes material around the core progressively. Start with a full-depth Z-level approach using a stepover of 50-60% tool diameter. For cores taller than 3xD, reduce stepover to 30-40% on the final radial passes nearest the core wall to minimize deflection forces. Leave 1-2mm stock on the core walls and finish with a spring pass strategy.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:catia-docs
**Operations:** roughing

## Related
- [[catia-cam-tips-cat-143|Surface Machining Multi-Surface Part Management with Check Surfaces]]
- [[catia-cam-tips-cat-191|Core/Cavity Split Surface Machining Strategy in CATIA]]
- [[catia-cam-tips-cat-192|Electrode Design and Machining Integration in CATIA]]
- [[catia-cam-tips-cat-193|Runner and Gate Machining with Specialized CATIA Operations]]
- [[catia-cam-tips-cat-195|Mold Texture Surface Machining with High-Density Tool Paths]]
