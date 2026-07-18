---
name: ts-error-recipe-bank
category: software-engineering
domain: backend-dev
tags: [typescript, tsc, error-recipe, build-fix, prism-development, ai-development]
last_updated: 2026-05-18
---

# TS Error Recipe Bank — concrete fixes per TS error code

PRISM's mcp-server carries 1000+ TS errors at any given time. Random fixes are unproductive; recipes per error code make build-fix work compounding. This wiki documents the top-15 error codes with their PRISM-specific recipes.

## TS2339 — Property does not exist on type

**Most common in PRISM.** Source: a field was renamed in an engine; consumers still reference the old name.

```ts
// Error: Property 'kc11' does not exist on type 'MaterialProps'
const k = material.kc11;

// Fix: read the source's current shape
// material now has `.kienzleCoefficients.kc11_mpa`
const k = material.kienzleCoefficients.kc11_mpa;
```

Recipe:
1. `grep -l "interface MaterialProps" mcp-server/src/`
2. Read the type definition
3. Update the consumer to match

If the source TRULY removed the field (not renamed): the consumer's logic is stale and needs deeper rethink.

## TS2345 — Argument not assignable to parameter

**Schema/signature drift.** Source: an engine method's parameter shape changed.

```ts
// Error: Argument of type '{a:1, b:2}' not assignable to '{a:number, c:string}'
engine.doX({ a: 1, b: 2 });

// Fix:
engine.doX({ a: 1, c: "value" });  // align to current shape
```

Often paired with TS2339; the new shape has new required fields the caller doesn't pass.

## TS2322 — Type X not assignable to Y

**Discriminated-union narrowing failure.** Common when a result-type carries success/failure variants.

```ts
type Result = { ok: true; value: number } | { ok: false; error: string };
// Error: Type 'string | number' not assignable to 'number'
function get(r: Result): number {
  return r.ok ? r.value : r.error;  // narrowing failed
}

// Fix:
function get(r: Result): number {
  if (r.ok) return r.value;
  throw new Error(r.error);  // explicit branch
}
```

## TS2307 — Cannot find module

**Import path drift.** Source: module moved, barrel export removed, or path missing `.js` extension.

```ts
// Error: Cannot find module '../foo'
import { foo } from "../foo";

// Fix: explicit .js extension (NodeNext ESM)
import { foo } from "../foo.js";
```

PRISM uses ESM with NodeNext resolution — every relative import needs `.js`. The TS lint catches missing extensions.

## TS2304 — Cannot find name

**Missing import OR symbol moved between files.**

```ts
// Error: Cannot find name 'MaterialEntry'
function f(x: MaterialEntry) { ... }

// Fix: explicit import
import type { MaterialEntry } from "../types/material.js";
```

Type-only imports use `import type` to ensure they get elided in compiled output.

## TS2532 — Object is possibly undefined

**Optional access without guard.** Source: a method returns `T | undefined`, consumer assumes `T`.

```ts
// Error: Object is possibly 'undefined'
const map = lookup(key);
return map.value;

// Fix: guard
const map = lookup(key);
if (!map) throw new Error(`unknown key: ${key}`);
return map.value;
```

NEVER `as` away a possibly-undefined to silence — that loses the invariant. R12: surface the failure.

## TS2554 — Expected N arguments, got M

**Function signature changed; caller still passes old arg count.**

```ts
// Error: Expected 3 arguments, but got 2
engine.compute(material, tool);

// Fix: read current sig + align
engine.compute(material, tool, context);
```

If you don't have a sensible `context`: investigate WHY the new param was added (a recent commit's diff explains).

## TS2769 — No overload matches this call

**Function has multiple signatures; you supplied args matching NONE.**

```ts
// Error: No overload matches this call
parse("data", { strict: true, mode: "json" });

// Fix: read the overloads
parse(data: string, opts: { strict?: boolean }): Result;
parse(data: Buffer, opts: { mode: "json" | "yaml" }): Result;

// Pick one and supply matching args:
parse("data", { strict: true });  // string overload, no mode
```

## TS18046 — Element implicitly has 'any' type

**Generic untyped.** Source: function-call result needs a type annotation.

```ts
// Error: Element implicitly has 'any' type
const result = engine.compute();
result.value;  // any

// Fix: type annotation or generic
const result = engine.compute<Result>();
// OR explicit cast (less safe):
const result = engine.compute() as Result;
```

## TS2440 — Import declaration conflicts

**Two imports declare the same name.**

```ts
// Error: Import declaration conflicts with local declaration of 'X'
import { X } from "./a.js";
import { X } from "./b.js";

// Fix: rename one
import { X as XA } from "./a.js";
import { X as XB } from "./b.js";
```

## TS6133 — Variable declared but never used

**Dead code.** Easy fix: remove. But check first — sometimes it's a hint that the import was supposed to be wired in.

```ts
// Error: 'foo' is declared but never used
const foo = 42;

// Fix A: remove
// Fix B: use it where intended
```

## TS2531 — Object is possibly 'null'

**Like TS2532 but for null specifically.**

```ts
// Error: Object is possibly 'null'
const el = document.getElementById("foo");
el.value;

// Fix: guard
if (!el) throw new Error("missing element");
el.value;
```

## TS2741 — Property missing in type

**Required field omitted.**

```ts
// Error: Property 'name' is missing in type '{x:1}'
const obj: User = { x: 1 };

// Fix: supply the field
const obj: User = { x: 1, name: "alice" };
```

## TS2353 — Object literal may only specify known properties

**Extra field passed.** Source: schema was tightened.

```ts
// Error: 'foo' does not exist in type 'Options'
const opts: Options = { x: 1, foo: "extra" };

// Fix: remove the extra OR cast (less safe)
const opts: Options = { x: 1 };
```

## TS2367 — Comparison appears to be unintentional

**Comparing values of incompatible types.**

```ts
// Error: This comparison appears to be unintentional because the types have no overlap.
if (status === 200) { ... }   // status is "ok" | "error" string

// Fix: align comparison
if (status === "ok") { ... }
```

## The "unknown bridge" pattern (drift across deep schemas)

When a downstream consumer reads `obj.X.Y.Z` but the source no longer emits `obj.X.Y.Z`:

```ts
// Wrong: any-cast that loses type checking everywhere
const value = (obj as any).X.Y.Z;

// Right: explicit unknown bridge, narrow once
const v = (obj as unknown as { X?: { Y?: { Z?: number } } }).X?.Y?.Z;
if (typeof v !== "number") return null;
```

The unknown bridge documents that the consumer DOES NOT trust the type contract. Use sparingly; prefer fixing the schema.

## Build-fix commit hygiene

Each commit should:
- Reduce tsc error count by a specific number (`-7` in commit body)
- Reference the file:line where the fix applied
- Note the class (e.g., "TS2345: schema/signature drift on MaterialEntry")

Format: `[TSC-FIX]/<area>: <short> (-N)`

## The "Recent regressions ledger" cross-reference

Every "(-N)" build-fix commit in CLAUDE.md "Recent regressions" is part of this discipline. Following the format makes the build-fix work auditable + cumulative.

## Related

- [[build-error-fix-patterns]] — the broader taxonomy + classification
- [[karpathy-12-rule-discipline]] — R8 (read before write) for schema-read-first
- [[regression-prevention-doctrine]] — `## Recent regressions` ledger
- [[code-archaeology-patterns]] — reading the source's current shape
- CLAUDE.md "Recent regressions" entries with `-N` reductions
