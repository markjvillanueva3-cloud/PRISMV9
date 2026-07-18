---
type: "chat-session"
source: "claude-code-cli"
session_id: "930f37b5-d5cf-4924-8d86-d7713730da3d"
title: "Independent review of a Design-of-Experiments SAMPLER for a manufacturing speed/"
date: "2026-06-11"
first_ts: "2026-06-11T19:16:23.141Z"
last_ts: "2026-06-11T19:18:56.645Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a0a556fe8d8cbab43.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Independent review of a Design-of-Experiments SAMPLER for a manufacturing speed/

> **claude-code-cli** | 2026-06-11 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a0a556fe8d8cbab43.jsonl`

## Transcript

### User | 2026-06-11T19:16:23.141Z

Independent review of a Design-of-Experiments SAMPLER for a manufacturing speed/feed validation harness. Read end-to-end:
Module: H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-sampler.ts
Test:   H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-sampler.test.ts

Purpose: generate the sampled cell space the harness driver runs through the SFC engine. It full-enumerates 192 valid discrete cells (operation×strategy×cut×toolmat from U-CSFH-02) and, for each × 6 ISO bands, draws K stratified samples over 5 continuous axes (diameter 10 vals, flutes 7, power 6, hardness 6, coolant 7). K is raised per operation so every (iso,operation) regime clears a floor (default 20) — sparse ops like tapping (2 cells) get K=10, milling (126) gets K=1. Seeded mulberry32 PRNG. Default total = 1716 (verified live). It deliberately does NOT call the cited-data source (citation happens later in the DRIVER).

Pressure-test the DOE/sampling correctness:
- Is the "stratified" claim honest? The picker is `arr[(seededOffset + i) % arr.length]` where i goes 0..K-1. Does this give real Latin-hypercube-like coverage, or is it a weak rotation that correlates axes (e.g. diameter and flutes advance in lockstep so only a diagonal of the joint space is ever sampled)? Is axis-correlation a problem for this harness's purpose, or acceptable?
- For milling K=1: each (cell, iso) draws exactly ONE continuous sample at the seeded offset. Is one sample per (milling-cell × iso) enough coverage of the 10×7×6×6×7 continuous space, given there are 126 milling cells × 6 iso = 756 milling samples total? Or does the per-cell K=1 leave continuous-axis coverage thin for the dominant operation?
- Is the per-regime floor (iso×operation) the right granularity, or should the floor also guarantee continuous-axis coverage (e.g. every diameter appears per regime)?
- mulberry32 constants (0x6d2b79f5, 15, 7, 61, 14, 4294967296) — are these the correct canonical mulberry32 values? (verify, don't assume)
- D
... [+367 chars truncated]

### Assistant | 2026-06-11T19:16:34.146Z

I'll read both files end-to-end before forming any judgments.

### Assistant | 2026-06-11T19:16:34.822Z

[tool_use: Read]

### Assistant | 2026-06-11T19:16:34.992Z

[tool_use: Read]

### User | 2026-06-11T19:16:36.068Z

[tool_result] 1	/**
2	 * SFC combinatorial DOE SAMPLER -- generates the sampled cell space the harness
3	 * driver runs through the SFC engine. Full-enumerates the discrete validity cells
4	 * (U-CSFH-02) and stratified-samples the continuous axes (diameter / flutes /
5	 * power / hardness / coolant) x the ISO-group axis, with a per-regime coverage
6	 * floor so even sparse operations (tapping has 2 valid cells
... [+6424 chars truncated]

### User | 2026-06-11T19:16:36.303Z

[tool_result] 1	/**
2	 * Tests for the SFC combinatorial DOE SAMPLER (U-CSFH-04-SAMPLER).
3	 *
4	 * OSCAR-SFC-9AXIS-MS0 / slot:oscar, 2026-06-11.
5	 *
6	 * Strong-oracle style (R9): pins the exact total, per-operation counts, and the
7	 * per-regime floor invariant -- so a sampling-logic change breaks a test with a
8	 * clear delta. The KEY correctness property is adaptive-K: sparse operations
9	 * (tapping 2 v
... [+6261 chars truncated]

### Assistant | 2026-06-11T19:16:41.573Z

Now I have the full picture. Let me also check the axes file to verify the array sizes referenced in the review questions.

### Assistant | 2026-06-11T19:16:43.060Z

[tool_use: Glob]

### Assistant | 2026-06-11T19:16:43.227Z

[tool_use: Glob]

### User | 2026-06-11T19:16:47.300Z

[tool_result] src\data\sfc-combinatorial-axes.ts

### User | 2026-06-11T19:16:47.347Z

[tool_result] src\data\sfc-combinatorial-validity.ts

### Assistant | 2026-06-11T19:16:51.430Z

[tool_use: Read]

### User | 2026-06-11T19:16:53.310Z

[tool_result] 1	/**
2	 * SFC combinatorial input axes — single canonical source of truth.
3	 *
4	 * OSCAR-SFC-9AXIS-MS0 / U-CSFH-01-AXES-EXTRACT (slot:oscar, 2026-06-04).
5	 *
6	 * These are the variability axes the SFC accepts, extracted verbatim from
7	 * `__tests__/UltimateSpeedFeedEngine.variability.test.ts` so that the 103-case
8	 * variability matrix, the 401-assert gauntlet, AND the runtime combinatorial
... [+3492 chars truncated]

### Assistant | 2026-06-11T19:16:58.707Z

I now have everything needed. Let me also verify the mulberry32 constants against the canonical reference.

### Assistant | 2026-06-11T19:16:59.722Z

[tool_use: WebSearch]

### Assistant | 2026-06-11T19:17:00.299Z

[tool_use: Read]

### User | 2026-06-11T19:17:03.493Z

[tool_result] 1	/**
2	 * SFC combinatorial VALIDITY matrix -- which (operation x strategy x cut_type x
3	 * tool_material) cells are physically/practically real, so the sampler never
4	 * enumerates a nonsensical regime (e.g. a "trochoidal turning" cell or a
5	 * "CBN tap") silently.
6	 *
7	 * OSCAR-SFC-9AXIS-MS0 / U-CSFH-02-VALIDITY-MATRIX (slot:oscar, 2026-06-10).
8	 *
9	 * Layered on U-CSFH-01's axes (`./sfc
... [+9161 chars truncated]

