# cad-fusion-live Galaxy — fleet-managed (delta/kilo touch; no dedicated slot)
> Universal rails (R1-R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama->Sonnet->Opus ladder · wiki protocol):
> -> `H:/prism/CLAUDE.md`. THIS file = cad-fusion-live domain doctrine ONLY; never re-inline universal prose.

## 1. Domain scope

**Owns:** live Fusion 360 API session management (HTTP bridge to add-in), real-time CAD-op dispatch
(`f360_live_*`), Fusion cloud project crawling, mill-turn live bridges, 5-axis CAM introspection,
`.f3d`/`.f3z` file parsing.

**EXCLUDES:** CAD feature recognition -> cad (delta). CAM toolpath strategy -> cam (kilo). G-code
emission -> post-processor (echo). Lathe physics -> lathe (whiskey). EDM -> wedm (mike).

**Fleet-managed** — no dedicated slot. delta owns CAD geometry; kilo owns CAM toolpaths; both use this
galaxy for the live Fusion transport layer. Any slot may work here; claim via `/pick-unit` + heartbeat.

**Active branch:** `cad-fusion-live-ms0`.

## 2. Verified engines

Confirmed against `mcp-server/data/docs/ENGINE_DIGEST.md` (line numbers cited):

| Role | Engine (under `mcp-server/src/engines/`) | Digest |
|---|---|---|
| PRISM-side HTTP client for add-in; typed CAD-op methods + ExtractedAction replay; retry [100,500,2000]ms max 3; toolpath timeout 180s | `Fusion360LiveBridgeEngine.ts` | L993 |
| Mill-turn machine + sub-spindle handoff; SpindleConfigSchema (zod) | `Fusion360MillTurnBridgeEngine.ts` | L995 |
| JSON-RPC 2.0 client for Autodesk official MCP | `AutodeskFusionMCPProxyEngine.ts` | L137 |
| Recursive Fusion 360 cloud-project crawler | `FusionProjectCrawlerEngine.ts` | L1013 |

> The 236-item PATHS.md engine list is a keyword-match false-positive dump -- do NOT treat it as
> verified. Names like AutoCADAddinPluginEngine, BobCADCAMBridgeEngine, BliskCADEngine are NOT
> cad-fusion-live engines.

## 3. Dispatcher quick-ref

**`prism_cad`** -- live CAD ops (cadDispatcher.ts L137-142):

| Action | Use |
|---|---|
| `f360_live_new_doc` | isolation reset -- MUST be first call each cycle |
| `f360_live_sketch` | create sketch on face/plane |
| `f360_live_extrude` | extrude sketch profile |
| `f360_live_fillet` | fillet edges |
| `f360_live_chamfer` | chamfer edges |
| `f360_live_revolve` | revolve profile |
| `f360_live_hole` | drill hole feature |
| `f360_live_pattern` | rectangular/circular pattern |
| `f360_live_combine` | boolean combine bodies |
| `f360_live_shell` | shell a body |
| `f360_live_export` | export to STEP/F3D/STL |
| `f360_live_geometry` | query geometry state |
| `f360_live_undo` | undo last op |
| `f360_live_execute_raw` | raw add-in call (gated: PRISM_FUSION_RAW_DISABLE=1) |
| `f360_generate_script` | generate Fusion Python script |
| `f360_from_description` | NL description -> Fusion ops |
| `f360_parametric_script` | parametric script generation |
| `f360_convert_cadquery` | CadQuery -> Fusion |
| `cad_f3d_parse` | parse .f3d -> timeline (cadDispatcher.ts L317) |
| `cad_f3d_parse_f3z` | parse .f3z multi-doc archive (cadDispatcher.ts L318) |

**`prism_cam`** -- CAM introspection + 5-axis + mill-turn (camDispatcher.ts L1420, L1580):

| Action | Use |
|---|---|
| `f360_live_operations` | read CAM operations from live session |
| `f360_live_toolpath_validity` | validate toolpath |
| `f360_live_cycle_time` | query cycle time estimate |
| `f360_live_materials` | query material assignments |
| `fusion_5x_generate` | generate 5-axis toolpath |
| `fusion_5x_get_machine` | get machine definition |
| `fusion_5x_get_all_machines` | list all machines |
| `fusion_5x_calculate_angles` | calculate 5-axis tilt angles |
| `fusion_5x_singularity_proximity` | check singularity proximity |
| `cam_hypermill_millturn_strategy` | hyperMILL mill-turn strategy |
| `cam_hypermill_millturn_multichannel` | multi-channel mill-turn |
| `cam_hypermill_millturn_full_strategy` | full mill-turn strategy |

