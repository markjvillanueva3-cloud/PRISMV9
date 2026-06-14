---
name: reference-token-budget-telemetry
description: "U-P4-TOKEN-BUDGET-TELEMETRY (SYSTEM-VIZ-BRAIN-MS0). Added JSONL telemetry layer to token-budget-gate hook + dashboard CLI for fleet-wide token-budget attribution by slot. Sibling of [[reference_tribal_by_domain_inject]]."
aliases: reference_token_budget_telemetry
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.972Z
---


# token-budget-telemetry — fleet-wide token-pressure observability

User directive (SYSTEM-VIZ-BRAIN-MS0/U-P4-TOKEN-BUDGET-TELEMETRY): the existing `token-budget-gate.mjs` UserPromptSubmit hook consumed tier state (GREEN/YELLOW/RED/CRITICAL based on transcript-tokens used) but emitted nothing for cross-session analysis. We had 3 dispatcher actions (`context:token_budget_allocate`, `context:token_budget_can_afford`, `dev:token_budget`) and a `/token-budget` skill, but no ledger to answer "which chat hit RED yesterday, was it during a `/forge`?". This unit closes the observability gap.

## Files (shipped commit `97185f094`)

- `.claude/hooks/token-budget-gate.mjs` — added `buildTelemetryRow()` + `recordTelemetry()` + `telemetryDisabled()`, all exported. Hook now appends one JSONL row per fire. Top-level `main()` gated by `__isCLI` (was the bug that hung importers on stdin read during the first test pass).
- `scripts/token-budget-telemetry-dashboard.mjs` — NEW 215 LOC query CLI. 7 pure-function exports + `main()`. Joins `sid` → slot via `chat-slots.json`, emits text/JSON.
- `scripts/token-budget-telemetry-dashboard.test.mjs` — NEW 43 hermetic `node:test` cases, all pass in 529ms.

## Telemetry row schema (v:1)

```json
{"v":1,"ts":"2026-05-15T20:00:00.000Z","sid":"a61bbf34","tier":"RED","percent":22,"used":780000,"heavy":"/forge"}
```

- `sid` is the 8-char prefix of stdin.session_id (UUID prefix — NO `claude-` prefix). Dashboard joins via `chat-slots.json`'s `chatId.slice(7)`.
- `heavy` is from a fixed allowlist (`HEAVY_SKILLS` = 8 skill names). Safe-by-allowlist; no prompt-injection surface.
- `percent` rounded to 1 dec. `used` is integer or null. `tier` falls back to "UNKNOWN" for non-strings.

## Dashboard output

Headline: `fires | distinctSids | slotsWithFires | redFires | criticalFires | heavyOpsNearLimit`.
Per-slot bars: tier histogram `[G:.. Y:.. R:.. C:..]` + NIST nearest-rank `p50`/`p95` + `min` percent-remaining + `heavyNearLimit` count.
Recent RED/CRITICAL list: top-N events sorted ts-desc with slot + tier + percent + heavy.

When ledger doesn't exist yet, the header surfaces `(not yet created — hook will create on first UserPromptSubmit)` so operators can tell "telemetry not wired" from "no activity in window".

## Per-file scrutiny gate verdict (3-file cohesive build)

**Reviewer A (subagent_type=code-analyzer)**: PASS. P1 flagged sid join-shape uncertainty — verified `getSessionId()` returns bare 8-char from UUID, dashboard slices `chatId.slice(7,15)` → same value, join IS correct, documented contract pre-commit. P2 percentile math (p95 off-by-one for small N) — fixed via NIST nearest-rank `Math.ceil(q * n) - 1` clamped. P3 inlined H: root in hook — replaced with `PRISM_ROOT` env. P3 missing schemaVersion — added `v:1`.

**Reviewer B (subagent_type=reviewer, independent)**: PASS. P1 caught the disable-knob stub test that always passed (Karpathy R9 antipattern) — restructured as `telemetryDisabled()` function reading env at call time; replaced stub with real env-flip + ledger-creation-skip test. P1 concurrent-write atomicity undocumented — added contract docblock asserting POSIX O_APPEND + Windows FILE_APPEND_DATA atomicity for <200-byte rows, with `parseLedger` skipping any torn row that slips through. P2 first-run UX (silent empty output for missing ledger) — fixed with `ledgerMissing` header note. P2 convention drift from `ollama-offload-dashboard.mjs` — partially addressed (`--window=` parser, `--text`/`--json` shape); accepted as remaining minor.

## Knobs

- `PRISM_TOKEN_BUDGET_TELEMETRY_PATH` — override ledger path (used by hermetic tests).
- `PRISM_TOKEN_BUDGET_TELEMETRY_DISABLE=1` — no-op the recorder. Read at call time, so subprocess tests work.
- `PRISM_ROOT` — repo root, default `H:/prism`.
- `PRISM_MAX_CONTEXT_TOKENS` — pre-existing override of the 1M cap (unchanged).

## Why a separate dashboard, not a hook surface

The hook is hot-path (UserPromptSubmit, ≤50ms budget). The dashboard is query-only — operators run it from `/checkin §6`-style contexts, never from a hot hook. Keeping them separate means the hook only ever does one `fs.appendFileSync` (<200 bytes); the dashboard does all the join + percentile work at human cadence.

## Related

- [[reference_tribal_by_domain_inject]] — sibling unit, same milestone, same per-file scrutiny pattern + same shared-tree close-out behavior
- [[reference_session_continuity_stack_2026_05_15]] — slot-pinning that makes the sid→slot join load-bearing
- [[reference_blueprint_ocr_training_ms1_collision]] — third-time shared-tree absorption pattern (related ops)
- [[feedback_parallel_scrutiny_per_file]] — gate doctrine
- [[feedback_reflect_all_changes_post_update]] — close-out 4-surface rule
