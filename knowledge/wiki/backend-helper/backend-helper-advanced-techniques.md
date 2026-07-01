---
title: Backend-Helper Advanced Techniques — world-leader TypeScript/build strategy (type-level perf, declaration bundling, isolatedDeclarations, monorepo project-references at scale, module-resolution conditions, compiler tracing)
galaxy: backend-helper
owner_slot: papa
status: VERIFIED-PARTIAL
verified_by: "papa-advanced-techniques (2026-06-10)"
verification_method: "Each advanced technique below was WebFetch-confirmed during creation (2026-06-10) against a free/official primary source: the official TypeScript Handbook (Project References, Modules Reference), the official TypeScript tsconfig reference, the official Microsoft/TypeScript wiki Performance page, and the official esbuild docs (API). Quotes are taken verbatim from those pages. Only the qualitative STRATEGY and trade-off DIRECTION are promoted; every numeric build/heap/threshold value and any physics constant remains papa-gated. Established compiler-engineering practice is asserted with citation; PRISM-galaxy relevance is mapped per technique."
tags: [backend-helper, advanced-techniques, type-level-performance, conditional-types, interfaces-vs-intersections, isolatedDeclarations, declaration-bundling, project-references, monorepo, tsbuildinfo, declarationMap, disableSourceOfProjectReferenceRedirect, module-resolution, conditional-exports, customConditions, bundler-resolution, paths-no-emit, skipLibCheck, generateTrace, extendedDiagnostics, esbuild, verbatimModuleSyntax]
---

# Backend-Helper Advanced Techniques

The **world-leader-depth** strategy layer for the **backend-helper** galaxy (role per its `MEMORY.md`: "build/TSC assist every slot"). This is the third and deepest of the galaxy's three wiki spines, and it is deliberately DISTINCT from its siblings:

- **`backend-helper-foundations.md`** = the intro theory (compiler phases, lexing/parsing, type-inference + Hindley-Milner, the NodeNext resolution *algorithm*, the project-reference *build-graph concept*).
- **`backend-helper-applied-practice.md`** = the common practitioner gotchas (missing `.js` suffix, esbuild-vs-tsc gap, `isolatedModules` basics, circular-import TDZ, declaration-*merging*, `any`-leak, single-source cascade, heap-OOM).
- **THIS entry** = the advanced STRATEGY an expert reaches for *beyond* both: how to make the type-checker itself fast, how to bundle declarations and split the two compilers cleanly, how to wire project references at monorepo scale, how to drive module resolution through `exports`/conditions instead of fragile aliases, and how to *measure* compiler cost rather than guess. These are the moves that make the difference at the top of the field.

Established TypeScript/build-engineering strategy below is **WebFetch-confirmed against the named free/official sources** (marked CONFIRMED). Numeric thresholds, per-repo tsconfig values, and any physics/cutting constant remain **[papa-gate]** — they live only in the owner's gated state and in `mcp-server/src/physics/constants.ts`, never hardcoded here.

---

## Theme A — Type-level performance: keep the checker itself fast

The naive view is "types are free; only runtime costs." At the top of the field the opposite is true: a few type *shapes* dominate `tsc` wall-clock on a large program, and an expert writes types *for the checker*, not just for the reader.

