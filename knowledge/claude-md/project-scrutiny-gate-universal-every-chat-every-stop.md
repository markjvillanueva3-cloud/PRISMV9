---
source: project
section: SCRUTINY GATE (UNIVERSAL — every chat, every Stop)
slug: scrutiny-gate-universal-every-chat-every-stop
indexed_at: 2026-05-05T19:35:18.169Z
---

## SCRUTINY GATE (UNIVERSAL — every chat, every Stop)

A Stop hook (`.claude/hooks/scrutinize-before-stop.mjs`) **blocks** task completion when the session has uncommitted file changes and the scrutiny ledger lacks a 3-of-3 PASS entry. **Strict 3-of-3 multi-CLI consensus** (Codex + Gemini + Opus) is required — single-reviewer drift is no longer load-bearing for clearance (policy adopted 2026-05-05).

To finish a task you MUST:
1. **Run Codex + Gemini in parallel** against the session diff:
   ```bash
   node .claude/scripts/scrutiny-3way.mjs --session-id <id-from-block-message>
   # or: --target HEAD (last commit) | --target <sha> (specific commit)
   ```
   The script auto-records `--codex` and `--gemini` marks based on each CLI's `VERDICT:` line and emits an `opusReviewerPrompt`.
2. **Dispatch the Claude Opus reviewer agent in parallel** with step 1:
   ```js
   Agent({ subagent_type: 'reviewer',
           description: 'Review session diff (3way Opus arm)',
           prompt: <opusReviewerPrompt from step 1 output> })
   ```
3. **Record the Opus verdict** when the agent returns:
   ```bash
   node .claude/scripts/scrutiny-3way.mjs --mark-opus pass --session-id <id> --notes "<one-line summary>"
   # or --mark-opus fail if the agent reported FAIL — gate stays blocked
   ```

The hook is in `MINIMAL_ALLOWLIST` so `PRISM_HOOK_PROFILE` cannot disable it. After 3 block attempts the gate auto-passes with a warning (escape hatch). Ledger lives at `mcp-server/data/state/SCRUTINY_LEDGER.json` keyed by session id. Legacy `selfReviewed && agentReviewed` entries (pre-3way) still clear via backward-compat fallback in `scrutiny-ledger.mjs:isCleared()`.
