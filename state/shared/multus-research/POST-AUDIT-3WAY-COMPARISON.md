# PRISM Master Post 3-Way Audit: TypeScript Engine vs Mastercam/Fusion .cps

**Generated:** 2026-05-05 by claude-32612444 (U-PPGMU04 + U-PPGMU05)
**Method:** Multi-agent research pass + .cps header parsing + engine-source diff
**Scope:** All 3 PRISM-modified posts in `JM DIE/PRISM MODIFIED POST PROCESSORS/` against their corresponding TypeScript master post engines on `work/ppgh05`.

---

## 1. Hurco V11 (JM Die VM30i)

| Field | TypeScript engine (pre-audit) | TypeScript engine (U-PPGMU04) | Canonical .cps |
|---|---|---|---|
| Machine | VMX24 (incorrect — stale) | **VM30i** (corrected) | VM30i |
| Controller | WinMax V11 | WinMax V11 (ISNC/BNC compatible) | WinMax (ISNC/BNC) |
| Description | n/a | Pinned via `HURCO_CANONICAL_DESCRIPTION` | "PRISM Enhanced - HURCO VM30i" |
| FORKID | not pinned | Pinned via `HURCO_CANONICAL_FORKID` | `1B14E478-26FE-4db2-A3E7-FB814E8C0B4E` |
| Revision tag | not pinned | Pinned via `HURCO_CANONICAL_REVISION_TAG` | "PRISM v10.9 DRILLFIX - Runtime Drilling Multiplier Exclusion (Speed + Feed)" |
| Output extension | n/a | Pinned (`hnc`) | `hnc` (Hurco WinMax native) |
| programNameIsInteger | n/a | Pinned (`true`) | `true` |
| Minimum runtime rev | n/a | Pinned (`45793`) | `45793` |

### Bidirectional feature gap (Hurco)

**.cps has, engine doesn't (full-emit):**
- 8-level aggressiveness slider (engine has L1–L5 from U-PPGH02 — DIFFERENT DEPTH)
- HSM/HEM physics engine with chip-thinning multiplier 1.0×→3.2× per WOC band
- LOC engagement safety override (>85% LOC = 55% feed reduction)
- Sister tool management
- Tool break check subprogram
- Variable RPM (SSV) with mode/max-increase/max-decrease knobs
- Speed-up suggestions written as G-code comments
- M59/M61 chip conveyor + M68/M69 washdown coolant emission
- M16 automatic buffering, M98 air-through-spindle, M140 retract
- DXF import / G68.2 work surface / G65 conversational macro emission
- "PRISM Apply calculations" modal toggle (operator can disable PRISM mid-run)

