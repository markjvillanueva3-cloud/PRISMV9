---
name: tribal-esp-137
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["swiss-type", "lfv", "vibration-cutting", "chip-breaking", "citizen"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-137.md
promoted_at: 2026-06-09T22:31:16.244Z
---

# Swiss-Type Low-Frequency Vibration Cutting for Chip Breaking

For gummy materials (304SS, copper, plastics) on Swiss-type lathes, enable ESPRIT's LFV (Low-Frequency Vibration) cutting support. LFV oscillates the Z-axis at a controlled frequency to create air gaps in the chip, breaking long stringy chips into manageable segments. In ESPRIT, activate LFV under Operation Properties → Advanced → Vibration Cutting. Set oscillation frequency (typically 0.5-2x spindle RPM) and amplitude (0.01-0.05mm). The post outputs Citizen's LFV G-codes (G460-G463) or Star's equivalent oscillation parameters.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:esprit-docs
**Operations:** turning_roughing, turning_finishing

## Related
- [[controller-knowledge-tips-ctrl-106|Citizen LFV low-frequency vibration cutting G-code control]]
- [[esprit-cam-tips-esp-047|Channel Programming for Citizen/Star/Tornos Swiss Machines]]
- [[esprit-cam-tips-esp-050|Part-Off Strategy with Chip Management]]
- [[esprit-cam-tips-esp-129|Swiss-Type Multi-Channel Synchronization with SyncChart]]
- [[esprit-cam-tips-esp-136|Swiss-Type Superimposed Axes for Complex Profiles]]
