---
name: reference_galaxy_context_federation_xgalaxy_inject_2026_05_31
description: "GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-XGALAXY-INJECT (shipped 2026-05-31, slot alpha) — Phase C: selective per-prompt cross-galaxy card inject (top-K, similarity-gated, NEVER broadcast)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.585Z
aliases: reference_galaxy_context_federation_xgalaxy_inject_2026_05_31
---


**GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-XGALAXY-INJECT** (shipped 2026-05-31, slot alpha) — Phase C of
the 12-unit context-federation milestone (3rd unit; after U-GCF-CARD + U-GCF-CAG-CARDS — see
[[reference_galaxy_context_federation_card_2026_05_31]]).

**What it is:** per-prompt, inject ONLY the top-K OTHER galaxy ≤1 KB context-cards most relevant to the
active query — NEVER all 34. The cold-anchored `ALL-CARDS.md` bundle covers breadth ("available if
needed"); this is the WARM attention surface ("the 2-3 you need NOW"). The galaxy-card analogue of
`master-index-precheck-inject`'s top-5 graph hits.

**Shipped (committed this session):**
- `scripts/lib/xgalaxy-inject.mjs` — `maybeInjectCrossGalaxy({slot|galaxy, query})`: tokenize query →
  `scoreCard` (query-token overlap, role-line hits weigh 2×) → exclude self → filter similarity≥threshold
  → top-K → hard byte cap. Pure-core + injected-deps + fail-soft (NEVER throws, NEVER broadcasts).
- `scripts/xgalaxy-inject.mjs` — CLI lever: `node scripts/xgalaxy-inject.mjs --slot alpha --query "..."`.
- 41/41 `node:test`; 2-reviewer per-file scrutiny PASS/PASS (0 P0/P1).

**How to apply / reuse:**
1. **R8 reuse, don't re-derive** — this unit imported `tokenize` (master-index-search-lib),
   `utf8Truncate`/`DEFAULT_ROOTS` (galaxy-context-card), `galaxyForSlot` (slot-galaxy-map). Four
   imports, zero re-implementation. Confirm each export+signature is REAL before importing (arm B's check).
2. **Anti-broadcast is structural, not just tested** — empty/all-stopword query → `[]`; `matched>0` gate
   filters even at `threshold=0`; default k=3 caps; byte cap halts accumulation. A "selective inject"
   whose empty-query path broadcasts everything defeats its own purpose — make the guard structural.
3. **Real bug the test caught (R9):** `parseCardRole`'s first regex over-captured hyphenated galaxy
   names (`database-expansion` → role mis-parsed). Fixed by splitting on the FIRST space-dash-space
   (mirrors `deriveRole` in galaxy-context-card). Most galaxies have hyphens → the test earned its keep.
4. **Integration seam (the `.ok`/`.up` lesson again):** the orchestrator returns
   `{ok, injected, count, text, reason}`. The hook must gate on `injected && text`, NOT `ok` (ok is true
   for no-match/empty too). Documented in the golf patch.
5. **Wiring is golf's** — consumer `slot-context-bundle-inject.mjs` (already resolves slot→galaxy + has
   prompt) is the better wire than the originally-planned `master-index-precheck-inject` (no slot, skips
   slash-cmds). Patch: `state/shared/dashboards/patches/HOOK-PATCH-GCF-XGALAXY-INJECT.md`.

Knobs: `PRISM_GCF_XGALAXY_{DISABLE,K,THRESHOLD,MAX_BYTES}`. Wiki: [[xgalaxy-inject]]. Sister:
[[reference_galaxy_context_federation_card_2026_05_31]], [[feedback_mcp_autoreconnect_each_turn]]
(same pure-core+fail-soft+golf-patch shipping pattern). PSN [[feedback_psn_definition]].
