---
title: CAD-Fusion-Live Applied Practice — live-session practitioner gotchas, failure modes, and technique decisions (parametric rebuild cascade, units, feature-order, crash/state-loss, CAD-API automation race, over-constrained rejection)
galaxy: cad-fusion-live
owner_slot: delta
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: "Each practitioner gotcha below was WebFetch-confirmed on 2026-06-10 against a reputable free/legal source (Wikipedia: Solid modeling, FreeCAD, Unit of measurement, Inch, Race condition, Durability (database systems), Atomicity (database systems), Undo, Geometric constraint solving). The live-session/automation framing is grounded by mapping each confirmed CS/engineering fact onto the parametric-CAD live-session failure it produces. Sources access-blocked this pass were retried once then DROPPED, not cited: the FreeCAD wiki 'Topological_naming_problem' page (Anubis access-control 'Access Denied' on both the rendered and ?action=raw URLs); Autodesk Fusion 360 Timeline help (HTTP 503 on two attempts); an arXiv guess that turned out to be a network-science paper (wrong topic, dropped). The topological-naming mechanism is therefore grounded only on the confirmable FreeCAD-1.0/Solid-modeling phrasing; the deeper kernel mechanism + any product-specific timeline behavior stays owner-gated for delta. Kernel tolerances, solver iteration/convergence numbers, and any per-product UI specifics remain owner-gated."
tags: [cad-fusion-live, applied-practice, live-session, parametric-rebuild, feature-tree, topological-naming-problem, units-mismatch, units-first, feature-order, crash-recovery, durability, atomicity, cad-api-automation, race-condition, over-constrained, undo-transaction, gotchas, tribal-knowledge]
---

# CAD-Fusion-Live Applied Practice

The **practitioner-knowledge** layer for the **cad-fusion-live** galaxy: the hard-won "what goes wrong in a *live, long-running, scriptable* parametric-CAD session and how an expert avoids it" that pure theory does not teach. This is the third leg of the cad-fusion-live triad and is deliberately **distinct** from its siblings:

- [`cad-fusion-live-foundations.md`](cad-fusion-live-foundations.md) — the *theory* spine (parametric features, the re-evaluable timeline DAG, constraint-solver DOF accounting, assembly mates, associativity/digital thread). The *what-is-true*.
- [`cad-fusion-live-source-atlas.md`](cad-fusion-live-source-atlas.md) — the *living link directory*. The *where-to-learn-more*.
- **this file** — the *failure modes, technique decisions, and gotchas* a world-class live-CAD-automation practitioner carries in their head. The *what-goes-wrong-and-how-to-avoid-it*.

> **Sibling de-duplication (vs `knowledge/wiki/cad/cad-applied-practice.md`):** the `cad` applied-practice owns the *static/authoring* gotchas (under-defined sketches, fragile references, geometric-over-dimensional constraints, DFM/machinability). THIS file owns the *live/automation/session* dimension: the rebuild cascade firing **during** an active session, units resolution at session start, feature-tree order as a live-edit hazard, **crash + state loss** of an in-flight session, the **CAD-API automation race against the human user**, and the **transactional discipline** (atomic + undo-grouped + durable) that an automation layer must impose. Where a gotcha overlaps a `cad` one, this file takes the *live/scripted* angle, not the *authoring* angle.

> **R12 honesty boundary:** every gotcha below was fetched from a reputable free source on 2026-06-10 and is cited inline. CS-engineering facts (race conditions, ACID durability/atomicity, undo stacks, the 25.4 mm definition) are promoted as confirmed; their *mapping onto the CAD live session* is the promoted practitioner technique. Numeric kernel tolerances, solver iteration/convergence constants, and any per-product timeline-UI behavior stay **owner-gated for delta** (see Owner-gate).

---

## A. The parametric rebuild cascade (what bites a LIVE session)

A live session's defining hazard is that an edit you make *now* re-evaluates a graph of features built *earlier* — and the failure surfaces far from its cause.

### 1. Editing an early feature silently breaks a downstream feature

