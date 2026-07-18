---
name: tribal-cw-196
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "probing", "first-part", "verification", "automation"]
confidence: 90
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-196.md
promoted_at: 2026-05-26T16:07:20.015Z
---

# Automated Probing Cycles — First-Part Verification Before Production

Program probing cycles in CAMWorks to verify the first machined part before running the production batch. Probe critical dimensions (bores, faces, positions) and compare against tolerances. If within spec, the program continues automatically to the next part. If out of spec, the program halts and displays the deviation on the controller screen. This automated verification catches setup errors, wrong tools, and programming mistakes before they produce a batch of scrap parts. Include probing after every tool change for the first part to verify each tool individually.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** probing

## Related
- [[camworks-cam-tips-cw-115|Setup Probing — Automatic Work Coordinate Establishment]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-119|Verification Probing — Final Part Inspection On-Machine]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-013|TechDB Knowledge-Based Machining — Capture Best Practices for Reuse]]
