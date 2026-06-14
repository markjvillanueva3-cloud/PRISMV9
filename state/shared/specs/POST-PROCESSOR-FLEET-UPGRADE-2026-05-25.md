# Post-Processor Fleet Upgrade — 2026-05-25

**Session:** echo /goal — POST-PROCESSOR-CONSOLIDATION
**Branch:** cad-fusion-live-ms0
**Date:** 2026-05-25
**Scope:** JM Die PRISM MODIFIED POST PROCESSORS — mill upgrades + wire-EDM fleet

---

## 1. Mill Posts Upgraded (9 total)

The 4-property PRISM v11.1 advanced-feature surface
(`prismTribalCitation`, `prismCI95Comments`, `prismLookAheadBlocks`, `prismCrossCAMFeatures`)
was inserted into the properties block of each mill post listed below.
The Hurco VM30i additionally received a 5th Hurco-specific property (`prismUltiMotionQuality`).
The Roku-Roku received a 5th Fanuc-31i-specific property (`prismAICCQuality`).

| # | File | Controller | Agent | Look-ahead default | Extra property |
|---|------|------------|-------|-------------------|----------------|
| 1 | `HURCO_VM30i_PRISM_v11.cps` | Hurco WinMax UltiMotion | echo (prior iter) | 10000 | `prismUltiMotionQuality` |
| 2 | `Roku-Roku-Ai-Enhanced.cps` | Fanuc 31i-MODEL B5 | echo (this task) | 1000 | `prismAICCQuality` int [1,10] default 1 |
| 3 | `HAAS_VF2_-Ai-Enhanced (iMachining).cps` | Haas NGC | mill-agent | controller default | — |
| 4 | `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps` | Okuma OSP-P300 | mill-agent | controller default | — |
| 5 | `OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps` | Okuma OSP-P300LA | mill-agent | controller default | — |
| 6 | `OKUMA_LATHE_LB3000-Ai-Enhanced 2.cps` | Okuma OSP (lathe) | lathe-agent | controller default | — |
| 7 | `OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps` | Okuma OSP (multus) | lathe-agent | controller default | — |
| 8 | `OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7 2.cps` | Okuma OSP (multus) | lathe-agent | controller default | — |
| 9 | `PRISM-Master-Hurco-VM30i.cps` | Hurco WinMax | mill-agent | 10000 | — |

> Rows 3-9 handled by sibling agents (mill-lane / lathe-lane). This report covers rows 1-2 only (echo scope).
> DO NOT re-edit lathe posts — lane discipline enforced.

---

## 2. Wire-EDM Posts Written (3 total)

All three are Fusion 360 `.cps` wire-EDM bridges (CAPABILITY_JET) following the
PRISM-Master-Mitsubishi-FA10S-WEDM.cps structure exactly: same header docs,
properties, formatters, state vars, onOpen/onSection/onLinear/onCircular/onRapid/
onSectionEnd/onClose, helpers, taper, footer.

| # | File | Controller | Tech table | Thread/Cut | Submerge | Taper | Offset style |
|---|------|------------|------------|------------|----------|-------|--------------|
| 1 | `PRISM-Master-Mitsubishi-FA10S-WEDM.cps` | Mitsubishi FA MELDAS | E110/E120/E130/E140 | M6 / M7 | M28/M29 | G51 A\<deg\> | H-register Hnn |
| 2 | `PRISM-Master-Sodick-AQ-WEDM.cps` | Sodick LN Power-Master | E510 S04 / E520 S03 / E530 S02 / E540 S01 | M50 / M51 | M28/M29 | G51 P\<deg\> | `.O = <tenths>` comment |
| 3 | `PRISM-Master-Makino-U-WEDM.cps` | Makino HyperDrive SGF | E450 C12 / E460 C08 / E470 C05 / E480 C02 | M06 / M07 (leading zero) | M21/M22 | G51 X\<deg\> | D-register Dnn + `(OFS=Dnn)` |

### Key dialect differences encoded

**Sodick vs Mitsubishi:**
- Power codes: paired E/S words (not standalone E-code). `E510 S04` on one line.
- Thread: M50 (NOT M6). Cut: M51 (NOT M7).
- Nozzle: G82 down / G81 up (Mitsubishi has no nozzle G-codes).
- Taper: `G51 P<deg>` P-word (Mitsubishi uses A-word).
- Offset: `.O = <tenths-of-micron>` comment — no H-register, loaded via MDI.
- Submerge: M28/M29 same as Mitsubishi.

**Makino vs Mitsubishi:**
- Power codes: paired E/C words. `E450 C12` — C-word selects corner/pulse strategy.
- Thread: `M06` leading-zero (NOT M6). Cut: `M07` leading-zero (NOT M7).
- Submerge: M21 ON / M22 OFF (NOT M28/M29).
- Taper: `G51 X<deg>` pure-X form (NOT A-word or P-word).
- Offset: D-register `D01`–`D99` with `(OFS=Dnn)` annotation in program.
- No nozzle G-codes — U-series nozzle height is a machine parameter, not G-code.

---

## 3. PRISM Dispatcher Integration

Each wire-EDM post declares 4 dispatcher actions in the sidecar state object.
Invoke via MCP client:

