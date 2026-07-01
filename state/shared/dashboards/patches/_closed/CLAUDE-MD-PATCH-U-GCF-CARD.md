> **⏹ SUPERSEDED (triage `wq31b7vsz`, 2026-06-02).** GALAXY-CONTEXT-FEDERATION-MS0 advanced past this 2026-05-31 U-GCF-CARD snapshot (U-TRIBAL-DOMAIN-MAP-GAP, U-GCF-AWARENESS-FAILSOFT shipped since); federation/token-savings doctrine already reflected in live MEMORY.md feed-up line + wiki galaxy-context-federation.md. Do NOT add a per-unit block to peer-locked size-capped CLAUDE.md. CLOSED.

# PATCH-SIBLING — CLAUDE.md + MEMORY.md doc-reflection for GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-CARD

> For golf/integrator (or any chat editing the peer-locked top-level docs). Alpha shipped U-GCF-CARD
> (commit `[MAIN] .../U-GCF-CARD`) from the main-tree grant but CLAUDE.md + MEMORY.md are peer-locked,
> so the doc-reflection lands here as a sibling. Author: claude-da9aacf5 slot alpha · 2026-05-31.

## 1 — `H:/prism/CLAUDE.md`: add a section (near the other MS pointers, e.g. after §OLLAMA-PIPELINE-MS0)

```md
## GALAXY-CONTEXT-FEDERATION-MS0 (2026-05-31, slot alpha) — per-galaxy retention → master roll-up → redistribute + Obsidian token savings

Hub-and-spoke context topology for the per-galaxy brains: retain salient context per galaxy → roll up to master → redistribute selectively. The federation IS the token savings (recall-instead-of-reread + cache-anchored compact cards + cross-galaxy dedup). Mostly wiring existing primitives (R8), not net-new infra. Design: `state/shared/specs/GALAXY-CONTEXT-FEDERATION-MS0-DESIGN-2026-05-31.md` (commit `7c62f742ad`); 12 units across Phase A (retention) / B (feed-up) / C (redistribute) / D (Obsidian savings).

**U-GCF-CARD (shipped):** per-galaxy ≤1 KB context-card generator — distills `mcp-server/src/engines/<g>/MEMORY.md` into a salience-ranked card so a prompt injects/cache-anchors the card instead of re-reading the multi-KB brain. `scripts/lib/galaxy-context-card.mjs` (pure-core+injected-deps+fail-soft, deterministic salience heuristic, UTF-8/surrogate-safe cap, NO Ollama dep) + CLI `scripts/galaxy-context-card.mjs build|list|show`. Output → `state/shared/galaxy-cards/<g>.card.md` + INDEX.json (schemaVersion 1.0.0). 16 tests; 34 real cards ≤1024 B; 2-reviewer PASS. Knob `PRISM_GCF_CARD_DISABLE=1`. Next: U-GCF-CAG-CARDS (cache-anchor cards), U-GCF-XGALAXY-INJECT (cross-galaxy-aware inject). Wiki: [`knowledge/wiki/architecture/galaxy-context-federation.md`]. Memory: [[reference_galaxy_context_federation_card_2026_05_31]].
```

## 2 — MEMORY.md / MEMORY-RECENT.md: add the pointer line (Recent work section)

```md
- [galaxy-context-federation U-GCF-CARD](reference_galaxy_context_federation_card_2026_05_31.md) — per-galaxy ≤1KB context-card generator; inject the card not the multi-KB brain (token savings); 34 cards, 16 tests, slot alpha 2026-05-31
```

## 3 — verification
- `node H:/prism/scripts/galaxy-context-card.mjs build` → "built 34 card(s)"; `list` shows all ≤1024 B.
- `node --test H:/prism/scripts/lib/galaxy-context-card.test.mjs` → 16/16.
