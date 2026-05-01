# Migrating Legacy CPS Posts to the Physics Sidecar Bridge

**Milestone:** PPG-WIRE-MS0 / U-PPGM06
**Spec status:** authoritative (Sprint 1)
**Last updated:** 2026-04-30

## TL;DR

Forked or hand-edited `.cps` posts that hard-code Kienzle `kc1_1`, Taylor `C/n`,
or tool-modulus values must migrate to the sidecar bridge. The post becomes
slim (≤2 k LOC); the constants live in a SHA-256-sealed `*.sidecar.json`
emitted next to the post. The post calls `loadPhysicsSidecar()` at run time;
SHA mismatch fails closed.

This protects every emitted post from the **silent-staleness regression**:
PRISM recalibrates `kc1_1` from outcome data, but a forked post still ships
the year-old value baked into its source. The CI gate blocks any emit at
shop-floor tier when the source has detectable inlined constants.

## Why this exists

| Symptom (legacy) | Mechanism | Impact |
|---|---|---|
| Post predicts forces 5–10 % low after kc1_1 calibration | `var kc1_1 = 1800;` baked into post source | Cuts run hot, accelerated wear |
| Two posts disagree on Taylor `C` for the same insert | Each was forked from a different baseline | Tool-life predictions diverge per machine |
| Physics constant fix does not propagate after merge | Updates to `src/physics/constants.ts` never re-export | Calibration loop is open |

The sidecar bridge closes the loop: every emit pulls live values from
`src/physics/constants.ts`, hashes them, and the post verifies the hash on
load. A stale fork can never emit silently.

## Components (Sprint 1, all merged)

| Unit | File | Role |
|---|---|---|
| U-PPGM01 | `src/schemas/postPhysicsSidecarSchema.ts` | Zod schema + `buildCanonicalSidecarPayload()` from `physics/constants.ts` |
| U-PPGM02 | `src/engines/PhysicsSidecarBuilderEngine.ts` | Canonicalize + SHA-256 seal + atomic write (Node-side) |
| U-PPGM03 | `src/cps/loadPhysicsSidecar.ts` | Pure-JS FIPS 180-4 SHA-256 + canonicalize + verify (Rhino-portable) |
| U-PPGM04 | `src/engines/NoInlinePhysicsConstantsEngine.ts` (re-export `src/hooks/noInlinePhysicsConstants.ts`) | Static scanner — HARD_BLOCK at shop-floor tier on inlined constants |
| U-PPGM05 | `src/__tests__/PostPhysicsSidecar.integration.test.ts` | Round-trip integration coverage (8 scenarios) |
| U-PPGM06 | this file | Migration guide for legacy posts |

The sidecar JSON layout is fixed by `POST_PHYSICS_SIDECAR_SCHEMA_VERSION`
(currently `"1.0.0"`). Breaking changes bump that string and force a
loader rejection on stale sidecars.

## Migration steps

### Step 1 — identify legacy posts

Run the scanner on every `.cps` you control:

```ts
import { NoInlinePhysicsConstantsEngine } from "mcp-server/src/hooks/noInlinePhysicsConstants.js";
import { readFileSync } from "node:fs";

const result = NoInlinePhysicsConstantsEngine.scan(readFileSync("posts/HurcoV11.cps", "utf8"), {
  tier: "shop_floor",
});
if (result.verdict === "HARD_BLOCK") {
  console.error(`${result.summary.high} inlined constant(s) at HIGH confidence`);
  for (const f of result.findings.filter(x => x.confidence === "HIGH")) {
    console.error(`  L${f.line}:${f.column} ${f.constant_class}=${f.value} (${f.matched_key})`);
  }
}
```

Or invoke via dispatcher:

```
prism_cam:post_check_no_inlined_constants_or_throw  { source: "<post text>", tier: "shop_floor" }
```

### Step 2 — emit a sidecar alongside the post

At post-generation time (Node/TypeScript build environment):

```ts
import { PhysicsSidecarBuilderEngine } from "mcp-server/src/engines/PhysicsSidecarBuilderEngine.js";

const sealed = PhysicsSidecarBuilderEngine.buildAndSeal({
  source_engine_versions: {
    PostProcessorPipelineEngine: "<git-sha>",
    PhysicsSidecarBuilderEngine: "1.0.0",
  },
  // generated_at omitted → ISO timestamp of build
  // constants_source omitted → "src/physics/constants.ts"
});

await PhysicsSidecarBuilderEngine.writeToFile(sealed, "posts/HurcoV11.sidecar.json");
```

Atomic write (`tmp + rename`) means concurrent emits cannot half-write the
file; readers see either the previous version or the new one, never garbage.

### Step 3 — replace inline literals with sidecar lookups

