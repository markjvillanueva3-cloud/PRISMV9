---
title: Post-Processor Advanced Techniques — RTCP/TCPC kinematics, tilted work planes, controller-dialect abstraction, look-ahead/smoothing strategy, on-machine probing, extended work-offset discipline
galaxy: post-processor
owner_slot: echo
status: VERIFIED-PARTIAL
verified_by: "papa-advanced-techniques (2026-06-10)"
verification_method: "Each advanced technique below was individually WebFetch-confirmed against a reputable free/legal source (LinuxCNC g-code + o-code docs, Tim Markoski's FANUC G43.5 RTCP and G68.2 articles, Masso G54.1 docs, Machining Doctor G54 coordinate-systems reference, Modern Machine Shop G31 article). Claims are QUALITATIVE STRATEGY only: the technique, WHEN an expert reaches for it, and the DIRECTION of the trade-off. NO numeric cutting value (RPM/SFM/feed/DOC/chip-load/coolant psi), NO controller-numeric default (blend-tolerance value, look-ahead block count, parameter ID value, retract distance), and NO numeric safety threshold is asserted — every such number is owner-gated for echo (PRISM sources physics numbers ONLY from mcp-server/src/physics/constants.ts and controller numerics from the specific machine's manual, never the web). DISTINCT from post-processor-foundations.md (intro theory/standards/structure) and post-processor-applied-practice.md (common practitioner gotchas) — this entry is 'the advanced strategy that makes the difference at the top of the field.'"
tags: [post-processor, advanced, rtcp, tcpc, g43.4, g43.5, tool-center-point, g68.2, tilted-work-plane, g53.1, kinematics-independent, 3plus2, five-axis, g54.1, extended-work-offsets, g53, g52, g10, on-machine-probing, g31, skip-signal, macro-b, parametric, o-word, g61, g64, look-ahead, smoothing, path-blending, controller-dialect-abstraction, safe-retract]
---

# Post-Processor Advanced Techniques

The **world-leader-depth** layer for the **post-processor** galaxy: the state-of-the-art STRATEGIES an
expert post author reaches for *beyond* the intro theory (`post-processor-foundations.md`) and *beyond* the
common practitioner gotchas (`post-processor-applied-practice.md`). The foundations file teaches what the
constructs ARE; applied-practice teaches what breaks and how to avoid it; **this file teaches the advanced
methods that separate a competent post from a world-class one** — letting the machine do the rotary
compensation, programming kinematically-independent output, abstracting across dialects, and closing the
loop with on-machine measurement.

**Safety discipline (this is a cutting / safety / capability galaxy):** every entry below is **qualitative**
— the technique, the *decision* of when to use it, and the *direction* of a trade-off. No numeric cutting
value, no controller-numeric default (blend tolerance, look-ahead block count, parameter value, retract
distance), and no numeric safety threshold appears here; all such numbers are **owner-gated** for echo (see
`## Owner-gate`). PRISM sources physics numbers only from `mcp-server/src/physics/constants.ts` and
controller numerics from the **specific machine's manual**, never the web.

---

## I. Multi-axis kinematics: let the machine do the rotary compensation

### 1. RTCP / TCPC (G43.4) — program the tool tip, let the control solve the rotaries
**Technique:** Tool Center Point Control (Fanuc **G43.4**) makes the control "maintain the tool control
point in relation to the programmed point of the workpiece" — when a rotary axis turns, the control
automatically compensates with simultaneous linear-axis motion so the **tool tip stays exactly where it
was programmed**. As Markoski's RTCP reference puts it: with RTCP active, rotating an axis no longer "moves
the tool away from the workpiece"; the control "compensates with linear axis movements simultaneously,
keeping the cutting tool tip stationary at the intended contact point."
**When an expert uses it:** on any 5-axis or 3+2 job where the CAM output is relative to the *part*, not the
machine — so the post does NOT have to pre-bake the rotary-to-linear coupling and the program survives a
fixture re-locate or a different machine of the same kinematic family.
**Trade-off direction:** RTCP moves the kinematic burden from the post (brittle, machine-specific
pre-computed offsets) to the control (real-time, robust) — at the cost of requiring a control that has the
option enabled and a correctly configured kinematic model; get the model wrong and the compensation is
confidently wrong. It is cancelled with G49 and is modal.
**PRISM application:** an echo 5-axis post should emit **tool-tip coordinates wrapped in RTCP** rather than
attempting to fold the rotary compensation into linear words itself — pushing the kinematics to the control
is the more robust, more portable strategy. *(Source: FANUC G43.5 RTCP / Tim Markoski.)*