### User | 2026-06-11T19:17:32.162Z

[tool_result] Web search results for query: "mulberry32 PRNG constants 0x6d2b79f5 canonical implementation"

Links: [{"title":"Mulberry32: A Tiny, Fast, Deterministic RNG","url":"https://www.4rknova.com/blog/2026/03/01/mulberry32-rng"},{"title":"mulberry32/README.md at master · cprosche/mulberry32","url":"https://github.com/cprosche/mulberry32/blob/master/README.md?plain=1"},{"title":"code/jshash/PRNGs.md at ma
... [+4092 chars truncated]

### Assistant | 2026-06-11T19:18:56.645Z

I now have everything needed for a complete, evidence-based review. Here is the full analysis.

---

## Code Review: SFC Combinatorial DOE Sampler

### Files reviewed

- `H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-sampler.ts`
- `H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-sampler.test.ts`
- `H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-axes.ts` (axis sizes)
- `H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-validity.ts` (cell counts)

---

### 1. mulberry32 Constants — VERIFIED CORRECT

The canonical mulberry32 (attributed to bryc/tommyettinger, original C implementation 2017) is:

```
a = a + 0x6D2B79F5 | 0
t = Math.imul(a ^ a >>> 15, 1 | a)
t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
return ((t ^ t >>> 14) >>> 0) / 4294967296
```

The implementation in the sampler at lines 77–83 matches this byte-for-byte: additive constant `0x6d2b79f5`, shifts 15/7/14, multiplier seeds `1|a` and `61|t`, divisor `4294967296`. These are the correct canonical values. No deviation.

---

### 2. Determinism — CLEAN

There are no `Date.now()`, `Math.random()`, `performance.now()`, or any other ambient-state calls anywhere in the sampler. The only entropy source is the single `mulberry32(seed)` call at line 107. The RNG is called exactly 5 times per (cell, iso) pair for the five offset draws (`dOff`, `fOff`, `pOff`, `hOff`, `cOff`), then no further RNG calls occur during the K inner samples — `pick` is purely arithmetic. The enumeration order of `enumerateValidCells()` is itself deterministic (operation→strategy→cut_type→tool_material, fixed axis arrays). Same seed, same output, guaranteed.

---

### 3. "Stratified" Claim — HONEST BUT NARROW; AXIS-CORRELATION IS THE KEY FINDING

The picker is:

```typescript
const pick = <T>(arr: readonly T[], i: number, off: number): T => arr[(off + i) % arr.length]!;
```

For a single (cell, iso) pair with K samples, each axis independently cycles from its own seeded offset. So across i=0..K-1:


... [+11200 chars truncated]
