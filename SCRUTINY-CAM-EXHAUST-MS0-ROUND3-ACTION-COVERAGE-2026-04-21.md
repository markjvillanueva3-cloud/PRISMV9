# SCRUTINY ROUND-3 — Action Coverage Matrix (5 parallel agents)
## Can PRISM generate a complete, inventory-aware CAM program from a print today?
## Date: 2026-04-21 | Framework: 40 verbs × 5 CAMs = 200 verb-cells

**Ultimate goal anchor:** PRISM AI generates a complete CAM program from an engineering print, using JM Die Company's actual shop inventory (21 machines, real tool crib, real material stock, real fixtures, real posts).

**Methodology:** Each of 5 Explore agents scored 40 verbs (SETUP 6 / GEOMETRY 5 / STOCK 4 / FIXTURE 4 / TOOLS 6 / OPERATIONS 8 / SEQUENCE 3 / SIMULATE 3 / POST 1) as **I** (implemented, callable, inventory-aware) / **S** (stub, signature only) / **M** (missing) / **N** (not applicable). Each cell backed by a file:line citation or a "no implementation found" note.

---

## AGGREGATE VERB-COVERAGE SCOREBOARD

| CAM | I | S | M | Confidence | Inventory-aware verbs | Key unique blocker |
|---|---|---|---|---|---|---|
| **Mastercam**    | 1  | 13 | 26 | **0.14** | 1 (flute_count) | Adapter is read-only — no operation creation OLE methods |
| **hyperMILL**    | 4  | 24 | 12 | **0.29** | 1 (tool crib selector, unw ired in HM context) | `HyperMillPRISMPlugin.dll` missing from build path |
| **Fusion 360**   | 4  | ~20 | ~16 | **0.24** | 0 live | 2 code-gen templates exist but **no `adsk.cam.CAM.operations.create()` invocation anywhere** |
| **Inventor HSM** | 6  | 3  | 30 | **0.18** | 3 (iPart, post, partial tool) | 726-line adapter orphaned — zero dispatcher reaches it |
| **SolidCAM**     | 3  | 16 | 21 | **0.24** | 0 | Port-18363 SolidWorks bridge is dead code — no verb dispatches to it |
| **AGGREGATE**    | 18/200 (9%) | 76/200 (38%) | 105/200 (52.5%) | **~0.22** | **5/200 (2.5%)** | Operation-creation verbs are **0/40 implemented across all 5 CAMs** |

**Key insight: The 0.69 aggregate from Round-2 was catalog coverage — parameter inventory. This round's 0.22 is actionability — whether those parameters can actually be pushed into a CAM program. The gap is 0.47.**

---

## CROSS-CAM PATTERN — 5 UNIVERSAL GAPS

### Universal Gap 1 — Zero operation creation across all 5 CAMs  [BLOCKER]

Of 8 op-creation verbs × 5 CAMs = **40 op-creation cells**: **0 scored I**. Every CAM has typed operation schemas, strategy enums, and recommenders; none has a live `create_rough_op` / `create_finish_op` / etc. that instantiates an operation in the target CAM software.

| CAM | create_rough | create_finish | create_drill | create_thread | set_op_parameters |
|---|---|---|---|---|---|
| Mastercam | M | M | M | M | S |
| hyperMILL | S | S | S | S | S |
| Fusion 360 | S | S | S | S | S |
| Inventor HSM | M | M | M | M | S |
| SolidCAM | S (iMachining=**I** ↘ only exception) | S | M | M | — |

**The single exception:** SolidCAM `create_imachining_op` is **I** — `SolidCAMiMachiningEngine.ts` has a real Technology Wizard (1-8) + morphed spiral + moating + chip load implementation. This is the only fully-implemented operation-creation verb across all 200 cells. Everything else stops at parameter recommendation and falls short of operation instantiation.

**Why this is blocker #1:** No operation creation = no program. The ultimate goal ("generate CAM program from print") is literally gated on this single verb class.

### Universal Gap 2 — Inventory is in PRISM, invisible to CAMs  [BLOCKER]

The JM Die shop inventory (`jm-die-profile.ts`, `ShopConfigurationEngine`, `InventoryAwareToolSelectorEngine`, `MaterialStockEngine`, fixture library) **exists**. The CAM adapters **don't reach it**.

Per-CAM inventory-aware verb counts:
- Mastercam: **1** (flute_count reads from a tool object, not from the JM Die crib)
- hyperMILL: **1** (tool crib selector exists but not wired into HM flow)
- Fusion 360: **0** live (3 schemas define the fields, but zero execution)
- Inventor HSM: **3** (iPart naming, controller root, partial tool schema)
- SolidCAM: **0** end-to-end

