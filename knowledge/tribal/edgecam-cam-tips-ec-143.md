---
id: "ec-143"
title: "Code Wizard Event-Driven Post Processor Architecture"
source: "web:edgecam-docs"
confidence: 0.87
category: "post_processing"
tags: ["code-wizard", "post-processor", "events", "architecture"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.378Z
---

# Code Wizard Event-Driven Post Processor Architecture

Edgecam Code Wizard uses an event-driven architecture where each CNC operation triggers events (ToolChange, RapidMove, LinearFeed, ArcFeed, CycleStart, etc.). Customize output by modifying event handlers — add custom G/M codes, reformatting, or conditional logic. The event sequence mirrors the toolpath: ProgramStart → ToolChange → SpindleOn → approach moves → cutting moves → retract → ToolChange → ProgramEnd.

**Category:** post_processing
**Confidence:** 0.87
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[edgecam-cam-tips-ec-074|Code Wizard for Custom Post Processor Creation]]
- [[surfcam-cam-tips-sc2-209|SURFCAM Post Processor Architecture and Customization Points]]
- [[edgecam-cam-tips-ec-144|Code Wizard Variable System for Machine-Specific Output]]
- [[edgecam-cam-tips-ec-145|Code Wizard Multi-Channel Output for Mill-Turn]]
- [[edgecam-cam-tips-ec-146|Code Wizard Macro Sub-Program Calls for Canned Cycles]]
