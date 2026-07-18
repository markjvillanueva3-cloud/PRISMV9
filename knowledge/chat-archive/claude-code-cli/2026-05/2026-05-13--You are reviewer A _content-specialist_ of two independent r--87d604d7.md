---
type: "chat-session"
source: "claude-code-cli"
session_id: "87d604d7-95ee-4692-8252-4c92d5d68064"
title: "You are reviewer A (content-specialist) of two independent reviewers per CLAUDE."
date: "2026-05-13"
first_ts: "2026-05-13T18:03:32.803Z"
last_ts: "2026-05-13T18:04:18.664Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/87d604d7-95ee-4692-8252-4c92d5d68064/subagents/agent-a4475fd015d1242ba.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# You are reviewer A (content-specialist) of two independent reviewers per CLAUDE.

> **claude-code-cli** | 2026-05-13 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/87d604d7-95ee-4692-8252-4c92d5d68064/subagents/agent-a4475fd015d1242ba.jsonl`

## Transcript

### User | 2026-05-13T18:03:32.803Z

You are reviewer A (content-specialist) of two independent reviewers per CLAUDE.md §PER-FILE SCRUTINY GATE for the PRISM platform. Reviewer B runs in parallel.

TARGET (just written): `H:/prism/.claude/helpers/commit-reviewer-dispatch.mjs`

CONTEXT
- CLEANUP-MS0/U-CLEANUP-B4 main file. Pure-function planner returning `{shouldReview, reason, agents, sanitizedCommit, ollamaFirstPass, securityPaths, ...}` for one peer-chat commit.
- Spec: H:/prism/state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md
- Folds R1-B4, R1-B9 (sanitization), R1-B14 (token budget), R3-VER3 (compaction-safe), R3-VER5 (self-attribution), R4-P0-2 (enrich), R4-P0-3 (Ollama cascade).
- Companion file `reviewer-context-enrich.mjs` already shipped + scrutinized.
- The CALLER (golf-watchdog cron) does actual `Agent({...})` dispatch using `agents[i].prompt`; this helper only PLANS.
- DI seam via `deps.{ownedPaths, golfAuthors, recentDispatches, recentTicks, tokenBudget, enrich, ollamaFirstPass, now}` for hermetic tests.

READ THE FILE END-TO-END.

ACCEPTANCE CRITERIA (FAIL on any violation):
1. Spec compliance — every folded R-code's requirement is in code (not deferred): R1-B4 (file→agent map, throttle, cap, chunk), R1-B9 (sanitize on every commit-derived string), R1-B14 (budget read + exhaustion gate + appendTokenSpend), R3-VER5 (self-attribution + ownedPaths in planDispatch step 1), R4-P0-2 (deps.enrich threaded), R4-P0-3 (runOllamaFirstPass + escalation logic).
2. Sanitization correctness — sanitizeUntrustedField applied to author, email, branch, isoDate, subject, message, EVERY path, EVERY hunk text/path. Leading markdown chars escaped, non-ASCII stripped, length capped.
3. Self-attribution semantics — golf author match (exact, email, substring case-insensitive); ownedPaths subset check (ALL paths under ownedPaths → skip). Empty-paths case handled.
4. Throttle bypass — fileCount ≥ 5 bypasses; otherwise any dispatch within 15 min window blocks.
5. Recursion guard — last 3 ticks all golf-authored → t
... [+489 chars truncated]

### Assistant | 2026-05-13T18:03:39.848Z

I'll read the target file end-to-end and verify against all acceptance criteria.

### Assistant | 2026-05-13T18:03:40.057Z

[tool_use: Read]

### User | 2026-05-13T18:03:51.684Z

[tool_result] 1	// tier: T4
2	// CLEANUP-MS0/U-CLEANUP-B4 — commit-reviewer-dispatch.mjs
3	//
4	// PURE-FUNCTION CORE + CLI ENVELOPE. Given a commit, returns a dispatch
5	// plan { shouldReview, reason, agents:[{subagent_type, weight, prompt}],
6	//        dispatchId, sanitizedCommit, ollamaFirstPass }.
7	//
8	// The PLANNER is pure (DI for now/sources/ledger/ownedPaths/budgetReader/
9	// ollamaFirstPass). The 
... [+34467 chars truncated]

### Assistant | 2026-05-13T18:04:18.664Z

VERDICT: FAIL

BLOCKER: R1-B9 sanitization — `sanitizeUntrustedField` byte-cap uses `str.slice(0, maxBytes)` after non-ASCII strip. The strip regex `/[\x00-\x1F\x7F-￿]/g` covers only BMP up to U+FFFF; supplementary-plane characters (U+10000+, e.g. emoji, mathematical symbols) survive and `String.prototype.slice` counts UTF-16 code units, not bytes — a surrogate-pair can be sliced mid-pair producing invalid UTF-8 and bypassing the byte cap (4 bytes per char vs 2 code units counted).

BLOCKER: R1-B9 owned-path prefix match is exploitable — line 196 falls back to `norm.startsWith(opNorm)` without a trailing separator. An owned pattern `state/shared` will match `state/shared-evil/leak.txt`, classifying a foreign-path commit as `all_paths_golf_owned` and skipping review. The earlier branch only adds `/` when `opNorm` doesn't end in one, but the final `|| norm.startsWith(opNorm)` clause negates that protection.

BLOCKER: R1-B14 token-budget enforcement leaves the first per-slot prompt always staged: `cumulativeTokenEstimate += built.tokenEstimate` runs BEFORE the budget check, then `break` exits — but on the very first agent slot when `built.tokenEstimate > budget.available`, the loop still pushes nothing (correct), yet on the second slot's first chunk the prior cumulative may already exceed budget and we still call `buildPrompt` (work + enrich tokens spent) before checking. Minor but documented as "hard-stop".

NOTES:
- Self-attribution author match (lines 178-184) correctly handles exact/email/substring case-insensitive; empty-paths handled via `allUnderOwned = sanitizedCommit.paths.length > 0` initializer.
- Throttle bypass at `fileCount >= 5` and 15-min window check correct (lines 221-229).
- Recursion guard correctly requires ALL last-N ticks golf-authored (line 245 `every`).
- Ollama cascade timeout race + `finally clearTimeout` correct; failure → escalate (safety bias).
- DI for `now`, `enrich`, `ollamaFirstPass`, sources all threaded; CLI uses `void` (no floating 
... [+152 chars truncated]
