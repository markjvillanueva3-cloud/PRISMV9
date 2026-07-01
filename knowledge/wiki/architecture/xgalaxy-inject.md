---
title: Cross-Galaxy Selective Inject (U-GCF-XGALAXY-INJECT)
type: architecture
status: shipped
owner: alpha (token-optimization / context-federation)
created: 2026-05-31
tags: [galaxy, context-federation, inject, token-optimization, selective, fail-soft, bm25-lite]
---

# Cross-Galaxy Selective Inject — top-K relevant sibling-galaxy cards per prompt

Phase C of **GALAXY-CONTEXT-FEDERATION-MS0**. The federation distills each of the 34 galaxy brains
(`mcp-server/src/engines/<g>/MEMORY.md`, often many KB) into a ≤1 KB **context-card** (U-GCF-CARD),
then makes the whole catalog **cold-anchorable** as one bundle (U-GCF-CAG-CARDS, `ALL-CARDS.md` ~35 KB).
This unit adds the missing **warm, per-prompt selective surface**: given the active slot's galaxy and
the user's query, inject ONLY the **top-K OTHER** galaxy cards most relevant to THIS task.

## The gap it closes
| Tier | Artifact | Covers | Cost |
|------|----------|--------|------|
| Cold (U-GCF-CAG-CARDS) | `ALL-CARDS.md` bundle, anchored once/session | breadth — "any galaxy, available if needed" | ~35 KB cache-anchored |
| **Warm (this unit)** | top-K cards injected per prompt | **attention** — "the 2-3 you need NOW" | ≤ `MAX_BYTES` (3.5 KB), only when relevant |

A flat 34-card dump every prompt is exactly the token waste the milestone fights. This is the ranked,
attention-directing surface — the galaxy-card analogue of `master-index-precheck-inject`'s top-5 graph hits.

## Design (`scripts/lib/xgalaxy-inject.mjs`)
Pure-core scorers + injected fs deps + fail-soft (mirrors `galaxy-context-card.mjs` +
`mcp-reconnect-action.mjs` for R11). **Reuses, never re-derives (R8):** `tokenize` from
`master-index-search-lib.mjs`, `utf8Truncate`/`DEFAULT_ROOTS` from `galaxy-context-card.mjs`,
`galaxyForSlot` from `slot-galaxy-map.mjs` (single source of truth for slot→galaxy).

- `parseCardRole(text)` — role from the `## <galaxy> — <role>` header. Splits on the FIRST
  space-dash-space so a **hyphenated galaxy** (`database-expansion`, `token-optimization`,
  `post-processor`) is NOT mistaken for the role. *This was a real bug the test caught* (the first regex
  over-captured the whole header on hyphenated names → role-boost mis-scored most cards). Kept in
  lock-step with `renderCard`'s ` — ` emitter — a separator change there silently disables role-boost.
- `scoreCard(qTokens, cardText)` — `similarity = matched / |qTokens| ∈ [0,1]`; role-line hits weigh
  `ROLE_BOOST`(2)× body hits (mutually-exclusive count → never double-counts a token).
- `selectCrossGalaxyCards({query, selfGalaxy, cards, k, threshold})` — exclude self → keep
  `matched>0 ∧ similarity≥threshold` → sort `score↓, similarity↓, galaxy↑` (deterministic) → top-K.
  **Empty / all-stopword query → `[]` (NEVER broadcast).**
- `renderXGalaxyInject(selected, {maxBytes})` — one block, **hard byte cap** (uses `utf8Truncate` even
  when the first card overflows), honest `truncated` flag.
- `loadCardsFromIndex({indexPath, readImpl})` — reads `INDEX.json` `cards[]`; unreadable/garbage index
  → `[]`; a single missing card is skipped, never fatal.
- `maybeInjectCrossGalaxy({slot|galaxy, query, ...})` — the hook/CLI entry. **NEVER throws** (outer
  try/catch → `reason:"error"`). Null/garbage opts → graceful `empty-query`. Resolves galaxy from
  `galaxy` (wins) or `slot` via `galaxyForSlot`. Reasons: `disabled · empty-query · no-cards · no-match
  · injected · error`.

## Anti-broadcast invariant (the milestone's whole purpose)
There is **no code path** where a missing/empty/stopword query, a missing galaxy, or `threshold=0`
emits the full catalog: empty/no-signal query → `[]`; `matched>0` gate still filters at `threshold=0`;
default `k=3` caps the per-prompt path; the byte cap independently halts accumulation; self-exclusion is
no-op-safe when self is unknown. Both scrutiny arms probed this adversarially — it holds.

## Wiring
The consumer is the harness-blocked `slot-context-bundle-inject.mjs` (it already resolves slot→galaxy
+ has the prompt), via golf patch-sibling `state/shared/dashboards/patches/HOOK-PATCH-GCF-XGALAXY-INJECT.md`
(append `maybeInjectCrossGalaxy({galaxy, slot, query}).text` to the bundle when `injected`). Manual lever
live now: `node scripts/xgalaxy-inject.mjs --slot <s> --query "..."`.

## Tests / verification
`scripts/lib/xgalaxy-inject.test.mjs` — 41 `node:test`: scorer table, exclude-self, top-K cap, threshold
floor, empty/all-stopword no-broadcast, malformed-entry skip, deterministic tie-break, byte-cap (incl.
first-card-overflow + multibyte), `loadCardsFromIndex` fail-soft + real-fs e2e, every orchestrator reason
+ env-knob overrides + the throw-path catch + null-opts guard, 2 CLI subprocess oracles. 2-reviewer
per-file scrutiny PASS/PASS (0 P0/P1; arm A verified the byte-cap inviolable + no-broadcast structural,
arm B verified all imports are real + the hyphen-galaxy fix is guarded).

## Knobs
`PRISM_GCF_XGALAXY_DISABLE=1` · `PRISM_GCF_XGALAXY_K=N` (default 3) ·
`PRISM_GCF_XGALAXY_THRESHOLD=F` (0..1, default 0.15) · `PRISM_GCF_XGALAXY_MAX_BYTES=N` (default 3584).

## Deferred (P2/P3, non-blocking)
- Pre-tokenize the card corpus once instead of per `scoreCard` call (micro-efficiency; negligible at 34×1 KB).
- Raise the default threshold once stub cards (e.g. `cad-fusion-live`, `mit-curriculum`) become full —
  at 0.15 a weak 1-of-3-token match against a stub can inject (honest: similarity surfaced in `selected[]`).

Sibling units: [[galaxy_context_federation_card_2026_05_31]] (U-GCF-CARD) · [[mcp-autoreconnect]]
(same pure-core+fail-soft+golf-patch pattern). Memory:
[[reference_galaxy_context_federation_xgalaxy_inject_2026_05_31]]. PSN [[feedback_psn_definition]].
