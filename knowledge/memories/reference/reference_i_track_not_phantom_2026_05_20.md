---
name: reference-i-track-not-phantom-2026-05-20
description: "R12 correction (2026-05-20 echo commit f130920ade): I-track 'phantom tools' from SYSTEM-SYNERGY-AUDIT-2026-05-09 ALL EXIST in .claude/scripts/ since 2026-05-09. Audit literal-matched scripts/<name>.mjs and missed .claude/scripts/<name>.mjs. Removes 4 entries from the fleet pickup queue."
aliases: reference_i_track_not_phantom_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.165Z
---


The `SYSTEM-SYNERGY-AUDIT-2026-05-09.md` §5 Track I listed 4 "missing on disk" scripts referenced by `/forge5`, `/forge6`, `/forge7`, `/rgs5`, `/rgs6` skill bodies — labeled a "credibility issue". Verified this session via `fs.existsSync` + smoke-test that all 4 are present in `.claude/scripts/`, built 2026-05-09 (one day before the audit ran).

**Live state:**

| # | Audit-claimed missing path | Actual existing path | Size | Verified |
|---|---|---|---|---|
| I1 | `scripts/viz-completeness-check.mjs` | `.claude/scripts/system-viz-completeness-check.mjs` | 10538b | exists |
| I2 | `scripts/viz-progress-update.mjs` | `.claude/scripts/viz-progress-update.mjs` | 10183b | exists |
| I3 | `scripts/auto-wire-plan.mjs` | `.claude/scripts/auto-wire-plan.mjs` | 6045b | exists |
| I4 | `scripts/compounding-gains-audit.mjs` | `.claude/scripts/compounding-gains-audit.mjs` | 12879b | runs (exits BLOCK on HOOK-SYNERGY-MS0 = zero-artifact detection working) |

**Root cause** (R12 / R8): the audit's "missing on disk" claim was a literal `existsSync("scripts/<name>.mjs")` check — blind to the `.claude/scripts/<name>.mjs` variant where the tools actually live. The skill bodies (`/forge5.md:268` for example) reference `H:/prism/.claude/scripts/compounding-gains-audit.mjs` — the correct path. Audit error: matched the wrong literal.

**Caught by**: this session's `command node -e fs.existsSync(...)` probe against both candidate paths after the survey artifact I shipped (`899541f9c8`) declared them phantom. Survey corrected at `f130920ade`.

**Doctrine lesson** ([[feedback_verify_actual_contract_not_proxy]]): when re-reading an audit claim before acting on it, verify the exact path the *consumer* (skill/runbook) references — not the path the audit text said is missing. Audit text is a proxy; the consumer's path is the contract.

**Effect on fleet pickup queue**: 4 entries removed. Future `/checkin-<slot> /loop` runs that previously would have started "build the missing I-track tool" can skip and pick H-track work directly.

**What's still legitimately undone** for I-track:
- Smoke-tests across each existing tool against realistic milestones
- `--all` mode iterating `roadmap-index.json` (currently `--milestone <id>` only on `compounding-gains-audit.mjs` per its `main()`)
- Cross-check that `/forge5/6/7` skill bodies actually shell out to these — they may reference the tools without invoking them

These are P2/P3 polish, not new builds. The "phantom" framing is retired.

Related:
- [[feedback_verify_actual_contract_not_proxy]] — the doctrine this entry exemplifies
- [[reference_u_memory_index_sidecar_2026_05_20]] — sister session unit
- [[reference_h8_misattribution_2026_05_20]] — same R12 pattern (claim ≠ on-disk truth)
- `state/shared/specs/SYSTEM-SYNERGY-AUDIT-2026-05-09.md` — the parent audit (Track I §5)
- `state/shared/specs/ECHO-UNDONE-2026-05-18-19-COMPILATION.md` — the corrected survey
