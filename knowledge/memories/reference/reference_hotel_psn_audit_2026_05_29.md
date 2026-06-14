---
name: reference_hotel_psn_audit_2026_05_29
description: Hotel business-galaxy 11-leg PSN workflow audit — 9 PASS / 2 PARTIAL + the exact LEG-11 wiring remediations (tribal orphan + AISystemRouter business branch)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.148Z
aliases: reference_hotel_psn_audit_2026_05_29
---


Hotel (galaxy:business) 11-leg PSN audit via workflow w45bkd76w (3 agents, 1.17M tokens, 421s, 2026-05-29). **Verdict: 9 PASS / 2 PARTIAL.**

PASS: Obsidian brain (MEMORY.md all 5 headers, 22 [[links]] resolve), Wiki (3 bridges, real), Memories (10 galaxy + back-pointer line 43), Tribal (21 tips/17 cats), PRISM-OS (operatingSystemDispatcher 51 actions), Engines (businessDispatcher 879 cases / 603 lazy-imports / 292 engine files), Algorithms (johnsons/cpm/eoq/abc), Formulas (npv/irr/breakeven + import-not-inline discipline), System-viz (business + hotel are graph nodes), NN/GNN (generate-hotel-domain-features emits 381 nodes/3 axes), custom awareness (hotel-domain-awareness.mjs + /aware-hotel), PRISM-AI dispatcher (prism_business wired).

**LEG 11 (PRISM AI routing) — the only domain-owned gap, 2 items (both env-blocked, NOT design):**

1. **HotelERPTribalKnowledgeEngine is an UNWIRED ORPHAN.** It exists ONLY in the slot/hotel worktree (17.7K, 21 tips), NOT in main; `businessDispatcher.ts` (main) has 0 `hotel_tribal` refs. The "wired via prism_business:hotel_tribal_{list,query,stats}" line in the engine HEADER + propagated into galaxy CLAUDE.md §8.5 + MEMORY.md is **ASPIRATIONAL, not true** (corrected in the brain 2026-05-29). Blocked because the engine + the current 879-action dispatcher live in different trees — editing the stale worktree dispatcher would merge-conflict main. **Remediation (when slot/hotel → main, or bring engine to main first):** add `hotel_tribal_list|hotel_tribal_query|hotel_tribal_stats` to the businessDispatcher action enum (near line 1037) + a handler block mimicking `business_sync_stats` (@ businessDispatcher.ts:5088): `const { hotelERPTribalKnowledgeEngine } = await import("../../engines/HotelERPTribalKnowledgeEngine.js"); result = {...}`. Until wired it trips `stop_on_unwired_assets` — left UNTRACKED this session, flagged.

2. **AISystemRouterEngine.classify() has no business branch.** (main, `mcp-server/src/engines/AISystemRouterEngine.ts`, 11.5K). 11 TaskClasses (physics_validation, engine_building, ml_inference, batch_processing, reasoning, code_review, search, blueprint_extraction, corpus_harvest, calculation, unknown) — "run payroll"/"quote job" falls through to `unknown`. **Remediation:** add `"business_ops"` to the `TaskClass` union (def is above line 55) + a classify branch BEFORE `return "unknown"` (line 108): `if (/(quote|invoice|payroll|ledger|accounting|customer|vendor|\berp\b|hotel|work[\s-]?order|cost(ing)?|capacity|scheduling|billing|kaizen|osha)/.test(t)) return "business_ops";` + a `route()` switch case → primary `local-mcp`/`prism_business` (Claude for judgment, deterministic GL/payroll math to engines per R5) + a test. **Deferred this session:** host was OOMing (viz regen exit 134) + Ollama dead; a `tsc` build on shared routing infra was the wrong risk — a half-built classify edit that fails to compile breaks fleet-wide routing.

PARTIAL legs 6 (system-viz regen OOM — sierra's domain) + 10 (GNN AUROC globally ungraded — india's embed issue) are **global infra**, not hotel-galaxy gaps. Audit advisory: wiki entries + 6/10 memories are terse-but-correct (expand business-financial-invariants.md on next pass).

Links: [[reference_hotel_business_galaxy_2026_05_28]] · the audit was the adversarial cross-check that caught what my inline self-audit missed (I'd trusted the engine's header claim — R8 "looks orthogonal" failure).