| Before | After |
|---|---|
| `var kc1_1 = 1800;` | `var kc1_1 = sidecar.kienzle.P.kc1_1;` |
| `var taylorC = 350;` | `var taylorC = sidecar.taylor.P.C;` |
| `var modulus = 600000;` | `var modulus = sidecar.tool_modulus_MPa.carbide;` |

The ISO group (`P/M/K/N/S/H`) and tool material (`carbide/cermet/...`) come
from the part program context (material code, insert grade) — the post
already has those.

### Step 4 — load and verify the sidecar at post run time

CPS-side (inside Fusion 360 / HSMWorks Mozilla Rhino):

```js
// At top of post — CPS supplies loadText(); we cannot use Node fs.
var sidecarText = loadText(getCurrentDirectory() + "/" + getOutputFile().replace(/\.[^.]+$/, ".sidecar.json"));

// Pure-JS loader — no Node deps, runs in Rhino ES5+.
var sidecar = loadPhysicsSidecar(sidecarText, {
  expectedSchemaVersion: "1.0.0",
});
// loadPhysicsSidecar throws on missing meta, JSON parse error, schema-version
// mismatch, malformed sha256 hex, or sha256 recompute mismatch.
// Throwing aborts the post emit — fails closed.
```

Bundling the loader into the post: copy
`src/cps/loadPhysicsSidecar.ts` → transpile to ES5 → embed inline at the top
of the `.cps`. A future helper script can automate this; for now, copy-paste.

### Step 5 — re-run the scanner and emit at production tier

After Step 3 every inlined literal is gone. Re-run Step 1:

```ts
const r = NoInlinePhysicsConstantsEngine.scanOrThrow(updatedSource, { tier: "shop_floor" });
// throws on HARD_BLOCK; otherwise PASS or WARN
```

Promote tiers in order: `sim → proven_out → production → shop_floor`. The
first three accept WARN-level findings (low-confidence false positives like
`var rpm = 1800` near the word `kienzle` in a comment); shop_floor is HIGH-only.

## Before/after — minimal example

**Before (legacy fork):**

```js
// HurcoV11.cps — fragment from a 2024 fork
function kienzleForceP(b, h) {
  var kc1_1 = 1800;     // HIGH-confidence inline — scanner blocks
  var mc = 0.25;        // HIGH-confidence inline — scanner blocks
  return kc1_1 * b * Math.pow(h, 1 - mc);
}
```

**After (Sprint 1 bridge):**

```js
// HurcoV11.cps — slim post + sidecar
var sidecar = loadPhysicsSidecar(loadText(sidecarPath), { expectedSchemaVersion: "1.0.0" });

function kienzleForceP(b, h, isoGroup) {
  var entry = sidecar.kienzle[isoGroup];   // P / M / K / N / S / H
  return entry.kc1_1 * b * Math.pow(h, 1 - entry.mc);
}
```

`HurcoV11.sidecar.json` (excerpt):

```json
{
  "meta": {
    "schema_version": "1.0.0",
    "sha256": "a3f2…(64 hex chars)…b855",
    "generated_at": "2026-04-30T12:00:00.000Z",
    "source_engine_versions": { "PostProcessorPipelineEngine": "<git-sha>" },
    "constants_source": "src/physics/constants.ts"
  },
  "kienzle":  { "P": { "kc1_1": 1800, "mc": 0.25 }, "M": …, … },
  "taylor":   { "P": { "C": 350, "n": 0.25 }, … },
  …
}
```

## CI gate behaviour

The pre-emit pipeline runs `NoInlinePhysicsConstantsEngine.scanOrThrow` at
the tier requested by the build:

| Tier | Verdict on findings | Behaviour |
|---|---|---|
| `sim` | LOW/MEDIUM/HIGH all WARN | Build proceeds; warnings logged |
| `proven_out` | MEDIUM/HIGH WARN; HIGH may HARD_BLOCK per policy | Build proceeds with warnings; HIGH may require justification |
| `production` | HIGH HARD_BLOCK | Build fails; fix required |
| `shop_floor` | HIGH HARD_BLOCK | Build fails; fix required (default) |

`shop_floor` is the default tier when none is specified — fails closed. To
re-enable a build that's blocked, fix the source per Steps 3–4 above; do
NOT weaken the tier or add a suppression comment. Suppression bypasses the
silent-staleness protection this whole bridge exists to provide.

## Failure modes & remediation

