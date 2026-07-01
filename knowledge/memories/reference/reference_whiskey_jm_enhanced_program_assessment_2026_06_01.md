---
name: reference_whiskey_jm_enhanced_program_assessment_2026_06_01
description: "Data-backed answer to 'did we generate proper enhanced JM lathe programs?' — built lathe-program-assessor (8-gotcha PROPER + A/B machining-delta); FLEET-SCALE via multi-agent Workflow (5,341 A/B pairs / 118 customers): 99.0% PROPER (54 ERROR-carrying so gate), 80.6% annotation-passthrough, 19.4% genuinely re-machined (cohort-split: early-alphabet re-machined, BRICO-onward annotation-only = two upgrade runs); dominant defect feed-mode-undeclared fleet-wide, the exact defect PRISM U-CL5/U-CL7 emitters fix by construction. Supersedes the earlier 113-pair '0% improved' sample."
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.256Z
aliases: reference_whiskey_jm_enhanced_program_assessment_2026_06_01
---


# JM enhanced-lathe-program assessment — CLOSED-LOOP-MS0/U-CL1 (slot:whiskey, 2026-06-01)

## ⬆ FLEET-SCALE UPDATE (U-CL-WF, multi-agent Workflow `wf_fbb1a317-df6`, 17 agents) — supersedes the 113-pair sample below

Honoring the operator's repeated **"use workflow"**: fanned out 1 agent per customer batch (each runs the deterministic 8-gotcha A/B assessor on bounded per-customer folders — no 24k-file archive walk inside the workflow), JS-deterministic fleet totals. **5,341 A/B pairs across 118 customers (15/15 batches):**

- **PROPER/safe: 99.0%** (5,287/5,341 lint-clean) — but **54 (1.0%) carry residual ERROR gotchas → GATE, do not run unreviewed** (AKKO 96/100, ARCHER 98/100, CFC 17/19, CHOCTAW 54/56, HI-PERFORMANCE 14/16, ELITE 98/100, AGRATI 59/60…). NOT 100%.
- **Improved vs passthrough: 80.6% annotation-passthrough** (4,307 byte-identical machining), **19.4% genuinely re-machined** (1,034). **This corrects the 113-pair "0% improved" below — sample bias.**
- **Cohort-split improvement:** early-alphabet customers (ACME…BRAINARD RIVET, `passthru=0`) got genuine machining changes; BRICO-onward (~99 customers, `passthru≈pairCount`) got annotation-only ⇒ **two different upgrade runs**. ITW=99% passthrough matches the sample exactly.
- **Dominant defect fleet-wide: `feed-mode-undeclared`** (~110/118 customers) + `feed-mode-mixed`, `partoff-no-peck`, `css-no-rpm-cap` (6 batches). **The one fix = declare G95/G94 + pair every G96 with a G50 cap — exactly what PRISM's U-CL5/U-CL7 emitters bake in by construction**, so PRISM generation is genuinely better than the historical "enhanced" programs on the #1 defect.

Report: `state/shared/specs/WHISKEY-JM-ENHANCED-FLEET-ASSESSMENT-2026-06-01.md`. Caveat: `--limit 100`/customer caps the largest customers, so 5,341 is a representative fleet sample (not the full ~14,475 archive count); rates stable across 118 customers.

---
### Original 113-pair in-session run (below) — kept for provenance; numbers superseded by the fleet workflow above.

**Built** `scripts/lathe-program-assessor.mjs` (+ `.test.mjs`, 11/11 node:test; committed on slot/whiskey) — the deterministic assessment core the goal's "use a workflow to assess all the programs" asks for. It REUSES (R8) `lathe-gcode-lint` (the real 8-gotcha physics/safety scorer) + `lathe-ab-version-locator` (A/B pairing). Three pure fns: `assessProgram` (PROPER = 0 ERROR-severity gotchas), `assessABPair` (machining-delta verdict: `improved`/`regressed`/`mixed`/`changed-neutral`/`annotation-passthrough`), `aggregateAssessment`. Three CLI modes: `--single`, `--scan <root>`, **`--pairs-jsonl <file>`** (assess A/B pairs from a cached scan-jm-die-ab-pairs jsonl WITHOUT re-walking the 14k-file archive — the archive walk + even bounded globs TIME OUT on this host's slow H: drive; individual file reads are fast).

**RAN it on the real cached enhanced (PRISM_UPGRADED) pairs — the data-backed answer to "did we really generate proper programs?":**

| Customer | pairs | B PROPER (0 ERRORs) | annotation-passthrough | verdicts |
|---|---|---|---|---|
| ALCOA | 11 | **100%** | 0% | 11 changed-neutral |
| ACME | 22 | **100%** | 0% | 22 changed-neutral |
| ITW | 80 (of 703) | **100%** | **98.8%** | 79 passthrough, 1 neutral |

- **PROPER (physically/safety valid): YES** — 100% lint-clean of ERROR-severity gotchas across all 113 pairs. The enhanced programs are SAFE.
- **IMPROVED over the originals: NO** — **zero `improved` verdicts anywhere.** Either pure **annotation-passthrough** (ITW 98.8% — B == A machining, only comments differ → strongly confirms the iter261 "annotation pass-through" finding [[reference_iter218_alcoa_outlier_retraction_2026_05_27]]) or **changed-neutral** (ALCOA/ACME — machining changed but fixed/introduced NO gotcha). Customer-level granularity REFINES the blanket iter261 claim: ALCOA/ACME DID change machining (not pure annotation), but the change is physics/safety-neutral.
- **Dominant unaddressed defect = `feed-mode-undeclared`** (74/80 ITW, 15/22 ACME, 10/11 ALCOA): the enhanced programs never declare G95 (IPR) / G94 (IPM) → real IPR/IPM 10× feed-error ambiguity the upgrader should fix but DOESN'T. Secondary: `partoff-no-peck`, `feed-mode-mixed` (3 ACME).

**How to apply (closed-loop next steps):**
1. The upgrader's FIRST genuine-improvement target = **declare feed mode (G95) + address the persistent INFO findings** — currently it adds annotations without fixing the real physics ambiguity.
2. `lathe-program-assessor` IS the closed-loop verification GATE: any regenerated program must score `improved` (or at minimum lint-clean + not regressed) vs its original before it's "proper".
3. Scale: run `--pairs-jsonl` over the other cached per-customer jsonls (`mcp-server/data/ingestion_cache/jm-die-ab-pairs-*-upgraded-only.jsonl` — agrati/acument/sfs/itw-full) for a fleet-wide number; the full ITW set is 703 pairs (only 80 sampled here).
4. Honest scope: 113 of ~14,475 pairs assessed (the readily-cached upgraded-only sets); full-archive scan blocked by slow-H: walk timeout — use the cached jsonls or a faster-FS window.

Build plan + asset map: `state/shared/specs/WHISKEY-CLOSED-LOOP-BUILD-PLAN-2026-05-31.md`. Commits: U-CL1 (assessor+test), U-CL1b (--pairs-jsonl). Remaining goal legs: U-CL2 toolpath templates, U-CL3 tool-inventory-from-order-docs.
