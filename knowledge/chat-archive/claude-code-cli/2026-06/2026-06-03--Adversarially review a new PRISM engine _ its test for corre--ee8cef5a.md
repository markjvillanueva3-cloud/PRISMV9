---
type: "chat-session"
source: "claude-code-cli"
session_id: "ee8cef5a-0329-4f80-9051-ad015abc53ba"
title: "Adversarially review a new PRISM engine + its test for correctness. This is BLAC"
date: "2026-06-03"
first_ts: "2026-06-03T19:13:47.835Z"
last_ts: "2026-06-03T19:21:09.606Z"
cwd: "H:\\prism\\mcp-server"
messages: 69
user_msgs: 25
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/ee8cef5a-0329-4f80-9051-ad015abc53ba/subagents/agent-a741ad19c2b4538b1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Adversarially review a new PRISM engine + its test for correctness. This is BLAC

> **claude-code-cli** | 2026-06-03 | 69 msgs (25 user / 44 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/ee8cef5a-0329-4f80-9051-ad015abc53ba/subagents/agent-a741ad19c2b4538b1.jsonl`

## Transcript

### User | 2026-06-03T19:13:47.835Z

Adversarially review a new PRISM engine + its test for correctness. This is BLACKWELL-AI-MS0/U-CAP-PROBE (slot india): a runtime GPU/Ollama capability probe that complements the EXISTING `ModelRoutingEngine` (a PURE scorer that does NO I/O and requires callers to supply `RoutingContext.hardware` + `backendUp`). The probe does the live I/O ModelRoutingEngine delegates: detect HardwareProfile from nvidia-smi, list present/loaded models from Ollama /api/tags + /api/ps, compute which catalog models are runnable now, and feed ModelRoutingEngine.

Read these files END TO END:
1. H:/prism/mcp-server/src/engines/OllamaCapabilityProbeEngine.ts (the engine)
2. H:/prism/mcp-server/src/__tests__/OllamaCapabilityProbeEngine.test.ts (its tests)
Reference (read for the integration contract): H:/prism/mcp-server/src/engines/ModelRoutingEngine.ts (esp. HardwareProfile, ModelSpec, DEFAULT_MODEL_CATALOG, RoutingContext).

Verify rigorously:
- **WDDM free-VRAM correction logic**: on Windows the GPU was VERIFIED idle/available but `nvidia-smi memory.free` read ~1528 MiB of 97887 (a committed-pool artifact, NOT real saturation). The engine must detect implausible free (< 15% of total) and estimate free = total − loadedVRAM − reserve. Is the math correct? Are there off-by-one / unit (MiB vs bytes vs GB) bugs? `/api/ps` size_vram is BYTES → MiB. Catalog vramGB → MiB uses *1024. Confirm consistency.
- **HardwareProfile detection**: name-match then VRAM thresholds. Correct mapping to home_blackwell/home_4080/work_3080/cloud_only? Any gap (e.g. a 12GB card)?
- **runnable filter**: present-in-/api/tags AND runsOn includes hardware AND fits free VRAM. Does it correctly EXCLUDE absent models (the deepseek-r1:14b problem) and surface them as warnings?
- **fail-soft**: nvidia-smi missing, Ollama down, malformed JSON — never throws? Cache TTL with injected clock correct?
- **Test integrity (CRITICAL)**: are assertions REAL (exact values / behavior) or weak placeholders? Does the WDDM test assert th
... [+500 chars truncated]

### Assistant | 2026-06-03T19:14:02.990Z

I'll review this engine and its test adversarially. Let me start by reading all three files end to end.

### Assistant | 2026-06-03T19:14:03.497Z

[tool_use: Read]

### Assistant | 2026-06-03T19:14:04.614Z

[tool_use: Read]

### Assistant | 2026-06-03T19:14:04.664Z

[tool_use: Read]

### User | 2026-06-03T19:14:09.137Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\ModelRoutingEngine.ts' was already read 18m ago in this session and is unchanged (mtime 1780511231000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-06-03T19:14:12.980Z

[tool_result] 1	/**
2	 * OllamaCapabilityProbeEngine — BLACKWELL-AI-MS0 / U-CAP-PROBE (keystone)
3	 *
4	 * The single RUNTIME AUTHORITY for "what can this host actually run right now."
5	 *
6	 * `ModelRoutingEngine` is a deliberately PURE scorer — its header states it does
7	 * NO network I/O and requires the caller to supply a `RoutingContext`
8	 * (`hardware` + `backendUp`). Nothing detected those from the li
... [+18802 chars truncated]

### User | 2026-06-03T19:14:15.838Z

[tool_result] 1	/**
2	 * Tests for OllamaCapabilityProbeEngine (BLACKWELL-AI-MS0 / U-CAP-PROBE).
3	 *
4	 * Coverage: happy path · WDDM free-VRAM correction (the verified Windows
5	 * artifact) · 3 failure modes (no GPU, Ollama down, malformed JSON) · 2
6	 * adversarial (NaN/empty VRAM, oversize-doesn't-fit) · 4-profile variability
7	 * (blackwell/4080/3080/cloud_only) · TTL cache (injected clock) · the
8	 * rou
... [+16198 chars truncated]

### Assistant | 2026-06-03T19:14:21.538Z

The engine and test are in my context. The reference file (`ModelRoutingEngine.ts`) was read earlier this session per the read-once guard, but I need its specific contents (HardwareProfile, ModelSpec, DEFAULT_MODEL_CATALOG, RoutingContext, and the route() logic). Let me extract the load-bearing parts I need to verify the integration contract.

### Assistant | 2026-06-03T19:14:23.622Z

[tool_use: Grep]

### User | 2026-06-03T19:14:27.863Z

[tool_result] 4: * Decide which LLM backend/model should service a given request so simple
8: * — callers feed it request features + a live backend-availability snapshot,
15: *      capability backend. Never let a 3B local model decide whether a cut
20: *      we only consider free-tier backends.
21: *   4. When everything fits, prefer the backend with lower marginal cost and
43:export type HardwareProfile =
47
... [+5965 chars truncated]

### Assistant | 2026-06-03T19:14:32.038Z

I have the catalog. Now let me verify the specific VRAM/runsOn values for the models that the tests assert against, plus the route() scoring tail to confirm the round-trip test. Let me read the key catalog entries and route logic precisely.

### Assistant | 2026-06-03T19:14:33.092Z

[tool_use: Read]

### User | 2026-06-03T19:14:34.587Z

[tool_result] 125	export const DEFAULT_MODEL_CATALOG: ModelSpec[] = [
126	  // ── Local Ollama — Blackwell GPU tier (RTX PRO 6000 96GB) ───────────
127	  // The 2026-06-03 BLACKWELL-GPU-SWAP made these large local models free
128	  // and fast (warm ~220 tok/s, full GPU residency). They are the token-
129	  // saving payoff: a free 32B coder beats paid cloud on `code` and on
130	  // substantial `reasoning`/`ch
... [+6380 chars truncated]

### Assistant | 2026-06-03T19:14:41.363Z

Now I have the catalog entries the tests reference. Critical observation: `qwen2.5-coder:7b` has `vramGB: 14` (line 300), and `runsOn: ["home_blackwell", "home_4080"]` (line 306). This is load-bearing for the 4080 fit test. Let me verify the route() scoring tail (lines ~700-800) to validate the round-trip test's `decision.model === "qwen2.5-coder:32b"` assertion, and confirm the qwen2.5-coder:7b runsOn/vram exactly.

### Assistant | 2026-06-03T19:14:42.779Z

[tool_use: Read]

### Assistant | 2026-06-03T19:14:43.372Z

[tool_use: Read]

### User | 2026-06-03T19:14:45.263Z

[tool_result] 296	  {
297	    id: "qwen2.5-coder:7b",
298	    backend: "ollama",
299	    paramsB: 7,
300	    vramGB: 14,
301	    qualityTier: 52,
302	    codeTier: 70,
303	    latencyMsTypical: 1000,
304	    inputCostUSDPer1k: 0,
305	    outputCostUSDPer1k: 0,
306	    runsOn: ["home_blackwell", "home_4080"],
307	    tags: ["code", "gcode"],
308	  },
309	
310	  // ── Local Ollama — work (RTX 3080 10GB, quantized
... [+1598 chars truncated]

### User | 2026-06-03T19:14:46.239Z

[tool_result] 450	  /** Active adaptation overrides keyed by model id. Mutated by `applyAdaptiveState`. */
451	  private adaptive: ModelAdaptiveState = {};
452	
453	  constructor(catalog: readonly ModelSpec[] = DEFAULT_MODEL_CATALOG) {
454	    this.catalog = [...catalog];
455	  }
456	
457	  /** Add or replace a model entry (match by id). Intended for tests/overrides. */
458	  register(spec: ModelSpec): void {
4
... [+4764 chars truncated]

### Assistant | 2026-06-03T19:14:51.401Z

Now I have the key data. Let me verify the route() scoring logic to confirm the round-trip test produces `qwen2.5-coder:32b`, and check the `score()`/`canServe()` code path and `estimateCost`. Let me read 580-760.

### Assistant | 2026-06-03T19:14:52.421Z

[tool_use: Read]

### User | 2026-06-03T19:14:54.100Z

[tool_result] 600	      expectedCostUSD: winner.costUSD,
601	      fallbacks,
602	      error: null,
603	    };
604	  }
605	
606	  // ── internals ────────────────────────────────────────────────────────
607	
608	  private canServe(
609	    m: ModelSpec,
610	    req: RoutingRequest,
611	    ctx: RoutingContext,
612	    rationale: string[],
613	    hardFail: boolean,
614	  ): boolean {
615	    // Hardware must a
... [+6370 chars truncated]

### Assistant | 2026-06-03T19:14:58.688Z

Now I have everything for the round-trip test. Let me trace the round-trip carefully and then verify the dispatcher exists for the dispatcher round-trip test. Let me check the dispatcher.

### Assistant | 2026-06-03T19:15:00.061Z

[tool_use: Grep]

### User | 2026-06-03T19:15:09.971Z

[tool_result] 226-} as const;
227-
228-// ──────────────────────────────────────────────────────────────────────
229-// BLACKWELL-AI-MS0/U-CAP-PROBE (slot:india, 2026-06-03) — runtime capability
230:// probe. OllamaCapabilityProbeEngine does the live nvidia-smi + /api/tags I/O
231-// that ModelRoutingEngine (pure scorer) deliberately delegates to callers:
232-// detect the HardwareProfile, WDDM-correct free VRA
... [+1969 chars truncated]

