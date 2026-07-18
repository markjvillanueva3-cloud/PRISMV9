---
name: feedback-jm-machine-manual-coverage-doctrine
description: STANDING RULE — once PDF learning is exhausted, always cover JM-fleet machines extensively. Find manuals + alarm books + parts books + kinematics docs; extract part numbers, alarms+fixes, machine data, kinematics into wiki+tribal nodes.
type: feedback
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.431Z
aliases: feedback_jm_machine_manual_coverage_doctrine
---


# JM-machine manual coverage doctrine

**Rule:** Once any PDF-learning pass is exhausted, the next default-action is to cover **JM Die's fleet machines extensively**. For every machine in the JM fleet:

1. Find the **operator's manual** (programming, setup, daily operation).
2. Find the **alarm book** (every alarm code → cause + fix → recovery).
3. Find the **parts book** (part numbers for spindle bearings, ATC components, way covers, hydraulic seals, electrical, etc.).
4. Find **kinematics + service docs** (axis travel, spindle thermal map, machine geometry).
5. Extract every section into:
   - **wiki nodes** at `knowledge/wiki/architecture/machines/<machine>/<topic>.md`
   - **tribal records** at `state/shared/extracted-pdfs/whiskey-jm-machines-<date>.jsonl`
   - **part-number index** for the quoting + maintenance pipelines
   - **alarm→fix lookup table** for shop-floor recovery skills

## Why

- **Source of truth** — the operator's manual is the ONLY definitive answer for machine-specific behavior (override behaviors, look-ahead window, peck cycle nuances).
- **Alarm recovery** — when a JM operator hits alarm `0090 RETURN TO REFERENCE`, the AI should look up the alarm + emit the recovery procedure (jog clear, re-home X first, etc.) without a Google trip.
- **Parts books** — for the cost-estimation pipeline, a spindle bearing replacement quote requires knowing P/N + life expectancy. The pipeline cannot quote downtime + spare-parts cost without this.
- **Kinematics** — for collision detection + dry-run simulation. Live-tooling reach, sub-spindle synchronization, tailstock travel all matter for program validation.

## How to apply

When the operator says any of:
- "we're done with PDFs"
- "what's next after PDFs"
- "go through JM machines"
- "extract all machine data"
- "/goal generate wiki and tribal knowledge ..." (general doctrine — JM machines are always a P0 fallback)

→ Default-next-task is the JM-machine coverage workflow above.

## Source machines (full JM fleet — read `mcp-server/src/data/jm-die-profile.ts` for live count)

Mill-Turn / lathes (whiskey's natural domain):
- Okuma LB-series + LU-series lathes (primary platform per CLAUDE.md JM-Die test shop)
- See `H:/PRISM/JM DIE/CNC LATHE/<machine-or-customer-folder>/` for evidence of which machines are active

For each machine model, the operator likely has:
- `H:/PRISM/JM DIE/TRIBAL + WIKI/<vendor>/*.pdf` (already partly ingested)
- `resources/MANUFACTURER_CATALOGS/uploaded/` (parts books may live here after operator wget)

## Related

- [[feedback_box_programs_amateur]] — amateur-quality programs are validated by the iter7 ALCOA baseline. Machine-manual coverage closes the AI's blind spot on machine-specific recovery behavior.
- [[lathe-baseline-ALCOA-2026-05-26]] — first quantitative quality measurement; surfaced U-LATHE-SHOP-TOOL-LIBRARY-BRIDGE as P0. JM-machine manual extraction informs the tool-library bridge (each machine's tool-crib config).
