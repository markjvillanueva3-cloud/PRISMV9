---
name: tribal-teb-001
category: code-tribal
subdomain: mold_die
domain: tribal-knowledge
tags: ["ncjob", "mold", "die", "process-chain"]
confidence: 92
source: "web:tebis-docs"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-001.md
promoted_at: 2026-05-26T16:07:20.595Z
---

# NCJob Manager Chains Operations for Complete Mold Machining

Tebis NCJob Manager organizes all machining operations for a mold or die in a structured tree. Define roughing, semi-finishing, and finishing as sequential NCJobs with automatic stock transfer between them. Each NCJob inherits the remaining stock from the previous operation, eliminating air cuts. For large molds, group NCJobs by region (core, cavity, slides) to enable parallel machine scheduling.

**Category:** mold_die
**Confidence:** 92
**Source:** web:tebis-docs
**Operations:** roughing, finishing, semi_finishing

## Related
- [[hypermill-cam-tips-ext-hm-142|NCJob Templates for Standardized Programming]]
- [[tebis-cam-tips-teb-074|Tebis NCJob Templates for Standardized Workflows]]
- [[camworks-cam-tips-cw-123|Hardened Steel Machining — CBN/Ceramic Tooling with Light Cuts]]
- [[catia-cam-tips-cat-046|Core Roughing for Tall Thin Features Requires Outside-In Strategy]]
- [[catia-cam-tips-cat-143|Surface Machining Multi-Surface Part Management with Check Surfaces]]
