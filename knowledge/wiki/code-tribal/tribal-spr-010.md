---
name: tribal-spr-010
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["swiss-type", "multi-channel", "guide-bushing", "synchronization"]
confidence: 0
source: "web:sprutcam-docs"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-010.md
promoted_at: 2026-06-09T22:31:16.621Z
---

# Swiss-Type Multi-Channel Programming

SprutCAM supports multi-channel Swiss-type lathes with guide bushing. Define channels for: main spindle OD turning, cross-drilling, sub-spindle back-working. Use 'Channel Synchronization' to overlap operations: while the main spindle roughs OD, the cross-drill can work simultaneously. Set guide bushing Z-offset correctly — all Z-references are from the guide bushing face, not the chuck.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:sprutcam-docs
**Operations:** turning

## Related
- [[camworks-cam-tips-cw-166|Swiss-Type Simultaneous Operations — Overlapped Milling and Turning]]
- [[esprit-cam-tips-esp-046|Overlapping Operations in Multi-Channel Programming]]
- [[esprit-cam-tips-esp-129|Swiss-Type Multi-Channel Synchronization with SyncChart]]
- [[bobcad-cam-tips-bc-167|BobCAD Swiss-Type Lathe Programming with Guide Bushing]]
- [[bobcad-cam-tips-bc-171|BobCAD Swiss-Type Thread Whirling for Medical Screws]]
