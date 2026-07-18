---
name: reference_zulu_hermes_recency_gate_2026_06_23
description: U-ZLR-HERMES-RECENCY-GATE (2026-06-23, slot:zulu) — gradeHermesUtilization was the only meta-grader missing the lifetime-count phantom-green recency gate; applied the ollama/octopus pattern
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.283Z
aliases: reference_zulu_hermes_recency_gate_2026_06_23
---


# Hermes recency gate — meta-systems reconcile R15 apply-to-all (2026-06-23, slot:zulu, session 61eaae00)

Second ZULU `/checkin /goal /loop` pass (after [[reference_zulu_ollama_adoption_gap_reconcile_2026_06_23]]).
Operator re-issued the meta-systems synergy directive → descended NEVER-IDLE for a real fix.

## The gap (R15 apply-to-all)
`reconcile-zulu-ledger.mjs::gradeHermesUtilization` keyed solely on the **lifetime** `fired` count +
fail rate — **no recency gate**, while the sibling graders already had one:
- `gradeOllamaUtilization` gates on `lastUpdated` vs `META_RECENCY_H` (48h).
- `gradeOctopusUtilization` gates on `lastDrainAgeH` vs `META_RECENCY_H`.
- `gradeObsidianUtilization` deliberately gates on COUNT (mtime informational — the A-16 phantom-OPEN fix).

So a hermes lane that fired ONCE weeks ago and then died read **UTILIZED forever** — the exact
scrutiny-P2 phantom-green class the other graders were hardened against. `lastUsed` was available in
`byHook["ask-hermes"]` but only displayed, never gated.

## Fix (commit 256275995b)
- `gradeHermesUtilization(stats, nowMs = Date.now())` + recency gate via `lastUsed`/`META_RECENCY_H`.
- Precedence: never-used→UNDER; **high failRate→DOWN (wins over staleness** — a lane that errors when
  called is degraded whenever it was called); recent+healthy→UTILIZED; healthy-but-quiet(>48h)→UNDER.
- Missing `lastUsed` → treated stale (`Infinity` age) — mirrors ollama's missing-`lastUpdated` path.
- `reconcileMetaSystems` now threads `nowMs` into the hermes grade (was unthreaded).
- evidence: `last <ts>` → `last activity <age>h ago`.
- Tests rewritten DETERMINISTIC (explicit `nowMs`, no Date.now() reliance) + failing-first stale +
  missing-lastUsed + DOWN-beats-staleness cases. 28/28. Reviewer B EMPIRICALLY confirmed failing-first
  (ran new fixtures vs pre-fix → returned UTILIZED where the test now asserts UNDER). 2-of-2 scrutiny PASS.
- Live: hermes reads "last activity 2.7h ago" → fresh → UTILIZED; a >48h-quiet lane now correctly flips.

## Lesson
When you harden ONE health grader with a recency gate, **audit ALL sibling graders for the same
lifetime-count phantom-green** — a metric that reads green off a stale lifetime counter is a silent
false-OK (sibling of the [[feedback_read_full_content_not_titles]] / "existence != health" class).
Status enum stayed UTILIZED/UNDER/DOWN so `metaUtilized` count + `meta-systems-health-inject` (both
key on status) are byte-unchanged. Related: [[reference_zulu_meta_systems_utilization_probe_2026_06_22]] ·
[[reference_zulu_ledger_reconciler_2026_06_11]] · doctrine [[feedback_synergy_definition]].