| Symptom | Cause | Fix |
|---|---|---|
| `loadPhysicsSidecar: SHA mismatch — sidecar tampered or stale` | Sidecar file edited after seal, or post + sidecar built from different `constants.ts` versions | Re-run Step 2 against the current post source; never hand-edit the sidecar |
| `loadPhysicsSidecar: schema version mismatch — expected '1.0.0' got '0.9.0'` | Sidecar built against an older schema version | Rebuild sidecar (Step 2) against current schema; bump or downgrade per the schema-version policy |
| `loadPhysicsSidecar: meta.sha256 must be 64-char lowercase hex` | Sidecar JSON corrupted at hash field | Rebuild sidecar from scratch; do not patch the hash by hand |
| `loadPhysicsSidecar: sidecar is not valid JSON` | File truncated, partially written, or hand-edited with a syntax error | Atomic-write protects against partial writes; if hand-edited, regenerate via Step 2 |
| `NoInlinePhysicsConstants HARD_BLOCK on tier=shop_floor` | Step 3 missed an inline literal | Re-run scanner; the report's `findings` list points at the line/column of every offender |
| Post emits, but downstream cuts hot | Sidecar SHA verifies but the **value** is wrong | Calibration issue, not a migration issue — file in `prism_validate:calibration_run` |
| `non-finite number rejected` from `pureCanonicalize` | An attacker or buggy upstream injected `NaN`/`Infinity` into the payload | Schema rejects this pre-seal; if it slips through, regenerate the sidecar — the engine builder also rejects |

## Determinism guarantees (load-bearing)

Two implementations canonicalize the sidecar payload — Node `crypto` (build
side) and a hand-rolled FIPS 180-4 / RFC 8785-subset implementation (CPS
side). Their outputs MUST be byte-identical for every input.

The integration test (`PostPhysicsSidecar.integration.test.ts`) pins this
parity at:

- `0.1 + 0.2`, `1e-10`, `1e21`, `-0`, `2^53`, mixed arrays
- key-reorder invariance (sorted-key recursion)
- `_meta_without_sha` envelope spread dominance (no smuggling via duplicate keys)
- non-finite numbers throw in both layers

If you change either implementation, the integration test must still pass
unchanged. Drift here produces phantom MS9 drift-canary alarms in
production.

## FAQ

**Q. We have 50+ forked posts. Can we automate Step 3?**
Yes — write a small codemod that maps the regex hits from
`NoInlinePhysicsConstantsEngine.scan().findings[]` to `sidecar.<class>.<key>`
substitutions. Each finding has `constant_class` and `matched_key` ready
for substitution. We have not shipped this codemod yet (out of scope for
U-PPGM06); track as a separate followup if the manual cost is real.

**Q. Can the sidecar live somewhere other than next to the post?**
Yes. The post's `loadText()` call decides the path — pass any reachable
absolute or relative path. We recommend co-located for traceability.

**Q. What if the CAM environment cannot load arbitrary text files?**
Inline the sidecar JSON as a string literal in the post header, then call
`loadPhysicsSidecar(theInlinedJsonString, …)`. The SHA still verifies;
you lose the ability to re-emit the sidecar without re-emitting the post,
but determinism and integrity are preserved.

**Q. Does this slow down post emit?**
Sidecar build is O(constants size) — currently <2 ms in the integration
test. SHA-256 on the canonical form is <1 ms. CPS-side parse + verify is
<10 ms in Rhino on Fusion 360 hardware. Negligible.

**Q. We promote a post from `proven_out` to `shop_floor` and the scanner
suddenly HARD_BLOCKs. Why?**
`shop_floor` filters out LOW-confidence findings and treats HIGH as
HARD_BLOCK; lower tiers WARN on the same input. Either fix the source
(preferred) or stay at `proven_out`. Never flip the tier flag to dodge the
gate.

## References

| Standard / paper | Used for |
|---|---|
| FIPS 180-4 | SHA-256 algorithm (both Node and pure-JS implementations) |
| RFC 8785 (JCS) | Canonical JSON serialisation (we implement the sorted-key recursion subset) |
| ISO 3685:1993 | Tool-life testing — Taylor `C/n` exponents |
| Sandvik Coromant General Turning (2024) | Kienzle `kc1.1`/`mc` per ISO group |
| Klocke "Fertigungsverfahren Band 3" | EDM physics constants (DiBitonto 1989, Sato 1990) |

## Source paths (for direct lookup)

- `mcp-server/src/physics/constants.ts` — canonical values, single source of truth
- `mcp-server/src/schemas/postPhysicsSidecarSchema.ts` — schema + `buildCanonicalSidecarPayload`
- `mcp-server/src/engines/PhysicsSidecarBuilderEngine.ts` — Node-side builder
- `mcp-server/src/cps/loadPhysicsSidecar.ts` — Rhino-portable loader
- `mcp-server/src/engines/NoInlinePhysicsConstantsEngine.ts` — scanner (re-export at `src/hooks/noInlinePhysicsConstants.ts`)
- `mcp-server/src/__tests__/PostPhysicsSidecar.integration.test.ts` — round-trip coverage
