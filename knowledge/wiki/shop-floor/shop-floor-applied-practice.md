---
title: Shop-Floor Applied Practice — setup-reduction, LOTO discipline, offset/preset management, first-article, thermal-growth, swarf/chip control
galaxy: shop-floor
owner_slot: shop-floor-owner
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice (2026-06-10)"
verification_method: "Practitioner-knowledge layer. Every gotcha below was WebFetch-confirmed this pass against a reputable free/legal source (Wikipedia, OSHA, a reputable manufacturing trade publication, a CNC-practitioner tutorial site, or a vendor/shop technical guide). Sources that 403/404'd or whose article body did not render were retried once then DROPPED, not cited (R12 honesty — a small honest set of cited gotchas beats a large fabricated one). This entry promotes ONLY qualitative technique, failure-mode descriptions, decision-logic, and the DIRECTION of a trade-off. NO numeric cutting value (RPM/SFM/IPR/IPT/feed/DOC/chip-load), NO numeric Cpk/control-limit/AQL, and NO numeric safety threshold is asserted here — where a source published one, the relationship is described qualitatively and the number is owner-gated (see Owner-gate + constants.ts)."
tags: [shop-floor, applied-practice, tribal-knowledge, smed, setup-reduction, changeover, lockout-tagout, loto, tool-offset, tool-presetting, work-offset, first-article, fai, thermal-growth, warm-up, thermal-drift, swarf, chip-control, chip-breaker, coolant, failure-modes, gotchas]
---

# Shop-Floor Applied Practice

The **practitioner-knowledge** layer for the **shop-floor** galaxy: the hard-won "tribal knowledge" a world-class setup person / shop-floor expert carries that pure theory does not teach — the common **failure modes**, **gotchas**, and **technique decisions** that separate a clean run from a crashed spindle or a scrapped lot.

**How this differs from its siblings (R8 — no duplication):**
- `shop-floor-foundations.md` is the THEORY spine (MTConnect read-only, OEE = A x P x Q, heijunka structure, jidoka/andon, 5S pillars, ISA-95 levels, TQM/Six-Sigma definitions, the OSHA LOTO/guarding/ergonomics *framework*). It defines *what the concepts are*.
- `shop-floor-source-atlas.md` is the LINK directory of living free sources.
- **This file is "what goes wrong and how an expert avoids it."** It does not re-define 5S or restate the LOTO standard's existence — it captures the *practice failures* (the lock someone else cut off, the H0 that drove the nose into the vise, the tenth part that grew out of tolerance) and the technique that prevents them.

Every claim is WebFetch-confirmed and cited inline. Numeric values any source published (warm-up minutes, micron-per-degree growth, defects-per-million, coolant pressures) are deliberately **left owner-gated** — only the qualitative relationship is promoted.

---

## Common failure modes

