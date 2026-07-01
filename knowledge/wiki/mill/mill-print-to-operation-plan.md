---
title: Mill Print → Operation Plan — GD&T callout to machining decision (calc-feed)
type: reference
domain: mill
tags: [mill, print-reading, GD&T, datum, tolerance, true-position, surface-finish, probing, setup-order, calculation-feed]
status: living
created: 2026-06-12
author: slot:bravo
related: [part-setup-probing-edge-find-wcs-tool-offsets, operation-ordering-sequencing-roughing-finishing-datums, mill-surface-finish-tool-wear, mill-workholding-reference, mill-data-contents-inventory]
---

# Mill Print → Operation Plan

> Operator ask 2026-06-12: *"print reading and interpretation."* This is the **bridge** — the blueprint-vision galaxy OCRs the print; the **mill** galaxy decides what each callout *means for machining*. "Before the wizard plans a setup, the operator must read the print" (cite `milling-pdf-cited-tips.ts:942`). Get the read wrong and every downstream choice (fixturing, op order, finishing, gauging) is wrong. Grounded in the JM-curated GD&T references + the part-setup canonical (this page = the *decisions*, [[part-setup-probing-edge-find-wcs-tool-offsets]] = the *mechanics*).

## §1 — Read the datums FIRST (cite `:183`, `:942`)
**Machine primary datum A, then B, then C — never cut features before all three datums are established.** The datum reference frame *is* the setup order: indicate/probe the A face, then B, then C, and sequence every subsequent feature *from those verified datums* — not feature-to-feature (that stacks error). JM ref: *GD&T Beginner's Guide* + *Fundamentals of CNC* (JM Die TRIBAL+WIKI, cite `:941`/`:846`).

## §2 — Callout → machining decision
| Print callout | What it forces |
|---------------|----------------|
| **Datum frame (A/B/C)** | setup order + which face the fixture must hold *true*; indicate the datum, don't assume the stock face is it |
| **Perpendicularity / parallelism** | the feature must be cut *referenced to the datum face* → fixture/indicate the datum before cutting the controlled feature |
| **Flatness tighter than the face-mill scallop** | a face mill leaves a scallop; if flatness < that, add a **fine finish pass, grind, or scrape** ([[mill-surface-finish-tool-wear]]) |
| **True position (hole pattern)** | drives the hole method: **bored** (tightest) vs **reamed** vs **interpolated** vs drilled; **probe to set G54 from the datums** so the pattern lands true |
| **Surface finish (Ra)** | Ra 0.8 µm → ground/honed; Ra 1.6-3.2 → finish-milled (set `fz`/corner via `predictedRa`, [[mill-surface-finish-tool-wear]] §1); Ra 6.3+ → as-milled OK |
| **Tolerance band (±)** | tight band → leave **roughing stock** (0.010-0.030″), a finish pass (0.001-0.005″), and **gauge** it; loose band → single pass ([[operation-ordering-sequencing-roughing-finishing-datums]]) |
| **Bilateral vs unilateral / MMC** | shifts the *nominal* the toolpath targets (cut to the middle of the usable zone, bias for wear) |

## §3 — Tolerance stack → datum-driven sequencing
Every machining error adds to the **tolerance stack**. Machining from **verified datums** (not chaining feature-to-feature) keeps the stack bounded — a 0.01 mm vise/probe repeatability ([[mill-workholding-reference]] §3) eats directly into a 0.02 mm true-position budget. The print's tightest callout sets which datum scheme + fixture repeatability you *must* hit.

## §4 — Probing closes the loop (cite `:958`)
Drop the part, run a **probing macro**, the controller sets **G54 from the probed datums** (Renishaw on the JM machines). This converts the print's datum frame into a real work-offset — the toolpath then cuts from the *part's* true zero, not the fixture's nominal. The print-read → probe → G54 chain is the auto-setup pre-stage.

## §5 — Feeds the calculations
- **Ra callout → `predictedRa` gate:** does the planned `fz`/corner meet it, or is a finish/grind pass required? ([[mill-surface-finish-tool-wear]])
- **Tolerance band → stock allowance + finishing-pass + gauging** in the op plan ([[operation-ordering-sequencing-roughing-finishing-datums]]).
- **Datum frame → setup order + required fixture/probe repeatability** (the tolerance-stack term).
- **True-position → hole method** (bore/ream/interp) decision.
- Doctrine: the print is the **spec the whole plan must satisfy** — wiring callout-parsing (blueprint-vision) into the mill planner so each callout deterministically selects its strategy/stock/finish/gauge is the print-to-program automation the operator wants. The mill side owns the *interpretation*; blueprint-vision owns the *extraction*.

## §6 — Cross-galaxy bridge
- **blueprint-vision (xray)** — OCRs the drawing + parses GD&T (GDTCalloutParserEngine); produces the callouts this page interprets. The bridge: callouts → machining decisions here → toolpath.
- **quality (Cpk/SPC)** — the tolerance band sets the Cpk target the finished feature is gauged against.

## Shop-floor tips (tribal)
- Read + establish **datum A→B→C before cutting any controlled feature** — the #1 print-reading rule. (src: `:183`/`:942`)
- A flatness callout tighter than your face-mill scallop = a *second operation* (fine finish/grind), not a feeds tweak. (eng. + finish page)
- True position on a hole pattern → **probe the datums + set G54**, then the pattern lands true regardless of fixture nominal. (src: `:958`)
- Match the hole method to the callout: bored (tightest) > reamed > interpolated > drilled. (eng.)
- Cut to the **middle of the usable tolerance zone** and bias for tool wear, not the nominal line. (eng.)

## Source data (cite)
`milling-pdf-cited-tips.ts:183` (datum A-first), `:941`/`:942` (JM GD&T Beginner's Guide → setup order), `:846` (JM Fundamentals textbook), `:958` (Renishaw probe → G54). Setup mechanics: [[part-setup-probing-edge-find-wcs-tool-offsets]]. Op order: [[operation-ordering-sequencing-roughing-finishing-datums]]. Finish: [[mill-surface-finish-tool-wear]]. Full surface: [[mill-data-contents-inventory]].
