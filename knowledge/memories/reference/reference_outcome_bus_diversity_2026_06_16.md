---
name: reference_outcome_bus_diversity_2026_06_16
description: "India shipped the outcome-bus diversity audit substrate (slot:india 2026-06-16): scripts/outcome-bus-diversity-audit.mjs + .test.mjs (14/14). LIVE measurement of state/shared/outcome-bus.jsonl (78,999 rows / 42MB): dominant source outcome-bus-auto-tap = 99.97% [Wilson 95% CI 99.95-99.98] -- MONOCULTURE rigorously confirmed; normalized Shannon entropy 0.0027 (~ 0); 3 distinct sources / 25 slots / 26 domains; 1 malformed line surfaced (no silent drop). Persisted at state/shared/specs/OUTCOME-BUS-DIVERSITY-2026-06-16.json. R12 india discipline encoded in code: refuse-gate on n<200, Wilson-CI-lower-bound monoculture detection (not point estimate -> no false positives on real-world wobble at the floor), --strict CI gate exit 1 on monoculture (live-validated: exit=1 on the production bus). The Phase-C-3 'outcome-bus is a 99.97% monoculture' shell finding is now a REPRODUCIBLE statistically-rigorous gating diagnostic that any chat can re-run + cite. Closes #24's MEASUREMENT axis; #24's REMEDIATION (driving xproc_outcome_publish across 19 consumer galaxies) remains cross-galaxy L work that this tool now enables consumers to gate against."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.718Z
aliases: reference_outcome_bus_diversity_2026_06_16
---


# Outcome-bus diversity audit substrate + live monoculture measurement (slot:india 2026-06-16)

## What shipped
`scripts/outcome-bus-diversity-audit.mjs` (+ `.test.mjs` 14/14) -- a pure, tested audit over `state/shared/outcome-bus.jsonl`. Per-source / per-slot / per-domain histograms, Wilson 95% CIs on the dominant emitter, normalized Shannon entropies. Pure read; zero peer-claim risk; commit `<TBD>` on cad-fusion-live-ms0.

## The LIVE result (the substantive Phase-C-3 follow-up)
Run against `state/shared/outcome-bus.jsonl` (42MB / 78,999 rows, captured 2026-06-16):
- **dominant: `outcome-bus-auto-tap` 99.97% share** [Wilson 95% CI 99.95-99.98]
- distinctSources=3, distinctSlots=25, distinctDomains=26
- **sourceShannonNormalized=0.0027** (the math definition of monoculture; 0 = monoculture, 1 = uniform)
- slotShannon=0.88, domainShannon=0.89 -- *slot/domain diversity is fine* (because auto-tap fans out across them); SOURCE diversity is the broken axis
- malformedLines=1 (bus corruption surfaced, NOT silently dropped)
- `healthy=false`, `monoculture=true`; persisted at `state/shared/specs/OUTCOME-BUS-DIVERSITY-2026-06-16.json`
- `--strict` exit=1 (CI gate fires correctly)

The Phase-C-3 ledger framing is now confirmed with statistical rigor: the bus has VOLUME but not DIVERSITY -- 99.97% of every "compounding loop" signal is one auto-tap source, so the loop has effectively ONE labeled emitter. **Volume is not the lever; per-galaxy emission diversity is.**

## India discipline encoded in code (R12)
- **REFUSE-GATE `n < MIN_MEANINGFUL_N=200`**: refuses to report a diversity score on a small sample (binomial CI half-width too wide to be meaningful at small n). Same pattern as the conformal audit's n>=20 gate -- never a softened metric.
- **Wilson CI lower bound, NOT point estimate, gates monoculture**: a borderline 95% share on n=200 has CI ~[91, 97], so it's correctly NOT flagged as monoculture (real-world wobble does not produce a false-positive). The current bus at 99.97% trivially clears even the lower bound.
- **`--strict` CI gate fails closed on monoculture** (exit 1) -- regression-pinned via a `child_process.spawnSync` test that fixtures a known-monoculture bus and asserts `r.status === 1` (in-process tests can't reach the exit branch).
- **Malformed-line tracking**: a bus row that fails JSON.parse is COUNTED, not silently dropped -- the live run reports `malformed=1` so corruption surfaces.

## R8 wiring (no reinvention)
Pure read over the existing bus JSONL; no new schema; no engine to maintain; helpers (`wilsonCi`, `normalizedShannon`, `tallyField`, `topN`, `parseOutcomeBusJsonl`) are exported so consumers can compose audits without re-importing the CLI.

## Scope (R12 honest)
This is the **measurement** axis of #24. The **remediation** axis -- wiring `xproc_outcome_publish` across 19 consumer galaxies -- is cross-galaxy L (touches peer-owned files; 3 peers online, 9 foreign claims at write time) and remains a coordinated push. What this tool gives the fleet: a reproducible PROOF of the gap, a gating diagnostic any consumer can wire into CI, and a baseline measurement that every future emission round can be scored against.

## Verify
- `cd /h/prism && node --test scripts/outcome-bus-diversity-audit.test.mjs` -> 14/14.
- `node scripts/outcome-bus-diversity-audit.mjs` -> healthy=false MONOCULTURE on the live bus, non-strict exit 0.
- `node scripts/outcome-bus-diversity-audit.mjs --strict` -> exit 1 (CI gate).

ledger: `INDIA-REMAINING-WORK-LEDGER-2026-06-15.md` #24 MEASUREMENT axis. [[reference_conformal_audit_tool_2026_06_16]] · [[reference_cmccl_ledger_reland_2026_06_15]]
