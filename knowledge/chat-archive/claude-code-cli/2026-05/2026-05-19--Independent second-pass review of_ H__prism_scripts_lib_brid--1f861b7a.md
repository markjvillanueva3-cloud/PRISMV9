---
type: "chat-session"
source: "claude-code-cli"
session_id: "1f861b7a-db00-4fd8-9bde-c78faed86e89"
title: "Independent second-pass review of: H:/prism/scripts/lib/bridge-evidence-detector"
date: "2026-05-19"
first_ts: "2026-05-19T14:40:22.029Z"
last_ts: "2026-05-19T14:41:17.934Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/1f861b7a-db00-4fd8-9bde-c78faed86e89/subagents/agent-a2f7841f6a83204e8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Independent second-pass review of: H:/prism/scripts/lib/bridge-evidence-detector

> **claude-code-cli** | 2026-05-19 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/1f861b7a-db00-4fd8-9bde-c78faed86e89/subagents/agent-a2f7841f6a83204e8.jsonl`

## Transcript

### User | 2026-05-19T14:40:22.029Z

Independent second-pass review of:

  H:/prism/scripts/lib/bridge-evidence-detector.mjs

Do NOT assume the first reviewer caught everything. Weight your attention on:

1. **Substring-matching false positives** — `scanFileForPatterns` uses `String.indexOf` to find patterns like "xproc_route_query" and "CrossProcessTierRouterEngine" in the dispatcher source. What if those exact strings appear in a comment, a doc-string, or a `// TODO: remove xproc_route_query` deprecation note? Could the detector falsely classify a half-removed surface as 'built'? Examine the patterns hardcoded in EVIDENCE_TABLE.

2. **Token boundary** — if someone renames `xproc_route_query` to `legacy_xproc_route_query`, the substring match still hits. Is the pattern strict enough, or should it require token boundaries (regex)?

3. **Concurrent table mutation** — `EVIDENCE_TABLE` is exported as `const` but the array itself is mutable. A test that pushes a malicious entry could leak. Should it be Object.freeze'd? (Look at U-OE-BRIDGE-L2 for precedent — TOOL_NAMES is frozen.)

4. **Path resolution** — `path.resolve(repoRoot, relPath)` — what if relPath starts with `/` or `..\..\..`? Could a detector entry escape the repoRoot to read arbitrary files? Are detectors expected to be trusted-by-construction or sandboxed?

5. **Idempotency under filesystem race** — Two concurrent calls to `detectAllBridgeStatuses` against a file that's being rewritten — does the detector handle ENOENT gracefully? (existsSync followed by readFileSync is a TOCTOU window.)

6. **Sister convention match** — compare to other `scripts/lib/*.mjs` modules (atomic-json.mjs, kip-lora-rotation.mjs from earlier this session). Does the naming, error handling, and JSDoc style match?

Read the file end-to-end. Grade PASS/FAIL. Report under 350 words.

### Assistant | 2026-05-19T14:40:35.290Z

I'll review this file thoroughly.

### Assistant | 2026-05-19T14:40:35.622Z

[tool_use: Read]

### User | 2026-05-19T14:40:37.978Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\bridge-evidence-detector.mjs' was already read 1s ago in this session and is unchanged (mtime 1779200959546). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-19T14:40:41.798Z

[tool_use: Bash]

### User | 2026-05-19T14:40:45.472Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
/**
 * bridge-evidence-detector.mjs — scan repo for "is this bridge actually
 * shipped?" evidence so generate-bridge-synergy-features.mjs can flip
 * status `ghost → built` automatically.
 *
 * Why this exists (R8 lesson, U-BRIDGE-STATUS-RECONCILE 2026-05-19):
 *
 * The bridge-synergy roost lists 42 curated bridges that c
... [+10401 chars truncated]

### Assistant | 2026-05-19T14:40:49.560Z

[tool_use: Read]

### User | 2026-05-19T14:40:52.431Z

[tool_result] 1	/**
2	 * atomic-json.mjs — the single canonical atomic JSON writer for PRISM scripts.
3	 *
4	 * U-ROADMAP-INDEX-WRITER-CONSOLIDATE (2026-05-19): collapses the five
5	 * independent roadmap-index.json writers (reconcile-milestones.mjs,
6	 * register-devtools-roadmap-envelopes.mjs, register-revenue-roadmap-
7	 * envelopes.mjs, reconcile-roadmap-drift.mjs, close-out-milestone.mjs) onto
8	 * one hel
... [+2485 chars truncated]

### Assistant | 2026-05-19T14:41:17.934Z

I have the file plus a sister-convention sample. Independent second-pass review follows.

# Bridge Evidence Detector — Reviewer B (Independent Second Pass)

## Verdict: **FAIL** (3 P1 findings)

## P1 findings

**1. Substring matches in comments/doc-strings → false-positive `built`** (your concern #1, confirmed). `scanFileForPatterns` does plain `String.indexOf` against the entire source body. A doc-comment line like `// TODO: remove xproc_route_query` or a JSDoc `@deprecated CrossProcessTierRouterEngine` in `aiReasoningDispatcher.ts` would satisfy BOTH patterns and flip the bridge to `built` despite the surface being removed. The patterns chosen (`xproc_route_query`, `xproc_orchestrate_full`) are exactly the kind of identifier humans write into deprecation notes verbatim. There is no comment-stripping pass.

**2. Token-boundary leak** (your concern #2, confirmed). `legacy_xproc_route_query` or `xproc_route_query_v2` would both match. Worse: a string literal `"see xproc_route_query for migration"` in an error message would match. Detectors should use a regex with `\b` (or `(?:^|[^A-Za-z0-9_])` + lookahead) — substring matching on identifier-like patterns is structurally wrong here. The all-of-N "all 2 required patterns present" verdict gives high confidence to a low-confidence signal.

**3. `EVIDENCE_TABLE` not frozen** (your concern #3, confirmed). Exported `const` is binding-only; the array and every entry object are mutable. A test or downstream module can `EVIDENCE_TABLE.push({ bridgeId: 'U-BRIDGE-AI-TIER1-TIER2', detect: () => ({status:'built', evidence:[]}) })` and `detectorFor` returns the FIRST match — but with no freeze, a `.unshift()` poisons every subsequent call session-wide. Compare U-OE-BRIDGE-L2's `Object.freeze`d `TOOL_NAMES` precedent the prompt cites; same risk class.

## P2 findings (note, don't block)

- **Path resolution (#4) is benign-by-construction today** — `EVIDENCE_TABLE` is closed-source; no user input reaches `relPath`. But `path.resolve
... [+1008 chars truncated]
