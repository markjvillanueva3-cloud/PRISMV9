---
name: reference_tango_dispatcher_registration_coverage_2026_06_15
description: tango built scripts/dispatcher-registration-coverage.mjs (8/8) -- a standing scanner for the loop's named task (registerXDispatcher exports vs index.ts calls). Found AIDispatcher the ad-hoc grep missed; intentionally-skipped class avoids recommending a boot-crash. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.219Z
aliases: reference_tango_dispatcher_registration_coverage_2026_06_15
---


**TANGO DISPATCHER-REGISTRATION-COVERAGE (slot tango, 2026-06-15, commit `ee2368d77b`, ULTRACODE /loop)** — formalized the loop's LITERAL named task ("dispatcher-registration coverage diff: find any OTHER unregistered dormant dispatchers") into a standing tool.

**TOOL:** `scripts/dispatcher-registration-coverage.mjs` + `.test.mjs` (pure-node, mirrors algorithm-dispatcher-coverage.mjs). `listDispatcherExports` (all `registerXDispatcher` exports + tool name) / `listIndexRegistrations` (active, non-commented calls in index.ts) / `extractIndexComments` / `classifyDispatcher` / `computeCoverage`. CLI `--dispatchers --index --json`. **Live: 101/106 registered (95%), 5 dormant, ALL classified with a reason -- ZERO blind-register candidates:** cross-lane (prism_cad_automation->delta, prism_cam_function->kilo), safety-sensitive (prism_machine, prism_security), intentionally-skipped (prism_ai).

**VALUE PROVEN ON FIRST RUN:** caught `registerAIDispatcher` (aiDispatcher.ts) -- a dormant dispatcher my earlier AD-HOC grep diff MISSED. This is the each-pass-feeds-next payoff: a precise standing tool beats repeated manual grep.

**TWO correctness issues caught by verify-on-disk (R12) -- the tool would have been WRONG without them:**
1. **Tool-name regex bug:** anchored on `server.tool(` -> missed `(server as any).tool("prism_ai"` -> false "(no prism_ tool name)". Fixed: match `.tool("prism_X"` on ANY receiver.
2. **Dangerous misclassification:** naive logic flagged registerAIDispatcher as a "candidate (register it)" -- but index.ts line 102 documents that prism_ai is OWNED by registerAIReasoningDispatcher and registering aiDispatcher "crashed boot under the stricter SDK". Added `intentionally-skipped` (driven by index.ts comments = the authoritative record of deliberate skips) + `superseded` (tool-name collision with an active dispatcher). **Conservative bias: a false "skip" is SAFE (just surfaces "verify the index comment"); a false "candidate" is DANGEROUS (boot crash).** A dormant whose regName/toolName appears in an index.ts comment -- including a commented-out call -- is a deliberate disable, not a wiring candidate.

**DEDUP (soul):** DISTINCT from the `/dispatcher-coverage` SKILL (engines-per-dispatcher heatmap over ENGINE_WIRING_INDEX.json) which ASSUMES the dispatcher is registered; this tool checks the index.ts registration layer the heatmap structurally can't see. Verified before building.

**PROCESS LESSON:** backticks in a `git commit -m "..."` DOUBLE-quoted string trigger bash command substitution (`server.tool(` ran as a command) -> mangled the first commit message. Use SINGLE quotes (no substitution) or `git commit -F <file>` for messages containing backticks/parens/code. Amended (unpushed, safe). Sister: [[reference_tango_algorithm_coverage_diff_2026_06_15]] (the algorithm-layer sibling), [[reference_tango_register_unwired_bridge_dispatcher_2026_06_15]] (the manual diffs this formalizes).
