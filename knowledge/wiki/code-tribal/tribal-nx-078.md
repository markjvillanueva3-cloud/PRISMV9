---
name: tribal-nx-078
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["siemens-nx", "thread-cutting", "pmi", "pitch-extraction", "turning"]
confidence: 85
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-078.md
promoted_at: 2026-06-09T22:31:16.481Z
---

# Thread Cutting with Automatic Pitch Extraction from PMI

NX turning automatically extracts thread pitch, major diameter, and class from PMI annotations or thread features in the 3D model. Verify the extracted values in the Thread Turning dialog because imperial-to-metric conversions can introduce rounding errors on pitch. For multi-start threads, manually set the number of starts as NX does not auto-detect this from most 3D thread features. Always simulate the thread infeed path — constant infeed versus modified flank infeed affects chip formation significantly.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:siemens-nx-docs
**Operations:** turning, threading

## Related
- [[nx-cam-tips-ext-nx-083|FBM Automatic Feature Recognition with PMI-Driven Tolerances]]
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
- [[nx-cam-tips-ext-nx-045|VBM Rest Material Detection with Smaller Tool Reference]]
- [[nx-cam-tips-ext-nx-046|VBM Adaptive Step-Over for Non-Uniform Pockets]]
