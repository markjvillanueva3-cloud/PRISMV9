# cam — slot:kilo

## Current state

**Size:** 12,072 bytes · 129 lines  
**Quality grade:** PARTIAL

**Accurate and load-bearing content found:**
- Domain scope definition (section 1) is correct and concise.
- Cross-galaxy PSN edges (blueprint-vision, cad, post-processor, mill/lathe/wedm, speed-feed, india) are well-articulated with bridge action names.
- India closed-loop integration block (outcome_publish, xproc_kg_project_features, tribal_capture, calibration_monitor_record) is accurate.
- Cross-cutting methodology block (PC specs, Ollama tiers, loops, CAG/RAG/LoRA) is accurate and non-duplicated from main.
- Critic + keep-working stanza (pointer form) is correct.
- AI-systems fleet state pointer block is correct.

**Stale / inaccurate / unverified content found:**
- Section 2 "Constants reference" cites `mcp-server/src/data/cam-vendor-matrix.ts` — DOES NOT EXIST (verified: `NOT_FOUND`). The table itself is therefore misleading; the real vendor registry is `mcp-server/data/state/CAM_VENDOR_REGISTRY.json` (verified present).
- Section 3 "Common cam engines" lists only vague glob-style names (`cam-strategy-*`, etc.) — not the actual verified engine filenames. The four engines listed in the "Key engines (grounded in PATHS.md)" block of the auto-fill section are a mix: `CAMKernelDispatcherBridge.ts` and three registry files (`CoatingRegistry.ts`, `PhysicsMappingRegistry.ts`, `PostProcessorRegistry.ts`) — the registries are not CAM engines per se and their presence here is misleading.
- Section 5/6/7 is explicitly marked STUB — dead weight.
- The Ollama-distilled "Domain knowledge" block (`<!-- GALAXY-CLAUDEMD-FILL:BEGIN -->`) is generic boilerplate describing "recipe engine" and "skill registry" without any verified engine:line citations. Adds no load-bearing value for a kilo operator.
- "High-ROI domain memories" in the fill block lists `node_formula_formula_adjusted_camdispatcher_*` memory refs — these are auto-generated graph-node files (explicitly excluded from corpus counts in MEMORY.md), not operator-useful memory pointers. Noise.
- "Tribal pointers" lists two `tribal-wedm-mcam-*.md` files — WEDM-specific, not CAM-generic; wrong domain in a cam-specialist galaxy CLAUDE.md.
- Section 4 test command is duplicated (appears in both the hand-authored block and the auto-fill block).
- The "Constants reference" table header says "Likely location" — hedging in a doctrine file is an R12 violation. Either verify or omit.

---

## KEEP

- **Section 1 — Domain scope** (lines 5-7): accurate boundary definition (what CAM covers / excludes).
- **Related galaxies block** (lines 32-39): verified PSN edges with correct bridge action names — load-bearing for cross-galaxy wiring work.
- **Closed-loop integration with india** (lines 83-99): the four action names (`xproc_outcome_publish`, `xproc_kg_project_features`, `prism_knowledge:tribal_capture`, `xproc_calibration_monitor_record`) are the daily discipline hooks — keep verbatim.
- **Cross-cutting methodology block** (lines 103-113): PC specs, Ollama tier routing, loop discipline, CAG/RAG/LoRA pointers — accurate, non-duplicated from main.
- **Critic + keep-working stanza** (lines 124-129): correct pointer form.
- **AI-systems fleet state pointer block** (lines 115-122): correct regeneration pointer.
- **Cross-refs block** (lines 76-81): parent doctrine + sibling galaxy links.

---

## DROP

