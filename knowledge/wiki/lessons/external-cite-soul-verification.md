---
title: External-source cites need domain-soul adversarial verification (opus spot-checks miss fabricated ISO numbers)
layer: lessons
tags: [external-knowledge, verification, workflow, domain-soul, fabrication, iso-standards]
created: 2026-07-01
by: claude-zulu (fd497b12)
source-commits: [849d7381c9, bb708763d5]
related: [[hermes-master-orchestrator-ms0-u-master-fleet-plan-and-route]]
---

# External-source cites need domain-soul adversarial verification

## The lesson (one line)

A strong general model's cited "textbook/standard rules" carry **plausible-but-fabricated
standard numbers** that even an opus judgment spot-check misses — only an agent **grounded on the
domain's own corpus** (galaxy lib + in-repo engines + wiki) reliably catches them. Route every
external-knowledge candidate through a domain-soul verify arm before it enters any backlog.

## Evidence (2026-07-01, external-knowledge harness first production pass)

28 externally-generated candidates (nemotron-3-ultra via the Hermes NIM lane) were staged; a
zulu opus spot-check called ~20 "solid". The 10-domain-soul verification Workflow
(`wf_fab1690e-410`, 3 waves, sonnet arms, each soul reading its OWN lib + engines) then
**bounced 16 of 28**, including several the spot-check had passed:

| staged claim | soul finding |
|---|---|
| "MAX tool overhang L/D per **ISO 26622-1** Table 2" | ISO 26622-1 is a cutting-tool **data-exchange** standard (tool XML), not an overhang-limit standard — fabricated/mismatched cite |
| "cutter geometry tolerances per **ISO 6462/6463**" | repo canon for tool-geometry is **ISO 3002** (`math-tool-geometry-cutting-edge.md:12`) — wrong standard |
| "balance grade G2.5 per **ISO 16084**" | dups the in-repo **ISO 1940-1/21940-11** doctrine (`ToolBalancingEngine.ts:11,67-69`); ISO 16084 defines balance *test methods*, not an RPM threshold |
| wedm max wire tension formula | already a fired-gate **superset** (`wire_combined_stress_fatigue` + `live_envelope_monitor`) |
| "kc1.1 lookup per **ISO 3685 / DIN 6580**" | neither standard tabulates kc1.1 (tool-life testing / terminology) — the values are empirical Kienzle/Victor/VDI data |
| "Ra = f²/8r per **ISO 4287 / ASME B46.1**" | those standards define Ra *measurement*, not the predictive formula (that is Boothroyd/Shaw textbook theory); also f²/8r is Rmax, Ra ≈ f²/31.2r |

The souls also **corrected surviving records**: a quoting tooling-cost formula that double-counted
wear (× wear_rate AND ÷ parts_per_tool_life), and an ISO 2768 "class m default" reworded to
"resolve the title block first — m is shop convention, not the standard's mandate."

## The rule

1. External-model output about standards/textbooks is **cite-untrusted by default** — the model
   pattern-matches real standard numbers onto wrong topics (worse than random: it *looks* right).
2. Verification must be **domain-grounded**: the verify arm reads the domain's own lib
   (gates + gaps), greps the in-repo engines, and checks the repo's canonical standard for that
   topic. A generic reviewer without corpus grounding rubber-stamps the same fabrications.
3. The pipeline shape that works: generate (cheap, capped, dedup'd) → stage to a ledger
   (never fires) → **domain-soul Workflow verify** (sonnet arms, waves of 3) → fold survivors
   into `*_UNVERIFIED_GAPS` → domain specialist promotes gap→gate. Two independent gates between
   a model's claim and a firing rule.
   **Stage 5 proven 2026-07-02 (`f98f650ccf`, Workflow `wf_0524c0db-eaa`): corroborated
   promotion.** A second domain-soul pass promotes a gap ONLY when its rule is already in-repo
   canon the arm read that run (enforcing engine / constants.ts / verified doctrine, file:line) —
   so a fired gate only ever surfaces existing canon at the right moment, and `enforcedBy` names
   the corroborating engine. 24/142 promoted (gates 170→194); mill and cad honestly promoted 0
   (their backlogs are bug-reports, not rules). The arms again caught what generic review missed:
   a staged wrong Gilbert exponent form, and a lathe-lib "Okuma CSS = VCSS macro" tribal tip that
   the shipped OkumaB250 engine (real G96/G97/G50 emission) contradicts.
4. Sibling of [[feedback_read_full_content_not_titles]] and the scrutiny "verify-arm VERIFIED
   label is not trustworthy — read the note" lesson: this extends both to *external* knowledge.

## Where the pipeline lives

- Generator/harness: `scripts/external-knowledge-harness.mjs` (+ 16-test suite; weekly schtasks
  cron `PRISM External Knowledge Harness`, SUN 04:17)
- Staging ledger: `state/shared/external-knowledge-candidates.jsonl` (gitignored runtime state;
  statuses: staged-unverified / applied-to-backlog / bounced — bounced rules STAY in-file so
  cross-run dedup never re-stages them)
- Verify workflow pattern: 10 domain-soul agents, 3 waves, `model:'sonnet'`, plain-text
  RECORD/VERDICT/WHY/REWORD blocks (run `wf_fab1690e-410` is the reference)
- Consumers: `scripts/lib/<domain>-approach-knowledge.mjs` `*_UNVERIFIED_GAPS` (10 domains),
  validated by `scripts/six-domain-autofire-coverage.mjs`
