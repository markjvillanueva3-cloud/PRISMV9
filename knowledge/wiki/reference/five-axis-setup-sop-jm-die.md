---
title: JM Die 5-Axis CAM Setup SOP (Okuma M460V-5AX, BIG-PLUS CAT40)
domain: cam
slot: kilo
created: 2026-05-30
status: canonical
tags: [cam, 5-axis, setup, fixture, mate, okuma, fusion, sop, workholding]
source: operator-dictated 2026-05-30
---

# JM Die 5-Axis CAM Setup SOP

The canonical, **automatable** procedure for establishing a 5-axis CAM setup at JM Die (Okuma M460V-5AX, BIG-PLUS CAT40 spindle, trunnion B/C, machine-from-table-center). Operator-dictated 2026-05-30. Use this for **every** 5-axis setup — it gives a constant, part-independent origin so any part lands the same.

## Order of operations

| # | Step | Detail |
|---|------|--------|
| 1 | **Open** template | `H:\PRISM\JM DIE\OKUMA\SETUPS\OKUMA MATE VISE SETUP FINAL.iam` — Mate precision vise + base on the Okuma table (Inventor `.iam`; Fusion opens/converts). Jaws: `CUSTOM JAWS FOR MATE VISE\STEEL JAWS.ipt`. Dovetail base: `DOVETAILED STOCK BOTTOM.ipt`. Machine model: `OKUMA MU400VA MACHINE CAD MODEL\`. |
| 2 | **Save-As** | New filename; never modify the original template. |
| 3 | **Insert part** | Insert the part model (e.g. UP SET) into the assembly. |
| 4 | **Build stock body** | Generate a new solid body for the **stock** over the CAD part — oversized + **centered**, oversized on the grip axis to **clear the jaws**. |
| 5 | **Mate stock→jaws** | Mate the **bottom of the stock** to the **top lip of the mate jaws**. |
| 6 | **Mate teeth→stock** | Mate the jaw **teeth to the sides of the stock**. |
| 7 | **Center** | Part centered in stock; stock centered on fixture/table. |
| 8 | **Generate setup** | CAM setup with stock = **"From Solid"** (select the stock body); model = the part. |
| 9 | **Origin** | WCS origin = **bottom-center of the stock** — constant for any part → always references table/rotary center. |

## Why this works

A blind auto-setup mis-places the parting plane and cannot hold cross-op tolerance. This SOP defers to the **real physical fixture** (mates guarantee jaw clearance + centering) and a **part-independent origin** (stock-bottom-center = the rotary/table-center reference the 5-axis post expects). Stock-as-from-solid lets actual geometry define material, not a fragile relative offset.

## Cross-op tolerance + PMI (operator decisions, 2026-05-30)

- **±.001″ across the Op-1→Op-2 flip:** hold via **dowel/datum relocate** — Op-1 cuts a precision relocation feature (dowel pair / finished datum) the flip indicates to.
- **Tolerance source:** **geometry-driven** — program off CAD recognition, flagged NOT PMI-validated, verify at proveout, until the print's PMI is supplied.
- **Units:** INCH always (JM imperial) — see [[feedback_always_check_units_vs_part_and_print]].

## Automation gap (add-in build this implies)

To drive the SOP from PRISM the Fusion add-in (`fusion360_api_server.py`) needs: document **open** + **save-as**; component/part **insert**; **stock-box body** sized+centered over the part; assembly **joints/mates** (`adsk.fusion.Joints`: stock-bottom↔jaw-top-lip, jaw-teeth↔stock-sides); CAM setup with stock mode = **FromSolid** + model = part + WCS origin = chosen point. Build in logical order: **setup-automation first, then the operation sequence.**

## Learning loop

When simulated CAM tests come online, feed this SOP + setup outcomes into the CAM-AI training loop so the system learns 5-axis setup autonomously.

Memory: [[reference_kilo_5axis_setup_sop_2026_05_30]] · [[reference_kilo_cam_drive_ms0_2026_05_29]] · [[reference_kilo_fusion_addin_port_fork_2026_05_30]].
