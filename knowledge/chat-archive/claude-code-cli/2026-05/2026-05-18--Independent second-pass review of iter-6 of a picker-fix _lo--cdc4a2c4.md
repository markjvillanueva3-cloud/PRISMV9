---
type: "chat-session"
source: "claude-code-cli"
session_id: "cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81"
title: "Independent second-pass review of iter-6 of a picker-fix /loop. Files: `H:/prism"
date: "2026-05-18"
first_ts: "2026-05-18T01:21:48.948Z"
last_ts: "2026-05-18T01:23:02.691Z"
cwd: "H:\\prism"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81/subagents/agent-ad9a8b7416199f9b8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Independent second-pass review of iter-6 of a picker-fix /loop. Files: `H:/prism

> **claude-code-cli** | 2026-05-18 | 23 msgs (9 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81/subagents/agent-ad9a8b7416199f9b8.jsonl`

## Transcript

### User | 2026-05-18T01:21:48.948Z

Independent second-pass review of iter-6 of a picker-fix /loop. Files: `H:/prism/scripts/lib/shipped-units-source-of-truth.mjs` + `H:/prism/scripts/lib/shipped-units-source-of-truth.test.mjs`. The other reviewer covers compound-expansion + security. You focus on integration, semantic risk, regression.

Change: added a 3rd shipped-detection source `readShippedFromBridgeCommits()` — scans `git log --format=%s -n 800` for `U-BRIDGE-*` tokens (with compound `A+B`→both expansion). Closes the blind spot where `U-BRIDGE-*` units (in `ROADMAP-CONSOLIDATED.bridge_units`, no milestone envelope) were re-served by the picker forever after shipping. Unioned into `buildShippedIdsUnion` on the production path only; cache key gained HEAD sha. 65/65 picker-stack tests pass.

Focus:
1. **Semantic correctness of "a commit subject mentioning U-BRIDGE-X means X is shipped"** — this is a heuristic. Failure cases: (a) `git revert` of a bridge commit (subject "Revert ... U-BRIDGE-X" → X marked shipped but it was reverted); (b) a doc/wip commit referencing a bridge id that isn't done; (c) a commit that PLANS bridge work ("queue U-BRIDGE-X"). Quantify the risk vs the alternative (infinite re-serve). Is this acceptable for an ADVISORY picker (operator still confirms)? Recommend a mitigation only if the false-positive cost exceeds the re-serve cost.
2. **Hermetic boundary integrity** — the bridge source reads real git unconditionally inside the function, but `buildShippedIdsUnion` custom-path branch and `describeShippedSources` hermetic branch must NOT call it (would pollute exact-count tests fleet-wide). Verify BOTH gates exist and are correct. This is the highest-risk regression — a hermetic test in ANOTHER suite that calls buildShippedIdsUnion with custom paths must still get deterministic results.
3. **Cross-consumer impact** — `buildShippedIdsUnion()` (no args) is called by slot-queue.mjs + priority-queue.mjs + a peer's new entryCompleted() work. Adding ~N bridge ids to the production uni
... [+1227 chars truncated]

### Assistant | 2026-05-18T01:21:53.445Z

I'll review the two files.

### Assistant | 2026-05-18T01:21:54.288Z

[tool_use: Read]

### Assistant | 2026-05-18T01:21:54.498Z

[tool_use: Read]

### User | 2026-05-18T01:21:54.749Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\shipped-units-source-of-truth.mjs' was already read 17s ago in this session and is unchanged (mtime 1779067249777). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### User | 2026-05-18T01:21:54.966Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\shipped-units-source-of-truth.test.mjs' was already read 16s ago in this session and is unchanged (mtime 1779067206565). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### Assistant | 2026-05-18T01:21:58.202Z

Both files are already in my context from the prior read. Let me verify the cross-consumer call sites and the bridge token regex against live git.

### Assistant | 2026-05-18T01:21:59.105Z

[tool_use: Grep]

### User | 2026-05-18T01:22:00.715Z

[tool_result] Found 3 files
scripts\lib\shipped-units-source-of-truth.mjs
scripts\lib\shipped-units-source-of-truth.test.mjs
scripts\slot-queue.mjs

### Assistant | 2026-05-18T01:22:01.066Z

[tool_use: Bash]

### User | 2026-05-18T01:22:10.357Z

[tool_result] U-BRIDGE-SFC
U-BRIDGE-WIRE
---REVERT-CHECK---

### Assistant | 2026-05-18T01:22:23.995Z

Live git: 0 revert/wip/queue/plan false-positive subjects in the 800-window; only 2 real bridge tokens shipped. Let me confirm the two hermetic gates and cache-key logic in the source.

### Assistant | 2026-05-18T01:22:25.306Z

