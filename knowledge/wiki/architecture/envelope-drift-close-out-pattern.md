---
schema: ideablock-v1
title: "Envelope-drift close-out pattern — closing 189 drifted milestones where git shipped but envelope says not_started"
domain: "PRISM architecture"
category: architecture
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - BUILD_STATE.md (189 envelope drift cases as of 2026-05-21)
  - state/shared/MILESTONE_PROGRESS.md / .json (envelope vs git delta)
  - state/shared/CLOSE-OUT-CANDIDATES.{json,md} (audit output)
  - scripts/audit-close-out-candidates.mjs (deterministic detection)
  - scripts/close-out-milestone.mjs (operator-side reconcile)
  - CLAUDE.md §CLOSE-OUT AUTOMATION + §GOAL-COMPLETE GATE
extracted_via: human-authored
extracted_at: 2026-05-21T09:25:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-ARCH-ENVELOPE-DRIFT-CLOSEOUT)
---

## Question

189 milestone envelopes claim `not_started` but git already shipped units. What's the canonical pattern to detect, triage, and close these?

## Answer (canonical — 4-stage workflow; advisory only, never auto-flips)

### The 189-case gap (as of 2026-05-21)

`BUILD_STATE.md` enumerates 189 envelope-status drift cases — milestones where the `claimedStatus` field in the envelope JSON disagrees with `derivedStatus` computed from `git log`. The 2026-05-12 history-strip + the autonomous /loop generation pace created this debt: chats shipped units but didn't propagate status through all 4 surfaces (envelope · roadmap-index · MILESTONE_PROGRESS · BUILD_STATE).

Top drift clusters:

| Cluster | Pattern | Count |
|---|---|---|
| CAMX-MS* | "claims_not_started_but_has_shipped_units" | ~12 (CAMX-MS0.5, MS0.7, MS1, MS3, MS4, MS10, MS11, ...) |
| SCIMATH-MS* | claims_not_started, in_progress_real | 3+ |
| CLI-MS0 | claims_not_started, 19/22 shipped | 1 |
| (others) | various claim/git deltas | 170+ |

### The 4-stage close-out workflow

**Stage 1 — Detect drift (deterministic).**

`scripts/audit-close-out-candidates.mjs` scans `state/shared/specs/milestone-envelopes/*.json`, extracts path tokens from each envelope's unit specs, resolves them against `~25` SEARCH_ROOTS with bounded recursion. Output:
- `state/shared/CLOSE-OUT-CANDIDATES.json` — confidence per unit (default min 0.75)
- `state/shared/CLOSE-OUT-CANDIDATES.md` — human-readable per-milestone summary

