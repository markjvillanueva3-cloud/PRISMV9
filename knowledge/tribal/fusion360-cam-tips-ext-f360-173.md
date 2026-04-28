---
id: "f360-173"
title: "Script for Feeds and Speeds Optimization from Cut Data"
source: "web:autodesk-forum"
confidence: 0.79
category: "speeds_feeds"
tags: ["fusion360", "api", "optimization", "spindle-load", "mtconnect"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.765Z
---

# Script for Feeds and Speeds Optimization from Cut Data

Create a Python script that reads cutting force data from your machine's MTConnect feed and adjusts Fusion operation parameters. The script compares actual spindle load (%) against the target (60-75% for roughing, 30-50% for finishing) and calculates adjusted feed rates. If spindle load is consistently at 40% during roughing, the script increases the feed rate by (target/actual) ratio. Store the optimized parameters in a JSON file keyed by material-tool-operation, then apply them to future programs using the Manufacturing API's setParameter() method. This creates a continuously improving feeds/speeds database based on actual machine performance.

**Category:** speeds_feeds
**Confidence:** 0.79
**Source:** web:autodesk-forum
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-161|Digital Twin Synchronization with Machine Status]]
- [[fusion360-cam-tips-ext-f360-169|Python Script for Batch Toolpath Generation]]
- [[fusion360-cam-tips-ext-f360-170|Automated Post-Processing Script for Multiple Machines]]
- [[fusion360-cam-tips-ext-f360-172|API-Driven Tool Selection Based on Feature Analysis]]
- [[fusion360-cam-tips-ext-f360-174|Event Handlers for Manufacturing Workflow Automation]]