**Gotcha:** the timeline is a re-evaluable DAG (foundations Section 2); when you change an upstream feature mid-session, every dependent feature recomputes, and one of them can fail or deform without an obvious cause at the edit site. **Why it bites:** the regeneration is over the whole tree, so a change at feature 3 throws the error at feature 40 — and a model that "rebuilds successfully" can still have moved geometry in an unintended direction. The Solid modeling reference states the failure mode bluntly: **"Modifying an early feature may cause later features to fail."** It frames the mitigation as a skill, not a free guarantee: **"Skillfully created parametric models are easier to maintain and modify."** [src: [Wikipedia "Solid modeling"](https://en.wikipedia.org/wiki/Solid_modeling)] **Expert avoidance (live angle):** before committing an upstream edit in a live session, roll the timeline marker back to the edit point, change one feature, and re-evaluate forward *watching for the first* failed feature — do not assume a green rebuild means correct geometry. The galaxy's session engine should treat a downstream feature failure as a **surfaced, blocking event**, never a swallowed warning.

### 2. The topological naming problem — references re-bind to the wrong face after a rebuild

**Gotcha:** a feature that references a face/edge by an internal name (e.g. a sketch attached to "Face6", a fillet on "Edge12") can, after an upstream edit renumbers the topology, end up bound to a *different* face than the one you picked — so the model rebuilds but the geometry is wrong. **Why it bites:** the reference looks intact; nothing errors; the part is subtly wrong. This was severe enough in one major free CAD program that fixing it was a headline release item: per the FreeCAD reference, version 0.21 was **"the final release before patches for the topological naming problem introduce performance regressions,"** and FreeCAD 1.0 (released 2024-11-18) shipped **"fixes for many bugs, including the topological naming problem."** [src: [Wikipedia "FreeCAD"](https://en.wikipedia.org/wiki/FreeCAD)] **Expert avoidance:** attach sketches and mates to **stable datums** — origin planes, named axes, named points — that survive a topology renumber, rather than to derived faces/edges that the next edit can renumber; and after any structural edit, visually verify that downstream attachments still land on the intended geometry. (The deeper kernel mechanism of *how* names re-bind is owner-gated below; the FreeCAD wiki's dedicated page was access-blocked this pass.)

### 3. Feature order is itself an edit hazard, not just a build choice

**Gotcha:** because each feature is built on prior ones, the *order* of the tree determines what survives an edit; cosmetic/heavy features placed early become fragile parents of everything below them. **Why it bites:** in a live session you re-order or insert features under time pressure, and a fillet that was placed early is now a parent of a downstream pattern that breaks when the fillet is touched. This is the live consequence of the same parent-child structure foundations describes — and the Solid modeling reference's "early feature change cascades" applies directly. [src: [Wikipedia "Solid modeling"](https://en.wikipedia.org/wiki/Solid_modeling)] **Expert avoidance:** build **base geometry first**, defer **cosmetic / computationally heavy features (fillets, rounds, drafts, helical features) to the end** of the timeline so an edit rarely needs to touch a feature that has many children — minimizing both breakage radius and rebuild cost. (This is the *live-edit* angle on the `cad` sibling's feature-order gotcha: there it is about authoring a maintainable tree; here it is about which edits are safe to make mid-session.)

---

## B. UNITS FIRST — the 25.4x scale error (resolve before any geometry)

This is the single most expensive and most preventable class of CAD error, and it is a *session-start* decision, not a runtime one.

### 4. inch vs mm is a 25.4x scale error if assumed instead of resolved

**Gotcha:** an inch is defined as **exactly 25.4 mm** ([Wikipedia "Inch"](https://en.wikipedia.org/wiki/Inch): "the inch has been based on the metric system and defined as exactly 25.4 mm," standardized internationally 1946-1963). A model authored or imported under the wrong unit assumption is therefore off by a factor of 25.4 in every linear dimension — a part, tool, holder, or stock built 25.4x too big or too small. **Why it bites:** unit confusion is a *documented destroyer of real engineering work*, not a hypothetical: the **Mars Climate Orbiter was "accidentally destroyed on a mission to Mars in September 1999"** because **"different computer programs used different units of measurement (newton versus pound force)"**; the Gimli Glider Boeing 767 **"ran out of fuel in mid-flight"** from **"confusion due to the simultaneous use of metric and Imperial measures"** during a metric conversion. [src: [Wikipedia "Unit of measurement"](https://en.wikipedia.org/wiki/Unit_of_measurement)] **Expert avoidance:** resolve the unit from the **source** before any geometry/tool/feed/stock work — never assume. (This maps directly to PRISM's UNITS-FIRST safety rail and `scripts/lib/units-guard.mjs`: `requireUnits` throws on unknown, `assertUnitsMatch` throws on mismatch, `scaleAnomaly` flags the mislabel.) **PRISM cad-fusion-live hit:** a live session that imports a STEP/STL/native body or drives a CAD API must read the file/document unit (STEP `CONVERSION_BASED_UNIT 0.0254` = inch vs `SI_UNIT(.MILLI.,.METRE.)` = mm; the CAD document's own unit setting) and STOP on unknown/ambiguous — a unit mismatch between the live document and the imported body is the 25.4x scale error waiting to happen.

---

## C. Live-session state loss (the session is in-flight; the process can die)

A long-running scriptable session holds work that is not yet on disk. Treat it as a transaction that must survive a crash.

### 5. Unsaved in-flight session state is lost on crash unless it is durably persisted

**Gotcha:** an active session accumulates edits in memory; a crash, power loss, or process kill (and on a busy PRISM host, a fleet-reaper or OOM kill) loses everything since the last save. **Why it bites:** "it'll be fine, I'll save at the end" is exactly the assumption that loses an hour of modeling. The database-durability literature names the correct discipline precisely: durability is **"the ACID property that guarantees that the effects of transactions that have been committed will survive permanently, even in cases of failures,"** achieved by **"keeping and flushing an immutable sequential log of the transactions to ... non-volatile storage *before* acknowledging commitment"** (write-ahead log). [src: [Wikipedia "Durability (database systems)"](https://en.wikipedia.org/wiki/Durability_(database_systems))] **Expert avoidance:** an automation/session layer must **persist a recovery point to non-volatile storage *before* it reports a step as done** — periodic autosave / checkpoint of the in-flight document, and never report "saved/committed" until the bytes are on disk. **PRISM cad-fusion-live hit:** this is the live/long-running differentiator of the galaxy — a session engine must checkpoint mid-session (mirroring PRISM's atomic-write + schema-version discipline) so a reaped or crashed CAD-automation process resumes from the last durable point, not from zero.

### 6. A multi-step CAD operation must be atomic — all-or-nothing, or roll back

**Gotcha:** a scripted sequence (create sketch -> extrude -> fillet -> pattern) that fails partway leaves the document in a half-built, inconsistent state. **Why it bites:** a partial update is *worse than no update* — the atomicity literature is explicit: **"either all occur, or none occur,"** and **"a guarantee of atomicity prevents partial database updates from occurring, because they can cause greater problems than rejecting the whole series outright."** A correct transaction **"cannot be observed to be in progress ... at one moment it has not yet happened, and at the next it has already occurred in whole (or nothing happened if the transaction was cancelled in progress)."** [src: [Wikipedia "Atomicity (database systems)"](https://en.wikipedia.org/wiki/Atomicity_(database_systems))] **Expert avoidance:** wrap a multi-step CAD-API sequence in a transaction / undo-group so that a failure at any step **rolls the document back** to the pre-sequence state instead of leaving orphan features. **PRISM cad-fusion-live hit:** every multi-feature automation the galaxy emits should be one atomic unit with a defined rollback, never a best-effort sequence that can wedge the live document halfway.

### 7. Group a scripted edit into ONE undo step (do not pollute the user's undo stack)

**Gotcha:** an undo system stores completed actions in a **"history buffer"** and, for linear undo, a **"stack (last in first out (LIFO))"** so **"only the last executed command can be undone"** ([Wikipedia "Undo"](https://en.wikipedia.org/wiki/Undo)). A script that issues 40 raw API calls pushes 40 undo entries — so a user who hits Ctrl+Z once undoes one-fortieth of your automation and is left with a half-built model. **Why it bites:** multi-level undo lets the user **"take back a series of actions,"** but if your automation did not group its calls, "one undo" no longer maps to "one logical operation," and the user cannot cleanly back out of what the script did. **Expert avoidance:** open an undo/transaction group around the whole scripted operation so the *user's* single undo reverts the whole thing as one unit. **PRISM cad-fusion-live hit:** the galaxy's CAD-API automation must wrap each user-facing operation in a single undo group (the same boundary as the atomicity unit in #6) so the human can reason about and reverse automation in logical steps.

---

## D. CAD-API automation racing the human (concurrency in a shared live document)

The live/automation layer means a script and a human can both touch the same document — the classic shared-state hazard.

### 8. Script and user editing the same live document is a race condition

**Gotcha:** when automation and the human operator both mutate the *same* live CAD document, the result depends on interleaving — the textbook race condition: **"the system's substantive behavior is dependent on the sequence or timing of other uncontrollable events, leading to unexpected or inconsistent results,"** and **"critical race conditions cause invalid execution and software bugs and often happen when processes or threads depend on some shared state."** Unsynchronized concurrent mutation can even leave shared state **"holding a value that is some arbitrary and meaningless combination of the bits."** [src: [Wikipedia "Race condition"](https://en.wikipedia.org/wiki/Race_condition)] **Why it bites:** the script reads the feature tree, the user inserts/deletes a feature, then the script writes against the stale tree it read — corrupting the model nondeterministically (impossible to reproduce, hence brutal to debug). **Expert avoidance:** the standard remedies apply unchanged — **mutual exclusion** (**"operations upon shared states are done in critical sections that must be mutually exclusive"**), **atomic operations**, and **serialization** of access to the document. [src: [Wikipedia "Race condition"](https://en.wikipedia.org/wiki/Race_condition)] **PRISM cad-fusion-live hit:** a CAD-automation engine must hold an exclusive lock (or run on the document's own command/event thread, serialized) for the span of its read-modify-write, never interleave with live user input on the same body — and must re-read the tree inside the locked section rather than acting on a tree it read before the lock.

---

## E. Constraint health in a live sketcher (over-constraint is a hard rejection)

### 9. Over-constraining a sketch is rejected, not silently absorbed

**Gotcha:** a constraint system is in exactly one of three states (foundations Section 3) — well-, under-, or over-constrained — and the solver's job includes **"detection of over- and under-constrained sets and subsets"** ([Wikipedia "Geometric constraint solving"](https://en.wikipedia.org/wiki/Geometric_constraint_solving)). Adding a constraint that conflicts with the existing set (e.g. a second dimension fighting a geometric relation) is **over-constraining**: the solver rejects or flags it rather than quietly picking a winner. **Why it bites (live angle):** during interactive or scripted sketching you add "just one more dimension" to nail something down and instead trip an over-constrained error that *blocks the whole feature* — and an automation script that does not check the solver state before adding a constraint can stall mid-sequence on a rejected constraint. **Expert avoidance:** drive a sketch to **fully defined (DOF -> 0 via a well-constrained system)** using geometric relations first and dimensions second (the foundations DOF-accounting + the `cad` sibling's "geometric-over-dimensional" rule); before a script adds a constraint, check that it *removes* a remaining DOF rather than *duplicating* an already-removed one. **PRISM cad-fusion-live hit:** the galaxy's sketch-health surface should report remaining DOF and the well/under/over-constrained state (foundations Section 3) so an automation layer can decide whether the next constraint is needed (under-constrained) or would be rejected (already well-constrained).

### 10. Under-constrained geometry in a live session drifts on the NEXT parameter edit

**Gotcha:** an under-constrained sketch has free DOF; it looks correct *now* but when a driving parameter changes later in the session, the unconstrained geometry moves in an unintended direction with no error raised. **Why it bites (live angle):** in a long session the distortion happens an edit or two *after* the sketch was authored, so the cause and the symptom are separated in time — and the model still "rebuilds successfully." This is the time-separated, live-session manifestation of the constraint-state taxonomy (under-constrained = insufficient constraints for a unique solution) that geometric constraint solving formalizes. [src: [Wikipedia "Geometric constraint solving"](https://en.wikipedia.org/wiki/Geometric_constraint_solving)] **Expert avoidance:** fully define every sketch *before* building a feature on it — never leave free DOF in a sketch that a later parametric edit will exercise. **PRISM cad-fusion-live hit:** pair with #1 — a live edit that changes a driving parameter should re-check that downstream sketches are still fully defined, not just that the rebuild was green.

---

## Owner-gate (NOT promoted — delta must verify before any engine hardcodes)

These were **not** WebFetch-confirmed to doctrine depth this pass, or rested on an access-blocked source. They stay owner-gated:

- **Topological-naming-problem mechanism** — the *existence* and *severity* are confirmed (FreeCAD 1.0 fix; Solid modeling "early feature edit -> later feature fails"), but the FreeCAD wiki's dedicated `Topological_naming_problem` page was access-blocked (Anubis "Access Denied" on both the rendered and `?action=raw` URLs). The detailed mechanism (how topological entities are renamed/renumbered on recompute, the persistent-naming algorithms, per-kernel behavior) must be confirmed by delta against a primary CAD/kernel source or textbook before any cad-fusion-live engine encodes a re-binding rule.
- **Fusion 360 (and other product) timeline / capture-design-history UI behavior** — Autodesk's Timeline help page returned HTTP 503 on two attempts and was DROPPED per R12. Any product-specific claim (base-feature semantics, capture-history toggle, edit-in-place rules, autosave interval) is owner-gated; confirm against the vendor's published documentation, do not infer from the general DAG model.
- **Autosave / recovery interval and checkpoint cadence** — the *discipline* (persist before acknowledging; durable recovery point) is confirmed from the durability literature, but any specific interval, checkpoint size, or recovery-file format is product/engine-specific and owner-gated.
- **Per-mate-type DOF removal counts** and **specific over-constraint error thresholds** — the constraint-state *taxonomy* and DOF principle are confirmed; the per-mate-type or per-product numeric tables are NOT (carried over from the foundations owner-gate).
- **Kernel tolerance constants, solver iteration caps, convergence epsilons** — owner-gated; pull from the kernel's own documentation, not a wiki summary.
- **CAD-API locking/threading specifics** — the *need* for mutual exclusion / serialization is confirmed (race-condition literature); the exact API surface (which CAD API exposes a transaction/lock/command-thread, and how) is product-specific and owner-gated for delta.

## Sources

WebFetch-confirmed this pass (distinct URLs, all free/legal):

1. [Wikipedia — Solid modeling](https://en.wikipedia.org/wiki/Solid_modeling) — parametric feature failure: "modifying an early feature may cause later features to fail"
2. [Wikipedia — FreeCAD](https://en.wikipedia.org/wiki/FreeCAD) — topological naming problem existed; fixed in FreeCAD 1.0 (2024-11-18); v0.21 final before TNP patches caused performance regressions
3. [Wikipedia — Unit of measurement](https://en.wikipedia.org/wiki/Unit_of_measurement) — Mars Climate Orbiter (newton vs pound force), Gimli Glider, Korean Air 6316 unit-mismatch failures
4. [Wikipedia — Inch](https://en.wikipedia.org/wiki/Inch) — 1 international inch = exactly 25.4 mm (standardized 1946-1963)
5. [Wikipedia — Race condition](https://en.wikipedia.org/wiki/Race_condition) — definition, shared-state corruption, mutual-exclusion / atomic / serialization avoidance
6. [Wikipedia — Durability (database systems)](https://en.wikipedia.org/wiki/Durability_(database_systems)) — WAL; persist to non-volatile storage before acknowledging commit
7. [Wikipedia — Atomicity (database systems)](https://en.wikipedia.org/wiki/Atomicity_(database_systems)) — all-or-nothing; rollback; not observable mid-transaction
8. [Wikipedia — Undo](https://en.wikipedia.org/wiki/Undo) — history buffer, LIFO undo stack, multi-level undo
9. [Wikipedia — Geometric constraint solving](https://en.wikipedia.org/wiki/Geometric_constraint_solving) — detection of over- and under-constrained sets and subsets

Dropped this pass (R12, retried once): FreeCAD wiki `Topological_naming_problem` (Anubis access-control on both URL forms); Autodesk Fusion 360 Timeline help (HTTP 503 x2); one arXiv URL that was a network-science paper, not CAD (wrong topic).

Related PRISM wiki: [`knowledge/wiki/cad-fusion-live/cad-fusion-live-foundations.md`](cad-fusion-live-foundations.md) (theory spine) · [`knowledge/wiki/cad/cad-applied-practice.md`](../cad/cad-applied-practice.md) (sibling — static/authoring gotchas; this file owns the live/automation/session angle).
