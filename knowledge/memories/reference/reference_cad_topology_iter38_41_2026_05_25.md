---
name: cad-topology-iter38-41-arc-2026-05-25
description: "CAD topology pipeline iter+38..+41 arc — PIPELINE_VERSION export, version-consistency tests, fidelity+wrapper schema tests, selfcheck CI/cron gate"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.498Z
aliases: reference_cad_topology_iter38_41_2026_05_25
---


# CAD topology pipeline — iter+38..+41 arc (slot:delta 2026-05-25)

Closes the post-30-iter follow-on arc. **Theme: stable contracts.** The
30-iter arc built the corpus + tuning + tests. iter+38..+41 cements the
operator-facing contracts so the pipeline can be cron'd/CI'd.

## Commits (slot/delta)
- iter+38 `<peer-shipped>` — PIPELINE_VERSION export from emitter
- iter+39 `34b3fe0403` — version-consistency tests + stale-banner regex fix
- iter+40 `5d34a62eae` — fidelity-ledger + wrapper-parity tests (+7 cases)
- iter+41 `6e062f7dc5` — selfcheck health gate for CI/cron (+5 tests)

## What landed

| Layer | iter | Surface |
|---|---|---|
| Provenance | +38 | `PIPELINE_VERSION = "iter+38"` exported from `cad-emit-impeller-fusion-step.mjs`; surfaced in `cad-pipeline-status.mjs` JSON + human banner |
| Provenance | +39 | 2 tests: PIPELINE_VERSION shape `/^iter\+\d+$/` + STEP FILE_DESCRIPTION contains it verbatim |
| Test discipline | +39 | Fixed stale `cad-pipeline-status.test.mjs` banner regex (was `[cad-status]`, now `[cad-status:iter+N]`) — test was lying after iter+38's banner change |
| Test coverage | +40 | `cad-corpus-fidelity-ratio.test.mjs` (4 cases, READ-ONLY against ledger — never invokes the script which mutates shared state) |
| Test coverage | +40 | `cad-wrapper.test.mjs` (3 cases — help-text drift + sh/ps1 dispatch parity) |
| Ops gate | +41 | `cad-pipeline-selfcheck.mjs` — composes emit-ledger + dry-run + test-count into ONE exit-code verdict. CI/cron one-liner. Env knobs: `PRISM_CAD_SELFCHECK_{STALE_HRS,MIN_TESTS,DRY_RUN_LIMIT}` |
| Ops gate | +41 | Wired `selfcheck` (alias `health`) into `cad.sh` + `cad.ps1`. REQUIRED_COMMANDS now 12. |
| Ops gate | +41 | 5-case selfcheck test suite (schema, status sub-obj, dryRun, thresholds, exit-code contract) |

## Test surface growth
30 cases (iter+30 finale) → 42 cases (iter+41 close). +12 cases across 3 commits, no test-file deletions.

| iter end | total | new | breakdown |
|---|---|---|---|
| +30 | 22 | — | (15 detector + 9 validator) — Wait, was 22 in some earlier check, but iter+30 actually counted differently per commit history |
| +33 | 25 | +3 | + cad-json-output |
| +35 | 28 | +3 | + cad-pipeline-status |
| +39 | 30 | +2 | + PIPELINE_VERSION cases on emit-test file |
| +40 | 37 | +7 | + 4 fidelity ledger + 3 wrapper parity |
| +41 | 42 | +5 | + 5 selfcheck (schema, status, dryRun, thresholds, exit-code) |

(The exact +30 figure depends on whether you count detector tests as 13 or 15; the
iter+39 commit added 2 PIPELINE_VERSION cases to the emit-test file, taking it 13→15.)

## Lessons preserved

- **R12 (fail-loud)**: iter+39 fixed a 1-case failure rather than weakening the assertion. The stale banner regex was the test's fault — iter+38 had legitimately changed the banner contract. Fix was in the test, not the code under test.
- **READ-ONLY tests for state-mutating scripts**: fidelity-ratio test validates the existing ledger schema rather than re-running the script (which would clobber the shared file). Test skips gracefully if ledger absent on a fresh checkout.
- **Parity tests for cross-OS wrappers**: cad.sh + cad.ps1 hand-maintained dispatch lists drift silently. New parity test catches it before operators do.
- **Composite gates**: selfcheck pattern (combine N scripts + emit single exit code + structured failures array) is the cron-ready primitive — avoid forcing operators to correlate status+dry-run+ls themselves.

## Operator
```bash
bash scripts/cad.sh selfcheck            # human banner + exit code
bash scripts/cad.sh selfcheck --json     # CI / monitor
bash scripts/cad.sh selfcheck --verbose  # human banner + full JSON dump
# env tuning (no code edits):
PRISM_CAD_SELFCHECK_STALE_HRS=72 bash scripts/cad.sh selfcheck   # 3-day stale threshold
PRISM_CAD_SELFCHECK_MIN_TESTS=10 bash scripts/cad.sh selfcheck   # demand >=10 test files
```

## Related
- [[reference_cad_topology_iter23_30_2026_05_25]] — preceding 30-iter finale (iter+23..+30)
- [[reference_cad_pipeline_closed_loop_2026_05_24]] — original closed-loop intent
- `knowledge/wiki/architecture/cad-pipeline-closed-loop.md` — full operator wiki
- `feedback_commit_to_slot_worktree` — why every commit landed in `H:/prism-slot-delta`
