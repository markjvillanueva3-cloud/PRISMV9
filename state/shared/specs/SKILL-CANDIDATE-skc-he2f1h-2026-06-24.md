---
schemaVersion: 1.0.0
id: skc-he2f1h-2026-06-24
generated: 2026-06-25T08:17:01.780Z
status: candidate
source: HERMES-MS1 / U-HERMES05
---

# SKILL CANDIDATE — `skc-he2f1h-2026-06-24`

Observed 40 times across slots [alpha=11, charlie=4, romeo=4, sierra=2, november=2, hotel=2, juliett=2, delta=2, india=1, lima=1, echo=1, whiskey=1, mike=1, oscar=1, xray=1, tango=1, zulu=1]; dominant kind: **build-heavy** (build-heavy=40); median call count: 4.

## Tool-call signature

```
Edit|Bash|Bash|Bash
```

## Proposed trigger keywords

(operator/reviewer fills in — derive from dominant-kind tools + typical slot domains: alpha, sierra, charlie, india, lima, romeo, november, hotel, echo, juliett, whiskey, mike, oscar, xray, tango, delta, zulu)

## Suggested template

A skill matching this signature should:
1. Read the relevant context (Grep / Read first, per signature shape).
2. Plan with TodoWrite when steps > 3.
3. Execute via the dominant-kind tool family.
4. Verify outcome (test / build / commit).

## Provenance

- First seen: 2026-05-23T00:06:53.179Z
- Last seen: 2026-06-24T18:15:57.056Z
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
3. Append `{ "id": "skc-he2f1h-2026-06-24", "promotedTo": "<chosen-name>" }` to
   `state/shared/skill-loop-verdicts.jsonl` for audit.
4. Optionally delete this candidate spec; the verdict log preserves provenance.
