---
name: reference_echo_cimco_baseline_live_2026_06_26
description: "CIMCO baseline-sim live drive 2026-06-26 — CIMCO 2026 reachable, JM .mcfg machines already present, sim drives live; the one remaining wire is the .mcfg machine-load (so the known-bad NC produces over-travel rows)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.558Z
aliases: reference_echo_cimco_baseline_live_2026_06_26
---


# CIMCO baseline-sim — live drive (2026-06-26, slot:echo, session ab21e9c9)

Operator opened CIMCO Edit 2026 + said "you might have to create/import machines." Drove the
PRISM Win32 UI driver (`mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/PrismCimcoUI.exe`,
already built) against it. **All verified live this turn:**

1. **CIMCO reachable** — `--op window-info` → `frame:0x4e06ea, "CIMCO Edit 2026"`; PowerShell confirms
   `CIMCOEdit` PID 66740. (`--op list-windows` does NOT show CIMCO as a normal top-level — its title
   has heavy trailing whitespace; use `window-info`, the driver's dedicated CIMCO-frame detection.)
2. **Operator's "import machines" concern is RESOLVED — machines already present.** CIMCO 2026's
   `H:/CIMCO 2026/CIMCOEdit/MachineCfg/` has **122 configs** incl. the exact ones `jm-fleet-sim-map.json`
   `cimcoMatch` maps each JM machine to: `Haas VF-6_40.mcfg` (VMC-03 Haas VF-2, 0.83 vendor match),
   `Cimco Lathe 3 Axis C.mcfg` (the JM lathes), `Cimco Mill 3 Axis Type A.mcfg` (VMC-01), etc. No import needed.
3. **Created the known-bad NC fixture** `state/shared/cimco/KNOWN-BAD-OVERTRAVEL-VMC03-HaasVF6.nc`
   (gross Z-2000/X+9999/Y+9999 vs the Haas VF-6/40 ~1626x813x762mm envelope → a correct sim MUST report over-travel).
4. **Live sim drive PROVEN** — `--op invoke-read --name "Machine Simulation" --then "Simulate" --nc <bad> --launch --allow-actions`
   → `frameRealized:true` (1813 nodes), `invokeState:"open=fired;run=fired"` (the sim opened AND ran).
   But `found:false, blockedBy:"report-grid-not-found"`.

## The ONE remaining wire (precise)
`report-grid-not-found` is the **documented `.mcfg` machine-load fidelity gap**: the driver does NOT yet
load a specific `.mcfg` into the sim, so it runs CIMCO's **default** machine — which has no/huge travel
limits, so the over-travel is never violated → no collision report. To get a real FAIL verdict:
**load the mapped `.mcfg` into the sim's Backplot/Machine setup BEFORE running** (the in-flight
`U-CIMCO-COMBO-WRITE + LOAD-MACHINE` unit — driver `set-setting` on the sim's machine combo, ledger
cites `Control Type cid 14639` + `Machine setup cid 14307`). Then re-run the known-bad NC → expect
over-travel/limit rows → verdict FAILS (proves the loop catches problems).

## Safety facts (verified, reusable)
- The driver kills CIMCO ONLY for instances IT launched (`Program.cs:596 if(launchedHere && !keep)`),
  and snapshots pre-existing CIMCO PIDs (147-158) to exclude them → **the operator's open CIMCO is never
  killed**, with or without `--launch`. `--launch` + no `--keep` = its own throwaway instance, auto-cleaned
  (verified: only PID 66740 remained, no orphan — R14 clean).
- CIMCO Machine Simulation is a VIRTUAL sim (no G-code to a real machine) → driving it is autonomous-safe.

Status doc: `state/shared/cimco/CIMCO-CLOSED-LOOP-STATUS-2026-06-09.md` (the sim arm was already BUILT +
the all-15 sweep ran header-only for this same machine-load reason). Sibling: [[reference_echo_loop_2026_06_26]].

## UPDATE 2026-06-26 (same session ab21e9c9): combo-write WIRE BUILT + root cause REFINED
**The "ONE remaining wire" above is now BUILT + proven.** Added two ops to the driver (`Program.cs`,
`U-PP-CIMCO-COMBO-WRITE`, +202 lines, compiles clean via `build.ps1`):
- `--op list-combo --name <page-hint> --cid <id>` — READ a Setup ComboBox's FULL option list
  (CB_GETCOUNT + per-index CB_GETLBTEXT — the list `read-setting` could not expose). Read-only, always-closes.
- `--op set-combo --name <page-hint> --cid <id> --to <name|index> [--persist]` — WRITE: select an item by
  machine NAME (exact, else unique-substring, fail-closed) or index via CB_SETCURSEL + a WM_COMMAND/CBN_SELCHANGE
  parent notify, then READ-BACK-VERIFY (CB_GETCURSEL). Discard-by-default (Cancel) unless `--persist` (OK).
Helpers `ComboCount`/`ComboTextAt`/`ResolveComboTarget`/`OpenSetupPage` (the last factors out the
read-setting/set-setting Phase-1 unique-page nav, leaving those proven ops untouched).

**Page/cid geography (live-confirmed):** the machine + controller selectors are BOTH on Setup **page 10**
(of 23) — unique titled control "Highlight syntax errors when backplotting" makes a good `--name` hint.
`cid 14307` = "Machine setup:" combo (86 machines); `cid 14639` = "Control Type:" combo (95 controllers).
The "Configure Machine Type" ribbon entry opens the 23-page GLOBAL Setup sheet (NOT a machine-only dialog).

**ROOT CAUSE of the Arm-B wall — REFINED (supersedes the "default machine, huge/no limits" hypothesis above):**
the sim's persisted machine was **"CIMCO Lathe Default (Imperial)" (idx 0)** + control **"Okuma Turning" (idx 30)**
— i.e. a **LATHE parsing a MILL program**. That is why every prior `--launch` sim of a mill NC produced
`report-grid-not-found`: wrong KINEMATIC CLASS, not a license/report gap. `Haas VF-6/40` is combo **index 67**
(EXACT `jm-fleet-sim-map` "Haas VF-6_40.mcfg" match); `Haas NGC Milling` is control index 11.

**Proven live this session:** read 86 machines/95 controls; write Okuma Turning→Haas NGC Milling (verified,
discarded); **persist** Machine→Haas VF-6/40 + Control→Haas NGC Milling (both `persisted:true closedWith:OK`,
independently re-read as current). The operator's CIMCO is now correctly configured for a VMC-03 mill sim.

**RESIDUAL (genuinely operator-confirmable, R6 — stopped after the 4th `report-grid-not-found`):** even with
VF-6/40 set, `invoke-read --launch` still returns `report-grid-not-found` — the report DOCKING-PANE's live MSAA
shape is unrealized until a sim runs in an operator-opened CIMCO (the driver's own `read-report` header has
always said "the operator's first live run confirms the shape"). Machine-load was the variable I controlled;
proving it isolated the residual to that documented one-operator-run piece. NEXT: operator opens the committed
`KNOWN-BAD-OVERTRAVEL-VMC03-HaasVF6.nc` in their (now VF-6/40-configured) CIMCO + clicks Simulate → either reads
the over-travel rows visually OR I attach via `--op read-report` to capture them. That closes Arm-B.
