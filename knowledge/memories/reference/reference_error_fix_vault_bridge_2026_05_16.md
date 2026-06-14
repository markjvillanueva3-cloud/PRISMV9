---
name: reference-error-fix-vault-bridge-2026-05-16
description: "Obsidian-2nd-brain Gap #4 SHIPPED 2026-05-16 commit 27c28fabb slot echo. error-fix-vault-bridge.mjs T3 Stop hook. KEY DEDUP CALL: test-fail->edit->test-pass DETECTION already built 4x (error-pattern-memory pairs into error-memory.json:fixes{}; +error-recovery-memory/error-pattern-learner/error-learner-hook) — building a 5th was the forbidden R8 dup; re-scoped to the genuine gap = the Obsidian persistence bridge (compose, not detect), same architecture as Gap #1/#2. 24 node:test PASS. 4-agent per-file 2-arm scrutiny all PASS. Wired Stop[0][15] C:+H: byte-equal."
aliases: reference_error_fix_vault_bridge_2026_05_16
type: reference
slot: echo
source: prism-memory
synced: 2026-06-09T14:54:09.105Z
---


# Gap #4 — error-fix-vault-bridge.mjs (Obsidian 2nd-brain, COMPLETES the ladder 4/4)

## The load-bearing decision: re-scope on duplication, don't build the named thing

The handoff scoped Gap #4 as "build a PostToolUse hook that detects test-fail → edit →
test-pass cycles and writes the learning." A thorough dup check (R8 / system-viz-first)
found that **detection is already implemented 4×**:

| Existing hook | Sink |
|---|---|
| `error-pattern-memory.mjs` (PostToolUse Bash→Edit/Write, pairs error→fix) | `mcp-server/data/state/error-memory.json` `fixes{}` |
| `error-recovery-memory.mjs` | `~/.claude/learning/error-recovery.json` |
| `error-pattern-learner.mjs` | `state/shared/ERROR_LEDGER.jsonl` |
| `error-learner-hook.mjs` | `error-memory.json` (signatures) |

Building a 5th detector is the exact `duplicationGuardEngine`/R8 forbidden case.
The **genuine** un-built gap: none of those JSON/JSONL stores ever reach the
Obsidian-synced `knowledge/memories/` vault as queryable markdown
(`memory-mirror-to-vault.mjs` only mirrors files Claude *explicitly writes*;
`unified-ledger-mirror.mjs` → JSONL via MCP). So Gap #4 = the **bridge**, same
architecture as Gap #1 (regression-auto-write) / Gap #2 ([[reference_scrutiny_verdict_persist_2026_05_16|scrutiny-verdict-persist]]):
an existing in-repo JSON ledger → idempotent Obsidian markdown. **Compose, not detect.**
This is the 2nd time this session a "build X" handoff was correctly re-scoped to
"X already exists, build the missing composition layer" (sister: [[reference_error_learn_loop_extension]]).

## What shipped

`.claude/hooks/error-fix-vault-bridge.mjs` (T3 Stop observer) + 24-case `node:test`.
Reads `error-memory.json:fixes{}` (the already-paired error→fix map), filters durable
pairs (`isDurable`: real signature, successCount ≥ MIN; bare `code modification`
placeholder excluded unless recurred ≥2× = a hotspot), regenerates a per-UTC-day
`knowledge/memories/error-fixes/error-fixes-<day>.md` with content-hash idempotency.
Reuses Gap #2's scrutiny-passed `yamlScalar`/`contentHash`/`extractContentHash`/
`fencedBlock`/`writeWithGuard` verbatim. Wired Stop[0][15] between
`scrutiny-verdict-persist` and `error-pattern-promote` per
[[reference_stop_advisory_wiring_cluster_2026_05_15]]; C:+H: settings.json byte-equal,
grep=1 both.

## Per-file 2-arm scrutiny — 4 agents, all PASS, 0 P0

