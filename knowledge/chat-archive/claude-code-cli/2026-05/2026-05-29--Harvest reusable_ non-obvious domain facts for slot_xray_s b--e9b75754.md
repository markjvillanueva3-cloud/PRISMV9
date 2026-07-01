---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "Harvest reusable, non-obvious domain facts for slot:xray's blueprint-vision gala"
date: "2026-05-29"
first_ts: "2026-05-29T15:11:12.609Z"
last_ts: "2026-05-29T15:12:48.325Z"
cwd: "H:\\prism-slot-xray"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-a452b697289b0d644.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# Harvest reusable, non-obvious domain facts for slot:xray's blueprint-vision gala

> **claude-code-cli** | 2026-05-29 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-a452b697289b0d644.jsonl`

## Transcript

### User | 2026-05-29T15:11:12.609Z

Harvest reusable, non-obvious domain facts for slot:xray's blueprint-vision galaxy from two large PRISM docs in H:/prism. Read them (use offset/limit chunks if needed — they are large) and extract ONLY high-value, durable facts that would improve a future extraction session's context. Do NOT summarize narratively — give me a bulleted list of crisp, citable facts.

Doc 1: state/shared/specs/BLUEPRINT-OCR-TRAINING-MS1-2026-05-12.md (~54K) — blueprint OCR training milestone.
Doc 2: state/shared/specs/PRINT-TO-INSPECTION-PIPELINE-V2.md (~24K) — print→inspection pipeline.

For EACH doc return:
1. The 5-8 most durable, non-obvious facts (extraction thresholds, gotchas, engine/dispatcher names that ACTUALLY exist, accuracy figures, failure modes, the canonical pipeline stages, any per-customer/per-family print quirks).
2. Any concrete numbers worth memorializing (accuracy %, confidence thresholds, corpus sizes, family-print floors).
3. Any engine/script/state-file PATH referenced — but flag each as VERIFY (I will confirm on disk; do NOT assert existence yourself unless you Glob/`[ -f ]` it).
4. Anything that contradicts or refines the current galaxy doctrine (multi-print split, per-field confidence 0.85/0.95/0.99, mm-normalization, datum-tie).

Keep it tight — facts only, each ≤25 words, each tagged [doc1] or [doc2]. This feeds new memories + a domain GSD protocol + tribal tips.

### Assistant | 2026-05-29T15:11:24.706Z

I'll read both docs in chunks and extract the high-value facts. Let me start by confirming the files exist and reading them.

### Assistant | 2026-05-29T15:11:26.090Z

[tool_use: Bash]

### User | 2026-05-29T15:11:38.751Z

[tool_result] H:/prism/state/shared/specs/BLUEPRINT-OCR-TRAINING-MS1-2026-05-12.md  54.4K
H:/prism/state/shared/specs/PRINT-TO-INSPECTION-PIPELINE-V2.md  24.7K

### Assistant | 2026-05-29T15:11:42.751Z

Both files exist. Let me read them in full.

### Assistant | 2026-05-29T15:11:43.235Z

[tool_use: Read]

### Assistant | 2026-05-29T15:11:43.721Z

[tool_use: Read]

### User | 2026-05-29T15:11:53.519Z

[tool_result] 1	# Print-to-Inspection Pipeline V2 — operator-facing 9-stage spec (AMENDED post peer-review + ACServer audit)
2	
3	> Companion to `CAD-PIPELINE-AUDIT-2026-05-20.md` and `ACSERVER-BRIDGE-AUDIT-2026-05-20.md`.
4	> Specializes the broader DOMAIN-PIPELINE-MS0 18-stage canonical pipeline onto
5	> the user's specific brief: print upload → CAD → hyperMILL → setup → CAM →
6	> sim → post → setup-sheet → i
... [+25980 chars truncated]

### User | 2026-05-29T15:11:54.215Z

[tool_result] 1	# BLUEPRINT-OCR-TRAINING-MS1 — RAG-augmented blueprint OCR + LoRA training + closed-loop continual learning
2	
3	**Created:** 2026-05-12 by claude-a7ea87ab (slot BRAVO)
4	**Method:** `/forge4 scope` (v4 atomic-first tier-gating; system-viz graph @ 2026-05-12T17:53:57.314Z as dependency oracle)
5	**Triggered by:** user request 2026-05-12 — *"can we use obsidian + tribal knowledge + prism awarenes
... [+57273 chars truncated]

### Assistant | 2026-05-29T15:12:48.325Z

Both docs read in full. Here is the harvested fact set for slot:xray's blueprint-vision galaxy.

---

## DOC 1 — BLUEPRINT-OCR-TRAINING-MS1 [doc1]

### Most durable / non-obvious facts
- [doc1] 96% of Docustrata PDFs are multi-page; single PDFs hold 5–10 prints buried on pages 2+. Page-1-only missed 24,186 docs / 120K pages.
- [doc1] Multi-page handling is canonical: tiered classifier = image heuristic → Tesseract title-block OCR → vision LLM, over ALL pages.
- [doc1] Ground-truth MUST be stratified 4 tiers: `confirmed` (ERP-shipped+measured) > `produced` > `quoted` > `inferred`. Conformal calibration uses tiers; replay buffer down-weights lower tiers.
- [doc1] Historical S/F + dim values from amateur programs are DATA, NOT GROUND TRUTH — never treat as confirmed.
- [doc1] Dedup intercept: GroundTruthRegistryEngine + GroundTruthValidationEngine ALREADY EXIST — EXTEND, never create BlueprintGroundTruthJoinEngine.
- [doc1] No on-device vision-weight updates; PRISM produces LoRA corpus, fine-tune runs externally (Gemini/OpenAI/Modal), endpoint plugs into AISystemRouterEngine as a backend.
- [doc1] LoRA export MUST anonymize: scrub customer names, part numbers, program content before any file leaves local FS; operator-confirms scrub.
- [doc1] Operator-in-the-loop is unconditional — no extraction is ground truth without operator confirm or confirmed ERP match.
- [doc1] Every RAG extraction MUST cite ≥1 retrieved source; no context → explicit "low-confidence, no-priors" candidate, never a hallucination.
- [doc1] 3 v8.89 monolith forks rescued (cheaper than rebuild): prism-enhanced-gdt-engine, prism-gdt-fcf-parser, prism-ocr-engine.

### Concrete numbers
- [doc1] Docustrata index v2: 24,545 production files / 120K+ pages.
- [doc1] JM Die `_PART LIBRARY/`: 25,028 part folders / 42,407 print pages / 10,678 program files.
- [doc1] Tribal: 4,245 tribal tips + 3,700 shop tips.
- [doc1] ~40 standard GD&T symbols + ~200 surface-finish marks in symbol library.
- [doc1] Corpus volu
... [+7114 chars truncated]
