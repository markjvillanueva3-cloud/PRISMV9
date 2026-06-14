---
schema: ideablock-v1
title: "Engine-to-dispatcher wiring pattern — canonical PRISM workflow for closing the 639-engine wiring backlog"
domain: "PRISM architecture"
category: architecture
version_state: Current
confidence: 0.97
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - PRISM CLAUDE.md §ENGINE WIRING + §MCP DISPATCHERS
  - BUILD_STATE.md auto-snapshot (639 unwired engines, top-domain breakdown)
  - PRISM-INVENTORY-LATEST.md (3314 engines, 97 dispatchers, 8449 actions)
  - U-WIRE-LATHE-BATCH* pattern (canonical reference)
  - U-DISPATCHER-WIRER subagent
extracted_via: human-authored
extracted_at: 2026-05-21T08:55:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-ARCH-WIRING-PATTERN)
---

## Question

639 engines are built but unwired. What's the exact pattern to close the wiring gap, and how do I pick the next batch?

## Answer (canonical — pattern is invariant; pick the batch by top-domain ROI)

### The gap (as of 2026-05-21)

| Metric | Count |
|---|---|
| Total engines on disk | 3314 |
| Wired to a dispatcher | 2675 (81 %) |
| **Unwired (built but invokable nowhere)** | **639 (19 %)** |
| Dispatchers | 97 |
| Total actions (z.enum) | 8449 |

Top unwired domains:

| Domain | Unwired | Bridge dispatcher |
|---|---|---|
| Other (catchall) | 125 | varies per engine |
| Lathe | 67 | `prism_turning` |
| Machine | 13 | `prism_machine_live` / `prism_machine_setup` |
| Multi | 10 | `prism_multi_op` |
| Five (5-axis) | 9 | `prism_5axis` |
| Shop | 8 | `prism_business` / `prism_shop_practice` |
| Hyper (hyperMILL) | 8 | `prism_cam` |
| Outcome | 8 | `prism_business` (analytics) |
| Process | 7 | `prism_process_control` |
| Swiss / Wire / Fusion / Wet | 6 each | `prism_turning` / `prism_edm` / `prism_cam` / `prism_edm` |

### The 6-step wiring workflow (canonical)

For every unwired engine, the workflow is identical. Differences only at step 3 (which dispatcher).

**Step 1 — read the engine.** Identify exports, classes, public methods, Zod input schemas (if any), and side-effect surface (file writes, DB, external calls). `Read mcp-server/src/engines/<EngineName>.ts`.

**Step 2 — verify it's not already wired.** Grep dispatchers for the engine name + check `// WIRE-EXEMPT:` tags. `duplicationGuardEngine.mustCheckBeforeCreating()` for the dispatcher action name.

**Step 3 — pick the dispatcher.** Use the top-domain table above, OR for ambiguous engines route through CLAUDE.md §ENGINE WIRING ("wire to ALL sources that would naturally consume it"). Check `DISPATCHER_DIGEST.md` for the action-count + domain match.

**Step 4 — add the action + schema.** Three coordinated edits in the dispatcher file:
1. Add the action name to the `z.enum([...])` action enum (sorted by domain).
2. Add the input schema to the `inputSchemas` record — Zod schema with `.describe()` on every field.
3. Add the case in the action handler with a lazy import (`(await import("../../engines/<EngineName>.js")).default`) + a single call to the engine's public method + return shaping for the dispatcher contract.

**Step 5 — write the test.** `mcp-server/src/__tests__/<EngineName>-dispatcher.test.ts`:
1. Real-data E2E: invoke the dispatcher with realistic input, assert the output shape + non-stub values.
2. ≥ 3 failure modes: empty input, boundary violation, resource exhaustion.
3. ≥ 2 adversarial inputs: NaN, Infinity, empty string, oversize.
4. Round-trip assertion: the test MUST invoke through the dispatcher (`dispatch({ action: "...", params: {...} })`), not the engine singleton.

**Step 6 — run + commit.** `rtk npm run build:fast && rtk npx vitest run <test-file>`. On green, atomic add+commit (`[SCOPE]/U-WIRE-<DOMAIN>-BATCHn: wire N engines through prism_<dispatcher>`). Verify post-commit via `git log -- mcp-server/src/tools/dispatchers/<file>.ts`.

### Batch sizing — 5-6 engines per commit

The U-WIRE-LATHE-BATCHN pattern: 5-6 engines per batch is the sweet spot.

- **<3 engines/batch** — commit overhead dominates; merge churn higher.
- **5-6 engines/batch** — coherent dispatcher review, single test file pattern, single commit message body.
- **>8 engines/batch** — review burden + scrutiny ledger becomes hard to verify; rollback granularity coarse.

For each domain, target 10-15 batches: at 5 engines × 15 batches = 75 engines (covers the Lathe-67 in 14 batches with a stretch).

### Bridge-to-tribal coupling

When wiring a tactical-domain engine, link the dispatcher action description to the relevant tribal-canon wiki leaf. Example:
- Wiring `LatheChuckJawForceEngine` → `prism_turning:chuck_force` action — link description to `[[workholding-clamp-force-and-selection]]` (operator will see the entry on UserPromptSubmit when the action surfaces).
- Wiring `MillingChipThinningEngine` → `prism_calc:chip_thinning` action — link to `[[machining-tactics-chip-control-and-evacuation]]` §chip-thinning.

