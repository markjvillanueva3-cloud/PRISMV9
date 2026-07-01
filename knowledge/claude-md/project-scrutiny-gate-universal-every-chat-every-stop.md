---
source: project
section: SCRUTINY GATE (UNIVERSAL — every chat, every Stop)
slug: scrutiny-gate-universal-every-chat-every-stop
indexed_at: 2026-06-23T02:05:18.081Z
---

## SCRUTINY GATE (UNIVERSAL — every chat, every Stop)

A Stop hook (`.claude/hooks/scrutinize-before-stop.mjs`) **blocks** task completion when the session has uncommitted file changes and the scrutiny ledger lacks a 3-of-3 PASS entry. **Strict 3-of-3 consensus** — Codex CLI + Claude reviewer A (holistic) + Claude reviewer B (independent second pass) — is required; single-reviewer drift is not load-bearing for clearance. (3-of-3 policy adopted 2026-05-05; the arm-2 reviewer was the Gemini CLI until 2026-05-12, then swapped for a 2nd Claude reviewer agent — the CLI's daily-quota / trust-dir env failures kept stalling the gate.)

To finish a task you MUST:
1. **Run the script** against the session diff (emits THREE Claude-reviewer prompts; no external CLI is spawned):
   ```bash
   node .claude/scripts/scrutiny-3way.mjs --session-id <id-from-block-message>
   # or: --target HEAD (last commit) | --target <sha> (specific commit)
   ```
   It emits three reviewer prompts in the JSON output: `opusReviewerPrompt` (arm A), `opusReviewerPromptB` (arm B), `analystReviewerPrompt` (arm C). (The diff is captured with a 120 s git timeout — was 8 s, which timed out on this repo — and excludes auto-regenerated noise dirs; `PRISM_SCRUTINY_GIT_TIMEOUT_MS` / `PRISM_SCRUTINY_NO_DIFF_FILTER=1` override.) An optional Ollama pre-flight (deepseek-r1:14b) runs as an advisory arm only — does NOT block the 3-of-3. An optional **Codex CLI review arm** (`codex exec review`, default-on; `PRISM_SCRUTINY_CODEX=off` disables) is surfaced the same way: the JSON output carries a `codexReviewCommand` that the chat runs via Bash in parallel with the three Claude agents. Advisory only — it never marks the ledger and degrades to `skipped` on any Codex quota/auth/offline failure, so it cannot stall the gate (the failure mode that retired Codex *as a gate arm* 2026-05-13). Added 2026-05-18; wiki [[codex-review-arm]].
2. **Dispatch ALL THREE Claude PRISM agents in parallel** in one tool block (single message, three parallel tool calls):
   ```js
   Agent({ subagent_type: 'reviewer',      description: 'Review session diff (3way reviewer A)',                 prompt: <opusReviewerPrompt> })
   Agent({ subagent_type: 'reviewer',      description: 'Review session diff (3way reviewer B — independent)',   prompt: <opusReviewerPromptB> })
   Agent({ subagent_type: 'code-analyzer', description: 'Review session diff (3way reviewer C — analyst)',       prompt: <analystReviewerPrompt> })
   ```
   Arm B is weighted toward test integrity / dispatcher-wiring completeness / inlined-constant detection (does NOT assume arm A caught everything). Arm C is weighted toward silent breakage / regression risk / I/O security / error-budget completeness / integration coupling (does NOT assume A or B caught everything).
3. **Record all three verdicts** when the agents return (use `fail` instead of `pass` for any FAIL — the gate keeps blocking until arms A + B + C are all PASS):
   ```bash
   node .claude/scripts/scrutiny-3way.mjs --mark-opus    pass --session-id <id> --notes "<reviewer A summary>"
   node .claude/scripts/scrutiny-3way.mjs --mark-claude  pass --session-id <id> --notes "<reviewer B summary>"
   node .claude/scripts/scrutiny-3way.mjs --mark-analyst pass --session-id <id> --notes "<reviewer C summary>"
   # --mark-claude  is the arm-B mark; --mark-opus-b / --mark-gemini are accepted aliases.
   # --mark-analyst is the arm-C mark; --mark-codex is accepted as a legacy alias.
   ```

The hook is in `MINIMAL_ALLOWLIST` so `PRISM_HOOK_PROFILE` cannot disable it. After 3 block attempts the gate auto-passes with a warning (escape hatch). Ledger lives at `mcp-server/data/state/SCRUTINY_LEDGER.json` keyed by session id; arm A is stored as `opusReviewed`, arm B as `claudeReviewed` (legacy `geminiReviewed` / transitional `opusBReviewed` flags accepted as aliases), and arm C as `codexReviewed` (the slot keeps its pre-2026-05-13 name for backward compat with existing ledger entries — the *invocation* is now a Claude `code-analyzer` agent, not Codex). Legacy `selfReviewed && agentReviewed` entries (pre-3way) still clear via backward-compat fallback in `scrutiny-ledger.mjs:isCleared()`.
