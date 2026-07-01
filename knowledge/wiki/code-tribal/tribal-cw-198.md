---
name: tribal-cw-198
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "probing", "stock-verification", "raw-material", "safety"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-198.md
promoted_at: 2026-06-09T22:31:16.030Z
---

# Stock Verification Probing — Confirm Raw Material Before Machining

Program a stock verification probing cycle as the first operation. The probe touches the top surface, side faces, and corner of the raw stock to verify: (1) stock is present and correct material (no empty fixture), (2) stock dimensions match expected values (±1-2mm for castings, ±0.5mm for precision stock), (3) stock is properly seated in the fixture (no tilt or shift). If stock dimensions are out of range, the program halts before any cutting occurs. This prevents scrapping a part because the stock was wrong — which is especially costly for expensive materials.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** probing

## Related
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[surfcam-cam-tips-sc2-206|SURFCAM Stock Verification Probing Between Operations]]
- [[camworks-cam-tips-cw-053|5-Axis Collision Avoidance — Automatic Tool Tilting Around Obstacles]]
- [[camworks-cam-tips-cw-115|Setup Probing — Automatic Work Coordinate Establishment]]
- [[camworks-cam-tips-cw-117|In-Process Inspection — Verify Critical Dimensions Mid-Program]]
