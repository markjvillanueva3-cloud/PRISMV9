---
name: feedback_wire_algos_into_galaxies
description: When generating algorithms, wire them into the relevant galaxy brains (not just prism_algorithm) — the consuming domains must KNOW the primitive exists
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.454Z
aliases: feedback_wire_algos_into_galaxies
---


**Rule (operator directive, 2026-05-29 to slot tango):** *"make sure as you're generating algos, you wire them into relevant galaxies."*

Wiring an algorithm into `prism_algorithm` (the dispatcher) makes it **invokable** but not **discoverable** — a future session working in india/oscar/sierra/etc. won't know the primitive exists. "Wired into a galaxy" means the consuming domain's brain (`mcp-server/src/engines/<domain>/MEMORY.md`) carries an awareness pointer. This is PSN leg #8 (Engines/Algorithms) → per-domain-brain edge.

**How to apply (every algorithm, at build time — NOT a later batch):**
1. Build + test + wire to `prism_algorithm` dispatcher (action + lazy-import case + enum/reachability synergy test) — the existing step.
2. **Map each algorithm to its consuming galaxy/galaxies** by what it's FOR:
   - DL/NN/GNN/LoRA/ML primitives (attention, layernorm, lowrank, pca, knn, gmm, viterbi, beam, heterophily) → **india** (`engines/ai-training/MEMORY.md`)
   - telemetry/signal/time-series (savgol, dtw, viterbi, gmm, knn-regime) → **oscar** (`engines/speed-feed/MEMORY.md`) + relevant cutting galaxies
   - graph/topology (heterophily-aggregate, pagerank) → **sierra** (`engines/system-viz/MEMORY.md`)
   - optimization/numerical → wherever the domain optimizer lives
3. **Append** (never rewrite — lane-safe, additive) an "Available algorithm primitives" block to each relevant galaxy MEMORY.md: action name + 1-line "what it's for in THIS domain" + pointer to the batch reference memory + wiki entry.
4. Doc-reflect the cross-galaxy synergy in the wiki batch entry too (`knowledge/wiki/architecture/algo-synergy-ml-batch.md` §Cross-galaxy + PSN synergy).

**Why:** an algorithm nobody knows about is a latent orphan even when technically wired — the exact "built-but-unreachable" class tango exists to prevent. Cross-galaxy back-pointers are part of the MASTER-BRAIN-TEMPLATE connection axes; appending to a peer galaxy brain is allowed ([[feedback_all_slots_free_access]]) and is additive, so it doesn't conflict with the owning slot.

First applied: ALGO-SYNERGY 2026-05-29 — 11 primitives wired into india + oscar + sierra brains. See [[reference_tango_algo_synergy_batch_2026_05_29]]. Related: [[feedback_reflect_all_changes_post_update]] (this is the galaxy-brain surface of the 4-surface reflection rule), [[feedback_psn_definition]].
