---
name: feedback_auto_route_mechanical_fanout_to_ollama
description: "Mechanical fan-out (inventory/grep/summarize/classify, per-file/per-galaxy/fleet-wide) -> smartFanout -> local Ollama, NEVER a Claude agent burst (the 5.8M-token rate-limit lesson)"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.399Z
aliases: feedback_auto_route_mechanical_fanout_to_ollama
---


When you are about to **fan out many mechanical tasks** (inventory, grep, summarize, classify, extract,
format -- especially "for each galaxy / per-file / across all galaxies / fleet-wide"), do NOT spawn a
burst of Claude `agent()` calls. That is the exact pattern that tripped Anthropic's **server-side**
rate limit and wasted ~5.8M tokens on a 34-agent CAD-coverage workflow (2026-06-12).

**Why:** the work was deterministic search + summarization -- it had no business on the Claude API. The
local Blackwell GPU does it for free with no RPM limit. The `ollamaFanout` primitive already existed
(`scripts/lib/ollama-fanout.mjs`, bravo 2026-06-09) but nothing auto-invoked it, so I reached for
`agent()` and burned the quota. The operator's fix request: *"find a better way to auto invoke ollama
since you didn't use it when you should have."*

**How to apply:**
1. **Prefer CODE (R5):** a coverage/inventory/audit is a search problem -- do the deterministic part in
   a script (grep/scan/score), reserve the model only for genuine synthesis. (`scripts/cad-gen-coverage-meter.mjs`
   is the worked example: PHASE 1 in code, no agents.)
2. **Route the mechanical arm through `smartFanout(tasks)`** (`scripts/lib/smart-fanout.mjs`): it
   classifies each task and sends mechanical -> local Ollama ($0), returns only judgment for Claude.
   Pass `lane:'ollama'` on tasks you KNOW are mechanical. Ollama-down -> Sonnet fallback (never opus).
3. **Reserve Claude `agent()` for judgment/synthesis/safety.** golf's `agent-fanout-pressure-gate.mjs`
   hook is the live enforcement -- it flags a burst/high-concurrency Agent/Workflow spawn and points
   here; heed it, don't `[SCOPED]`-override a mechanical batch.

Proven live: the same per-galaxy task that rate-limited ran as 8 grounded `gpt-oss:120b` notes in 51s,
`{ollama:8, claude:0}`, $0. See [[ollama-autoroute-mechanical-fanout]] (wiki) and
[[feedback_ollama_fallback_sonnet_agents]] (Ollama -> Sonnet -> Opus ladder). Pairs with
[[reference_cad_gen_coverage_audit_2026_06_12]] (the audit that surfaced the failure).
