---
name: reference_grounding_enrichment_gaming_trap_2026_05_31
description: "Raising a training-eval axis by appending reference lines is metric-GAMING if gated by bare tokens — it mis-attaches + homogenizes. Use category-allowlist + genuine-topic + not-already-grounded gates; and accept that some axes are legitimately low for qualitative content (do not force-inflate)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.601Z
aliases: reference_grounding_enrichment_gaming_trap_2026_05_31
---


# Grounding-enrichment gaming trap (slot mike / wedm, U-KNOWLEDGE-GROUNDING-ENRICH, 2026-05-31)

**The trap (fleet-wide — any galaxy doing eval-driven LoRA-corpus enrichment).** A knowledge-corpus eval found `grounding` (concrete-anchor presence) was the weakest axis (~0.43). The intuitive fix — append a "Shop-calibrated reference: …" line of real numbers to under-grounded answers — **games the metric** when the gate is loose:

- **Mis-attachment (P0):** bare-token gates (`\bpass\b`, `\bwire\b`) attached a 0.25mm brass-wire spec / offset cascade to topically-UNRELATED tips — safety ("don't reach in the tank"), ML ("DNN R²=0.9999"), CRM ("36,928 archive files"), physics ("spark 12,000°C"). A wire spec on a safety tip is a non-sequitur that DEGRADES answer quality while the metric rises.
- **Homogenization / teaching-to-the-test (P0):** 88 of 145 tips (61%) got one of just ~2 boilerplate tails. Grounding rose 0.43→0.55 **by construction** — the model would learn to reflexively recite "0.25mm brass, 12N" on any "wire" prompt. The same author wrote the eval AND the thing satisfying it → must guard against teaching-to-the-test.

**The fix (correct enrichment gate).** Three guards in conjunction:
1. **Category allowlist per ref type** — a wire spec only attaches to `tooling`/`workpiece_machinability`; offset cascade only to `programming`/`process_parameters`/`speeds_feeds`; M-code only to `controller_dialect`/`programming`. safety/ai/physics/shop_ground_truth/cost excluded → mis-attachment structurally impossible.
2. **Genuine-topic regex** — require real subject co-occurrence (`offset` near cascade/decrease language), not the bare token.
3. **Not-already-grounded** — skip when the body already cites the anchor.
Plus material-diversified selection (`selectECodeFamily(material)`) to avoid identical tails.

**The honest outcome.** After the fix, the gate fires on only **2 of 171 pairs** and grounding stays **~0.43**. The 0.55 was a pure gaming artifact. **CONCLUSION: grounding ~0.43 is LEGITIMATE for qualitative advisory knowledge — do NOT force-inflate an eval axis that is correctly low for the content type.** R12 (fail loud / honesty) > a green number.

**Process note:** per-file scrutiny (2 independent reviewers) FAILED the first cut and caught the gaming; the fix passed re-review. This is the per-file gate working as designed — [[feedback_parallel_scrutiny_per_file]]. Pairs with [[reference_program_scorer_knowledge_corpus_mismatch_2026_05_30]] + [[feedback_ai_upgrade_broadcast_protocol]] (broadcast to india/whiskey/foxtrot/kilo/quality/lima).