### Assistant | 2026-06-03T19:15:14.777Z

The dispatcher is wired. Now let me look at the validation/error handling path of the dispatcher to verify the `rejects a non-boolean force` test. The schema uses `.passthrough()` with `force: z.boolean().optional()`. Let me check how the dispatcher validates and returns success/error.

### Assistant | 2026-06-03T19:15:16.030Z

[tool_use: Read]

### User | 2026-06-03T19:15:18.322Z

[tool_result] 870	async function getMillFacade() {
871	  if (!_millFacade) {
872	    const mod = await import("../../engines/MillMasterOrchestratorFacadeEngine.js");
873	    _millFacade = mod.millMasterOrchestratorFacadeEngine;
874	  }
875	  return _millFacade;
876	}
877	
878	async function getMillAwareness() {
879	  if (!_millAwareness) {
880	    const mod = await import("../../engines/MillAISelfAwarenessInteg
... [+1550 chars truncated]

### Assistant | 2026-06-03T19:15:24.920Z

Now I have the full picture. Let me verify one critical detail for the dispatcher round-trip test: the schema uses `.passthrough()` and `force: z.boolean().optional()`. The "rejects a non-boolean force" test passes `{ force: "yes" }` and expects validation to FAIL. Let me confirm `validateActionParams` actually runs `.safeParse` (so a non-boolean force is rejected) — `.passthrough()` allows unknown keys but `force` is a declared key with a `z.boolean()` type, so `"yes"` should fail. Let me confirm.

### Assistant | 2026-06-03T19:15:26.984Z

[tool_use: Grep]

### User | 2026-06-03T19:15:33.603Z

[tool_result] H:\prism\mcp-server\src\tools\dispatchers\atcsDispatcher.ts-120-  const taskDir = getTaskDir(taskId);
H:\prism\mcp-server\src\tools\dispatchers\atcsDispatcher.ts-121-  const filePath = path.join(taskDir, "DELEGATED_UNITS.json");
H:\prism\mcp-server\src\tools\dispatchers\atcsDispatcher.ts-122-  if (!fs.existsSync(filePath)) return [];
src\tools\dispatchers\atcsDispatcher.ts:123:  try { return JSON.
... [+3260 chars truncated]

### Assistant | 2026-06-03T19:15:38.857Z

Let me find the `validateActionParams` definition specifically to confirm it `safeParse`s.

### Assistant | 2026-06-03T19:15:39.550Z

[tool_use: Grep]

### User | 2026-06-03T19:15:44.882Z

[tool_result] Found 2 files
src\utils\dispatcherMiddleware.ts
src\validation\actionParamValidator.ts

### Assistant | 2026-06-03T19:15:49.933Z

Which one does the dispatcher import? The dispatcher calls `validateActionParams(action, params, ALL_AI_SCHEMAS)`. Let me check the import in the dispatcher and the implementation.

### Assistant | 2026-06-03T19:15:53.064Z

[tool_use: Grep]

### Assistant | 2026-06-03T19:15:53.115Z

[tool_use: Grep]

### User | 2026-06-03T19:15:56.587Z

[tool_result] 21:import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
41:// is the per-action Zod validation map handed to validateActionParams.
905:  // validateActionParams indexes the map by action; passing a single Zod object made it always pass).
907:  const validation = validateActionParams(action, params, ALL_AI_SCHEMAS);

### User | 2026-06-03T19:15:57.574Z

[tool_result] 49- * @param strictness - Validation strictness level (default: "coerce")
50- * @returns ValidationResult with valid flag, coerced params, or structured error
51- */
52:export function validateActionParams(
53-  action: string,
54-  params: Record<string, any>,
55-  schemas: ActionSchemaRegistry,
--
59-
60-  // No schema for this action → pass through (gradual rollout)
61-  if (!schema) {
62:    r
... [+686 chars truncated]

### Assistant | 2026-06-03T19:16:04.510Z

The dispatcher uses the `dispatcherMiddleware.ts` import (line 21), but there are two implementations. Both files define `validateActionParams`. The import is from `dispatcherMiddleware.js`. The one I just read is from `validation/actionParamValidator.ts`. I need the one actually used. Let me check the middleware one, and critically, whether `coerceTypes` would coerce `"yes"` into a boolean (which would break the "rejects non-boolean force" test).

### Assistant | 2026-06-03T19:16:06.171Z

[tool_use: Grep]

### User | 2026-06-03T19:16:12.375Z

[tool_result] 73- * Validate action parameters against a schema map.
74- * Returns validation result or a pass-through if no schema exists for the action.
75- */
76:export function validateActionParams(
77-  action: string,
78-  params: Record<string, unknown>,
79-  schemas: Record<string, z.ZodTypeAny>,
--
83-    // No schema = pass through (valid)
84-    return { valid: true, success: true, data: params };
85
... [+149 chars truncated]

### Assistant | 2026-06-03T19:16:21.831Z

The middleware version (the one actually imported by the dispatcher, line 21) does NOT coerce — it calls `schema.safeParse(params)` directly. So `{ force: "yes" }` against `z.object({ force: z.boolean().optional() }).passthrough()` will fail (`"yes"` is not a boolean), and `validation.valid` is false → `dispatcherError(...)` → `{ success: false, error: <string> }`. The "rejects a non-boolean force" test is valid and correct.

Now let me do the precise numerical verification of the core claims. Let me work through the critical math.

**WDDM correction math (test line 61-65):**
- `BLACKWELL_SMI_WDDM = "...Edition, 97887, 1528"` → total=97887, rawFree=1528
- implausible check: `1528 < 97887 * 0.15 = 14683.05` → true. Correct.
- loaded: PS_7B has `size_vram: 8749454458` bytes → `Math.round(8749454458 / (1024*1024))` = `Math.round(8344.0006...)` = 8344 MiB
- estimated = `Math.max(0, 97887 - 8344 - 2048)` = `87495`
- Test asserts `97887 - loadedMiB - DESKTOP_RESERVE_MIB` = `97887 - 8344 - 2048` = 87495. Matches exactly.

Let me verify `8749454458 / 1048576`:

### Assistant | 2026-06-03T19:16:23.574Z

[tool_use: Bash]

### User | 2026-06-03T19:16:30.800Z

[tool_result] loadedMiB= 8344
est= 87495
implausible 1528< 14683.05 : true

### Assistant | 2026-06-03T19:16:46.102Z

WDDM math confirmed: 8344 loaded → 87495 estimated free. Now the runnable check for the WDDM test: all three present models (qwen2.5-coder:32b vram 20GB=20480 MiB, qwen2.5-coder:7b vram 14GB=14336 MiB, nomic-embed-text vram 2GB=2048 MiB) must fit 87495 free AND be in runsOn for home_blackwell. All three have home_blackwell in runsOn. All fit. Correct.

Now the critical adversarial checks. Let me trace the **4080 oversize test (lines 213-227)** and the **4080 fit test (lines 230-242)** because there's a subtle issue with `qwen2.5-coder:7b` having `vramGB: 14`.

**4080 fit test (line 240):** `SMI_4080 = "...4080 SUPER, 16376, 15000"`, free=15000. qwen2.5-coder:7b needs `14 * 1024 = 14336` MiB. `14336 <= 15000` → runnable. Test asserts runnable contains it. Correct. And asserts NOT qwen2.5-coder:32b because runsOn=["home_blackwell"] excludes 4080. Correct.

**4080 oversize test (line 213-227):** free=10000. qwen2.5-coder:7b needs 14336 > 10000 → excluded + warns "not runnable now". Correct.

Now let me check the WDDM-plausibility check for the 4080 fit test. free=15000, total=16376. `15000 < 16376 * 0.15 = 2456.4`? No. So no WDDM estimate — trusts 15000. Good. But wait — let me check the **3080 test**: free=9000, total=10240. `9000 < 1536`? No. Trusts 9000. llama3.2:3b needs 6*1024=6144 <= 9000 → runnable. Correct.

Now let me verify the round-trip test scoring produces `qwen2.5-coder:32b`. The filtered catalog has only present ollama models that fit (qwen2.5-coder:32b on blackwell, free 80000, needs 20480 → fits) + all cloud models. Task: `code`, costBudgetUSD: 0 (free-only). Let me trace canServe + score for the candidates.

### Assistant | 2026-06-03T19:16:50.040Z

[tool_use: Bash]

### User | 2026-06-03T19:17:00.708Z

[tool_result] Exit code 127
[rtk: batch file arguments are invalid]

### Assistant | 2026-06-03T19:17:04.001Z

RTK is choking on the multiline. Let me run it plainly.

### Assistant | 2026-06-03T19:17:05.236Z

[tool_use: Bash]

### User | 2026-06-03T19:17:14.370Z

[tool_result] 32b code score: 79.5
cloud opus excluded by budget0? cloud cost>0 yes

### Assistant | 2026-06-03T19:17:33.925Z

The round-trip test holds: with costBudgetUSD:0 (free-only), all cloud models (cost>0) fail the cost wall in `canServe`, leaving only `qwen2.5-coder:32b` (free, present, fits). `nomic-embed-text` is embed-only (tags=["embed"], length 1) so it's filtered for a non-embed `code` task by line 664. So the only candidate is qwen2.5-coder:32b → `decision.model === "qwen2.5-coder:32b"`. Correct.

Now let me hunt adversarially for actual bugs. Let me examine the most suspicious areas closely.

**Bug hunt 1 — `#parsePs` size_vram unit + the WDDM estimate when loaded models exist but `/api/ps` returned a model NOT counted.** This is fine.

**Bug hunt 2 — The WDDM estimate uses `loadedMiB` from `/api/ps`. But the raw free read of 1528 already accounts for the loaded model.** Consider: if Ollama loaded the 7b (8344 MiB) and the WDDM artifact makes free read 1528, the engine estimates `free = total - loaded - reserve = 87495`. But the loaded model occupies VRAM that's genuinely unavailable. This is correct — it subtracts the loaded model. Good.

But there's a subtle concern: **what if `/api/ps` is unreachable (returns null) while nvidia-smi reports implausible free?** Then `loadedModels = []`, `loadedMiB = 0`, estimate = `total - 0 - reserve`. This OVER-estimates free (ignores actually-loaded models). But that's the degraded path; arguably acceptable since fail-soft. Let me note as a P2/observation, not P0.

**Bug hunt 3 — The most important one. Look at `#correctFreeVram` implausibility threshold interaction with hardware that genuinely has low free.** On a small card legitimately near-full, e.g. a 3080 with 10240 total and 1000 free (legitimately loaded), `1000 < 1536` → implausible triggers → it estimates `free = 10240 - loaded - 2048`. On a 3080 the WDDM artifact may or may not be real, but this is a Windows-wide assumption. For non-Windows hosts (Linux, no WDDM), this correction is WRONG — a genuinely-saturated Linux GPU at 1GB free would get its free VRAM falsely inflated. 
... [+598 chars truncated]

### Assistant | 2026-06-03T19:17:35.443Z

[tool_use: Grep]

### User | 2026-06-03T19:17:41.022Z

[tool_result] No matches found

### Assistant | 2026-06-03T19:18:28.412Z

Confirmed: no platform guard. This is a genuine issue, but its severity is bounded — PRISM's documented hosts are all Windows (DESKTOP-N7MI1VB, etc.), and the correction only *inflates* free, which is conservative-wrong (could cause an OOM on load on a non-Windows busy GPU). I'll rate it P1 (real issue, latent on Linux/macOS hosts) rather than P0, since the immediate target is Windows.

Now the more serious adversarial pass. Let me re-examine `#correctFreeVram` for the **over-promise direction** even ON Windows:

The estimate is `total − loaded − reserve`. But this assumes the ONLY consumers of VRAM are Ollama-loaded models + a 2GB desktop reserve. If another process (a game, another CUDA app, a second Ollama instance, browser GPU accel) holds VRAM, this estimate **over-promises** free VRAM — and the engine would then declare a model runnable that won't fit → OOM. The raw nvidia-smi free of 1528 was thrown away precisely because it's deemed unreliable. There's genuine tension here: the design trades a false-low (WDDM artifact) for a potential false-high (unaccounted external VRAM). On a dedicated inference host this is fine; the 2GB reserve is the only cushion. I'll note this as P1/design-risk because the consequence (declaring runnable → OOM at model load) is real, and the only guard is a fixed 2GB reserve that doesn't scale with the card or account for external consumers.

Now let me check a **real test-integrity bug**. The WDDM correction test asserts the exact corrected number — good. But let me check: **is there a test that would pass even if the WDDM logic were broken?**

Consider the "happy path" WDDM test asserts `freeEstimated: true` AND `freeMiB === 87495`. If the WDDM logic were a no-op (returned raw free 1528), `freeEstimated` would be false and freeMiB 1528 → test fails. Good, it's a real assertion. And it asserts all 3 models runnable — if free were wrongly 1528, qwen2.5-coder:32b (20480) and 7b (14336) would NOT fit → runnable would be just nomic-embe
... [+5693 chars truncated]

### Assistant | 2026-06-03T19:18:29.359Z

[tool_use: Bash]

### User | 2026-06-03T19:18:41.329Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
 RUN  v4.1.5 H:/PRISM/mcp-server
 ✓ src/__tests__/OllamaCapabilityProbeEngine.test.ts (17 tests) 180ms
 Test Files  1 passed (1)
      Tests  17 passed (17)
   Start at  14:18:36
   Duration  1.60s (transform 291ms, setup 0ms, import 527ms, tests 180ms, environment 0ms)
 DEPRECATED  `test.poolOptions` was removed in Vitest
... [+834 chars truncated]

### Assistant | 2026-06-03T19:18:51.079Z

All 17 tests pass, including the live real-data E2E and dispatcher round-trip. Now let me run a focused adversarial probe: I'll write a throwaway script that exercises the engine logic with a few edge cases the tests DON'T cover, to confirm the fail-soft and check the Linux-WDDM concern empirically and the "external VRAM over-promise" concern.

### Assistant | 2026-06-03T19:19:00.601Z

[tool_use: Bash]

### User | 2026-06-03T19:19:09.253Z

[tool_result] node:internal/modules/run_main:122
    triggerUncaughtException(
    ^
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\src\engines\OllamaCapabilityProbeEngine.ts' imported from C:\Users\wompu\AppData\Local\Temp\probe_adv.mjs
Did you mean to import "../../../../../../H:/PRISM/mcp-server/src/engines/OllamaCapabilityProbeEngine.ts"?
    at finalizeResolution (node:
... [+924 chars truncated]

### Assistant | 2026-06-03T19:19:12.249Z

The temp file resolves relative to /tmp. Let me put the script inside the mcp-server tree so the relative import works.

### Assistant | 2026-06-03T19:19:17.796Z

[tool_use: Write]

### User | 2026-06-03T19:19:26.487Z

[tool_result] File created successfully at: H:/prism/mcp-server/_probe_adv.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-03T19:19:36.309Z

[tool_use: Bash]

### User | 2026-06-03T19:19:45.205Z

[tool_result] A ps-null: free 95839 loaded 0 runnable [ 'qwen2.5-coder:32b' ]
B busy-linux: rawFree 500 corrected 8192 est? true runnable [ 'llama3.2:3b' ]
C oversize-loaded: corrected 0 (clamp >=0)

### Assistant | 2026-06-03T19:19:54.639Z

My adversarial probes confirm the three concerns empirically:

- **Edge A (ps down + WDDM):** `free=95839` (=97887−0−2048). The loaded model is ignored because `/api/ps` was down → over-estimate of free by ~8GB. The 32b is declared runnable. Bounded fail-soft, but over-promises.
- **Edge B (busy GPU, low free, nothing loaded by Ollama):** `rawFree=500` was thrown away and `corrected=8192` (=10240−0−2048). A GPU with only 500 MiB genuinely free now reports 8192 MiB free and declares llama3.2:3b (6144) runnable → **would OOM on load**. This is the false-high risk made concrete. On Windows the 500 might be a WDDM artifact (defensible); on Linux it's just wrong.
- **Edge C (oversize loaded):** correctly clamps to 0. Good.

The `Math.max(0, ...)` clamp and the cache/clock logic are all correct. Let me verify the engine cleanly type-checks (no `_probe_adv.mjs` left behind, confirmed removed). Let me do a final type check of the engine in isolation to ensure it compiles against the real ModelRoutingEngine exports.

### Assistant | 2026-06-03T19:19:56.600Z

[tool_use: Bash]

### User | 2026-06-03T19:20:30.658Z

[tool_result] exit-grep-done

### Assistant | 2026-06-03T19:21:09.606Z

No type errors for the probe engine. My review is complete. Here is my adversarial assessment.

---

## Code Quality Analysis Report — OllamaCapabilityProbeEngine (BLACKWELL-AI-MS0/U-CAP-PROBE)

### Summary
- Files analyzed: 3 (engine, test, ModelRoutingEngine integration contract)
- Tests: 17/17 pass (including live real-data E2E + dispatcher round-trip)
- Type check: clean (no errors attributable to this engine)
- Verdict drivers: WDDM math is correct; the real risk is the *unconditional, OS-blind, external-VRAM-blind* application of the WDDM correction in the false-high direction.

### What I verified as CORRECT (no bug)
- **WDDM math** (`#correctFreeVram`, engine L309-320): implausibility `1528 < 97887*0.15 (=14683)` → true; `size_vram` bytes→MiB via `Math.round(8749454458/1048576)=8344`; estimate `97887−8344−2048=87495`. Test L62-65 asserts the *exact* corrected number. Confirmed by execution.
- **Unit consistency**: `/api/ps size_vram` bytes→MiB (`/(1024*1024)`, L359); catalog `vramGB→MiB` via `*1024` (`MIB_PER_GB`, L80/L387). Consistent.
- **HardwareProfile detection** (L323-337): name-match then VRAM thresholds. No crash gap for a 12GB card (→ work_3080 via the 8000 floor). cloud_only fallback below 8000.
- **runnable filter** (L370-403): correctly requires present-in-tags AND runsOn AND fits free; absent models (deepseek-r1:14b) excluded + surfaced as a warning. Verified against catalog (qwen2.5-coder:7b `vramGB:14`, runsOn `[home_blackwell,home_4080]`).
- **Round-trip** (test L105-132): with `costBudgetUSD:0`, all cloud models fail the cost wall and nomic is embed-only filtered → only `qwen2.5-coder:32b` survives `route()` → `decision.model === "qwen2.5-coder:32b"`. Traced through `canServe`/`score`; holds.
- **Fail-soft**: nvidia-smi null, Ollama null, malformed JSON, truncated CSV, NaN VRAM all degrade without throwing (L283-302, L340-362). Cache TTL with injected clock is correct (test L258-290: cached < TTL, re-probe at +1, force, clearCache).
- **Test
... [+3689 chars truncated]
