---
type: "chat-session"
source: "claude-code-cli"
session_id: "930f37b5-d5cf-4924-8d86-d7713730da3d"
title: "Independent adversarial review of a manufacturing speed/feed cited-data resolver"
date: "2026-06-11"
first_ts: "2026-06-11T13:16:44.390Z"
last_ts: "2026-06-11T13:18:55.052Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 34
user_msgs: 14
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a6018336248c4e6cd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Independent adversarial review of a manufacturing speed/feed cited-data resolver

> **claude-code-cli** | 2026-06-11 | 34 msgs (14 user / 20 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a6018336248c4e6cd.jsonl`

## Transcript

### User | 2026-06-11T13:16:44.390Z

Independent adversarial review of a manufacturing speed/feed cited-data resolver + test:
Module: H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-datasource.ts
Test:   H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-datasource.test.ts

This engine feeds a validation harness that compares PRISM speed/feed output to vendor data — so a FABRICATED reference value here would silently corrupt the whole "fair comparison" downstream. The contract: it cites real vendor data (via the in-tree romeo SpeedFeedCatalogJoinerEngine) WITH provenance, or returns explicitly unresolved (vc/fz null) — NEVER an invented number, NEVER a silent default. It is DI-based (constructor takes a VendorCatalogProvider; static withRealProviders() wires the real engine) and intentionally [SCOPED] to romeo this slice (shop-proven + juliett deferred, not stubbed).

Attack it:
- Can ANY input path produce a non-null vc/fz that the provider did not return? (try to find a fabrication path)
- The detail string uses `errors[errors.length-1]` for the unresolved-detail — is that always meaningful, or can it be undefined/misleading?
- The romeo `lookup` already falls back to a "manufacturer_iso median" last-resort tier (low confidence). Is consuming that median as a "cited" value honest, or should the engine surface that it's a coarse fallback? Is confidence propagation enough?
- Real-data E2E: it asserts a Seco/ISO-P query resolves with vc>0. Is that a robust assertion (will it stay green as catalog data evolves) or brittle? Does it prove the real path, or could it pass with a degenerate match?
- Is the [SCOPED] deferral of shop/juliett a legitimate R15 scope-down, or does it leave the unit too thin to be useful to the SAMPLER (U-CSFH-04)?
- Naming/convention conformance; any inlined constant; any silent catch.

End with "VERDICT: PASS" or "VERDICT: FAIL" + the single most important finding (must-fix vs follow-up).

### Assistant | 2026-06-11T13:16:49.320Z

I'll read both files thoroughly before forming any conclusions.

### Assistant | 2026-06-11T13:16:49.835Z

[tool_use: Read]

### Assistant | 2026-06-11T13:16:49.945Z

[tool_use: Read]

### User | 2026-06-11T13:16:51.046Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-datasource.ts' was already read 9s ago in this session and is unchanged (mtime 1781183542568). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: 
... [+19 chars truncated]

### User | 2026-06-11T13:16:51.199Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-datasource.test.ts' was already read 9s ago in this session and is unchanged (mtime 1781183633211). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. 
... [+29 chars truncated]

### Assistant | 2026-06-11T13:16:55.992Z

The files are already in context from a prior read this session. Let me also examine the romeo provider that this module depends on.

### Assistant | 2026-06-11T13:16:56.535Z

[tool_use: Glob]

### Assistant | 2026-06-11T13:16:57.070Z

[tool_use: Grep]

### User | 2026-06-11T13:16:57.864Z

[tool_result] src\__tests__\SpeedFeedCatalogJoinerEngine.test.ts
src\engines\SpeedFeedCatalogJoinerEngine.ts

### User | 2026-06-11T13:16:58.440Z

[tool_result] Found 2 files
src\__tests__\sfc\combinatorial-datasource.test.ts
src\data\sfc-combinatorial-datasource.ts

### Assistant | 2026-06-11T13:17:00.717Z

[tool_use: Read]

### User | 2026-06-11T13:17:01.203Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\engines\SpeedFeedCatalogJoinerEngine.ts' was already read 10s ago in this session and is unchanged (mtime 1779906790002). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disab
... [+23 chars truncated]

### Assistant | 2026-06-11T13:17:06.350Z

Also already in context. Let me grep for the specific constructs I need to analyze.

### Assistant | 2026-06-11T13:17:07.829Z

[tool_use: Grep]

### Assistant | 2026-06-11T13:17:09.026Z

[tool_use: Grep]

### User | 2026-06-11T13:17:11.659Z

[tool_result] 13- *   {series, isoGroup, vc_min, vc_max, fz_min, fz_max, dc_min?, dc_max?}
14- *
15- * This engine unions the catalogs + provides a per-cell lookup:
16- *   joiner.lookup({manufacturer, tool_id_or_series, iso_group, diameter_mm})
17: *   → {vc_mpm, fz_mm, source_catalog, confidence} | null
18- *
19: * Match strategy (in order of confidence):
20- *   1. EXACT manufacturer + series + iso_group [+ 
... [+3436 chars truncated]

### User | 2026-06-11T13:17:12.292Z

[tool_result] 2- * SFC combinatorial CITED-DATA source -- resolves a real, provenance-bearing
3- * (vc, fz) reference for a combinatorial cell, or returns UNRESOLVED. It NEVER
4- * fabricates a value: every number it emits came from a provider and carries its
5: * source; a miss is `resolved:false` with `vc_mpm/fz_mm = null`, never a silent
6- * default. (Pairs with the U-CSFH-05 gates' silent-default detector.
... [+2107 chars truncated]

### Assistant | 2026-06-11T13:17:15.819Z

Now let me look at the full source and test files more carefully using targeted greps for the specific attack surfaces.

### Assistant | 2026-06-11T13:17:17.681Z

[tool_use: Grep]

### User | 2026-06-11T13:17:18.894Z

[tool_result] 14- * holder/machine/workholding sources are the NEXT slice (U-CSFH-03b): shop tools
15- * carry a `unit` field (JM Die is INCH) so consuming `surfaceSpeed`/`feedPerTooth`
16- * needs a real SFM->m/min + in->mm conversion through `physics/unit-conversions`
17- * -- wiring them as a "reader that silently skips everything" would be the exact
18- * fake-reader anti-pattern, so they are deferred expli
... [+3212 chars truncated]

### Assistant | 2026-06-11T13:17:18.994Z

[tool_use: Grep]

### User | 2026-06-11T13:17:20.400Z

[tool_result] 6- * Two layers, per the pure-core+injected-readers rule (RGS-MS1 lesson: a reader
7- * unit MUST ship a real-data E2E, not only fake-injected cases):
8- *   1. DI unit tests with fake providers -- pin the resolved/skip/miss/throw paths
9- *      and the NEVER-FABRICATE contract (null vc/fz on every non-match).
10: *   2. A real-data E2E through `withRealProviders()` against the actual romeo
11- *
... [+4290 chars truncated]

### Assistant | 2026-06-11T13:17:26.081Z

Now let me get the full source file content for the datasource to verify the complete control flow and check for any fabrication paths I may have missed.

### Assistant | 2026-06-11T13:17:27.526Z

[tool_use: Grep]

### User | 2026-06-11T13:17:28.598Z

[tool_result] 1:/**
2: * SFC combinatorial CITED-DATA source -- resolves a real, provenance-bearing
3: * (vc, fz) reference for a combinatorial cell, or returns UNRESOLVED. It NEVER
4: * fabricates a value: every number it emits came from a provider and carries its
5: * source; a miss is `resolved:false` with `vc_mpm/fz_mm = null`, never a silent
6: * default. (Pairs with the U-CSFH-05 gates' silent-default det
... [+5833 chars truncated]

### Assistant | 2026-06-11T13:17:28.680Z

[tool_use: Grep]

### User | 2026-06-11T13:17:29.898Z

[tool_result] 1:/**
2: * Tests for the SFC combinatorial CITED-DATA source (U-CSFH-03-DB-ACCESSORS).
3: *
4: * OSCAR-SFC-9AXIS-MS0 / slot:oscar, 2026-06-10.
5: *
6: * Two layers, per the pure-core+injected-readers rule (RGS-MS1 lesson: a reader
7: * unit MUST ship a real-data E2E, not only fake-injected cases):
8: *   1. DI unit tests with fake providers -- pin the resolved/skip/miss/throw paths
9: *      and t
... [+5490 chars truncated]

### Assistant | 2026-06-11T13:17:34.960Z

Now I have the complete picture of both files plus the full romeo joiner. Let me do one final targeted check on the confidence floor calculation and the `medianRow` behavior to confirm the fabrication-path analysis is complete.

### Assistant | 2026-06-11T13:17:36.900Z

[tool_use: Grep]

### Assistant | 2026-06-11T13:17:37.913Z

[tool_use: Grep]

### User | 2026-06-11T13:17:38.345Z

[tool_result] 228-    // ── manufacturer + iso last resort: median over all rows ──
229-    const isoRows = candidates.filter(r => r.isoGroup === iso);
230-    if (isoRows.length > 0) {
231:      const medianRow = this.medianRow(isoRows);
232:      return this.toMatch(medianRow, "manufacturer_iso");
233-    }
234-
235-    return null;
--
292-  }
293-
294-  /** Median row from a candidate set by vc_min ranking. 
... [+204 chars truncated]

### User | 2026-06-11T13:17:39.224Z

[tool_result] 30-  source_catalog: "seco",
31-  matched_series: "JS512",
32:  match_tier: "exact",
33:  confidence: 0.9,
34-};
35-const okProvider: VendorCatalogProvider = { lookup: () => fakeMatch };
--
49-    expect(row.fz_mm).toBe(0.05);
50-    expect(row.provenance.source).toBe("vendor_catalog");
51:    expect(row.provenance.confidence).toBe(0.9);
52-    expect(row.provenance.catalog).toBe("seco");
53:    e
... [+612 chars truncated]

### Assistant | 2026-06-11T13:18:55.052Z

I now have everything needed. Here is the full adversarial analysis.

---

## Code Review: SFC Combinatorial Cited-Data Source

### Attack 1: Can any input path produce a non-null vc/fz that the provider did not return?

No fabrication path exists. The control flow in `resolveCell` is exhaustive and the type system enforces it:

- The only `return` that sets `resolved:true` and non-null `vc_mpm`/`fz_mm` is at lines 102-114, gated on `if (match)` where `match` is the literal return value of `this.vendorCatalog.lookup(...)`. There is no coercion, no default assignment, no fallback arithmetic. The values on lines 104-105 are `match.vc_mpm` and `match.fz_mm` verbatim — the engine is a thin relay, not a transformer.
- The `else` branch (missing manufacturer or series, line 120-122) and the `catch` branch (line 117-119) both reach the same unresolved return at lines 124-134, where `vc_mpm` and `fz_mm` are hard-coded `null`. No early return in those branches.
- The `resolveCells` batch wrapper at line 138-140 is a pure `map` over `resolveCell` — no aggregation, no implicit substitution.

Fabrication path: none found.

---

### Attack 2: `errors[errors.length - 1] ?? "no provider matched"` — is the detail always meaningful?

This is a real flaw, though not a fabrication risk.

The `detail` field on an unresolved row always carries `errors[errors.length - 1]`. Three scenarios:

**Scenario A — manufacturer or series absent (line 121):** `errors` has exactly one entry: `"vendor_catalog skipped: requires both manufacturer and tool_id_or_series"`. The detail is accurate and the last entry is the only one. Fine.

**Scenario B — vendor returns null (line 116):** `errors` has exactly one entry describing the miss. The detail is accurate. Fine.

**Scenario C — vendor throws (line 118):** `errors` has exactly one entry. Fine.

The `?? "no provider matched"` fallback is unreachable in the current code because `errors` always has at least one entry before reaching the unresolved return
... [+10261 chars truncated]