### 2. Vector RTCP (G43.5, I/J/K) — kinematically-INDEPENDENT output
**Technique:** **G43.5** is Fanuc's "RTCP Type II" — instead of explicit rotary-axis angles (A/B/C, the
G43.4 form), the program carries the **tool-axis vector as I,J,K directional cosines** (where "the square
root, of the sum of the squares, of all three vector component values equals 1"), and **the control itself
calculates the required rotary angles** from the vector.
**When an expert uses it:** when one program must run across **different machine configurations** (table/table
vs head/head vs head/table) without re-posting — the vector form "produces a program format that is
kinematically independent ... the same code runs on different machine configurations without modification,"
which "solves problems with machine kinematics encountered by CAM systems."
**Trade-off direction:** vector output decouples the program from the specific rotary kinematics (huge for a
shop running the same part across machines) — but it requires the Type II option and a control that can solve
vectors in real time; the angle form (G43.4) is more universally available but binds the program to one
machine's rotary solution.
**PRISM application:** for a fleet that wants one CAM intermediate to drive multiple 5-axis machines, echo
should prefer the **vector (G43.5) emission path** where the controls support it — it is the post-side
expression of "build it once, run it everywhere." *(Source: FANUC G43.5 RTCP Type II / Tim Markoski.)*

### 3. Tilted work plane (G68.2 + G53.1/G53.6) — turn 3+2 back into simple 2.5D
**Technique:** **G68.2** defines a *local* tilted work plane (origin + rotation); within it, "any operation
defined within a G68.2 statement and G69 cancellation of the Tilted Work Plane is done using the **LOCAL
XY-Plane and LOCAL coordinates** of that Tilted Work Plane." That re-enables standard circular interpolation,
cutter comp, and canned drilling cycles on a tilted face — operations otherwise unavailable at an arbitrary
orientation. The companion **G53.1** ("Tool Axis Direction Control") then "automatically positions the rotary
axes and aligns the tool/spindle perpendicular to the tilted work plane"; **G53.6** adds RTCP for the
orientation move.
**When an expert uses it:** for **3+2 (positional 5-axis)** work — drilling/pocketing a feature on an angled
face — where full simultaneous 5-axis is unnecessary and the simplicity of programming "as if in G17" is
worth it.
**Trade-off direction:** G68.2 trades a small amount of setup discipline (define the plane, configure the
center-of-rotation kinematics) for an enormous gain in program simplicity and correctness on tilted faces.
The **critical caution**: "G53.1 will NOT adjust for the current tool location and it is possible to cause a
serious collision if a proper approach position is not defined prior to the G68.2 Tilted Work Plane
definition" — so the post MUST emit a safe approach BEFORE the plane is invoked.
**PRISM application:** echo's 3+2 post should generate the **safe-approach -> G68.2 -> G53.1 -> local-plane
toolpath -> G69** envelope as an atomic, collision-safe block, never letting G53.1 fire without a proven
clear approach. *(Source: FANUC G68.2 5-Axis Tilted Work Planes / Tim Markoski.)*

---

## II. Controller-dialect abstraction: canned-cycle expansion vs native

### 4. Native canned cycle vs. longhand expansion — choose per controller capability
**Technique:** an expert post does not blindly emit `G8x ... R ...` everywhere. It **decides per target
control** whether to emit the *native* canned cycle (compact; the control owns the peck/dwell/retract logic
and its optimized look-ahead) or to **expand the cycle into explicit longhand G0/G1 moves** when the target
control lacks that cycle, implements it differently, or when the post needs total control over the motion
(e.g. a custom chip-break or a controller that mishandles the cycle on a tilted plane). The construct shapes
are documented per the foundations file (G81/G82/G83/G84/G85/G89, G98/G99 retract, G80 cancel).
**When an expert uses expansion:** porting a program to a control that does not support a given cycle, or
when a feature between holes makes the control's native retract behavior unsafe and the post must script the
clearance moves itself.
**Trade-off direction:** native cycles are compact and let the control optimize, but they are the most
dialect-divergent constructs across builders; longhand expansion is verbose and loses the control's
look-ahead optimization but is **maximally portable and fully deterministic**. The right choice is
control-capability-driven, not a fixed rule.
**PRISM application:** echo's dialect back-ends should carry a **per-controller capability map** — emit
native where supported and trusted, expand to longhand where not — so one CAM intermediate degrades safely
onto a less-capable control. *(Sources: LinuxCNC g-code canned-cycle reference; capability/decision framing
per `post-processor-applied-practice.md` and `-foundations.md`.)*

### 5. The dialect-abstraction layer — emit the SAME intent through controller-specific back-ends
**Technique:** the world-class post architecture is a **generic intermediate set of machining intents** fed
to **controller-specific back-ends** — the canonical-machining-functions model the foundations file confirms
from the NIST RS274NGC interpreter. The advanced strategy is to keep the intermediate dialect-agnostic and
let each back-end own the divergence (Fanuc smoothing word vs Haas smoothing word; native cycle vs cycle
*call*; angle RTCP vs vector RTCP). G43.5's kinematic independence (technique 2) is the same idea expressed
for kinematics: "a program format that is kinematically independent."
**When an expert uses it:** any time more than one controller family is a target — the abstraction is the
only way to avoid N hand-maintained posts that silently drift apart.
**Trade-off direction:** the abstraction layer costs upfront design (a clean intent IR + per-back-end
renderers) but eliminates the per-dialect copy-paste drift that is the dominant maintenance failure of
hand-built posts; the alternative (one monolithic post per machine) is cheaper to start and far more
expensive to keep correct.
**PRISM application:** this is the *architecture* echo's emitters should mirror — generic toolpath/intent
upstream, dialect rendering downstream — and it is exactly why a post is controller-specific while the CAM
output stays generic. *(Source: FANUC G43.5 kinematic-independence framing / Tim Markoski; canonical-functions
model confirmed in `post-processor-foundations.md` §6.)*

---

## III. Look-ahead / smoothing configuration STRATEGY

### 6. Exact-stop vs path-blending mode (G61 / G64) — pick the mode per operation, not per program
**Technique:** the control offers **exact-path/exact-stop modes (G61, G61.1)** that follow the trajectory
precisely — "moves will slow or stop as needed to reach every programmed point" — versus **path-blending
(G64)** that keeps "the best possible speed" while allowing bounded deviation. With a blend tolerance the
control keeps "the actual path ... no more than P- away from the programmed endpoint," and "the velocity will
be reduced if needed to maintain the path." The advanced move is to **switch modes per operation** rather
than leaving one mode on for the whole program.
**When an expert uses each:** exact-stop/tight-tolerance for **finishing and sharp-corner accuracy**;
blending/looser-tolerance for **roughing and positioning** where speed matters and a few thousandths of
corner deviation is invisible.
**Trade-off direction (qualitative only):** *tighter path control -> more accurate corners but slower motion
(more decel at every vertex); looser blending -> faster motion but more corner rounding/deviation.* The
expert tunes this **per cut**, not globally.
**PRISM application:** echo's post should expose smoothing as a **per-operation parameter** (looser for
rough/position, tighter for finish) and keep every numeric tolerance owner-gated to the specific machine.
*(Source: LinuxCNC g-code G61/G64 path-control reference.)*

