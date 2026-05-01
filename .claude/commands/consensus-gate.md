---
name: consensus-gate
description: Manual N-of-5 consensus gate over user-specified files. Runs the same 5-persona heuristic panel as the pre-commit hook (kienzle, safety, post-processor, dialect, fixture) on the target file glob, returns PASS/CONDITIONAL/FAIL with dissent[]. Use ad-hoc to vet a file before commit, or as a second opinion on a hook decision.
effort: low
maxTurns: 4
---

# /consensus-gate — Manual Consensus Gate Over Target Files

Wraps the P4-U03 commit hook's 5-persona heuristic gate as a user-invokable
slash command. Same panel (kienzle-physicist, shop-floor-safety-auditor,
post-processor-engineer, dialect-translator, fixture-designer), same
persona-weighted tally (home expert 1.5×), same FAIL veto rule — applied
to user-specified files outside the commit lifecycle.

Use it to:
- Vet a file BEFORE staging (skip the commit-block surprise).
- Get a second opinion on a CONDITIONAL hook verdict.
- Score a refactor against the manufacturing-domain personas without
  routing through `git commit`.

## Args: $ARGUMENTS

- **`--target=<file-or-glob>`** *(required)* — file path, comma-separated
  paths, or basename glob (e.g. `src/physics/constants.ts`,
  `engines/PostProcessor*.ts`, `a.ts,b.ts`).
- **`--providers=<comma-list>`** *(optional, default: `claude,codex,qwen,mistral,llama`)*
  — provider ids to enable. Each id maps positionally to a persona:
  `claude→kienzle`, `codex→safety`, `qwen→post-processor`,
  `mistral→dialect`, `llama→fixture`. Bare persona ids
  (`kienzle,safety,post-processor,dialect,fixture`) also accepted.
- **`--threshold=<0..1>`** *(optional, default: `0.75`)* — pass-ratio
  threshold below which a non-FAIL verdict is downgraded to CONDITIONAL.

If `--target` is omitted, ask the user once for the target glob and stop.

## When to use

- About to edit `src/physics/constants.ts`, a `*PostProcessor*.ts`, or a
  `*GcodeEmit*.ts` and want a pre-commit verdict.
- A peer chat just landed an edit on a shop-floor-relevant file and you
  want an independent read.
- Auditing an old file before refactor: did this kc1.1 ever drift out of
  the steel range?

## When NOT to use

- During an active `git commit` — the P4-U03 PreToolUse hook already runs
  the same panel automatically. Running this skill on top is redundant.
- For non-shop-floor files (UI, docs, tests) — the personas have nothing
  to say about them and will all PASS uninformatively.

## Procedure

### 1. Parse args
- Extract `--target`, `--providers`, `--threshold` from `$ARGUMENTS`.
- If `--target` missing, ask the user and stop.

### 2. Invoke the CLI helper
Run the bundled CLI script directly via Bash:

```bash
node mcp-server/scripts/consensus-gate-cli.mjs \
  --target "<target>" \
  --providers "<providers>" \
  --threshold <threshold>
```

The script emits a single JSON object on stdout. Capture it.

### 3. Surface the verdict
Parse the JSON. Show the user, in order:

1. **Decision** — `PASS` / `CONDITIONAL` / `FAIL` / `REFUSED`, with the
   one-line `reason` field.
2. **Vote tally** — raw `votes` and persona-weighted `weighted` counts.
3. **Detected domain** — `domain` field (or `null`).
4. **Per-provider verdicts** — one line per entry in `providers[]`:
   `<id> (<persona>): <decision> — <rationale>`.
5. **Dissent** — if `dissent[]` is non-empty, list each entry as
   `<provider>: <decision> — <rationale>`.

### 4. Recommendation
- `PASS` → silent confirmation; nothing else to do.
- `CONDITIONAL` → tell the user which dissents to address before commit.
- `FAIL` → tell the user the commit hook will block this; address the
  veto reason or revert.
- `REFUSED` → bad inputs (no `--target` or no files matched). Re-ask.

## Decision-correctness contract (per envelope P4-U04)

The CLI's JSON output is the testable surface. Concretely:

- Run on a known-buggy file (e.g. `kc1.1=99` inlined for steel) with
  `--threshold=0.75`:
  - `decision === "FAIL"`
  - `dissent.length >= 2` (at minimum: kienzle FAIL + at least one other
    persona dissenting from PASS)
  - `providers[].provider` carries the original `--providers` ids in order.
- Run on a clean file with `--threshold=0.75`:
  - `decision === "PASS"`
  - All `providers[].decision === "PASS"` (uniform across the panel)
  - `dissent === []`

`PreShopFloorCommitConsensus.test.ts` (P4-U03) covers the COMMIT path;
`ConsensusGateSkill.test.ts` (P4-U04) covers THIS skill's CLI path. Both
share the heuristic substrate so a panel change keeps the surfaces aligned.

## Failure modes

- `--target` matches no files → CLI returns `decision: "REFUSED"` with
  `reason: "no files matched --target=<pattern>"`. Re-ask the user.
- File is too large to read → CLI surfaces the read error in the
  `filesScanned` payload but still tallies whatever it could read.
- `--threshold` outside [0,1] → currently passed through; the
  decision logic clamps via comparison, but the tally still emits — user
  is responsible for sane input.

## Adversarial considerations

- User points `--target` at a file in another peer-chat's claim. The
  skill is read-only — no claim conflict — but if you act on the verdict
  by editing, that's a separate `file-claim-guard.mjs` concern.
- Provider list with unknown ids → unknown ids fall back to the safety
  persona; document this in the surfaced output so the user sees it.

## Rollback

- Skill is markdown only — `rm .claude/commands/consensus-gate.md`.
- CLI helper at `mcp-server/scripts/consensus-gate-cli.mjs` is also
  removable; nothing else in the repo imports from it.
