---
id: "ctrl-017"
title: "Siemens synchronized actions for real-time monitoring"
source: "controller:siemens_sync_actions"
confidence: 85
category: "programming"
tags: ["siemens", "synchronized-actions", "real-time", "monitoring", "safety"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.166Z
---

# Siemens synchronized actions for real-time monitoring

SINUMERIK synchronized actions run in parallel with the NC program in real-time. Syntax: ID=1 EVERY $AA_IM[Z] < -50 DO $AC_OVR=0 (stop feed if Z goes below -50). Use for: adaptive feed control based on spindle load, collision monitoring, automatic tool breakage detection. IDS (static sync actions) persist across program boundaries. Powerful for lights-out safety monitoring.

**Category:** programming
**Confidence:** 85
**Source:** controller:siemens_sync_actions

## Related
- [[controller-knowledge-tips-ctrl-080|SINUMERIK System Variables and Adaptive Machining]]
- [[controller-knowledge-tips-ctrl-072|Safety Integrated: SOS, SLS, SS1, SSM Functions]]
- [[edgecam-cam-tips-ec-211|Adaptive Feed Control with Spindle Load Monitoring]]
- [[nx-cam-tips-ext-nx-156|MTConnect Data Integration for Process Monitoring]]
- [[powermill-cam-tips-pm-141|MTConnect Data Integration]]
