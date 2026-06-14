---
name: reference_galaxy_context_federation_card_2026_05_31
description: "U-GCF-CARD shipped — per-galaxy ≤1KB context-card generator, the cheap inject unit of GALAXY-CONTEXT-FEDERATION-MS0 (token savings via recall-instead-of-reread)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.124Z
aliases: reference_galaxy_context_federation_card_2026_05_31
---


**GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-CARD** (shipped 2026-05-31, slot alpha) — first unit of the 12-unit context-federation milestone (design spec commit `7c62f742ad`).

A per-galaxy **context-card** generator: distills each galaxy's `mcp-server/src/engines/<g>/MEMORY.md` (+ CLAUDE.md role line + PATHS.md key paths) into a ≤1 KB salience-ranked card, so a prompt **injects/cache-anchors the card** instead of re-reading the multi-KB brain. That compression IS the token savings (federation Phase A retention).

- **Core:** `scripts/lib/galaxy-context-card.mjs` (pure-core + injected-deps + fail-soft; mirrors `path-ledger.mjs`). Deterministic salience heuristic (header-weight × per-line signals), UTF-8/surrogate-safe byte cap, **no Ollama dependency** (Ollama enhancer = separate gated `U-GCF-OLLAMA-MAINT`).
- **CLI:** `node scripts/galaxy-context-card.mjs build|list|show <g>`. Output → `state/shared/galaxy-cards/<g>.card.md` + `INDEX.json` (schemaVersion 1.0.0). Cards are a **regenerable build artifact** (run `build`, not committed).
- **Tests:** 16 hermetic `node:test` incl. real `defaultListGalaxies` production path. Real-data: 34 cards, all ≤1024 B. 2-reviewer per-file scrutiny PASS/PASS.
- **Knob:** `PRISM_GCF_CARD_DISABLE=1`.

**U-GCF-CAG-CARDS (shipped same session):** `buildAllCards` emits ONE consolidated `state/shared/galaxy-cards/ALL-CARDS.md` bundle (INDEX schemaVersion 1.1.0 + `bundlePath`/`bundleBytes`); `cag-router.mjs` `COLD_SOURCES` gains a single `galaxy-cards` entry → the SessionStart cold-anchor hook (iterates COLD_SOURCES generically, no hook change) anchors it once/session → ~0-marginal cross-galaxy recall. ONE 35 KB entry not 34; multi-word keywords avoid over-match; bundle is a regenerable artifact (not committed → cold-anchor `(missing)` until a build runs). 41/41 cag + 18/18 card tests, 2-reviewer PASS.

**Why:** the federation is mostly wiring existing primitives (R8) — recall-instead-of-reread + cache-anchored cards + cross-galaxy dedup. **Next:** `U-GCF-CAG-REGEN-WIRE` (golf patch-sibling — SessionStart `build` so the bundle is fresh; `HOOK-PATCH-GCF-CAG-REGEN-WIRE.md`), then `U-GCF-XGALAXY-INJECT` (cross-galaxy-aware inject consuming INDEX.json).

Wiki: [[galaxy-context-federation]] · sibling [[working-path-capture]] · [[feedback_psn_definition]].
