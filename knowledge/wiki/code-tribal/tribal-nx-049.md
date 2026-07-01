---
name: tribal-nx-049
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["siemens-nx", "vbm", "core-roughing", "island-cleanup", "bosses"]
confidence: 82
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-049.md
promoted_at: 2026-06-09T22:31:16.474Z
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
