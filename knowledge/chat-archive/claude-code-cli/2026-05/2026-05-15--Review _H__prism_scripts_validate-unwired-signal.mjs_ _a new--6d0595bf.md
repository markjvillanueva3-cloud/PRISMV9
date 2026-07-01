---
type: "chat-session"
source: "claude-code-cli"
session_id: "6d0595bf-26fa-4329-b16e-462ca941e240"
title: "Review `H:/prism/scripts/validate-unwired-signal.mjs` (a new dev-tooling script "
date: "2026-05-15"
first_ts: "2026-05-15T14:37:03.150Z"
last_ts: "2026-05-15T14:40:09.754Z"
cwd: "H:\\prism\\mcp-server"
messages: 14
user_msgs: 6
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/6d0595bf-26fa-4329-b16e-462ca941e240/subagents/agent-a76c8e56eeb38418c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review `H:/prism/scripts/validate-unwired-signal.mjs` (a new dev-tooling script 

> **claude-code-cli** | 2026-05-15 | 14 msgs (6 user / 8 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/6d0595bf-26fa-4329-b16e-462ca941e240/subagents/agent-a76c8e56eeb38418c.jsonl`

## Transcript

### User | 2026-05-15T14:37:03.150Z

Review `H:/prism/scripts/validate-unwired-signal.mjs` (a new dev-tooling script just created in slot bravo, claude-6d0595bf).

**Purpose:** Independent verifier for the NEEDS_WIRING signal produced by `scripts/audit-unwired-engines.mjs` and surfaced via `state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json` + `state/shared/BUILD_STATE.json`. CLAUDE.md regression note 2026-05-14 calls this `U-HVA-UNWIRED-SIGNAL-VALIDATE` and specifies: samples 50 random NEEDS_WIRING engines + greps every dispatcher for imports + reports false-positive rate ≤ 10% to gate downstream wiring milestones.

**Initial run results (sanity check):** sample=50/870, seed=42 → 5 truly-unwired, 10 false-positive-wired, 35 weak-signal, 0 exempt → 20% FP rate → FAIL verdict (correctly).

**Your job — read the file end-to-end** (≈340 lines) and grade PASS/FAIL with P0/P1/P2/P3 findings. Particularly check:

1. **Correctness of detection patterns** — `buildSearchPatterns()` constructs 6 regex strategies (namedImport / instanceImport / defaultOrNamespace / construct / typeRef / propAccess / dynamicImport / reExport). Are these regexes sound? Will they false-match or miss real wiring? Are there ReDoS concerns (catastrophic backtracking)?
2. **Deterministic sampling** — `sampleDeterministic()` uses Fisher-Yates partial shuffle with mulberry32 PRNG seeded from `--seed`. Trace it carefully for n=3 idx.length=5 — does it really pick 3 unique random elements? Does it bias the distribution?
3. **Consumer classification** — `classifyConsumerFile()` categorises files by relative-path prefix. Does the test-file detection (`startsWith("__tests__/") || endsWith(".test.ts")`) catch all test patterns in the repo? Are `singleton` and `orchestrator` detected correctly (basename regex `Singleton$` / `Orchestrator/i`)?
4. **Wiring strategy: STRONG vs WEAK** — the threshold for "false-positive-wired" requires at least one match in dispatcher/route/registry/hook/orchestrator/singleton consumer file. Test-file or cross-engine
... [+1069 chars truncated]

### Assistant | 2026-05-15T14:37:11.415Z

I'll review the validator script end-to-end, cross-referencing against the audit script it's meant to verify.

### Assistant | 2026-05-15T14:37:11.621Z

[tool_use: Read]

### User | 2026-05-15T14:37:14.574Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * validate-unwired-signal.mjs
4	 * ===========================
5	 * Independent verifier for the NEEDS_WIRING signal produced by
6	 * `scripts/audit-unwired-engines.mjs` + surfaced through
7	 * `state/shared/BUILD_STATE.json` + `state/shared/UNWIRED-ENGINE-AUDIT-*.json`.
8	 *
9	 * Problem (CLAUDE.md regression 2026-05-14):
10	 *   The audit's NEEDS_WIRING list has a 
... [+20299 chars truncated]

### Assistant | 2026-05-15T14:37:18.404Z

Now let me cross-reference against the audit script and check the sibling for style consistency.

### Assistant | 2026-05-15T14:37:19.429Z

[tool_use: Bash]

### Assistant | 2026-05-15T14:37:20.935Z

[tool_use: Bash]

### Assistant | 2026-05-15T14:37:21.662Z

[tool_use: Bash]

### User | 2026-05-15T14:37:28.687Z

[tool_result] 292 H:/prism/scripts/audit-unwired-engines.mjs

### User | 2026-05-15T14:37:30.512Z

[tool_result] #!/usr/bin/env node
/**
 * high-value-additions-rank.mjs
 * =============================
 * Re-runnable leverage ranker for PRISM dev-process additions.
 * META artifact for HIGH-VALUE-ADDITIONS-AUDIT-2026-05-14.
 *
 * Measures (as baselines re-measurable on every run):
 *   1. Hook orphan rate            — source files vs settings.json wired
 *   2. Zero-action dispatchers     — dispatchers with
... [+879 chars truncated]

### User | 2026-05-15T14:37:32.880Z

[tool_result] H:/prism/state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json

### Assistant | 2026-05-15T14:37:35.975Z

[tool_use: Read]

### User | 2026-05-15T14:37:44.258Z

[tool_result] 1	#!/usr/bin/env node
2	// audit-unwired-engines.mjs
3	// Deep scan of canonical engines folder. Classifies each engine as:
4	//   WIRED-DIRECT       — imported by a dispatcher
5	//   WIRED-VIA-ROUTE    — imported by routes/*.ts (consumed by MCP server)
6	//   WIRED-VIA-REGISTRY — imported by registries/*.ts
7	//   WIRED-VIA-ORCH     — imported by *Orchestrator*.ts
8	//   WIRED-VIA-SINGLETON — wra
... [+13498 chars truncated]

### Assistant | 2026-05-15T14:40:09.754Z

Acknowledged on the read-once hook — I have the audit script already in context (`H:/prism/scripts/audit-unwired-engines.mjs`, 292 lines) so I won't re-read it. I have everything I need to grade.

---

# Code Quality Analysis Report — `H:/prism/scripts/validate-unwired-signal.mjs`

## Summary
- **Overall Quality Score: 6.5/10**
- **Files Analyzed:** 1 (validator) + 1 cross-ref (audit generator)
- **Issues Found:** 4 P0, 6 P1, 5 P2, 4 P3
- **Verdict: FAIL** (P0-1 + P0-2 are correctness-critical and will both *miss real wiring* and *over-flag false positives*. The validator must catch wiring the audit misses — that is its single load-bearing job — and it currently has detection holes large enough to drive the audit through.)

The script is well-structured, readable, has thoughtful schema-variant handling, deterministic sampling, and clean separation of concerns. But several regex / sampling / consumer-set bugs invert the meaning of the verdict in important cases. Given the gate threshold is 10% and the sanity-check observed 20%, even a couple of mis-classifications shift the verdict — accuracy of *individual classifications* matters here, not just aggregate.

---

## Critical Issues (P0 — must fix before merge)

### P0-1. `sampleDeterministic()` is biased + does not pick `n` unique elements when `n` is small relative to `arr.length`
**File:** `H:/prism/scripts/validate-unwired-signal.mjs:173-183`
**Severity:** High — load-bearing correctness defect.

The loop runs from `i = idx.length - 1` down to `i = idx.length - n` exclusive (`i > idx.length - 1 - n`), so it runs exactly `n` iterations — good. But on each iteration it picks `j ∈ [0, i]` and *swaps `idx[i] ↔ idx[j]` even when `j < idx.length - n`*. That part is fine — that's standard partial Fisher-Yates. **The actual bug is the slice direction:**

```js
return idx.slice(idx.length - n).map(i => arr[i]);
```

After `n` swap iterations starting from the tail, the **last `n` slots** hold the random sample. That's corr
... [+20793 chars truncated]
