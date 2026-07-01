---
name: fleet-lora-corpus-composition-2026-06-11
description: "Evidence-based composition of the fleet LoRA training corpus (state/shared/lora/fleet-lora-combined.jsonl, 1192 rows) and why a FLEET adapter is the correct route vs per-domain toy adapters. 687 rows are by-design galaxy-untagged global doctrine; the 34 tagged galaxies are THIN (10-22 rows each), too few to specialize a 7B without overfit. Per-domain training is gated on growing per-galaxy corpus DEPTH (india's lane), not on running 34 degenerate small-corpus trains."
type: reference
galaxy: ai-training
source: prism-memory
synced: 2026-06-27T20:30:46.574Z
aliases: reference_fleet_lora_corpus_composition_2026_06_11
---


**Fleet LoRA corpus composition — measured 2026-06-11 (slot:zulu).** Answers the standing "improve LoRA per-domain across all galaxies" demand with DATA, not assertion.

## Measured distribution (`state/shared/lora/fleet-lora-combined.jsonl`, 1192 rows)
By source:
- `vault-galaxy-synthesis-lora` — **505** (per-galaxy tagged; ~15/galaxy across 34)
- `wiki-canonical-pairs` — **282** (galaxy-untagged: canonical wiki doctrine, fleet-wide)
- `vault-feedback-lora` — **279** (galaxy-untagged: PRISM doctrine rules e.g. "AI-First Development Preference", apply to ALL galaxies)
- `bridge-reasoning-lora` — **115** (this session's galaxy-reasoning-bridge emit, per-galaxy)
- `outcome-bus-recommendations` — **11**

Per-galaxy tagged rows: **min 10 / median 15 / max 22** (thinnest: fleet-hygiene/lathe/pdf-corpus=10; thickest: quality=22, cad-fusion-live=22, speed-feed=21, wiring=19).

## Key finding (R8/R12 — checked, did NOT fabricate a bug)
The **687 untagged rows (58%) are NOT a tagging bug** — they are *by design* fleet-wide doctrine (feedback rules + canonical wiki) that legitimately belong to no single galaxy. Back-filling a galaxy tag onto them would be WRONG (it would falsely specialize global doctrine into one domain). A FLEET adapter SHOULD learn global doctrine + per-domain flavor; this corpus is correctly structured for that.

## Why FLEET adapter is the correct route (not 34 per-domain adapters)
At **10-22 rows/galaxy**, a per-domain 7B QLoRA would **overfit to noise** — far below the ~hundreds-of-rows floor for meaningful single-domain specialization. Running 34 such trains is the R13-degenerate "box-check" path (thorough ≠ many tiny things). The 1192-row fleet adapter (global doctrine + per-domain synthesis flavor) is the comprehensive route and is what trained 2026-06-11 (`state/shared/lora/adapters/fleet-prod-20260611`, base Qwen2.5-7B, r16/a32, 400 steps).

## Real precondition for future per-domain training (india's lane)
Grow per-galaxy corpus **DEPTH** first — more real reasoning pairs per domain from each galaxy's memories/wikis/tribal (deterministic extraction = non-GPU; generation = GPU, gate behind idle GPU). Only once a galaxy has ~hundreds of quality rows is a per-domain adapter non-degenerate. This is corpus/training ownership = **india**, not a zulu double-build.

Related: [[reference_zulu_fleet_lora_train_2026_06_11]], [[feedback_multiseed_before_auroc_claim]], [[reference_domain_mastery_assessment_2026_06_11]], [[feedback_build_comprehensive_route]].
