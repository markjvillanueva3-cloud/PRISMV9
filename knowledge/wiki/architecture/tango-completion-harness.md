---
title: TANGO-COMPLETION-HARNESS — verify-on-disk queue reconciler
type: architecture
status: built (cron operator-gated)
slot: tango
created: 2026-06-14
commit: 0aee908e67
tags: [tango, discovery, reconciliation, picker, shipped-units, close-out, cron]
---

# TANGO-COMPLETION-HARNESS

## The finding (what "finish all remaining tango tasks" actually means)

A verify-on-disk audit (5 sonnet recon agents, FLEET-SEARCH-DAEMON-MS0) found the
priority-queue's ~3100 "tango-eligible" units are **~100% polluted**: the top 20
are 20/20 ALREADY SHIPPED (confirmed commits + on-disk engine files). The four
shipped-detection sources in `shipped-units-source-of-truth.mjs` miss them because
a unit frequently ships under a commit subject that does NOT contain its U-ID
(e.g. `U-CK11` shipped as `[COMMAND-KERNEL-MS0]/...PHASE2BC-V2-1`) and its
milestone envelope was never flipped to `status:complete`.

So the real tango work is **RECONCILIATION** (tango's domain: discovery +
anti-duplication), not building 3100 duplicates. **Verify-on-disk before building
any queue unit** is tango's law.

## Mechanism — a 5th picker shipped-source

`shipped-units-source-of-truth.mjs` already unions four sources (MILESTONE_PROGRESS
git-inference, envelope status, bridge-commit subjects, completed-milestone names).
This adds **source (e)** `readVerifiedShippedOverrides` reading
`state/shared/verified-shipped-overrides.json` (U-* ids only). Unioned into
`buildShippedIdsUnion` with its own mtime cache key. **Safe**: a verified-shipped
override is an explicit advisory list; it NEVER flips operator-authoritative
milestone envelopes (respects the "close-out audit never auto-flips" doctrine). A
false-positive only hides a unit from pickup (operator-recoverable via the
roadmap) — the same benign failure direction as the bridge source.

## The reconciler — `scripts/tango-reconcile-queue.mjs`

For each tango-eligible unit, extract the U-* ids the picker checks (the `id` if
U-shaped + any U-* token embedded in the title — mirrors `extractUnitIdsFromUnit`)
and confirm shipped iff that **exact maximal U-* token** appears in a real commit
subject.

**Exact maximal-token equality, NOT a boundary regex** — this is the load-bearing
correctness property. `-` is a valid character WITHIN a unit-id, so a boundary
match wrongly let the short id `U-A1` match the longer `U-A1-ARCHETYPE-LABELER`
(a DIFFERENT unit). The reconciler extracts each subject's maximal `U-[A-Z][A-Z0-9-]*`
token and requires the candidate to EQUAL one of them.

Plus a 20-unit `RECON_SEED` (an LLM-agent verify-on-disk pass confirmed these
shipped with commit-SHA + asset evidence) for the subject≠id cases tier (1) can't
catch.

LIVE first run: **166 exact-commit-token + 20 seed = 185 verified-shipped, ALL
U-*, 0 false-positives, 167 eligible units de-polluted.** Flags: `--apply` (write),
`--dry` (default, report-only), `--top N`, `--json`.

### Measurement-trap lesson (R12)

A first spot-check flagged 16 "false-positives" — but a definitive check (does each
flagged id exist as a real exact maximal token in ANY commit?) proved **0 true
false-positives**. The note `slice(0,100)` had truncated *before* the token's
position in long subjects, so the *validation* was wrong, not the matcher. The note
now leads with the matched token.

## Durable cron — `install-tango-reconcile-task.ps1`

A daily off-minute batch (`04:37` + AtLogOn, SYSTEM principal, bounded 10 min,
single-instance), cloned from `install-index-daemon-task.ps1`. Operator registers
once elevated:

```
! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-tango-reconcile-task.ps1 -RunNow
```

Each run re-verifies and grows the overrides as the fleet ships more — keeping the
queue de-polluted over time.

## Residual / honest scope

The deterministic git-subject verify catches units whose commit subject contains
their exact U-ID. Deeper cases (subject ≠ id, not seeded) need an LLM-agent verify
(`ask-ollama` / `ollama-prism-bridge` / a hermes pass) — the documented escalation
the cron can add. After de-pollution, whatever genuinely-pending units remain are
the real remaining tango build work.

## Files

- `scripts/lib/shipped-units-source-of-truth.mjs` — source (e) + drift-resistant test
- `scripts/tango-reconcile-queue.mjs` + `.test.mjs` (8 tests)
- `.claude/helpers/install-tango-reconcile-task.ps1`
- `state/shared/verified-shipped-overrides.json` (output) + `state/shared/specs/TANGO-QUEUE-RECONCILE.md` (report)

## Memory

[[reference_tango_completion_harness_2026_06_14]]
