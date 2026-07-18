---
name: reference_wireexempt_name_collision_fabrication_2026_06_19
description: "R12 lesson (slot:romeo 2026-06-19): a 'wired-via-engine'/'consumed by X' claim must verify the import targets THAT EXACT FILE, not a same-named twin class. Caught by 3-of-3 scrutiny after romeo fabricated a HyperMillACBridgeEngine consumer claim; a same-named class in BatchCAMAPIBridgeEngines.ts was the real wired one."
metadata:
  type: feedback
  node_type: memory
  unit_scope: WIRING
  originSessionId: b27b087a-eaab-4f76-8f35-ee3b32efc1c9
---

# Verify an import targets the EXACT file before claiming "wired-via-engine" / "consumed by X"

While WIRE-EXEMPT-tagging the last 7 unwired engines (commit c4de7fc96b), romeo tagged the
standalone `mcp-server/src/engines/HyperMillACBridgeEngine.ts` with reason "wired-via-engine --
singleton consumed by BatchCAMAPIBridgeEngines + HyperMillACServerConfig." **That was fabricated.**
The `camDispatcher.ts:663` wiring of `hyperMillACBridgeEngine` actually targets a **DIFFERENT,
same-named TWIN class** declared at `BatchCAMAPIBridgeEngines.ts:720` (its own singleton at :810).
The standalone file's singleton (`:482`) has ZERO production consumers; the `HyperMillACServerConfig`
dependency is INVERTED (the standalone IMPORTS config, is not consumed by it). The standalone was an
UNTRACKED WIP orphan that a blanket `git add` shipped whole (+484 lines), with broken HTTP error
paths and an untracked failing test.

The **3-of-3 scrutiny caught it** (arms A + C FAIL; arm B was initially FOOLED by the same name
collision and PASSed, then cleared it on re-review by tracing `new <Engine>(` usage). Fix: untracked
the orphan back to WIP, stripped the false tag, routed it to kilo (CAM owner) for a wire-or-delete
decision (commit 03c5a33c5b). Honest outcome: unwired 7 -> 1 (6 real WIRE-EXEMPT + 1 orphan), NOT a
false 7 -> 0.

**Why:** a grep for `class FooEngine` / `fooEngine` matches EVERY same-named declaration across modules.
TypeScript tolerates duplicate class+singleton names in separate module scopes, so a name collision is
invisible to a shallow search and silently validates a false "it's already consumed" claim -- exactly
the verify-before-claiming failure R12 / the HONESTY rules forbid.

**How to apply:** before tagging an engine WIRE-EXEMPT "wired-via-engine" or claiming "consumed by X",
PROVE the consumer imports THIS file: grep `from ".*<ThisExactFileName>"` (the import specifier), or
`new <Engine>(` and confirm the file path, not just the bare class/singleton NAME. If two files export
the same class/singleton name, that is itself a collision to flag (rename one). A WIRE-EXEMPT tag only
clears the audit by its mere presence (`audit-unwired-engines.mjs` reads the first 2KB for the marker,
not the reason's truth) -- so the reason's accuracy is the ONLY guardrail against a lazy/false skip.
Sibling: [[feedback_verify_actual_contract_not_proxy]] (verify the real contract, not a proxy).
Pairs with the HONESTY rule "verify a symbol before claiming it exists" applied to CONSUMERS.
