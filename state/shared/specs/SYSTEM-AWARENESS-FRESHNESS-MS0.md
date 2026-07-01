---
milestone: SYSTEM-AWARENESS-FRESHNESS-MS0
status: planning
owner_slot: golf
generated_at: 2026-05-19
generator: claude-e20e2b52 (golf chat)
target_close: rolling (multi-session drain)
roi_score: 8.5
---

# SYSTEM-AWARENESS-FRESHNESS-MS0 — keep PRISM's doc/awareness layer current with the live system

## Problem

PRISM has 16+ knowledge surfaces (CLAUDE.md, MEMORY.md, ~30K-entry wiki, 200+
memory files, ~600 milestone envelopes, system-graph.json, build-state, awareness
snapshot, recent-shipments inbox, dispatchers, action catalogs, command manifest,
specs, regressions log, dashboards, handoffs, tribal corpus). Each surface goes
stale at its own rate, and the staleness is **silent**: a doc that says "13 NATO
slots" still loads, still injects, still feels authoritative — it just lies.

The 2026-05-19 FLEET-DOCTRINE-26 sweep surfaced the magnitude of the problem:
21 files needed updating after a single `SLOT_NAMES` 13→26 expansion. The
underlying drift class is **fleet-wide**, recurring (the same pattern hit
2026-05-15 7→10 and 2026-05-16 10→12 → 12→13), and currently has no detection
gate other than human-spotted incongruity.

This milestone designs the detection + drain pipeline that keeps the system's
**self-awareness layer** current with its **lived reality**.

## Goal

A drainable, evidence-based system-freshness pipeline:

1. **Detect** — programmatic enumeration of 6 staleness types (Phase 0).
2. **Surface** — every detected item lands in an actionable inbox with commit-SHA + drill-down pointers (Phases 1-4).
3. **Drain** — milestone-summary, wiki-cross-ref, memory-hygiene, archive-marker work units golf (or owning slots) can execute.
4. **Prevent** — Stop-hook + cron automation that catches new staleness in <24h (Phase 5).

## Acceptance (when does this milestone close?)

- Phase 0 audit script ships + has tests.
- All 6 staleness categories have first-run baseline counts captured.
- ≥80% of HIGH-severity inventory items resolved (CLAUDE.md milestone summaries + broken wikilinks).
- Stop-hook gate catches NEW staleness within 24h of introduction (Phase 5 acceptance).
- Re-run of audit script after drain pass shows monotonic decrease (no regressions).

## The 6 staleness categories (audit dimensions)

### 1. CLAUDE.md missing milestone summaries (HIGH severity)

**Detection:** for each milestone-name token observed in recent commit subjects
(last 30 days, `[MAIN] [SCOPE]/U-ID:` format), count CLAUDE.md occurrences.
`HITS=0` → NEEDS-SUMMARY.

**Drain action:** add a §<MILESTONE> summary block to CLAUDE.md OR add an inbox
row to `state/shared/RECENT-SHIPMENTS-<date>.md` if the milestone is still in
flight (judgment: cross-cutting / durable / load-bearing → CLAUDE.md; single
unit / wiki-sized detail → wiki only).

**First-run target:** 13 milestones flagged in `RECENT-SHIPMENTS-2026-05-18-19.md`
inbox.

### 2. Wiki cross-reference gaps (MEDIUM severity)

**Detection:** for each `[[wikilink]]` in wiki/memory entries, verify the target
file exists. Build adjacency: subsystem-wiki-entry ↔ recent commits touching
files matching that subsystem's path pattern. Subsystem-wiki entries that
DON'T reference recent shipments in that subsystem → CROSS-REF-GAP.

**Drain action:** add a §Recent shipments block to the subsystem wiki entry
with pointers to the new units.

**Heuristic:** subsystem keyword + commits in last 14d + zero wiki update in
same window → flag.

### 3. Broken wikilinks (HIGH severity)

**Detection:** `[[name]]` where no file matches `knowledge/wiki/**/name.md` OR
`knowledge/memories/**/name.md` OR `name.md` in C: auto-memory dir.

**Drain action:** create the missing file OR rename the link to the actual
target OR mark `_link_check_skip` if the link is intentional-forward (mentioned
but not yet written).

### 4. Superseded-but-unmarked docs (MEDIUM severity)