- **Section 2 "Constants reference" table** — cites non-existent `cam-vendor-matrix.ts`; replace with the verified vendor registry path in the ADD section.
- **Section 3 "Common cam engines"** — vague glob names only; replace with verified engine names from PATHS.md.
- **Section 4 "Test commands" (first occurrence)** — duplicated by the auto-fill block; consolidate to one.
- **Sections 5/6/7 STUB block** (line 28-30) — explicitly stub, zero value.
- **`<!-- GALAXY-CLAUDEMD-FILL:BEGIN -->` Ollama-distilled block** (lines 41-73): the "Domain knowledge" paragraph is generic boilerplate; the "Key engines" list conflates CAM engines with registries; the "High-ROI domain memories" are auto-generated graph-node refs (noise). The "Tribal pointers" are WEDM-specific, wrong domain.
- **Duplicate test command** in the auto-fill block (line 69) — keep only the TOOLBELT.md form.
- The auto-fill block's `_Domain-knowledge core auto-populated..._` footer — implementation note, not operator doctrine.

---

## ADD (domain-specific — the heart of this assessment)

### Verified key engines (cite file:line on first use)
From PATHS.md (existence verified):
- `CAMAGIMasterOrchestratorEngine.ts` — top-level CAM reasoning (49K); entry point for full-job orchestration
- `CAMKernelEngine.ts` + `CAMKernelDispatcherBridge.ts` — DXF/SVG/NL intent → strategy pipeline (47K); the NL-to-CAM core
- `CAMCrossSystemTranslatorEngine.ts` — cross-vendor strategy mapping; always pair with `CAM_VENDOR_REGISTRY.json`
- `CAMFeedbackLoopEngine.ts` — india closed-loop tap; must fire on every recommendation
- `hypermill/` (68 engines) — HyperMILL AC bridge, AI orchestration, blade roughing, 5-axis tilt; sub-galaxy
- Toolpath physics (shared, via `prism_toolpath`): `Trochoidal*`, `Adaptive*`, `ScallopHeight*` engines in `mcp-server/src/engines/`

### Verified dispatchers + critical daily actions
All action names verified against `camDispatcher.ts`:
```
prism_cam:cam_strategy_recommend        — physics-aware strategy pick (feature+material+machine)
prism_cam:collision_check_full          — MANDATORY gate; returns clearance number, not bare "safe"
prism_cam:cam_safety_validate           — Ω/S(x) shop-floor gate; must run before any toolpath commit
prism_cam:cam_multiaxis_recommend       — 5-axis swarf/contour + singularity check
prism_cam:cam_material_map              — ISO group → strategy basis
prism_cam:toolpath_generate             — path gen; never hand-roll
prism_cam:cam_strategy_recommend_full   — extended; includes cam_param_optimize + cam_cross_translate
prism_toolpath:strategy_select          — strategy family decision tree
prism_toolpath:simulate                 — Kienzle force + Jaeger temp + Brammertz roughness along path
prism_toolpath:cycle_time_estimate      — accel/corner-aware timing
prism_toolpath:surface_finish_predict   — finish prediction
camFunctionDispatcher:*                 — per-vendor operation catalog (mastercam/fusion360/hypermill/...)
```

### Verified data stores (from PATHS.md registered-db-intake, existence-checked)
- `mcp-server/data/state/CAM_VENDOR_REGISTRY.json` — vendor + strategy compatibility map (10K); USE THIS, not the non-existent `cam-vendor-matrix.ts`
- `mcp-server/data/state/CAM_TRIBAL_RAG_INDEX.json` (5.3M) — NEVER full-read; query via dispatcher
- `mcp-server/data/state/CAM_AI_ACTIONS_INDEX.json` (310K) — jq a key; never full-read
- `ToolpathStrategyDB` (586 entries) — query via `prism_data:database_search`
- `ToolDB` (13,967 entries) — cutting tool database; query via `prism_data:database_search`
- `MaterialDB` (6,509 entries) — material properties; query for ISO group → strategy mapping
- `CoatingRegistry.ts` (100 entries) — tool coating lookup; import, never inline
- `PhysicsMappingRegistry.ts` (1,942 entries) — physics parameter mapping
- `state/shared/corpus/cam-tribal-tips.jsonl` — 928 real-data CAM tribal tips; regen via `scripts/emit-cam-tribal-tips.mjs`

