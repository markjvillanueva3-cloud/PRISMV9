## cad-fusion-live — fleet-managed

### Current state

**Size:** ~95 lines / ~4,200 bytes (CLAUDE.md). MEMORY.md ~101 lines. PATHS.md ~115 lines. TOOLBELT.md ~29 lines. SOUL.md ~47 lines. AWARENESS.md ~37 lines.

**Quality grade: PARTIAL**

Issues found in the current CLAUDE.md:

1. **Engine list in §"Key engines (grounded in PATHS.md)" is mostly false positives.** The PATHS.md admits the 236 engine list is a "keyword match — prune false positives." Engines like `AutoCADAddinPluginEngine`, `AutoCADDotNetBridgeEngine`, `BatchDeliverableEngine`, `BobCADCAMBridgeEngine`, `BliskCADEngine`, `CADAccessControlRBACABACEngine` are NOT cad-fusion-live engines — they are general CAD/other engines that happened to match the name-heuristic. Only `Fusion360LiveBridgeEngine`, `Fusion360MillTurnBridgeEngine`, `AutodeskFusionMCPProxyEngine`, `FusionProjectCrawlerEngine`, `HyperCADSElectrodeEngine` are grounded in MEMORY.md with verified file:line. The CLAUDE.md's §"Key engines" section misleads any chat that reads it.

2. **TOOLBELT.md §"This galaxy's dispatchers" is an empty stub.** Despite MEMORY.md having a fully verified list of 14+ `prism_cad` actions and 8+ `prism_cam` actions (all grep-confirmed in cadDispatcher.ts + camDispatcher.ts), TOOLBELT.md reads "_(owning slot lists the domain's prism_* dispatcher actions here)_". This is the highest-value missing piece for a cad-fusion-live chat.

3. **§"Domain knowledge" (Ollama-distilled block) is vague and partly inaccurate.** "Port assignments are crucial to prevent conflicts between different Fusion instances, with specific ports designated for CAM and CAD functionalities" — the real detail (`:18360` primary, `:18361` CAM, `:18362` CAD, `:18365` navigate-by-reference from delta seat-UI memory) is in MEMORY.md but not surfaced in CLAUDE.md. The distilled prose adds no operational value beyond MEMORY.md.

4. **§"Tribal pointers" cites two wiki pages not specific to cad-fusion-live.** `math-cad-geometry-nurbs-gdt.md` and `quality-first-article-inspection-and-spc-cadence.md` are generic manufacturing tribal; the real domain-specific tribal is in `knowledge/wiki/code-tribal/templates/cad-fusion-360__*.md` (assembly, boolean-csg, brep-topology — cited in MEMORY.md but absent from CLAUDE.md).

5. **§"Constants reference" (§2) is a stub.** "Fusion 360 API endpoint registry + auth-token handling + session-lifetime defaults" — no actual values cited. The real operational constants (port `:18360`, retry backoff `[100,500,2000]`, max 3 retries, toolpath timeout 180s, UI-thread barrier 60s) are buried in MEMORY.md and not promoted to CLAUDE.md.

6. **§"Common engines" (§3) duplicates the vague stub pattern.** "`Fusion360*` engines (cross-galaxy mill-turn bridge); `cad-fusion_*` skills" — non-specific, no file paths.

7. **§"Test commands" appears twice** (§4 and inside the GALAXY-CLAUDEMD-FILL block) — minor but wastes tokens.

8. **Cross-cutting methodology block (§"Cross-cutting methodology")** is 300+ tokens of general fleet doctrine (Ollama model tags, LoRA gates, CAG/RAG philosophy, loop rules) copy-pasted from the fleet template. This is generic, drifts, and belongs as a pointer to the universal core, not inline.

9. **The AWARENESS.md reports "AI engines attributed: 0 / AI dispatcher actions: 0 / reasoning/neural bridges: 0"** — which contradicts reality (14+ f360_live_* actions verified in cadDispatcher). The AWARENESS.md generation script did not find them because the galaxy-owned engine list is the noisy 236-item false-positive list rather than the real 5 verified engines.

---

### KEEP

From CLAUDE.md — these sections are accurate and load-bearing:

