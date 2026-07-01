---
name: feedback_always_fill_gaps
description: "Standing fleet rule — when a search/audit/build surfaces a gap (incomplete scan, missing data, unverified claim, timed-out sweep, TODO), FILL it then and there; never just log a gap and move on."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.398Z
aliases: feedback_always_fill_gaps
---


# Always fill gaps when discovered (fleet-wide, operator directive 2026-05-30)

When any task surfaces a gap — an incomplete scan, a timed-out sweep, a "not conclusively
cleared", a missing data file, an unverified claim, a TODO, a "pending re-scan" — **fill it
in the same session**. A logged-but-unfilled gap is silent debt; the next chat inherits a
"someone should look at this" that nobody owns. Close the loop while you have the context.

**Why:** Gaps logged and deferred rot exactly like envelope-status drift — the original
finder had the full context (paths, tooling, why it timed out) and is the cheapest possible
filler; a later chat pays full re-discovery cost or never picks it up. R12 (fail loud)
says surface uncertainty — this rule says then *resolve* it, don't just announce it. A
"gap" that turns out to be a non-gap (e.g. the timed-out `prism-backups` SQLite scan that
was actually a git-object store, fully cleared once pruned properly) is only knowable by
finishing the check. Half-finished diligence reads as "covered everything" when it isn't.

**How to apply:**
1. **Triage the gap the moment you write it down.** Before logging "X not cleared", ask:
   can I clear it now with smarter tooling? (prune the noise dir, raise the timeout, swap
   the absent CLI for a node reader, scope the trove by structure first). Usually yes.
2. **If you genuinely can't fill it now** (needs an external resource, a low-contention
   window, another slot's domain) — make it an OWNED follow-up: name the owner, the exact
   command/approach, and route it (chat-bus + handoff + memory). An unowned gap is the
   failure mode, not a deferred-but-owned one.
3. **Verify the fill, don't assume it.** Cross-check recovered/missing data against the
   live source (present? byte-identical? newer?). A "gap filled" claim is a lie if unverified.
4. **Record the verdict** so the gap is provably closed, not silently dropped — update the
   doc/memory/handoff from "pending" to "CLOSED: <what was found>".

Sibling doctrine: [[feedback_full_recursive_parallel_search]] (sweep the WHOLE tree) ·
[[feedback_always_close_out]] (finish every task tail) · [[feedback_always_build]]
(always build, never skip) · [[feedback_missing_file_copy_back]] (restore, don't route around) ·
R12 fail-loud [[feedback_r5_thru_r12_doctrine]].
