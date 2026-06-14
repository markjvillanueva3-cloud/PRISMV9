---
name: reference-fleet-rate-limit-diagnosis-2026-05-29
description: Fleet "server is temporarily limiting requests" root cause — fleet-wide effortLevel:xhigh (ultracode agent fan-out) × Opus-4.8-default × 1M context; the fix + remaining levers.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.115Z
aliases: reference_fleet_rate_limit_diagnosis_2026_05_29
---


**Fleet rate-limit (429 "server is temporarily limiting requests") diagnosis — 2026-05-29, slot:golf claude-3d26f925**

Symptom: operator ran 26 concurrent chats fine before; now only ~5 stay productive, the rest get throttled nearly every request. Box is healthy (128GB RAM @ ~46%, RTX 4080S idle) → NOT local resource exhaustion. This is Anthropic **org-wide** rate limiting (ITPM/RPM), shared across all sessions.

**Root cause (ranked):**
1. `settings.json` `effortLevel: "xhigh"` + `alwaysThinkingEnabled: true` — a PERSISTENT fleet-wide default (not per-session). `effortLevel: xhigh` = ultracode = "spawn a Workflow / fan-out subagents for every substantial task." So "22 live chats" is really 22 × (parent + N fan-out agents) all drawing the same org rate-limit bucket. `/effort` reports "this session only," but the settings.json key is the inherited default for every new session.
2. CLI v2.1.154 (2026-05-28) made **Opus 4.8 the default model** — far heavier per request than the Sonnet the fleet likely ran when 26 chats worked.
3. **1M context** enabled (`CLAUDE_CODE_DISABLE_1M_CONTEXT=0`) + autocompact at 95% → near-million-token requests.
4. PRISM per-turn hook-injection bloat (~15-20 blocks/turn × every chat), much of it volatile → busts the prompt cache → uncached input billed against ITPM.

**Fix applied:** `effortLevel` xhigh→**high** · `alwaysThinkingEnabled` true→**false** · `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 95→**90** (all in `C:/Users/wompu/.claude/settings.json`; auto-mirrored to H:).

**Why:** removes the per-chat workflow-agent fan-out (the request multiplier) + forced per-turn thinking (token bloat + faster compaction). Dominant lever for BOTH the 429s and the "compacting sooner" complaint.

**How to apply next time:**
- After changing `effortLevel`, the operator MUST **restart the fleet** — running chats keep their session ultracode state; the setting only governs new sessions.
- Remaining levers (operator's call): pin most slots to Sonnet 4.6 (`ANTHROPIC_MODEL` / `--model`); `CLAUDE_CODE_DISABLE_1M_CONTEXT=1`; trim per-turn injection (alpha/sierra domain).
- Org tier + limits: console.anthropic.com/settings/limits (tiers auto-advance on credit deposit).
- Do NOT "fix" with fast mode — it burns 2× rate, the opposite of what you want when throttled.

Galaxy brain: `mcp-server/src/engines/fleet-hygiene/MEMORY.md`. Related: [[feedback_psn_definition]], token-optimization galaxy (alpha).
