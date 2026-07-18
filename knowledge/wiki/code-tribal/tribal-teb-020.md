---
name: tribal-teb-020
category: code-tribal
subdomain: roughing
domain: tribal-knowledge
tags: ["stock-allowance", "variable", "surface-specific"]
confidence: 88
source: "web:tebis-tutorials"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-020.md
promoted_at: 2026-06-09T22:31:16.711Z
---

# Stock Allowance Varies by Feature for Optimal Semi-Finishing

Set different stock allowances on different surfaces within the same roughing NCJob. Flat bottom surfaces need less allowance (0.3mm) since they will be face-milled. Curved surfaces need more (0.5-0.8mm) to account for the stairstep effect of level roughing. Vertical walls need moderate allowance (0.3-0.5mm). Use the surface-specific stock option in the NCJob parameters. This reduces semi-finishing time by producing more uniform stock distribution.

**Category:** roughing
**Confidence:** 88
**Source:** web:tebis-tutorials
**Operations:** roughing

## Related
- [[camworks-cam-tips-cw-142|TBM Automatic Stock Allowance from Tolerance Analysis]]
- [[catia-cam-tips-cat-209|Process Variability Buffer in CATIA Stock Allowance Settings]]
- [[powermill-cam-tips-pm-005|Offset Area Clear Thickness Settings for Multi-Stage]]
- [[surfcam-cam-tips-sc2-096|Reaming with Controlled Feed and Speed for Accuracy]]
- [[powermill-cam-tips-pm-161|Wiener Process for Stochastic Wear Modeling]]
