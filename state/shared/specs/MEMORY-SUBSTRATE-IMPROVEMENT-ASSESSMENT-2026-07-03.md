# Memory Substrate — Assessment + Improvement Roadmap (2026-07-03, slot:bravo)

> Work order: `/checkin-bravo read the bravo chat and session from earlier to regain
> context and assess how we can improve memory in claude code cli`.
> Grounded in LIVE measurements taken THIS session (2026-07-03), not estimates.

## Axis demarcation (R8/dedup — READ THIS FIRST)

"Memory / awareness" splits into two orthogonal axes. Prior work exhausted ONE of them:

| Axis | What it governs | Status | Canonical source |
|------|-----------------|--------|------------------|
| **INJECT** (push) | bytes auto-pushed INTO context each turn | **thoroughly optimized** — ~2.6K tok/turn ceiling, 100% knob coverage, structural dedup shipped; last lever = AW-1 (unify pressure signals) | `FLEET-INJECTION-BUDGET-AUDIT-2026-06-11.md`, `AWARENESS-SYSTEM-ASSESSMENT-2026-06-10.md`, `CONTEXT-AWARENESS-OBSIDIAN-IMPROVEMENTS-2026-06-21.md` |
| **RETAIN + RECALL** (store) | what persists across sessions + how well it is recalled | **NOT rigorously assessed** — priors asserted "retention stack is solid"; live measurement below contradicts that | *this file* |

This assessment covers ONLY the RETAIN+RECALL axis. It does **not** re-open the byte-budget
work (that would fight deliverable #1). The two 06-21/06-10 specs explicitly say "Context
RETENTION: no new bug." The measurements below show that conclusion was **inject-biased** —
nobody measured the STORE.

## Method — what was measured live this session

- `fs` enumeration of the auto-memory dir `C:/Users/wompu/.claude/projects/H--prism/memory/`.
- Direct read of this bravo session's precompact handoff (`HANDOFF-claude-13b0642e-bravo-*`).
- SessionStart headlines (CAG hit-rate, master-index sidecar freshness) captured verbatim.
- Read of the auto-writer `.claude/hooks/post-ship-distill.mjs` + `distill-session-learnings.mjs` path.

## CURRENT STATE — measured findings

### P1 — Unbounded write, no forget (memory sprawl) [MEASURED]
- **7,196 memory `.md` files, 16.9 MB.** Breakdown: **6,900 `reference_` (96%)**, 286 `feedback_`, 7 `project_`.
- No retention/consolidation/TTL/archive policy on the `reference_` class. The store grows monotonically.
- **Second-order:** `prism_memory:semantic_search` over 7,196 docs returns more near-duplicates as the
  store grows → recall signal-to-noise falls. This is a plausible contributor to the CAG headline this
  session (**10% overall hit-rate, 14% warm; 566 "recoverable" misses = doctrine-fingerprint churn**).

### P2 — Index/store scale mismatch [MEASURED]
- `MEMORY.md` (the ONLY always-in-context memory index, loaded every SessionStart) is **22 KB against
  its 24,576-byte watchdog ceiling** (`scripts/memory-size-watch.mjs`). It lists ~dozens of pointers.
- It **cannot** be the index for 7,196 files — it's within 2 KB of forced truncation. The design
  implicitly offloads the long tail to semantic_search / master-index, but (a) those aren't always
  invoked, (b) they degrade with P1 sprawl, and (c) **the master-index sidecar was STALE 12.5 h behind
  the graph THIS session** (SessionStart flagged it → search silently degrades to the architecture-graph
  fallback). The long-tail index is not reliably warm.

### P3 — Auto-write quality: `post_ship` memories are redundant + un-curated [VERIFIED root cause]
- `.claude/hooks/post-ship-distill.mjs` (Stop, T3) fires whenever HEAD's subject matches `[SCOPE]/U-<id>`
  → spawns `distill-session-learnings.mjs`, which writes a `reference_post_ship_<scope>-<unit>.md` to the
  Obsidian memory dir (AND wiki/code-tribal/learnings) **once per shipped unit**.
- **6 of the 15 most-recent memory files are `reference_post_ship_*`** — this is the primary P1 growth engine.
- **R5 violation:** git already records "what shipped" (commit body), and CLAUDE.md `## Recent regressions`
  already curates the load-bearing ones. A per-commit memory file is the wrong tool — it's redundant
  storage that dilutes recall without adding a recall path anyone queries by name.

### P4 — Precompact handoff carries no working state [FIRST-HAND, highest severity]
- This session's own bravo precompact handoff: `STATE = "(precompact auto-write — slot bravo)"`,
  `RESUME = "Roadmap: 759 ms, 377 done. Next: L8-P0-MS2… Units completed: 0"` (generic roadmap
  boilerplate), `CONTEXT = (empty)`, followed by a **~4 KB `<!-- pad: xxxxx… -->` block**.
- The handoff is the PRIMARY cross-compaction working-memory carrier. When compaction fires mid-build,
  the resumed session inherits roadmap boilerplate + padding — **not** "I was editing X, failing test is
  Y, next step Z." The in-flight working set — the memory that matters most — is lost across the reset.
- The `xxxx` pad is a tell: the writer had nothing real to serialize, so it padded to length.
  (A spec exists — `AUTO-COMPACTION-MODEL-HANDOFF-MS0-SPEC-2026-06-11.md` — but the live artifact proves
  the writer is not capturing live state.)

### P5 — Assessment non-convergence (meta) [OBSERVED]
- ≥10 prior specs assess token/context/memory (`AUDIT-TOKEN-CONTEXT-MEMORY-2026-05-16`,
  `MEMORY-WIKI-OPTIMIZATION-2026-05-26`, `MEMORY-DB-AUDIT`, `OBSIDIAN-TOKEN-CONTEXT-SYNTHESIS-2026-06-08/09`,
  `AWARENESS-SYSTEM-ASSESSMENT-2026-06-10`, `AUTO-COMPACTION-MODEL-HANDOFF-MS0-SPEC-2026-06-11`,
  `ZULU-MASTER-CONTEXT-LEDGER-2026-06-11`, `CONTEXT-AWARENESS-OBSIDIAN-IMPROVEMENTS-2026-06-21`, …).
- Each session re-derives; no single durable RETAIN/RECALL backlog. (This file fixes that for its axis.)

## IMPROVEMENT ROADMAP — ROI ordered, each a buildable /loop unit, none fight the inject axis

### M1 — Precompact handoff captures REAL in-flight state (fixes P4) — HIGHEST ROI
- **Why first:** direct correctness fix for the highest-value memory (working set across compaction);
  bravo owns session-continuity (in-domain). Low blast radius (one writer).
- **Build:** in the precompact-handoff writer, snapshot from the live session — last N edited files
  (git status/diff), last test result (pass/fail + name), current unit id + pipeline step, and the
  session's actual RESUME directive (not roadmap boilerplate). **Delete the `xxxx` pad** (if the writer
  has real state, it doesn't need to pad; if it doesn't, padding hides the defect).
