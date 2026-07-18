---
title: OLLAMA-BASH-OUTPUT-ADVISORY -- close the last uncovered offload surface (Bash output)
tags: [ollama, offload, hooks, token-economy, charlie, posttool]
slot: charlie
status: built
created: 2026-06-30
---

# OLLAMA-BASH-OUTPUT-ADVISORY -- route large gist-only Bash output to the free local model

## Why (the gap this closes)

Operator directive 2026-06-30: *"ollama models now available for free which we need to drastically increase usage on."* A read-only audit of the offload substrate found the local-LLM offload rate stuck at **25.8%** (71 offloaded / 204 kept-on-Claude; target >=30%). The 17 free models are live and the routers name them correctly -- so it was **not** a model-wiring gap.

The real cause: **four of five tool surfaces are wired to Ollama routers, but Bash command OUTPUT is not.**

| Surface | Ollama routing | Hook |
|---|---|---|
| `Read` (file content) | YES | `ollama-route-pretooluse` + `large-read-digest-advisory` + `posttool-ollama-offload-nudge` |
| `Grep`/`Glob` | YES (index-first) | `grep-index-first` |
| `UserPromptSubmit` (explain/summarize/classify) | YES | `ollama-task-offloader` + `ollama-auto-router` |
| **`Bash` command OUTPUT** (build logs, `tsc`/`vitest`, `git diff`, `grep`/`find` dumps) | **NO -- before this** | `ollama-bash-output-advisory` (NEW) |

Bash output is the single highest-token surface in any build/test/debug session, and it had **zero** automatic Ollama routing -- its traffic never even landed in the offload dashboard, so the 25.8% was measured blind to it.

## What it does (honest -- R12)

`PostToolUse:Bash` fires *after* the command ran, so the hook cannot re-route the command. It instead:
1. Classifies the completed `(command, output)` as **gist-only bulk** (build/test/diff logs, long grep/find/ls enumerations, large non-structured dumps) vs **keep-verbatim** (small output, single values, structured JSON a step parses).
2. On a gist-only match >= threshold, emits a **suggest-only** advisory: pipe the next analogous read through `node scripts/ask-ollama.mjs {error-triage|summarize} -` (free, offline, qwen2.5-coder:32b).
3. Bumps `byHook["ollama-bash-output-advisory"]` in the shared `mcp-server/data/state/ollama-offload-stats.json` -- so the Bash surface becomes **visible** on the dashboard.

Suggest-only, exactly as `ollama-route-pretooluse` shipped before its auto-mode was proven safe. **Fails open**; a stats-write failure never breaks the tool call.

## Classifier (verb-anchored, not path-matched)

- **build_test_log** -> `error-triage`: `npm run build`, `tsc`, `vitest`/`jest`/`pytest`, `cargo build|test`, `git diff|log|show`, `docker build|logs`, `eslint`.
- **enumeration** -> `summarize`: `grep`/`rg`/`find`/`ls`/`tree`/`git status` with >=40 output lines.
- **bulk_output** -> `summarize`: any command with >=~12KB + >=60 lines that is not leading-`[`/`{` (structured JSON kept, likely parsed downstream).
- The verb is anchored to the invoked command (`cat src/__tests__/foo.test.ts` does NOT match -- the verb is `cat`, the path merely contains "test").

## Not a duplicate (R8/dedup)

- `posttool-ollama-offload-nudge` -- **Read surface only** (`if (toolName !== "Read") return null`). This is its Bash-surface sibling.
- `ollama-auto-router` -- **UserPromptSubmit**, sees only prompt TEXT, never tool output.
- `ask-ollama.mjs summarize -` stdin path -- 100% manual (Claude must remember to pipe). This makes it automatic + measured.

## Files

| File | Role |
|---|---|
| `.claude/hooks/ollama-bash-output-advisory.mjs` | the hook (`classifyBashOutput` / `buildAdvisory` / `extractBashIO` / `updateOffloadStats`) |
| `.claude/hooks/ollama-bash-output-advisory.test.mjs` | 18 real-value tests (happy + keep-verbatim + adversarial + stats RMW) |
| `.claude/hooks/bundles/posttool-bash-read-bundle.mjs` | wires it into the live `PostToolUse:Bash` bundle |

## Knobs

- `PRISM_OLLAMA_BASH_ADVISORY_DISABLE=1` -- off entirely.
- `PRISM_OLLAMA_BASH_ADVISORY_MIN_BYTES=<n>` -- min output bytes to consider (default 4000).
- `PRISM_OLLAMA_BASH_ADVISORY_VERBOSE=1` -- include the matched classify reason in the note.

## Sibling audit findings (verified 2026-06-30, not yet built)

The audit that produced this hook surfaced two more Ollama-routing gaps, both lower-priority than the Bash surface:

1. **Settings-drift auditability blind spot (VERIFIED by grep).** `ollama-auto-router` + `ollama-task-offloader` (the UserPromptSubmit offload routers, 946+408 live byHook events) are wired **only** in the project-local `H:/prism/.claude/settings.json` (count 2), and are **absent from both `C:/Users/wompu/.claude/settings.json` (0) and `H:/.claude/settings.json` (0)** -- the two files the c-to-h-mirror doctrine treats as canonical. They fire correctly today (Claude Code merges project + global settings), so this is an **auditability** defect, not a functional outage: anyone editing the canonical C: file or running `mirror-c-to-h-audit.mjs` will not see them. **Recommended fix = DOCUMENT (this note), do NOT relocate** -- moving working hooks risks breaking live wiring for zero functional gain, and double-wiring if both files load. A deliberate move belongs in a golf-slot settings-hygiene pass.

2. **UserPromptSubmit conversion leak.** `ollama-task-offloader` only fires an *imperative* auto-exec directive when `detectFileTarget` finds a concrete path in the prompt; a fileless "explain/summarize X" silently downgrades to a soft suggestion the hook admits Claude may ignore. Loosening `detectFileTarget` (or having the hook self-execute via `prism_local:local_generate`) would lift the UserPromptSubmit conversion rate -- a real build for a healthy shell.

Ruled-out red herrings: the 5 vision models are consumed by the xray blueprint-OCR pipeline (separate telemetry, not the offload dashboard -- a measurement blind spot, not idle assets); `ollama-route-recommender` + `ollama-route-check-inject` are dead-code (unwired, negligible volume).

## Related

[[ollama-pipeline-ms0]] (the offload substrate) - [[ollama-expand-ms0]] (`ask-ollama.mjs`) - `posttool-ollama-offload-nudge` (the Read-surface sibling) - [[feedback_ollama_token_routing]] (the routing doctrine). Memory: [[reference_ollama_bash_output_advisory_2026_06_30]].