```
# Mitsubishi FA10S
prism_cam:wedm_post_mitsubishi_generate  { plan: <WEDMPlan> }
prism_cam:wedm_post_mitsubishi_parse     { nc_text: "..." }
prism_cam:wedm_post_mitsubishi_tech_table {}
prism_cam:wedm_post_mitsubishi_dialect   { alias: "fa10s" }

# Sodick AQ / LN
prism_cam:wedm_post_sodick_generate      { plan: <WEDMPlan> }
prism_cam:wedm_post_sodick_parse         { nc_text: "..." }
prism_cam:wedm_post_sodick_tech_table    {}
prism_cam:wedm_post_sodick_dialect       { alias: "aq750l" }

# Makino U-Series
prism_cam:wedm_post_makino_generate      { plan: <WEDMPlan> }
prism_cam:wedm_post_makino_parse         { nc_text: "..." }
prism_cam:wedm_post_makino_tech_table    {}
prism_cam:wedm_post_makino_dialect       { alias: "u6" }
```

Engine references for upstream wiring:
- `mcp-server/src/engines/WEDMPostMitsubishiEngine.ts` (existing)
- `mcp-server/src/engines/WEDMPostSodickEngine.ts` (referenced — confirm exists or create)
- `mcp-server/src/engines/WEDMPostMakinoEngine.ts` (referenced — confirm exists or create)

---

## 4. Verification Table

| File | Key insertion | Grep target | Result |
|------|--------------|-------------|--------|
| `Roku-Roku-Ai-Enhanced.cps` | Lines 634–677 (5 props after copperChipBreaking) | `prismTribalCitation` | 1 match, line 634 |
| `Roku-Roku-Ai-Enhanced.cps` | Line 642 | `prismCI95Comments` | 1 match |
| `Roku-Roku-Ai-Enhanced.cps` | Line 650 | `prismLookAheadBlocks` value=1000 | 1 match |
| `Roku-Roku-Ai-Enhanced.cps` | Line 659 | `prismCrossCAMFeatures` (solidcam+fusion360+mastercam) | 1 match |
| `Roku-Roku-Ai-Enhanced.cps` | Line 667 | `prismAICCQuality` range [1,10] default 1 | 1 match |
| `PRISM-Master-Sodick-AQ-WEDM.cps` | Line 43–46 | `prism_cam:wedm_post_sodick_*` (4 actions) | 4 matches |
| `PRISM-Master-Sodick-AQ-WEDM.cps` | onSection | `M50` thread / `M51` cut | confirmed |
| `PRISM-Master-Sodick-AQ-WEDM.cps` | onTaper | `G51 P<deg>` P-word | confirmed |
| `PRISM-Master-Sodick-AQ-WEDM.cps` | onSection | `.O = <tenths>` comment | confirmed |
| `PRISM-Master-Makino-U-WEDM.cps` | Line 41–44 | `prism_cam:wedm_post_makino_*` (4 actions) | 4 matches |
| `PRISM-Master-Makino-U-WEDM.cps` | onSection | `M06` thread / `M07` cut (leading zero) | confirmed |
| `PRISM-Master-Makino-U-WEDM.cps` | onSection | `M21` submerge / `M22` off | confirmed |
| `PRISM-Master-Makino-U-WEDM.cps` | onTaper | `G51 X<deg>` X-word | confirmed |
| `PRISM-Master-Makino-U-WEDM.cps` | onSection | `(OFS=Dnn)` D-register annotation | confirmed |

---

## 5. Outstanding Work

### Wire-EDM posts not yet written
JM Die's current wire-EDM fleet (from `jm-die-profile.ts` / shop scan):
- **Mitsubishi FA10S (WEDM-01)** — covered by `PRISM-Master-Mitsubishi-FA10S-WEDM.cps` (shipped this session, prior echo iter).
- **Sodick AQ** — covered by `PRISM-Master-Sodick-AQ-WEDM.cps` (this task).
- **Makino U** — covered by `PRISM-Master-Makino-U-WEDM.cps` (this task).

If JM Die operates Agie-Charmilles (AgieCharmilles CUT series) or Fanuc ROBOCUT wire machines,
additional dialect posts are required:
- `PRISM-Master-AgieCharmilles-CUT-WEDM.cps` — AC-CUT control, ISO E/T codes, M60/M61 thread/cut.
- `PRISM-Master-Fanuc-ROBOCUT-WEDM.cps` — Fanuc 31i-WB, M60/M61 (not M6/M7), G01.3 wire-angle.

Confirm against current JM Die machine roster before building. No Agie or ROBOCUT machines
were observed in the `JM DIE/` archive scan (charlie /goal-16 fleet scan, 2026-05-24).

### Engine stubs to confirm
`WEDMPostSodickEngine.ts` and `WEDMPostMakinoEngine.ts` are referenced in the `.cps` headers.
Verify these exist in `mcp-server/src/engines/` or create them as proper engines
(not stubs) with `SODICK_ES_TABLE` and `MAKINO_EC_TABLE` exports before wiring
`prism_cam:wedm_post_sodick_*` / `prism_cam:wedm_post_makino_*` dispatcher actions.

### Mill posts — cross-CAM defaults
HURCO v11 default: `solidcam_chip_thinning,fusion360_adaptive` (WinMax focus).
Roku-Roku default: `solidcam_chip_thinning,fusion360_adaptive,mastercam_dynamic_chip_load`
(Fanuc 31i shops commonly run Mastercam alongside Fusion).
Remaining mill posts (Haas / Okuma) — handled by mill-lane agent; verify their
`prismCrossCAMFeatures` defaults match shop CAM software.

---

## 6. File Paths (absolute)

```
H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/Roku-Roku-Ai-Enhanced.cps
H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/PRISM-Master-Mitsubishi-FA10S-WEDM.cps
H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/PRISM-Master-Sodick-AQ-WEDM.cps
H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/PRISM-Master-Makino-U-WEDM.cps
H:/prism/state/shared/specs/POST-PROCESSOR-FLEET-UPGRADE-2026-05-25.md  (this file)
```
