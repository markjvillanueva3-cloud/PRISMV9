---
name: Scrutiny gate behavior on read-only sessions (3-of-3 policy)
description: When the strict 3-of-3 scrutiny gate blocks a session that authored zero edits (or an arm env-fails), prefer the documented auto-escape — never fake-pass an arm
aliases: feedback_scrutiny_3of3_readonly
type: feedback
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
source: prism-memory
synced: 2026-06-27T20:30:46.443Z
---


Strict 3-of-3 scrutiny reviews the **uncommitted diff in the working tree**, not just edits authored by the current chat. Adopted 2026-05-05; arm lineup evolved 2026-05-12 (Gemini CLI → Claude reviewer B); evolved again 2026-05-13 (Codex CLI → Claude `code-analyzer`, arm C) on user directive *"update the 3 way scrutiny to just only use claude prism agents"*. Current lineup is **three independent Claude PRISM agents, NO external CLI dependencies**:
- **arm A** — Claude `reviewer` (holistic acceptance criteria)
- **arm B** — Claude `reviewer` (independent — test integrity / dispatcher wiring / inlined constants / scope discipline)
- **arm C** — Claude `code-analyzer` (analyst — silent breakage / regression risk / I/O security / error-budget completeness / integration coupling)

In multi-chat setups (~6 concurrent chats), a session that did pure research/reading can still hit a FAIL on 100KB+ of work belonging to peer chats.

**Why:** the 3-of-3 design deliberately catches single-reviewer drift and stub-tolerance regressions; the auto-escape after 3 block attempts is the documented release valve for false-positive cases — "do not abuse" means do not abuse, not "never use." Codex CLI was retired because its 80 KB context limit truncated PRISM-scale commits, producing unresolvable diff-truncated FAILs that the operator couldn't fix without splitting the commit. Replacing it with a Claude agent (which sees the full diff via the Agent tool) eliminated that failure mode.

**How to apply:**
- Session authored ZERO edits → use auto-escape: hit Stop 3 times, gate clears with a warning. Don't burn tokens on a 4th scrutiny round.
- Session authored real edits but the diff is huge → COMMIT first, then `scrutiny-3way.mjs --target HEAD` — scopes review to the last commit. (`captureDiff` with no `--target` diffs the whole working tree; on a 7000+-uncommitted-file repo that's MB of state-file churn → truncates to 80KB → reviewers get a "diff-truncated" stub and FAIL. The git-diff timeout was bumped 8s→120s, and noise dirs are excluded, in `[INFRA-SCRUTINY-FIX]`.)
- All three Claude arms are dispatched by the chat via `Agent({subagent_type:'reviewer'|'code-analyzer', prompt:<opusReviewerPrompt|opusReviewerPromptB|analystReviewerPrompt from scrutiny-3way.mjs output>})`. Dispatch all three in parallel (single message, three Agent tool calls).
- Record verdicts with: `--mark-opus pass` (arm A) + `--mark-claude pass` (arm B; `--mark-opus-b` / `--mark-gemini` are accepted aliases) + `--mark-analyst pass` (arm C; `--mark-codex` is accepted as legacy alias).
- The optional Ollama pre-flight (qwen2.5-coder:32b) is purely advisory and does NOT block the 3-of-3. `PRISM_SCRUTINY_PREFLIGHT=parallel` (default) runs it alongside; `=gate` runs it first as a cloud-saver gate; `=off` disables.
- NEVER mark any arm PASS dishonestly to clear the gate — record the actual verdict and use the documented 3-block escape if needed. See [[feedback_scrutiny_gate_readonly_sessions]], [[project_scrutiny_gate]].

**Wiring:** `.claude/scripts/scrutiny-3way.mjs` (emits `opusReviewerPrompt` + `opusReviewerPromptB` + `analystReviewerPrompt`; the codex spawn was removed 2026-05-13). `.claude/helpers/scrutiny-ledger.mjs` + `.test.mjs` (vitest). `.claude/hooks/scrutinize-before-stop.mjs` (Stop hook, in MINIMAL_ALLOWLIST). Ledger: `mcp-server/data/state/SCRUTINY_LEDGER.json`. Ledger field names (back-compat with pre-2026-05-13 entries — the Codex arm slot keeps its old name but is now set by a Claude agent): arm A = `opusReviewed`, arm B = `claudeReviewed` (legacy `geminiReviewed`/`opusBReviewed` aliased), arm C = `codexReviewed` (legacy slot name; new Claude `code-analyzer` invocation).
