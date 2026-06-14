---
title: Post-Processor Applied Practice — practitioner gotchas, failure modes, and dialect traps a CNC post must get right
galaxy: post-processor
owner_slot: echo
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice (2026-06-10)"
verification_method: "Each practitioner claim below was individually WebFetch-confirmed against a reputable free/legal source (LinuxCNC docs, Machining Doctor, CNCCookbook, CNC Training Centre, and the official Haas G187 codes-settings page surfaced via WebSearch). Claims are QUALITATIVE only: failure modes, technique decisions, and the DIRECTION of a trade-off. NO numeric cutting value (RPM/SFM/feed/DOC/chip-load), NO controller-numeric default (Haas Setting values, Fanuc parameter values, retract distances), and NO numeric safety threshold is asserted — every such number is left owner-gated for echo (PRISM sources physics numbers ONLY from src/physics/constants.ts and controller numerics from the specific machine's manual, never the web). Distinct from post-processor-foundations.md (theory/standards/structure) and post-processor-source-atlas.md (link directory) — this entry is 'what goes wrong and how an expert avoids it.'"
tags: [post-processor, g-code, practitioner, gotchas, failure-modes, arc-ijk-vs-r, canned-cycles, tool-length-offset, cutter-comp, g41-g42, work-offsets, modal-state, g90-g91, g28, dialect-traps, fanuc, haas, okuma, siemens, rigid-tapping, subprograms, m98-m99, safe-retract, verification]
---

# Post-Processor Applied Practice

The **practitioner-knowledge** layer for the **post-processor** galaxy: the hard-won tribal knowledge a
world-class post expert carries that pure theory does not teach — the **failure modes**, **gotchas**, and
**technique decisions** that separate a post that *parses* from a post that *makes a good part without a
crash*. The foundations file (`post-processor-foundations.md`) teaches the standards and the construct
*structure*; this file teaches **what breaks and how an expert avoids it**.

**Safety discipline (this is a cutting / safety / capability galaxy):** every entry below is **qualitative**
— a failure-mode description, a decision rule, or the *direction* of a trade-off. No numeric cutting value,
no controller-numeric default, and no numeric safety threshold appears here; all such numbers are
**owner-gated** for echo (see `## Owner-gate`). PRISM sources physics numbers only from
`mcp-server/src/physics/constants.ts` and controller numerics from the **specific machine's manual**, never
the web.

---

## Common failure modes (the silent-crash class)

### 1. Arc programmed in R-format near a half-circle or full circle — endpoint precision blows up
**Gotcha:** specifying an arc by **R (radius)** instead of **I/J/K (center offset)** is mathematically fragile
near 180 degrees. LinuxCNC states the radius format **"is not good practice to program ... nearly full
circles or nearly semicircles"**, because a tiny endpoint error is hugely amplified mid-arc:
**"a 1% displacement of the endpoint of a 180 degree arc produced a 7% displacement of the point 90 degrees
along the arc."** **Why it bites the post:** at exactly 180 degrees the center is *indeterminate* from R
alone, so the control picks a solution and the cutter wanders off the intended arc. **Expert avoidance:**
LinuxCNC's rule — **"Center format arcs are more accurate than radius format arcs and are the preferred
format to use."** A good post emits **I/J/K center format** (it always knows the exact center from the CAM
geometry) and reserves R only for short, well-conditioned arcs; the documented usable R band excludes the
near-semicircle / near-full-circle zones. *(Source: LinuxCNC G-code arc reference.)*

### 2. Arc center words bound to the wrong plane (G17/G18/G19)
**Gotcha:** which offset words are legal depends on the **active plane** — G17 (XY) uses **I,J**; G18 (XZ)
uses **I,K**; G19 (YZ) uses **J,K**. A post that hard-codes I/J for every arc emits an *invalid* or
*wrong-plane* arc the moment a job runs in G18/G19. LinuxCNC: **"One or more axis words and one or more
offsets must be programmed for an arc that is less than 360 degrees."** **Expert avoidance:** the post must
read the active plane and emit the matching offset-word pair, and it must round arc words to enough decimal
places — LinuxCNC warns that **rounding to too few decimal places** on arc words produces error. *(Source:
LinuxCNC G-code arc reference.)*