### A1. Prefer interfaces over intersection types for object shapes
**CONFIRMED** against the **Microsoft/TypeScript wiki — Performance** page ([github.com/microsoft/TypeScript/wiki/Performance](https://github.com/microsoft/TypeScript/wiki/Performance)): *"Interfaces create a single flat object type that detects property conflicts... Type relationships between interfaces are also cached, as opposed to intersection types."*
- **WHEN an expert uses it:** when a shared object type is consumed widely and `tsc --extendedDiagnostics` shows `Check` time dominating — converting `type X = A & B & C` to an `interface X extends A, B, C` lets the compiler cache the relationship instead of recursively re-merging on every comparison.
- **Trade-off direction:** you trade the *flexibility* of intersections (they can combine non-object types and compose more freely) for a flatter, cached, faster-to-compare type. Reach for interfaces by default; use intersections only where you genuinely need their composition.
- **Galaxy applies it:** when papa repairs a slow galaxy build, the first structural lever is converting hot intersection types to interfaces — a build-speed fix that ships once and clones to every galaxy sharing the pattern (R15).

### A2. Cap union size; model wide variants with a base type, not a giant union
**CONFIRMED** (same Performance page): *"if your union has more than a dozen elements, it can cause real problems in compilation speed"* — because eliminating redundant members is a pairwise (quadratic) comparison.
- **WHEN:** any time a discriminated-union or string-literal union grows past roughly a dozen members and check-time climbs — refactor to a base type with inheritance/discriminant rather than one flat union.
- **Trade-off direction:** a base type trades a little exhaustiveness-checking ergonomics (one big union is easy to `switch` over) for a non-quadratic, far cheaper relationship check at scale.
- **Galaxy applies it:** large vendor/controller/material enumerations across the fleet are exactly the place this bites — backend-helper steers those toward base-type modeling when they cause measurable check-time regressions. (Note: the *count of members* in any specific PRISM union is a repo fact — **[papa-gate]**; only the "past ~a dozen, restructure" *direction* is promoted.)

### A3. Name complex conditional/mapped types so the compiler can cache them
**CONFIRMED** (same Performance page): inline conditional logic means *"every time `foo` is called, TypeScript has to re-run the conditional type"*; and *"Named types tend to be more compact than anonymous types (which the compiler might infer), which reduces the amount of time spent reading and writing declaration files."*
- **WHEN:** a generic helper with an inline conditional return type is called from many sites and trace shows the same conditional being re-evaluated — extract it to a named `type` alias so the result is cached and so emitted `.d.ts` stays compact.
- **Trade-off direction:** you trade a small amount of inline locality for cached evaluation and smaller declaration output (which speeds *downstream* project-reference builds too).
- **Galaxy applies it:** the galaxy's "fix the root, not the symptoms" discipline extends here — naming a hot conditional type fixes compile cost at one definition site for all consumers.

### A4. Avoid deep recursive/conditional-type blowups
This is the expert-level extension of A3: deeply recursive conditional or mapped types (the kind that count, reverse, or parse string literals at the type level) can explode the checker's work and trip TypeScript's recursion limit. The Performance page's whole thesis — cache via named types, prefer flat structures, avoid forcing the checker to re-derive — is the mitigation; the *technique direction* is to keep type-level computation shallow and to push genuinely complex derivations to a generated, materialized type rather than recomputing it on every reference.
- **Trade-off direction:** trade clever type-level metaprogramming (impressive, but a known compile-time sink) for an explicit, named, possibly code-generated type. At the top of the field, "could this be a deep conditional?" is a *cost* question, not just a correctness one.
- **Galaxy applies it:** backend-helper flags deep type-level recursion in fleet code as a build-cost smell during TSC-assist, the same way it flags `any`-leaks for correctness.

---

## Theme B — Split the two compilers cleanly + bundle declarations

The applied-practice entry establishes that esbuild strips types and `tsc` checks them. The *advanced* strategy is owning the full division of labor: esbuild emits fast JS, `tsc` (or a dedicated tool) owns `.d.ts`, and you make the split airtight.

### B5. esbuild emits no declarations — pair it with a dedicated `.d.ts` path
**CONFIRMED** against the official **esbuild API docs** ([esbuild.github.io/api](https://esbuild.github.io/api/)): *"esbuild does NOT emit TypeScript declaration files (.d.ts). You must use a separate tool like `tsc`, `dts-bundle-generator`, or `tsup` for type definitions in library distributions."*
- **WHEN an expert uses it:** any time a galaxy/package is *consumed* as a typed library (not just an app entry point) — the fast esbuild build alone ships zero types to consumers, so a separate `tsc --emitDeclarationOnly` (or a declaration-bundler) arm is mandatory.
- **Trade-off direction:** you trade a single one-shot build for a two-arm pipeline (esbuild for JS speed + a declaration emitter for types) — the cost is pipeline complexity, the gain is fast iteration *without* shipping an untyped artifact.
- **Galaxy applies it:** when papa wires a galaxy's build, "does anything import this with types?" decides whether the declaration arm is required — and if so it is not optional, the same way `isolatedModules` is not optional with esbuild (applied-practice §2.2).

### B6. `verbatimModuleSyntax` to make the type/value split explicit and emit-stable
**CONFIRMED** against the official **tsconfig reference** ([typescriptlang.org/tsconfig](https://www.typescriptlang.org/tsconfig/)): `verbatimModuleSyntax` means *"Do not transform or elide imports or exports not marked as type-only, ensuring they remain in the output"* — it *"Preserves the exact syntax of imports and exports as written... preventing TypeScript from automatically removing imports."*
- **WHEN:** when a per-file transpiler (esbuild/swc/Babel) and `tsc` must agree on which imports get erased — turning this on forces the author to mark type-only imports with `import type`, so erasure is explicit and identical across both compilers.
- **Trade-off direction:** you trade a little authoring convenience (the compiler no longer guesses which imports are type-only) for an emit that *exactly* matches intent and never diverges between the fast and the checked build — the deep cure for the class of esbuild mis-erase bugs `isolatedModules` only warns about.
- **Galaxy applies it:** `verbatimModuleSyntax` is the advanced complement to the galaxy's `isolatedModules` contract — together they make esbuild and `tsc` produce byte-compatible module semantics fleet-wide.

### B7. `isolatedDeclarations` to make declaration emit parallelizable and self-contained
**CONFIRMED** (same tsconfig reference): `isolatedDeclarations` means *"Ensure that declaration files can be generated for each file without relying on other imports"* — it *"validates that each file's type information is self-contained... Allows tools to generate declaration files in parallel and makes the codebase more modular."*
- **WHEN an expert uses it:** when declaration emit is the slow arm of a large library build and you want a third-party/parallel tool to produce `.d.ts` without running full cross-file inference — it forces explicit return-type annotations on exported API so each file's types stand alone.
- **Trade-off direction:** you trade up-front annotation effort (every exported symbol must declare its type explicitly) for the ability to emit declarations per-file in parallel and for a more modular API surface. It is the `.d.ts` analogue of `isolatedModules` for JS (CONFIRMED parallel framing on the same page).
- **Galaxy applies it:** for galaxies whose declaration emit dominates build time, papa can recommend `isolatedDeclarations` to unlock parallel `.d.ts` generation — a strategy, not a default; the per-galaxy decision is owner-gated.

---

## Theme C — Project references at monorepo scale (incremental done right)

Foundations introduces `tsc -b` and `composite`. The advanced strategy is structuring a *many-project* build so only the right subset rebuilds, editors navigate across boundaries, and the graph never silently goes stale.

### C8. Solution-style root config + `composite` leaf projects
**CONFIRMED** against the official **TypeScript Handbook — Project References** ([typescriptlang.org/docs/handbook/project-references](https://www.typescriptlang.org/docs/handbook/project-references.html)): *"Have a 'solution' `tsconfig.json` file that simply has `references` to all of your leaf-node projects and sets `files` to an empty array."* Referenced projects must enable `composite`, which the page notes *"is needed to ensure TypeScript can quickly determine where to find the outputs of the referenced project"* and forces `declaration` on.
- **WHEN an expert uses it:** any codebase large enough that a single `tsc` run is slow or memory-heavy — split it into composite leaf projects with a thin solution root, so `tsc -b` builds only out-of-date projects in dependency order (foundations §6).
- **Trade-off direction:** you trade a single flat config for N tsconfigs + config-inheritance bookkeeping; the gain is smart incremental rebuilds and bounded per-project memory (a direct cure for the `tsc` heap-OOM in applied-practice §5.1, because no single project holds the whole program). The Performance page's own scope guidance — *"5-20 projects is an appropriate range"* (CONFIRMED) — sets the direction (don't over-shard); the exact project count for *this* repo is **[papa-gate]**.
- **Galaxy applies it:** when a galaxy's monolithic build OOMs or drags, the durable fix backend-helper reaches for is project-reference decomposition, not just a bigger heap.

### C9. `declarationMap` so cross-project "Go to Definition" lands on source
**CONFIRMED** (Project References page): *"If you enable `declarationMap`, you'll be able to use editor features like 'Go to Definition' and Rename to transparently navigate and edit code across project boundaries."* The tsconfig reference adds: *"You should strongly consider turning this on if you're using project references."*
- **WHEN:** the moment a codebase adopts project references — without `.d.ts.map`, jumping into a referenced project lands in generated `.d.ts` instead of the real `.ts`, crippling refactors.
- **Trade-off direction:** trade a small amount of extra build output (`.d.ts.map` files) for navigable, refactor-safe cross-boundary editing — almost always worth it in a references monorepo.
- **Galaxy applies it:** when papa stands up references for a galaxy, `declarationMap` ships in the same change so fleet developers never lose source navigation.

### C10. Know the references caveats: `noEmitOnError`-like behavior, `--force` after VCS ops, and `disableSourceOfProjectReferenceRedirect`
Three expert-level caveats from the **Project References** page (CONFIRMED):
- `tsc -b` *"effectively acts as if `noEmitOnError` is enabled for all projects"* — a downstream error halts emit so you don't see a stale-skip mask the failure once. (This changes how you reason about partial builds.)
- *"you may need to run a `--force` build after certain source control operations depending on whether your source control tool preserves timestamps"* — the incremental graph keys on timestamps, so a checkout/rebase can desync it (a real "rebuild the wrong subset" footgun).
- For very large composite projects, the in-editor source redirect *"has some perf implications. For very large composite projects you might want to disable this using `disableSourceOfProjectReferenceRedirect`"* — and the tsconfig reference notes the trade-off: it *"Loses the ability to step through source code of dependencies... but ensures builds are faster and properly respect project boundaries."*
- **WHEN / Trade-off direction:** use `--force` when a VCS operation made `-b` skip something it shouldn't; reach for `disableSourceOfProjectReferenceRedirect` only when the editor redirect itself is the perf bottleneck on a very large graph (trading dependency-source stepping for speed).
- **Galaxy applies it:** "the incremental graph rebuilt the wrong subset" is a named fleet failure mode — backend-helper's first questions are now "did a rebase desync timestamps (→ `--force`)?" and "is the project graph composite and dependency-ordered?" before touching source. (`assumeChangesOnlyAffectDirectDependencies` is a related accelerator but is **[papa-gate]** — the tsconfig reference warns it is correct *"only if you never have types that change in ways that affect indirect dependents"*; enabling it is an owner risk decision, not a default.)

---

## Theme D — Drive module resolution by `exports`/conditions, not fragile aliases

Foundations covers the NodeNext `.js`-suffix algorithm. The advanced strategy is using package `exports`/`imports` + conditions as the real resolution contract, and knowing precisely why `paths` aliases are a trap.

### D11. `paths` does not rewrite emit — use workspaces, not aliases, for real packages
**CONFIRMED** against the **TypeScript Handbook — Modules Reference** ([typescriptlang.org/docs/handbook/modules/reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)): *"The `paths` option does not change the import path in the code emitted by TypeScript. Consequently, it's very easy to create path aliases that appear to work in TypeScript but will crash at runtime"* (the page literally shows `TypeScript: ✅ / Node.js: 💥`). And: *"`paths` should not point to monorepo packages or node_modules packages"* — instead *"it's best to use workspaces via npm, yarn, or pnpm to symlink your packages into `node_modules`, so both TypeScript and the runtime or bundler perform real `node_modules` package lookups."*
- **WHEN an expert uses it:** the moment someone proposes a `paths` alias to a sibling package — redirect to workspace symlinks so resolution is real at both type-check and runtime; reserve `paths` for app-internal aliases that a bundler also resolves, and *never* in a published library (CONFIRMED: emitted JS *"will not work for consumers... without those users setting up the same aliases"*).
- **Trade-off direction:** you trade the convenience of a quick `paths` entry for resolution that is identical in `tsc`, Node, and the bundler — eliminating the "compiles, crashes at runtime" class entirely.
- **Galaxy applies it:** this is the deep root-cause for a whole family of "TS green, runtime `ERR_MODULE_NOT_FOUND`" breaks — backend-helper steers the fleet toward workspaces + `exports` and treats a cross-package `paths` alias as a defect to remove.

### D12. Conditional `exports` + `customConditions` as the typed entry-point contract
**CONFIRMED** (Modules Reference): under `node16`/`nodenext`/`bundler`, *"TypeScript always matches the `types` and `default` conditions if present"*, matches `import`/`require` per syntax, and *"Additional conditions can be configured to match with the `customConditions` compiler option."* Crucially: *"the presence of `exports` prevents any subpaths not explicitly listed... from being resolved."*
- **WHEN:** when authoring or consuming a package that ships dual ESM/CJS or environment-specific builds — encode entry points and their types in conditional `exports` (with a `types` condition) instead of guessing at deep paths, and use `customConditions` for bespoke build flavors.
- **Trade-off direction:** you trade the freedom to deep-import any internal file (which `exports` deliberately blocks) for an explicit, enforced public surface whose types resolve correctly in every mode — a stronger API boundary at the cost of import flexibility.
- **Galaxy applies it:** when papa fixes a "types resolve in one module mode but not another" break, the lever is the package's `exports`/`types` conditions — fixing the contract once, fleet-wide.

### D13. Choose `bundler` vs `node16/nodenext` deliberately — `module` affects type-checking even with `noEmit`
**CONFIRMED** (Modules Reference): *"Use `esnext` with `--moduleResolution bundler` for bundlers, Bun, and tsx. Do not use for Node.js. Use `node16`, `node18`, or `nodenext` with `"type": "module"` in package.json to emit ES modules for Node.js."* And the deep point: *"TypeScript's type checking and module resolution behavior are affected by the module format that it would emit. Setting `module` gives TypeScript information about how your bundler or runtime will process imports... so the types you see on imported values accurately reflect what will happen at runtime."*
- **WHEN an expert uses it:** match `moduleResolution` to the *actual* consumer — `bundler` for a bundler/Bun/tsx target (it supports extensionless paths + `exports`), `nodenext` for real Node ESM (which enforces the `.js` suffix). Even a `noEmit` type-check must set `module` correctly, because resolution and the *types you see* depend on it.
- **Trade-off direction:** `bundler` is more permissive (extensionless imports, synthetic default imports) which is convenient but *wrong* for Node; `nodenext` is stricter but truthful for Node runtime. Picking the permissive mode for a Node target trades short-term convenience for runtime breakage.
- **Galaxy applies it:** "right resolution mode for the right target" is a galaxy-level config decision papa owns — a mismatched `moduleResolution` is a silent source of both false greens (bundler mode hiding a missing suffix) and false errors.

---

## Theme E — Measure compiler cost, don't guess (the diagnostic loop)

The mark of the top of the field is *profiling* the build instead of speculating. TypeScript ships first-class introspection; an expert uses it before changing a single type.

### E14. `--extendedDiagnostics` + `--generateTrace` to find the real bottleneck
**CONFIRMED** against the **Performance** wiki page: `--extendedDiagnostics` *"Outputs compiler time breakdown (Parse, Bind, Check, Emit phases) to identify bottlenecks"*; `--generateTrace` *"can give you a sense of the work the compiler is spending time on"* and *"Creates JSON output analyzable via Chrome DevTools or `@typescript/analyze-trace`."*
- **WHEN an expert uses it:** before any type-perf refactor (Theme A) — run `--extendedDiagnostics` to see whether `Check`, `Bind`, or `Emit` dominates, and `--generateTrace` when a specific file/type is suspected so the trace pinpoints the exact hot type.
- **Trade-off direction:** you trade a minute of profiling for *targeted* fixes — vs. the far more expensive failure mode of speculatively rewriting types that weren't the bottleneck.
- **Galaxy applies it:** backend-helper's TSC-assist is evidence-driven — "the trace says this conditional type is hot" is the R12-honest basis for a fix, not "this looks slow."

### E15. `--explainFiles` and `skipLibCheck` to control *what* gets checked
**CONFIRMED** (Performance wiki): `--explainFiles`/`--listFilesOnly` *"Reveal which files are included and why — essential for diagnosing misconfigured `include`/`exclude` patterns or unintended `@types` pollution"*; and `skipLibCheck` *"skip checking all `.d.ts` files... can often hide misconfiguration and conflicts in `.d.ts` files, so we suggest using them only for faster builds."* Properly scoping `include`/`exclude` matters because *"files must be discovered by walking through included directories... this can slow compilations down."*
- **WHEN an expert uses it:** use `--explainFiles` when a build is checking more than it should (stray `@types`, an over-broad `include`); use `skipLibCheck` to speed builds *with eyes open* that it can mask `.d.ts` conflicts.
- **Trade-off direction:** `skipLibCheck` trades some safety in declaration files (which you usually can't fix in third-party libs anyway) for build speed — a deliberate, reversible knob, not a silent default. `--explainFiles` trades nothing; it is pure diagnostics.
- **Galaxy applies it:** "why is this build checking 4,000 extra files?" is answered with `--explainFiles`, and `skipLibCheck` is a galaxy-level speed knob papa applies *with* an explicit note of what it suppresses (R12).

---

## Owner-gate (NOT promoted)

papa promoted only the qualitative STRATEGY + trade-off DIRECTION above (each WebFetch-confirmed against a free/official source). The following remain **[papa-gate]** — they depend on PRISM's actual repository state and/or are owner-only numeric values, and must be bound against live config, never hardcoded from this entry:
- The repo's concrete `tsconfig` values (`moduleResolution`, `module`, `target`, `composite`/`incremental`/`isolatedModules`/`isolatedDeclarations`/`verbatimModuleSyntax`/`skipLibCheck` on/off, `paths` entries) — this entry asserts the *rules and directions*, not the current settings.
- The actual number of project-reference projects this repo should split into (the Performance page's "5-20 projects" is a general *direction*; the right count for PRISM is owner-determined against live build profiles).
- The exact union-member count at which a specific PRISM enumeration should be refactored to a base type (the "~a dozen" figure is the source's general threshold; the per-type decision is a repo fact).
- Any `--max-old-space-size` MiB ceiling, `.tsbuildinfo` location, or per-galaxy build timing/heap figure — repo facts (CLAUDE.md references a "16GB heap" for the MCP build; confirm live before quoting).
- Whether `assumeChangesOnlyAffectDirectDependencies` or `disableSourceOfProjectReferenceRedirect` is safe to enable for a given galaxy — both carry CONFIRMED trade-offs (incorrect indirect-dependent invalidation; loss of dependency-source stepping) and are owner risk decisions.
- **CRITICAL (R12-SAFETY):** NO cutting/physics constant appears in this entry. All `kc1.1` Kienzle coefficients, Taylor tool-life `C`/`n`, SFM/RPM/IPR/chip-load/feed/depth-of-cut values, and coolant-pressure psi live ONLY in `mcp-server/src/physics/constants.ts` and are owner-gated for papa. This is a build-strategy entry; it states no machining number.

## Sources

> Each URL below was fetched + confirmed via WebFetch during creation (2026-06-10). All are official open documentation or the project's own public wiki — no paywalled or pirated content. Prioritized per the domain brief (TypeScript handbook + esbuild docs + Node ESM docs) and extended with the official TypeScript Performance wiki + tsconfig reference, which are the authoritative free sources for advanced build strategy.

- **TypeScript Handbook — Project References (composite, declarationMap, `tsc -b` watch, monorepo solution config, `disableSourceOfProjectReferenceRedirect`, `--force`/`noEmitOnError` caveats)** (official open docs) — https://www.typescriptlang.org/docs/handbook/project-references.html
- **TypeScript — tsconfig Reference (skipLibCheck, isolatedModules, isolatedDeclarations, verbatimModuleSyntax, incremental, composite, declaration, declarationMap, assumeChangesOnlyAffectDirectDependencies, disableSourceOfProjectReferenceRedirect)** (official open docs) — https://www.typescriptlang.org/tsconfig/
- **Microsoft / TypeScript wiki — Performance (interfaces-vs-intersections, union-size limit, named conditional types, skipLibCheck guidance, `--extendedDiagnostics`/`--generateTrace`/`--explainFiles`, project-count range, include/exclude scoping)** (official open wiki) — https://github.com/microsoft/TypeScript/wiki/Performance
- **TypeScript Handbook — Modules Reference (conditional `exports`/`imports`, `customConditions`, `paths` does-not-affect-emit warning, workspaces-over-aliases, `bundler` vs `node16/nodenext`, `module` affects type-checking under `noEmit`)** (official open docs) — https://www.typescriptlang.org/docs/handbook/modules/reference.html
- **esbuild Docs — API (platform node/browser/neutral, packages external, splitting, tree-shaking, format, tsconfig handling, no `.d.ts` emit)** (official open docs) — https://esbuild.github.io/api/

## Cross-refs
- Galaxy theory (read first): `knowledge/wiki/backend-helper/backend-helper-foundations.md`
- Galaxy common gotchas (read second): `knowledge/wiki/backend-helper/backend-helper-applied-practice.md`
- Galaxy source atlas: `knowledge/wiki/backend-helper/backend-helper-source-atlas.md`
- Galaxy brain: `mcp-server/src/engines/backend-helper/MEMORY.md`
