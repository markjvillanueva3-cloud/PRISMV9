---
id: "nx-049"
title: "VBM Core Roughing for Boss and Island Features"
source: "web:siemens-nx-docs"
confidence: 82
category: "cam_strategy"
tags: ["siemens-nx", "vbm", "core-roughing", "island-cleanup", "bosses"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.361Z
---

# VBM Core Roughing for Boss and Island Features

When roughing around bosses and islands in VBM, enable Island Cleanup to generate additional passes that machine material between closely spaced islands. Without this setting, NX's standard offset pattern may leave uncut webs between features narrower than one tool diameter. Combine with a smaller cleanup tool to reach tight inter-island gaps that the main roughing tool cannot enter.

**Category:** cam_strategy
**Confidence:** 82
**Source:** web:siemens-nx-docs
**Operations:** roughing, 2.5-axis

## Related
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
- [[nx-cam-tips-ext-nx-045|VBM Rest Material Detection with Smaller Tool Reference]]
- [[nx-cam-tips-ext-nx-046|VBM Adaptive Step-Over for Non-Uniform Pockets]]
- [[nx-cam-tips-ext-nx-047|VBM Multiple Cut Level Strategies for Stepped Features]]