### Domain-specific safety / units / physics rules
- **Units gate (UNITS-FIRST, no exception):** JM Die convention is INCH (`G20`). Fusion 360 internal unit is cm (2.54 trap). hyperMILL project units must be verified per job. A units mismatch in a toolpath = 25.4× scale error. Always check `G20`/`G21` in NC, CAM project setup, and `"unit"` field in tool library BEFORE any strategy/toolpath work. Guard: `scripts/lib/units-guard.mjs`.
- **Physics constants (NEVER inline):** Kienzle kc1.1/mc, Taylor C/n, SFM/IPR/chip-load are owned by `mcp-server/src/physics/constants.ts`. Any `kc1_1`, `kc11_mpa`, `taylor` literal in a CAM engine is a bug — the TOOLBELT grep pattern catches it.
- **Collision check is a hard gate:** `collision_check_full` must produce a clearance NUMBER before any toolpath is committed. "Looks safe" or bare boolean is not acceptable (SOUL.md refuse: `emitting-toolpath-without-collision-check`).
- **Feed/speed limits per machine:** `MachineDB` (1,015 entries) holds per-machine capability limits. A strategy that ignores the target machine's max spindle / feedrate is invalid.
- **5-axis singularity:** `cam_multiaxis_recommend` handles singularity; never hand-compute tilt/lean angles for simultaneous 5-axis — defer to the action.

### Top tribal gotchas for CAM
(Sources: `knowledge/wiki/code-tribal/machining-tactics-*.md`, `cam-tribal-tips.jsonl`)
- **Trochoidal / adaptive engagement control:** chip-load must stay constant at corners; arc-in/arc-out moves are mandatory for HSM — a straight plunge into full-width is a tool-killer.
- **Climb vs. conventional:** climb milling is default for HSM; conventional only for thin-wall finishing or when backlash is a factor. Never mix in the same pass without a strategy flag.
- **Coolant strategy is a strategy parameter, not an afterthought:** through-spindle vs. flood vs. mist changes the recommended chip-load. `cam_material_map` returns the coolant recommendation alongside the strategy.
- **Cross-vendor transfer pitfalls:** `CAMCrossSystemTranslatorEngine` maps strategies but NOT holder geometry — after a Mastercam→hyperMILL transfer, always re-validate holder/tool assembly for clearance.
- **Fixture origin drift:** WCS origin in the CAM program must be verified against the fixture setup sheet before posting. A 0.001" origin error on a precision die cavity is a scrap part.
- **HyperMILL 5-axis blade roughing:** uses a proprietary tilt-angle optimization that differs from generic 5-axis swarf — never substitute `cam_multiaxis_recommend` output directly into a hyperMILL blade-roughing job without a strategy-KB lookup (`cam_hypermill_strategy_kb_for_geometry`).
- **Rest machining stock model:** the rest-machining pass MUST reference an updated in-process stock model, not the raw stock. Fusion 360 rest-machining (`Fusion rest-machining method` — VERIFIED in `knowledge/wiki/cam/cam-foundations.md`) requires an explicit stock source selection.

