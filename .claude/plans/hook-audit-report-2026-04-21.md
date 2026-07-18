# Hook Audit Report — 2026-04-21 (SYS-OPT-MS0 / U-SYS-T1.3)

**Tool:** `H:/PRISM/scripts/audit-hooks.mjs` (reusable — run any time)
**Settings file:** `H:/PRISM/.claude/settings.json`

## Headline

| Metric | Value | Verdict |
|---|---:|---|
| Total hook entries | 202 | |
| Checkable (file paths) | 191 | |
| Inline (bash one-liners) | 11 | skip (not file-checkable) |
| ✓ OK (file exists) | **191** | ✅ **no broken paths** |
| ✗ Missing/typoed | **0** | ✅ |
| Hard-blocks (`continueOnError:false`) | 26 | ⚠️ high — each can abort a session |
| Duplicate command strings | 13 | ⚠️ waste |
| Total timeout budget | **505.1s** | ⚠️ worst-case 8.5 min if every hook times out |

**Exit condition met:** 0 hooks failing on either PC (by file-existence check). File paths are correct — the portability work (H: Python + junctions) fixed all runtime "not found" errors. Remaining inefficiencies are about LATENCY and DEDUP, which belong to T2.1 + T2.2.

## Latency-by-section (worst-case sequential, if every hook hits its timeout)

| Section | Budget | Note |
|---|---:|---|
| **Stop[0]** | **142.5s** | 🔴 ~2.5 min of post-response hooks — biggest surface |
| **SessionStart[0]** | **71.5s** | 🔴 >1 min before first prompt can complete |
| PreToolUse[6] | 59.0s | 🔴 one chain — 40+ hooks on `Write|Edit|MultiEdit` |
| PostToolUse[3] | 33.5s | 🟧 |
| UserPromptSubmit[0] | 29.5s | 🟧 up to 30s before AI begins responding |
| PostToolUse[5] | 27.5s | 🟧 |
| PreCompact[0] | 26.0s | 🟧 |
| PreToolUse[7] | 8.5s | |
| ...all others | 0.2–6.5s | |

Note: these are TIMEOUTS. Actual execution is usually faster. But the SUM quantifies worst case, and any hook actually hitting its timeout is silently eating that budget even on success.

## Duplicate commands (13 — running 2× each = waste)

```
×2  node H:/prism/.claude/hooks/protect-document-content.mjs
×2  node H:/prism/.claude/hooks/lib/orphan-detection-hook.mjs
×2  node H:/prism/.claude/helpers/subagent-context.mjs
×2  node H:/prism/.claude/helpers/command-awareness-inject.mjs
×2  node H:/prism/.claude/hooks/doc-freshness-check.mjs
×2  node H:/prism/.claude/hooks/lib/token-economy-hook.mjs
×2  node H:/prism/.claude/hooks/node-process-janitor.mjs
×2  STABLE_SESSION=$(node .../stable-session-id.mjs ...
×2  node H:/prism/.claude/helpers/sync-h-c-drives.mjs
×2  node H:/prism/.claude/helpers/position-sync.mjs
×2  node H:/prism/.claude/helpers/milestone-tracker.mjs
×2  node H:/prism/.claude/helpers/agent-coordination-daemon.mjs heartbeat
×2  node H:/prism/.claude/hooks/claim-registry-release.mjs
```

Some may be legitimate (different matchers, different hook events — e.g. sync runs on SessionStart AND Stop). But several look redundant within the same event. **T2.2 (settings.json compaction) should dedupe where safe.**

## 26 hard-blocks (session-aborting potential)

These hooks fail the session on error. They are the "strict enforcement" surface. List worth auditing manually for correctness:
- `h-drive-enforcement.mjs` (HARD BLOCK — C: write guard)
- `protect-document-content.mjs` (×2)
- `file-protect.sh`
- `ai-duplication-guard.mjs`
- `review-gate.sh`
- `night-mode-guard.mjs`
- `pre-rename-guard.mjs`
- `critical-file-guard.mjs`
- `document-preserve-guard.mjs`
- `managed-block-guard.mjs`
- `agent-boundary-guard.mjs`
- `duplication-hard-block.mjs`
- `canonical-constants.mjs`
- `kienzle-coeff-check.mjs`
- `taylor-coeff-check.mjs`
- `test-legitimacy.mjs`
- `sx-gate.mjs`
- `no-silent-catch.mjs`
- `literature-citation.mjs`
- Portability guards (3): `portable-python-guard.mjs`, `dotclaude-junctions-guard.mjs`, `appdata-junction-guard.mjs`
- Plus ~6 more

Recommend: audit by "when-does-this-block" semantics in T2.2 pass. Any hard-block whose block condition isn't obviously correct → demote to soft warning.

## Feeds directly into other SYS-OPT units

| Finding | Target unit |
|---|---|
| 13 duplicate commands | U-SYS-T2.2 (settings.json compaction) |
| Stop[0] = 142.5s | U-SYS-T2.1 (latency profile) — investigate |
| SessionStart[0] = 71.5s | U-SYS-T2.1 (latency profile) — investigate |
| 26 hard-blocks | U-SYS-T2.2 (review + demote where unjustified) |
| 11 inline bash snippets | U-SYS-T2.2 (extract to named scripts for testability) |

## Tool reusability
`H:/PRISM/scripts/audit-hooks.mjs` — run any time:
- `--verbose` shows ctx path + full command per missing hook
- `--json` machine-readable output for CI integration

## Exit status
T1.3 exit condition: "0 hooks failing on either PC" — **met on work PC** (path-existence guaranteed). Home PC: same settings.json via H: junctioning means equivalent state (all hook files live on H:, available on either PC).

No git commit required — no settings.json mutation in this unit. Script added at `H:/PRISM/scripts/audit-hooks.mjs` (untracked; can be tracked in a follow-up commit).
