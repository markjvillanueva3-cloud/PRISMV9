---
name: reference_galaxy_context_federation_savings_telemetry_2026_05_31
description: "GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-SAVINGS-TELEMETRY (shipped 2026-05-31, slot alpha) — CAPSTONE: rolls up federation token savings in 3 honest categories (per-inject potential / realized / saveable). Milestone now 11/12 (only Ollama-gated unit left). per-inject ceiling ~51K tok/inject."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.585Z
aliases: reference_galaxy_context_federation_savings_telemetry_2026_05_31
---


**GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-SAVINGS-TELEMETRY** (shipped 2026-05-31, slot alpha) — 11th federation
unit, **the CAPSTONE**. With this, the milestone is **11/12** — every non-gated unit shipped; only
`U-GCF-OLLAMA-MAINT` remains (gated on Ollama `/api/chat` recovery). Sister: [[reference_galaxy_context_federation_xdedup_2026_05_31]].

**What it is:** rolls up the federation's token savings from every prior unit's sidecar — proves the milestone
delivered (R12: measured/estimated from real artifacts, not asserted). THREE honest categories:
1. **Per-inject potential** (UNREALIZED capacity): card-vs-brain (INDEX cardBytes vs MEMORY-WATCH brainBytes) +
   digest-vs-all-brains (MASTER-DIGEST vs Σ brains) — ALTERNATIVE strategies, NOT summed; headline = best
   single-strategy ceiling ~51K tok/inject, contingent on the inject path being wired.
2. **Cumulative realized**: recall-first-savings.json — 0 (recall hook golf-pending; shown honestly, not projected).
3. **One-time saveable**: DEDUP-REPORT.json — ~37 tok.

**Shipped:** `scripts/lib/galaxy-savings.mjs` (pure+injected+fail-soft; 12 node:test), `scripts/galaxy-savings.mjs`
(CLI build|show). Sidecar: `state/shared/galaxy-cards/SAVINGS-REPORT.{json,md}`.

**How to apply / lessons:**
1. **The capstone's ONE job is honesty — a reviewer caught an additive headline that double-counted (arm-B P2).**
   First cut summed card-vs-brain (44.8K) + digest-vs-all-brains (51.4K) = "96K per-inject total". But those are
   MUTUALLY-EXCLUSIVE inject strategies that both replace re-reading the SAME brains — summing double-counts. Fix:
   report the best single-strategy CEILING (max, not sum) + state they're alternatives. On a milestone-PROVING
   unit, an inflated headline is the worst failure mode — measure conservatively, label every category.
2. **Distinguish POTENTIAL from REALIZED (R12).** Per-inject "potential" is UNREALIZED capacity — it accrues only
   when a consumer actually injects the card/digest instead of reading the brain (the inject path is golf-pending).
   The report says so explicitly (realizationCaveat). Realized recall savings = 0 (hook not wired), shown with the
   WHY, never projected from potential. Don't let a reader over-credit capacity as if it were banked.
3. **Verify EVERY producer field name against the actual producer (R8/R12) — a wrong name = silent 0.** The
   reviewer cross-checked all 5: INDEX cards[].bytes, MEMORY-WATCH all[].bytes, MASTER-DIGEST .bytes, recall
   totalEstSavingsTokens/totalNudges, DEDUP totalEstTokensSaved/clusterCount. A capstone that reads 5 sidecars is
   5 silent-zero traps if a field name drifts; the Number.isFinite guards + the LIVE test (real sidecars) catch it.
4. **null bytes are real (MEMORY-WATCH emits null for a missing brain stat) — Number.isFinite at every join point
   prevents NaN poisoning a total.** tok(bytes) floors non-finite/negative to 0.
5. **Single-writer-per-file** (8th unit): own SAVINGS-REPORT.{json,md}, never a source sidecar/INDEX/MEMORY.md.

**SESSION ARC:** 7 federation units shipped this overnight /goal /loop (ROLLUP→COMPACT→KNOWS-MAP→PUSH→RECALL-FIRST
→XDEDUP→SAVINGS-TELEMETRY), all 2-reviewer-PASS, all single-writer, all honest-claim-qualified. Federation built
end-to-end (retain→feed-up→redistribute→savings). Wiring these into hooks (golf patch-siblings) REALIZES the
~51K tok/inject potential. Wiki: [[galaxy-context-federation]]. PSN [[feedback_psn_definition]].
