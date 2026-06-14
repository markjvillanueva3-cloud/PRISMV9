---
name: reference_alpha_l2_meta_synthesis_2026_05_29
description: L2/L3 cross-galaxy meta-synthesis — clusters the 34 B1 syntheses by embedding affinity into cross-domain meta-patterns + doctrine candidates; amplifier
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.016Z
aliases: reference_alpha_l2_meta_synthesis_2026_05_29
---


L2/L3 (2026-05-29, slot:alpha, commit `[OBSIDIAN-BRAIN]/L2`) — **the compounding
of the compounding**, and amplifier #1 of the fleet-compounding roadmap (answer to
"can we amplify/speed the obsidian brain with 20 chats").

**What:** `scripts/galaxy-meta-synthesis.mjs`. B1
([[reference_alpha_b1_galaxy_reflection_2026_05_29]]) made 34 per-galaxy L1
syntheses. L2 finds patterns that recur ACROSS galaxies; L3 promotes the most
cross-cutting to doctrine candidates.

**Efficiency design (alpha):** the cross-domain STRUCTURE is computed
DETERMINISTICALLY from the 34 synthesis EMBEDDINGS already in the sidecar (pairwise
cosine via `cosineSimInt8` → threshold graph → union-find components). The LLM
(reuses B1's keep-alive-pinned `synthesizeViaOllama`) only NAMES each small cluster
(input fits Ollama context). Ollama down → clusters still emit structurally.

**Threshold 0.93** (empirically tuned on the 34 real vectors — the template
inflates the cosine baseline to ~0.88; 0.93 is the knee). 0.92 over-merges via the
cross-cutting `quality` hub; 0.94 too sparse. → 3 clean clusters:
`{corpus-aggregation,mill,pdf-corpus,pdf-corpus-mill}`, `{academy,ai-training}`,
`{cad,cad-fusion-live}`.

**Validation:** the `academy·ai-training` cluster's rule independently
**rediscovered the real doctrine** [[feedback_domains_own_ai_training_systems]] —
proof the compounding finds cross-domain rules by itself.

**Safety:** self-reference guard (skips `_meta` from its own input → no meta-of-meta
loop); L3 `advisoryOnly`+`mustHumanVerify`, NEVER auto-edits CLAUDE.md;
**degenerate-cluster guard** (Reviewer-B P1) — a >50%-of-fleet mega-cluster is
threshold collapse, excluded from doctrine candidates + flagged loudly (fires at
0.90 "largest 31/34", silent at 0.93). 22 tests, 2 reviewers PASS.

**The 6-amplifier roadmap** (the fleet beats "1 terminal + ephemeral subagents" via
persistent+specialized+parallel workers): (1) hierarchical L2/L3 ✅ DONE; (2)
continuous/incremental re-synthesis on memory-write; (3) fleet-distributed
synthesis (each slot uses its OWN Claude — 20× parallel, GPU-free, > 7B quality);
(4) closed-loop validation (helped/refuted signals → self-correcting brain); (5)
real-time cross-chat propagation (a discovery reaches 19 peers in minutes); (6)
active gap/contradiction detection (knowledge drives new work). Honest bottleneck:
the single GPU caps Ollama compounding — the real lever is routing high-value
synthesis to Claude-in-the-fleet. Wiki:
[`knowledge/wiki/architecture/galaxy-meta-synthesis.md`].