- **Files:** `.claude/helpers/precompact-handoff.mjs` + `per-agent-handoff.mjs`; spec
  `AUTO-COMPACTION-MODEL-HANDOFF-MS0-SPEC-2026-06-11.md`.
- **Test (R9):** compaction-resume round-trip — write handoff mid-edit, assert the resumed read contains
  the edited file + failing test, not boilerplate. **Edge:** never crash Stop (writer stays fail-soft).

### M2 — Bound the reference-memory store (fixes P1 + P3) — HIGH ROI
- **Build:** stop emitting per-commit `reference_post_ship_*` files. Route `post-ship-distill` output into
  ONE append-only ledger (`reference_post_ship_LEDGER.md`, or fold into the existing `MEMORY-RECENT.md`
  pattern), and migrate/prune the existing ~6,900 into it. Restores semantic-recall S/N; shrinks 16.9 MB → a fraction.
- **Files:** `.claude/hooks/post-ship-distill.mjs`, `scripts/distill-session-learnings.mjs`,
  `scripts/memory-size-watch.mjs`, `/memory-prune` skill.
- **Edge (R8/R12):** prune ONLY the auto-generated `post_ship` class — never touch curated `feedback_`/
  `reference_*_(bug|regression|fix)_*` lessons. Verify the writer + a dry-run count before deleting.

### M3 — Keep the long-tail index warm (fixes P2 recall) — MEDIUM
- **Build:** ensure the post-commit chain actually rebuilds the master-index sidecar (it was 12.5 h stale
  this session despite the "post-commit rebuilds it" claim — verify the chain fires); add a freshness gate
  so a stale sidecar is surfaced/rebuilt on demand rather than silently falling back.
- **Files:** `scripts/build-graph-index.mjs` + its post-commit trigger; SessionStart staleness headline.

### M4 — Formalize the 2-tier memory index (fixes P2 structurally) — MEDIUM
- **Build:** make the tiering explicit + enforced. `MEMORY.md` = hot doctrine (`feedback_` + system map,
  curated, <24 KB, always in context). Long-tail `reference_` = semantic-only, never in the flat index.
  A write-router classifies on creation: `feedback_`/`project_` → index-eligible; `reference_post_ship_`
  → ledger, never indexed. Removes the pressure on the 24 KB ceiling by design.

### M5 — Convergence — LOW effort, compounding
- This file is the single durable RETAIN/RECALL backlog; link it from the bravo ledger and supersede the
  scattered retain/recall bullets in the prior specs (the INJECT axis stays owned by the 06-11 budget audit).

## Non-goals (already optimal — do NOT re-open)
- Per-turn injection byte budget (`FLEET-INJECTION-BUDGET-AUDIT-2026-06-11.md`).
- CAG cold-start hit-rate (inherently unavoidable first-asks; warm is healthy).
- Adding PRISM-wide knowledge into each galaxy CLAUDE.md (rejected 06-10 — multiplies redundant injection).

## Recommended build order
M1 → M2 → M3 → M4 → M5. M1 and M2 are independent and could parallelize across two /loops, but M1 first
(highest severity, smallest blast radius). Each is a comprehensive-route unit (R13): real
compaction-resume / dry-run-count tests, wired to the live hook, validated with before/after numbers.

_Source: live `fs` enumeration + handoff read + SessionStart headlines + `post-ship-distill.mjs` read,
2026-07-03 (slot:bravo, claude-13b0642e). Supersedes the RETAIN/RECALL bullets of the prior context specs._