### 1. Tool-length offset wrong/zero -> the spindle nose drives to programmed Z (crash)
WebFetch-CONFIRMED against [cnccode.com, "G43, G44, G49: Tool Length Compensation in CNC — Prevent Z-Axis Errors"](https://cnccode.com/2025/07/13/g43-g44-g49-tool-length-compensation-in-cnc-prevent-z-axis-errors/). When tool-length compensation is **not active** (G43 forgotten, or `H0` called by mistake), the control moves the **spindle nose** — not the cutting-tool tip — to the programmed Z, "resulting in catastrophic crashes into the workpiece or table." Calling the **wrong H number** applies a different tool's stored length, so the part is cut at the wrong depth. A subtle measurement gotcha: if a tool is touched off on top of a reference block and the block height is *not* added back, the stored offset is wrong by the full block height. **Expert avoidance:** keep tool number = H number as a rigid convention, activate G43 immediately after every tool change *at a safe Z*, keep offsets accurate with a tool setter, and **verify/simulate offsets before the live run** — the entire failure class is a setup-data error, caught on the bench, never in the cut.

### 2. The tenth part is out of tolerance though the first one was good — thermal growth
WebFetch-CONFIRMED against [Anebon Metal, "Thermal Management in CNC Machining: Preventing Dimensional Growth During Production"](https://anebonmetal.com/thermal-management-in-cnc-machining-preventing-dimensional-growth-during-production/). The spindle is **both a heat source and the positional reference**: bearing/motor/cutting friction warms the structure, the spindle and column **grow**, and the tool center point **drifts** — so a cold machine cuts in tolerance while later parts "grow oversized" as the structure, coolant, fixture, and part heat up. The classic symptom is **first-part-vs-later-parts** (or morning-vs-afternoon) drift that looks like a consistent, wrong size. **Expert avoidance:** run a **warm-up cycle to thermal equilibrium before setting final offsets**, and where the work is tight, **re-probe / re-check offsets mid-run** so the control compensates rather than running static offsets into a moving target. (Every published rate — microns/degree, warm-up minutes, gradient triggers — is owner-gated; only the *direction* "hotter -> bigger -> drift" is promoted.)

### 3. Skipping the first article -> the whole lot is scrap
WebFetch-CONFIRMED against [Wikipedia, "First article inspection"](https://en.wikipedia.org/wiki/First_article_inspection). An FAI "verifies that a new or modified production process produces conforming parts that meet the manufacturing specification" *before* full-scale manufacturing begins — it is the quality gate that catches a bad setup at part one instead of part one-thousand. Skipping it means a setup error (wrong offset, wrong tool, wrong program revision) is discovered only after an **entire batch of non-conforming parts** is cut. **Expert avoidance:** inspect the first part against the print — "size, shape, and feature location" with CMM/gauges/calipers — and confirm the *process itself* is "capable of producing parts to specifications" before authorizing the run. The first article verifies the **setup and process**, not just one part.

### 4. Long stringy chips wrap the tool/part — the chip stops carrying the heat
WebFetch-CONFIRMED against [Production Machining (Gardner Business Media), "The Fundamentals of Chip Control"](https://www.productionmachining.com/articles/the-fundamentals-of-chip-control). The chip is the **desired heat path** — for steel at the optimum speed the large majority of the cutting heat leaves *with the chip* (the source publishes the split; owner-gated). So when long, stringy continuous chips form, they "wrap around tooling and workpieces, scratch finished surfaces, get re-cut (generating more heat), create safety hazards, and jam evacuation systems" — and the heat that *should* have left in the chip is forced back into the cutting edge, degrading tool life. A tell-tale: chip control good at the start of a run that degrades into long strings means the cutting edge may already be damaged. **Expert avoidance:** use chipbreaker geometry to curl/break the chip, and aim coolant/air **as close as possible to the shear zone** to break and flush the chip. (Trade-off direction, gated: feed governs chip control more than speed — too little feed and the chip never engages the breaker; too much compresses the chip and risks tool breakage — exact values owner-gated.)

---

## Setup, fixturing & changeover gotchas

### 5. Doing "external" setup while the machine is stopped (the #1 SMED waste)
WebFetch-CONFIRMED against [Wikipedia, "Single-Minute Exchange of Die" (SMED)](https://en.wikipedia.org/wiki/Single-Minute_Exchange_of_Die). The core distinction: **internal** setup activities "can only be performed when the process is stopped," while **external** ones "can be done while the last batch is being produced." The dominant failure mode is doing external work — staging tools, dies, fixtures, the next program, preheating molds — *after* the spindle has already stopped: "If external setup is performed while the machine is stopped, you lose the entire time advantage." **Expert avoidance / technique:** the SMED stages are (1) ensure external setup happens during machine operation, (2) separate external from internal activities, (3) **convert internal setup to external where possible** (the biggest-gain move), (4) streamline what remains. Stage everything that *can* be staged while the previous job still runs; the only thing left for the stopped machine is the truly-internal exchange.

### 6. Changeover with no preset tooling — spindle time burned at the machine
WebFetch-CONFIRMED against [cnccode.com, G43/G44/G49 guide](https://cnccode.com/2025/07/13/g43-g44-g49-tool-length-compensation-in-cnc-prevent-z-axis-errors/) (preset/verify offsets before production) and the SMED source above (tool retrieval/preparation is *external* setup). Measuring and touching off every tool **at the machine** during a stopped changeover is internal setup that should have been external: it both burns spindle availability and invites the in-the-cut measurement errors of failure mode #1. **Expert avoidance:** **preset and verify tool offsets offline** (on a presetter / off the machine) so the stopped-machine work is just loading a known, verified tool — this converts an internal, error-prone step into an external, checkable one (SMED stage 3 applied to the tool crib).

### 7. Work-offset / part-zero set wrong — right tool, wrong location
Grounded in the same [cnccode.com tool-length-compensation guide](https://cnccode.com/2025/07/13/g43-g44-g49-tool-length-compensation-in-cnc-prevent-z-axis-errors/), which is explicit that an inaccurate stored offset "propagates through jobs." Tool-length compensation locates the tool *tip*; the work offset locates *part zero*. A tool offset that is perfect cannot save a part-zero that was picked up on the wrong face or mis-keyed — the geometry is right relative to a wrong datum. **Expert avoidance:** treat offset entry as setup data to be **independently verified before the run** (re-pick, simulate, or single-block the first moves at a safe height), the same discipline that defeats failure mode #1.

---

## Safety technique — lockout/tagout discipline

### 8. "Someone else's lock" — one worker, one lock; only the applier removes it
WebFetch-CONFIRMED against [Wikipedia, "Lockout-tagout"](https://en.wikipedia.org/wiki/Lockout%E2%80%93tagout). In a group lockout "each worker applies their own padlock" and the equipment "cannot be activated until all workers have removed their padlocks"; critically, "a person's lock and tag must only be removed by the individual who installed the lock and tag" (absent a formal employer procedure). The failure mode is one person clearing or relying on another's lock — which silently removes the very guarantee that *every* exposed worker has stepped clear. **Expert avoidance:** every authorized worker hangs their *own* lock on the group hasp and removes only their own; the machine cannot re-energize while any single worker's lock remains.

### 9. Skipping the "try" — locked, tagged, but never verified zero-energy
WebFetch-CONFIRMED against [Wikipedia, "Lockout-tagout"](https://en.wikipedia.org/wiki/Lockout%E2%80%93tagout) (the **"lock, tag, and try"** step — "demonstrate that the equipment isolation is effective") and [OSHA, "Control of Hazardous Energy"](https://www.osha.gov/control-hazardous-energy) (workers are trained on the "prohibition against attempting to restart or reenergize machines or other equipment that are locked or tagged out"). The gotcha is treating the lock as the *finish* of isolation rather than a step before verification: a worker locks/tags and begins service **without trying the controls** to confirm the machine will not start. **Expert avoidance:** after isolating and locking, **operate the controls (the "try")** to prove zero energy *before* any body part enters the machine — verification, not assumption.

### 10. Residual / stored energy released after the power is "off"
WebFetch-CONFIRMED against [OSHA, "Control of Hazardous Energy"](https://www.osha.gov/control-hazardous-energy) — hazardous energy includes "electrical, mechanical, hydraulic, pneumatic, chemical, thermal, or other sources," and "stored energy can result in serious injury or death" (e.g. pressurized lines, a jammed conveyor under spring/gravity load) — corroborated by [Wikipedia, "Lockout-tagout"](https://en.wikipedia.org/wiki/Lockout%E2%80%93tagout) ("removal of all energy sources"). Cutting the main disconnect does not drain a charged capacitor, a compressed spring, trapped hydraulic/pneumatic pressure, a raised axis held by gravity, or a hot surface — and service proceeds straight into that stored energy. **Expert avoidance:** after lockout, **deliberately dissipate or block every stored-energy source** (bleed pressure, block the axis, discharge, let thermal mass cool) as part of the isolation, before the "try" and before touching the equipment.

### 11. The "down" machine that is actually under maintenance (LOTO state is distinct)
WebFetch-CONFIRMED against [OSHA, "Control of Hazardous Energy"](https://www.osha.gov/control-hazardous-energy) (the restart/reenergize prohibition on a locked/tagged machine). From a shop-floor *modeling/dispatch* standpoint, the failure mode is conflating "machine in LOTO" with "machine broken-down/available-to-recover": a locked-out machine is **intentionally de-energized** and must never be auto-dispatched, auto-started, or counted as an availability loss to be "recovered." **Expert avoidance:** a machine-state model (and the people reading it) must represent **locked-out / under-maintenance as a first-class state, separate from "down"** — the andon/board has to show "do not touch," not "needs restarting."

---

## Verification & housekeeping

### 12. Swarf is sharp, hot, and (for some metals) flammable — it is not just "waste"
WebFetch-CONFIRMED against [Wikipedia, "Swarf"](https://en.wikipedia.org/wiki/Swarf). Chips "can be extremely sharp and they can cause serious injuries if not handled correctly," can be ejected as projectiles "several yards," run extremely hot during coolant-free cutting, and for reactive/oil-coated metals "can spontaneously combust" (requiring Class-D extinguishers for metal fires); finely-divided materials such as beryllium carry toxicity hazards. The failure mode is treating chip clearing as an afterthought — accumulated swarf nests around the tool/part (driving the re-cut + finish-scratch problem of failure mode #4), conceals the work, and is a direct cut/burn/fire hazard to the operator. **Expert avoidance:** clear chips as a *routine discipline*, not a clean-at-end — flush with coolant/air, keep nests from forming around the cut, and handle swarf with the hazard (sharp/hot/flammable/toxic-for-some-metals) respected, not bare-handed.

### 13. Housekeeping makes the abnormal visible — the practice failure is *sustaining* it
Grounded in the swarf-discipline source above and the SMED staging discipline (a staged, organized setup is the precondition for fast, error-free changeover). The practitioner point distinct from the foundations file's 5S *theory*: an organized station ("a place for everything") is what makes a missing tool, a leak, a wrong fixture, or a chip nest **immediately visible** — and the near-universal failure mode is not *creating* the order but **sustaining** it once the production pressure returns. **Expert avoidance:** bake housekeeping (chip clearing, tool return, fixture staging) into the changeover routine itself so order is maintained *by the work*, not by a separate, skippable cleanup step. *(The 5S pillar definitions and their lean lineage are owner-covered in `shop-floor-foundations.md` §5 — not repeated here.)*

---

## Owner-gate (NOT promoted)

Numeric / shop-specific / uncertain items the **shop-floor-owner** must verify before any engine hardcodes them. None of these is asserted as fact above — only the qualitative relationship is.

- **Thermal-growth rates & warm-up duration** — the Anebon source publishes micron-per-degree material-growth figures, column-growth-per-degree, a specific warm-up speed/duration, and a temperature-gradient trigger for auto-compensation. All are **owner-gated** (shop-, machine-, and material-specific; route any constant through `constants.ts`). Only "hotter -> larger -> drift; warm to equilibrium before setting offsets" is promoted.
- **Chip-control heat split & feed/speed relationship** — the Production Machining source publishes the steel heat-split percentage (heat leaving in chip vs. part vs. tool) and the qualitative feed-vs-speed trade-off. The *direction* is promoted; the **percentages and any feed/speed/DOC/chip-load value are owner-gated** (no numeric cutting value here per R12).
- **Swarf fire-class / exposure specifics** — Class-D extinguisher applicability and reactive/toxic-metal handling (beryllium etc.) are real but **material- and jurisdiction-specific**; the owner should bind them to the shop's actual material set and EHS program, not a generic constant.
- **First-article triggers** — the *list* of events that mandate a fresh FAI (process change, new tooling, new operator, production lapse, design/revision change) is described qualitatively from context; the **shop's binding FAI-trigger policy and any AQL/sampling numbers are owner-gated** (no numeric AQL/Cpk here per R12).
- **SMED improvement-per-cycle figure** — the SMED source cites an expected per-cycle improvement percentage; treated as illustrative and **owner-gated**, not a target to hardcode.
- **LOTO procedural specifics** — group-lockout hasp mechanics, authorized-remover exception procedures, and energy-dissipation methods are equipment-specific; the *principles* (own-lock, lock-tag-try, dissipate stored energy, distinct LOTO state) are promoted, the **machine-specific procedures stay with the owner / the equipment's energy-control procedure**. No numeric safety threshold is asserted.

## Sources (URLs actually WebFetched + confirmed this pass)
- [Wikipedia, "Single-Minute Exchange of Die" (SMED)](https://en.wikipedia.org/wiki/Single-Minute_Exchange_of_Die)
- [OSHA, "Control of Hazardous Energy" (lockout/tagout, 29 CFR 1910.147)](https://www.osha.gov/control-hazardous-energy)
- [Wikipedia, "Lockout-tagout"](https://en.wikipedia.org/wiki/Lockout%E2%80%93tagout)
- [cnccode.com, "G43, G44, G49: Tool Length Compensation in CNC — Prevent Z-Axis Errors"](https://cnccode.com/2025/07/13/g43-g44-g49-tool-length-compensation-in-cnc-prevent-z-axis-errors/)
- [Wikipedia, "First article inspection"](https://en.wikipedia.org/wiki/First_article_inspection)
- [Anebon Metal, "Thermal Management in CNC Machining: Preventing Dimensional Growth During Production"](https://anebonmetal.com/thermal-management-in-cnc-machining-preventing-dimensional-growth-during-production/)
- [Production Machining (Gardner Business Media), "The Fundamentals of Chip Control"](https://www.productionmachining.com/articles/the-fundamentals-of-chip-control)
- [Wikipedia, "Swarf"](https://en.wikipedia.org/wiki/Swarf)

NOTE on attempted-but-dropped sources (R12 honesty): CNCCookbook tool-offset/fixture-offset article URLs returned only the client-side-rendered homepage (no article body) and were dropped in favor of the cnccode.com guide; two Machining Doctor glossary URLs (thermal-growth, chip-control) and three DuraLabel/Graphic Products LOTO article URLs returned HTTP 404 on retry; the uneedpm.com thermal page returned HTTP 403; and the Lean Lexicon 5S term-page slug 404'd. These were NOT cited — the own-lock/try-out LOTO discipline was confirmed instead via the Wikipedia Lockout-tagout article, and 5S *practice* was grounded in the confirmed swarf/SMED sources with the 5S theory deferred to the foundations file.

## Cross-refs
- Theory spine: `knowledge/wiki/shop-floor/shop-floor-foundations.md`
- Living free-source directory: `knowledge/wiki/shop-floor/shop-floor-source-atlas.md`
- Galaxy brain: `mcp-server/src/engines/shop-floor/MEMORY.md`
- Owner-gated raw packet: `knowledge/wiki/shop-floor/_staging/deep-domain-research-2026-06-09.md`
