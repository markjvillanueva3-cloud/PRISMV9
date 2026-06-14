---
name: build-error-fix-patterns
category: code-tribal
domain: backend-dev
tags: [build, tsc, esbuild, typescript, error-fix, prism-development, ai-development]
last_updated: 2026-05-18
---

# Build Error Fix Patterns — TS error class taxonomy + recipes

PRISM's mcp-server has 1000+ TS errors at any given time. Fixing them randomly is unproductive; the discipline is to classify the error first, then apply the right recipe.

## Classification — top-10 error classes (by frequency in PRISM)

| TS code | Class | Fix recipe |
|---------|-------|------------|
| TS2339 | Property does not exist on type | Field renamed in source; rename in caller OR use `unknown` bridge |
| TS2345 | Arg not assignable to param | Schema/signature drift; align caller to engine's current shape |
| TS2322 | Type X not assignable to Y | Discriminated-union narrowing; explicit `as` only when safe |
| TS2307 | Cannot find module | Import path drift; use direct import not barrel export |
| TS2304 | Cannot find name | Missing import; or symbol moved between files |
| TS2532 | Object possibly undefined | Non-null assert ONLY when invariant proves it; otherwise guard |
| TS2554 | Expected N arguments, got M | Function signature changed; recount + align |
| TS2769 | No overload matches | Function has multiple signatures; pick one + supply matching args |
| TS18046 | Element implicitly has any | Generic untyped; cast via unknown OR add explicit generic |
| TS2440 | Import declaration conflicts | Rename or use namespace import |

## The "unknown bridge" pattern (when source field drifted)

When a downstream consumer reads `obj.X.Y` but the source no longer emits `obj.X.Y`:

```ts
// Wrong: any-cast that loses type checking everywhere
const value = (obj as any).X.Y;

// Right: explicit unknown bridge, narrow once
const v = (obj as unknown as { X?: { Y?: number } }).X?.Y;
if (typeof v !== "number") return null;
// v is number here
```

The 2026-05-16 series U-PPL bridge fixes used this pattern for MaterialEntry → context adapter (+13 errors fixed).

## The "discriminated-union narrowing" pattern

```ts
type Result = { ok: true; value: number } | { ok: false; error: string };

function handle(r: Result) {
  if (r.ok) {
    // TS narrows to { ok: true; value: number } here
    return r.value;
  }
  // TS narrows to { ok: false; error: string }
  return r.error;
}
```

The 2026-05-16 commit `f1681107c` fixed 2 errors via explicit discriminant narrowing on broadcast result.

## Schema-read-first rule

Before fixing a TS error in a consumer, read the SOURCE shape. The 2026-05-17 high-roi-skill-rank META-tool bug: consumer read `j.totals.X` against producer emitting `j.X` top-level. Fix at the SCHEMA-READ, not at the consumer-symbol-rename.

Steps:
1. `grep -l 'export.*<TypeName>' src/` → find the source
2. Read the source's emit shape end-to-end
3. Fix the consumer to match (rename, narrow, or schema-probe)

## When to inline a type alias vs import

Inline `type Foo = { x: number }` only when:
- The type is local-scope (used in 1 function)
- Importing creates a circular dependency
- The shape is unstable (will change in this PR)

Otherwise import from a canonical file (src/types/ or src/schemas/).

## tsc vs esbuild divergence

`npm run build:fast` (esbuild only, ~3s) skips type-check; ships fast iteration. `npm run build` (full tsc + esbuild, ~30s) is the pre-commit gate. **Don't trust build:fast as a quality signal** — it elides every TS error.

`npm run build:incremental` (tsc incremental, ~10s) is the middle ground.

## Common TS-error fix anti-patterns

- **`@ts-ignore` without comment** — leaves the error invisible to future devs. Use `@ts-expect-error <reason>` instead; tsc will flag if the error disappears.
- **Casting `as any` to silence** — loses type safety everywhere downstream. Use `as unknown as ExpectedShape` to force explicit re-narrowing.
- **Adding optional `?` to suppress TS2532** — hides a real invariant violation. Guard explicitly: `if (!obj.X) return; ...obj.X.Y...`.
- **Renaming the field instead of the call site** — usually the call site is correct and the source drifted by accident.

## Build-fix commit hygiene

Each commit should:
- Reduce tsc error count by a specific number (`-7` in the commit body)
- Reference the file:line where the fix applied
- Note the class (e.g., "TS2345: schema/signature drift on MaterialEntry")

The 2026-05-17 build-fix series used this format: `[TSC-FIX]/routes/milling: return next(e) consistency + merge enrichSpeedFeed 3rd arg (-7)`.

## Related

- [[karpathy-12-rule-discipline]] — R8 (read before write), R11 (match conventions)
- [[regression-prevention-doctrine]] — schema-read-blindness class
- [[fail-loud-r12-patterns]] — non-null asserts as fail-loud
- CLAUDE.md "## Recent regressions" — TS-error commits with -N reductions
