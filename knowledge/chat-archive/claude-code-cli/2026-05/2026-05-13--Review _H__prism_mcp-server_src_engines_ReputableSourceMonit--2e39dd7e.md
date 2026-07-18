---
type: "chat-session"
source: "claude-code-cli"
session_id: "2e39dd7e-6d0d-4bc6-8c72-fa76a2b9e9fd"
title: "Review `H:/prism/mcp-server/src/engines/ReputableSourceMonitorEngine.ts` (~615 L"
date: "2026-05-13"
first_ts: "2026-05-13T15:42:45.803Z"
last_ts: "2026-05-13T15:43:41.232Z"
cwd: "H:\\prism\\mcp-server"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/2e39dd7e-6d0d-4bc6-8c72-fa76a2b9e9fd/subagents/agent-ac6f9ea9280c953d7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review `H:/prism/mcp-server/src/engines/ReputableSourceMonitorEngine.ts` (~615 L

> **claude-code-cli** | 2026-05-13 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2e39dd7e-6d0d-4bc6-8c72-fa76a2b9e9fd/subagents/agent-ac6f9ea9280c953d7.jsonl`

## Transcript

### User | 2026-05-13T15:42:45.803Z

Review `H:/prism/mcp-server/src/engines/ReputableSourceMonitorEngine.ts` (~615 LOC) end-to-end as a content-specialist code reviewer. This is unit U-ALL01 of AUTO-LEARNING-LOOP-MS0 — the foundation engine for PRISM's external-source learning loop.

What the engine does:
- Polls 10 reputable AI/ML feeds (RSS / Atom / JSON) with conditional GET (ETag + If-Modified-Since)
- Exponential backoff schedule [1m, 5m, 30m, 2h] on rate-limit / repeated failure
- 50MB streamed-body payload cap (aborts mid-stream)
- 30s fetch timeout via AbortController
- MITM defense: final response.url hostname must match configured source hostname
- Per-source state machine: { etag, lastModified, lastSuccess, consecutiveFailures, backoffUntil }
- Alarm on 3 consecutive failures
- Pure data engine — no DB writes (JSONL persistence is the CLI's job in U-ALL01 step-3)

Verify rigorously:
1. State transitions correct? Race-free? Backoff math (especially `idx = Math.min(consecutiveFailures - 1, len-1)`) handles 0/1/edge cases?
2. RSS / Atom regex parsers correct? Robust against CDATA, self-closing tags, malformed XML? Any ReDoS risk?
3. JSON parser path resolution (`jsonItemsPath`) — security implications (prototype pollution if cfg comes from untrusted source)?
4. Stream body reader — does it actually abort the underlying stream on size overflow? Decoder.decode() flush correct?
5. AbortController + setTimeout — properly cleared on success? Race between abort and resolve?
6. Sequential pollAll (not parallel) — intentional design choice (documented), but verify there's no shared-state leak between source polls
7. Concurrency: 2 simultaneous poll(slug) calls on the same source — does that double-fire fetch?
8. Singleton export — does it break test isolation if 2 test files import the singleton?
9. Convention conformance — matches PRISM engine style (see H:/prism/mcp-server/src/engines/CrossProcessOutcomeStore.ts as reference)?
10. Any inlined magic numbers that should be named constants?

Reference 
... [+439 chars truncated]

### Assistant | 2026-05-13T15:42:53.201Z

I'll review the ReputableSourceMonitorEngine.ts file end-to-end.

### Assistant | 2026-05-13T15:42:53.378Z

[tool_use: Read]

### User | 2026-05-13T15:42:57.890Z

[tool_result] 1	/**
2	 * ReputableSourceMonitorEngine — AUTO-LEARNING-LOOP-MS0 / U-ALL01
3	 * ================================================================
4	 *
5	 * Multi-source external poller for reputable AI/ML/manufacturing news feeds.
6	 * Polls 10 RSS / Atom / JSON sources with conditional GET (ETag /
7	 * If-Modified-Since), exponential backoff on rate-limit (1m → 5m → 30m → 2h),
8	 * a 50 MB payload
... [+30250 chars truncated]

### Assistant | 2026-05-13T15:43:41.232Z

## ReputableSourceMonitorEngine.ts — Content-Specialist Review

### P0 — Must-Fix-Blocker

**P0-1: Concurrent `poll(slug)` race condition (Q7).** Two simultaneous `poll(slug)` calls on the same source DOUBLE-FIRE fetch. The state read at L272 (`this.state.get(slug)`) and write at L322/338/353/etc are non-atomic. Both calls see the same `backoffUntil=null`, both fetch, both write last-success state. **Fix**: per-slug in-flight `Map<string, Promise<PollResult>>` returning the in-flight promise on re-entry, or guard with `inFlight.add(slug)` checked at L266. Critical because `pollAll()` is sequential but external callers (cron + manual operator + dispatcher action) can interleave.

**P0-2: `parseRSS` regex misclassifies Atom feeds.** L620 `if (!/<rss[\s>]/i.test(xml) && !/<channel[\s>]/i.test(xml))` — `<channel>` appears in Atom too (rarely), and Atom feeds containing the string "channel" in CDATA/text will pass the gate then parse zero items silently (no `<item>` tag → empty array, status=ok). A misconfigured source (`type:"rss"` pointing at an Atom URL) returns `status:"ok", items:[]` instead of failing loud (violates R12). **Fix**: tighten to `/<rss\b/i` AND require at least one `<item>` OR throw if zero items extracted but `<entry>` present.

### P1 — Must-Fix

**P1-1: `firstTagText` regex breaks on nested same-name tags.** L748 `<title>...<\/title>` with non-greedy `[\s\S]*?` — but if `<description>` contains `<title>` (HN/RSSHub do this in CDATA), the outer scan into `block` already isolated one `<item>`, but a `<description><![CDATA[<title>X</title>]]></description>` will let `firstTagText(block,"title")` match the INNER one first if it appears before the real `<title>`. Order-dependent. **Fix**: prefer direct children — scan top-level only, or use `<title>` followed by next `<\/title>` only after stripping `<![CDATA[…]]>` blocks first.

**P1-2: Singleton breaks test isolation (Q8).** L764 exports `reputableSourceMonitorEngine = new ReputableSourceMonitorEngine(
... [+5381 chars truncated]
