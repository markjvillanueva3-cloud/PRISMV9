---
name: blueprint-vision-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) deep-research foundations layer for the blueprint-vision galaxy (engineering-drawing OCR & VLM extraction). 5 fetched sources (arXiv VLM/OCR papers + Frontiers). Quality tier of FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: blueprint-vision
  tier: VERIFIED
  verifiedBy: WebFetch
---

# blueprint-vision galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source WebFetched + excerpted. Numerics are ML metrics (F1/precision/recall), not cutting constants.

## Synthesis (next-layer knowledge)
The 2024-2026 engineering-drawing OCR literature has converged on a common architecture: an oriented-bounding-box detector (YOLOv11-OBB now dominant) localizes annotation regions, then one or more fine-tuned transformer VLMs (Donut, Florence-2) parse each patch into structured JSON covering GD&T symbols, tolerances, surface roughness, thread callouts, and title-block fields. A critical empirical finding: domain-specific fine-tuning of small open-source VLMs (sub-0.5B params) substantially outperforms zero-shot prompting of large closed-source models (GPT-4o), with F1 gains of 50%+ and hallucination reductions of 40%+ — directly validating PRISM's local-VLM OCR ensemble direction. The multi-view/multi-page challenge is met by splitting extraction along modality lines (separate alphabetic vs numeric VLMs — numeric F1 0.963 vs alphabetic 0.672) and by layout-aware region detection *before* OCR, preventing cross-region symbol contamination. Emerging legacy-archive retrieval work (BLUEPRINT) extends the pipeline to RAG search over drawing repositories with region-level reranking.

## Verified sources

### [Fine-Tuning Vision-Language Model for Automated Engineering Drawing Information Extraction](https://arxiv.org/abs/2411.03707) — paper
> "extracting GD&T information from 2D engineering drawings is a time-consuming and labor-intensive task."

**Knowledge:** Fine-tuning Florence-2 (0.23B) on 400 annotated drawings → 52.40% higher F1 and 43.15% fewer hallucinations vs zero-shot GPT-4o/Claude-3.5-Sonnet. Domain-specific fine-tuning of small open-source VLMs dominates large closed-source VLMs on GD&T extraction (Khan et al., A*STAR/NTU 2024).

### [Automated Parsing of Engineering Drawings Using a Fine-tuned Document Understanding Transformer](https://arxiv.org/abs/2505.01530) — paper
> "traditional Optical Character Recognition (OCR) techniques often struggle with complex layouts and overlapping symbols, resulting in unstructured outputs."

**Knowledge:** Hybrid YOLOv11-OBB + Donut across nine drawing categories → 94.77% precision, 97.3% F1, hallucinations down to 5.23%. Structured JSON is the target representation for downstream CAD/manufacturing integration (Khan et al., A*STAR 2025).

### [A Multi-Stage Hybrid Framework for Multi-View Engineering Drawings Using VLM](https://arxiv.org/abs/2510.21862) — paper
> "interpreting complex multi-view drawings with dense annotations remains challenging... due to varied layouts, orientations, and mixed symbolic-textual content."

**Knowledge:** Three-stage pipeline (YOLOv11 detection → two modality-split Donut VLMs: Alphabetical F1 0.672, Numerical F1 0.963). Key insight: separating alphabetic and numeric sub-tasks substantially improves numeric recognition — directly applicable to PRISM's dimension extraction (Khan et al., A*STAR/NTU 2025).

### [OCR on engineering drawings for automation in production quality control (eDOCr)](https://www.frontiersin.org/journals/manufacturing-technology/articles/10.3389/fmtec.2023.1154132/full) — paper
> "Engineering drawings are essential carriers of information for production, but their complexity poses a challenge for computer vision."

**Knowledge:** eDOCr — three-pipeline open-source OCR separating information blocks, GD&T symbols, and dimensions; 90% precision/recall detection, 94% F1 recognition, 8% CER. Open-source benchmark baseline for subsequent VLM approaches (Villena Toro et al., Frontiers in Mfg Tech 2023).

### [BLUEPRINT: Multimodal Retrieval for Complex Engineering Drawings and Documents](https://arxiv.org/abs/2602.13345) — paper
> "Blueprint detects canonical drawing regions, applies region-restricted VLM-based OCR, normalizes identifiers."

**Knowledge:** Layout-aware multimodal retrieval for large legacy drawing archives: region detection, region-restricted VLM OCR, identifier normalization, lexical+dense fusion with region-level reranker → +10.1% Success@3, +18.9% nDCG@3 over VLM baselines. Applicable to PRISM's multi-page PDF split + drawing retrieval (Seefried et al., 2026).

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_20f6fbb7-a7e). Ledger: state/shared/galaxy-knowledge-iterations.json._
