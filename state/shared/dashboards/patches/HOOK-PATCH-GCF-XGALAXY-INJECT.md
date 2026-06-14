> **✅ WIRE DONE 2026-06-02 (commit `0cb6a94b2c`, slot:alpha — golf-night workload).** `maybeInjectCrossGalaxy` is wired into `slot-context-bundle-inject.mjs` `main()`. **Two adaptations from this spec (R8 — the hook drifted since 2026-05-31):** (1) the spec's anchors (`renderGalaxyAffinity` append @170, `emit(summary,liveBrain)` @206) no longer exist — affinity now renders *inside* `fmtSummary`, emit is an inline `process.stdout.write` @~229. Wired the inject right after `let summary = fmtSummary(...)`, before the write. (2) Used **DYNAMIC** import (`pathToFileURL`+`await import` in try/catch) NOT the spec's static import — a malformed/missing xgalaxy lib then degrades to no-inject instead of crashing the whole bundle hook fleet-wide (matches this hook's established fail-soft pattern for zulu-context-bundle/octopus-live-brain). E2E verified: substantive alpha prompt → bundle **+** `## 🌌 Cross-galaxy context` (3 cards, self=token-optimization excluded); `/checkin` ceremony prompt → bundle only, no xgalaxy (no-match, by design); `node --check` clean; lib 41/41.
>
> **⚠ Doc-reflection PENDING (peer-locked — needs main-tree/owner apply):** the §CLAUDE.md rule + §MEMORY.md pointer below are NOT yet applied (CLAUDE.md is peer-locked doctrine + MEMORY.md is near its 24576-byte ceiling; both are main-tree-write-blocked from a slot worktree). The CLAUDE.md line should now read "**wired** (commit `0cb6a94b2c`)" not the future-tense "(golf patch ...)" phrasing. The feature memory [[reference_galaxy_context_federation_xgalaxy_inject_2026_05_31]] + wiki [[xgalaxy-inject]] were shipped with the lib on 2026-05-31.

# HOOK-PATCH — selective cross-galaxy card inject (GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-XGALAXY-INJECT-WIRE)

> PATCH-SIBLING for **golf**/integrator. `.claude/hooks/*.mjs` are harness-exec HARD-blocked from a
> slot worktree, so alpha shipped the tested lib + CLI and this wiring spec; the hook edit must
> happen from the main tree. Author: claude-da9aacf5 slot alpha · 2026-05-31.
>
> **What this wires:** Phase C of the federation. U-GCF-CARD built per-galaxy ≤1 KB context-cards;
> U-GCF-CAG-CARDS cold-anchored the full 34-card bundle (breadth, "available if needed"). This unit
> adds the WARM, per-prompt SELECTIVE surface: inject ONLY the top-K OTHER galaxy cards most relevant
> to THIS task — NEVER all 34. Mirrors `master-index-precheck-inject`'s "top-5 ranked hits" pattern.

## Shipped + tested (alpha-writable, committed this session)
- `scripts/lib/xgalaxy-inject.mjs` — pure scorers (`parseCardRole`/`scoreCard`/`selectCrossGalaxyCards`/
  `renderXGalaxyInject`) + injected-fs `loadCardsFromIndex` + fail-soft `maybeInjectCrossGalaxy`
  orchestrator. Reuses (R8) `tokenize` (master-index-search-lib), `utf8Truncate`/`DEFAULT_ROOTS`
  (galaxy-context-card), `galaxyForSlot` (slot-galaxy-map). 41/41 `node:test`; 2-reviewer per-file
  scrutiny PASS/PASS (0 P0/P1).
- `scripts/mcp` … no — `scripts/xgalaxy-inject.mjs` — CLI: `node scripts/xgalaxy-inject.mjs --slot alpha
  --query "..." [--json] [--galaxy G] [--index P] [--k N] [--threshold F]`. ALWAYS exits 0.
  Manual lever, runnable now: `node H:/prism/scripts/xgalaxy-inject.mjs --slot alpha --query "qdrant memory schema"`.

## Consumer choice (R7 — the BETTER wire, with rationale)
**Primary = `slot-context-bundle-inject.mjs`** (UserPromptSubmit, ZULU-OMNISCIENT-MS0). It ALREADY
resolves `ctx.slot` + `galaxy` from the session payload (lines 26-49: `resolveSlotContext` →
`SLOT_GALAXY_MAP[slot]`) and ALREADY has the user prompt (line 48). So cross-galaxy inject needs
**zero new slot-resolution code** there — just one fail-soft call appended to the bundle `parts[]`.
(`master-index-precheck-inject.mjs` was the original handoff target, but it does NOT carry the slot and
SKIPS slash-commands/<8-char prompts — it would need a new session→slot resolver. Prefer the bundle hook.)

## The edit — `slot-context-bundle-inject.mjs` (verified against HEAD this session)
Add the import near the top (after the `SLOT_GALAXY_MAP` import, ~line 76):
```js
import { maybeInjectCrossGalaxy } from "../../scripts/lib/xgalaxy-inject.mjs";
```

The hook's `main()` builds a `summary` string then `emit(summary, liveBrain)` (~line 206). `ctx.slot`
(from `loadSlotContext`, line 162) and `envelope.prompt` (the stdin payload field) are both in scope.
Insert the selective inject right after the galaxy-affinity append (line 170,
`summary += "\n" + renderGalaxyAffinity(ctx);`) and BEFORE `emit(...)`:
```js
// U-GCF-XGALAXY-INJECT: selective cross-galaxy card inject (top-K, similarity-gated, NEVER broadcast).
// Fail-soft — the lib never throws, but guard anyway so a bad card can never break the bundle.
try {
  const xg = maybeInjectCrossGalaxy({ slot: ctx.slot, query: String(envelope.prompt || "") });
  if (xg && xg.injected && xg.text) summary += "\n" + xg.text;
} catch { /* never break the bundle */ }
```
(`slot: ctx.slot` → the lib resolves the galaxy via `galaxyForSlot` and excludes it as self. Confirm the
prompt field name in your build is `envelope.prompt` — `main()` already reads `envelope.session_id` from
the same object, so `envelope` is in scope.)

### ⚠ Integration seam (the `.ok`/`.up`-style lesson — read this)
- `maybeInjectCrossGalaxy` returns `{ ok, injected, count, text, reason, galaxy, selected }`.
  **Gate on `xg.injected && xg.text`, NOT on `xg.ok`** — `ok:true` is also returned for the
  `empty-query` / `no-cards` / `no-match` branches (with `injected:false, text:""`). Appending on
  `ok` alone would push an empty string.
- Pass **both** `galaxy` and `slot: ctx?.slot`. `galaxy` (string) wins; `slot` is the fallback the lib
  resolves via `galaxyForSlot` if `galaxy` is null (unmapped/odd session). If both are null the lib
  still works — `selfGalaxy=""` simply excludes nothing (no crash, no broadcast).
- The lib reads `state/shared/galaxy-cards/INDEX.json` via its default path; no extra args needed.
- This hook fires on EVERY prompt incl. slash-commands. For a slash command the query tokenizes to
  weak/no signal → `no-match` → no inject (fail-soft, no noise). Acceptable — substantive prompts get
  the cards, ceremony prompts don't.

## settings.json
NO change — `slot-context-bundle-inject.mjs` is already wired UserPromptSubmit.

## Knobs (already in the lib — no settings change)
`PRISM_GCF_XGALAXY_DISABLE=1` (off) · `PRISM_GCF_XGALAXY_K=N` (top-K, default 3) ·
`PRISM_GCF_XGALAXY_THRESHOLD=F` (similarity floor 0..1, default 0.15) ·
`PRISM_GCF_XGALAXY_MAX_BYTES=N` (total inject budget, default 3584).

## CLAUDE.md rule (apply to the peer-locked CLAUDE.md — doctrine reflection; ≈ after the federation card entry)
```md
## GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-XGALAXY-INJECT (2026-05-31, slot alpha) — selective cross-galaxy card inject
Phase C: per-prompt, inject ONLY the top-K OTHER galaxy ≤1 KB context-cards most relevant to the active query — NEVER all 34 (the cold-anchored ALL-CARDS.md bundle already covers breadth). `scripts/lib/xgalaxy-inject.mjs` (`maybeInjectCrossGalaxy({slot|galaxy, query})`): tokenize query → score each card by query-token overlap (role-line hits weigh 2×) → exclude self → filter similarity≥threshold → top-K → hard byte cap. Pure-core + injected-deps + fail-soft (never throws, never broadcasts: empty/no-signal query → no inject). Reuses tokenize/utf8Truncate/galaxyForSlot (R8). Wired into `slot-context-bundle-inject.mjs` (golf patch `HOOK-PATCH-GCF-XGALAXY-INJECT.md`). Manual: `node scripts/xgalaxy-inject.mjs --slot <s> --query "..."`. 41/41 tests, 2-rev PASS. Knobs: PRISM_GCF_XGALAXY_{DISABLE,K,THRESHOLD,MAX_BYTES}. Wiki: [[xgalaxy-inject]]. Memory: [[reference_galaxy_context_federation_xgalaxy_inject_2026_05_31]].
```
And one MEMORY.md pointer line under the federation/standing entries:
```md
- [cross-galaxy selective inject](reference_galaxy_context_federation_xgalaxy_inject_2026_05_31.md) — top-K relevant OTHER galaxy cards per prompt, similarity-gated, NEVER broadcast; reuses tokenize+galaxyForSlot. CLAUDE.md §U-GCF-XGALAXY-INJECT.
```

## Verify (after golf applies the wire)
- `node H:/prism/scripts/xgalaxy-inject.mjs --slot alpha --query "qdrant memory schema migration" --json`
  → JSON with `reason:"injected"`, `selected[0].galaxy` a DB/persistence galaxy, self (token-optimization) excluded.
- `node --test H:/prism/scripts/lib/xgalaxy-inject.test.mjs` → 41/41.
- Submit a substantive prompt in a slot chat → bundle shows a `## 🌌 Cross-galaxy context` block with ≤K cards; a `/checkin`-style prompt shows none (no-match, by design).

Logic shipped: `scripts/lib/xgalaxy-inject.mjs` + `scripts/xgalaxy-inject.mjs`.
Wiki: [[xgalaxy-inject]]. Memory: [[reference_galaxy_context_federation_xgalaxy_inject_2026_05_31]].