**Detection:**
- Memory/wiki entries whose `description:` or first paragraph mentions
  a milestone that has a `superseded_by:` field in roadmap-index.
- `feedback_*.md` files explicitly marked SUPERSEDED in body but with no
  frontmatter `supersedes:` chain.
- Doc filename ends in a date older than 30d AND a same-stem newer file exists.

**Drain action:** add `supersedes:` frontmatter + `_status: superseded_by [[new]]`
header line. Don't delete — the reference preservation rule per
[[feedback_never_delete_only_disable]].

### 5. CLAUDE.md stale-section detection (HIGH severity)

**Detection:** for each `## <MILESTONE>` section in CLAUDE.md, check whether
NEWER milestones in the same family (MS0 → MS1 → MS2 → MS3) exist in roadmap-
index. If yes AND the section doesn't mention the later milestone → STALE.

**Example:** §FLEET-REAPER-MS1 exists; MS2 + MS3 shipped 2026-05-18..19; the
MS1 section doesn't mention them.

**Drain action:** append §MS2 + §MS3 blocks under the milestone family.

### 6. Count-claims in docs (LOW severity — informational)

**Detection:** any doc claiming a specific count of engines/dispatchers/skills/
slots that disagrees with the canonical inventory file (`PRISM-INVENTORY-
LATEST.md` for live counts, `chat-slots.mjs SLOT_NAMES.length` for slot count,
`BUILD_STATE.json` for build counts).

**Drain action:** replace literal counts with pointer references ("see
PRISM-INVENTORY-LATEST.md").

## Phase plan

### Phase 0 — Tooling (THIS SESSION)

- **U-SAF-A1** — `scripts/system-awareness-freshness-audit.mjs` (the audit script).
  Pure-core + injected `RootPaths`/`ReadFile`/`GitLog`. 6 detection passes,
  one per category. Output: JSON inventory with `category` / `severity` /
  `surface` / `evidence` / `drainAction` per item. Idempotent, advisory-only.
- **U-SAF-A2** — `scripts/system-awareness-freshness-audit.test.mjs`. Real-data
  oracle (run against live repo + assert findings shape). ≥3 failure modes +
  ≥2 adversarial + ≥3 variability per comprehensive-build floor.
- **U-SAF-A3** — Baseline snapshot file
  `state/shared/SYSTEM-AWARENESS-FRESHNESS-BASELINE-2026-05-19.json`.
  First-run output frozen as the "we started here" reference.

### Phase 1 — CLAUDE.md milestone-summary drain (FOLLOW-UP)

- **U-SAF-B1** — Drain category #1 (NEEDS-SUMMARY rows from inbox).
  Per milestone, write a 1-paragraph §MILESTONE block to CLAUDE.md OR keep in
  inbox if still in flight. Owner: golf (CLAUDE.md edit privilege).
- **U-SAF-B2** — Drain category #5 (stale family sections).
  Per family with newer milestones, append §MS<N> blocks. Owner: golf.

### Phase 2 — Wiki freshness sweep (FOLLOW-UP)

- **U-SAF-C1** — Drain category #2 (cross-ref gaps). For each subsystem with a
  wiki entry + recent commits, append §Recent shipments to the wiki entry with
  pointers. Owner: subsystem-owning slot (mill for milling, lathe for lathe, etc).
- **U-SAF-C2** — Drain category #3 (broken wikilinks). Per broken link, either
  create the missing file, rename the link, or mark _link_check_skip. Owner: any.

### Phase 3 — Memory hygiene (FOLLOW-UP)

- **U-SAF-D1** — Drain category #4 (superseded-but-unmarked). Add `supersedes:`
  frontmatter + status header. Owner: golf.
- **U-SAF-D2** — Auto-memory dir reconciliation. Verify every entry in
  `MEMORY.md` index points to a real file in the C: auto-memory dir.

### Phase 4 — Count-claim cleanup (LOW priority)

- **U-SAF-E1** — Replace literal counts in docs with inventory-pointer references.
  Owner: any. Bulk-script applicable (sister to fleet-doctrine-sweep.mjs).

### Phase 5 — Prevention automation (FOLLOW-UP)

- **U-SAF-F1** — `.claude/hooks/stop-system-awareness-freshness.mjs` (Stop-hook
  T3 advisory). On Stop, runs the Phase-0 audit, compares against the baseline,
  fires a warning if categories #1 / #3 / #5 regress (new staleness introduced
  this session).