### What NOT to do in this domain
- **Do NOT** call `prism_cam` actions without first calling `cam_material_map` — material→ISO-group is the foundation of every strategy recommendation.
- **Do NOT** full-read `CAM_TRIBAL_RAG_INDEX.json` (5.3M) or `CAM_AI_ACTIONS_INDEX.json` (310K) — always query via dispatcher or jq.
- **Do NOT** re-extract Mastercam (45 already extracted) or hyperMILL (25 extracted) — check `extraction-log.json` first.
- **Do NOT** write directly to `knowledge/tribal/cam-*.md` — capture via `prism_knowledge:tribal_capture slot=kilo` only (auto-overwritten on regen).
- **Do NOT** reference `mcp-server/src/data/cam-vendor-matrix.ts` — it does not exist; use `CAM_VENDOR_REGISTRY.json`.
- **Do NOT** commit from shared `H:/prism` — commits route to `H:/prism-slot-kilo` on `slot/kilo` branch.
- **Do NOT** inline cutting constants — any `kc1_1`, `taylor`, SFM/IPM literal in a CAM engine is a hard R12 fail.
- **Do NOT** skip `collision_check_full` before toolpath commit — it is a non-negotiable gate, not optional.
- **Do NOT** use retired Ollama tags (`:3b/:7b/:14b/deepseek-r1:14b`) — retired 2026-06-04.
- **Do NOT** spawn a wide Grep/Explore agent for CAM inventory when `prism_cam`, `Glob CAM*.ts`, or `CAM-KNOWLEDGE-INDEX.md` answer it cheaper.

### Canonical resources / corpora
- `H:/prism/state/shared/CAM-KNOWLEDGE-INDEX.md` — compiled CAM knowledge map: 519 CAM wiki leaves + tribal sources + key paths; the one-stop search surface. Regen: `node scripts/cam-knowledge-index.mjs`.
- `H:/PRISM/resources/OPEN MIND/` + `resources/HYPERMILL/` — hyperMILL corpus
- `H:/PRISM/resources/MasterCam/` — Mastercam X8 corpus
- `H:/PRISM/resources/FUSION 360 PROGRAMS/` + `resources/HSMWorks 2027/` — Fusion/HSM corpus
- `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/` — real-shop Fusion CAD+CAM (ELECTRODES, JM, MANNY, OKUMA, ROKU ROKU subdirs)
- `H:/PRISM/JM DIE/OKUMA/hyperCAD-S and hyperMILL Online Training/` — OPEN MIND training corpus
- `knowledge/wiki/cam/cam-foundations.md` (VERIFIED-PARTIAL) — chip-thinning, scallop/cusp, trochoidal mechanism, climb/conventional, Fusion rest-machining; numeric cutting constants are owner-gated
- `knowledge/wiki/training/cam-corpus-index.md` — training corpus index
- Free external corpus (UNVERIFIED — kilo verifies before live use): `knowledge/wiki/cam/_staging/deep-domain-research-2026-06-09.md`
- Vendor catalog corpus: `mcp-server/data/vendor-catalog-db/manifest.json` (425 vendors); per-maker S/F targets in `state/shared/quoting/catalog-sfc-extraction-manifest.json`

---

## IDEAL SECTION OUTLINE

