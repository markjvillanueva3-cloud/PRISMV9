---
name: tribal-gc-013
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "pencil-trace", "3d", "finishing", "fillet", "cleanup"]
confidence: 87
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-013.md
promoted_at: 2026-06-09T22:31:16.314Z
---

# Pencil tracing automatically targets concave fillet intersections

GibbsCAM's pencil trace strategy detects concave edges where surfaces meet and generates targeted passes along these fillets. This eliminates leftover material in inside corners that larger tools cannot reach. Set the 'Offset Number' to control how many parallel passes are generated adjacent to the fillet (typically 1-3). Use this after Z-level or scallop finishing to clean up only the corners rather than re-machining entire surfaces—reduces finishing cycle time by 20-35% compared to running a full-surface strategy with a smaller tool.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-019|Cleanup passes with tapered ball nose reach deep narrow fillets]]
- [[gibbscam-cam-tips-gc-011|Z-level finishing excels on steep walls with constant scallop height]]
- [[gibbscam-cam-tips-gc-012|Flowline finishing follows UV direction for natural surface-aligned passes]]
- [[gibbscam-cam-tips-gc-015|Scallop height strategy maintains constant cusp height across varying slopes]]
- [[gibbscam-cam-tips-gc-016|Spiral machining eliminates retract moves for continuous engagement]]
