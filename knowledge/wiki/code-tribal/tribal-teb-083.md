---
name: tribal-teb-083
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["virtual-machine", "kinematics", "post-processor", "configuration"]
confidence: 86
source: "web:tebis-docs"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-083.md
promoted_at: 2026-06-09T22:31:16.724Z
---

# Virtual Machine Configuration for Post Processing

Tebis virtual machines define the exact kinematic model of each shop floor machine. Configure: axis types (linear/rotary), travel limits, home positions, and collision bodies. The virtual machine drives both simulation accuracy and post-processor output. When a new machine is installed, request the virtual machine file from Tebis or create one using Machine Builder with the machine's specification sheet.

**Category:** setup
**Confidence:** 86
**Source:** web:tebis-docs
**Operations:** setup

## Related
- [[fusion360-cam-tips-ext-f360-081|Machine Configuration Ties Post to Kinematic Model]]
- [[fusion360-cam-tips-ext-f360-158|Custom Machine Configuration for Non-Standard Kinematics]]
- [[gibbscam-cam-tips-gc-077|Multi-axis post processors handle rotary axis output and RTCP compensation]]
- [[sprutcam-cam-tips-spr-002|Machine Setup Wizard for Kinematic Configuration]]
- [[camworks-cam-tips-cw-086|Multi-Axis Post Processors — Handle Rotary Axis Output Correctly]]
