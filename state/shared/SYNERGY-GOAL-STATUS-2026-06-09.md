# SYNERGY GOAL — fleet orchestration status / dispatch map

> **Source goal (operator /loop /goal):** *"synergize ollama (correct models for gpu/cpu/nvme/128GB RAM), docker, qdrant, obsidian vault app, PSN, /system-viz, prism galaxies, prism front end and back end build, claude.md, memories, wiki, tribal knowledge, prism awareness, gsd, tdd, skills, scripts and hooks | everything wired, tested, validated and synergized across the entire system, node by node, galaxy by galaxy."*
>
> This goal is **fleet-scope (26 NATO slots)**, NOT satisfiable from a single chat. The autonomous Stop gate correctly never marks it "met" for any one slot. This ledger is the **fan-out map** so each slot validates/synergizes ITS clause; an orchestrator (zebra/golf) or the operator dispatches the `UNKNOWN` rows. Built by slot **charlie** 2026-06-09 from directly-verified state + the operator-canonical slot-domain map (`state/shared/CHAT-SLOT-DOMAINS.md`).
>
> **Honest rule:** charlie marks PASS only for clauses it personally verified this session. Everything else is `UNKNOWN -- needs owner` (NOT assumed done -- R12, no fabrication of peer state).

## Clause status

| # | Clause | Owner slot(s) | State (2026-06-09) | Evidence / dispatch note |
|---|--------|---------------|--------------------|--------------------------|
| 1 | ollama models pulled + GPU/RAM fitness | alpha (token-opt) / fleet | **PASS** (charlie-verified) | 10 models, Blackwell-fitted (gpt-oss:120b 60.9GB < 96GB VRAM; 0 retired pulled; all routing targets covered). `reference_ollama_roster_fitness_audit_2026_06_09`. Residual: retired-tag refs in `aiReasoningActionSchemas`/`OllamaTaskOffloader`/`AISystemRouter` -> **india/alpha** verify dispatcher resolution. |
| 2 | ollama runtime up | fleet | **PASS** (charlie-verified) | `/api/version` v0.30.6. |
| 3 | docker | golf/juliett/fleet | **PASS** (charlie-verified) | 4 containers up+healthy: prism-qdrant, prism-postgres (healthy), grafana, prometheus. |
| 4 | qdrant | juliett (db) | **PASS** (charlie-verified) | healthz passed; 3 collections (prism_engines, prism_formulas, prism_skills). |
| 5 | prism BACKEND build | papa/fleet | **PASS** (charlie-verified) | `npm run build:fast` esbuild EXIT 0, all galaxies' engines bundle (~4200 files). NOTE: build:fast = bundle only; full `tsc --noEmit` typecheck NOT run this session. |
| 6 | prism FRONTEND build + test | charlie / quebec | **PARTIAL** | Backend quoting tests all green (1923). Frontend: fixed missing ResizeObserver polyfill (`62b114cb7b`) which UNMASKED 10 pre-existing quoting-frontend test failures. charlie owns 1 (quote-pages, needs runtime debug); hotel owns 9 (QuoteAnalyticsPage incl a real .length null-bug + JMDieFleetScan). `reference_quoting_frontend_test_repair_2026_06_09`. Full web build (`vite build`) + non-quoting pages NOT validated -> **quebec**. |
| 7 | galaxy: **quoting** | charlie | **DONE this session** | margin-floor gate engine->dispatcher->UI (`ec597dbcb3`,`87d5c4bf9a`), routing-matrix coverage (`4b0980c56a`), ResizeObserver polyfill (`62b114cb7b`). 40/40 touched tests. Open: U-QP-ACCOUNTING-WIRE (heavy, needs agents) + the unmasked frontend fails. |
| 8 | galaxies: mill, lathe, wedm, cam, cad, post-proc, speed-feed, business, academy, system-viz, db-expansion, blueprint-vision, hermes-zulu, fleet-hygiene, discovery, tribal, ai-training, frontend-app (+ all others) | foxtrot, whiskey, mike, kilo, delta, echo, oscar, hotel, lima, sierra, juliett, xray, bravo/zebra, golf, tango, (various), india, quebec | **UNKNOWN -- needs owner** | Each slot synergizes ITS galaxy (wire->test->validate->all-galaxies, R15). Not charlie's to validate or claim. |
| 9 | obsidian vault app | alpha / sierra | **PARTIAL/UNKNOWN** | charlie's 5 memories this session auto-feed C:->H:->Obsidian at Stop (partial contribution). Vault APP integration + bidirectional sync (HMEMV04-06) status -> **alpha/sierra**. |
| 10 | PSN (11-leg synergy net) | fleet (per-leg owners) | **UNKNOWN** | NN/GNN leg (#10): SELECTIVE-DEPLOY AUROC 0.808 @tau=0.7 (india, surfaced live). Other 10 legs per-owner. |
| 11 | /system-viz | sierra | **UNKNOWN -- needs owner** | The canonical fleet task/roadmap surface; sierra owns regen + roosts. |
| 12 | claude.md | golf (root edits) / alpha | **UNKNOWN -- needs owner** | Cross-slot CLAUDE.md synergization. |
| 13 | memories / wiki / tribal knowledge | alpha / sierra / fleet | **PARTIAL/UNKNOWN** | +4 charlie memories this session. Wiki<->tribal coverage 17.1% (SessionStart audit) -> owner re-embed. Tribal index V8-cap incident resolved (golf, 2026-06-08). |
| 14 | prism awareness | fleet (regen) | **UNKNOWN** | `generate-claude-brief.mjs` / awareness-snapshot regen -- any slot can refresh; not validated this session. |
| 15 | gsd / tdd / skills / scripts / hooks | papa / golf / fleet | **UNKNOWN -- needs owner** | Hook health (`hook-health-check.mjs`), skill triggers, script validation -> owner sweep. |

## Dispatch summary
- **5 fleet-general clauses VALIDATED** by charlie (rows 1-5) -- the infra/runtime/build floor is green.
- **1 galaxy DONE** (quoting, row 7) + **1 PARTIAL** (frontend, row 6, split charlie/hotel/quebec).
- **~9 clause-groups UNKNOWN** (rows 8-15) -- owned by 20+ peer slots; require per-slot validation, NOT single-chat work.
- **Orchestrator action:** assign rows 8-15 to their owning slots (per `CHAT-SLOT-DOMAINS.md`); each runs its galaxy/clause through wire->test->validate->all-galaxies. The goal closes when every row reads PASS/DONE, validated by its owner -- not before, and not by any one slot claiming the whole.

_Regen/extend: any slot appends its verified PASS to its row (with commit evidence). Do not mark a peer's row done on their behalf (R12)._
