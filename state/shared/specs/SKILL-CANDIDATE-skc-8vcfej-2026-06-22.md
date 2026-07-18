---
schemaVersion: 1.0.0
id: skc-8vcfej-2026-06-22
generated: 2026-06-22T08:17:01.977Z
status: candidate
source: HERMES-MS1 / U-HERMES05
---

# SKILL CANDIDATE — `skc-8vcfej-2026-06-22`

Observed 183 times across slots [alpha=19, golf=14, romeo=14, charlie=13, hotel=12, foxtrot=12, whiskey=12, echo=11, bravo=10, delta=9, sierra=9, papa=7, india=5, oscar=5, zulu=5, juliett=4, lima=2, november=2, victor=2, kilo=1, mike=1, tango=1]; dominant kind: **build-heavy** (build-heavy=183); median call count: 4.

## Tool-call signature

```
Bash|Bash|Bash|Bash
```

## Proposed trigger keywords

(operator/reviewer fills in — derive from dominant-kind tools + typical slot domains: lima, delta, juliett, hotel, november, charlie, golf, alpha, foxtrot, bravo, kilo, whiskey, romeo, india, papa, echo, sierra, mike, victor, oscar, zulu, tango)

## Suggested template

A skill matching this signature should:
1. Read the relevant context (Grep / Read first, per signature shape).
2. Plan with TodoWrite when steps > 3.
3. Execute via the dominant-kind tool family.
4. Verify outcome (test / build / commit).

## Provenance

- First seen: 2026-05-21T02:10:56.411Z
- Last seen: 2026-06-22T02:49:40.520Z
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
3. Append `{ "id": "skc-8vcfej-2026-06-22", "promotedTo": "<chosen-name>" }` to
   `state/shared/skill-loop-verdicts.jsonl` for audit.
4. Optionally delete this candidate spec; the verdict log preserves provenance.