This is *the system-injection compound effect*: every wired action references a canonical tribal entry, every canonical entry references the operations it supports, and the wiki-keyword injection surfaces both on every relevant prompt.

### Common failure modes

| Failure | Cause | Fix |
|---|---|---|
| Action name collides with existing | Two domains chose same name | Suffix with domain: `mill_chuck_force` vs `lathe_chuck_force` |
| Schema doesn't match engine signature | Engine takes object, dispatcher passes positional | Read the engine; verify schema property names match function params 1:1 |
| Round-trip test passes but engine breaks in production | Test uses mocks; engine has hidden disk-write or env coupling | Real-data E2E + no mocking the engine itself; only mock external services |
| Wiring hook (`stop_on_unwired_assets`) still flags engine | Engine is exported from a different name than referenced | Match dispatcher's lazy-import `default` vs `named` |
| `wire-exempt` tag misused | Tagging a real orphan to bypass | `WIRE-EXEMPT` is for *wrappers* (singleton patterns) only; never use to silence the hook |

### Variability across domains

| Domain | Wiring pattern caveats |
|---|---|
| **Lathe (67 engines)** | Most are deterministic — chuck force, taper compensation, threading. Standard pattern applies. |
| **Other (125 catchall)** | Audit FIRST — some are legacy stubs that should be deleted, not wired. Read the engine before committing to wiring it. |
| **Five (5-axis)** | Each engine often needs `prism_5axis` AND `prism_cam` AND `prism_safety` (RTCP + collision + singularity). Wire to all three. |
| **Hyper / Fusion (CAM)** | The CAM consumers (`prism_cam`) AND the CAD-side (`prism_cad`) often both need the action — wire to both. |
| **Outcome (8 analytics)** | Often need `prism_business` AND `prism_intelligence` (analytics + recommendation). |
| **Wire / Wet (EDM)** | Wire to `prism_edm` always; check if also needs `prism_safety` (wire-break + thermal limits). |

### Tie-ins (PRISM-side)

- `BUILD_STATE.md` — auto-refreshed unwired count + top-domain breakdown
- `DISPATCHER_DIGEST.md` — dispatcher index + action counts
- `ENGINE_DIGEST.md` — every engine 1-line description
- `duplicationGuardEngine` — pre-create dedup check (also used for action names)
- `dispatcher-wirer` agent — `subagent_type: dispatcher-wirer` for automated wire-team builds
- `U-WIRE-LATHE-BATCHN` units in atomic-roadmap — canonical reference batch
- `stop_on_unwired_assets` Stop hook — HARD-BLOCK on orphans

### Tie-ins (tribal canonical content)

- [[machining-tactics-chip-control-and-evacuation]] — chip-thinning math couples to ChipThinningEngine wiring
- [[tooling-tool-life-and-wear-management]] — Taylor V × T^n = C couples to ToolLifeEngine
- [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] — adaptive engagement couples to AdaptiveEngagementEngine
- [[workholding-clamp-force-and-selection]] — clamp budget couples to ChuckJawForceEngine
- [[synthesis-thermal-envelope]] — thermal partition couples to ThermalCompensationEngine

## Provenance

Distilled from CLAUDE.md §ENGINE WIRING + BUILD_STATE.md live snapshot (2026-05-21: 639 unwired) + U-WIRE-LATHE-BATCHN canonical reference + dispatcher-wirer subagent contract. Authored 2026-05-21 by slot:hotel under U-WIKI-ARCH-WIRING-PATTERN — **27th canonical entry** of the 2026-05-21 wiki+tribal pivot. **Pivot reframe (operator directive 2026-05-21)**: wiki+tribal expansion now bridges *tribal knowledge ↔ PRISM build gaps*. This entry is the first bridge-class entry — canonical wiring pattern that closes the 639-engine wiring backlog through reproducible, batch-sized, tribal-anchored commits.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` auto-surface on `wire engine`, `dispatcher action`, `unwired engine`, `wiring pattern`, `639 unwired`, `U-WIRE`, `BUILD_STATE`, `WIRE-EXEMPT`, `dispatcher-wirer agent`, `engine wiring backlog` keywords. Zero new wiring required.

## Cross-references

- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (reframed 2026-05-21)
- [[feedback_high_roi_backend_first_slot_queue]] — backend-first pickup discipline
- [[reference_tribal_coverage_audit_2026_05_18]] — tribal-coverage audit driving earlier pivot iters
- [[machining-tactics-chip-control-and-evacuation]] — tribal anchor for ChipThinningEngine wiring
- [[tooling-tool-life-and-wear-management]] — tribal anchor for ToolLifeEngine wiring
- [[workholding-clamp-force-and-selection]] — tribal anchor for ChuckJawForceEngine wiring
- [[synthesis-thermal-envelope]] — tribal anchor for ThermalCompensationEngine wiring
- [[feedback_do_optional_high_roi_work]] — standing rule
