---
name: tribal-sc-108
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "coordsys", "automation", "origin", "multi-setup"]
confidence: 87
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-108.md
promoted_at: 2026-06-09T22:31:16.595Z
---

# Coordinate System Automation — Auto-Detect Machining Origins from Model

Use SolidCAM's CoordSys auto-detection to place machining origins at standard locations (top center, corner, cylindrical center) based on part geometry. For parts with multiple setups, define all CoordSys definitions before creating operations — each operation references a specific CoordSys, and changing it later requires re-selecting all geometry references. Name CoordSys entries with the setup and fixture description (e.g., 'OP10_VISE_TOP' or 'OP20_FIXTURE_BORE') for clarity in multi-setup projects.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:solidcam-docs
**Operations:** setup, workflow

## Related
- [[solidcam-cam-tips-sc-107|Operation Templates — Save Proven Process Sequences for Reuse]]
- [[solidcam-cam-tips-sc-109|AFRM Feature Recognition — Automatic Pocket and Hole Detection]]
- [[solidcam-cam-tips-sc-110|Batch Processing — Post-Process Multiple Parts Unattended]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
