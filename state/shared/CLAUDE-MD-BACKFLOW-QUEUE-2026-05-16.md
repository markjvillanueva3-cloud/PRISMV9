# CLAUDE.md back-flow queue — system-viz upgrades audit

**Queued by:** claude-c0f06dee (slot juliett, /forge-audit-v2)
**Queued at:** 2026-05-16
**Blocked on:** `H:/prism/CLAUDE.md` held by `claude-32a39c0c` (slot foxtrot, expires in 14m)
**Reason for queueing instead of waiting:** conflict-fork rule (`feedback_conflict_fork_rule`) — peer chat was actively editing the same regression section; double-edit would jumble the append-only log.

These 3 entries should be inserted at the TOP of the `## Recent regressions` section in `H:/prism/CLAUDE.md` (after the `<!-- Append-only log -->` comment, before the most recent existing entry):

---

- 2026-05-16 | **`loadGraph` of `system-graph.json` is reimplemented or inline-parsed across 18 scripts** — defeats any module-scope cache landing in the shared lib (`scripts/lib/system-viz-graph.mjs`). Every UserPromptSubmit + SubagentStart hook that issues a graph query pays the full 24 MB parse cost. Reviewer-confirmed via `grep -l 'loadGraph\|JSON\.parse.*system-graph' H:/prism/scripts | wc -l == 18`. | fix: pending — see `state/shared/specs/SYSTEM-VIZ-UPGRADES-AUDIT-2026-05-16.md` finding M1 (mechanical 18-file edit + ESLint rule banning inline parses). Audit-tracked into `SYSTEM-VIZ-UPGRADES-MS0` as U-LIB-CONSOLIDATE (S-effort, prereq to P1 cache). | observed-by: claude-c0f06dee slot juliett /forge-audit-v2. | verify: `rg -c "JSON\.parse\(.*readFileSync.*system-graph" H:/prism/scripts` → 0 after fix (only lib remains).

- 2026-05-16 | **`merge-augmentations.mjs:byId` index has no end-of-merge invariant** — 1408 LOC composes 53 augmentation blocks against one shared `byId` map; if any block escapes `addNodeIndexed()` and pushes directly to `G.nodes`, the index silently desyncs and downstream `byId.get()` returns stale. No detectable error message; class of bug that lands as wrong-graph-state in queries. Reviewer-flagged during audit M2. | fix: pending — assert `G.nodes.length === G.byId.size` at end of merge + ESLint rule banning raw `nodes.push` in this file. SYSTEM-VIZ-UPGRADES-MS0 / U-MERGE-INVARIANT. | observed-by: claude-c0f06dee slot juliett /forge-audit-v2 (reviewer arm B). | verify: `grep -nE '\bnodes\.push\b' H:/prism/scripts/merge-augmentations.mjs` should match only inside `addNodeIndexed()`.

- 2026-05-16 | **DRIFT_REPORT.json consumer is Stop-time advisory only, not auto-remediation** — `.claude/hooks/stop-system-viz-drift.mjs` correctly reads the drift report and nudges on `truncated|root-missing|drift>10|age>12h`, but `regen-viz.mjs` itself does NOT hard-fail on `truncated|root-missing`. A corruption signal reaches operators as a 60-min-throttled advisory but doesn't block subsequent merges. (Prior /forge-audit-v2 draft mis-stated as "never consumed" — that was wrong; the gap is narrower.) | fix: pending — SYSTEM-VIZ-UPGRADES-MS0 / U-DRIFT-HARD-FAIL adds post-detect short-circuit in regen-viz. | observed-by: claude-c0f06dee slot juliett /forge-audit-v2. | verify: inject synthetic `truncated:1` into DRIFT_REPORT.json then `node scripts/regen-viz.mjs` → must exit non-zero before merge step.

---

**Merge protocol:** Once `claude-32a39c0c`'s claim expires (or peer releases on Stop), any chat may run a tiny merge:

```bash
# Verify the lock is gone first
node H:/prism/.claude/helpers/chat-slots.mjs file-claim-status --file H:/prism/CLAUDE.md
# If unclaimed, edit CLAUDE.md ## Recent regressions, paste the 3 blocks above at top
# Then delete this queue file
rm H:/prism/state/shared/CLAUDE-MD-BACKFLOW-QUEUE-2026-05-16.md
```

The findings themselves are canonically captured in `state/shared/specs/SYSTEM-VIZ-UPGRADES-AUDIT-2026-05-16.md` and the wiki entry `knowledge/wiki/architecture/system-viz-upgrades-audit-2026-05-16.md`. This queue file is purely the CLAUDE.md doctrine-pointer back-flow.
