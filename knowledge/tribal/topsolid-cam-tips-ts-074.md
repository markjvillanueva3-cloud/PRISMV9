---
id: "ts-074"
title: "Cutting Data Per Material for Automatic Speed/Feed"
source: "web:topsolid-cutdata"
confidence: 91
category: "cam_strategy"
tags: ["cutting-data", "speeds-feeds", "material", "automatic"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.442Z
---

# Cutting Data Per Material for Automatic Speed/Feed

TopSolid's tool library stores cutting data (speed, feed, depth of cut, stepover) per material type for each tool. When you assign a tool to an operation and specify the workpiece material, TopSolid automatically populates the recommended cutting parameters. Maintain these databases from manufacturer recommendations and refine with shop-floor experience. Create material groups (mild steel, stainless, aluminum, titanium, Inconel) with sub-grades for precise parameter selection.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-cutdata
**Operations:** general

## Related
- [[camworks-cam-tips-cw-022|TechDB Material-Specific Settings — Hardness-Dependent Cutting Parameters]]
- [[worknc-cam-tips-wnc-077|Cutting Data Database Stores Material-Specific Parameters]]
- [[bobcad-cam-tips-bc-095|Cutting Data per Material for Auto-Population]]
- [[camworks-cam-tips-cw-016|Feed/Speed Defaults — Material-Specific Cutting Data in TechDB]]
- [[gibbscam-cam-tips-gc-093|Tool library centralizes cutting data for company-wide consistency]]