- **§1 Domain scope** — accurate, concise.
- **§Related galaxies (PSN edges)** — correct and load-bearing; the four cross-galaxy edges (cad/cam/mill/lathe) match MEMORY.md cross-galaxy section.
- **Standing patterns / invariants** (from MEMORY.md — this content should be promoted to CLAUDE.md):
  - Loopback-only + kill switch (`PRISM_FUSION_RAW_DISABLE=1`)
  - UI-thread marshalling rule (CustomEvent + threading.Event, 60s barrier)
  - Multi-instance isolation via port-claim (NOT automatic via `SO_REUSEADDR`)
  - `/new`-first per cycle invariant
- **Port assignments** (`:18360` primary, `:18361` CAM, `:18362` CAD) — keep, promote to CLAUDE.md §Constants.
- **§Critic + keep-working contract** (pointer block) — accurate pointer, low token cost, keep.
- **Known failure modes** (MEMORY.md) — accurate, operational.
- **§AI-systems fleet state pointer block** — keep as-is (pointer, low cost).

---

### DROP

All of these are wasting tokens per turn:

1. **Entire §"Domain knowledge" Ollama-distilled prose block** — vague restatement of what's already in MEMORY.md; remove and replace with the precise constants from MEMORY.md.
2. **§"Key engines" false-positive list** (AutoCADAddinPluginEngine, BobCADCAMBridgeEngine, etc.) — replace with the 5 verified engines.
3. **§"Common engines" stub (§3)** — pure stub, remove.
4. **§"Constants reference" stub (§2)** — replace with actual values.
5. **Duplicate §"Test commands" block** — keep one only.
6. **§"Cross-cutting methodology" inline prose** (Loops, Obsidian vault, Harness/LoRA/CAG/RAG) — ~320 tokens of generic fleet doctrine already in global CLAUDE.md; collapse to 1-line pointer.
7. **§"Tribal pointers" citing generic wiki pages** — replace with the real cad-fusion-live tribal: `knowledge/wiki/code-tribal/templates/cad-fusion-360__*.md`.
8. **TOOLBELT.md §"Shared token-lean patterns"** — generic fleet pattern already in global CLAUDE.md; collapse to pointer. The dispatcher section is the only thing TOOLBELT.md needs to add.
9. **PATHS.md §"Engines (name-matched)"** — the 236-item false-positive list should be pruned to the 5 verified engines + a note that PATHS.md reflects name-heuristic only.

---

### ADD (domain-specific — the heart of this assessment)

**A. Verified dispatcher action surface (highest priority — currently a stub in TOOLBELT.md)**

`prism_cad` actions (verified cadDispatcher.ts L137-141):
- Live CAD ops: `f360_live_sketch`, `f360_live_extrude`, `f360_live_fillet`, `f360_live_chamfer`, `f360_live_revolve`, `f360_live_hole`, `f360_live_pattern`, `f360_live_combine`, `f360_live_shell`, `f360_live_export`, `f360_live_geometry`, `f360_live_undo`, `f360_live_new_doc`, `f360_live_execute_raw`
- Script generation: `f360_generate_script`, `f360_from_description`, `f360_parametric_script`, `f360_convert_cadquery`
- File parsing: `cad_f3d_parse`, `cad_f3d_parse_f3z`
- Advanced geom routes (U-CADFL-SWEEP-LOFT, 2026-06-03): `f360_live_sweep`, `f360_live_loft`, `f360_live_create_sketch_offset`

`prism_cam` actions (verified camDispatcher.ts L1580, L1420):
- CAM introspection (read-only): `f360_live_operations`, `f360_live_toolpath_validity`, `f360_live_cycle_time`, `f360_live_materials`
- 5-axis: `fusion_5x_generate`, `fusion_5x_get_machine`, `fusion_5x_get_all_machines`, `fusion_5x_calculate_angles`, `fusion_5x_singularity_proximity`
- Mill-turn: `cam_hypermill_millturn_strategy`, `cam_hypermill_millturn_multichannel`, `cam_hypermill_millturn_full_strategy`

**B. Verified engine list (replace false-positive PATHS.md list)**

