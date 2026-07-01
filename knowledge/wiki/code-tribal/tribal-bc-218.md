---
name: tribal-bc-218
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["reliability-growth", "amsaa", "program-maturity", "failure-tracking", "spc"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-218.md
promoted_at: 2026-06-09T22:31:15.986Z
---

# Reliability Growth Tracking for BobCAD Program Maturity

Track the reliability growth of BobCAD programs using the AMSAA (Army Materiel Systems Analysis Activity) model. Plot cumulative failures (tool breaks, scrap parts, program stops) vs cumulative production quantity on log-log axes. The reliability growth rate β in the AMSAA model indicates whether the program is improving (β>1), constant (β=1), or degrading (β<1). Each program revision that fixes an issue should increase β. Target β>1.3 during the first 50 parts (program maturation period). Once β stabilizes near 1.0, the program is mature and the failure rate is constant — switch to standard SPC monitoring.

**Category:** quality
**Confidence:** 0.81
**Source:** web:bobcad-docs
**Operations:** roughing, finishing

## Related
- [[cimatron-cam-tips-cim-121|AMSAA Reliability Growth for Program Maturity]]
- [[powermill-cam-tips-pm-114|AMSAA Reliability Growth Tracking]]
- [[sprutcam-cam-tips-spr-091|Reliability Growth Tracking with AMSAA Model]]
- [[sprutcam-cam-tips-spr-118|AMSAA for Program Maturity Assessment]]
- [[tebis-cam-tips-teb-115|AMSAA Reliability Growth for Program Maturity Tracking]]