**Also critical:** `jm-die-profile.ts` lists CAM systems as `["mastercam", "esprit", "fusion360", "hypermill"]` — **Inventor HSM and SolidCAM are NOT registered as JM Die CAM systems.** The shop profile drifted from the priority-5 set. That's a literal correctness bug in shop definition.

### Universal Gap 3 — Geometry import not driven by PRISM  [HIGH]

`import_step` / `import_iges` scored I only as **code-generation templates** (Fusion360, FreeCAD). No CAM has an I-scored live geometry-import action. "Print → Geometry" is therefore pre-PRISM; PRISM receives existing projects, it doesn't create them from STEP/IGES. For the print→program pipeline, step 2 of 10 is missing.

### Universal Gap 4 — Post invocation is stubbed everywhere  [HIGH]

All 5 CAMs generate NC **header comments** (`generateNCHeader()`). None actually invokes the target CAM's post-processor pipeline:
- Mastercam: `generateNCHeader()` adds PRISM comments, no NET-Hook post invoke
- hyperMILL: no post binding to JM Die's 21 controllers
- Fusion 360: no `adsk.cam.postProcess()` call with a specific `.cps` file
- Inventor HSM: generates header only
- SolidCAM: `GPP_CONTROLLER_MAP` exists, no GPP execution

Even if operations existed, no CAM path produces actual G-code from PRISM today. Step 10 of 10 is missing too.

### Universal Gap 5 — Simulation exists generically, not CAM-specific  [MEDIUM]

`CollisionDetectionEngine.ts` is real (193KB) but **not called from any of the 5 CAM adapters**. `collision_check` scored S on 4 of 5 CAMs and I only on Inventor HSM (via physics `analyzeOperation()`, not geometric simulation). `stock_removal_simulate` is S or M everywhere. No CAM has gouge check. Verification is a PRISM-side physics analysis, not a CAM-side simulation invocation.

---

## PER-CAM UNIQUE BLOCKERS (beyond universals)

| CAM | Unique blocker | Fix effort |
|---|---|---|
| Mastercam | Adapter is read-only; no OLE methods for `Mastercam.IO.Operation` tree mutation | 2-3 sessions — extend `MastercamPluginAdapterEngine` with CREATE verbs |
| hyperMILL | `HyperMillPRISMPlugin.dll` **missing** — adapter is interface-only | 1-3 sessions — locate under `plugins/hypermill/` or generate C# stub |
| Fusion 360 | JSON-RPC handler has **no case statements invoking `adsk.cam.Setup.create()` / `adsk.cam.Operation.create()`** — API surface reachability = 5% | 2 sessions — add 8 op-creation handlers |
| Inventor HSM | Adapter orphaned — **no dispatcher reaches it** even after Round-2 wiring added `cam_function_route` | 1 session (single dispatcher case: `cam_inventor_hsm_adapter`) |
| SolidCAM | Port-18363 SolidWorks bridge is **dead code**; `adapter_protocol: "com-ilogic"` still mislabeled (should be `"com-sw"`) | 10-min label fix + 1 session to wire the bridge |

---

## WHAT'S ALREADY IMPLEMENTED (the 18 I-scored cells)

Ranked by domain impact:

1. **SolidCAM `create_imachining_op` + `set_technology_wizard_level`** — by far the deepest real implementation; iMachining is a differentiator. SolidCAM's iMachining engine is actually closer to "full control" than any other CAM's equivalent.
2. **Inventor HSM `create_project` + `set_wcs_origin` + `post_process_to_controller_from_inventory`** — adapter has the most setup coverage but is dispatcher-orphaned, so effectively inaccessible.
3. **Mastercam / hyperMILL / Fusion `import_step+iges`** — code-generation templates only (never executed against real API).
4. **All 5 CAMs `set_flute_count`** — trivial schema read.
5. **SolidCAM / Inventor HSM `collision_check`** — scored I by reusing PRISM-side engines; not a CAM-side verify call.
6. **hyperMILL `minimize_tool_changes`** — generic sequencer, not HM-specific.

**Interpretation:** The only domain-deep I-scored verb across all 200 cells is **SolidCAM iMachining**. Everything else is either a schema read, a code-gen template, or a generic PRISM-side analysis reused. That's a 1/200 = **0.5% deep-implementation rate**.

---

## REVISED PATH TO "PRINT → PROGRAM WITH JM DIE INVENTORY"

