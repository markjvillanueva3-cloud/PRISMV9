---
title: Bug-Hunting Resource Atlas
galaxy: bug-hunting
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas-meta (2026-06-10)"
verification_method: "Local PRISM paths confirmed via Glob/ls against the live tree; every online URL WebFetch-confirmed to resolve AND match its described resource on 2026-06-10. Unverified/hallucinated seeds were dropped, not listed."
tags: [bug-hunting, fuzzing, property-testing, differential-testing, combinatorial-testing, regression, resource-atlas, golf, uniform]
---

# Bug-Hunting Resource Atlas

> **The where-to-REACH index** for the bug-hunting meta/infra galaxy (software testing · fuzzing · differential testing · regression · hostile-payload classes). This hub links the **local PRISM code/store trove** to the **canonical free online sources** (the authoritative tool repo, the seminal free paper/standard) so a chat jumps STRAIGHT to ground truth instead of re-deriving or guessing a URL.
>
> Distinct from the sibling layers: this atlas is the **reach** index (canonical repo/paper/standard + local code). For the **learn** curriculum (ordered courses/readings) see [[bug-hunting-source-atlas]]; for the concept layer see [[bug-hunting-foundations]].
>
> **R12 / safety:** this atlas promotes NO numeric threshold, coverage bar, or constant. Every quantitative gate (deploy AUROC/F1/Brier, S(x) hard-block, coverage minima, scrutiny consensus count) stays owner-gated to **golf** and to `mcp-server/src/physics/constants.ts`. Atlas links the *method/source*; the *numbers* live behind the owner-gate (see bottom).

---

## 1. Local code + stores (PRISM's own trove — verified paths)

The galaxy's own engine directory and the audit/scan infrastructure that surfaces silent bugs. These are the first stop — reach internal before reaching external.

### Galaxy engine directory
- `mcp-server/src/engines/bug-hunting/` — the bug-hunting galaxy root. Carries its own [`CLAUDE.md`](../../../mcp-server/src/engines/bug-hunting/CLAUDE.md) (10-class bug catalog + anti-patterns + Karpathy 5-step for bug work), [`PATHS.md`](../../../mcp-server/src/engines/bug-hunting/PATHS.md) (name-matched engines + cited paths), [`TOOLBELT.md`](../../../mcp-server/src/engines/bug-hunting/TOOLBELT.md), and [`MEMORY.md`](../../../mcp-server/src/engines/bug-hunting/MEMORY.md).

