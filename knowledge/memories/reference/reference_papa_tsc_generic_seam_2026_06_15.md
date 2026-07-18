---
name: reference-papa-tsc-generic-seam-2026-06-15
description: papa cleared the ENTIRE generic/mechanical tsc-baseline seam (638->615, 3 slices); domain remainder owner-routed. The reusable papa-safe boundary for fleet build-debt.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.723Z
aliases: reference_papa_tsc_generic_seam_2026_06_15
---


**papa generic-tsc-seam campaign (2026-06-15, slot:papa).** Commits `e9f5005612` (slice1 638->626) / `e2d54d8e6c` (slice2 626->616) / `3b2d5724ba` (slice3 616->615) + maps `5fe4373989` (punch-list) / `9a7ecb9ecb` (remediation-map consolidate).

Under operator "do it all / bypass galaxy gates," papa cleared the fleet tsc baseline **638 -> 615 (23 errors)** — but ONLY the GENERIC, mechanical, non-domain class. Universal safety rails still bound (no fabricating domain values). The reusable boundary:

**papa-SAFE (mechanical, no domain knowledge, 0-new + anti-sweep + affected-tests each):**
- implicit-any annotations (`succs:string[]`, `cell:string`, typed dispatcher handler destructure)
- Zod v4 `z.record(valueType)` -> `z.record(z.string(), valueType)` arity (TS2554)
- dispatcher-boundary coercion idiom `params as unknown as Parameters<typeof X.method>[0]` (Zod already validated shape at the MCP boundary — this is the codebase-wide pattern, NOT a type fight; the double-assertion hook warning is expected here)
- inference tightening (`const V: number[][]` when identity-init `(i===j?1:0)` infers `(0|1)[][]`)
- additive OPTIONAL type fields (`EventBusEvent.correlation_id?`, `HookContext.phase?:HookPhase`) — benign across all importers (79 for HookExecutor)
- generic taxonomy enum (`domain:"spatial"->"geometry"` for RANSAC hyperplane)
- route envelope extraction (`reg.search()` returns `{tools,total}` not array -> `.tools.slice`/`.total`; `await` a `Promise<{...}>` the code was serializing raw = latent bug)

**NOT papa-safe (DEFER to owner — needs domain/product knowledge; papa will NOT guess values into shop-floor output):**
- producer<->consumer feature reconciliation (WEDMSetupSheet 48 errors: reads fields the producer never computes) -> mike/whiskey/delta/oscar/foxtrot
- free-text->structured adapter (python-api `.search(q,opts)` vs engine `query(TribalQueryContext)` w/ material/iso_group/operation/keywords) -> india
- recursive Zod self-ref (`CAMMenuSchema` needs `z.lazy()`+explicit type) -> kilo
- exported-fn-vs-singleton remap (`algorithmGateway()` fn exists, no `algorithmGatewayEngine` singleton) -> tango
- MCP SDK `McpServer`/`Server<>` boot-signature drift (index.ts 851-854/1211) -> infra, risky (boot file)
- untracked peer files (aiDispatcher.ts shows `??`) -> SKIP until peer commits (anti-sweep)

Owner deliverables: `state/shared/specs/TSC-BASELINE-REMEDIATION-MAP-2026-06-15.md` (per-slot routing + verified-finding table) + `TSC-PER-SLOT-PUNCHLIST-2026-06-15.md` (per-owner file:line queues) + AGENT_CHAT mobilize post. Method: anti-sweep (hunk-line-range verify, NEVER keyword-grep) + tight-retry `[MAIN-FORCE]` (index.lock storm) + tsc `--max-old-space-size=16384` 0-new gate (raw OOMs at 4GB; the "0->574" PreToolUse hook is a stale-tracker artifact — authoritative count is `grep -c 'error TS'`).

Lesson: a fleet tsc baseline is mostly DOMAIN feature-drift, not mechanical debt. papa's leverage is (a) clearing the genuine mechanical seam fleet-wide + (b) precise owner-routing of the rest — not silencing. See [[feedback_papa_no_gates_full_pathways]], [[reference_papa_wire_unwired_v2_1_extension_2026_06_15]], [[feedback_primary_backend_builders_no_galaxy_gate_block]].
