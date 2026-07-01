---
name: lathe-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the lathe galaxy (CNC turning — threading, CSS/G96/G50, hard-turning chip mechanics, process planning). 4 fetched + 1 unfetched source. PHYSICS-SAFE (method/standards/theory only). FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: lathe
  tier: VERIFIED
  verifiedBy: WebFetch
  physicsSafe: true
---

# lathe galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every fetched source excerpted. **PHYSICS-SAFE: no numeric cutting constant** — the G50 RPM-clamp reference is a machine-protection limit in method context; threading pitch examples were excluded from synthesis.

## Synthesis
Four complementary tiers. **Kinematics & geometry** — the Open Oregon threading chapter (single-point threading: 60° form-tool geometry, helix-pitch mechanics, spindle↔carriage synchronization defining pitch) + the Mt. Hood CSS chapter (G96 constant-surface-speed, G97 fixed-RPM, the G50 max-spindle clamp preventing runaway RPM at small diameter; the inverse diameter↔RPM relationship in facing/taper). **Cutting physics & surface integrity** — the NIST finish-hard-turning report grounds the domain in CBN tool wear, segmented-chip formation above a critical surface speed (as a function of DOC + rake angle), and chip-morphology↔surface-topography coupling. **Automated process planning** — Behandish et al. (arXiv 1905.09434) give a geometry-driven, feature-free cost model for sequencing facing/turning/boring/grooving (material-removal volume, feed, lathe hour-rate, tool-change cost) — directly for print-to-program. **Integrated curriculum** — MIT 2.008 links process physics → G-code lathe cycles → Mastercam Lathe planning → DFM.

## Verified sources
### [Unit 6: Lathe Threading — Manufacturing Processes 4-5 (Open Oregon)](https://openoregon.pressbooks.pub/manufacturingprocesses45/chapter/unit-6-lathe-threading/) — textbook
> "Thread cutting on the lathe... produces a helical ridge of uniform section... Install a 60 degree threading tool bit and set the height to the lathe center point."

**Knowledge:** Single-point threading geometry, helix-pitch mechanics, tool setup (60° form tool at center height), engagement sequencing, the spindle-rotation↔carriage-feed kinematic link defining thread pitch (internal + external, manual + CNC).

### [Chip Morphology, Tool Wear and Cutting Mechanics in Finish Hard Turning (NIST)](https://www.nist.gov/publications/chip-morphology-tool-wear-and-cutting-mechanics-finish-hard-turning-0) — report
> "Topography of surfaces produced in finish hard turning using cubic boron nitride (CBN) tools is affected by a large number of factors"

**Knowledge:** Relationship of chip morphology, CBN tool wear, and surface topography; segmented-chip formation above a critical surface speed (function of DOC + rake angle), and how segmentation spacing modulates the machined surface — foundational for surface integrity + vibration in hardened-material turning.

### [G96 Constant Surface Speed and G50 Speed Clamp (Mt. Hood CC)](https://mhcc.pressbooks.pub/supportcnc/chapter/constant-surface-speed/) — course
> "G96 controls the speed of the workpiece spindle on a CNC lathe. The G50 is a Speed Clamp for Constant Surface Speed (CSS). The G50 value limits the RPM of the CSS."

**Knowledge:** CSS (G96) vs fixed-RPM (G97), the G50 max-spindle clamp preventing runaway RPM at small diameter; inverse diameter↔spindle-speed relationship in facing/taper; the workholding/spindle-motor safety boundary on CSS.

### [Automated Process Planning for Turning: A Feature-Free Approach (arXiv 1905.09434)](https://arxiv.org/abs/1905.09434) — paper
> "A practical CNC process planner has to maximize the utilization of turning, not only to attain precision requirements for turnable surfaces..."

**Knowledge:** Behandish/Nelaturi/Verma/Allard — geometry-driven feature-free process planning; cost model in material-removal volume, feed, and lathe hour-rate adjusted for tool-change cost. For autonomous sequencing of facing/turning/boring/grooving without manual feature recognition.

### [Design and Manufacturing II (2.008) — MIT OCW](https://ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2004/) — course · NOT fetched
> _(no excerpt — page not fetched; cited as the canonical course, Spring 2025 release live)_

**Knowledge:** MIT 2.008 — CNC turning, process planning with Mastercam Lathe, G-code lathe-cycle structure, metal-cutting theory (chip formation, tool-workpiece interaction), surface-roughness prediction, DFM; lab machines a real part.

---
_Physics-safety: no numeric cutting constant appears; G50 reference is a machine-protection limit, threading-pitch numbers excluded from synthesis (R12)._
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_e5e4f08d-e05). Ledger: state/shared/galaxy-knowledge-iterations.json._