Ordered by leverage. Each unit is ~1 session unless noted.

| # | Unit | Coverage delta | Target CAMs |
|---|---|---|---|
| 1 | **Fix SolidCAM `adapter_protocol` `com-ilogic` → `com-sw`** | +0.05 SolidCAM | SolidCAM (10 min) |
| 2 | **Wire Inventor HSM adapter to a dispatcher action** | +0.10 HSM | Inventor HSM |
| 3 | **Add `jm-die-profile.ts` `cam_systems` entries for inventor-hsm + solidcam** | +0.05 each | HSM, SolidCAM |
| 4 | **Wire SolidWorks port-18363 bridge to `cam_solidcam_import_sldprt` action** | +0.15 SolidCAM | SolidCAM |
| 5 | **Scaffold 8 operation-creation dispatcher actions per CAM** (`cam_<slug>_create_rough/finish/drill/...`) — stubs that invoke the adapter's OLE/JSON-RPC/Python bridge | +0.25 each | all 5 |
| 6 | **Implement `InventoryAwareToolSelectorEngine.selectForCAM(slug, feature)`** + wire to per-CAM `select_tool_from_user_crib` handler | +0.15 each | all 5 |
| 7 | **Extend Mastercam `MastercamPluginAdapterEngine` with OLE create-operation methods** | +0.35 Mastercam | Mastercam (2-3 sessions) |
| 8 | **Locate or generate `HyperMillPRISMPlugin.dll`** | +0.30 hyperMILL | hyperMILL (1-3 sessions) |
| 9 | **Add Fusion 360 JSON-RPC handlers that invoke `adsk.cam.*.create()`** | +0.30 Fusion | Fusion 360 (2 sessions) |
| 10 | **Implement `post_process_to_controller_from_inventory` as a real invoke per CAM** | +0.10 each | all 5 |

**Post-fix confidence projection:**
- Units 1-4 (low-cost wins): Mastercam 0.14 → 0.19, hyperMILL 0.29 → 0.29, Fusion 0.24 → 0.24, HSM 0.18 → 0.33, SolidCAM 0.24 → 0.49. Aggregate 0.22 → 0.31.
- Units 5-6 (operation scaffolds + tool-crib wiring): aggregate 0.31 → 0.54.
- Units 7-10 (per-CAM heavy lifts): aggregate 0.54 → **0.82**.

Total effort to reach 0.82: ~12-15 focused sessions. This is the realistic ceiling of the existing plan — the last 0.18 requires real-world CAM testing and is the domain of CAM-EXHAUST-MS0 Phase-7/8.

---

## ROUND-3 vs ROUND-2 DELTA

| Dimension | Round-1 (pre-fix) | Round-2 (post-F1-F7) | Round-3 (action coverage) |
|---|---|---|---|
| What was measured | roadmap status drift | catalog coverage + schema binding | verb-level actionability |
| Aggregate confidence | ~0.35 | 0.69 | **0.22** |
| Best-scoring CAM | — | hyperMILL (0.72) | hyperMILL (0.29) |
| Worst-scoring CAM | — | Mastercam / Fusion (0.62) | Mastercam (0.14) |
| Blockers identified | 7 (F1-F7) | 6 (B1-B6) | 5 universal + 5 per-CAM unique |
| Fix effort remaining | landed | Round-2 fixes landed | 12-15 sessions for 0.22 → 0.82 |

Round-3 explains why Round-2's confidence was optimistic: catalogs are 73-104% complete, but the **action layer** that consumes those catalogs is 9% implemented.

---

## HONEST ANSWER TO THE ORIGINAL QUESTION

**"Did we cover every action in each priority CAM?"**

**No.** We covered **18 of 200 verb-cells** (9%). Of those 18, only **1 is a deep domain implementation** (SolidCAM iMachining). The remaining 17 are schema reads, code-generation templates, or generic PRISM engines reused.

**Should we keep iterating scrutiny passes?** Not yet. Round-4 should run **after the top-5 leverage items above land** (units 1-4 plus scaffolded op-creation), because those are deterministic wins that will move the matrix. Running Round-4 before those land would resurface the same 5 universal gaps.

**What should we actually do next?** Units 1-4 (total effort ~1 session combined). They are: the 10-minute SolidCAM protocol fix, the 1-session Inventor HSM dispatcher wire, the 10-minute JM Die profile update, and the 1-session SolidWorks bridge activation. That alone moves aggregate from 0.22 to ~0.31 and unblocks real validation of the plan.
