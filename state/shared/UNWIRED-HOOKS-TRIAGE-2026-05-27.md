# Unwired-hook triage — 2026-05-27 (slot:golf)

> Full raw audit: `UNWIRED-HOOKS-AUDIT-2026-05-27.md` (321 candidates classified)
> Audit script: `scripts/audit-unwired-hooks-2026-05-27.mjs` (re-runnable, traverses bundle internals)

## TL;DR

Of **654 project + 5 user hooks on disk**, **321 are unwired** (49%) across every settings.json layer (user C:, mirrored H:, project, project.local) and across all 9 bundle files. The audit closed 32 false positives by walking bundle internals — the remaining 321 have **zero** settings or bundle references.

Most of the 321 are deliberate (libraries, deprecated/, experimental sketches, intentionally retired guards). A smaller subset are genuine bugs of the same class as `chat-slot-heartbeat.mjs` (just shipped today, slot:golf): hook is built and CLAUDE.md says it's wired, but settings.json has no reference.

## CLAUDE.md cross-check — which "wired" hooks are actually wired?

| Hook | CLAUDE.md says | Audit says | Status |
|------|----------------|------------|--------|
| `stop_on_failing_tests` | wired | wired | ✓ |
| `stop_on_unwired_assets` | wired | wired | ✓ |
| `enforce-handoff-topic` | wired | wired | ✓ |
| `scrutinize-before-stop` | wired | wired | ✓ |
| `stop_on_uncommitted_critical` | wired | **NOT WIRED** | **WIRED THIS SESSION** ↓ |
| `pre-delete-guard` | wired | NOT WIRED | open |
| `claude-no-delete-files` | wired | NOT WIRED | open |
| `file-claim-commit-guard` | wired | NOT WIRED | open |
| `cross-terminal-conflict` | wired | NOT WIRED | open |

## Shipped this session

1. **`chat-slot-heartbeat.mjs`** (PostToolUse:*) — was THE slot-disconnect root cause; smoke-tested OK
2. **`stop_on_uncommitted_critical.mjs`** (Stop) — wired in `H:/prism/.claude/settings.json` after `stop_on_failing_tests`. NOTE: hook output schema is `result:warn` not `continue:false` — it warns but does NOT block. Operator decision: refactor to true blocker, or accept advisory-only? Tracked as separate item.

## Open candidates (impact-ordered, operator decision required)

### Tier-A — CLAUDE.md says wired, name implies safety enforcement (4 hooks)
These have the highest probability of being real bugs:

- `pre-delete-guard.mjs` — "never delete, only disable" doctrine. PreToolUse on delete-shaped Bash commands.
- `claude-no-delete-files.mjs` — likely duplicate / earlier version of `pre-delete-guard`. Read both, pick one, archive the other.
- `file-claim-commit-guard.mjs` — peer-claim guard at commit time. Complements `file-claim-guard` (PreToolUse, wired) — claim guard at commit close. Tier T0.
- `cross-terminal-conflict.mjs` — multi-chat conflict detection. Tier T0.

**Recommendation:** wire `pre-delete-guard` (highest safety value), defer the others until operator triages duplicates.

### Tier-B — Cost-bridge family (13 hooks, all unwired)
The entire `cost-bridge-on-*.mjs` family is unwired:
- `cost-bridge-on-cad-import` `cad-strategy-select` `cad-tool-select` `machine-rate` `material-price` `operator-override` `pdf-extract` `precommit` `program-emit` `quote-accept` `reverse-cad` `runtime-predict` `shop-config-change` `spc-log` `tool-catalog` `tool-wear-log`

**Question for operator:** were these planned-but-deferred, superseded by a unified hook, or genuinely orphaned? If still in scope, this is a 13-hook wiring batch (could be one PostToolUse arm).

### Tier-C — Resume/session continuity adjacencies (3 hooks)
Relevant to the B2 fix I shipped earlier this session:

- `neural-roadmap-resume-detect.mjs` — could augment SessionStart resume
- `session-continuity-chain.mjs` — Tier-T1
- `session-start-claim-slot.mjs` — referenced in chat-slot-heartbeat docstring as part of the slot lifecycle (`SessionStart → session-start-claim-slot.mjs (claims a slot)`)

**Recommendation:** read `session-start-claim-slot.mjs` next session — if it's the missing "claim on startup" hook, that's another slot-disconnect contributor.

### Tier-D — 89 EXECUTABLE_HOOK_UNWIRED + 91 T3_ORPHAN + 34 UNKNOWN
Need per-hook triage. Many are likely retired but never marked. Recommend a sweep where each is either:
- Wired (if active doctrine wants it)
- Deleted (only after move to `.deprecated/<date>/`)
- Marked with `// DISABLED: <reason>` so the audit classifier picks it up

## How to re-run the audit

```
node H:/prism/scripts/audit-unwired-hooks-2026-05-27.mjs > H:/prism/state/shared/UNWIRED-HOOKS-AUDIT-2026-05-27.md
```

The script walks `H:/prism/.claude/hooks/**/*.mjs` (excluding bundles, lib, __tests__, *.test.mjs) + `H:/.claude/hooks/**`, then scans 4 settings.json layers + all bundle files for `\b<name>\.mjs\b` references. Anything on disk not in the wired set is flagged. Classification uses regex on the first 3000 bytes of each candidate (`tier:` frontmatter, `disabled` markers, `export` patterns, main-pattern detection).