Full action lists: cadDispatcher.ts ACTIONS array · camDispatcher.ts ACTIONS array.

MCP-down fallback: `curl http://127.0.0.1:18360/health` (expect 200 before any op).

## 4. Canonical constants + data paths

```
Add-in bridge (primary):   http://127.0.0.1:18360
CAM instance (kilo fork):  http://127.0.0.1:18361
CAD instance (delta fork): http://127.0.0.1:18362
Nav-by-ref (delta UI):     http://127.0.0.1:18365
Retry backoff:             [100, 500, 2000] ms -- max 3 retries
Toolpath timeout:          180 s
UI-thread barrier:         60 s (CustomEvent + threading.Event)
Fusion API unit:           cm  (multiply by 2.54 for inch input -- trap: see §5)
Kill switch:               PRISM_FUSION_RAW_DISABLE=1  (gates f360_live_execute_raw)
```

NEVER inline these values in engine code -- read from this constants block.
NEVER inline physics constants -- import from `mcp-server/src/physics/constants.ts`.

JM Die Fusion corpus: `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES` (1,163 .f3d parts + STEP exports).
Access via `prismSelfAwarenessEngine.getJMDieCustomerPath()` -- NEVER Glob the full tree.

## 5. Domain gotchas / safety rails

1. **Fusion API unit is cm, not inch.** Raw inch value passed as cm = 2.54x undersized geometry.
   Multiply by 2.54 before every API call when input is in inches. No auto-conversion in the bridge.

2. **All Fusion API calls must be marshalled to the UI thread.** Off-thread `adsk.fusion` calls crash
   Fusion silently (no exception, no log). Use CustomEvent dispatch + 60s threading.Event barrier.

3. **Port isolation is behavioral, not kernel-level.** `SO_REUSEADDR` does NOT isolate two Fusion
   instances -- they cross-route to ONE shared active document. Assign distinct ports BEFORE the add-in
   runs; verify with a behavioral leak-test (timeline jump), not netstat.

4. **`f360_live_new_doc` MUST be the first call each replicate cycle.** Skipping it means
   `operation:"new"` on extrude adds a body to the REAL open document, not an isolated scratch doc.

5. **`coverage_state:"COMPLETE"` in the function-index map is stale.** Actual fn-index coverage is
   ~82-85%; never gate a build decision on this field.

6. **Add-in is `runOnStartup:false`.** Must be manually started in Fusion each session before any
   `f360_live_*` call. A 500 on `:18360/health` = add-in not running, not a network error.

## 6. What NOT to do

- **NEVER reference `HyperCADSElectrodeEngine` as a verified cad-fusion-live engine** -- it is a
  `ghost.unwired` node in system-viz only, NOT in ENGINE_DIGEST; treat as unverified.
- **NEVER use the 236-item PATHS.md engine list** as a verified reference -- keyword-match false
  positives only.
- **NEVER call `f360_live_sweep`, `f360_live_loft`, `f360_live_create_sketch_offset`** -- NOT in
  cadDispatcher.ts ACTIONS array; verify before using.
- **NEVER move off Fusion 360 as primary CAD** -- operator-locked
  (`reference_delta_fusion_fully_accounted_2026_05_29`).
- **NEVER rebuild from scratch on "Could not resolve" build error** -- self-merge slot worktree with
  `cad-fusion-live-ms0` branch first.
- **NEVER use retired Ollama tags** (`:3b/:7b/:14b` retired 2026-06-04).
- **NEVER assume Fusion auth tokens are long-lived** -- refresh before each session; stale tokens fail
  silently.
- **NEVER write tribal knowledge directly to `knowledge/tribal/*.md`** -- use
  `prism_knowledge:tribal_capture slot=<nato>`; tribal files are auto-overwritten.

## 7. Domain workflow / pipeline contract

This galaxy is the **live transport layer** for the canonical order flow
(`reference_order_flow_canonical_2026_05_27`):

```
Fusion 360 CAD (delta/cad galaxy)
  -> hyperMILL CAM (echo, mill path)
  -> OR Fusion/Mastercam (echo/india, lathe path)
  -> Master Post (echo, G-code emission)
  -> JM Die VMC / lathe controller
```

