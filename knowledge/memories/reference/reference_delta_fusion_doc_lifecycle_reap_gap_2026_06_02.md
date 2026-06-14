---
name: reference_delta_fusion_doc_lifecycle_reap_gap_2026_06_02
description: "BUG — live add-in /new {name} doubling builds into a non-prefixed Untitled, so reap-by-prefix misses it (closed:0); leftover candidate docs accumulate"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.083Z
aliases: reference_delta_fusion_doc_lifecycle_reap_gap_2026_06_02
---


**Doc-lifecycle reap gap on the live Fusion add-in (`PRISM_Fusion_Drive.py` :18365), found 2026-06-02 via the G7 assembly PoC.** All delta live runners (`cad-fusion-correction-loop-live.mjs`, `cad-fusion-assembly-poc-live.mjs`) do `/new {name: "PRISM-DELTA-CLIVE-...-1"}` then build, then `reapByPrefix("PRISM-DELTA-CLIVE-...")`. On the live add-in, `/new {name}` does NOT reliably leave a doc whose name carries the prefix as the active doc — the build lands in an **"Untitled"** doc instead. Evidence: the assembly PoC reaped `closed:0, remaining:1, active="Untitled"` despite building 4 occurrences; the correction-loop runs show the same `remaining=1 active Untitled` signature.

**Consequence:** `reap-by-prefix` finds no matching doc → leftover **unsaved "Untitled" candidate docs accumulate** on the delta instance across runs. NOT a confirmed operator-data loss (the leftovers are `saveChanges=false` unsaved candidates in the delta workspace instance; the operator's SAVED/named docs — DIE CASE, the Okuma `.f3d` CAM doc, kilo's docs — are never closed because reap is prefix-scoped and they don't match). But it IS a hygiene leak + it means the build may land in the delta instance's shared "Untitled" rather than an isolated per-run doc, weakening the per-run isolation the safety directive intends.

**Root cause:** the documented `/new {name}` doubling ("named docs auto-drop") on the live add-in. The runner trusts that `/new {name}` makes a prefix-named active doc; it doesn't.

**Fix direction (follow-up unit U-CADTP-REAP-BY-ACTIVE):** after `/new`, read the ACTUAL active doc name via `/status` (`document` field) and reap by THAT exact name (not the assumed prefix); OR have the runner record the active-doc name pre-build and post-build and close only the doc(s) it demonstrably created; OR add a `/doc/close` capability to the live add-in (it currently has NO `/close` — only `/doc/save`+`/doc/save-as`). NEVER blanket-close "Untitled" (the delta instance's working Untitled may be legitimately reused; and never close a SAVED/named doc). Verify via `/status` active-doc + a re-run showing reap `closed≥1`.

**UPDATE 2026-06-02b — what SHIPPED + what was tried:** `reap-by-delta` (`computeCreatedDocs` + `reapCreatedDocs`: snapshot doc names pre-`/new`, reap the created delta) SHIPPED (commit `12f4e04a4d`, U-CADTP-REAP-BY-ACTIVE, 29/29 tests). LIVE-verified `closedCount:1` (was `closed:0`) — it DOES reap the created prefixed doc + protects the operator's active doc (`SAW PART`/`DIE CASE` reactivated+protected). It works BECAUSE `/new {name}` gives the created doc a UNIQUE prefix name the delta can track.
**REVERTED experiment:** replacing `/new {name}` with `createFreshDoc` (`app.documents.add` via /execute) to get a guaranteed-empty doc — it auto-names the doc **"Untitled"**, which COLLIDES with pre-existing `Untitled` leftovers → `computeCreatedDocs` (name-based) sees it as pre-existing → `reap closed:0 "no new docs"` (a REGRESSION). Lesson: reap-by-delta needs UNIQUE names; keep `/new {name}`'s prefix. (Fusion did not uniquify the auto name in practice.)
**STILL OPEN (add-in-level, not client-fixable):** the build still lands in a PRE-EXISTING doc (`components=4`=2 prior+2 this run) because the bridge's build verbs use `app.activeProduct` and the active doc races (add-in `/new` doubling + an active operator on the shared :18365 instance). The real fix is add-in-side: a build that targets a specific doc HANDLE (not `app.activeProduct`), OR `/new` reliably creating+activating a fresh empty doc. Until then, contaminated builds are possible on a shared/churny instance — prefer a dedicated, operator-idle delta instance for clean closed-loop runs.

Related: [[reference_delta_fusion_backend_map_2026_06_02]] (live add-in = PRISM_Fusion_Drive.py, no /close, no /documents) · [[reference_delta_designated_port_18632]].
