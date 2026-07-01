---
name: reference_tsc_incremental_masks_declaration_errors_2026_06_19
description: "mcp-server `npm run build` (tsc --noEmit + incremental:true) silently MASKS declaration-emit errors (TS4053/TS4094) in dependency-affected files; verify true tsc state with a COLD run"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.229Z
aliases: reference_tsc_incremental_masks_declaration_errors_2026_06_19
---


**The warm `.tsbuildinfo` cache hides a whole class of tsc errors fleet-wide (papa, 2026-06-19).**

`mcp-server/tsconfig.json` has `declaration: true` + `declarationMap: true` + `incremental: true` + `tsBuildInfoFile: ./.tsbuildinfo`. The `build` script is `tsc --noEmit && esbuild`. Because `incremental:true` is in the tsconfig, even a bare `tsc --noEmit` reads/writes `.tsbuildinfo` and **skips re-checking unchanged files**. When a peer changes a sub-engine's exported type surface (e.g. a result type stops being nameable, or a singleton's class becomes effectively un-nameable), the **declaration-emit errors land in the DEPENDENT file, which the incremental cache does not re-check** → the errors are silently masked.

Concretely (this session): `MillingPhysicsKernelEngine.ts` (a ~80-singleton facade) had **37 declaration-emit errors** — 17× **TS4053** ("Return type of public method ... cannot be named") + 20× **TS4094** ("exported anonymous class type ... may not be private or protected"). A WARM `tsc --noEmit` reported **4** (or even the handoff's stale "8"). A COLD run reported the true **37**. This is the same "incremental-cache under-report trap (3 vs 329)" papa documented earlier in the BUILD-QUALITY campaign.

**Verify TRUE tsc state — never trust a warm-cache count:**
```bash
cd H:/prism/mcp-server && rm -f ./.tsbuildinfo && NODE_OPTIONS=--max-old-space-size=16384 npx tsc --noEmit -p tsconfig.json
# OR the new cache-proof script (U-TSC-COLD-CHECK-SCRIPT):
npm run build:tsc-cold   # = tsc --noEmit --incremental false  (--incremental false overrides tsconfig)
```

**Root-cause FIX for TS4053/TS4094 on a delegating facade (type-only, contained, no sub-engine edits):** annotate the public method return types using the already-imported EXPORTED singletons — `methodName(...): ReturnType<typeof <singleton>.<method>>` for delegates, `getX(): typeof <singleton>` for getters, and a union of `ReturnType<...>` (+ `| undefined` when the switch has no default) for switch methods. These emit verbatim in the `.d.ts` (no structural expansion that trips on un-nameable/private types), are byte-faithful to the inferred type (no widening/narrowing/weakening), and erase at runtime (zero behavior change). Shipped as `18a44f3008` (MPK 37→0). Do NOT `: any`/`as`-cast (weakening — soul-refused).

**Why it matters:** `tsc --noEmit` is the project's pre-commit + CI type gate, so this class of regression can reach `main` undetected and only surface on an actual `.d.ts` emit. Run `build:tsc-cold` (or rm the buildinfo) before trusting a "0 errors" claim. See sibling [[feedback_read_full_content_not_titles]] (a warm-cache "0" is the build-state analog of trusting a title over content).
