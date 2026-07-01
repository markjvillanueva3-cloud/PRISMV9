---
type: "chat-session"
source: "claude-code-cli"
session_id: "93351de7-9846-43b7-a9a7-d6bd1f9b2abc"
title: "Round-2 independent review of H:/prism/.claude/helpers/task-freshness.mjs (read "
date: "2026-05-18"
first_ts: "2026-05-18T00:38:33.225Z"
last_ts: "2026-05-18T00:39:11.856Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 5
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-ab8de72a8afd875b3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Round-2 independent review of H:/prism/.claude/helpers/task-freshness.mjs (read 

> **claude-code-cli** | 2026-05-18 | 14 msgs (5 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-ab8de72a8afd875b3.jsonl`

## Transcript

### User | 2026-05-18T00:38:33.225Z

Round-2 independent review of H:/prism/.claude/helpers/task-freshness.mjs (read the WHOLE file). In round 1 you returned FAIL with 1 P0 + 3 P1. Verify each is genuinely fixed and weight attention on what the fixes might have BROKEN. Do not assume the other reviewer caught everything.

Your round-1 findings + the claimed fixes:
- **P0 (git-down silent-pass)**: claimed fixed — `countActivitySince` sets `unprovable:true` on `git===null`; `decideFreshness` now returns `severity:"freshness-unprovable"` (stale) when activity is unprovable on a resolved+trusted+not-shipped+not-future anchor. VERIFY: is there ANY path where git is down and a genuinely-stale task still returns `stale:false`? Specifically: does the `gen-anchor-untrusted` branch (which fires BEFORE the unprovable branch) ever mask a case where you'd WANT the unprovable signal? Is the branch ordering defensible?
- **P1 (fork-storm: file-mtime always spawned git)**: claimed fixed — `evaluate()` only calls `countActivitySince` when `gen.genIso && gen.trusted`. VERIFY: under the documented 98%-commit/Cygwin-fork-storm fleet state, trace the WORST case — an envelope WITH a real `created_at` (trusted) on every one of 12 chats claiming simultaneously. Still 1 git spawn per claim. Is that acceptable given the 30-min ack-stamp TTL caches the result? Does the helper give the HOOK (built next) enough signal to ack-cache and avoid re-spawning?
- **P1 (source_audit traversal)**: claimed fixed — resolve + `startsWith(rootResolved+path.sep)`. VERIFY with adversarial inputs: `source_audit:"H:/prism/../prism-evil/x"` (resolves back inside?), `source_audit:"H:/prismutil/x"` (prefix-without-sep — does the `+path.sep` guard catch it?), symlink in path.
- **P1 (NaN thresholds)**: claimed fixed — `Number.isFinite` guard. VERIFY the exported `decideFreshness` is independently safe when a test passes `thresholds:{staleHrs:"abc"}`.

Also re-audit for NEW silent-breakage introduced by the 6 edits: does `finalize()` in readGenerationTim
... [+326 chars truncated]

### Assistant | 2026-05-18T00:38:37.365Z

I'll read the complete file to verify the round-1 fixes.

### Assistant | 2026-05-18T00:38:37.385Z

[tool_use: Read]

### User | 2026-05-18T00:38:38.103Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\task-freshness.mjs' was already read 14s ago in this session and is unchanged (mtime 1779064659067). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-18T00:38:41.662Z

The file content is in my context from the round-1 read. Let me work from it and verify specific concerns with targeted grep.

### Assistant | 2026-05-18T00:38:43.136Z

[tool_use: Grep]

### User | 2026-05-18T00:38:44.839Z

[tool_result] 154:      const cand = path.resolve(
157:      const rootResolved = path.resolve(PRISM_ROOT);
159:        cand === rootResolved || cand.startsWith(rootResolved + path.sep);
184:// about when the TASK was generated. `none` is obviously untrusted. The gate
185:// treats an untrusted anchor as conservative-stale (force a manual re-check)
198:  const out = { genIso: null, source: "none", trusted: fals
... [+2071 chars truncated]

### Assistant | 2026-05-18T00:38:47.948Z

Now let me verify the critical branch ordering and the early-return paths in detail.

### Assistant | 2026-05-18T00:38:48.541Z

[tool_use: Read]

### User | 2026-05-18T00:38:50.088Z

[tool_result] 370	export function decideFreshness({ gen, activity, thresholds, now }) {
371	  const sH = Number(thresholds?.staleHrs);
372	  const pT = Number(thresholds?.peerCommitsTrigger);
373	  const staleHrs = Number.isFinite(sH) ? sH : 24;
374	  const peerTrig = Number.isFinite(pT) ? pT : 5;
375	  const nowMs = typeof now === "number" ? now : Date.now();
376	  const a = activity || { commitsCount: 0, enve
... [+3536 chars truncated]

### Assistant | 2026-05-18T00:38:52.696Z

Now let me verify the `finalize()` path and the traversal guard with adversarial reasoning.

### Assistant | 2026-05-18T00:38:53.538Z

[tool_use: Read]

### User | 2026-05-18T00:38:55.265Z

[tool_result] 145	  // SECURITY (scrutiny P1): envelopes are fleet-shared + peer-writable. A
146	  // crafted `source_audit` (absolute, or relative with `../`) must NOT let a
147	  // hostile envelope point this stat/read outside PRISM_ROOT. Resolve and
148	  // assert containment; reject silently (fail-open — envelope ts still governs).
149	  let auditSpecPath = null;
150	  if (/(-AUDIT-|^FEATURE-GAP-|-PUNCHLI
... [+1858 chars truncated]

### Assistant | 2026-05-18T00:39:11.856Z

All four round-1 findings verified against source. Findings:

---

**VERDICT: PASS**

**P0 (git-down silent-pass) — FIXED, branch ordering defensible.**
`decideFreshness` ordering: already-shipped(a) → gen-unknown(e) → future(b) → untrusted(c, L423) → unprovable(d, L436). Every branch returns `stale:true`. There is **no path** where git is down and a stale task returns `stale:false`. The `gen-anchor-untrusted` branch firing *before* unprovable does NOT mask anything dangerous — both return `stale:true`. Ordering is correct: if the anchor itself is meaningless (file-mtime), the activity question is moot, so reporting `gen-anchor-untrusted` is the more precise diagnosis. The unprovable branch only matters on a *trusted* anchor where git failed — exactly the case (c) lets through. Defensible.

**P1 (fork-storm) — FIXED, acceptable.** L532-533: `gen.genIso && gen.trusted ? countActivitySince(...) : skip`. Worst case (12 chats, all real `created_at`) = 1 git spawn/claim. The 30-min ack-stamp TTL is the caching layer; this helper returns deterministic `severity` strings the hook can key its ack-cache on (L426/439 reasons are stable). Adequate signal handoff.

**P1 (traversal) — FIXED, adversarial inputs handled.**
- `H:/prism/../prism-evil/x` → `path.resolve` → `H:/prism-evil/x`, fails `startsWith("H:\prism" + sep)`. Rejected. ✓
- `H:/prismutil/x` → prefix-without-sep: `"H:\prismutil\x".startsWith("H:\prism\")` is **false** (the `+path.sep` is exactly the classic-prefix fix). Rejected. ✓
- Symlink: `path.resolve` is lexical, not realpath — a symlink *inside* root pointing out would slip. But L160 only `statFile().exists` + later read; envelope ts still governs (fail-open documented L148). Acceptable residual, not a regression.

**P1 (NaN thresholds) — FIXED.** L371-374: `Number("abc")→NaN`, `Number.isFinite(NaN)→false`, defaults 24/5. `decideFreshness` is independently safe — guard is at function entry, no caller dependency.

**NEW silent-breakage audit — clean.**
- `fina
... [+502 chars truncated]
