---
name: cad-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) deep-research foundations layer for the cad galaxy (CAD geometry — B-rep learning, STEP AP242, GD&T, OCCT). 6 fetched + 1 honestly-unfetched source from arXiv/Oxford JCDE/ISO/ASME. Quality tier of FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: cad
  tier: VERIFIED
  verifiedBy: WebFetch
---

# cad galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Sources marked **fetched** were WebFetched + excerpted; the ISO 10303-242 entry is honestly marked **unfetched** (paywalled — no fabricated excerpt, R12). Note: numeric values mentioned (e.g. classification accuracies, GD&T tolerances) are not machining cutting constants.

## Synthesis (next-layer knowledge)
The next-layer depth in CAD geometry centers on four interlocking pillars. **First, direct B-rep learning** — BRepNet, BRepGAT, and BRepFormer demonstrate that operating on the native topological graph (faces, edges, coedges) with graph-attention or transformer message-passing consistently outperforms mesh/voxel/point-cloud proxies for feature recognition, eliminating the information loss of format conversion. **Second, ISO 10303-242 (STEP AP242)** is now the canonical exchange format for full-fidelity B-rep plus semantic PMI/GD&T, with Edition 3 (2022) unifying aerospace (AP203) and automotive (AP214) profiles; **ASME Y14.5-2018** provides the precise vocabulary of GD&T symbols and datum semantics that AP242's PMI layer must encode. **Third, the OpenCASCADE kernel** exposes the production geometry-topology separation underlying all B-rep systems: mathematical geometry (NURBS, Bezier, elementary surfaces) bound to topology (Shell/Face/Edge/Vertex) via a clean separation allowing attribute attachment. **Fourth, the 2024 GDL survey** confirms B-rep direct learning remains the central open research challenge, with benchmark datasets (Fusion 360 Gallery, MFCAD18++, CBF) enabling rigorous cross-architecture comparison.

## Verified sources

### [BRepNet: A Topological Message Passing System for Solid Models](https://arxiv.org/abs/2104.00706) — paper · fetched
> "Boundary representation (B-rep) models are the standard way 3D shapes are described in Computer-Aided Design (CAD) applications. BRepNet defines convolutional kernels with respect to oriented coedges in the data structure."

**Knowledge:** Autodesk Research / UCL CVPR 2021 — neural message passing directly on B-rep topology (faces, edges, coedges) without mesh conversion; ships the Fusion 360 Gallery segmentation dataset (35,000+ annotated B-rep models). Foundational for learned feature recognition on raw CAD solids.

### [BRepGAT: GNN to segment machining feature faces in a B-rep model](https://academic.oup.com/jcde/article/10/6/2384/7453688) — paper · fetched
> "Most of these studies converted the original CAD data into images, point clouds, or voxels for recognition. This led to information loss during the conversion process, resulting in decreased recognition accuracy."

**Knowledge:** Oxford J. Computational Design and Engineering 2023 — face/edge descriptors from B-rep feed a graph-attention network reaching 99.10% accuracy on MFCAD18++ without format conversion. Establishes graph-attention over B-rep topology as SOTA for machining-feature segmentation.

### [BRepFormer: Transformer-Based B-rep Geometric Feature Recognition](https://arxiv.org/abs/2504.07378) — paper · fetched
> "we incorporate a bias that combines edge features and topology features to reinforce geometric constraints on each face."

**Knowledge:** ACM ICMR 2025 — transformer fusing geometric + topological face/edge features for complex industrial B-rep recognition; introduces the CBF dataset (20,000 industrial B-rep models). Advances beyond machining-only benchmarks to full geometric complexity.

### [Geometric Deep Learning for Computer-Aided Design: A Survey](https://arxiv.org/abs/2402.17695) — paper · fetched
> "The ability to process the CAD designs represented by geometric data enables identification of similarities among diverse [designs]"

**Knowledge:** 2024 arXiv survey (Heidari & Iosifidis) covering ML on CAD geometry: retrieval, 2D/3D synthesis, generation from point clouds/images. Catalogs benchmark datasets + open-source implementations; identifies B-rep direct learning as the key open challenge.

### [ISO 10303-242:2022 — Managed Model-Based 3D Engineering (STEP AP242 Ed. 3)](https://www.iso.org/standard/84667.html) — standard · NOT fetched (paywalled)
> _(no excerpt — source paywalled, not fetched; cited as a known authoritative reference, no fabricated quote)_

**Knowledge:** ISO reference standard for exchanging 3D product data (B-rep geometry, topology, assembly, semantic PMI/GD&T) between heterogeneous CAD systems. AP242 supersedes AP203/AP214 by adding full semantic PMI, tessellated geometry, and model-based definition for aerospace/automotive supply chains.

### [ASME Y14.5-2018 (R2024) — Dimensioning and Tolerancing](https://www.asme.org/codes-standards/find-codes-standards/y14-5-dimensioning-tolerancing) — standard · fetched
> "symbols, rules, definitions, requirements, defaults, and recommended practices for stating and interpreting GD&T and related requirements for use on engineering drawings, models defined in digital data files, and in related documents."

**Knowledge:** ASME's authoritative GD&T standard (326 pages in the 2018 edition). Defines feature-based tolerancing, datum stabilization, and geometric tolerance symbols (form, orientation, position, profile, runout) — the mandatory semantic vocabulary that AP242 PMI must encode.

### [Introduction to OpenCASCADE and CAD Modelling Kernels](https://analysis-situs.medium.com/introduction-to-opencascade-and-cad-modelling-kernels-eb9e6b6817f4) — article · fetched
> "Boundary modellers dominate the CAD and CAM markets... the only open-source kernel"

**Knowledge:** Technical overview of CAD kernel architecture: why B-rep dominates (efficiency, attribute attachment, ideal master shape for derived representations), positions OCCT as the only open-source B-rep kernel, explains geometry-topology separation. Core reference for OCCT BRep_Shape data structures.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_51c75703-dc9). Ledger: state/shared/galaxy-knowledge-iterations.json._
