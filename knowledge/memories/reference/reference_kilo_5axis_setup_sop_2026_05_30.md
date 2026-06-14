---
name: reference_kilo_5axis_setup_sop_2026_05_30
description: "Canonical JM Die 5-axis CAM setup SOP (Okuma M460V-5AX, BIG-PLUS CAT40): open the mate-fixture template, save-as, insert part, build oversized centered stock body, mate stock to jaws, generate setup with stock-as-from-solid + origin at bottom-center of stock. Operator-dictated 2026-05-30. Always use this for 5-axis setups."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.178Z
aliases: reference_kilo_5axis_setup_sop_2026_05_30
---


**Operator-dictated canonical 5-axis setup SOP (JM Die, 2026-05-30).** Use this EVERY time a 5-axis setup is needed (Okuma M460V-5AX, BIG-PLUS CAT40, trunnion B/C, machine-from-table-center). Designed to be AUTOMATED end-to-end and to give a constant, repeatable origin for any part.

**Order of operations:**
1. **Open** the JM DIE 5-axis setup template file (it already contains the **mate/jaw FIXTURE** model — the vise + jaws). Canonical path: `H:\PRISM\JM DIE\OKUMA\SETUPS\OKUMA MATE VISE SETUP FINAL.iam` (Inventor assembly — Fusion opens/converts it). Companions in that folder: `CUSTOM JAWS FOR MATE VISE\STEEL JAWS.ipt` (+ ALUMINUM JAWS), `DOVETAILED STOCK BOTTOM.ipt` (the dovetail base the mate jaws grip — stock bottom mates to this), `OKUMA MU400VA MACHINE CAD MODEL\` (machine kinematics; NOTE op named M460V-5AX — reconcile machine model vs post). All `.iam`/`.ipt` = INVENTOR, not Fusion-native.
2. **Save-As** a new filename so the original template is never modified.
3. **Insert** the part model (e.g. UP SET) into the assembly.
4. **Generate a new body for the STOCK** model over the CAD part — oversized + **centered**, oversized on the grip/length axis so it clears the jaws.
5. **Mate** the BOTTOM of the stock to the **TOP LIP of the mate jaws**.
6. **Mate** the jaw **TEETH to the SIDES of the stock**.
7. **Center everything** (part centered in stock, stock centered on the fixture/table).
8. **Generate the CAM setup**: stock = **"From Solid"** → select the **stock body**; model = the **part**.
9. **WCS ORIGIN = bottom-center of the STOCK** — constant for ANY part, so the program always references table/rotary center (machine-from-center). Repeatable across every job.

**Why:** A blind auto-setup mis-places the parting plane and can't hold cross-op tolerance; this SOP uses the proven physical fixture + a part-independent origin. Origin at stock-bottom-center = the rotary/table center reference the 5-axis post expects, so every part lands the same. Stock-as-from-solid lets the stock geometry (not a relative offset) define material, and the mates guarantee jaw clearance + centering physically. Resolves the workflow's P0 (parting-plane/grip guess) by deferring to the real fixture.

**Cross-op ±.001 (operator decision 2026-05-30):** hold via **dowel/datum relocate** — Op-1 cuts a precision relocation feature (dowel pair / finished datum) the Op-2 flip indicates to. **Tolerance source:** geometry-driven (program off CAD recognition, flagged NOT PMI-validated, verify at proveout) until the print PMI is provided. See [[feedback_always_check_units_vs_part_and_print]] (INCH), [[reference_kilo_cam_drive_ms0_2026_05_29]] (live drive layer), [[reference_kilo_fusion_addin_port_fork_2026_05_30]].

**Automation gap (the add-in build this implies):** to automate the SOP the Fusion add-in needs new endpoints — document open + save-as; component/part INSERT into an assembly; create a stock box body sized+centered over the part; **assembly JOINTS/mates** (adsk.fusion.Joints — stock-bottom↔jaw-top-lip, jaw-teeth↔stock-sides); CAM setup with stock mode = **FromSolid** (select stock body) + model = part + WCS origin = a chosen point (stock bottom-center). Build in logical order: setup-automation FIRST, then the operation sequence.

**Learning-loop (operator directive):** when simulated CAM tests come online, feed this SOP + its setup outcomes into the CAM-AI training loop so the system learns 5-axis setup autonomously. Domain: kilo CAM galaxy `mcp-server/src/engines/cam/`. **Make a wiki entry** (`knowledge/wiki/` 5-axis-setup-sop) + tribal tip so this is always recallable.
