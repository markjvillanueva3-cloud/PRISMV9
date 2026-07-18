---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "You are the SYNTHESIS agent. Below are 3 discovery reports (token-savings, conte"
date: "2026-06-09"
first_ts: "2026-06-09T03:55:59.589Z"
last_ts: "2026-06-09T03:58:41.659Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_95cca8c5-500/agent-ad51671bbab198faa.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# You are the SYNTHESIS agent. Below are 3 discovery reports (token-savings, conte

> **claude-code-cli** | 2026-06-09 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_95cca8c5-500/agent-ad51671bbab198faa.jsonl`

## Transcript

### User | 2026-06-09T03:55:59.589Z

You are the SYNTHESIS agent. Below are 3 discovery reports (token-savings, context-retention, local-LLM/Blackwell leverage) for the PRISM repo. Merge into ONE ranked list of the highest-value system improvements. Dedup overlaps. For each: title, which lens(es), evidence (file:line), estimated value, effort (S/M/L), and dependency order (what must come first). Put the single highest-value/lowest-effort item first. Be concrete — this becomes the next build queue. Return prose (NOT JSON).

### LENS: token-savings
I now have the smoking gun and the full picture. The `mcp-route-suggest.mjs` doctrineSurface nudge has a 24h rate-limit keyed by `(session, file)` — but it's STILL firing on every distinct doctrine file I Read this session, and the take-rate advisory (`formatTakeRateAdvisory`) appends the 3-line `38/5833 (0.7%)` footer to EVERY nudge regardless. At 0.7% take-rate over 5833 fires, this footer is provably unactioned context burn — the hook itself documents the failure. This is my #1 finding.

I have enough evidence for the top 5. Let me do one final check: confirm the per-slot domain injectors are actually wired (they are, per the settings.json dump) and quantify the doctrineSurface rate-limit gap (it's per-file, not per-session, so it re-fires for each new doctrine file).

The evidence is complete. Here is my ranked list.

---

## Top 5 token-saving opportunities (NOT yet shipped)

### 1. `mcp-route-suggest.mjs` take-rate advisory + doctrineSurface nudge — fires on EVERY Read/Bash, ~0.7% acted on (LIVE-PROVEN waste)
**Evidence:** `mcp-route-suggest.mjs:308-323` (`formatTakeRateAdvisory`) appends a 3-line footer `_Fleet take-rate: 38/5833 (0.7%) — route nudges are firing but largely unactioned…_` to every nudge, and `:651-661` (`doctrineSurface`) emits `"Doctrine/command surface: verify the command bridge…"` on every Read of a `.claude/**` or `state/shared/**` file. This transcript is the proof: the identical `→ Take this route now: prism_session:dispatcher_map_
... [+25823 chars truncated]

### Assistant | 2026-06-09T03:56:05.565Z

I'll synthesize the three discovery reports into one ranked build queue. Let me first verify a couple of the highest-value, lowest-effort claims before locking the ranking — specifically the dedup-library reuse pattern and the MEMORY_SEED orphan, since those anchor the top of the list.

### Assistant | 2026-06-09T03:56:08.862Z

[tool_use: Bash]

### Assistant | 2026-06-09T03:56:12.269Z

[tool_use: Bash]

### User | 2026-06-09T03:57:05.542Z

[tool_result] Exit code 255
=== injection-dedup.mjs exists? ===
-rw-r--r-- 1 wompu 197611 4028 May 23 22:22 scripts/lib/injection-dedup.mjs
=== MEMORY_SEED grep (writer + any reader?) ===

### User | 2026-06-09T03:57:10.491Z

[tool_result] === formatTakeRateAdvisory present? ===
84:  if (msg.includes("Doctrine/command surface")) return "doctrineSurface";
185:// take-rate sits at ~0.4% (1/284). Routes are wired but the model isn't
196:// take-rate advisory that says "prefer the MCP action it names" — but several
197:// classifiers (doctrineSurface, backendAuditChain, isBroadGlob) emit a nudge
217:  doctrineSurface:   "prism_session:d
... [+495 chars truncated]

### Assistant | 2026-06-09T03:57:16.793Z

The MEMORY_SEED grep returned empty (the `||` short-circuit on the dedup-ls error killed the chained echo before it printed), but the key signals confirm: `injection-dedup.mjs` exists, the per-slot injectors all return `0` dedup imports, and `mcp-route-suggest.mjs` documents its own ~0.4% take-rate. Let me confirm the MEMORY_SEED reader-absence and the auto-route knob cleanly.

### Assistant | 2026-06-09T03:57:20.615Z

[tool_use: Bash]

### User | 2026-06-09T03:57:24.765Z

[tool_result] === MEMORY_SEED occurrences across hooks/scripts/helpers ===
.claude/hooks/handoff-memory-seed-stop.mjs
scripts/handoff-memory-seed.mjs
scripts/_restore-continuity-hooks.mjs
--- does session-start-auto-resume read it? ---
0
=== ollama auto-route knob ===
14: * default it only NUDGES (additionalContext suggesting /ollama-summarize); the
15: * automatic substitute-and-deny path is opt-in via PRISM_O
... [+819 chars truncated]

### Assistant | 2026-06-09T03:58:41.659Z

Verification complete. Both writer files for MEMORY_SEED are confirmed (`handoff-memory-seed-stop.mjs` + `scripts/handoff-memory-seed.mjs`, plus the restore script), and `session-start-auto-resume.mjs` reads it `0` times — the orphan is real. The ollama auto-route knob, the node-RTK advisory gap, the dedup library, and the route-suggest take-rate are all confirmed. Here is the merged ranked build queue.

---

# PRISM SYSTEM-IMPROVEMENT BUILD QUEUE — synthesized from 3 lenses

Three lenses (token-savings, context-retention, local-LLM/Blackwell) surfaced 15 findings. After dedup and cross-lens merging, 11 distinct items remain. Ranked by value÷effort, with the single highest-value/lowest-effort item first. A recurring meta-theme spans all three: **the infrastructure is built and firing, but conservative defaults (suggest-not-act, no-dedup, single-not-batch, Claude-only) leave the value on the table.**

---

## TIER 1 — ship first (S-effort, proven-pattern or one-flag, fleet-wide)

### 1. Adopt `injection-dedup.mjs` in the 9 per-slot domain injectors + `psn-leg-state-inject` (10 hooks)
- **Lens:** token-savings (findings #2, #3)
- **Evidence:** `scripts/lib/injection-dedup.mjs` confirmed present (4028 bytes). All slot injectors confirmed importing it **0 times**: `foxtrot-mill-awareness-inject.mjs`, `whiskey-lathe-context-inject.mjs`, `delta-cad-awareness-inject.mjs`, `xray-blueprint-domain-inject.mjs`, `echo-post-domain-inject.mjs`, plus charlie's two + `psn-leg-state-inject.mjs:507-574`. The exact dedup pattern is already proven live in `slot-soul-inject.mjs:76-89`.
- **Value:** ~5,000–12,000 tokens/slot/session suppressed after first-emit (foxtrot ~700 tok/prompt × 10–20 prompts/loop). Largest *aggregate* token win because it's a proven fix replicated ×10.
- **Effort:** S (×10 ~10-line drops of an existing lib — clone-don't-fork, R15-compliant).
- **Depends on:** nothing. Ships immediately.
- **Why #1:** lowest risk (copying a pattern already running in production),
... [+11457 chars truncated]