Run it manually OR via the `close-out-audit-suggest.mjs` UserPromptSubmit hook (auto-fires on keywords: close out, envelope drift, stale milestones, shipped but pending, what's done).

**Stage 2 — Human-verify each candidate.** File presence ≠ spec correctness. For each candidate unit:
1. Read the envelope's unit spec: `state/shared/specs/milestone-envelopes/<MILESTONE>.json` § unit at `units[i]`.
2. Resolve the candidate's referenced files via `git show <ref>:<path>` (NEVER `git stash` in shared tree — clobbers peers).
3. Verify each file's content matches the spec — not just "file exists" but "file's exports + tests + dispatcher wiring match the unit's acceptance criteria."
4. If genuinely shipped → mark for stage 3. If partial → keep `pending`, log a follow-up unit.

**Stage 3 — Update all 5 surfaces (per [[feedback_roadmap_close_out]]).**

The "5 surfaces" rule: never close out without propagating through all of:

```
1. envelope JSON           — state/shared/specs/milestone-envelopes/<MILESTONE>.json
2. roadmap-index           — mcp-server/data/roadmap-index.json (claim release)
3. MILESTONE_PROGRESS      — state/shared/MILESTONE_PROGRESS.{md,json} (regen via build-milestone-progress.mjs)
4. BUILD_STATE             — state/shared/BUILD_STATE.{md,json} (regen via build-state-snapshot.mjs)
5. chat-bus                — state/shared/AGENT_CHAT.jsonl announcement
```

Each surface has a one-line update via `scripts/close-out-milestone.mjs --milestone <ID>` (does 1+2+3+4 atomically); the chat-bus announcement is per-chat.

**Stage 4 — Verify post-close.** Re-run `audit-close-out-candidates.mjs` — the closed unit should no longer appear in the candidate list. If it still appears → one of the 5 surfaces wasn't updated.

### Confidence-driven triage

The auditor's confidence score (0.0-1.0) gates triage:

| Confidence | Triage |
|---|---|
| 1.0 (every referenced file resolved) | Close out this iter; high confidence. |
| 0.75-0.99 (some references partially resolve, some are abstract) | Manual verify each non-resolved reference; close out if true. |
| 0.50-0.74 (mixed file + abstract evidence) | Read the spec; likely partial — log follow-up unit instead of closing. |
| <0.50 | Don't trust. The unit is likely still pending; spec references are abstract. |

The default min-confidence is 0.75 — entries below that don't surface in `CLOSE-OUT-CANDIDATES.md`. To audit lower-confidence work, run `--min-confidence 0.5`.

### Silent close-out drift (the SECOND class)

`scripts/lib/silent-close-out-drift.mjs` (2026-05-17, alpha /loop) catches the inverse drift:
- Envelope `status: complete` + all units complete BUT
- `MILESTONE_PROGRESS.json` `shipped: 0` (pre-2026-05-12 ship commits not tagged `[SCOPE]/U-ID`, so `build-milestone-progress.mjs` can't credit them).

First measured: **51 milestones / 329 hidden-shipped units** (~25-30 % fleet completion blind spot). Wired into `audit-close-out-candidates.mjs` as the `silent_close_out_debt` key + `## Silent Close-Out Debt` MD section. Operator reconciles via `scripts/close-out-milestone.mjs --milestone <ID>`.

### Three drift classes — distinct fixes

| Class | Symptom | Detection | Fix |
|---|---|---|---|
| **Forward drift** (the 189) | Envelope says not_started, git shipped | `audit-close-out-candidates.mjs` | `close-out-milestone.mjs --milestone <ID>` |
| **Silent drift** (the 51/329) | Envelope complete, MILESTONE_PROGRESS shipped=0 | `silent-close-out-drift.mjs` | Same `close-out-milestone.mjs` reconcile |
| **Reverse drift** (rare) | Envelope says complete, git has NOT shipped | manual + git log review | Reopen envelope status; log replan |

The first two classes are the operator's daily work; the third surfaces during /scrutinize passes.

### Why this gap exists + why it persists

1. **Pre-2026-05-12 commits lack `[SCOPE]/U-ID` subject** — `build-milestone-progress.mjs` parses subject for crediting; older commits are uncreditable.
2. **Autonomous /loop pace** outruns close-out propagation — a chat ships a unit + commits, but doesn't update MILESTONE_PROGRESS until the next /checkin (sometimes hours later).
3. **The 5-surfaces rule is verbose** — operators sometimes update 1-2 surfaces and miss the rest.
4. **Multi-chat fleet** with shared envelope files means concurrent edits are lock-contended; chats sometimes skip the envelope-write to avoid the lock dance.

Fix is process discipline + the `scripts/close-out-milestone.mjs` one-command path, not new code.

### Operator-actionable next steps (P0 picks)

| Priority | Action | Why |
|---|---|---|
| **P0** | Run `node scripts/audit-close-out-candidates.mjs` to get fresh count (might be stale vs the 189 reported in BUILD_STATE.md). | Stale audit + acted-on numbers = wrong closes. |
| **P0** | Triage CAMX-MS* cluster (12+ drifted milestones, same pattern) | Single audit pass clears the largest cluster. |
| **P1** | Triage SCIMATH-MS* (3+) | Smaller but similar pattern. |
| **P1** | Run silent-drift audit (`PRISM_AUDIT_FROZEN_TIME=N` for reproducible diff) | Catches the second 25-30 % blind spot. |

### Tie-ins (PRISM-side)

- `audit-close-out-candidates.mjs` — detection script
- `close-out-milestone.mjs` — reconcile script (5-surface update)
- `close-out-audit-suggest.mjs` UserPromptSubmit hook — auto-surfaces top-3 candidates
- `goal-complete-gate.mjs` Stop hook — `/goal` gated on close-out audit freshness
- `state/shared/MILESTONE_PROGRESS.*` + `state/shared/BUILD_STATE.*` — surfaces

### Tie-ins (tribal canonical)

- [[wiring-pattern-engine-to-dispatcher]] — sibling architecture entry (wire backlog)
- [[lathe-wiring-backlog-bridge]] · [[cam-engine-wiring-bridge]] — sibling bridges (engine wiring)
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (phase 2C reframe)
- [[feedback_roadmap_close_out]] — standing 5-surfaces rule
- [[feedback_auto_close_out]] — auto-audit standing rule
- [[reference_silent_close_out_drift_2026_05_17]] — silent-drift detector reference

## Provenance

Distilled from BUILD_STATE.md live snapshot (2026-05-21: 189 envelope drift cases) + scripts/audit-close-out-candidates.mjs + scripts/close-out-milestone.mjs + scripts/lib/silent-close-out-drift.mjs + CLAUDE.md §CLOSE-OUT AUTOMATION §GOAL-COMPLETE GATE. Authored 2026-05-21 by slot:hotel under U-WIKI-ARCH-ENVELOPE-DRIFT-CLOSEOUT — **30th canonical entry**, **4th bridge-class entry** of the wiki+tribal pivot phase 2C. Provides 4-stage close-out workflow + 3-class drift taxonomy + confidence-driven triage table.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` auto-surface on `envelope drift`, `close out`, `MILESTONE_PROGRESS`, `BUILD_STATE drift`, `claims_not_started_but_has_shipped_units`, `silent close-out`, `forward drift`, `reverse drift`, `5 surfaces close out`, `CLOSE-OUT-CANDIDATES`, `close-out-milestone.mjs` keywords. Zero new wiring required.

## Cross-references

- [[wiring-pattern-engine-to-dispatcher]] · [[lathe-wiring-backlog-bridge]] · [[cam-engine-wiring-bridge]] — sibling architecture bridges
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_roadmap_close_out]] · [[feedback_auto_close_out]] — standing rules
- [[reference_silent_close_out_drift_2026_05_17]] — silent-drift detector
- [[feedback_high_roi_backend_first_slot_queue]] — backend-first picks
- [[feedback_do_optional_high_roi_work]] — standing rule
