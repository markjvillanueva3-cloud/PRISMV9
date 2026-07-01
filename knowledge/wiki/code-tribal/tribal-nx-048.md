---
name: tribal-nx-048
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["siemens-nx", "vbm", "stock-offset", "wall-floor", "finishing-allowance"]
confidence: 86
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-048.md
promoted_at: 2026-06-09T22:31:16.473Z
---

# VBM Roughing to Finish Stock with Profile Stock Offset

Set separate Part Side Stock and Part Floor Stock values in VBM roughing to leave different allowances for walls versus floors. A common practice is 0.3 mm on walls and 0.15 mm on floors because finishing tools engage differently on vertical and horizontal surfaces. NX applies these offsets to the IPW calculation so downstream semi-finish and finish operations inherit correct stock geometry.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:siemens-nx-docs
**Operations:** roughing, 2.5-axis

## Related
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
- [[nx-cam-tips-ext-nx-045|VBM Rest Material Detection with Smaller Tool Reference]]
- [[nx-cam-tips-ext-nx-046|VBM Adaptive Step-Over for Non-Uniform Pockets]]
- [[nx-cam-tips-ext-nx-047|VBM Multiple Cut Level Strategies for Stepped Features]]