[tool_use: Grep]

### User | 2026-05-18T01:22:26.625Z

[tool_result] 152-}
153-
154-\** Source (c): bridge-unit completion recovered from git commit subjects. */
155:export function readShippedFromBridgeCommits({ repoRoot = REPO_ROOT_DEFAULT, maxCommits = 800 } = {}) {
156-  const out = new Set();
157-  let log = "";
158-  try {
--
172-  return out;
173-}
174-
175:function headShaSafe(repoRoot = REPO_ROOT_DEFAULT) {
176-  try {
177:    return execFileSync("git", ["
... [+3181 chars truncated]

### Assistant | 2026-05-18T01:22:29.171Z

Both hermetic gates confirmed. Let me check the regex/expansion and the new tests.

### Assistant | 2026-05-18T01:22:31.293Z

[tool_use: Grep]

### User | 2026-05-18T01:22:31.294Z

[tool_result] <tool_use_error>InputValidationError: Grep failed due to the following issue:
An unexpected parameter `limit` was provided</tool_use_error>

### Assistant | 2026-05-18T01:22:32.589Z

[tool_use: Grep]

### User | 2026-05-18T01:22:33.635Z

[tool_result] 17-  collectCompletedFromEnvelope,
18-  describeShippedSources,
19:  expandBridgeToken,
20:  readShippedFromBridgeCommits,
21-  readShippedFromEnvelopes,
22-  readShippedFromProgress,
--
24-
25-function mkTmp(prefix = "shipped-truth-test-") {
26:  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
27-}
28-
--
383-}
384-
385:// ─── Source (c): bridge-commit completion recovery ─────────────────
... [+5184 chars truncated]

### Assistant | 2026-05-18T01:22:36.791Z

Let me see the regex/expandBridgeToken implementation body.

### Assistant | 2026-05-18T01:22:37.924Z

[tool_use: Read]

### User | 2026-05-18T01:22:38.816Z

[tool_result] 120	  return out;
121	}
122	
123	const REPO_ROOT_DEFAULT = path.resolve(__dirname, "../..");
124	// Bridge-unit ids (U-BRIDGE-*) live in ROADMAP-CONSOLIDATED.bridge_units, NOT
125	// in any milestone envelope, so sources (a)+(b) structurally can't see them
126	// shipped — the picker re-serves a completed bridge forever (observed 2026-05-17:
127	// U-BRIDGE-SFC-ESPRIT re-picked after it shipped in
... [+1283 chars truncated]

### Assistant | 2026-05-18T01:23:02.691Z

I have full visibility. Independent second-pass review complete.

---

## VERDICT: PASS (with P1 + P2 notes)

### 1. Semantic correctness — heuristic risk (P1, accepted)
Live git proves the risk is currently *zero*: the 800-window has 2 real bridge tokens, **0** revert/wip/queue/plan subjects matching `U-BRIDGE`. Failure cases:
- **(a) `git revert`** — "Revert ...U-BRIDGE-X" → X falsely shipped. Real cost: one bridge stays *out* of pickup until manually re-served. Vs. the alternative (infinite re-serve of every shipped bridge, the actual observed 2026-05-17 bug). Re-serve cost >> false-suppress cost for an **advisory** picker the operator confirms. **Acceptable, no code mitigation required.**
- **(c) "queue U-BRIDGE-X"** — PRISM commit convention is `[SCOPE]/U-ID: title`; planning text lives in bodies, not `%s` subjects (the scan is `--format=%s`, subject-only — good). Residual risk low.
- **P1**: the convention should be doctrine (see §5) so a future `git revert "...U-BRIDGE-X..."` doesn't silently bury a still-pending bridge. Recommend a one-line caveat in the recovery comment + wiki, not a regex negative-lookahead (over-engineering an unobserved case — Karpathy simplicity).

### 2. Hermetic boundary — PASS (highest-risk axis, clean)
Both gates verified: `buildShippedIdsUnion` custom-path branch (L241-248) omits the bridge call; `describeShippedSources` hermetic branch (L274-277) gates on `progressPath != null || envelopesDir != null`. Test L495-507 asserts both directions (`bridgeCount > 0` prod, `=== 0` hermetic). A foreign suite calling with custom paths stays deterministic. **No cross-suite bleed.**

### 3. Cross-consumer impact — PASS
`BRIDGE_ID_RE` is `\bU-BRIDGE-…` anchored; test L464-476 proves plain `U-NORMAL-UNIT` is NOT captured. Source (c) is union-additive and `U-BRIDGE-*`-only — no non-bridge pending unit can be collaterally excluded. slot-queue.mjs confirmed consumer; production-path-only.

### 4. Performance — P2 (pre-existing class, compounded)
`h
... [+1498 chars truncated]