**Engine has, .cps doesn't (process-plan-only):**
- Operations[] structured input (the .cps consumes Mastercam NCI, not a JSON op list)
- BlockAnnotation envelope (sealMasterPostOutput compatibility — U-PPGM13/14)
- Kienzle force cross-check vs `CANONICAL_KIENZLE` (U-PPGH04/05/15)
- Taylor tool-life check vs `CANONICAL_TAYLOR` (U-PPGH07)
- Aggressiveness L1–L5 (different scale from the .cps's 8-level)
- Prove-out mode with M01 optional stops (U-PPGH03)
- Material-override sanity bounds for Kienzle constants (U-PPGH04)
- Op-N warning prefix for multi-op traceability (U-PPGH09)
- Stickout deflection physics check (U-PPGH14)
- Full structured `setup_sheet` payload (U-PPGH10)

### Hurco recommendation
Keep both emitters. They serve different inputs (NCI from Mastercam vs structured operations[] from PRISM AGI). The canonical companion constants (U-PPGMU04) bridge them via cross-reference.

---

## 2. Okuma OSP Mill (M460V-5AX, OSP-P300MA-H)

| Field | TypeScript engine | Canonical .cps |
|---|---|---|
| Machine target | Family-level (MB-V / MU-V / Genos M-series) | Genos **M460V-5AX** (specific 5-axis trim) |
| Controller | OSP-P300M / OSP-P500M (family) | OSP-**P300MA-H** (5-axis specialty) |
| Description | n/a | "OKUMA M460V-5AX Ultra Enhanced" |
| FORKID | not pinned | `2F9AB8A9-6D4F-4087-81B1-3E14AE260F81` |
| Revision tag | n/a | "44100 Enhanced Edition" |
| Output extension | n/a | `MIN` (uppercase — note Multus uses lowercase `min`) |
| Minimum runtime rev | n/a | `45917` |

### Bidirectional feature gap (Okuma)

**.cps has, engine doesn't:**
- 5-axis simultaneous: TCP G169/G170, high-precision G08 P1, look-ahead 10–200 blocks, G62 corner round, singularity avoidance, rotary feed limiting
- C-axis rotary repositioning (50–80% time saving on rotary table ops)
- iMachining-style variable feed (8-level aggressiveness)
- Super NURBS G131 (separate 3-axis vs 5-axis tolerance)
- Spindle warmup, safe start, auto door, tool breakage detection, coolant ramp
- Chip conveyor control, air blast with duration
- Fixture offset CALL OO88 macro
- Subprogram files emission

**Engine has, .cps doesn't:**
- Operations[] structured input (BlockAnnotation flow, sealMasterPostOutput)
- Kienzle Fc cross-check + Taylor T cross-check (U-PPGOH04 stickout deflection, U-PPGOH05 Kienzle clamp)
- structured setup_sheet payload (U-PPGOH01)
- postSingle simplified API (U-PPGOH02)
- structured op.tool shadowing (U-PPGOH03)
- Family-level support (handles non-M460V machines on the same engine)

### Okuma recommendation
Engine stays family-level; .cps is M460V-5AX-specific. Canonical companion constants (U-PPGMU05) cross-link the two without forcing the engine to specialize.

---

## 3. Okuma Multus B250II (already covered U-PPGMU01–03)

| Field | TypeScript engine (facade) | Canonical .cps |
|---|---|---|
| Machine | Multus B250II | Multus B250IIW |
| Controller | OSP-P300SA | OSP-P300SA |
| Description | "Okuma Multus B250IIW Ultra Enhanced" (audit-pinned) | matches |
| FORKID | `D93DAA65-1C09-402E-9871-3280B561D994` | matches |
| Revision tag | "44802 Ultra Enhanced Edition v5.2.7 - PRISM Intelligence" | matches |
| PRISM intelligence flags | 11-flag tuple (audit-pinned) | matches |
| Property catalog baseline | 88 properties / 13 groups | matches |

### Multus recommendation
Already at facade parity. The Multus engine is unique in being a pure facade (no parallel emitter); the .cps is the only emission path. The 11 PRISM intelligence flags + 13 property groups + 88-property baseline are all pinned.

---

## Cross-engine summary

| Engine | Canonical .cps companion path | FORKID pinned | PRISM features pinned |
|---|---|---|---|
| HurcoV11MillMasterPostEngine | `HURCO_VM30i_PRISM_v11.cps` | ✅ U-PPGMU04 | 20-family list ✅ |
| OkumaOSPMillMasterPostEngine | `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps` | ✅ U-PPGMU05 | 27-family list ✅ |
| OkumaMultusB250IIMillTurnMasterPostEngine | `OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps` | ✅ U-PPGMU01–03 | 11-flag list ✅ |

All 3 engines now expose:
- Path to their canonical .cps under `JM DIE/PRISM MODIFIED POST PROCESSORS/`
- FORKID for identity verification
- Description / vendor / extension / revision tag for drift detection
- PRISM feature family inventory for cross-reference and operator dashboard rendering

The Multus engine additionally validates against these constants via `validateCanonical()`. The Hurco and Okuma engines expose the constants for consumption by downstream verifiers but do not run automatic validation in their hot paths (preserves the existing emit-from-operations behavior — drift detection is opt-in).
