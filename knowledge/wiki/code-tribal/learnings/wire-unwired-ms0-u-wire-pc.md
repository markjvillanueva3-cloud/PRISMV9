# WIRE-UNWIRED-MS0/U-WIRE-PC — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PC: wire PromptCachingEngine into prism_dev (4 read/compute actions, engine-pair test already exists)

**Commit:** `d14dcb2e348e` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T08:47:03-05:00
**Tags:** wire-unwired-ms0, u-wire-pc, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PC: wire PromptCachingEngine into prism_dev (4 read/compute actions, engine-pair test already exists)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PC: wire PromptCachingEngine into prism_dev (4 read/compute actions, engine-pair test already exists)

Wires 4 pure-compute/read surfaces through prism_dev:
- pc_build_cached_system  -> buildCachedSystem(input, opts)
- pc_wrap_system_prompt   -> wrapSystemPrompt(prompt, volatile?, opts)
- pc_break_even_reads     -> breakEvenReads(blockTokens)
- pc_get_stats            -> getStats()

PromptCachingEngine sizes Anthropic prompt-cache breakpoints + tracks
cumulative hit-rate stats. All wired methods are pure compute or
shallow-copy reads — none mutate the singleton stats object.

DEFERRED (state-mutation):
- recordUsage(usage): mutates singleton stats (total_requests++,
  cache_hits++, cached_input_tokens+=, ...). LLM-callable would let
  any chat inflate cache hit-rate metrics, poisoning the cost-savings
  estimation other chats rely on.
- resetStats(): zeros stats. Peer chats accumulating into the singleton
  would lose their data on any LLM-triggered reset.

Note: engine-direct test (PromptCachingEngine.test.ts) already exists
from the prior surfacing (engine fell in WEAK-SIGNAL classification,
not TRULY-UNWIRED). Only the dispatcher round-trip layer is new here.

INFINITY ENCODING (PCR pattern from earlier wires):
breakEvenReads returns Infinity when blockTokens < 1024 (engine line
248). JSON.stringify(Infinity) === 'null' — so the dispatcher case
encodes the result as:
  { blockTokens, break_even_reads: <number|"Infinity">, is_finite: <bool> }
Tests verify the boundary at 512 (returns "Infinity"/false) vs 4096
(returns 1/true).

DoS guards:
- stable: 0-32 blocks, each 0-500KB
- volatile: 0-32 blocks, each 0-500KB
- maxBreakpoints: 1-4 (Anthropic API cap)
- minCacheChars: 1-1M
- systemPrompt: 0-1MB
- volatileTail: 0-500KB
- blockTokens: 0-10M (DoS cap on tokenization-based computation)

Test coverage: 21/21 vitest PASS (dispatcher only — engine pair exists):
- Zod schema validation (5 — required fields + 32-block cap +
  maxBreakpoints 4 cap + 1MB systemPrompt cap + non-negative
  blockTokens with 10M cap)
- build_cached_system (5 — large block gets ephemeral breakpoint /
  small block does NOT / 3-combo variability / 5-block input still
  caps at 4 breakpoints / routing proof per-field)
- wrap_system_prompt (2 — 1-block when no volatile / 2-block when
  volatile supplied with stable[0] cached + volatile[1] uncached)
- break_even_reads (3 — sub-1024 returns "Infinity"/false /
  >=1024 returns 1/true / 3-case boundary variability)
- get_stats (3 — 6-field shape / routing proof / SHALLOW COPY
  invariant: two calls return independent objects with equal
  numeric content but `a !== b` references)
- error envelope (3 — missing stable / oversize 100-block stable /
  negative blockTokens)

SHALLOW-COPY invariant test (engine line 199 `{...this.stats}` spread)
follows the same load-bearing-safety pattern as FDA U-WIRE-FDA's
getValidationStatus mutation-isolation test from the previous loop iter.
Without the spread, any consumer mutating returned `.total_requests`
would silently poison the engine's authoritative counter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../src/__tests__/dispatcher.promptCaching.test.ts | 252 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  33 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  49 +++-
- 3 files changed, 333 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- tile?, opts)
- Note: engine-direct test (PromptCachingEngine.test.ts) already exists
- tile: 0-32 blocks, each 0-500KB
- tileTail: 0-500KB
- till

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d14dcb2e348e`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._