---
name: post-processor-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the post-processor galaxy (G-code dialects, RS274NGC, ISO 6983, RTCP/TCPM, formal-semantics verification). 5 fetched + 1 unfetched source. PHYSICS-SAFE (standards/architecture/language only). FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: post-processor
  tier: VERIFIED
  verifiedBy: WebFetch
  physicsSafe: true
---

# post-processor galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every fetched source excerpted. **PHYSICS-SAFE: no numeric cutting constant** — standards, architecture, and language-specification content only.

## Synthesis
The domain is formally anchored by **ISO 6983-1** (word-address G-code program structure) and the **NIST RS274/NGC** spec (NISTIR 6556), which together define the canonical input-language contract every post-processor must emit and that controller dialects (Fanuc, Haas, Siemens SINUMERIK TRAORI, Heidenhain TNC 640 TCPM/M128) extend or diverge from in documented vendor-specific ways. The central **5-axis architectural decision**: whether inverse kinematic transformation (IKT) is done by the post-processor in joint-space (explicit machine-axis coords) or delegated to the controller via RTCP/TCPM/TRAORI (tool-frame coords + real-time kinematic compensation) — determining pivot-point error management, singularity handling, and portability. **Emerging research** (arXiv 2509.00699, 2512.11296) treats post-processor output as a *compiler artifact* subject to formal operational semantics, invariant checking, and VLM-assisted cross-validation against the live HMI — elevating verification from simulation-only to provable correctness. PRISM's next layer: ISO 6983 dialect-delta tables per controller family, the NIST canonical-function abstraction as a post-processor IR, Heidenhain TCPM/PLANE semantics as a concrete 5-axis case, and formal-semantics verification for regression-safe development.

## Verified sources
### [The NIST RS274NGC Interpreter - Version 3 (NISTIR 6556)](https://www.nist.gov/publications/nist-rs274ngc-interpreter-version-3) — report
> "This report describes an interpreter which reads numerical control code and produces calls to a set of canonical machining functions."

**Knowledge:** Canonical NIST spec of the RS274/NGC G-code dialect: interpreter architecture, canonical-machining-function abstraction, axis-word grammar, modal-group system, error handling, NC-word → machine-command mapping (3-6 axis). Underlies LinuxCNC; defines the target-language contract for post-processor design.

### [Heidenhain TNC 640 User Manual (948 pp.)](https://www.manualslib.com/manual/1359214/Heidenhain-Tnc-640.html) — article
> "Q parameter programming, CAD import, Free Contour Programming (FK), Fn 18 Sysread system data, subprograms and program section repeats."

**Knowledge:** Heidenhain dialect reference — conversational vs ISO G-code mode, TCPM (≈RTCP), M128 semantics, tilted-working-plane cycles (Cycle 19 / PLANE), kinematic calibration (Cycle 453), Q-parameter macros, pivot-point + tool-length compensation in 5-axis. For post-processor writers targeting Heidenhain.

### [Formalizing Linear Motion G-code for Invariant Checking and Differential Testing (arXiv 2509.00699)](https://arxiv.org/abs/2509.00699) — paper
> "The computational fabrication pipeline for 3D printing is much like a compiler — users design models in CAD tools that are lowered to polygon meshes to be ultimately compiled to machine code by 3D slicers."

**Knowledge:** Operational semantics for linear-motion G-code + cuboid-lifting to geometric invariants + differential testing between competing post/slicer outputs to detect silent discrepancies. Post-processor output as a compiler artifact subject to formal correctness + regression testing.

### [Few-Shot VLM-Based G-Code and HMI Verification in CNC Machining (arXiv 2512.11296)](https://arxiv.org/abs/2512.11296) — paper
> "a few-shot VLM-based verification approach that simultaneously evaluates the G-code and the HMI display for errors and safety status."

**Knowledge:** VLM jointly reads emitted G-code + machine HMI to cross-check safety status, modal-state consistency, and programming errors without full simulation — a verification tier downstream of the post that catches dialect-specific emission errors static linting misses.

### [ISO 6983-1:2009 — NC of machines: Program format and address-word definitions](https://www.iso.org/standard/34608.html) — standard · NOT fetched (ISO paywall, HTTP 403)
> _(no excerpt — paywalled; cited as the canonical standard, confirmed current 2025, no fabricated quote)_

**Knowledge:** Canonical word-address G-code program format: block structure, address-letter assignments, G-words, M-words, feed/speed words, interchangeability. The baseline every controller dialect conforms to or intentionally deviates from — post writers must know both the standard and per-vendor deltas.

### [5-axis High Speed Milling Optimisation (arXiv 0904.1083, LURPA)](https://arxiv.org/abs/0904.1083) — paper
> "Manufacturing of free form parts relies on the calculation of a tool path based on a CAD model, on a machining strategy and on a given numerically controlled machine tool."

**Knowledge:** 5-axis toolpath under machine kinematic/geometric constraints (axis-travel limits, singularity avoidance, non-linear rotary-interpolation error) at the CAM/post boundary — underpins why IKT-in-post vs RTCP/TCPM-in-controller are two distinct architectures with different accuracy implications.

---
_Physics-safety: no numeric cutting constant appears; standards/architecture/language-spec content only (R12)._
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_e5e4f08d-e05). Ledger: state/shared/galaxy-knowledge-iterations.json._