### 7. Sequence the high-speed mode correctly and scope it per tool/operation
**Technique:** beyond *choosing* a smoothing mode, the expert **sequences and scopes** it. The foundations
file confirms Fanuc AI Contour Control (`G05.1 Q1`) must be engaged BEFORE `G43`, toggled **per tool**, and
**suppressed around canned drilling cycles**; Haas expresses the same smoothing intent with a different word
and a persistent global default. The advanced strategy is to treat the smoothing block as a **scoped wrapper
per operation** — turned on for the contour cut that benefits, turned off where it would hurt (drilling) or
where its blending would round a feature that must be sharp.
**When an expert uses it:** any HSM contour/finish pass; deliberately disabled around drilling and exact
features.
**Trade-off direction:** correct scoping gets HSM speed where it helps without corner-rounding where it
hurts; getting the *ordering* or *scope* wrong leaves smoothing always-on (sluggish accel) or off (poor
finish) — the common dialect bug.
**PRISM application:** echo's HSM back-end should emit the smoothing mode as a **per-operation on/off wrapper
sequenced ahead of tool-length comp and suppressed around drilling**, never as a single program-top toggle.
*(Source: AICC sequencing confirmed in `post-processor-foundations.md` §4 / Tim Markoski; Haas-vs-Fanuc
divergence in `post-processor-applied-practice.md` §13.)*