```
## 1. Domain scope + boundaries
   — what CAM covers (toolpath strategy/gen/validation/workholding/cross-vendor/hyperMILL bridge/Fusion bridge)
   — what it EXCLUDES (per-machine physics → mill/lathe/wedm; G-code emission → post-processor)

## 2. Verified key engines
   — CAMAGIMasterOrchestratorEngine.ts (top-level orchestration)
   — CAMKernelEngine.ts + CAMKernelDispatcherBridge.ts (NL intent → strategy)
   — CAMCrossSystemTranslatorEngine.ts (cross-vendor mapping)
   — CAMFeedbackLoopEngine.ts (india closed-loop tap)
   — hypermill/ sub-galaxy (68 engines — blade roughing, 5-axis tilt, AC bridge)

## 3. Dispatcher quick-ref (daily actions)
   — prism_cam primary actions (verified names)
   — prism_toolpath actions
   — camFunctionDispatcher pattern
   — prism_data:database_search for ToolDB/MaterialDB/ToolpathStrategyDB

## 4. Verified data stores
   — CAM_VENDOR_REGISTRY.json (NOT cam-vendor-matrix.ts — that file does not exist)
   — CAM_TRIBAL_RAG_INDEX.json (query only, 5.3M)
   — ToolpathStrategyDB (586 entries), ToolDB (13,967), MaterialDB (6,509)
   — CoatingRegistry.ts + PhysicsMappingRegistry.ts

## 5. Domain safety gates (hard rules)
   — UNITS-FIRST (JM Die = INCH; Fusion internal = cm; units-guard.mjs)
   — Physics constants: import constants.ts, never inline
   — collision_check_full is a mandatory gate (clearance number required)
   — cam_material_map must precede every strategy recommendation
   — 5-axis singularity: defer to cam_multiaxis_recommend

## 6. Top tribal gotchas
   — Trochoidal/adaptive engagement control
   — Climb vs. conventional rule
   — Coolant strategy as a strategy parameter
   — Cross-vendor transfer: strategy maps, holder geometry does NOT
   — Fixture/WCS origin discipline
   — HyperMILL blade-roughing vs. generic 5-axis
   — Rest machining stock model discipline

## 7. What NOT to do
   — (anti-pattern list — see ADD section above)

## 8. Canonical resources / corpora
   — CAM-KNOWLEDGE-INDEX.md (one-stop search surface)
   — resources/ subdirs (hyperMILL, Mastercam, Fusion, HSMWorks)
   — JM DIE corpus paths
   — cam-foundations.md + staging research

## 9. India closed-loop integration
   — xproc_outcome_publish, xproc_kg_project_features, tribal_capture, calibration_monitor_record
   — outcome-bus-auto-tap.mjs fires automatically if not manually called

## 10. Cross-galaxy PSN edges
    — blueprint-vision, cad, post-processor, mill/lathe/wedm, speed-feed, india

## 11. AI synergy posture
    — Pointer to AWARENESS.md (6 AI engines, 37 dispatcher actions, hybrid RAG active)
    — galaxy-reasoning-bridge.mjs cam "<question>" ($0 local)
    — Ollama routing: strategy summarize/classify → qwen2.5-coder:32b; deep domain → gpt-oss:120b

## 12. Maintenance / tooling
    — Test cmd: cd mcp-server && rtk npx vitest run -t "CAM|Toolpath|Strategy"
    — cam-galaxy-verify.mjs (8 health checks)
    — cam-knowledge-index.mjs (regen CAM-KNOWLEDGE-INDEX.md)
    — cam-awareness-snapshot.mjs (regen awareness surface)
    — Extraction log: check before re-extracting Mastercam/hyperMILL

## 13. Commit / worktree discipline
    — Commit to H:/prism-slot-kilo on slot/kilo branch
    — NEVER git stash in shared H:/prism

## [POINTER] Universal-core doctrine
    — See bottom of this file (one-liner pointer to main CLAUDE.md)
```

---

## UNIVERSAL-CORE POINTER

The following rules are universal across all 26 slots and must NOT be duplicated into this galaxy file. They are enforced by the global hooks stack and remain authoritative in the main `H:/prism/CLAUDE.md`:

- **R1–R15** (Karpathy discipline + agent-era rules R5–R15) — especially R12 (fail loud), R13 (comprehensive route), R15 (wire→test→validate→all-galaxies)
- **Scrutiny gate** (3-of-3: `node .claude/scripts/scrutiny-3way.mjs`) — blocks Stop until PASS
- **Per-chat handoff** (`per-agent-handoff.mjs read/write`) — read at session start, write at session end
- **Commit format** `[SCOPE]/U-ID: title`
- **Duplication guard** (`duplicationGuardEngine.mustCheckBeforeCreating()` THROWS on dup)
- **No-stub rule** (hook blocks placeholder returns)
- **UNITS-FIRST** (slot-level universal; the CAM-specific application is in §5 of this file)
- **Physics constants** (`src/physics/constants.ts` only — never inline)
- **Golf slot / fleet reaper / scrutiny gate / hook enforcement** — global, not replicated here

**Pointer line to add at bottom of galaxy CLAUDE.md:**
```
> Universal rails (R1–R15, scrutiny gate, handoff, commit format, duplication guard, no-stub):
> `H:/prism/CLAUDE.md` — read once per session via the precompact/startup handoff; do NOT duplicate here.
```