### 3. G43 tool-length offset updates the display but the tool does not physically move
**Gotcha:** the effect of **G43** on Z is **immediate in the coordinate readout but has no effect on the
actual machine position until a Z movement is programmed.** A post (or operator) that issues G43 and assumes
the tool is now at the offset height — without a commanded Z move — is reasoning from a DRO number, not a
machine position. Compounding it: the H/offset number **"does not have to be the same as the slot number of
the tool currently in the spindle"** — so a post can legally call the *wrong* offset for the loaded tool and
nothing errors. **Expert avoidance:** the post always pairs G43 with an explicit, safe Z approach move, and
single-sources the H-number from the same tool record that drives the toolchange so the offset can never
drift from the physical tool. *(Source: LinuxCNC tool-compensation docs.)*

### 4. A canned cycle silently repeats on the next positioning move
**Gotcha:** canned cycles (G81-G89) are **modal** — they **repeat whenever a subsequent block contains an
axis word.** LinuxCNC: **"If a canned cycle is not turned off with G80 or another motion word, the canned
cycle will attempt to repeat itself."** So a post that emits a drilling cycle and then a *rapid to a clearance
position* using X/Y/Z words will **re-drill at that clearance position** — a hole where no hole belongs, or a
plunge into a clamp. **Expert avoidance:** emit **G80** (or a fresh G0/G1/G2/G3 motion word) to cancel the
cycle before any non-cycle positioning move; never let a bare X/Y move follow an active cycle.
*(Source: LinuxCNC canned-cycle reference.)*

### 5. Sticky cycle parameters carried from the previous operation
**Gotcha:** within an active cycle the **R (retract) word is "sticky"** and the **Z depth is sticky in the
XY plane** — they persist into the next hole unless re-specified, while **P and Q must be re-specified** when
they change. A post that omits R on the second tool because "it was already set" can inherit a *stale retract
plane* from a deeper previous operation and either crash on retract or pull up short. **Expert avoidance:**
the expert post re-emits R (and Z) on every cycle invocation rather than trusting stickiness across operation
or tool boundaries — explicit beats modal-inherited for safety-class words. *(Source: LinuxCNC canned-cycle
reference.)*

---

## Technique decisions (the trade-offs an expert makes deliberately)

### 6. Canned cycle vs. longhand, and the G98/G99 retract choice
**Decision:** a canned cycle (`G8x ... R ...`) is compact and lets the *control* own the peck/dwell/retract
logic; writing the moves **longhand** (G0/G1 lines) gives total control but loses the control's optimized
look-ahead and is verbose. The retract-level sub-decision is **G98 vs G99**: **G98 retracts to the higher of
the original pre-cycle Z or the R level; G99 always retracts to R.** **Why it matters:** G99 (retract to R)
is faster between holes on an open face, but on a part with **clamps or standing features between holes**, G99
can retract *below the obstruction* and the next rapid traverse shears into it — that is the classic G99
clamp-crash. **Expert avoidance:** use **G99 across an open hole field, G98 to clear any feature between
holes**, and remember the retract mode **"is reset any time cycle motion mode is abandoned"** — so it must be
re-asserted per cycle group. *(Source: LinuxCNC canned-cycle reference.)*

### 7. The L repeat count behaves completely differently in G90 vs G91
**Decision/trap:** with a canned cycle, **L>1 in absolute mode (G90) re-runs the cycle at the *same* location**
(usually useless or destructive), whereas **L in incremental mode (G91) steps the cycle by the programmed
increment** to drill a line of equally-spaced holes — **"If the repeat feature is used, it is normally used in
incremental distance mode."** **Why it bites:** a post that emits an L-count while the distance mode is G90
drills the same hole N times instead of N holes. **Expert avoidance:** the post pairs any L-repeat with an
explicit G91 and restores G90 afterward; it never relies on the ambient distance mode for a repeat-count
cycle. *(Source: LinuxCNC canned-cycle reference.)*

