---
type: "chat-session"
source: "claude-code-cli"
session_id: "930f37b5-d5cf-4924-8d86-d7713730da3d"
title: "Review a new SFC combinatorial cited-data source engine + its test. Read both en"
date: "2026-06-11"
first_ts: "2026-06-11T13:16:33.632Z"
last_ts: "2026-06-11T13:18:03.910Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a48590e3efef5fe0b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Review a new SFC combinatorial cited-data source engine + its test. Read both en

> **claude-code-cli** | 2026-06-11 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a48590e3efef5fe0b.jsonl`

## Transcript

### User | 2026-06-11T13:16:33.632Z

Review a new SFC combinatorial cited-data source engine + its test. Read both end-to-end:
Module: H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-datasource.ts
Test:   H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-datasource.test.ts

Context: this resolves a real, provenance-bearing (vc_mpm, fz_mm) for a combinatorial cell by delegating to the in-tree romeo `SpeedFeedCatalogJoinerEngine.lookup` (which returns metric vc/fz + source_catalog + match_tier + confidence, or null). The CONTRACT: it must NEVER fabricate a value — a number is emitted only when a provider supplied it; any miss/skip/throw yields resolved:false with vc_mpm/fz_mm = null + an errors[] record. It uses constructor dependency-injection (testable with fakes) + a static withRealProviders() factory wiring the real engine. It is intentionally [SCOPED] to the romeo provider this slice; shop-proven + juliett are deferred (NOT stubbed) because shop tools carry an imperial `unit` field needing SFM->m/min conversion.

Verify (flag P0/P1):
- Correctness: does resolveCell ever return a non-null vc/fz that did NOT come from the provider? (the never-fabricate contract — the load-bearing property)
- Are the resolved/skip/miss/throw branches all correct + mutually exclusive? Is the unresolved fallthrough reachable in every non-match case?
- Provenance completeness: source/detail/confidence/catalog/match_tier mapped faithfully from the match?
- Types: is the DI VendorCatalogProvider interface structurally satisfied by the real SpeedFeedCatalogJoinerEngine.lookup? Any type unsoundness?
- Test integrity (R9): do assertions pin exact values (not presence checks)? Does the real-data E2E genuinely exercise the live catalog (not a fake)? Are the never-fabricate paths (null vc/fz) explicitly asserted?
- Is the [SCOPED] shop/juliett deferral honest (no hidden no-op reader that silently skips everything = the fake-reader anti-pattern)?
- Any error swallowed silently (engines.md: never silentCatch)
... [+83 chars truncated]

### Assistant | 2026-06-11T13:16:39.835Z

I'll read both files end-to-end before forming any verdict.

### Assistant | 2026-06-11T13:16:40.289Z

[tool_use: Read]

### Assistant | 2026-06-11T13:16:40.329Z

[tool_use: Read]

### User | 2026-06-11T13:16:42.325Z

[tool_result] 1	/**
2	 * SFC combinatorial CITED-DATA source -- resolves a real, provenance-bearing
3	 * (vc, fz) reference for a combinatorial cell, or returns UNRESOLVED. It NEVER
4	 * fabricates a value: every number it emits came from a provider and carries its
5	 * source; a miss is `resolved:false` with `vc_mpm/fz_mm = null`, never a silent
6	 * default. (Pairs with the U-CSFH-05 gates' silent-default det
... [+5880 chars truncated]

### User | 2026-06-11T13:16:42.432Z

[tool_result] 1	/**
2	 * Tests for the SFC combinatorial CITED-DATA source (U-CSFH-03-DB-ACCESSORS).
3	 *
4	 * OSCAR-SFC-9AXIS-MS0 / slot:oscar, 2026-06-10.
5	 *
6	 * Two layers, per the pure-core+injected-readers rule (RGS-MS1 lesson: a reader
7	 * unit MUST ship a real-data E2E, not only fake-injected cases):
8	 *   1. DI unit tests with fake providers -- pin the resolved/skip/miss/throw paths
9	 *      and t
... [+5537 chars truncated]

### Assistant | 2026-06-11T13:16:45.911Z

Now I have both files in full. Let me also check the `SpeedFeedCatalogJoinerEngine` to verify structural compatibility with the `VendorCatalogProvider` interface.

### Assistant | 2026-06-11T13:16:46.032Z

[tool_use: Glob]

### User | 2026-06-11T13:16:47.855Z

[tool_result] src\engines\SpeedFeedCatalogJoinerEngine.ts

### Assistant | 2026-06-11T13:16:50.342Z

[tool_use: Read]

### User | 2026-06-11T13:16:52.659Z

[tool_result] 1	/**
2	 * SpeedFeedCatalogJoinerEngine — unified manufacturer SFM/IPT lookup.
3	 *
4	 * Closes the structural ceiling in the U-OSC9-14 tri-vendor smoke (84.6% of
5	 * cells stuck in "weak_disagreement" because G-Wizard toolcrib.csv carries
6	 * geometry but no recommended Vc/fz columns). PRISM has rich SFM/IPT data in
7	 * `mcp-server/src/data/*-speed-feed-data.ts` extracted from OEM PDFs:
8	 *  
... [+13777 chars truncated]

### Assistant | 2026-06-11T13:18:03.910Z

Now I have everything needed to render a complete verdict. Here is the full analysis.

---

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 8.5/10
- Files Analyzed: 3 (datasource, test, joiner engine)
- Issues Found: 4 (0 P0, 2 P1, 2 P2)
- Technical Debt Estimate: 2-3 hours

---

### Never-Fabricate Contract (the load-bearing property)

The contract holds. Every code path that returns a non-null `vc_mpm`/`fz_mm` traces back to exactly one origin: `match.vc_mpm` / `match.fz_mm` at lines 103-104 of the datasource, where `match` is the return value of `this.vendorCatalog.lookup(...)`. There are exactly two exits from `resolveCell`: the early `return` inside `if (match)` (resolved) and the single fallthrough `return` at line 124 (always `vc_mpm: null, fz_mm: null`). No default value, no arithmetic on missing data, no silent coercion. The contract is structurally enforced, not just documented.

---

### Branch Correctness and Mutual Exclusivity

The four branches are:

| Branch | Condition | Outcome |
|--------|-----------|---------|
| Hit | `manufacturer && tool_id_or_series` + `match !== null` | `resolved:true`, vc/fz from match |
| Miss | `manufacturer && tool_id_or_series` + `match === null` | `resolved:false`, vc/fz null |
| Throw | `manufacturer && tool_id_or_series` + provider throws | `resolved:false`, vc/fz null |
| Skip | `!manufacturer \|\| !tool_id_or_series` | `resolved:false`, vc/fz null |

These are mutually exclusive and exhaustive. The fallthrough `return` at line 124 is reachable in miss, throw, and skip. There is no dead code. The `errors` array is populated in all three unresolved cases before reaching the fallthrough.

One structural note: the skip and miss branches both push to `errors[]` before the fallthrough, and the fallthrough uses `errors[errors.length - 1] ?? "no provider matched"` for `provenance.detail`. This is correct — the last error is always the most proximate cause. The `"no provider matched"` fallback is unreach
... [+9784 chars truncated]
