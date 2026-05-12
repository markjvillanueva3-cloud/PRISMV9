---
name: Scrutiny gate behavior on read-only sessions (3-of-3 policy)
description: When the strict 3-of-3 scrutiny gate blocks a session that authored zero edits (or an arm env-fails), prefer the documented auto-escape — never fake-pass an arm
type: feedback
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
Strict 3-of-3 scrutiny reviews the **uncommitted diff in the working tree**, not just edits authored by the current chat. Adopted 2026-05-05; the arm lineup changed 2026-05-12 — it is now **Codex CLI + two independent Claude reviewer agents** (arm A holistic / arm B test-integrity-weighted), NOT "Codex + Gemini + Opus". The Gemini CLI arm was retired (daily-quota / trust-dir env failures kept stalling the gate); arm 3 is a second Claude `reviewer` agent. In multi-chat setups (~6 concurrent chats), a session that did pure research/reading can still hit a FAIL on 100KB+ of work belonging to peer chats.

**Why:** the 3-of-3 design deliberately catches single-reviewer drift and stub-tolerance regressions; the auto-escape after 3 block attempts is the documented release valve for this exact false-positive class — "do not abuse" means do not abuse, not "never use."

**How to apply:**
- Session authored ZERO edits → use auto-escape: hit Stop 3 times, gate clears with a warning. Don't burn tokens on a 4th scrutiny round.
- Session authored real edits but the diff is huge → COMMIT first, then `scrutiny-3way.mjs --target HEAD` — scopes review to the last commit, often <80KB and not truncated. (`captureDiff` with no `--target` diffs the whole working tree; on this 7000+-uncommitted-file repo that's MB of state-file churn → truncates to 80KB → reviewers get a "diff-truncated" stub and FAIL. The git-diff timeout was bumped 8s→120s, and noise dirs are excluded, in `[INFRA-SCRUTINY-FIX]`.)
- The two Claude reviewer arms are dispatched by the chat via `Agent({subagent_type:'reviewer', prompt:<opusReviewerPrompt|opusReviewerPromptB from scrutiny-3way.mjs output>})`; record verdicts with `scrutiny-3way.mjs --mark-opus pass` (arm A) + `--mark-claude pass` (arm B; `--mark-opus-b` / `--mark-gemini` are accepted aliases). The Codex arm auto-records on the script run.
- Codex CLI env-fails are common (rate-limit/quota → `[ENV_FAIL: provider-rate-limit/quota]`, or a Windows crash → exit 0xC0000409 / empty stdout) — environmental FAIL, not content FAIL. One clean-diff retry, then escape-hatch.
- Codex's strict-assertion blocker on `toBeGreaterThan/toBeLessThan/typeof` is contestable; the reference reading: range/typeof checks ARE concrete for non-deterministic numerics, the banned pattern is `toBeDefined()`/`toBeTruthy()` blanket stubs.
- NEVER mark any arm PASS dishonestly to clear the gate — record the actual verdict (codex/claude/opus) and use the documented escape if needed. See [[feedback_scrutiny_gate_readonly_sessions]], [[project_scrutiny_gate]].

**Wiring:** `.claude/scripts/scrutiny-3way.mjs` (runs the Codex CLI arm, emits `opusReviewerPrompt`+`opusReviewerPromptB` for the two Claude arms; ledger field for arm B is canonical `claudeReviewed`, with `opusBReviewed`/`geminiReviewed` as write aliases normalized via `migrateEntry`). `.claude/helpers/scrutiny-ledger.mjs` + `.test.mjs` (64 tests; run with vitest from the `.claude/helpers/` dir). `.claude/hooks/scrutinize-before-stop.mjs` (Stop hook, in MINIMAL_ALLOWLIST). Ledger: `mcp-server/data/state/SCRUTINY_LEDGER.json`.
