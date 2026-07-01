---
name: mill-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the mill galaxy (CNC milling — chip mechanics, smart machining, toolpath optimization). 4 fetched sources. PHYSICS-SAFE (method/standards/theory only, NO cutting constants). FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: mill
  tier: VERIFIED
  verifiedBy: WebFetch
  physicsSafe: true
---

# mill galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source WebFetched + excerpted. **PHYSICS-SAFE: no numeric cutting constant appears** — methods/standards/theory only; numeric values stay owner-gated in `src/physics/constants.ts`.

## Synthesis
Four verified pillars. **Boothroyd & Knight** (canonical machining textbook) — rigorous mechanics of chip formation, undeformed chip thickness, orthogonal/oblique cutting models, cutting-force decomposition (tangential/feed/radial), tool geometry (rake/relief/edge-radius), and milling chip-load derivation from feed-per-tooth × instantaneous immersion angle. This is the *theoretical ground truth* for Kienzle-style force modeling + Merchant-circle analysis. **NIST smart machining** — government-validated architecture for adaptive feed control, in-process spindle power/force monitoring, tool condition monitoring, and closed-loop NC correction without stopping the cut. **Poisson-formulation toolpath** (Zou et al., arXiv 2009.02660) — globally optimal simultaneous feed-direction + constant-scallop-height optimization on freeform surfaces. **NIST AIMS** — in-process metrology, spindle health, thermal compensation, and STEP-NC (ISO 14649) interoperability for feature-based NC.

## Verified sources
### [Fundamentals of Metal Machining and Machine Tools, 3rd Ed. (Boothroyd & Knight)](https://books.google.com/books/about/Fundamentals_of_Metal_Machining_and_Mach.html?id=N6xH3VlG78YC) — textbook
> "coverage of chip formation, cutting force, milling, shear stress, rake angle, and orthogonal cutting"

**Knowledge:** Theoretical foundation for chip geometry, undeformed chip thickness, orthogonal/oblique cutting, force decomposition, tool geometry, and milling chip-load — the reference behind Kienzle-style force modeling + Merchant-circle analysis.

### [Smart Machining Research at NIST](https://www.nist.gov/publications/smart-machining-research-national-institute-standards-and-technology) — report
> "Machining processes, such as milling and turning, are a critical infrastructural competence..."

**Knowledge:** Adaptive feed-rate control, in-process spindle power/force monitoring, tool condition monitoring, workpiece metrology feedback, closed-loop NC correction — sensor-fusion architectures for detecting wear/chatter mid-cut.

### [Length-optimal tool path planning for freeform surfaces with preferred feed directions](https://arxiv.org/abs/2009.02660) — paper
> "the optimal tradeoff between the preferred feed direction field and the constant scallop height, and yields a minimized overall path length."

**Knowledge:** Poisson-problem formulation simultaneously optimizing feed direction + constant scallop height → globally optimal path length, no singularities/self-intersections; handles parametric surfaces and triangle meshes. For PRISM's 3D finishing strategy engine.

### [NIST Advanced Manufacturing — Machining and Metrology (AIMS)](https://www.nist.gov/machining) — report
> "NIST AIMS... addresses spindle monitoring, machine tool metrology, and sensor integration for adaptive machining control."

**Knowledge:** In-process machine-tool measurement, spindle health monitoring, thermal compensation, standards-based metrology feedback — for embedding in-cycle probing / on-machine gauging into toolpath strategies (closed-loop dimensional correction without secondary CMM). Also STEP-NC (ISO 14649) interoperability.

---
_Physics-safety: no numeric cutting constant (kc1.1, Taylor C/n, SFM, IPR, chip-load, feed, RPM, force values) appears above — methods/standards/theory only. CIRP Annals / IJMTM / JMSE pages returned HTTP 403; no excerpts cited from them (R12)._
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_e5e4f08d-e05). Ledger: state/shared/galaxy-knowledge-iterations.json._
