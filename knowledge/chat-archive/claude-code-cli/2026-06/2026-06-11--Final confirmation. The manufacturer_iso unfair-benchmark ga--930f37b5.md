---
type: "chat-session"
source: "claude-code-cli"
session_id: "930f37b5-d5cf-4924-8d86-d7713730da3d"
title: "Final confirmation. The manufacturer_iso unfair-benchmark gap (your must-fix) yo"
date: "2026-06-11"
first_ts: "2026-06-11T13:26:58.017Z"
last_ts: "2026-06-11T13:27:21.490Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a5eebec52d92e6a59.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Final confirmation. The manufacturer_iso unfair-benchmark gap (your must-fix) yo

> **claude-code-cli** | 2026-06-11 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a5eebec52d92e6a59.jsonl`

## Transcript

### User | 2026-06-11T13:26:58.017Z

Final confirmation. The manufacturer_iso unfair-benchmark gap (your must-fix) you already confirmed closed. Your remaining residual was the E2E not asserting match_tier/citation_quality + pinned values. That edit is now applied. Read ONLY the E2E describe block ("live romeo catalog via withRealProviders") in:
H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-datasource.test.ts

Confirm the live-hit test now pins vc_mpm/fz_mm/confidence (toBeCloseTo) AND asserts match_tier==="exact" + citation_quality==="tool_specific" (so a silent tier-degradation from exact would fail the test). Values were verified live via tsx (PIN CHECK PASS). Confirm the bogus-manufacturer test still asserts unresolved + null.

End with "VERDICT: PASS" or "VERDICT: FAIL" + any residual must-fix.

### Assistant | 2026-06-11T13:27:02.712Z

[tool_use: Read]

### User | 2026-06-11T13:27:03.742Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-datasource.test.ts' was already read 3s ago in this session and is unchanged (mtime 1781184378175). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. 
... [+29 chars truncated]

### Assistant | 2026-06-11T13:27:07.679Z

The file is already in context. Let me locate the relevant describe block using Grep to confirm the exact assertions.

### Assistant | 2026-06-11T13:27:09.283Z

[tool_use: Grep]

### User | 2026-06-11T13:27:11.710Z

[tool_result] 6- * Two layers, per the pure-core+injected-readers rule (RGS-MS1 lesson: a reader
7- * unit MUST ship a real-data E2E, not only fake-injected cases):
8- *   1. DI unit tests with fake providers -- pin the resolved/skip/miss/throw paths
9: *      and the NEVER-FABRICATE contract (null vc/fz on every non-match).
10- *   2. A real-data E2E through `withRealProviders()` against the actual romeo
11: *
... [+5112 chars truncated]

### Assistant | 2026-06-11T13:27:21.490Z

The live E2E describe block is fully in context. Here is what the assertions cover:

**Live-hit test ("returns a live cited row for a real Seco/ISO-P query")**

- `row.resolved` is checked implicitly via `row.provenance.source === "vendor_catalog"`
- `row.vc_mpm` pinned: `toBeCloseTo(162.5, 1)` — 1 decimal precision
- `row.fz_mm` pinned: `toBeCloseTo(0.0875, 3)` — 3 decimal precision
- `row.provenance.confidence` pinned: `toBeCloseTo(0.84, 1)`
- `row.provenance.match_tier === "exact"` — hard string equality; a silent degradation to `manufacturer_iso` or `series_family` would fail this assertion
- `row.provenance.citation_quality === "tool_specific"` — hard string equality; any quality downgrade fails
- `row.provenance.catalog === "seco"` — catalog identity confirmed
- `VALID_CATALOGS.toContain(row.provenance.catalog)` — catalog is in the known-good set

**Bogus-manufacturer test ("a bogus manufacturer resolves to UNRESOLVED -- never a fabricated value")**

- `row.resolved === false`
- `row.vc_mpm === null`
- `row.fz_mm === null`

Both assertions are present and correct. The manufacturer_iso unfair-benchmark gap is also closed: the unit-layer test at line 59-70 explicitly asserts that a `manufacturer_iso`-tier match returns `resolved: false`, `vc_mpm: null`, `fz_mm: null`, and `citation_quality: "none"` — so a provider that downgrades to population-median silently cannot sneak through as a live hit.

No residual gaps detected.

VERDICT: PASS