- **U-SAF-F2** — Scheduled-task installer (`install-system-awareness-freshness-task.ps1`)
  for daily cron at 23:00 local. Sister pattern to PRISM Fleet Reaper. Output
  rolls into `state/shared/SYSTEM-AWARENESS-FRESHNESS-HISTORY.jsonl`.
- **U-SAF-F3** — CLAUDE.md `## Recent staleness` inbox auto-population from
  Phase 5 output (sister to `## Recent regressions`).

## Knobs (proposed)

| env var | effect |
|---|---|
| `PRISM_SAF_AUDIT_DISABLE=1` | Disable Stop-hook + cron audit entirely |
| `PRISM_SAF_AUDIT_BASELINE=path` | Override default baseline path for diff |
| `PRISM_SAF_HISTORY=path` | Override JSONL history path |
| `PRISM_SAF_SEVERITY_FLOOR=high\|medium\|low` | Filter output by min severity |

## Doctrine — preserved boundaries

This milestone explicitly does NOT:

- Auto-rewrite any milestone-named historical narrative ([[feedback_never_delete_only_disable]]).
- Touch C: auto-memory files except via the stop-obsidian-memory-feed Stop hook.
- Modify CLAUDE.md without golf-slot binding (OBSIDIAN-BRAIN-FIX-MS0/U-OBF-GOLF).
- Bypass the per-file scrutiny gate on any code change (all U-SAF code units
  ship with paired tests + 2-reviewer per-file scrutiny pass).
- Block any Stop event in Phase 5 — advisory only, never `continue:false`.

## Cross-references

- Predecessor: [[reference_fleet_doctrine_26_2026_05_19]] (FLEET-DOCTRINE-26 sweep,
  the work that surfaced this milestone's necessity).
- Sister pattern: `## Recent regressions` block in CLAUDE.md (operator-driven
  inbox for bug-findings; this milestone's Phase 5 builds the auto-populated
  sister for new-staleness findings).
- Tooling pattern: `scripts/fleet-doctrine-sweep.mjs` (the dev-velocity artifact
  of FLEET-DOCTRINE-26 — proves the literal-phrase bulk-update pattern works;
  Phase 4 will reuse it).
- Doctrine: [[feedback_reflect_all_changes_post_update]] (4-surface rule that
  defines when a change deserves CLAUDE.md vs only memory + wiki).

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Audit produces too-noisy output (false positives) | Severity floor knob; first-run baseline freezes acceptable noise level; drain is opt-in |
| Per-file scrutiny on the audit script is expensive | Audit script is pure-core + injected I/O → fast hermetic tests + one real-data oracle, exactly the U-INTEG-FIX-P0 pattern |
| Drain work spans too many slots / never closes | Each U-SAF-Bn / Cn / Dn is independently committable; partial drain still reduces staleness count |
| CLAUDE.md bloats from milestone summaries | Inbox pattern (RECENT-SHIPMENTS-<date>.md) caps CLAUDE.md growth; only cross-cutting / durable / load-bearing milestones earn a §block |
| New milestones created faster than drain rate | Phase 5 Stop-hook converges the rate: every Stop that introduces staleness fires advisory |

## Execution order

Phase 0 (this commit) → Phase 1 (golf, next session) → Phase 5 (golf, after
Phase 1 stabilizes) → Phase 2 (subsystem-owning slots, parallel) → Phase 3
(golf, low-traffic) → Phase 4 (any slot, opportunistic).

Phase 5 is intentionally early in priority — once the prevention layer is live,
the drain work compounds (every fix permanently lowers the regenerated noise).

## Footnote — incidental bug uncovered during FLEET-DOCTRINE-26

`claude-md-golf-only-guard.mjs` consults `stable-session-id.mjs` whose output
diverges from `slot-bind-enforce.mjs`'s authoritative `session_id` (witnessed
this session: golf bound to `claude-e20e2b52` per harness stdin, but
stable-session-id returned `claude-5852a0b9`). Result: the guard false-blocks
the legitimate golf-slot owner. Proposed follow-up `U-GUARD-SESSIONID-RECONCILE`
should ship as a sibling to Phase 5 (both touch session-id reconciliation logic).