### Vitest suites (the test substrate uniform/golf audits + mutates)
- `mcp-server/src/__tests__/` — the canonical test directory (`stop_on_unwired_assets.mjs` scans ONLY this dir; `src/engines/__tests__/` is NOT scanned).
- `mcp-server/vitest.config.ts` — the vitest runner config. Run: `npx vitest run [file]` (RTK-prefix for compact output: `rtk vitest run`).
- `mcp-server/src/__tests__/regression/` — the regression-test home. Doctrine: every bug found gets a failing-test-before-fix that lives here (test-first or it's not closed).

### CIMCO-bridge parity (differential-testing exemplar inside PRISM)
- `mcp-server/src/__tests__/CimcoVerificationBridgeEngine.test.ts` — the CIMCO verification-bridge parity suite (a *differential test*: PRISM's own emission compared against the CIMCO reference path; divergence is the bug signal).
- `mcp-server/src/__tests__/dataDispatcher.cimco-export.test.ts` — the CIMCO export round-trip through the dispatcher.
- Lesson capture for the fail-OPEN parity divergence: [`knowledge/wiki/code-tribal/learnings/cimco-integration-ms0-u-cimco-bridge-parity-fix.md`](../code-tribal/learnings/cimco-integration-ms0-u-cimco-bridge-parity-fix.md) · memory `reference_post_ship_cimco-integration-ms0-u-cimco-bridge-parity-fix`.

### Audit + scan scripts (silent-bug surfacing infrastructure)
- `scripts/audit-roadmap-drift.mjs` — envelope-vs-git-reality ("did we ship what we claimed?").
- `scripts/audit-close-out-candidates.mjs` — shipped-but-pending (silent-debt class).
- `scripts/audit-unwired-engines.mjs` — table-driven `ACTION_MAP` (catches enum-without-handler ghosts + the wired-via-engine pass).
- `scripts/declared-vs-actual.mjs` — declared-but-not-configured / configured-but-not-declared (dormancy class).
- `scripts/hook-fire-rate-audit.mjs` — wired-but-silent hooks.
- `scripts/scrutiny-3way.mjs` — the 3-arm Stop-gate driver (also a strong manual reviewer-dispatch tool).

### Regression / pattern engines
- `mcp-server/src/engines/RegressionHunterEngine.ts` — diff-driven regression search.
- `mcp-server/src/engines/AntiRegressionGateEngine.ts` — "new count ≥ old count" invariant for every list.
- `mcp-server/src/engines/ErrorPatternLearningEngine.ts` — learns from prior failures.

---

## 2. Canonical repos + papers + standards (verified online — free + legal)

> Every URL below was WebFetch-confirmed on 2026-06-10 to resolve AND match its description. Unverified seeds were dropped.

### Fuzzing (continuous + coverage-guided)
- **Google OSS-Fuzz** — `https://github.com/google/oss-fuzz` — the continuous fuzzing *service* for open-source software; combines modern fuzzing with scalable distributed execution (the canonical "fuzz at scale" reference). The model PRISM's audit-loop infrastructure mirrors at the codebase level.
- **AFL++ (AFLplusplus)** — `https://github.com/AFLplusplus/AFLplusplus` — the maintained, community-patched superset of AFL: collision-free coverage, laf-intel & redqueen, MOpt mutators, qemu/unicorn modes. The canonical mutation-based coverage-guided fuzzer repo. (AGPL-3.0 — tool is free/legal to study + run; license matters only if redistributing.)
- **LLVM libFuzzer** — `https://llvm.org/docs/LibFuzzer.html` — official LLVM docs for the *in-process*, coverage-guided fuzzing engine (link against the lib-under-test, feed fuzzed inputs via a fuzz entrypoint). The canonical reference for writing a single-process fuzz harness — directly applicable to harnessing a PRISM engine's parse/extract surface.

### Property-based testing (generate + shrink)
- **Hypothesis** — `https://hypothesis.readthedocs.io/en/latest/` — the property-based testing library for Python: auto-explores input ranges incl. edge cases and shrinks a failure to a minimal reproducer. The canonical PBT reference for the "weak-assertion class" antidote (assert a *property* over generated inputs, not a hand-picked value).
- **proptest (Rust)** — `https://github.com/proptest-rs/proptest` — Hypothesis-style property testing for Rust with automatic input generation + failure shrinking. The Rust-side canonical for the same discipline (relevant to the RTK/Rust tooling lane).

### Combinatorial / pairwise testing (standard)
- **NIST ACTS — Combinatorial Methods for Trust and Assurance** — `https://csrc.nist.gov/projects/automated-combinatorial-testing-for-software` — NIST's project page for Automated Combinatorial Testing for Software, including the freely available **NIST SP 800-142 "Practical Combinatorial Testing"** tutorial. The canonical *standard + free reference* for covering the input-interaction space efficiently (t-way coverage) instead of exhaustive enumeration — directly applicable to the "hostile-payload" and "edge-combination" bug classes.

### Software construction + testing reading (free university source)
- **MIT 6.031 Software Construction** — `https://web.mit.edu/6.031/www/` — MIT's freely accessible course; "Reading 03: Testing" covers test-first programming, partitioning, and coverage. The canonical free *reading* for the testing discipline this galaxy enforces (test-first-or-not-closed). (Also surfaced in the learn-layer [[bug-hunting-source-atlas]] — here it is the reach-link to the authoritative reading.)

---

## 3. Curated video

> No bug-hunting video source was WebFetch-verified to a stable, free, canonical URL in this pass. Rather than list an unverified link (R12), this section is intentionally empty. A future enrich pass may add a verified conference talk (e.g., an OSS-Fuzz / fuzzing-101 session) once the exact URL is confirmed to resolve. See keep-fresh cadence below.

---

## 4. Cross-links (sibling wiki layers)

- [[bug-hunting-foundations]] — concept layer: what each bug class *is* and why it matters.
- [[bug-hunting-source-atlas]] — the where-to-LEARN curriculum (ordered courses/readings).
- [[bug-hunting-applied-practice]] — hands-on procedures for running the audits + writing regression tests.
- [[bug-hunting-advanced-techniques]] — mutation testing, differential testing, adversarial input generation.
- [[prism-methodology-foundations]] — the fleet-wide methodology spine (R5–R15, scrutiny gate, fail-loud discipline) this galaxy operationalizes.

---

## 5. Keep-fresh cadence

- **On any new canonical tool/paper/standard** a bug-hunt session reaches for → WebFetch-verify the URL, then add it here (drop on 404/redirect-away/mismatch — never list an unverified link).
- **On a dropped/dead link** → remove it the same session it is found dead; note the drop in the verification_method line.
- **Quarterly (or on operator nudge)** → re-WebFetch every URL in §2; bump `verified_by` date. Stale-link rot is itself a bug class this galaxy refuses to tolerate.
- **Local paths** → re-confirm via Glob if a referenced script/engine/test is renamed or moved (the audit scripts in §1 will themselves flag a dangling reference).
- Online curation work is Ollama-eligible (summarize a repo README / classify a candidate's relevance) per the galaxy CLAUDE.md offload table; the *verify-it-resolves* step and the listing decision stay Claude-owned.

---

## Owner-gate (NOT promoted)

The following stay owner-gated to **golf** + `mcp-server/src/physics/constants.ts` and are deliberately ABSENT from this atlas (R12 — link the method, never the number):

- Deploy/quality gates (e.g. GNN deploy AUROC / macro-F1 / Brier minima) — owner-verified data only.
- Scrutiny consensus count and auto-pass escape-hatch thresholds.
- Coverage minima / mutation-score bars for "closed" bug-hunt sessions.
- S(x) safety hard-block value and any physics constant (kc1.1 ISO map, Taylor C/n, etc.).
- Fuzzing campaign budgets (timeouts, iteration counts, corpus-size caps).

A chat needing one of these reads the constant from its canonical home or asks golf — it is never copied into a wiki page.

## Sources

Local (verified against the live tree 2026-06-10 via Glob/ls):
- `mcp-server/src/engines/bug-hunting/` (+ CLAUDE.md, PATHS.md, TOOLBELT.md, MEMORY.md)
- `mcp-server/src/__tests__/` · `mcp-server/vitest.config.ts` · `mcp-server/src/__tests__/regression/`
- `mcp-server/src/__tests__/CimcoVerificationBridgeEngine.test.ts` · `mcp-server/src/__tests__/dataDispatcher.cimco-export.test.ts`
- `scripts/{audit-roadmap-drift,audit-close-out-candidates,audit-unwired-engines,declared-vs-actual,hook-fire-rate-audit,scrutiny-3way}.mjs`
- `mcp-server/src/engines/{RegressionHunterEngine,AntiRegressionGateEngine,ErrorPatternLearningEngine}.ts`

Online (each WebFetch-confirmed to resolve AND match on 2026-06-10):
- https://github.com/google/oss-fuzz — Google OSS-Fuzz continuous fuzzing service
- https://github.com/AFLplusplus/AFLplusplus — AFL++ coverage-guided fuzzer
- https://llvm.org/docs/LibFuzzer.html — LLVM libFuzzer in-process fuzzing engine
- https://hypothesis.readthedocs.io/en/latest/ — Hypothesis property-based testing (Python)
- https://github.com/proptest-rs/proptest — proptest property testing (Rust)
- https://csrc.nist.gov/projects/automated-combinatorial-testing-for-software — NIST ACTS / SP 800-142
- https://web.mit.edu/6.031/www/ — MIT 6.031 Software Construction (Reading 03: Testing)
