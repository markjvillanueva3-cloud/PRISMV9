---
schema: ideablock-v1
title: "hyperMILL Lace: table in the machine model used in the simulation"
domain: "3D Milling"
version_state: Draft
confidence: 0.85
cluster_size: 2
canonical_sha256: 6c5bf039878fd8d2
sources:
  - hm-tip-dhap1e:6c5bf039878fd8d2
  - hm-tip-besc5e:8d885b62dfd3a56c
extracted_via: tf-idf-cosine-0.8
qa_via: "heuristic-no-llm"
extracted_at: 2026-06-27T03:23:01.874Z
---
## Question

How do I table in the machine model used in the simulation?

## Answer

hyperMILL Lace: table in the machine model used in the simulation. | Workflow: The Clamping position option is not enabled. The model and clamp are placed in the middle of the → The Clamping position option is enabled, no movement is defined. → The Clamping position option is enabled and a movement is defined. → Create the corresponding joblists and define the Frame limit necessary for the respective NC → Use the Feature Mapping function. Enable the Use Generic Hole Only function to do so.

## Merged from

This canonical block subsumes 2 near-duplicate tips. Originals:

- `hm-tip-dhap1e` (sha256: `6c5bf039878f...`) -- hyperMILL Lace: table in the machine model used in the simulation. | Workflow: The Clampin...
- `hm-tip-besc5e` (sha256: `8d885b62dfd3...`) -- hyperMILL Lace: middle of the table in the machine model used in the simulation. | Workflo...

## Provenance

- Original source file: `hypermill/hypermill-tribal-tips-1776036032655.json`
- Distilled by: `scripts/distill-tribal.mjs` at TF-IDF cosine threshold 0.8
- Q-A extraction: heuristic-no-llm
- Lifecycle: Draft -> SME validation required before promotion to Current.