Five verified engines for this galaxy (file existence confirmed):
1. `mcp-server/src/engines/Fusion360LiveBridgeEngine.ts` — PRISM-side HTTP client for `prism_api_server.py`; typed CAD-op methods + ExtractedAction replay; retry `[100,500,2000]` ms, max 3 retries, toolpath timeout 180s.
2. `mcp-server/src/engines/Fusion360MillTurnBridgeEngine.ts` — mill-turn machine + sub-spindle handoff; `SpindleConfigSchema` (zod).
3. `mcp-server/src/engines/AutodeskFusionMCPProxyEngine.ts` — JSON-RPC 2.0 client for Autodesk official MCP (ENGINE_DIGEST line 137).
4. `mcp-server/src/engines/FusionProjectCrawlerEngine.ts` — recursive Fusion 360 cloud-project crawler (ENGINE_DIGEST line 1013).
5. `mcp-server/src/engines/HyperCADSElectrodeEngine.ts` — typed electrode engine (7 ops); ships codegen Python through the hyperCAD-S live bridge.

**C. Domain constants section (replace stub §2)**

```
Add-in host:     http://127.0.0.1:18360  (primary bridge)
CAM instance:    http://127.0.0.1:18361  (kilo fork)
CAD instance:    http://127.0.0.1:18362  (delta fork)
Nav-by-ref:      http://127.0.0.1:18365  (delta seat-UI navigate-by-reference)
Retry backoff:   [100, 500, 2000] ms — max 3 retries
Toolpath timeout: 180s
UI-thread barrier: 60s (CustomEvent + threading.Event)
Fusion API unit:  cm (multiply by 2.54 for inch input — trap)
Kill switch:     PRISM_FUSION_RAW_DISABLE=1 (gates /execute_raw)
```

**D. Domain-specific safety rules ("what NOT to do")**

- **NEVER call `adsk.fusion` off the UI thread** — Fusion crashes silently; every API call must be marshalled via CustomEvent to the main thread.
- **NEVER bind two Fusion instances to the same port via `SO_REUSEADDR`** — they cross-route to ONE shared active doc; assign distinct ports BEFORE the add-in runs and verify with a behavioral leak-test (timeline jump), not netstat.
- **NEVER skip `/new` at the start of a replicate cycle** — a non-reset extrude `operation:"new"` ADDS a body to the real document; `/new` is the isolation guarantee.
- **NEVER treat `coverage_state:"COMPLETE"` in the function-index map as real** — actual fn-index coverage is ~82-85%; the field is stale/wrong per MEMORY.md.
- **NEVER rebuild from scratch on a "Could not resolve" build error** — self-merge the slot worktree with `cad-fusion-live-ms0` branch first.
- **NEVER move off Fusion 360 as primary CAD** — operator-locked per `reference_delta_fusion_fully_accounted_2026_05_29`.
- **NEVER use retired Ollama tags** (`:3b/:7b/:14b` retired 2026-06-04); use `qwen2.5-coder:32b` for code/lint, `gpt-oss:120b` for deep CAD domain reasoning.
- **NEVER inline Fusion API constants** (ports, timeouts, retry counts) — they must come from the constants section of this CLAUDE.md or `mcp-server/src/physics/constants.ts` where applicable.
- **NEVER assume Fusion auth tokens are long-lived** — refresh before each session; stale tokens fail silently (SOUL.md refuse: `overriding-auth-token-without-refresh`).

**E. Domain-specific tribal / wiki pointers**

Real cad-fusion-live tribal (currently absent from CLAUDE.md):
- `knowledge/wiki/code-tribal/templates/cad-fusion-360__assembly.md`
- `knowledge/wiki/code-tribal/templates/cad-fusion-360__boolean-csg.md`
- `knowledge/wiki/code-tribal/templates/cad-fusion-360__brep-topology.md`
- `knowledge/wiki/lessons/cad-fusion-live-ms0-h-drive-archaeology.md`
- `knowledge/wiki/architecture/engines/fusion/` (6 engine wiki pages: fusion360millturnbridgeengine, fusion360functionindexengine, fusion360safetyhooksengine, fusion360aiorchestrationengine, etc.)
- Synthesis brain: `knowledge/memories/patterns/cad-fusion-live_synthesis.md` (24 domain memories distilled)
- Domain wiki leaf: `knowledge/wiki/cad-fusion-live/` (5 entries)

**F. Resource corpus (promote to CLAUDE.md §Resources)**

Domain-specific roots (from PATHS.md critical-resource-roots block — already verified):
- `H:/PRISM/resources/FUSION360` — Fusion 360 reference corpus
- `H:/PRISM/resources/FUSION POSTS` — Fusion post-processor library
- `H:/PRISM/resources/fusion-addin` — add-in source/versions
- `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES` — 1,163 native `.f3d` parts + STEP exports (CAM handoff ground truth)
- `resources/fusion360/prism-api-server/` — the live add-in: `prism_api_server.py`, `manifest.json`, `test_prism_api_server.py`, `INSTALL.md`

