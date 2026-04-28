---
id: "f360-165"
title: "Setup Sheet Generation and Customization"
source: "web:fusion360-docs"
confidence: 0.88
category: "automation"
tags: ["fusion360", "setup-sheet", "documentation", "html-template", "job-traveler"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.759Z
---

# Setup Sheet Generation and Customization

Generate setup sheets from Fusion's Manufacturing workspace: right-click the Setup > Create Setup Sheet. The default template includes part rendering, tool list, operation sequence, and coordinate system location. Customize the template by editing the setup-sheet HTML template (found in the Post Processor configuration folder) to include your company logo, specific instructions format, and QC checkpoints. Critical fields to include: WCS origin location with photo reference, tool stickout measurements, critical dimensions to verify after first part, and torque specifications for fixture bolts. Export as PDF and attach to the job traveler.

**Category:** automation
**Confidence:** 0.88
**Source:** web:fusion360-docs
**Operations:** general

## Related
- [[camworks-cam-tips-cw-149|ShopFloor Setup Sheet Generation — Automated Documentation]]
- [[cimatron-cam-tips-cim-082|Setup Sheet Generation from Cimatron]]
- [[edgecam-cam-tips-ec-147|Code Wizard Tool List and Setup Sheet Generation]]
- [[gibbscam-cam-tips-gc-126|GibbsCAM 14 supports direct PDF-based setup sheet generation with embedded screenshots]]
- [[mastercam-cam-tips-mc-220|Setup sheet creation in Mastercam documents fixture, tool, and origin information for operators]]
