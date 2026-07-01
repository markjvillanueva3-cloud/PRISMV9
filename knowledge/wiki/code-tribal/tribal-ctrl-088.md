---
name: tribal-ctrl-088
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "haas", "HSM", "G187", "surface-finish", "accuracy"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-088.md
promoted_at: 2026-06-09T22:31:16.153Z
---

# Haas G187 accuracy/speed control for HSM

G187 controls the trade-off between accuracy and speed on Haas NGC machines. P1=rough (fastest, least accurate), P2=medium, P3=finish (slowest, most accurate). E value sets custom tolerance in inches (e.g., E0.0005). For HSM: use G187 P1 E0.005 for roughing (max MRR), G187 P3 E0.0002 for finishing (best surface). G187 dramatically affects 3D surface quality — forgetting to switch from P1 to P3 before finishing is a common cause of poor surface finish on Haas machines. G187 is modal and persists until changed or reset.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-082|TNC 640 Cycle 32 TOLERANCE for HSM optimization]]
- [[controller-knowledge-tips-ctrl-097|Okuma Super-NURBS for high-speed curved surface machining]]
- [[controller-knowledge-tips-ctrl-099|Hurco UltiMotion — 10,000-block look-ahead for HSM]]
- [[controller-knowledge-tips-ctrl-102|Makino SGI.5 — high-speed micro-block processing for mold finishing]]
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