**G. Cross-galaxy order flow (operational doctrine, currently only in MEMORY.md)**

Canonical order flow (operator-locked `reference_order_flow_canonical_2026_05_27`):
> Fusion 360 CAD (delta) → hyperMILL CAM (echo, mill path) OR Fusion/Mastercam (echo/india, lathe path) → Master Post (echo, G-code) → JM Die VMC/lathe controller

This galaxy is the LIVE TRANSPORT for that flow — it does not own the CAD geometry (delta/cad does) nor the toolpath strategy (kilo/cam does); it owns the real-time API session that connects them.

**H. Add-in install / lifecycle ops (operational, absent from CLAUDE.md)**

- Add-in runs on `runOnStartup:false` — must be manually started in Fusion each session
- `INSTALL.md` at `resources/fusion360/prism-api-server/INSTALL.md` is the canonical install guide
- Health check: `GET http://127.0.0.1:18360/health` — expect 200 before any op
- `test_prism_api_server.py` is the integration smoke test

---

### IDEAL SECTION OUTLINE

```
# cad-fusion-live Galaxy CLAUDE.md

## 1. Domain identity + scope                     [KEEP — tighten §1]
## 2. API constants & connection spec             [REWRITE — replace stub with real values]
## 3. Verified engines (5)                        [REWRITE — replace false-positive list]
## 4. Dispatcher actions                          [ADD — f360_live_* + fusion_5x_* full table]
## 5. Add-in lifecycle (install / health / start) [ADD — new section]
## 6. Standing invariants & safety rules          [ADD — promote from MEMORY.md]
## 7. "What NOT to do" (domain-specific refuses)  [ADD — 9 rules above]
## 8. Cross-galaxy order flow                     [ADD — promote from MEMORY.md]
## 9. Domain corpus & tribal pointers             [REWRITE — replace generic tribal with real ones]
## 10. Resource roots (domain-specific subset)    [KEEP — already in PATHS.md; pointer here]
## 11. Known failure modes                        [ADD — promote from MEMORY.md]
## 12. Test commands                              [KEEP — one copy only]
## 13. Cross-refs + PSN edges                     [KEEP — tighten]
## 14. Universal-core pointer                     [ADD — see below]
```

Sections to keep in TOOLBELT.md (separate file):
```
## Dispatcher quick-ref (full action table — the stub replaced by §4 above)
## Token-lean patterns pointer (one line → global CLAUDE.md)
## Karpathy 5-step (pointer → global CLAUDE.md)
## Ollama tier routing for this domain (qwen2.5-coder:32b for code; gpt-oss:120b for deep CAD reasoning)
```

---

### UNIVERSAL-CORE POINTER

The galaxy CLAUDE.md must include ONE pointer block (not duplicating the content):

```markdown
## Universal doctrine (pointer — do NOT duplicate inline)
> All of the following live in `H:/PRISM/CLAUDE.md` and apply unchanged to this galaxy.
> Read that file for detail; this galaxy file only adds domain-specific overrides above.

- R1–R15 rules (Karpathy 4 + agent-era 9 + R13 comprehensive + R14 close-bg-tasks + R15 wire-test-validate-all)
- 3-of-3 scrutiny gate (`node .claude/scripts/scrutiny-3way.mjs`) + per-file 2-arm gate
- Per-chat handoff discipline (`per-agent-handoff.mjs write/read`) + topic-naming hook
- Commit format `[SCOPE]/U-ID: title` + slot-worktree lane discipline
- Units-first mandate (G20/G21 / STEP unit field / tool-library unit field)
- No-stub-engines gate (`comprehensive-build-enforce` hook)
- Duplication guard (`duplicationGuardEngine.mustCheckBeforeCreating()` THROWS)
- Ollama fallback ladder (Ollama → Sonnet subagent → Opus; never silently promote mechanical work)
- Safety: NEVER inline physics constants — import from `mcp-server/src/physics/constants.ts`
- Golf slot + fleet-reaper ownership
- CANONICAL SOURCES OF TRUTH table (PRISM-INVENTORY-LATEST.md, ENGINE_DIGEST.md, etc.)
```
