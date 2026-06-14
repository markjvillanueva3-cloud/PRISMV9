---
name: cad-topology-iter42-46-arc-2026-05-25
description: "CAD topology pipeline iter+42..+46 arc — corpus print-compare runner, selfcheck v2 (print-compare arm), full test coverage of operator scripts"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.043Z
aliases: reference_cad_topology_iter42_46_2026_05_25
---


# CAD topology pipeline — iter+42..+46 arc (slot:delta 2026-05-25)

Continues the post-30-iter "stable contracts" theme from iter+38..+41
([[cad-topology-iter38-41-arc-2026-05-25]]). This arc **closes the
corpus-aggregate gap** on print-compare AND **achieves full pure-fn
test coverage** of every operator-facing CAD script.

## Commits (slot/delta)
- iter+42 `08b7e70552` — degraded-path test for selfcheck + doc reflection
- iter+43 `0bc8bad595` — print-compare exports + 18-case tests + 5-case dim-report tests
- iter+44 `a1f09fadc5` — corpus-print-compare runner + ledger schema test + wrappers
- iter+45 `0a49cffb45` — selfcheck v2 print-compare arm
- iter+46 `31b0ef7769` — compare-html-viewer + step-to-print exports + 21 cases

## What landed

| Layer | iter | Surface |
|---|---|---|
| Test (selfcheck) | +42 | degraded-path forced via `PRISM_CAD_SELFCHECK_MIN_TESTS=9999` — confirms exit=1 + failure-list non-empty branch works |
| Pure exports | +43 | `cad-print-compare.mjs` exports `iso2768_mk_tol`, `scoreDim`, `comparePrints`, `pctDelta`, `absDelta` + `fileURLToPath` CLI/import guard |
| Tests | +43 | `cad-print-compare.test.mjs` 18 cases (tolerance bands, scoring, full-compose); `cad-regen-dimension-report.test.mjs` 5 cases (READ-ONLY ledger schema) |
| Runner | +44 | `cad-corpus-print-compare.mjs` — sweeps paired prints, emits `CAD-CORPUS-PRINT-COMPARE.json` with mean/median/p25/p75/distribution/passRate |
| Wrapper | +44 | `cad.sh` + `cad.ps1` add `print-compare` + `corpus-print-compare` subcommands; REQUIRED_COMMANDS 12 → 14 |
| Tests | +44 | `cad-corpus-print-compare.test.mjs` 6-case schema test + 4 algebraic invariants (p25≤median≤p75, bucket-sum==scored, passCount≤scored, passRate∈[0,100]) |
| Selfcheck v2 | +45 | Schema v1 → v2: adds `printCompare:{present, scored, passRate, passThreshold, ledgerAgeHours}` sub-object |
| Selfcheck v2 | +45 | 3 new failure rules: passRate<MIN_PASS_RATE / ledger stale / required-but-missing. Soft default: missing ledger doesn't false-positive on fresh checkout |
| Selfcheck v2 | +45 | 3 new env knobs: `PRISM_CAD_SELFCHECK_{MIN_PASS_RATE,PC_STALE_HRS,REQUIRE_PC}` |
| Pure exports | +46 | `cad-compare-html-viewer.mjs` exports `emitCompareHTML` + CLI guard |
| Pure exports | +46 | `cad-step-to-print.mjs` exports `project`, `bbox2` + CLI guard |
| Tests | +46 | `cad-compare-html-viewer.test.mjs` 9 cases (HTML5 shell, verdict CSS classes, slug/score headline, fallback ‐ on null) |
| Tests | +46 | `cad-step-to-print.test.mjs` 12 cases (axis-drop semantics, bbox bounds, cube + rect-prism composition) |

## Test surface growth (iter+30 baseline → +46 finale)

| iter end | total | new | cumulative breakdown |
|---|---|---|---|
| +30 | 22 | — | 13 detector + 9 validator |
| +33 | 25 | +3 | + cad-json-output |
| +35 | 28 | +3 | + cad-pipeline-status |
| +39 | 30 | +2 | + 2 PIPELINE_VERSION cases on emit test |
| +40 | 37 | +7 | + 4 fidelity ledger + 3 wrapper parity |
| +41 | 42 | +5 | + 5 selfcheck (schema, status, dryRun, thresholds, exit-code) |
| +42 | 43 | +1 | + selfcheck degraded path |
| +43 | 66 | +23 | + 18 print-compare pure-fn + 5 dim-report ledger |
| +44 | 72 | +6 | + 6 corpus print-compare ledger |
| +45 | 76 | +4 | + 4 selfcheck v2 |
| +46 | **97** | +21 | + 9 compare-html-viewer + 12 step-to-print |

**Net iter+38..+46: 22 → 97 (+75 cases, +341% growth).** Every operator-facing script in `scripts/cad-*.mjs` has pure-fn test coverage. Pure-fn pattern: `export {fn}` + `if (process.argv[1] === fileURLToPath(import.meta.url)) main();`.

## Architectural patterns preserved

1. **CLI/import guard** — `import { fileURLToPath } from "node:url"; if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) main();` — Windows + POSIX safe. URL-string compare broke main() on Windows the first time it was tried (iter+43 fix).
2. **READ-ONLY ledger tests** — never invoke runners that mutate shared ledger files. Tests skip gracefully if ledger absent (fresh checkout). Pattern shared by fidelity-ratio test, dim-report test, corpus-print-compare test.
3. **Composite gate design** — selfcheck folds N upstream signals into one exit code + structured failure list. Each rule is independently togglable via env knobs. Soft-default for new arms prevents false-positives on fresh checkouts.
4. **Schema versioning at boundaries** — selfcheck JSON output went v1 → v2 in iter+45 with explicit `schemaVersion: 2` field; tests assert exact version + new sub-object presence.

## Operator
```bash
bash scripts/cad.sh selfcheck                          # composite gate
bash scripts/cad.sh corpus-print-compare               # corpus passRate
bash scripts/cad.sh print-compare src.json regen.json  # single-pair
PRISM_CAD_SELFCHECK_MIN_PASS_RATE=90 bash scripts/cad.sh selfcheck  # strict
PRISM_CAD_SELFCHECK_REQUIRE_PC=1   bash scripts/cad.sh selfcheck    # CI mode
```

## Related
- [[cad-topology-iter38-41-arc-2026-05-25]] — preceding 4-iter arc (PIPELINE_VERSION + selfcheck v1)
- [[reference_cad_topology_iter23_30_2026_05_25]] — 30-iter finale before this
- [[reference_cad_pipeline_closed_loop_2026_05_24]] — original closed-loop intent
- `knowledge/wiki/architecture/cad-pipeline-closed-loop.md` — operator wiki
- `feedback_commit_to_slot_worktree` — all commits land in `H:/prism-slot-delta`
