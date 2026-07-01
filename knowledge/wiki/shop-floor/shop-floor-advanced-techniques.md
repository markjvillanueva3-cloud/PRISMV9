---
title: Shop-Floor Advanced Techniques — TOC/drum-buffer-rope, OEE loss-tree prioritization, SMED conversion, TPM autonomous maintenance, predictive/condition-based maintenance, digital twin, takt balancing
galaxy: shop-floor
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-advanced-techniques (2026-06-10)"
verification_method: "World-leader-depth STRATEGY layer. Every technique below was WebFetch-confirmed this pass against a reputable free/legal source (Wikipedia method articles, MIT OpenCourseWare). Sources that 403/404'd or exceeded redirect limits were retried once then DROPPED, not cited (R12 honesty). This entry promotes ONLY the qualitative STRATEGY / METHOD / trade-off DIRECTION an expert reaches for BEYOND the intro theory (shop-floor-foundations.md) and the common gotchas (shop-floor-applied-practice.md). NO numeric cutting constant (RPM/SFM/IPR/IPT/feed/DOC/chip-load/coolant-psi), NO numeric OEE/Cpk/control-limit/AQL, NO numeric P-F-interval window or maintenance threshold is asserted — where a source publishes one, the relationship is described qualitatively and the number is owner-gated for golf (see Owner-gate + constants.ts)."
tags: [shop-floor, advanced-techniques, theory-of-constraints, toc, drum-buffer-rope, bottleneck, oee-loss-tree, six-big-losses, smed-conversion, tpm, autonomous-maintenance, predictive-maintenance, condition-based-maintenance, condition-monitoring, p-f-interval, digital-twin, digital-shadow, takt-time, line-balancing, flow, strategy]
---

# Shop-Floor Advanced Techniques

The **world-leader-depth STRATEGY** layer for the **shop-floor** galaxy: the state-of-the-art methods a top-of-field manufacturing-systems / production-control expert reaches for *after* the intro theory and *beyond* the common gotchas — the advanced strategy that makes the difference between a shop that merely measures OEE and one that systematically grows it.

