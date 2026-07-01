---
type: "chat-session"
source: "claude-code-cli"
session_id: "a0a74c41-2bd4-4650-b52c-94b448b82813"
title: "Independent second-pass review of H:/prism/scripts/lib/hook-broker-classifier.mj"
date: "2026-05-22"
first_ts: "2026-05-22T22:49:38.884Z"
last_ts: "2026-05-22T22:51:05.207Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-a5ba6d88b4eafd344.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Independent second-pass review of H:/prism/scripts/lib/hook-broker-classifier.mj

> **claude-code-cli** | 2026-05-22 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-a5ba6d88b4eafd344.jsonl`

## Transcript

### User | 2026-05-22T22:49:38.884Z

Independent second-pass review of H:/prism/scripts/lib/hook-broker-classifier.mjs (just created, ~280 LOC, pure-core ES module).

This is U-DOCKER-HOOK-BROKER-P1: a classifier that will be run over all 601 hooks in .claude/hooks/ to decide which can be safely served from a shared in-process Docker broker vs which must be spawn-isolated. WRONG classification = corrupted broker state in production. Misclassifying a `mutates-process` hook as `module-safe` is a P0.

Read the file end-to-end and audit:
1. **False-positive risk on `module-safe`** — what minimal hook source would mis-classify as module-safe when it shouldn't? E.g. an `export default async function handle(input)` that internally awaits a network call or writes a file — these are runtime side effects the broker would amplify across all chats. Is the classifier protecting against that, or does it only check module-scope code?
2. **String/template/comment escaping in `stripBlockBodies`** — adversarial test: source containing `` `template with ${nested.{braces}}` ``, escaped quotes `"a \"b\" c"`, comment `// has { brace`. Does the counter stay correct?
3. **Regex robustness** — `spawnSync` regex `/\bspawnSync\s*\(/` — will it match an `import { spawnSync } from 'child_process'` line? That would false-positive. Same for `spawn`.
4. **Output budget / DoS** — `topMutators.slice(0, 25)` cap is fine, but is the entries.length unbounded? If called with 10K hooks does memory stay bounded?
5. **Frozen output** — `Object.freeze` on classification + arrays — good. Does `summarizeReport` return frozen output too? Inconsistent freeze policy matters here.
6. **Naming + project conventions** — does the file follow the same exported-helper + JSDoc style as `H:/prism/scripts/lib/domain-classifier.mjs` (sibling prior art)?
7. **Integration coupling** — is the classifier coupled to ONE invocation pattern, or does the API allow the CLI walker (to be written next) to dispatch in parallel?

Report P0/P1/P2 findings + PASS/FAIL grad
... [+19 chars truncated]

### Assistant | 2026-05-22T22:49:59.070Z

I'll read the file and the sibling prior art to audit thoroughly.

### Assistant | 2026-05-22T22:49:59.654Z

[tool_use: Read]

### Assistant | 2026-05-22T22:49:59.966Z

[tool_use: Read]

### User | 2026-05-22T22:50:12.980Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/domain-classifier.mjs
3	//
4	// Single source of truth for slot↔domain mapping + unit→domain classification.
5	//
6	// Background: PRISM runs 13 NATO-named chat slots, each assigned a PRISM system
7	// domain (alpha=mill, bravo=lathe, charlie=wire-EDM, etc. per JULIETT-12CHAT-
8	// ALLOCATION-MS0). The slot-task queue allocator (scripts/allocate-domains-to-
9
... [+5624 chars truncated]

### User | 2026-05-22T22:50:13.020Z

[tool_result] 1	/**
2	 * hook-broker-classifier.mjs — U-DOCKER-HOOK-BROKER-P1
3	 *
4	 * Pure-core hook content classifier. Given a Claude Code hook's source text,
5	 * decides which broker integration strategy that hook is compatible with:
6	 *
7	 *   - `module-safe`         — `export default fn(stdin)` shape, broker can
8	 *                             dynamic-import once and call in-process.
9	 *   - `cli-saf
... [+12249 chars truncated]

### Assistant | 2026-05-22T22:51:05.207Z

# PRISM Review — Independent Second-Pass — `hook-broker-classifier.mjs`

**Verdict: FAIL** — two P0s on the core safety guarantee (false-positive `module-safe` classification), three P1s, two P2s.

---

## P0 — false-positive `module-safe` on hooks that mutate at runtime

**The classifier only checks module-scope side effects.** `mutatesProcess` is computed from `topWriteFile`/`topMkdir` (line-anchored, top-level) and `spawnSync`/`spawn` (file-wide regex). But the protective regex set has gaps:

1. **No detection of `fs.promises.writeFile` / `fs.appendFileSync` / `fs.unlinkSync` / `fs.renameSync` / `child_process.exec` / `execSync` / `execFile` / `fork`.** A hook with `export default async function handle(input) { await fs.promises.writeFile(stateFile, json); }` is classified `module-safe` — broker shares it across all chats → corrupted state writes. This is the exact P0 scenario named in the spec.
2. **No `fetch` / `http.request` / `net.connect` / `dgram` / Qdrant client detection.** A `module-safe`-shaped hook that calls `await fetch(qdrantURL, …)` gets shared → fan-out network amplification + leaked auth headers across tenants.

**Fix:** add to `mutatesProcess`: `fs.promises.write*`, `appendFile*`, `unlink*`, `rename*`, `exec*`, `fork`, `fetch`, `http(s).request`, `net.connect`, plus a flag for `await` *anywhere* in an exported `async function` body (broker-shared async fns are runtime-unsafe by default). Without these the classifier silently green-lights the dangerous class.

## P0 — `RE.spawn` false-positives on imports

`/(?:^|\s)spawn\s*\(/` matches `spawnSync` (the negative-after check helps) BUT also does NOT match `import { spawn } from "child_process"` (no `(`) — that's fine. However it **does** match `await spawn(...)` inside a function body because `spawn` regex is run against `text`, not `stripped`. A hook that imports `spawn` but only uses it inside a guarded `if (process.env.…)` branch gets flagged `mutates-process` → over-isolation (acceptable per s
... [+5081 chars truncated]
