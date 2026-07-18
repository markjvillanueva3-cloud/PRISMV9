---
type: "chat-session"
source: "claude-code-cli"
session_id: "7efaddb4-e737-4637-939f-3d15ea0c2610"
title: "You are scrutiny ARM A (holistic correctness) of a strict 3-of-3 review gate for"
date: "2026-06-16"
first_ts: "2026-06-16T01:36:00.287Z"
last_ts: "2026-06-16T01:40:56.807Z"
cwd: "H:\\prism"
messages: 71
user_msgs: 28
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/agent-a8c27206de9660eb2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# You are scrutiny ARM A (holistic correctness) of a strict 3-of-3 review gate for

> **claude-code-cli** | 2026-06-16 | 71 msgs (28 user / 43 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/agent-a8c27206de9660eb2.jsonl`

## Transcript

### User | 2026-06-16T01:36:00.287Z

You are scrutiny ARM A (holistic correctness) of a strict 3-of-3 review gate for the PRISM hermes-zulu capability queue units C5-C8, all committed on branch cad-fusion-live-ms0. Read each file END-TO-END (not skimmed) and judge correctness, integration, and convention-conformance.

FILES TO REVIEW (all absolute under H:/prism/mcp-server/src/):
- engines/ZuluAdaptiveBackPressureEngine.ts (C5) + __tests__/ZuluAdaptiveBackPressureEngine.test.ts + __tests__/ZuluAdaptiveBackPressureEngine.dispatch.test.ts
- engines/ZuluCapabilityRegistryEngine.ts (C6) + __tests__/ZuluCapabilityRegistryEngine.test.ts + __tests__/ZuluCapabilityRegistryEngine.dispatch.test.ts
- engines/ZuluCapabilityAttestationEngine.ts (C7) + __tests__/ZuluCapabilityAttestationEngine.test.ts + __tests__/ZuluCapabilityAttestationEngine.dispatch.test.ts
- engines/ZuluSoulEvolutionAdvisorEngine.ts (C8) + __tests__/ZuluSoulEvolutionAdvisorEngine.test.ts + __tests__/ZuluSoulEvolutionAdvisorEngine.dispatch.test.ts
- tools/dispatchers/sessionDispatcher.ts — review ONLY the C5-C8 action handlers (search: backpressure_, capability_registry_snapshot, capability_attest, attestation_record_outcome, attestation_score, attestation_bid_modifier, soul_evolution_propose/emit/proposals_list) and their enum entries.

SPEC to verify against: H:/prism/state/shared/specs/HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-15.md (sections C5, C6, C7, C8).

WHAT C5-C8 ARE (verify the implementation matches intent):
- C5 ZuluAdaptiveBackPressureEngine: trend-aware advisory fan-out throttle; sliding-window queue_depth+error_rate -> BackPressureSignal; NEVER vetoes (advisory); escalates only on >=minConsecutiveHigh sustained breaches.
- C6 ZuluCapabilityRegistryEngine: READ-ONLY runtime capability attestation; per-slot liveness(alive/stale/crashed/idle)/warmth/queue_depth/domain_affinity; reads chat-slots.json + slot-task-claims.json; degrades-never-throws; NO store mutation.
- C7 ZuluCapabilityAttestationEngine: outcome-correlated trust
... [+1142 chars truncated]

### Assistant | 2026-06-16T01:36:07.352Z

I'll review the C5-C8 hermes-zulu capability queue units. Let me start by reading the spec and all the files end-to-end.

### Assistant | 2026-06-16T01:36:08.015Z

[tool_use: Read]

### Assistant | 2026-06-16T01:36:08.537Z

[tool_use: Read]

### User | 2026-06-16T01:36:10.570Z

[tool_result] 1	---
2	title: HERMES-CAPABILITY-EXPANSION-CANDIDATES
3	unit: HERMES-CAPABILITY-EXPANSION-MS0 / Unit 9
4	milestone: CAD-FUSION-LIVE-MS0
5	generated: 2026-06-15
6	author: subagent (agent-orchestration researcher, slot bravo research lane)
7	status: CANDIDATE — operator review required before build
8	safety: all candidates preserve existing safety gates; none weaken scrutiny or bypass ZuluFleetGover
... [+18615 chars truncated]

### User | 2026-06-16T01:36:11.077Z

[tool_result] 1	/**
2	 * ZuluAdaptiveBackPressureEngine -- C5 (ZULU fleet, HZP-NEW-02).
3	 *
4	 * Trend-aware fan-out throttle. The gap this fills: HermesParallelBudgetEnvelopeEngine
5	 * (HZP03) is a per-CALL budget check (within/over/refused) with NO model of a slot's
6	 * recent trajectory -- it cannot say "slot alpha has had queue_depth > 8 for the last 5
7	 * checks and a 40% error rate: do not fan-out mor
... [+20865 chars truncated]

### Assistant | 2026-06-16T01:36:20.217Z

I have the spec and C5 engine. Let me read the rest of the engines and the C2 reference engine (which C5/C7 claim to clone store discipline from), in parallel.

### Assistant | 2026-06-16T01:36:21.192Z

[tool_use: Read]

### Assistant | 2026-06-16T01:36:21.605Z

[tool_use: Read]

### Assistant | 2026-06-16T01:36:22.331Z

[tool_use: Read]

### User | 2026-06-16T01:36:28.900Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\ZuluSoulEvolutionAdvisorEngine.ts' was already read 0s ago in this session and is unchanged (mtime 1781571091176). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_
... [+13 chars truncated]

### User | 2026-06-16T01:36:31.762Z

[tool_result] 1	/**
2	 * ZuluCapabilityRegistryEngine -- C6 (ZULU fleet, HZD-NEW-04).
3	 *
4	 * Live, runtime capability attestation per slot. The gap this fills:
5	 * ZuluTaskAuctionEngine bids using a slot's STATIC soul-YAML domain_filter -- it cannot
6	 * tell a just-/compact'd cold slot from one that has been warm for 2 hours. This engine
7	 * aggregates the RUNTIME signals already present (chat-slots.json 
... [+14450 chars truncated]

### User | 2026-06-16T01:36:31.764Z

[tool_result] 1	/**
2	 * ZuluCapabilityAttestationEngine -- C7 (ZULU fleet, HZD-NEW-05).
3	 *
4	 * Outcome-correlated capability trust. The gap this fills: ZuluTaskAuctionEngine's
5	 * `domain_match` bid component (highest weight, W=4.0) trusts a slot's SOUL-DECLARED
6	 * domain expertise completely -- there is NO feedback loop from actual task outcomes.
7	 * A slot that DECLARES `mill` expertise but consistent
... [+20466 chars truncated]

### Assistant | 2026-06-16T01:36:35.726Z

The C8 read was blocked by the read-once guard but I don't actually have it in context yet. Let me read it with an explicit offset to bypass, and read the C2 reference engine for store-discipline comparison.

### Assistant | 2026-06-16T01:36:36.443Z

[tool_use: Read]

### User | 2026-06-16T01:36:39.199Z

[tool_result] 1	/**
2	 * ZuluSoulEvolutionAdvisorEngine -- C8 (ZULU fleet, HZD-NEW-06).
3	 *
4	 * Outcome-based soul evolution -- ADVISORY ONLY. PRISM slot souls
5	 * (state/shared/slot-souls/<slot>.md) are static YAML, amended only by manual operator
6	 * edits, so the fleet's routing table drifts from reality as slots accumulate real
7	 * expertise. This engine reads C7 AttestationScores (outcome-correlated t
... [+14456 chars truncated]

### Assistant | 2026-06-16T01:36:42.376Z

Now let me read the C2 reference engine for store-discipline comparison, the SoulFrontmatterReaderEngine for the SlotSoul type, and the ZuluTaskAuctionEngine for the integration claims.

### Assistant | 2026-06-16T01:36:42.858Z

[tool_use: Read]

### Assistant | 2026-06-16T01:36:43.288Z

[tool_use: Read]

### User | 2026-06-16T01:36:47.409Z

[tool_result] 1	/**
2	 * ZuluTaskContinuityEngine -- durable cross-session mid-flight task continuity.
3	 *
4	 * C2 (ZULU fleet). The gap this fills: the fleet already has
5	 *   - AtomicClaimBrokerEngine        -- WHO owns a resource (CAS claim + TTL)
6	 *   - SessionHandoffV2Engine         -- end-of-session human-readable handoff
7	 *   - CrossSessionOrchestratorEngine -- facade over both + broadcast
8	 * but
... [+21160 chars truncated]

### User | 2026-06-16T01:36:47.515Z

[tool_result] 1	/**
2	 * SoulFrontmatterReaderEngine — HSE01 slot-soul YAML frontmatter reader.
3	 *
4	 * Pure-core: parses a `state/shared/slot-souls/<slot>.md` file (already
5	 * read from disk by the caller) into a typed SlotSoul object.  Filesystem
6	 * I/O is injected — the parsing is what's tested here.
7	 *
8	 * @module engines/SoulFrontmatterReaderEngine
9	 */
10	
11	import { z } from "zod";
12	
13	expo
... [+3618 chars truncated]

### Assistant | 2026-06-16T01:36:52.096Z

Important finding already: `SlotSoul.domain_filter` is `z.string().max(500).optional()` — a **string**, not an array. But C8's `isSafeAmendment` and `proposeAmendments` treat domain_filter conceptually as a set of domains. Let me note that and verify the C8 refuse_list check semantics carefully. The refuse_list IS an array of strings per the schema, so `soul.refuse_list` handling is fine.

Now let me read the dispatcher handlers and the test files. Let me locate the C5-C8 handlers in the dispatcher first.

### Assistant | 2026-06-16T01:36:53.805Z

[tool_use: Grep]

### User | 2026-06-16T01:36:56.331Z

[tool_result] 539:  "backpressure_record_sample",
540:  "backpressure_assess",
541:  "backpressure_status",
543:  "capability_registry_snapshot",
544:  "capability_attest",
546:  "attestation_record_outcome",
547:  "attestation_score",
548:  "attestation_score_all",
549:  "attestation_bid_modifier",
551:  "soul_evolution_propose",
552:  "soul_evolution_emit",
553:  "soul_evolution_proposals_list",
4209:        
... [+565 chars truncated]

### Assistant | 2026-06-16T01:37:00.648Z

[tool_use: Read]

### Assistant | 2026-06-16T01:37:01.245Z

[tool_use: Read]

### User | 2026-06-16T01:37:04.489Z

[tool_result] 520	  "schedule_wave",
521	  "compute_wave_n",
522	  "wave_partition_render",
523	  "wave_next_render",
524	  // C2 ZuluTaskContinuityEngine -- durable cross-session mid-flight task continuity.
525	  "continuity_checkpoint",
526	  "continuity_resume",
527	  "continuity_list_midflights",
528	  // C3 ZuluFleetHealthSynthesisEngine -- slot health -> scored readiness vector.
529	  "zulu_fleet_health_s
... [+1994 chars truncated]

### User | 2026-06-16T01:37:05.058Z

[tool_result] 4195	              },
4196	              typeof p.now === "string" ? p.now : undefined,
4197	            );
4198	            // Only consult the governor when delegation did NOT deny (matches
4199	            // composeGatedAuthority's contract + avoids a needless governor call).
4200	            const governor = delegation.decision === "denied"
4201	              ? null
4202	              : ZuluF
... [+11710 chars truncated]

### Assistant | 2026-06-16T01:37:09.118Z

The dispatcher wiring looks complete. Now let me read all 8 test files to verify test integrity (R9). I'll note one thing: the dispatcher passes `soul_evolution_emit` proposals filtered by `isValidProposal`, but the `soul_evolution_propose` does NOT auto-emit — that's correct per spec (advisory, caller posts). Let me read the test files.

### Assistant | 2026-06-16T01:37:10.078Z

[tool_use: Read]

### Assistant | 2026-06-16T01:37:10.309Z

[tool_use: Read]

### User | 2026-06-16T01:37:47.783Z

[tool_result] 1	/**
2	 * ZuluAdaptiveBackPressureEngine (C5) tests -- pure trend core + durable ring store.
3	 *
4	 * Pure assessBackPressure: deterministic with injected `now` + explicit samples.
5	 * Durable: hermetic via __forTests(tmpPath) + injected `now`; unique tmp store per test.
6	 */
7	import { describe, it, expect, afterEach } from "vitest";
8	import * as fs from "fs";
9	import * as os from "os";
10	
... [+11226 chars truncated]

### User | 2026-06-16T01:37:47.925Z

[tool_result] 1	/**
2	 * ZuluAdaptiveBackPressureEngine (C5) -- dispatcher round-trip (R15 E2E).
3	 *
4	 * Exercises backpressure_record_sample / backpressure_assess / backpressure_status
5	 * THROUGH registerSessionDispatcher. HERMETIC: PRISM_ZULU_BACKPRESSURE_PATH -> a unique
6	 * tmp store at top-level before any dispatch (the dispatcher lazy-imports the engine, so
7	 * the singleton binds the tmp path on fi
... [+3108 chars truncated]

### Assistant | 2026-06-16T01:37:50.366Z

Now let me read the remaining 6 test files.

### Assistant | 2026-06-16T01:37:51.326Z

[tool_use: Read]

### Assistant | 2026-06-16T01:37:51.596Z

[tool_use: Read]

### User | 2026-06-16T01:38:08.022Z

[tool_result] 1	/**
2	 * ZuluCapabilityRegistryEngine (C6) tests -- pure attestation core + read-only snapshot.
3	 *
4	 * Pure: deterministic with injected nowMs + explicit records. Snapshot: hermetic via
5	 * __forTests(tmpSlots, tmpClaims) with tmp JSON files; read-only (no store mutation).
6	 */
7	import { describe, it, expect, afterEach } from "vitest";
8	import * as fs from "fs";
9	import * as os from "os"
... [+8250 chars truncated]

### User | 2026-06-16T01:38:08.029Z

[tool_result] 1	/**
2	 * ZuluCapabilityRegistryEngine (C6) -- dispatcher round-trip (R15 E2E).
3	 *
4	 * Exercises capability_registry_snapshot / capability_attest THROUGH
5	 * registerSessionDispatcher. HERMETIC: PRISM_CHAT_SLOTS_FILE +
6	 * PRISM_SLOT_TASK_CLAIMS_FILE -> unique tmp fixtures written at top-level BEFORE any
7	 * dispatch (the dispatcher lazy-imports the engine, whose singleton binds the env pat
... [+4566 chars truncated]

### Assistant | 2026-06-16T01:38:10.615Z

Now the C7 and C8 test files.

### Assistant | 2026-06-16T01:38:11.770Z

[tool_use: Read]

### Assistant | 2026-06-16T01:38:12.047Z

[tool_use: Read]

### User | 2026-06-16T01:38:18.671Z

[tool_result] 1	/**
2	 * ZuluCapabilityAttestationEngine (C7) tests -- Wilson-interval credibility core +
3	 * durable outcome store. Pure tests use hand-verified reference values; the durable
4	 * tests are hermetic via __forTests(tmpPath).
5	 */
6	import { describe, it, expect, afterEach } from "vitest";
7	import * as fs from "fs";
8	import * as os from "os";
9	import * as path from "path";
10	import { ZuluCa
... [+10717 chars truncated]

### User | 2026-06-16T01:38:19.099Z

[tool_result] 1	/**
2	 * ZuluCapabilityAttestationEngine (C7) -- dispatcher round-trip (R15 E2E).
3	 *
4	 * Exercises attestation_record_outcome / attestation_score / attestation_score_all /
5	 * attestation_bid_modifier THROUGH registerSessionDispatcher. HERMETIC:
6	 * PRISM_ZULU_ATTESTATION_PATH -> a unique tmp store set at top-level BEFORE any dispatch
7	 * (the dispatcher lazy-imports the engine whose singl
... [+4729 chars truncated]

### Assistant | 2026-06-16T01:38:22.209Z

The C7 tests use hand-verified Wilson reference values — real R9 asserts. Let me verify the Wilson lower-bound reference value 8/10 -> 0.4902 quickly, and then read the C8 test files.

### Assistant | 2026-06-16T01:38:23.149Z

[tool_use: Read]

### Assistant | 2026-06-16T01:38:23.464Z

[tool_use: Read]

### User | 2026-06-16T01:38:33.503Z

[tool_result] 1	/**
2	 * ZuluSoulEvolutionAdvisorEngine (C8) tests -- advisory-only soul-amendment proposals.
3	 * Pure proposal/safety logic + the append-only durable ledger (hermetic tmp file).
4	 *
5	 * SAFETY is the load-bearing property here: the engine must NEVER produce a proposal that
6	 * touches refuse_list / safety coverage, and must NEVER auto-apply. These tests pin that.
7	 */
8	import { describe, 
... [+10793 chars truncated]

### User | 2026-06-16T01:38:34.110Z

[tool_result] 1	/**
2	 * ZuluSoulEvolutionAdvisorEngine (C8) -- dispatcher round-trip (R15 E2E).
3	 *
4	 * Exercises the FULL C7->C8 composition through registerSessionDispatcher: record
5	 * outcomes via C7 (attestation_record_outcome), then soul_evolution_propose reads C7's
6	 * live AttestationScores and produces advisory proposals; soul_evolution_emit /
7	 * _proposals_list round-trip the durable ledger. HE
... [+4776 chars truncated]

### Assistant | 2026-06-16T01:38:38.718Z

I now have all the engine and test files read end to end. Let me verify a few specific concerns: the `ZuluTaskAuctionEngine` integration claims (does C7's bid_modifier actually get consumed anywhere, or is it orphaned?), the Wilson reference values, and whether `slimResponse` actually strips arrays (the C8 dispatch test depends on that). Let me check these.

### Assistant | 2026-06-16T01:38:40.604Z

[tool_use: Grep]

### Assistant | 2026-06-16T01:38:41.668Z

[tool_use: Grep]

### User | 2026-06-16T01:38:43.429Z

[tool_result] Found 8 files
mcp-server\src\tools\dispatchers\sessionDispatcher.ts
mcp-server\src\__tests__\ZuluSoulEvolutionAdvisorEngine.test.ts
mcp-server\src\engines\ZuluSoulEvolutionAdvisorEngine.ts
mcp-server\src\__tests__\ZuluCapabilityAttestationEngine.dispatch.test.ts
mcp-server\src\__tests__\ZuluCapabilityAttestationEngine.test.ts
mcp-server\src\engines\ZuluCapabilityAttestationEngine.ts
mcp-server\src
... [+97 chars truncated]

### User | 2026-06-16T01:38:43.966Z

[tool_result] 19:import { slimResponse } from "../../utils/responseSlimmer.js";
643:  return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] };

### Assistant | 2026-06-16T01:38:50.688Z

Two important findings confirmed:

1. **C7's `bid_modifier` is NOT consumed by `ZuluTaskAuctionEngine`** — the grep shows the C7 engine is referenced only in its own files + the dispatcher + C8. The spec for C5/C6/C7 all say "wire into ZuluTaskAuction" / "feeds ZuluTaskAuction as a bid modifier," but no auction integration exists. This is the R15 "wire to every natural consumer" question. However, the task brief notes these are advisory surfaces exposed via dispatcher; the auction wiring is a separate (future) unit. I'll flag it as a P2 (incomplete R15 wiring, advisory not blocking) rather than P0/P1 since the dispatcher actions ARE the delivered surface and the spec frames auction-feed as the eventual target.

2. The C8 dispatch test relies on `slimResponse` stripping empty arrays. Let me verify `slimResponse` actually strips empty arrays, since the test asserts `prop.proposals` is undefined-or-empty when there are zero proposals.

### Assistant | 2026-06-16T01:38:51.105Z

[tool_use: Read]

### User | 2026-06-16T01:38:54.883Z

[tool_result] 1	/**
2	 * Response Slimmer Utility
3	 * Reduces verbose response objects for MCP transport efficiency.
4	 * @module utils/responseSlimmer
5	 */
6	
7	/**
8	 * Slim a response object by removing null/undefined values and empty arrays.
9	 *
10	 * @param response - the value to slim
11	 * @param maxDepth - recursion ceiling (default 32). A circular reference or a
12	 *   pathologically deep payload w
... [+2516 chars truncated]

### Assistant | 2026-06-16T01:39:09.125Z

Confirmed: `slimResponse` strips empty arrays (line 43), so the C8 dispatch test's reliance on `prop.proposals` being undefined when empty is correct. But this is a subtle coupling: `soul_evolution_propose` returns `{...result, chat_message}` where `result = {proposals, refused}`. When `refused` is non-empty (safety test, line 78) it survives slimming; when `proposals` is empty it's stripped. The test handles both correctly.

Now let me verify a few correctness details in the C5 engine's trend logic, which has a subtle aspect. Let me also check the C7 Wilson math and the C5 `breach` function edge case. Let me compute the Wilson reference and trace the C5 "blocked extreme queue" path versus error path ordering. First, let me verify there's no anti-regression issue and the build/type-checks by checking the action count claim and confirming the dispatch tests match the enum.

Let me trace one subtle C5 logic concern carefully by re-reading the `breach` helper. The `recent = inWindow.slice(0, cfg.minConsecutiveHigh)` takes the *newest* N samples. `need = min(minConsecutiveHigh, recent.length)`. `breach(pred) = recent.filter(pred).length >= need && recent.length >= need`. 

Consider: window has only 2 samples, minConsecutiveHigh=3. Then recent.length=2, need=min(3,2)=2. So breach requires both 2 samples to breach. This means with fewer than minConsecutiveHigh samples, it escalates if ALL available samples breach. That's a deviation from strict "minConsecutiveHigh sustained" — with only 2 samples it escalates on 2. The doc says "escalates only when >= minConsecutiveHigh recent samples breach." Let me check if this is intended or a P-level finding. Let me re-read the relevant lines and the test that covers it.

The spec says C5 "escalates only on >=minConsecutiveHigh sustained breaches." The code's `need = Math.min(cfg.minConsecutiveHigh, recent.length)` weakens this: with only 1 in-window sample that breaches, `need=1`, so a SINGLE high sample escalates. That directly con
... [+181 chars truncated]

### Assistant | 2026-06-16T01:39:10.768Z

[tool_use: Grep]

### User | 2026-06-16T01:39:17.505Z

[tool_result] 55:  it("TREND-aware: a single high spike among nominal does NOT escalate (needs minConsecutiveHigh)", () => {
56:    // newest sample is a spike; the prior 2 are nominal -> recent-3 has only 1 breach < 3

### Assistant | 2026-06-16T01:39:30.003Z

Confirmed: the only "single spike" test (line 55-60) covers the case where there are 3 samples in the window and only 1 breaches — so `need=3`, `breach` requires 3, only 1 breaches → low. That's correct. But the test does NOT cover the case where there's only **1 sample total in the window** and it breaches. In that case `recent.length=1`, `need=min(3,1)=1`, and a single high sample → escalates to blocked/high. This contradicts the documented "a single high sample does NOT escalate; a level escalates only when >= minConsecutiveHigh recent samples breach."

This is a real trend-logic weakness. Whether it's a defect depends on intent: with only 1 sample of history, is escalating on it acceptable? The documented contract says no. However, the practical impact is bounded: it's advisory-only (never vetoes; default `PRISM_BACKPRESSURE_ENFORCE=0`), and a slot with only 1 sample in a 5-min window is an early/edge state. So the safety blast radius is minimal — worst case is an advisory "delay" recommendation that a consumer may ignore. I'll classify this as P2 (contract/doc mismatch, advisory-only impact, untested edge) rather than P0/P1.

Let me now verify the remaining integration claims and check the `os` unused import in C5 (it imports `os` but I didn't see it used) and confirm the action-count anti-regression. Let me check the C5 `os` import usage and whether tsc would flag it.

### Assistant | 2026-06-16T01:39:30.749Z

[tool_use: Grep]

### Assistant | 2026-06-16T01:39:31.890Z

[tool_use: Grep]

### User | 2026-06-16T01:39:32.471Z

[tool_result] 37:import * as os from "os";

### User | 2026-06-16T01:39:33.718Z

[tool_result] mcp-server\src\tools\dispatchers\sessionDispatcher.ts:8

Found 8 total occurrences across 1 file.

### Assistant | 2026-06-16T01:39:39.225Z

Found: C5 (`ZuluAdaptiveBackPressureEngine.ts:37`) imports `import * as os from "os";` but `os` is **never used** in the file (it was copied from C2's store discipline where `os.hostname()` is used for the writer field; C5 has no writer field). This is dead code — and under strict TypeScript (`noUnusedLocals`), it could fail the build. Let me verify the project's tsconfig `noUnusedLocals` setting to determine severity, and confirm each enum action appears exactly once (8 occurrences = the 4 patterns each appearing once in enum + once in case... actually that's 8 total for 4 patterns = 2 each = enum + case, correct).

### Assistant | 2026-06-16T01:39:40.993Z

[tool_use: Bash]

### User | 2026-06-16T01:39:57.195Z

[tool_result] tsconfig.json:    "noUnusedLocals": false,
tsconfig.json:    "noUnusedParameters": false,
tsconfig.json:    "noUnusedLocals": false,
tsconfig.json:    "noUnusedParameters": false,
---esbuild check: does build use tsc noEmit?---
        "build": "node --max-old-space-size=16384 node_modules/typescript/bin/tsc --noEmit && node esbuild.config.mjs",
        "build:verify": "node scripts/postbuild-veri
... [+121 chars truncated]

### Assistant | 2026-06-16T01:40:13.267Z

`noUnusedLocals: false` — so the unused `os` import in C5 will NOT fail the build. It's dead code only, downgrading to P2/P3 (convention/cleanliness, not correctness). 

Now let me do final verification on two correctness items I want to be adversarial about:

1. **C7 `over_claim` + the C8 `add_domain` path interaction with `domain_filter` being a string** — C8 proposes amendments to `domain_filter`, but `SlotSoul.domain_filter` is a free-text `z.string()` (e.g. `"[mill]"` in tests, or descriptive prose up to 500 chars). C8's `isSafeAmendment` only checks `refuse_list` (an array) — it never reads `domain_filter` to see if the domain is already present. So an `add_domain` proposal could propose adding a domain already in the filter, or `remove_domain` for one not present. This is advisory + operator-gated, so low impact, but it's a logic gap worth a P2.

2. Let me verify the C5 `assess` durable path doesn't surface `readOnly` — `assess()` reads the store and if corrupt returns empty samples → "low". The doc says corruption "is surfaced (status readOnly)". `assess` does NOT surface readOnly (only `status` does). The dispatcher `backpressure_assess` returns just `signal` with no readOnly flag. So a corrupt store silently degrades an `assess` call to "low" with no readOnly indicator on that specific call. Acceptable for advisory (documented as safe fallback), but a consumer calling only `assess` won't know the store is corrupt. P2 at most given `status` surfaces it and the design is explicitly fail-safe-to-low.

Let me confirm the C5 blocked-queue ordering is correct (blocked error checked before blocked queue, then high queue before high error) and there's no path where a "blocked extreme queue" is masked. Let me also double-check the `num()` helper returns NaN for bad queue_depth and how that interacts with `>=` comparisons in `breach`.

Tracing `breach((s) => num(s.queue_depth) >= cfg.queueHigh * 2)`: if `queue_depth` is NaN, `NaN >= 16` is `false` — safe. The pure c
... [+442 chars truncated]

### Assistant | 2026-06-16T01:40:14.169Z

[tool_use: Grep]

### User | 2026-06-16T01:40:16.677Z

[tool_result] 40:import type { AttestationScore, AttestationConfidence } from "./ZuluCapabilityAttestationEngine.js";

### Assistant | 2026-06-16T01:40:56.807Z

Confirmed: C8 uses `import type` only (line 40) — a type-only import is erased at compile time, so there is NO runtime import of C7 in C8. The C7→C8 composition correctly lives at the dispatcher (`soul_evolution_propose` awaits `za.attestAll` then passes scores to `ZSE.proposeAmendments`). This matches the spec's requirement exactly.

I have completed end-to-end review of all 13 files (4 engines + 8 tests + dispatcher handlers), plus the C2 reference engine and SlotSoul type. Here are my findings.

---

## Findings (Scrutiny ARM A — holistic correctness)

**[P2]** `H:/prism/mcp-server/src/engines/ZuluAdaptiveBackPressureEngine.ts:196-198` — The trend gate weakens with sparse windows. `recent = inWindow.slice(0, minConsecutiveHigh)`, `need = Math.min(minConsecutiveHigh, recent.length)`, `breach = recent.filter(pred).length >= need`. When the window holds **fewer than `minConsecutiveHigh` samples**, `need` shrinks to the available count, so with only 1 in-window sample that breaches, `need=1` and a **single high sample escalates** — directly contradicting the engine's own documented contract (lines 19-21: "a single high sample does NOT escalate; a level escalates only when >= minConsecutiveHigh recent samples breach") and the spec ("escalates only on >=minConsecutiveHigh sustained breaches"). The only "single spike" test (`...test.ts:55`) covers 3-samples-1-breach, not the 1-sample case, so the gap is untested. Impact is bounded (advisory-only, never vetoes, default `ENFORCE=0`, early-state edge). Fix: require a true minimum — e.g. `const breach = (pred) => recent.length >= cfg.minConsecutiveHigh && recent.filter(pred).length >= cfg.minConsecutiveHigh;` (return "low" when `inWindow.length < minConsecutiveHigh`), and add a test pinning "1 high sample in window -> low".

**[P2]** `H:/prism/mcp-server/src/engines/ZuluAdaptiveBackPressureEngine.ts:37` — `import * as os from "os";` is dead code. C5 cloned C2's storage layer but, unlike C2 (which uses `os.hostname()` for th
... [+5084 chars truncated]
