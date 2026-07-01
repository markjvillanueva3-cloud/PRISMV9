---
name: reference_ai_synergy_crosssubstrate_verified_real_2026_06_12
description: "The AI-synergy crossSubstrate dimension is GENUINELY materialized (1348 edges, all 34 galaxies, audit reads newEdges correctly) — an adversarial-verify workflow's \"INFLATED / 0 edges\" verdict was a j.edges-vs-newEdges schema-trap misread. Lesson: verify the verifier against the artifact."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.464Z
aliases: reference_ai_synergy_crosssubstrate_verified_real_2026_06_12
---


2026-06-12 slot:alpha. Working the standing AI-synergy `/goal`, ran an 8-galaxy adversarial-verify Workflow against the fleet AI-synergy audit's "34/34 strong / fully synergized" claim (`state/shared/specs/AI-SYNERGY-AUDIT.*`, generator `scripts/audit-ai-synergy.mjs`, scorer `scripts/lib/ai-synergy-audit-lib.mjs`). The workflow returned a confident verdict: **"INFLATED — crossSubstrate SHALLOW in 7/7 galaxies, audit grades its own inference, quoting has 0 cross-substrate edges, regen `generate-cross-substrate-edges.mjs` to fix."**

**That verdict was WRONG on its headline/testable claim — caught by verifying the verifier against the real artifact (R12 / "read the body not the title", applied to a workflow's OWN output):**
- `state/shared/system-viz/cross-substrate-edges-augmentation.json` has **1348 edges under the `newEdges` key** (owned-by-slot:79, documented-by:320, embeds:948, consensus-of:1) — NOT 0.
- **quoting has 39 edges**, including the exact `documented-by → memory_patterns.quoting_synthesis` (conf 1.0) the workflow claimed was missing. **All 34 galaxies are covered.**
- `scripts/audit-ai-synergy.mjs:220` reads **`aug.newEdges`** (correct), and (per the in-file comment, fix verified 2026-06-10) credits BOTH `eng.<g>` and `ghost.galaxy.<g>` node-id forms — it had been under-counting 26 galaxies and was already corrected. So crossSubstrate is scored from the **materialized artifact, not inference**.
- The workflow agents fell into the **`j.edges` vs `j.newEdges` schema trap** (read the empty top-level `edges` key → saw 0 → concluded "missing" + "audit uses inference"). The synthesis built its "most concrete fix" on that misread. NO real consumer uses the wrong `.edges` key (merge-augmentations / audit / edge-predict all use `newEdges`), so there is no code bug — the trap only bites LLM agents that guess the key.

**Net:** the cross-substrate synergy substrate (the system-viz <-> Obsidian/vault/Hermes/GNN-embeddings spine, sierra's CROSS-SUBSTRATE-SYNERGY-MS0) is REAL and correctly measured for the crossSubstrate dimension; the "synergize AI across all galaxies" goal is genuinely wired on that axis. Did NOT run the recommended regen — it was a fix for a non-problem (would have been a no-op churn at best).

**Lessons (apply going forward):**
1. **Verify the verifier.** An adversarial-verify Workflow is not ground truth — its agents misread artifacts too. Re-confirm a workflow's HEADLINE claim against the real file/code before acting, especially before any "fix".
2. **The `j.edges` vs `j.newEdges` trap is a recurring footgun** for anyone (human or LLM) probing the cross-substrate augmentation — the array is keyed `newEdges`, top-level `edges` does not exist. Probe with `j.newEdges`.
3. The workflow's SOFTER claims (discoverability greps auto-injected AI-capability blocks; ownsOrWiresAi name-heuristics on the flat `engines/` pool; servedByReasoningBridge generic) were NOT verified and may or may not hold — do not assert them without direct checks. Given the headline was wrong, treat the whole verdict as low-trust.

Related: [[reference_cross_substrate_synergy_ms0_2026_06_03]] · [[reference_xsub_embeds_docby_oracle_2026_06_10]] (the documented-by 38->0 volatile-augmentation regression sierra already fixed) · CLAUDE.md §CROSS-SUBSTRATE-SYNERGY-MS0.
