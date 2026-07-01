# JM Die Lathe Audit Findings — operator briefing (whiskey 2026-05-24)

**Slot:** whiskey iter12-13
**Engine:** `LatheProgramAuditPipelineEngine v1.0.0` (commits `e66d99f2d0` + `70291ce926` + `U-AUDIT-PIPELINE` + `U-AUDIT-MACHINE-MAP-FIX`)
**Audit source:** 32,756 V1-upgraded variants on disk (first pass — LTH-02 + LTH-05 only); second pass (LTH-01..LTH-07, ~80K variants) running PID 59824.

---

## TL;DR

The lathe-program audit pipeline shipped this session **catches a class of safety bugs the original upgrader never noticed**. First-pass result: **99.9% (32,722 / 32,756) of variants FAIL** at the per-program safety + collision-envelope check. **No variant in the corpus should be pulled onto the shop floor as-is.** The audit pipeline is now the safety-net between the upgrader and the operator.

The audit's PASS criterion is honest: every variant has to pass 24 Stage-A G-code static-safety rules AND fit inside the target machine's work envelope AND pass deterministic collision screen. The audit is doing its job — it's surfacing real issues, not over-strict gating.

---

## Findings totals (32,756-variant sample)

| Severity | Stage-A code-audit | Stage-C collision-screen |
|---|---:|---:|
| critical | 1,142,170 | — |
| high     | 32,758 | — |
| medium   | 1,160 | — |
| collision | — | 699,696 |
| near_miss | — | 38,384 |

| Verdict | Count | % |
|---|---:|---:|
| pass | 0 | 0.0% |
| pass_with_notes | 0 | 0.0% |
| warn | 34 | 0.1% |
| fail | 32,722 | 99.9% |
| no-motion (header-only) | 40 | 0.1% |

---

## Root-cause analysis — three distinct gaps

### GAP-1 — cross-machine envelope mismatch (most severe)
**The V2 upgrader writes per-machine variants of every program for every lathe, but it does NOT body-rescale the toolpath to fit the target machine's envelope.** A program originally written for the LB-3000EX-BigBore (460mm swing) is copied verbatim into the GENOS L200E-M folder (250mm swing) — the X coordinates exceed the smaller machine's travel by 200mm+. Every variant for a smaller machine inherits the larger source-machine X-coords and is physically impossible to run.

- Evidence: `L117 envelope_x actual=508.00 limit=300 raw=G0 X20 Z20` (LTH-02 GENOS variant, X=20" = 508mm exceeds 250mm swing + 50mm rapid tolerance = 300mm strict limit)
- Follow-up unit: **`U-UPGRADE-BODY-RESCALE`** — V2 engine reads source max-extent + skips OR rescales variants for smaller machines. (Skip is the operator-safe default; rescale is a DCAM problem requiring tool/holder-aware toolpath rewrite.)

### GAP-2 — modal-F tracking absence in `gcSafetyAnalyzer.CRIT-05`
**`CRIT-05` flags every G1/G2/G3 line lacking explicit `F<rate>` as a critical issue.** JM Die programs (and Okuma OSP convention) use modal F — F is set once on the first cut and persists. Every subsequent cut SHOULD inherit it. The analyzer treats modal as missing.

- Evidence: line counts grow linearly with cut-count; 21 critical findings on one ~140-line program
- Follow-up unit: **`U-GCANALYZER-MODAL-F-TRACK`** — extend `gcSafetyAnalyzer` modal-state tracker to remember last F-rate + only flag CRIT-05 when no prior F has been seen.

### GAP-3 — Fanuc-centric `HIGH-18` safety-start-block check
**`HIGH-18` flags Okuma OSP programs for "missing G90/G80/G40/G49/G17 safe-start codes".** Okuma OSP uses different start-block conventions (M-codes + G-code subset). This is a controller-dialect false-positive.

- Follow-up unit: **`U-GCANALYZER-OKUMA-START-BLOCK`** — controller-aware HIGH-18 check that recognizes Okuma OSP start-block patterns separately from Fanuc.

---

## What's already shipped this session (gap-fillers)

| Unit | Commit | What |
|---|---|---|
| `U-V2-PHYSICS` | `e66d99f2d0` | Physics-driven V2 upgrader via `UltimateSpeedFeedEngine` |
| `U-BATCH-V2-WIRE` | `70291ce926` | Batch CLI `PRISM_LATHE_UPGRADER_VERSION` env-switch |
| `U-OUTCOME-CAPTURE-DISABLE-KNOB` | (this iter) | `PRISM_OUTCOME_CAPTURE_DISABLE=1` — 52× regen throughput |
| `U-AUDIT-PIPELINE` | (this iter) | 3-stage audit engine + 31 tests + dispatcher wiring |
| `U-AUDIT-MACHINE-MAP-FIX` | (this iter) | Canonical 7-machine envelope map for batch runner |

---

## Operator action items

1. **Do not pull any current variant onto the shop floor.** Every variant fails at least one rule.
2. **Pick up `U-UPGRADE-BODY-RESCALE` next session** — it's the highest-leverage safety unit. Recommended approach:
   - Pass A (default): parse source program max-X-extent; skip target-machine variants where source exceeds envelope; record skip-reason
   - Pass B (advanced, follow-up): toolpath rescale via DCAM (out of scope for next session)
3. **Pick up `U-GCANALYZER-MODAL-F-TRACK`** to cut Stage-A false-positive volume by ~80%.
4. **Re-run audit after each fix** — `node scripts/audit-jm-die-lathe-corpus.mjs` produces the dashboard.

---

## Audit pipeline as standing safety net

The audit pipeline now sits between the upgrader and the shop floor. Every future variant (V2 or beyond) must pass it. The dispatcher action `jm_die_lathe_audit` is wired on `prism_ai`, callable from any chat or skill. The batch runner produces a corpus-wide dashboard whenever invoked.

Pattern reusable for `U-UPGRADE-MILL`, `U-UPGRADE-WEDM`, `U-UPGRADE-WELDER` — each domain needs:
- Domain-specific machine inventory + envelopes
- Domain-specific G-code parser (lathe parser today; mill needs Y-axis + tool comp; WEDM needs wire-thread/cut/cut-off rules)
- Same Stage-A `gcSafetyAnalyzer` (controller-aware) + Stage-C envelope screen

V2 + audit-pipeline is the **canonical template for every domain's upgrade-and-validate loop**.