**How this differs from its siblings (R8 — no duplication):**
- `shop-floor-foundations.md` is the THEORY spine — it *defines* the concepts (OEE = A x P x Q and the Six Big Losses, the heijunka grid, jidoka/andon, 5S pillars, ISA-95 levels, MES definition, the TPM eight pillars' *existence*, the MIT-OCW topic spines). It answers *"what are these things."*
- `shop-floor-applied-practice.md` is the GOTCHA layer — the practice failures (wrong tool-length offset crash, thermal-growth drift, skipped first-article, chip-control loss, SMED external-while-stopped waste, LOTO own-lock/try). It answers *"what goes wrong and how an expert avoids it."*
- **This file is "the advanced STRATEGY that wins at the top of the field."** It does not re-define OEE or re-list the TPM pillars — it captures *how an expert turns OEE into a prioritized improvement program, how the constraint reorganizes the whole line, how internal setup is systematically converted away, how maintenance ownership shifts to the operator, and how live virtual models close the prediction loop.*

Every technique is WebFetch-confirmed and cited inline. Each gives the technique + WHEN an expert reaches for it + the trade-off DIRECTION + how THIS galaxy applies it. Numeric values any source published are deliberately **owner-gated** for golf — only the qualitative relationship is promoted.

---

## 1. Constraint-driven scheduling (Theory of Constraints)

### 1.1 The five focusing steps — improve the constraint, not everything
WebFetch-CONFIRMED against [Wikipedia, "Theory of constraints"](https://en.wikipedia.org/wiki/Theory_of_constraints). A constraint is "anything that prevents the system from achieving its goal," and constraints are "typically few in number — not tens or hundreds." The expert method is the five focusing steps: **Identify** the constraint, **Exploit** it (wring maximum output from it without new capital), **Subordinate** everything else to that decision, **Elevate** the constraint (add capacity only after exploiting), and **Repeat** — explicitly "do not allow inertia to cause a system's constraint."
- **WHEN an expert uses it:** when a line is slow but it is not obvious *where* to spend improvement effort — TOC says the only improvement that raises throughput is improvement *at the constraint*; effort spent on a non-bottleneck is wasted.
- **Trade-off DIRECTION:** maximizing utilization of *every* machine is the wrong goal — non-constraints with spare capacity are *correct*, not idle waste. The strategy concentrates effort and trades local efficiency for global throughput.
- **PRISM application:** an OEE/dispatch surface should be able to *rank* machines by which one gates line throughput (the constraint), so improvement and maintenance budget flows there first — not be a flat per-machine scoreboard that implies every station deserves equal attention.

### 1.2 Drum-Buffer-Rope release control
WebFetch-CONFIRMED against the same TOC article. DBR is "a manufacturing execution methodology based on the fact the output of a system can only be the same as the output at the constraint of the system." The **Drum** is the constraint's pace (it sets the whole line's beat), the **Buffer** protects the constraint from starvation so it never runs dry, and the **Rope** controls work-release timing to prevent excess work-in-process piling up upstream.
- **WHEN an expert uses it:** to schedule release of raw material/orders onto the floor — instead of pushing every job in as fast as possible, release is *roped* to the constraint's rate.
- **Trade-off DIRECTION:** deliberately holding work back (less WIP upstream) raises flow and predictability; pushing more material in only inflates WIP without raising the constrained output. Protect the constraint (buffer) but starve the floor of excess (rope).
- **PRISM application:** the heijunka dispatch board (foundations §3) gains a release-gate model — the column cadence should be *roped to the constraint machine's drum*, and a protective time-buffer sized in front of the constraint, rather than releasing kanban purely on a fixed clock blind to where the bottleneck is.

---

## 2. OEE as a prioritized loss-tree, not a scoreboard

### 2.1 Loss-tree decomposition → attack the dominant loss first
WebFetch-CONFIRMED against [Wikipedia, "Total productive maintenance"](https://en.wikipedia.org/wiki/Total_productive_maintenance). The advanced move is to use OEE decomposition to "identify then prioritize and eliminate the causes of the losses" — attacking the Six Big Losses (breakdowns, waiting, minor stops, reduced speed, scrap, rework) as a *ranked hierarchy* "rather than ad-hoc problem-solving." This treats the OEE = Availability x Performance x Quality identity (foundations §2) as a diagnostic *tree*: a low OEE number is meaningless until it is split into which factor, then which loss category, is dragging it down.
- **WHEN an expert uses it:** the moment OEE is being *acted on* rather than merely reported — the score itself is uninformative; the decomposition tells you whether to send a maintenance crew (availability), a process engineer (performance), or a quality engineer (quality).
- **Trade-off DIRECTION:** chasing the largest single loss first yields the most OEE per unit effort; spreading effort evenly across all six losses dilutes it. Prioritize by loss magnitude, not by which loss is easiest.
- **PRISM application:** an OEE engine must *attribute* each lost minute to one of the three factors and one of the six losses (e.g. distinguish a breakdown-availability loss from a planned-maintenance or LOTO state — see applied-practice §11), so the surface emits a *ranked action list* ("biggest loss = minor stops on VMC-03"), not a bare percentage.

---

## 3. Setup-time reduction as a systematic conversion strategy (advanced SMED)

### 3.1 Convert internal setup to external — the highest-leverage move
WebFetch-CONFIRMED against [Wikipedia, "Single-minute exchange of die"](https://en.wikipedia.org/wiki/Single-minute_exchange_of_die). The applied-practice file already covers the *basic* internal/external split; the advanced strategy is the deliberate **conversion of internal steps to external** — re-engineering a step that today requires the machine stopped so that tomorrow it can be done while the machine still runs. Shingo's hierarchy of streamlining techniques follows: **standardize function not shape** (so tools/dies interchange), **use functional clamps or eliminate fasteners** (Shingo: "it's only the last turn of a bolt that tightens it — the rest is just movement"), **use intermediate jigs** to pre-position, **adopt parallel operations** (multiple operators compress the timeline), **eliminate adjustments** by designing precision into the process, and **mechanize only as the last step** — after the manual process is already optimized.
- **WHEN an expert uses it:** high-mix/low-volume shops where changeover dominates available spindle time — the conversion strategy is what takes setup from hours toward minutes.
- **Trade-off DIRECTION:** invest design effort *up front* (quick-release fixtures, standardized functions, presetting) to buy back recurring stopped-machine minutes on every changeover. Mechanization is *last*, never first — automating an un-streamlined process just automates the waste.
- **PRISM application:** a setup/changeover model should classify each setup step as internal/external *and flag conversion candidates*, and treat presetting (applied-practice §6) as the canonical internal→external conversion of the tool crib — emitting "this step could be done while the prior job runs" rather than only timing the stopped changeover.

---

## 4. Maintenance strategy — from calendar to condition to operator-ownership

### 4.1 Predictive (condition-based) maintenance — act on condition, not the calendar
WebFetch-CONFIRMED against [Wikipedia, "Predictive maintenance"](https://en.wikipedia.org/wiki/Predictive_maintenance). Predictive maintenance "differs from preventive maintenance because it does take into account the current condition of equipment (with measurements), instead of average or expected life statistics," scheduling work "when the maintenance activity is most cost-effective and before the equipment loses performance." This is the state-of-the-art replacement for fixed-interval preventive maintenance.
- **WHEN an expert uses it:** on equipment where unplanned failure is expensive *and* a measurable degradation signal exists (rotating spindles, hydraulics, motors).
- **Trade-off DIRECTION:** condition-based scheduling avoids *both* extremes — it prevents the unexpected-failure cost of run-to-failure *and* eliminates the premature-replacement waste of calendar-based preventive maintenance. Predict-then-act dominates fixed-interval when a degradation signal is observable.
- **PRISM application:** the maintenance side of the Level-3 MES model (foundations §8) should carry a per-machine *condition* state derived from telemetry, not just a "next PM due date" clock — and feed predicted availability-loss into the OEE loss-tree (§2) before the breakdown happens.

### 4.2 Condition monitoring and the P-F interval — detect inside the warning window
WebFetch-CONFIRMED against [Wikipedia, "Condition monitoring"](https://en.wikipedia.org/wiki/Condition_monitoring). Condition monitoring is "the process of monitoring a parameter of condition in machinery (vibration, temperature etc.), in order to identify a significant change which is indicative of a developing fault." The strategic primitive is the potential-failure-to-functional-failure window: a degrading bearing "exhibit[s] vibration signals at specific frequencies increasing in intensity as it wears," and instruments "can detect this wear weeks or even months before failure, giving ample warning to schedule replacement before a failure which could cause a much longer down-time." Technique families: vibration analysis, thermography, oil/tribology analysis, acoustic emission, and motor-current signature analysis (MCSA).
- **WHEN an expert uses it:** to *implement* §4.1 — condition monitoring is the sensing layer that makes predictive maintenance possible; the expert picks the technique family matched to the failure mode (vibration for rotating elements, oil for lubricated wear, thermography for electrical/mechanical hot spots).
- **Trade-off DIRECTION:** establish a baseline, watch for deviation, and intervene *inside* the P-F window — early enough to plan, late enough to not replace a healthy part. Detecting too early wastes life; detecting at functional failure defeats the purpose.
- **PRISM application:** a machine-health surface should model degradation as a *trend toward a fault*, raising a planned-maintenance advisory while the part is still running — so the maintenance is scheduled into a low-demand window rather than erupting as an availability loss mid-run.

### 4.3 TPM autonomous maintenance — push ownership to the operator
WebFetch-CONFIRMED against [Wikipedia, "Total productive maintenance"](https://en.wikipedia.org/wiki/Total_productive_maintenance). The advanced TPM strategy (beyond foundations §16's pillar *list*) is the *redistribution* of maintenance ownership: operators "who use all of their senses to help identify causes for losses" become first-line sensors and responders, and TPM requires "full participation of entire organisation from top to frontline operators." Maintenance becomes a company-wide cultural commitment rather than a separate department's job.
- **WHEN an expert uses it:** when breakdowns cluster around early-stage deterioration that a specialist crew sees too late but the operator-at-the-machine could catch daily (loose fastener, leak, abnormal noise).
- **Trade-off DIRECTION:** shifting routine inspection/cleaning/early-detection *to the operator* catches deterioration earlier and frees the specialist crew for deep work — trading a small amount of operator time for a large reduction in surprise breakdowns. This is the human descendant of jidoka/andon empowerment (foundations §4, §15).
- **PRISM application:** the operator-facing andon/board model should accept *operator-reported* equipment-condition signals as first-class data (an autonomous-maintenance observation), routing them into the same machine-health trend as the sensor telemetry of §4.2 — the operator is a sensor, not noise.

---

## 5. Live virtual models & demand-paced flow

### 5.1 Digital twin / digital shadow — the live-synced virtual model
WebFetch-CONFIRMED against [Wikipedia, "Digital twin"](https://en.wikipedia.org/wiki/Digital_twin). A digital twin is "a computational model of an intended or actual real-world physical product, system, or process" that "continuously uses real data from its physical counterpart to dynamically synchronize with the real system" — the live-sync is what distinguishes it from an ordinary offline simulation. The strategy distinguishes a **digital shadow** ("data flows one way from the physical asset to the digital model") from a **true digital twin** where "the data flow is bidirectional, allowing the twin to also send control commands back to the asset." In production it is used to "monitor a process in real time," to "predict when a component is likely to fail," and to test design/process choices in simulation before committing them physically.
- **WHEN an expert uses it:** to run what-if and predictive analysis on a *live* process without disturbing it — the twin answers "what happens if we change this" and "when will this fail" against current state, not a stale model.
- **Trade-off DIRECTION:** invest in the data-integration plumbing (sensors → live model) to gain risk-free experimentation and forward prediction; a one-way digital shadow is cheaper and safer to start, a bidirectional twin is more powerful but can *act* on the asset (a control-safety boundary). This mirrors the MTConnect read-only vs. OPC-UA-writeback split in foundations §1 — a shadow can ride read-only telemetry; a true twin needs a write path.
- **PRISM application:** PRISM's machine model + OEE + condition-monitoring surfaces, fed by live telemetry, *are* a digital shadow of the floor; the architecture should keep monitoring/prediction (shadow, read-only) cleanly separated from any command-back capability (true twin, write path) so safety gates govern the writeback.

### 5.2 Takt-time pacing and station balancing — match demand, balance to it
WebFetch-CONFIRMED against [Wikipedia, "Takt time"](https://en.wikipedia.org/wiki/Takt_time). Takt time is "based on customer demand" — the rate production must match; "if a process or a production line are unable to produce at takt time, either demand leveling, additional resources, or process re-engineering is needed." The balancing strategy distributes work so each station "completes its tasks within the takt interval," and when demand rises "tasks have to be either reorganized to take even less time to fit into the shorter takt time, or they have to be split up between two stations."
- **WHEN an expert uses it:** to design or rebalance a multi-station cell/line — takt sets the target beat, and work is balanced across stations to that beat rather than each station running flat-out.
- **Trade-off DIRECTION:** pace to *demand*, not to maximum machine speed — running faster than takt only overproduces and builds inventory waste; the strong motivation is to "get rid of all non-value-adding tasks" so the value-added work fits inside the takt. Match the pace and balance the stations, do not maximize throughput blindly.
- **PRISM application:** the dispatch/flow model should compute the demand-paced beat and surface station imbalance against it (which station can't fit its work into takt = the flow constraint, tying back to the TOC constraint of §1), so leveling advice is demand-driven — distinct from the constraint-*throughput* view of §1 and complementary to it.

---

## Owner-gate (NOT promoted)

Numeric / shop-specific / uncertain items the **golf** owner must verify before any engine hardcodes them. None is asserted as fact above — only the qualitative relationship and method direction is promoted. Per R12-SAFETY, NO cutting constant or numeric threshold appears in the body; all such values route through `mcp-server/src/physics/constants.ts` or stay shop-configurable.

- **Any cutting constant** (RPM / SFM / IPR / IPT / feed / depth-of-cut / chip-load / coolant pressure) — none belongs in a strategy entry; these live ONLY in `constants.ts`. No source number of this kind was promoted.
- **OEE / loss target numbers** — the "85% = world class" figure is explicitly contested (foundations §2). The loss-tree *method* (§2) is promoted; any numeric OEE target, loss-threshold, or per-loss budget is owner-gated and shop-configurable.
- **SMED conversion / improvement figures** — the "single-minute" (under-ten-minutes) goal and any per-cycle improvement percentage are illustrative; only the conversion *strategy* and technique *priority order* (§3) are promoted. Numbers owner-gated.
- **Predictive / condition-monitoring thresholds** — the P-F interval window length ("weeks or months"), vibration-frequency limits, temperature-deviation triggers, oil-debris limits, and any condition-alarm setpoint (§4.1, §4.2) are machine-, bearing-, and material-specific and owner-gated. Only "detect inside the warning window; act on condition not calendar" is promoted.
- **TPM zero-state / availability targets** — any "zero breakdowns" target or availability number (§4.3) is an aspiration to be made shop-configurable, not a hardcoded constant.
- **Takt-time / line-balance values** — the takt formula's inputs (available time, customer demand) and any station cycle-time number (§5.2) are demand- and shop-specific and owner-gated. Only "pace to demand, balance stations to takt" is promoted.
- **Digital-twin / writeback safety boundary** — the read-only-shadow vs. bidirectional-true-twin distinction (§5.1) is promoted as an *architecture* direction; any actual command-back capability must pass PRISM safety gates (`prism_safety`) — owner-gated, never auto-enabled.

## Sources (URLs actually WebFetched + confirmed this pass)
- [Wikipedia, "Theory of constraints"](https://en.wikipedia.org/wiki/Theory_of_constraints) — five focusing steps + drum-buffer-rope (§1)
- [Wikipedia, "Total productive maintenance"](https://en.wikipedia.org/wiki/Total_productive_maintenance) — OEE loss-tree prioritization + autonomous-maintenance ownership shift (§2, §4.3)
- [Wikipedia, "Single-minute exchange of die"](https://en.wikipedia.org/wiki/Single-minute_exchange_of_die) — internal→external conversion + streamlining technique hierarchy (§3)
- [Wikipedia, "Predictive maintenance"](https://en.wikipedia.org/wiki/Predictive_maintenance) — condition-based vs. calendar maintenance, trade-off direction (§4.1)
- [Wikipedia, "Condition monitoring"](https://en.wikipedia.org/wiki/Condition_monitoring) — P-F interval + technique families (§4.2)
- [Wikipedia, "Digital twin"](https://en.wikipedia.org/wiki/Digital_twin) — live-sync virtual model, shadow vs. true twin (§5.1)
- [Wikipedia, "Takt time"](https://en.wikipedia.org/wiki/Takt_time) — demand-paced flow + station balancing (§5.2)

NOTE on attempted-but-dropped sources (R12 honesty): the MIT OCW 2.810 "Manufacturing Processes and Systems" lecture-notes page exceeded the redirect limit on two attempts (a second distinct URL form was retried, also failed) and was DROPPED rather than cited unverified. The MIT-OCW manufacturing-systems topic spines that ARE confirmed (2.854 / 2.852 / 16.660J / 15.760A) are already cited in `shop-floor-foundations.md` §11/§13 and are not re-fetched here.

## Cross-refs
- Theory spine: `knowledge/wiki/shop-floor/shop-floor-foundations.md`
- Gotcha layer: `knowledge/wiki/shop-floor/shop-floor-applied-practice.md`
- Living free-source directory: `knowledge/wiki/shop-floor/shop-floor-source-atlas.md`
- Galaxy brain: `mcp-server/src/engines/shop-floor/MEMORY.md`
- Physics/numeric constants (owner-gated): `mcp-server/src/physics/constants.ts`