---

## IV. Probing / macro-B integration: close the loop on the machine

### 8. On-machine probing via the skip signal (G31) — set the WCS or verify in-cycle
**Technique:** **G31** moves an axis until the probe contacts a surface and the **skip signal** fires; "within
microseconds of when the probe triggers, it sends a skip signal to the CNC that causes three things: motion
to stop, the balance of the motion command to be skipped, and **axis positions to be stored in system
variables**." A macro then reads those captured positions to **set a work offset automatically** (probe two
sides of an edge, average, write the result into the offset register) or to **verify a feature in-process**
against tolerance and branch to an alarm if out.
**When an expert uses it:** lights-out / multi-part / re-fixtured production where manual edge-finding is the
bottleneck or risk; and in-process verification where catching a scrap part early saves the rest of the
cycle.
**Trade-off direction:** probing trades a small amount of cycle time and the cost of the probe option for
**automated, repeatable setup and self-verification** — turning the machine into a self-checking cell. It
requires the skip feature integrated by the machine-tool builder; the captured-position variables and offset
registers differ by control and stay owner-gated.
**PRISM application:** echo's post can **emit probing macro blocks** (protected-positioning -> G31 -> capture
-> conditional) so a program sets its own datum and self-verifies — but every system-variable number and
probe-cycle parameter is gated to the specific control/probe. *(Source: Modern Machine Shop "G31 isn't just
for probing anymore.")*

### 9. Parametric / macro-B programming (O-word subroutines, variables, loops, conditionals) for part families
**Technique:** **parametric (custom-macro-B / O-word) programming** combines **subroutines** (`Onnn sub` ...
`Onnn endsub`, called with `Onnn call`, taking "up to 30 optional arguments ... passed to the subroutine as
#1, #2, ... #N"), **variables** (local #1-#30 plus persistent global named parameters), **loops**
(while/do-while/repeat with break/continue), and **conditionals** (if/elseif/else). Together these "create
templates for machining part families and repeated features without duplicating code."
**When an expert uses it:** a *family* of similar parts (one program, driven by argument values), a bolt-circle
or pocket-grid pattern (a loop instead of N hand-written blocks), or any program that must branch on a probed
measurement (technique 8).
**Trade-off direction:** parametric programs are far more compact and maintainable for families/patterns and
enable measurement-driven branching — at the cost of being harder to read at a glance and **dialect-divergent
in variable scope** (the applied-practice file confirms rs274ngc local-restore vs Fanuc-style global-persist
semantics differ). Pin the call convention to the target control.
**PRISM application:** echo can **emit looped/parametric blocks** for patterned features and family parts
instead of fully-unrolled linear code — but must pin the subroutine/variable convention to the target
control's family (never mix styles). *(Source: LinuxCNC O-code / subroutine docs; scope divergence in
`post-processor-applied-practice.md` §12.)*

---

## V. Work-offset & safe-retract discipline (advanced)

### 10. Extended work offsets (G54.1 P) for multi-fixture / pallet / many-part setups
**Technique:** when the six standard systems (G54-G59) are not enough, **G54.1 Pnnn** provides "additional
offsets ... ideal for use with **multi-part fixtures, rotary tables, or production workflows that require
multiple coordinate systems within a single program**," and they "function identically to the standard G54
to G59 work offsets" — modal, persisting "until another work offset command is executed." They can be set
programmatically (G10 L20) rather than hand-keyed.
**When an expert uses it:** tombstone / horizontal / multi-vise / pallet-changer work where many parts are
loaded at once and each needs its own datum, all driven from one program.
**Trade-off direction:** extended offsets scale a single program to many parts/fixtures (vs re-posting per
fixture) — at the cost of disciplined offset bookkeeping (the same physical offset can be addressed two ways
on a Fanuc, so a macro/probe routine must know which is active). The count of extended offsets and the
detect-active-offset system variable are control-specific and owner-gated.
**PRISM application:** echo's multi-fixture post should **assign each part an extended-offset (G54.1 P) datum**
and set them via G10 L20, keeping the program one-to-many. *(Source: Masso G54.1 docs; Machining Doctor
G54-coordinate-systems reference.)*

### 11. G53 machine-coordinate safe-retract + G52 local shift + G10 programmatic offsets
**Technique:** the advanced retract/offset toolkit: **G53** "temporarily cancels the active work offset
(G54-G59) and uses the machine coordinate system as the datum" — so a G53 move goes to a known *machine*
position regardless of which part offset is active, the safest way to retract to a tool-change / clearance
height. **G52** "specifies a temporary shift in the active coordinate system," useful for repeated features
within a part. **G10** lets the program **set offsets dynamically** rather than depending on hand-keyed
registers.
**When an expert uses it:** G53 for an unconditionally-safe retract/tool-change move (independent of any
part-offset error); G52 for stepping a sub-feature without a whole new WCS; G10 to make a program
self-configure its datums (often paired with probing, technique 8).
**Trade-off direction:** a G53 safe-Z is robust against a stale/wrong work offset (it ignores them by design),
where a G0 Z to a part-relative clearance height inherits any offset error — so the expert prefers **G53 for
the crash-class retract** and reserves part-relative moves for in-feature motion. Because offsets are modal
and "remain active even after program restart," the expert re-asserts the intended offset at each program
section, not just at the top.
**PRISM application:** echo's safe-retract preamble/postamble should use **G53 machine-coordinate moves for
the unconditional clearance**, re-assert the active work offset per section, and emit G10/G52 only where the
job genuinely needs programmatic or local shifts. *(Source: Machining Doctor G54 / G53 / G52 / G10
reference.)*

---

## Owner-gate (NOT promoted — echo verifies before any live engine/doctrine use)

Everything below is **numeric or controller-specific** and stays **owner-gated** for echo — PRISM sources
these from `mcp-server/src/physics/constants.ts` or the **exact machine's manual**, never the web:

- **All physics cutting constants** — kc1.1 / specific cutting force, Taylor C and n, any material constant,
  any specific speed/feed/IPM/SFM/chip-load/DOC/coolant-pressure number. (Canonical: `src/physics/constants.ts`.)
- **RTCP / TCPC configuration numerics** — the kinematic parameter values (e.g. the TCP-enable parameter and
  any center-of-rotation parameter values), and whether the option is licensed on a given control. (The
  *technique* G43.4/G43.5 and the qualitative trade-off are promoted; the parameter IDs and values are not.)
- **G68.2 kinematics numerics** — the center-of-rotation parameter values and any Euler/RPY angle ordering
  numbers for a specific machine. (The *workflow* safe-approach -> G68.2 -> G53.1 -> G69 and the collision
  caution are promoted; the per-machine numeric kinematics are not.)
- **Look-ahead / smoothing numerics** — the G64 blend-tolerance value (P/Q), Fanuc AICC R-tolerance / priority
  mapping / look-ahead block count / alarm numbers, Haas G187 E corner-rounding value / Setting 191 default
  (these remain gated in the foundations + applied-practice files).
- **Probing numerics** — every skip-signal system-variable number (X/Y/Z capture variables), work-offset
  register numbers, Renishaw cycle output variables, and the detect-active-offset system variable; all are
  control/probe-specific and gated.
- **Extended-offset numerics** — the actual count of G54.1 P offsets on a given control (it varies widely),
  the Haas G110-G129 equivalence mapping, and the active-offset system variable numbers.
- **Macro/parametric numerics** — any specific variable-number assignments and the exact local-vs-global scope
  boundary per control family (the *fact that scope diverges* is promoted; the specific numbers are not).

## Sources (WebFetch-confirmed this pass)

- [FANUC G43.5 RTCP Type II - Vector Programming for 5-Axis (Tim Markoski) - LinkedIn](https://www.linkedin.com/pulse/fanuc-g435-rtcp-type-ii-vector-programming-5-axis-tim-markoski) - confirmed RTCP "maintain the tool control point in relation to the programmed point of the workpiece," G43.4 angle vs G43.5 vector (I,J,K directional cosines, sum-of-squares = 1), control calculates the rotary angles, and the "kinematically independent" / "same code runs on different machine configurations" benefit (techniques 1, 2, 5).
- [FANUC G68.2 - 5-Axis Tilted Work Planes (Tim Markoski) - LinkedIn](https://www.linkedin.com/pulse/fanuc-g682-5-axis-tilted-work-planes-tim-markoski) - confirmed G68.2 defines a LOCAL XY-plane/coordinates for 3+2, G53.1 (Tool Axis Direction Control) auto-positions rotaries perpendicular to the plane and must immediately follow, G53.6 adds RTCP, the "G53.1 will NOT adjust for the current tool location ... serious collision" caution, and G69 cancel (technique 3).
- [G54.1 Extended Work Offsets - Masso docs](https://docs.masso.com.au/supported-g-codes/g54.1-extended-work-offsets) - confirmed G54.1 P extends G54-G59, the offsets "function identically," are modal "until another work offset command is executed," the multi-part-fixture/rotary-table/multi-WCS use case, and G10 L20 programmatic setting (technique 10).
- [CNC Coordinate Systems: G54-G59, G10, G54.1, & G52 - Machining Doctor](https://www.machiningdoctor.com/gcodes/g54/) - confirmed G53 "temporarily cancels the active work offset ... uses the machine coordinate system as the datum," G52 temporary local shift, G10 programmatic offset setting, and offsets-remain-active-after-restart modal discipline (techniques 10, 11).
- [CNC Tech Talk: 2 Lesser-Known Ways to Trigger the Skip Signal (G31 isn't just for probing anymore) - Modern Machine Shop](https://www.mmsonline.com/articles/g31-isnt-just-for-probing-anymore) - confirmed the G31 skip signal "within microseconds ... causes three things: motion to stop, the balance of the motion command to be skipped, and axis positions to be stored in system variables," and the macro-driven set-WCS / verify workflow (technique 8).
- [G-code reference: G61/G61.1/G64 path control - LinuxCNC](https://linuxcnc.org/docs/html/gcode/g-code.html) - confirmed G61 exact-path "slow or stop as needed to reach every programmed point," G61.1 exact-stop, G64 path-blending "best possible speed," the P blend-tolerance "no more than P- away from the programmed endpoint," "velocity will be reduced if needed to maintain the path," and the speed-vs-accuracy compromise (technique 6); also confirmed G43/G43.1/G43.2 tool-length-offset structure.
- [O-codes / subroutines (parametric programming) - LinuxCNC](https://linuxcnc.org/docs/html/gcode/o-code.html) - confirmed O-word subroutines (Onnn sub/endsub/call, up to 30 args passed as #1..#N, local-restore-on-return), local #1-#30 plus global named parameters, while/do-while/repeat loops with break/continue, if/elseif/else conditionals, and "machining part families and repeated features without duplicating code" (technique 9).

> **NOTE (R12 honesty):** The official **Haas G31** codes-settings page (`haascnc.com/service/codes-settings...G31...`) returned **HTTP 403** on direct WebFetch this pass (the same access pattern the foundations + applied-practice files already recorded for Haas pages) — so the G31 technique (8) is anchored on the **WebFetch-reachable Modern Machine Shop** article instead, which corroborates the same skip-signal mechanism. No claim is sourced from a non-fetched page. The CNC Training Centre G54.1 page (`/programming/g54-1-extended-work-offsets/`) **404'd**; G54.1 (technique 10) is anchored on the reachable **Masso** + **Machining Doctor** sources. The LinuxCNC g-code page does not document Fanuc G43.4/G43.5/G68.2 (those are Fanuc-dialect), which is why those techniques cite the reachable Markoski articles (the same author the foundations file already trusts for the AICC method).

## Cross-refs
- Foundations (intro theory/standards/structure): `knowledge/wiki/post-processor/post-processor-foundations.md`
- Applied practice (common gotchas/failure modes): `knowledge/wiki/post-processor/post-processor-applied-practice.md`
- Source atlas (living link directory): `knowledge/wiki/post-processor/post-processor-source-atlas.md`
- Galaxy brain: `mcp-server/src/engines/post-processor/MEMORY.md`
- Galaxy doctrine: `mcp-server/src/engines/post-processor/CLAUDE.md`
- [[feedback_psn_definition]] · [[feedback_check_units_first]] (UNITS-FIRST: G20/G21 + the safe-start/safe-retract preamble are a post's job)
