# CLAUDE-MD PATCH — R13 task-freshness doctrine + TASK-FRESHNESS-GATE-MS0

**Why a patch-sibling:** `CLAUDE.md` is peer-claimed by bravo (OBSIDIAN-BRAIN-FIX-MS0/U-OBF-F1+F2 drain, chat-bus 2026-05-17T21:28Z). Per the PATCH-SIBLING convention (JULIETT-12CHAT-ALLOCATION-MS0), foxtrot writes the intended CLAUDE.md delta here; the lock-holder (or a later foxtrot pass) splices it into the live file.

**Authored by:** foxtrot / claude-93351de7 · TASK-FRESHNESS-GATE-MS0/U-TFG01 · 2026-05-18

---

## PATCH 1 — append R13 to the "## CLAUDE.md RULES 5–12" block

Rename the section header `## CLAUDE.md RULES 5–12` → `## CLAUDE.md RULES 5–13` and append after the R12 bullet:

> - **R13 — Reconcile task age before building.** A task generated/surfaced/scheduled before recent fleet activity may already be shipped, rescoped, or invalidated. Before committing to build a unit, check (a) the timestamp of the task source (envelope `created_at` + the unit's own `status`/`completed_at` row / audit-spec filename date / inventory `generatedAt` / handoff frontmatter `written_at`), (b) commits + envelope flips + peer ships since then, (c) reconcile. Significant activity since generation → re-check spec, dedup, peer claims before code. → PRISM: enforced by `.claude/hooks/task-freshness-gate.mjs` (wired in `bash-bundle.mjs`) at `slot-task-claim.mjs claim`; clear a stale block with the `--ack-stale` token or one-shot `PRISM_TASK_FRESHNESS_BYPASS=1` (audited). Kill switch `PRISM_TASK_FRESHNESS_GATE_DISABLE=1`.

(The "Keep this section ≤20 lines" note still applies — R13 is one bullet; the detail lives in the wiki entry below, this is a pointer.)

## PATCH 2 — add a milestone-pointer paragraph (after the FLEET-TASK-HEALTH-MS0 section, the last ## section)

> ## TASK-FRESHNESS-GATE-MS0 (2026-05-18, slot foxtrot — R13 enforcement)
>
> Hard PreToolUse gate over 4 task surfaces (atomic-roadmap envelopes + audit-specs + derived inventories + handoff RESUMEs). Intercepts `slot-task-claim.mjs claim --unit <MS::U-ID>` and BLOCKS when the unit source is stale vs fleet activity — strongest signal is the unit's own envelope `status:completed` row (already-shipped), then future-dated/untrusted-anchor/git-unprovable conservative blocks, then age>24h or ≥5 peer-commits-since-gen. **Pure core** `.claude/helpers/task-freshness.mjs` (injectable readers, 8 exports) + **hook** `.claude/hooks/task-freshness-gate.mjs` (fast-path IO-free on non-claim Bash, fail-open on any internal error, exit-0-always — block via stdout JSON only per bundle contract). Wired as one `BASH_HOOKS[]` entry in **`.claude/hooks/bundles/bash-bundle.mjs`** (the bundle, NOT a loose `.claude/hooks/*.mjs` file) between commit-ownership-guard and worktree-commit-route; the bundle itself is wired in `H:/.claude/settings.json` PreToolUse `^Bash$` matcher (~line 640). Verify: `grep -n task-freshness-gate H:/prism/.claude/hooks/bundles/bash-bundle.mjs`. Own-active-claim → silent allow (mid-/loop heartbeat not re-gated). Quote-evasion closed: `stripQuoted` kills echo/grep false-positives, `unquote()` normalises quoted `--unit`, malformed `--unit` fails CLOSED. Knobs: `PRISM_TASK_FRESHNESS_{GATE_DISABLE,STALE_HRS=24,PEER_COMMITS_TRIGGER=5,ACK_TTL_MIN=30,BYPASS,GIT_TIMEOUT_MS,VERBOSE}`. 36 node:test (hermetic + 2 real-data E2E + fork-storm control pair). Wiki: [`knowledge/wiki/architecture/task-freshness-gate.md`]. Memory: [[feedback_task_freshness_pre_build]].
>
> **Recent regressions row to add:**
> - 2026-05-18 | **bundled sub-hook must signal block via stdout JSON, NEVER process.exit(2)** — a sub-hook that exits 2 in the stdout write-callback risks the documented Windows pipe-truncation race → empty stdout → bundle sees no block → STALE claim silently allowed (gate-bypass class). hook-runner.mjs reads `parsed.decision==="block"` only; the BUNDLE re-derives outward exit-2 itself. Siblings (commit-ownership-guard.mjs) emit block JSON + exit 0. | observed-by: claude-93351de7 slot foxtrot per-file scrutiny round-2 (reviewer B caught; reviewer A missed — graded PASS without cross-checking the aggregator → exactly why the 2-reviewer gate exists). | verify: `grep -n "process.exit(0)" H:/prism/.claude/hooks/task-freshness-gate.mjs` (only 0, never 2).

## PATCH 3 — no settings.json change

The gate is wired via the `bash-bundle.mjs` BASH_HOOKS array, NOT a settings.json entry. No `H:/.claude/settings.json` edit. Registry auto-regen queued by PostToolUse on the `.claude/hooks/` change.

---

**Splice instructions for the lock-holder (grep-anchored, not mtime-fragile):**
- PATCH 1: locate the line containing `## CLAUDE.md RULES 5–12`, rename in place to `5–13`, append the R13 blockquote bullet immediately after the line containing the R12 bullet (`**R12 — Fail loud.**`).
- PATCH 2: insert the milestone-pointer paragraph + the "Recent regressions row" immediately after the LAST existing `## Recent regressions` table block (grep `^## Recent regressions` → append under the most recent one), NOT "after the last ## section" (mtime-fragile if a peer appends a newer milestone first).
- PATCH 3 is informational (no-op).
- Total CLAUDE.md growth ≈ 1 bullet + ~12 lines — within the doctrine-pointer budget. Cross-refs: [[feedback_task_freshness_pre_build]] + [[reference_task_freshness_gate_ms0_2026_05_18]] (both exist in `H:/.claude/projects/H--PRISM/memory/`, indexed in MEMORY.md) + wiki `knowledge/wiki/architecture/task-freshness-gate.md`.