### 8. Rigid tapping — feed must equal pitch times RPM, and the "changed the speed, forgot the feed" trap
**Decision/trap:** in feed-per-minute mode the tapping feed is bound by **feed = pitch x RPM**. The classic
shop failure: **"You change the speed and forgot to change the feed. We all know what happened next"** — a
feed/RPM mismatch on a *rigid* tap (no floating holder to absorb it) snaps the tap or strips the thread.
**Expert avoidance:** program tapping in **feed-per-rev (G95) so the feedrate *is* the pitch** — **"if you
change the speed of the tap you don't change the feed because it's the pitch"** — which removes the math and
the forget-to-update failure entirely. The companion trap: **"don't forget to change back to G94 at the end
of the tapping"** (a left-on G95 mis-scales every later feed). A floating tension/compression holder forgives
a small mismatch but trades away depth repeatability; rigid tapping needs the pitch math *exactly* right.
*(Source: CNC Training Centre rigid-tapping G84 guide.)*

### 9. Cutter compensation lead-in must be at least the tool radius — and you cannot turn it on twice
**Decision/trap:** when enabling cutter radius comp (**G41 left / G42 right of the path**), **"the lead in
move must be at least as long as the tool radius"** — a lead-in shorter than the radius leaves the control no
room to ramp the offset and it **gouges or errors.** It is also an **error to command comp on when it is
already on**, and when cancelling with G40 the **"linear move after turning compensation off [must be more
than] the tool diameter,"** with a **G2/G3 arc immediately after G40 being an error.** Comp is only valid in
the **XY or XZ plane.** **Expert avoidance:** the post brackets every comp region with a deterministic
lead-in/lead-out (linear, longer than the tool, away from the finished wall), always starts from a known
**G40 off** state, and never stacks a second G41/G42 without cancelling first. *(Sources: LinuxCNC
tool-compensation docs + LinuxCNC G41/G42 reference.)*

---

## Setup, fixturing & modal-state gotchas

### 10. Wrong distance mode left active (G90 vs G91) — the catastrophic-positioning class
**Gotcha:** distance mode is **modal** and **"leaving the wrong distance mode active causes catastrophic
positioning errors"** — a program intending absolute coordinates while G91 incremental is still in force
moves the tool to unintended locations, **"potentially crashing into the workpiece or fixture."** A frequent
real cause: **"Leave G91 active after a subprogram, expecting G90 behavior."** **Expert avoidance:** the
reference's own remedy — emit a **"safe start block"** that explicitly re-asserts the critical modal groups
(distance mode, plane, feed mode, units, comp-off) **after every tool change** and at program top, rather
than trusting whatever state the previous tool or subprogram left behind. *(Source: Machining Doctor G-code
modal reference.)*

### 11. G28 home-return slams through part-zero when left in absolute mode
**Gotcha:** **G28 (reference return) is a two-step move through an intermediate point**, and in **absolute
(G90) mode the intermediate point is referenced to *part zero*** — Machining Doctor / CNCCookbook:
**"In absolute mode, the intermediate point is relative to part zero. That means it will bounce the tip off
part zero, which could easily result in a crash"**, and bare G28 can **"move all the machine's axes
simultaneously to zero position ... [which] will cause a crash."** **Expert avoidance:** the post emits
**G91 on the same line as G28** so the intermediate point is *relative to current position*, and biases the
move to **"move the Z-axis first ... up and away from the workpiece until you have straight-line access to the
zero position."** The same applies to G30 second-reference returns. *(Sources: Machining Doctor G28/G30 +
CNCCookbook G28.)*

### 12. Subprogram variable scope differs between rs274ngc-style and Fanuc M98/M99-style — values leak (or don't)
**Gotcha:** the *same-looking* subprogram call has **opposite variable semantics** by dialect family. In
traditional rs274ngc subroutines, low-numbered parameters are **local** — **"on return from the subroutine,
the values of parameters #1 through #30 ... will be restored"** — but in **Fanuc-style M98/M99 subprograms
those parameters are global and modifications "will persist after subprogram return."** A post (or macro)
written assuming one model and run under the other either loses values it expected to keep, or corrupts the
parent program with values it expected to be local. **Expert avoidance:** the post pins the call-convention to
the target control's family, never **mixes the two styles** (LinuxCNC: **"the interpreter will raise an error
if definitions of one style are mixed with calls"** of the other), and treats cross-call state as global only
when the control's manual says so. *(Source: LinuxCNC O-code / subroutine docs.)*

---

