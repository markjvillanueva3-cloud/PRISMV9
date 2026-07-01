---
name: reference-delta-cad-galaxy-synergy-audit-2026-05-28
description: "delta CAD-galaxy 11-leg PSN synergy audit (session f27ecf49). Result: 9/11 legs green; closed Wiki (3 bridges registered in index) + built a custom delta-cad-awareness-inject.mjs hook (wired C:+H:, 7/7 tests, LIVE). PROVEN bug: prism_knowledge:tribal_capture auto-categorizes cad tips to general/process_engineering, NEVER cad — so tribal-by-domain-inject (reads domain=cad) gets 0 hits. The awareness hook is the durable tribal bridge."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.541Z
aliases: reference_delta_cad_galaxy_synergy_audit_2026_05_28
---


# delta CAD-galaxy synergy audit (2026-05-28, session f27ecf49)

Workflow-driven audit of the delta CAD galaxy across the 11-leg PSN (operator: *"do you truly have all… synergized with PSN + /system-viz + master graph + AI + NN + GNN + lora + prism awareness"*). Goal-clear = synergize domain, wired, tested, validated.

## Per-leg verdict
9/11 green. Two gaps closed this session:
- **Wiki (#3):** the 3 CAD architecture bridges (`cad-galaxy`, `cad-step-toolchain`, `cad-electrode-generation`) existed on disk but were **orphan** — not in `knowledge/wiki/index.md`, so undiscoverable via `/wiki-query`. NOW registered in index + log.md.
- **PRISM awareness (custom):** built `.claude/hooks/delta-cad-awareness-inject.mjs` — the operator's primary ask. See below.

⏳ deferred (not delta-blocking): System-viz (#6, next regen-viz cron) · NN/GNN (#10, india's eval UNGRADED fleet-wide).

## Custom domain-awareness hook (operator's "make a custom one so you always have context")
`.claude/hooks/delta-cad-awareness-inject.mjs` — UserPromptSubmit, gate = `slot==delta || cad-keyword` (regex over cad/step/electrode/trilobe/brep/topology/archetype/regen/taptite/sinker/tessellat/fusion/…), knob `PRISM_DELTA_CAD_AWARENESS_DISABLE`, fail-safe (`main().catch(approve)` — never blocks a prompt). Surfaces: top CAD engines · `prism_cad` 564+367+11+37 action surface · toolchain CLIs · regen state paths · corpus + JM ref · the 5 known-failures (R12). **WIRED** C:+H: settings (node-spliced into UPS group 0 after [[reference_tribal_by_domain_inject|tribal-by-domain-inject]], identical both files → zero drift), **TESTED** 7/7 `node:test`, **LIVE** (verified firing in-session). Built in main tree via the documented `PRISM_CROSS_WORKTREE_BYPASS` (fleet hook must live in main; correct fleet-wide immediately, unlike the worktree galaxy CLAUDE.md which the galaxy-cascade hook won't serve until golf merges slot/delta).

## PROVEN BUG (R12) — tribal_capture domain auto-categorizer never lands on "cad"
`prism_knowledge:tribal_capture` ignores the passed `domain:"cad"` + `category:"cad"` and **auto-categorizes**: 2 cad captures this session returned `domain="general"` (tk-cap-…-803) and `domain="process_engineering"` (tk-cap-…-804). `tribal-by-domain-inject.mjs` reads `TRIBAL_TIP_INDEX.json`, which is **absent fleet-wide** → **0 hits for every domain** (not cad-specific). **CORRECTION (2026-05-28, post-workflow-audit, R12):** the CAD tribal leg is NOT empty — delta's own `state/shared/cad-tribal-corpus.jsonl` holds **21 entries** (populated). Two separable gaps remain: (a) `tribal_capture`'s auto-categorizer mis-routes new captures away from `cad`; (b) the fleet `tribal-by-domain-inject` read-store is missing. Neither means CAD tribal knowledge is absent — delta's corpus is live and the awareness hook surfaces the load-bearing failures.

**Why:** the auto-categorizer (`auto_categorized:true`) overrides the explicit domain with a content-inferred one that never normalizes to the slot-domain vocabulary (`cad`).

**How to apply:** until the categorizer respects an explicit `domain`/`slot` argument (a fleet-infra fix, not delta-scope), the `delta-cad-awareness-inject` hook is the durable CAD-tribal bridge — it hard-codes the 5 known-failures and fires every delta prompt. Future unit: `U-TRIBAL-CAPTURE-RESPECT-EXPLICIT-DOMAIN`. Related: [[reference_delta_cad_dispatcher_surface]] · [[reference_tribal_by_domain_inject]].

See galaxy MEMORY.md `## Synergy audit` table for the full per-leg matrix. Commit: `3d9c05d1` on slot/delta.