Per-cycle op sequence (mandatory order):
1. `GET :18360/health` -- verify add-in running
2. `f360_live_new_doc` -- isolation reset (MANDATORY)
3. CAD ops (`f360_live_sketch` -> `f360_live_extrude` -> feature ops)
4. CAM introspection (`f360_live_operations`, `f360_live_toolpath_validity`)
5. `f360_live_export` -- hand off to cam/kilo or post-processor/echo

## 8. Tribal + corpus pointers

- Synthesis brain: `knowledge/memories/patterns/cad-fusion-live_synthesis.md`
  (may not exist on disk -- verify with Glob before reading; query via
  `prism_memory:semantic_search query="cad-fusion-live" topK=20`)
- Domain wiki: `knowledge/wiki/cad-fusion-live/` -- query `knowledge/wiki/index.md` first
- Tribal capture: `prism_knowledge:tribal_capture slot=<nato>` -- NEVER write tribal/*.md directly
- JM Die corpus: `prismSelfAwarenessEngine.getJMDieCustomerPath()` for
  `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES`

## 9. Cross-galaxy edges (PSN)

| Direction | Galaxy | What crosses |
|---|---|---|
| CONSUMES <- | cad (delta) | recognized features feed live Fusion model state |
| EMITS -> | cam (kilo) | live toolpath preview from Fusion session |
| BRIDGE | mill (foxtrot) | mill-turn live bridges; real-time parameter binding |
| BRIDGE | lathe (whiskey) | mill-turn live bridges; sub-spindle handoff |
| EMITS -> | post-processor (echo) | f360_live_export feeds G-code emission pipeline |

## 10. Closed-loop integration (india)

```
prism_ai:xproc_outcome_publish { slot: '<nato>', domain: 'cad-fusion-live' }  // UNVERIFIED action name
```
Tribal capture each session: `prism_knowledge:tribal_capture slot=<nato> domain=cad-fusion-live`.
Spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

## 11. Test commands

```bash
cd mcp-server && rtk npx vitest run -t "Fusion|CadFusionLive|f360"
```

Add-in health probe (requires Fusion running with add-in active):
```bash
curl http://127.0.0.1:18360/health
```

## 12. Known bugs / open threads

- `coverage_state:"COMPLETE"` in Fusion function-index map is stale (~82-85% actual coverage).
- `HyperCADSElectrodeEngine` is `ghost.unwired` in system-viz -- needs wiring audit before use.
- Open roadmap units: `mcp-server/data/roadmap-index.json` (filter `cad-fusion-live`).

## 13. AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs cad-fusion-live "<question>"
```

Ollama routing:
- Summarize Fusion session log / classify UI element / lint engine code: `qwen2.5-coder:32b`
- Deep CAD domain reasoning / cross-galaxy synthesis: `gpt-oss:120b`

---

## AI Synergy (PSN leg #10)

This galaxy is an AI-substrate **consumer** (no dedicated AI engines of its own; `aiEngineCount` 0).
It participates in PRISM's AI systems through the shared, fleet-wide substrate:

- **Reasoning bridge** (`scripts/lib/galaxy-reasoning-bridge.mjs`, PSN leg #10): **CAG** + **RAG** hybrid
  reasoning over this galaxy's own doctrine corpus (CLAUDE.md / SOUL.md / MEMORY.md / synthesis) via the
  local Ollama stack -- `node scripts/lib/galaxy-reasoning-bridge.mjs cad-fusion-live "<question>"`.
- **Vault -> LoRA**: this galaxy's Obsidian **synthesis** brain (`knowledge/memories/patterns/cad-fusion-live_synthesis.md`)
  feeds the fleet **LoRA** training dataset (`scripts/vault-to-lora-dataset.mjs`).
- **GNN** (GraphSAGE) tier-5: this galaxy's ghost-wiring candidates are classified by the **neural** wiring-inference
  cascade; **embedding**-based semantic recall surfaces its memories.
- **Cross-substrate edges**: typed `owned-by-slot` + `documented-by` + `embeds` edges connect it into the
  system-viz graph (`scripts/generate-cross-substrate-edges.mjs`).

**Domain angle:** Long-running CAD / Fusion live-session reasoning + feature recognition draw on this shared substrate.

_Measured by the AI-synergy audit (`scripts/audit-ai-synergy.mjs`, dimension `discoverability`). This section
documents verified-true substrate participation -- it is doctrine, not duplication._