## Controller-dialect traps (Fanuc vs Haas vs Okuma vs Siemens)

### 13. Haas G187 smoothing vs Fanuc AICC — the same intent, a totally different word and default model
**Gotcha:** the high-speed surface/accuracy trade-off is expressed by **different commands per control**, so a
post cannot reuse one dialect's smoothing block on another. **Haas** uses **`G187 Pn Ennnn`** — **P** selects
a smoothness mode (rough / medium / finish) and **E** sets a max corner-rounding tolerance — backed by a
**persistent global default (Setting 191)** that applies whenever no G187 is active; G187 is **cancelled by
RESET, M30, M02, or end of program.** **Fanuc** instead enables **AI Contour Control with `G05.1 Q1`** plus a
tolerance carried on an **R** value (and a per-tool enable/cancel — see foundations §4). **Why it bites the
post:** translating Haas `G187 P_ E_` into Fanuc `G05.1 Q1 R_` is not a token swap — the **default-when-absent
behavior** (Haas Setting 191 vs Fanuc control parameters), the **cancel triggers**, and the way each control
blends short line segments into arcs all differ, and getting it wrong leaves smoothing either always-on
(too-slow accel) or off (poor finish). **Expert avoidance (qualitative trade-off only):** *more smoothing /
looser corner tolerance -> faster motion but more corner deviation; tighter tolerance -> more accurate but
slower* — the expert post varies the mode per operation (looser for positioning/roughing, tighter for finish)
and keeps every numeric tolerance/Setting value owner-gated to the specific machine. *(Source: official Haas
G187 codes-settings page, surfaced via WebSearch; corroborated by the Autodesk Fusion AICC-vs-G187 forum
thread.)*

> **Dialect note (qualitative, from the foundations file, not re-derived here):** Fanuc HSM (AICC, `G05.1 Q1`)
> must be sequenced **before** `G43` and **suppressed around drilling canned cycles**, and the "AI" is the
> Alpha-I servo system, not artificial intelligence — see `post-processor-foundations.md` §4. Siemens 840D
> emits *named cycle calls* (e.g. CYCLE8x / CYCLE832) rather than Fanuc-style `G8x X.. Y.. Z.. R..` lines, and
> Okuma OSP and Fanuc differ on tool-nose/cutter-comp nuance — those dialect specifics remain **owner-gated**
> in the foundations file until WebFetch-confirmed against a reachable Siemens/Okuma source.

---

## Verification (proving the post before the first chip)

### 14. New reference/home and crash-class blocks are proven in single-block with overrides down
**Gotcha:** the most dangerous lines (G28/G30 returns, first cut after a comp lead-in, first canned-cycle
group) cannot be trusted from a screen read alone. **Expert avoidance:** the cross-source consensus is to
**"test new G28 commands in single block mode with overrides"** turned down — i.e., step the program one block
at a time with rapid and feed override at minimum so the operator can confirm each move's *direction* before
it completes, and only then restore full speed. This is the operator-layer backstop for every gotcha above:
the modal-state, work-offset, comp, and cycle errors that *parse fine* are caught by walking the first run in
single block with the cutter clear of the part. **Expert avoidance also extends upstream:** the post itself
should emit a deterministic safe-start preamble (units, plane, distance mode, comp-off, safe-Z) so the
single-block verification starts from a known state rather than an inherited one. *(Sources: Machining Doctor
G28/G30 + CNCCookbook G28 single-block/override guidance; safe-start-block from Machining Doctor modal
reference.)*

---

## Owner-gate (NOT promoted — echo verifies before any live engine/doctrine use)

Everything below is **numeric or controller-specific** and stays **owner-gated** for echo — PRISM sources
these from `mcp-server/src/physics/constants.ts` or the **exact machine's manual**, never the web:

- **All tapping numerics** — the actual feed value for any tap (the `pitch x RPM` *relationship* is promoted;
  any computed feed/RPM/pitch *number* is gated), and any "program the feed a few percent faster for a
  compression holder" magnitude.
- **Haas G187 / Setting 191 numerics** — the numeric corner-rounding tolerance (E value), the Setting 191
  default mode value, the parameter IDs it uses, and the cycle-time-saving magnitude. (The *structure*
  `G187 Pn Ennnn`, the P-mode meaning, the global-default concept, and the RESET/M30/M02 cancel triggers are
  promoted; the numbers are not.)
