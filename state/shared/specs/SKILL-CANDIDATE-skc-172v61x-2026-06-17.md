---
schemaVersion: 1.0.0
id: skc-172v61x-2026-06-17
generated: 2026-06-17T08:17:01.436Z
status: candidate
source: HERMES-MS1 / U-HERMES05
---

# SKILL CANDIDATE — `skc-172v61x-2026-06-17`

Observed 134 times across slots [delta=14, bravo=13, alpha=13, charlie=9, sierra=9, whiskey=8, kilo=8, echo=7, golf=6, papa=6, juliett=6, india=5, hotel=4, romeo=4, mike=2, xray=2, zulu=2, tango=2, lima=1, foxtrot=1]; dominant kind: **build-heavy** (build-heavy=134); median call count: 3.

## Tool-call signature

```
Bash|Bash|Bash
```

## Proposed trigger keywords

(operator/reviewer fills in — derive from dominant-kind tools + typical slot domains: bravo, india, echo, golf, whiskey, charlie, alpha, mike, kilo, delta, lima, papa, hotel, juliett, sierra, foxtrot, romeo, xray, zulu, tango)

## Suggested template

A skill matching this signature should:
1. Read the relevant context (Grep / Read first, per signature shape).
2. Plan with TodoWrite when steps > 3.
3. Execute via the dominant-kind tool family.
4. Verify outcome (test / build / commit).

## Provenance

- First seen: 2026-05-22T18:56:51.022Z
- Last seen: 2026-06-17T03:17:25.497Z
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
3. Append `{ "id": "skc-172v61x-2026-06-17", "promotedTo": "<chosen-name>" }` to
   `state/shared/skill-loop-verdicts.jsonl` for audit.
4. Optionally delete this candidate spec; the verdict log preserves provenance.
