---
name: tribal-cw-166
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "swiss-type", "simultaneous", "synchronization", "multi-channel"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-166.md
promoted_at: 2026-06-09T22:31:16.022Z
---

# Swiss-Type Simultaneous Operations — Overlapped Milling and Turning

Swiss-type machines have multiple tool posts and cross spindles that can operate simultaneously. CAMWorks programs these as synchronized channels: main spindle turning while cross drill is milling, or OD turning overlapped with ID boring on sub-spindle parts. Define channel assignments in the machine definition and use the 'Sync' operation to coordinate timing between channels. Key rule: never program two operations on the same tool post simultaneously — that's a mechanical impossibility that will crash the machine.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** turning, milling

## Related
- [[esprit-cam-tips-esp-046|Overlapping Operations in Multi-Channel Programming]]
- [[esprit-cam-tips-esp-129|Swiss-Type Multi-Channel Synchronization with SyncChart]]
- [[sprutcam-cam-tips-spr-010|Swiss-Type Multi-Channel Programming]]
- [[camworks-cam-tips-cw-019|TechDB Synchronization — Share Across Networked Workstations]]
- [[camworks-cam-tips-cw-045|Simultaneous 5-Axis — Continuous Tool Orientation for Complex Surfaces]]