| File | Arm A | Arm B | Acted-on findings |
|------|-------|-------|-------------------|
| hook | PASS (code-analyzer) | PASS (reviewer) | P1 approve() EPIPE double-throw → exactly-once `_approved` + swallow; P2 name/aliases not yamlScalar'd → wrapped; P2 extractContentHash first-match → **last-match** (closes embedded-marker false idempotent-skip = silent never-persist); P2 selectForDay silently re-dated undated fixes to today → **EXCLUDE** undated (Arm B silent-corruption class); P2 inlineSafe `\|` table-escape |
| test | PASS (test-review-agent) | PASS (reviewer) | P1 import-safety only checked exports → now sets temp PRISM_ROOT + today-durable fix + asserts **no vault write**; P2 content-hash flip now locked for file/successCount/timestamp/sha/day; P2 fence test → structural open/close-containment; P2 frontmatter → parser-free open-allowlist key check; P3 proto theater-assert clarified; P3 writeWithGuard temp in `finally` |

Deferred P3 (logged, family-consistent with Gap #2, not shipped): cosmetic table-width
magic numbers; `fs.statSync` size-ceiling on `error-memory.json` JSON.parse.

## Reusable lessons

- **Arm B silent-corruption catch**: `dateSlug(ts, fallback)` defaulting an empty/invalid
  timestamp to "today" was *correct* in Gap #2 (per-session keying = deterministic) but
  became a **silent-corruption bug** here (per-UTC-day keying re-emits the fix into every
  day's file forever, misdated). Same helper, opposite correctness depending on the keying
  scheme. Lesson: when reusing a primitive, re-derive its correctness under the NEW caller's
  invariants — don't assume it transfers. Fix = exclude (surface less) over re-date (silent corrupt).
- **`extractContentHash` first→last**: a hostile errorMsg can place
  `<!-- content-hash: X -->` on its own line *inside a fenced detail block*. First-match
  could pick the embedded one → false idempotent-skip → a real new fix silently never
  persisted. Last-match + the legit marker always appended at EOF + `clip()` collapsing
  whitespace before `fencedBlock()` (so no attacker marker can land *after* the real one)
  closes it. This is the silent-drop class the whole ladder exists to prevent.
- **Parser-free frontmatter integrity lock**: `yaml` is NOT resolvable from `.claude/`
  (sibling Gap #2 test also string-parses). Open-allowlist of expected top-level `key:`
  lines inside the `---` block catches ANY forged key (not just the 2 in the payload)
  with zero dependency — stronger than a 2-string denylist, no dep risk.
- **Clean commit, no absorption**: 7th-absorption pattern did NOT recur this unit —
  files were `??` untracked, `git add -f` (`.claude/` gitignored) + `[MAIN]` prefix
  (overrides worktree-commit-route) → `27c28fabb`, 2 files, 745 ins, committed directly.

## Ladder status

Obsidian-2nd-brain ladder: **4 of 4 COMPLETE** (Gap #1 regression-auto-write ✓,
Gap #2 [[reference_scrutiny_verdict_persist_2026_05_16|scrutiny-verdict-persist]] ✓, Gap #3 Qdrant-down alert ✓, Gap #4 this ✓).
Pending sibling ladders: ollama-docker 2/5 (13 unwired ollama-* hooks, cost-router
into auto-router, docker auto-recovery); checkin-loop-goal 5/7 (#4 loop-iter-start
PreToolUse hook, #7 /goal auto-evidence ship-report).

## Verify

```bash
grep -c error-fix-vault-bridge H:/.claude/settings.json C:/Users/wompu/.claude/settings.json   # both 1
node --test H:/prism/.claude/hooks/__tests__/error-fix-vault-bridge.test.mjs                    # 24 pass 0 fail
git -C H:/prism show 27c28fabb --stat
```

NOTE: `MEMORY.md` index line NOT added — it was peer-claimed (claude-32a39c0c +
claude-c0f06dee, edit) at ship time per chat-bus lane discipline. The
`memory-mirror-to-vault.mjs` hook mirrors THIS file to the Obsidian vault on write;
the MEMORY.md index entry is owed on next unclaimed pass.
