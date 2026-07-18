---
name: feedback-auto-close-out
description: "Standing rule (2026-05-13) — always audit + close out shipped-but-pending units when working on roadmaps. Use scripts/audit-close-out-candidates.mjs + /close-out-audit skill. Advisory only, human-verify before flipping envelope."
aliases: feedback_auto_close_out
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.399Z
---


# [[feedback_always_close_out|Always close out]] completed units — automated detection + manual verification

User directive (2026-05-13, slot BRAVO claude-de9949da): *"close out units completed if you didn't already. automate it with memories and whatever else we can use to ensure you close out completed tasks on road maps"* … *"make sure what you build is added to memories, claude.md, system-viz, obsidian and prism awareness so we know to utilize it always to close out completed tasks and units of roadmaps"*.

## The rule

When working on **any** roadmap unit (pick-unit, mid-build, post-commit, scrutiny pass, /handoff prep), check whether OTHER units in the same milestone have deliverables that already exist on disk but envelope status still says `pending` — those are **silent close-out debt**. Close them out.

**Triggers — run the audit when:**
1. About to /pick-unit or /loop a new unit
2. Closing out your own unit (always inspect siblings in same milestone)
3. User says "close out", "shipped", "what's done", "envelope drift", "stale milestones"
4. /checkin reports `drift_milestones > 0`
5. Doing a milestone-level audit / cleanup pass

## How to apply

**Step 1 — Audit (read-only, ~3s):**
```bash
node H:/prism/scripts/audit-close-out-candidates.mjs
# or scope to your milestone:
node H:/prism/scripts/audit-close-out-candidates.mjs --milestone COORD-MS0
```
Or invoke `/close-out-audit` skill.

**Step 2 — Read the report:**
- `state/shared/CLOSE-OUT-CANDIDATES.md` — human-readable
- `state/shared/CLOSE-OUT-CANDIDATES.json` — machine-readable (carries `advisoryOnly: true`)

**Step 3 — For each candidate, MANUALLY VERIFY:**
- File presence ≠ correctness. Read the artifact end-to-end.
- Confirm it satisfies the spec intent, not just exists.
- Check the **all** deliverables not just the path-resolvable ones (e.g. "Integration with X" abstract deliverables still need verification).

**Step 4 — Close out per [[feedback_roadmap_close_out]]:**
1. Edit envelope (status `pending` → `complete`, add `completed_at` + `completed_by` + `ship_notes`)
2. Regen `MILESTONE_PROGRESS.{md,json}` + `BUILD_STATE.{md,json}`
3. Update `roadmap-index.json` if milestone-level complete
4. Post chat-bus
5. Commit with `[MS]/U-XXX: close out ...` message
6. 3-of-3 scrutiny (codex + reviewer A + reviewer B)

## Why NEVER auto-flip

The audit script is **advisory-only by design**. False close-outs:
- Corrupt `MILESTONE_PROGRESS.json` shipped counts
- Pollute `BUILD_STATE.json` built-vs-pending splits
- Lock `roadmap-index.json` from re-work
- Hide real bugs ("we said it's shipped, must be working")

The audit detects file presence; only a human can verify the file **does what the spec says**. The script's confidence score is a triage signal, not a proof.

## Confidence scoring (default min 0.75)

- **resolved** (path exists, no abstract residual): +1.0
- **hybrid** (path exists, but deliverable also carries "and X" abstract intent): +0.5
- **abstract** (no path token, conceptual): excluded from denominator
- **missing** (path token doesn't resolve): +0

Confidence ≥ 0.75 means "75% of verifiable-by-path deliverables resolve". Still must be human-verified.

## Shipped artifacts (so this rule is enforceable)

| Artifact | Where |
|----------|-------|
| Audit script | `H:/prism/scripts/audit-close-out-candidates.mjs` |
| Skill | `H:/prism/.claude/commands/close-out-audit.md` (`/close-out-audit`) |
| Wiki | `H:/prism/knowledge/wiki/architecture/close-out-audit.md` |
| Suggestion hook | `H:/prism/.claude/hooks/close-out-audit-suggest.mjs` (UserPromptSubmit, T2 advisory) |
| **GOAL gate hook** | `H:/prism/.claude/hooks/goal-complete-gate.mjs` (**Stop, T0 HARD BLOCK** — fires when `/goal` invoked, requires fresh audit + triaged candidates) |
| Deferral log | `H:/prism/state/shared/CLOSE-OUT-DEFERRED.md` (per-unit deferral reasons — bypasses the gate without using env bypass) |
| Doctrine | `H:/prism/CLAUDE.md` §CLOSE-OUT AUTOMATION + §GOAL-COMPLETE GATE |
| This memory | `feedback_auto_close_out.md` |
| Reports | `H:/prism/state/shared/CLOSE-OUT-CANDIDATES.{json,md}` |

## `/goal` gate enforcement (2026-05-13 follow-up)

User directive: *"add the closeout-audit slash command to the /goal slash command so the task cant be considered /goal complete until the audit is ran"*. `/goal` is Anthropic's built-in slash command. We gate it via the Stop hook `goal-complete-gate.mjs`:

1. Hook scans transcript tail for `<command-name>/goal</command-name>` markers
2. If `/goal` invoked → require fresh `CLOSE-OUT-CANDIDATES.json` (≤2h)
3. If candidates surfaced → each `unit_id` must appear in a recent commit body OR in `state/shared/CLOSE-OUT-DEFERRED.md`
4. Block Stop otherwise with actionable instructions

**Triage paths per candidate:** (a) close it now (envelope edit + regen + commit referencing unit_id), (b) defer it (append to `CLOSE-OUT-DEFERRED.md` with reason), (c) reject it as false-positive (append to `CLOSE-OUT-DEFERRED.md` with "false-positive: <reason>").

**Knobs:** `PRISM_GOAL_GATE_DISABLE=1` (off), `PRISM_GOAL_GATE_STALE_HRS=N` (default 2), `PRISM_GOAL_GATE_AUDIT_BYPASS=1` (one-shot bypass, logged).

## First demonstration

Origin commit: this turn (slot BRAVO claude-de9949da). Demonstrated by closing U-COORD03 + U-COORD10 in `COORD-MS0` after the audit surfaced them (plus prior U-COORD07 close-out from the same turn, manually scoped).

Found via audit: U-COORD03 (PID liveness, isProcessAlive() in agent-coordination-daemon.mjs:198) + U-COORD10 (zombie-reaper-daemon.mjs with reap-on-TTL semantics).

## Companion rules

- [[feedback_always_close_out]] — always finish every facet of a unit before reporting done
- [[feedback_roadmap_close_out]] — the 4-surface close-out protocol (envelope + MILESTONE_PROGRESS + BUILD_STATE + roadmap-index + chat-bus)
- [[feedback_always_build]] — never skip; build everything identified
- [[feedback_pick_unit_routing]] — devtools-first when picking
- [[reference_master_index_surface]] — `/master-index` for cross-system search
- [[reference_build_state_surface]] — `BUILD_STATE.md` for built-vs-pending awareness
