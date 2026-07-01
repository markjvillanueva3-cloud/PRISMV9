---
session: claude-d7f7d3ce
topic: netplat-marketplace
slot: hotel
written_at: 2026-05-31T01:41:15.841Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-d7f7d3ce
status: active
---

# HANDOFF: claude-d7f7d3ce
Updated: 2026-05-31T01:41:15.841Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-d7f7d3ce

## STATE
No state provided.

## RESUME
DOCTRINE CHANGE 2026-05-30 [[feedback_each_slot_merges_own_galaxy]]: golf NO LONGER sole merger — hotel merges its OWN galaxy to MAIN + wires its own dispatcher actions. 30 engines shipped this session on slot/hotel (QB-PARITY 22 + NETPLAT 8), ALL WIRE-EXEMPT + NOT yet in MAIN. NEXT = self-merge to MAIN (the real 'done' gate). *** CLOBBER RISK (verified): slot/hotel is -41916 lines vs cad-fusion-live-ms0 on 56 dispatcher files (MAIN ~2021 commits ahead) — NEVER 'git merge slot/hotel->main' (clobbers MAIN dispatchers). CHERRY-PICK only the additive commits instead. *** SAFE STEPS (fresh full-context session, NOT under tight budget): (1) git fetch + reconcile cad-fusion-live-ms0 vs origin (1-behind, other PC). (2) cherry-pick my additive commits cad-fusion-live-ms0..slot/hotel onto MAIN (QB-PARITY U-QBP-01..22 + NETPLAT U-P0-06+/U-P1-01..05 + earlier U-PSGB-HOTEL-*) — new files clean; resolve GeneralLedgerEngine.ts/PayrollEngine.ts conflicts if MAIN diverged. (3) in MAIN add chart-extensions to GeneralLedgerEngine.CHART_OF_ACCOUNTS: 2150 Customer Escrow, 4200 Marketplace Commission Rev, 1499 Undeposited Funds. (4) wire ~30 action families into MAIN's 879-action businessDispatcher (ACTIONS enum + switch + lazy import). (5) npm run build + vitest + node scripts/wiring-audit (0 orphans) + round-trip E2E. Read [[feedback_each_slot_merges_own_galaxy]] for the full method.

## CONTEXT

