---
name: reference_smart_executor_contract
description: resolveExecutor() in scripts/lib/smart-executor.mjs — the /smart executor-routing contract (ollama/haiku/sonnet/opus per step) for token savings
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.208Z
aliases: reference_smart_executor_contract
---


`scripts/lib/smart-executor.mjs` exports `resolveExecutor(task, opts) -> {executor, model, tier, reason}` (commit `51f3615975`, slot:alpha, 2026-06-11) — the **/smart executor-routing contract** that `goal-prereq-inject.mjs` /goal pre-flight had NAMED ("the /smart executor contract (resolveExecutor -> ask-ollama.mjs, $0)") but which was never built (a dormant promise; grep found 0 implementations in scripts/). Now real + tested.

- **4 lanes, cheapest-qualified-wins, safety overrides:** ollama ($0 local GPU — mechanical text ops: summarize/explain/docstring/classify/lint/diff/triage/extract/search/read/count) · haiku (light structured judgment: pick/rank/tag) · sonnet (medium reasoning / multi-file edits: draft/generate/fix/review) · opus (deep reasoning / safety / physics / orchestration — safe DEFAULT for unknowns).
- **Safety-first:** `safe*|physics|kienzle|taylor|constant*|formula*|architect*|secur*|consensus|invariant*|threat*|orchestrat*|omega` force opus and NEVER offload — even when a mechanical verb is present (adversarial-tested: "lint the kienzle formula" -> opus).
- **Model roster (Blackwell):** ollamaCode=qwen2.5-coder:32b, ollamaDeep=gpt-oss:120b, ollamaMid=gpt-oss:20b, ollamaTrivial=qwen2.5-coder:1.5b; opus=claude-opus-4-8, sonnet=claude-sonnet-4-6, haiku=claude-haiku-4-5-20251001.
- **Pure core + CLI:** `node scripts/lib/smart-executor.mjs "<task>"` -> JSON route. 14 node:test (null-safe, lane ordering, adversarial safety-override). **Regex lesson:** prefix-stems need `\w*`, NOT a trailing `\b` — `\bsummar\b` fails on "summarize" (r->i has no word boundary); the first build shipped 3 failing tests from exactly this. Keep ambiguous short words (read/list/count) EXACT to avoid "already"/"listen" false positives.
- **Wired:** active /smart skill Step 3.5 (`H:/.claude/skills/smart/SKILL.md`). **Complementary to (not a dup of):** `.claude/hooks/ollama-task-offloader.mjs` `classifyPrompt` (binary ollama-vs-claude, whole-prompt, hook-layer) + `mcp-server/src/engines/AISystemRouterEngine.ts` `classify` (task-class) — this adds the **haiku/sonnet middle tier + per-step model selection**.
- **Open follow-ups (next loop units, by ROI):** (a) AUTO-FIRE wiring — have the offloader hook / a UserPromptSubmit consume resolveExecutor so routing is automatic, not just doc-referenced; (b) reconcile the **4 divergent /smart copies** (`H:/.claude/skills/smart/SKILL.md` [active], `C:/.claude/commands/smart.md`, `H:/prism/.claude/commands/smart.md` [8.5KB, newest Jun-10], `H:/prism-slot-alpha/.claude/commands/smart.md`) — copy-sprawl risks drift, same class as the awareness-hook wired-vs-project gap; (c) apply the same AI-leverage routing update to /loop /goal /yolo-mode + link the token-optimization galaxy into zulu (hermes + obsidian-vault capabilities).
- **Build-lane lessons (reconfirmed this session):** authored `~/.claude/` content (commands/agents/hooks/skills/rules/plans) must be edited on **H:\\.claude\\** — a drive-enforcement guard blocks C: edits and redirects to H:. Slot libs (`scripts/`, non-harness-exec) commit cleanly from the slot worktree via `git -C H:/prism-slot-alpha` — a BARE `git` ran against the main tree (cad-fusion-live-ms0) and tripped `slot-commit-enforce`. Related: [[reference_alpha_token_awareness_surface]] (the awareness self-heal + wired-vs-project-copy gotcha).