- **Fanuc AICC numerics** — the R tolerance value / level number, look-ahead block count, priority mapping,
  and any alarm numbers (these remain gated in the foundations file).
- **The cutter-comp lead-in length** beyond the qualitative "at least the tool radius / longer than the tool
  diameter" rule — the actual programmed lead-in distance is part/tool-specific and gated.
- **Any arc-word decimal-precision threshold** — the "too few decimal places causes rounding error" direction
  is promoted; the exact inch/mm decimal counts are LinuxCNC-specific and left to the live source.
- **Siemens 840D / Okuma OSP dialect specifics** — named-cycle parameter order, OSP comp nuance, and any
  numeric defaults — gated until WebFetch-confirmed against a reachable vendor source (see foundations
  Owner-gate).

## Sources (WebFetch-confirmed this pass)

- [LinuxCNC G-code reference — arcs (G2/G3), G41/G42 cutter comp, G81-G89 canned cycles](https://linuxcnc.org/docs/html/gcode/g-code.html) — confirmed center-format-preferred-over-radius, the near-semicircle precision amplification, plane->offset-word binding, arc decimal-precision warning, canned-cycle repeat/G80-cancel, sticky R/Z parameters, G98/G99 retract levels, L-count G90-vs-G91 behavior, G41/G42 lead-in >= tool radius, "comp on when already on" error, and G40-cancel move-length rules.
- [LinuxCNC tool compensation (G43/G49/G40/G41/G42)](https://linuxcnc.org/docs/html/gcode/tool-compensation.html) — confirmed G43 immediate-on-display-but-no-move-until-Z, H-number independent of loaded slot, and lead-in/gouging warnings.
- [LinuxCNC O-codes / subroutines](https://linuxcnc.org/docs/html/gcode/o-code.html) — confirmed rs274ngc local-parameter restore-on-return vs Fanuc-style M98/M99 global-persist, and the mixed-style error.
- [Machining Doctor — G-codes / modal groups](https://www.machiningdoctor.com/gcodes/) — confirmed modal-commands-persist, modal vs one-shot, the G90/G91 catastrophic-positioning hazard, G91-left-on-after-subprogram, and the safe-start-block recommendation.
- [Machining Doctor — G28 & G30 reference return](https://www.machiningdoctor.com/gcodes/g28-g30/) — confirmed the two-step intermediate-point move, absolute-mode crash, G91-with-G28, move-Z-first, and single-block-with-overrides verification.
- [CNCCookbook — G28 reference position](https://www.cnccookbook.com/g28-g-code-cnc-return-reference-position/) — corroborated (distinct source) the absolute-mode intermediate-point-bounces-off-part-zero crash and move-Z-up-first remedy.
- [CNC Training Centre — Rigid Tapping G84 Canned Cycle](https://www.cnctrainingcentre.com/rigid-tapping-g84-canned-cycle/) — confirmed feed = pitch x RPM, the changed-speed-forgot-feed failure, feed-per-rev (G95) so feed = pitch, the revert-to-G94 trap, and rigid vs floating holder.
- [Haas — G187 Setting the Smoothness Level (official codes-settings page, via WebSearch)](https://www.haascnc.com/service/codes-settings.type=gcode.machine=mill.value=G187.html) — confirmed `G187 Pn Ennnn` structure, P-mode smoothness + E corner-rounding, Setting 191 global default, and RESET/M30/M02/end-of-program cancellation. (Direct WebFetch returned 403; content surfaced via WebSearch of the official page, corroborated by the Autodesk Fusion AICC-vs-G187 forum thread.)

## Cross-refs
- Foundations (theory/standards/structure): `knowledge/wiki/post-processor/post-processor-foundations.md`
- Source atlas (living link directory): `knowledge/wiki/post-processor/post-processor-source-atlas.md`
- Galaxy brain: `mcp-server/src/engines/post-processor/MEMORY.md`
- Galaxy doctrine: `mcp-server/src/engines/post-processor/CLAUDE.md`
- [[feedback_psn_definition]] · [[feedback_check_units_first]] (UNITS-FIRST: G20/G21 + the safe-start preamble are a post's job)
