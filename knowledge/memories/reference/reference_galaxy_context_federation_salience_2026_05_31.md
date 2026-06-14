---
name: reference_galaxy_context_federation_salience_2026_05_31
description: "GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-SALIENCE (shipped 2026-05-31, slot alpha) — Phase A salience scorer: per-fact recency+impact re-rank (byte-identical when off) + per-galaxy access score off the LIVE outcome-bus (~13K rows/18 galaxies)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.125Z
aliases: reference_galaxy_context_federation_salience_2026_05_31
---


**GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-SALIENCE** (shipped 2026-05-31, slot alpha) — 4th federation unit
(after U-GCF-CARD, U-GCF-CAG-CARDS, U-GCF-XGALAXY-INJECT — see
[[reference_galaxy_context_federation_card_2026_05_31]], [[reference_galaxy_context_federation_xgalaxy_inject_2026_05_31]]).

**What it is:** salience scoring for galaxy context-cards. The design spec said `recency × access ×
outcome-impact`, but verifying the ACTUAL DATA behind each factor (R12) produced a more correct
**two-surface** design:
- **Per-fact bonus** (re-ranks facts WITHIN a card): recency (exp-decay on per-fact dates, 30-day
  half-life, future-clamped) + outcome-impact (structural proxy: commit-SHA-with-a-digit /
  shipped|wired|PASS|merged|green / N·N tests / N%). Both discriminate between a galaxy's OWN facts.
  Plugs into `extractGalaxyCard` via `opts.salienceScorer` defaulting to `scoreLine` ⇒ **byte-identical
  when off**.
- **Per-galaxy score** (ranks galaxy-vs-galaxy, for ROLLUP/cross-galaxy order): `computeGalaxySalience`.
  **access-frequency lives HERE, not per-fact** — the access ledger keys by galaxy (galaxy-granular), so
  it's constant across a card's facts → per-fact inclusion is a mathematical no-op.

**Shipped (committed this session):**
- `scripts/lib/galaxy-salience.mjs` — pure-core + injected-deps + fail-soft; NO import back from
  galaxy-context-card (base scorer injected → no ESM cycle). 51 `node:test`.
- `scripts/galaxy-salience.mjs` — CLI: `--galaxy G | --factors | --json`.
- `scripts/lib/galaxy-context-card.mjs` edits — `extractGalaxyCard` opt-in `salienceScorer` (default
  scoreLine, byte-identical, 18 tests stay green); `buildAllCards` activates salience by default
  (knob `PRISM_GCF_SALIENCE=0` reverts to scoreLine + schema 1.1.0) + records per-galaxy
  `salience`/`salienceFactors` in INDEX (schema 1.1.0 → 1.2.0 additive); optional `accessPath`/`accessSource`
  injection for hermetic tests.
- 2-reviewer per-file scrutiny PASS/PASS (P2 hermeticity + P3 SHA-digit both fixed in-session).

**How to apply / lessons:**
1. **Verify the DATA, not just the schema (R12) — TWICE this build.** First the recon agent reported
   `feature-util-counts.json` as the access source (its schema documents a `domain` param) — but the DATA
   has `perDomainTotals: {}` (0 entries despite 7426 increments; no caller passes domain). Then I coded
   against `feature-usage.jsonl` which **doesn't exist** (ENOENT). The real LIVE source is
   `state/shared/outcome-bus.jsonl` (~13K rows, 18 galaxies, 100% galaxy-joinable). Schema-read-blindness
   is the recurring class in CLAUDE.md's regression log — inspect the actual bytes before wiring.
2. **A galaxy-granular signal can't rank intra-galaxy items.** Don't blindly multiply the spec's three
   factors per-fact — access is constant across a card's facts → no-op. Separate per-fact vs per-galaxy.
3. **Byte-identical-when-off** = default the new scorer to the OLD one (`opts.salienceScorer || scoreLine`)
   + a `deepEqual` parity test. Ships an improvement without breaking the prior unit's 18 tests. The
   schema bump 1.1.0→1.2.0 is a LEGIT additive assertion update (R9), not a weakened assertion.
4. **Avoid the ESM cycle** by INJECTING the base scorer (ctx.baseScorer) — the consumer imports the
   salience lib one-directionally; the salience lib imports only slot-galaxy-map + node:fs.
5. **DOMAIN_ALIAS** normalizes 3 legacy outcome-bus domains (database→database-expansion,
   [[reference_fleet_reaper|fleet-reaper]]→[[feedback_golf_owns_reaper|fleet-hygiene]], hermes-zebra→hermes-zulu) to engine-dir galaxy names; a fail-on-revert test
   asserts every alias TARGET is a real galaxy.
6. **Hermeticity needs the path, not just the reader** (arm-B P2): threading `readImpl` is insufficient if
   `accessPath` still defaults to the live file — add an `accessPath` injection surface and point tests at
   a nonexistent fixture.

Real data: top quoting 7.60 · token-optimization 7.46 · hermes-zulu 7.40; bottom pdf-corpus/quality/
shop-floor 3.94. Knob: `PRISM_GCF_SALIENCE=0`. Wiki: [[galaxy-context-federation]]. Sister:
[[reference_galaxy_context_federation_xgalaxy_inject_2026_05_31]]. PSN [[feedback_psn_definition]].
