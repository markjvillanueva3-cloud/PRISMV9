---
schemaVersion: 1.0.0
id: skc-j97aur-2026-06-26
generated: 2026-06-26T08:17:02.038Z
status: candidate
source: HERMES-MS1 / U-HERMES05
---

# SKILL CANDIDATE — `skc-j97aur-2026-06-26`

Observed 57 times across slots [alpha=6, sierra=6, oscar=6, delta=4, india=4, hotel=3, romeo=3, papa=3, zulu=3, mike=2, bravo=2, juliett=2, whiskey=2, golf=2, xray=2, november=1, echo=1, foxtrot=1, tango=1, quebec=1]; dominant kind: **build-heavy** (build-heavy=57); median call count: 6.

## Tool-call signature

```
Bash|Bash|Bash|Bash|Bash|Bash
```

## Proposed trigger keywords

(operator/reviewer fills in — derive from dominant-kind tools + typical slot domains: mike, hotel, delta, romeo, november, alpha, bravo, juliett, whiskey, golf, echo, papa, sierra, foxtrot, tango, zulu, oscar, quebec, india, xray)

## Suggested template

A skill matching this signature should:
1. Read the relevant context (Grep / Read first, per signature shape).
2. Plan with TodoWrite when steps > 3.
3. Execute via the dominant-kind tool family.
4. Verify outcome (test / build / commit).

## Provenance

- First seen: 2026-05-21T20:19:37.943Z
- Last seen: 2026-06-26T04:25:09.290Z
- Source ledger: `state/shared/skill-candidates.jsonl`
- Pipeline: HERMES-MS1 / `scripts/lib/skill-loop-pipeline.mjs`

## Reviewer gate (U-HERMES06)

This stub does NOT ship as a runnable skill until `gateCandidate` returns
`AUTO-PASS` or an operator-marked PASS verdict lands in
`state/shared/skill-loop-verdicts.jsonl`.

## Operator promote instructions (G5 gap-audit 2026-05-20)

AUTO-PASS does NOT publish to `.claude/commands/`. The harness only stages
this spec + an `SKILL-CANDIDATE-AUTOPASS-<id>.md` marker file under
`state/shared/specs/`. To promote to a live skill:

1. Author the real body. Run `/forge-triple` with this cluster's signature
   as the seed, OR hand-edit a draft using the suggested template above.
2. Place the authored `.md` file at `.claude/commands/<chosen-name>.md` with
   real `name:` + `description:` + body. The cluster id is NOT the skill name.
3. Append `{ "id": "skc-j97aur-2026-06-26", "promotedTo": "<chosen-name>" }` to
   `state/shared/skill-loop-verdicts.jsonl` for audit.
4. Optionally delete this candidate spec; the verdict log preserves provenance.
