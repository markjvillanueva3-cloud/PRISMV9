---
title: Backend-Helper Applied Practice — build/TSC/module practitioner gotchas (NodeNext suffix, esbuild-vs-tsc gap, circular-import TDZ, declaration-merging, any-leak, heap-OOM)
galaxy: backend-helper
owner_slot: papa
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: "Each practitioner gotcha below was WebFetch-confirmed against a free/official primary source during creation (2026-06-10): the official TypeScript Handbook (Modules Reference, Declaration Merging) + tsconfig reference, the official esbuild docs (Content Types), MDN (let/TDZ, JavaScript Modules guide), and the official Node.js CLI docs. Quotes are taken verbatim from those pages. The general engineering technique (fix-the-root-cause cascade, triage ordering) is asserted as standard practice and tied to a confirmed mechanism. Repo-specific numbers / tsconfig values / per-slot heap sizes remain papa-gated."
tags: [backend-helper, tribal-knowledge, applied-practice, nodenext, module-resolution, esbuild, isolatedModules, tsc, circular-import, temporal-dead-zone, tdz, declaration-merging, any-leak, noImplicitAny, heap-oom, max-old-space-size, live-bindings, type-cascade]
---

# Backend-Helper Applied Practice

The **practitioner-knowledge** layer for the **backend-helper** galaxy (role per its `MEMORY.md`: "build/TSC assist every slot"). Foundations (`backend-helper-foundations.md`) covers the *theory* — compiler phases, lexing/parsing, type inference, the NodeNext resolution algorithm, the project-reference build graph. **This entry is the orthogonal half: what actually goes wrong when a slot's build breaks, WHY it breaks that way, and the technique an expert uses to avoid it.** These are the recurring failure modes the galaxy repairs across the 26-slot fleet; each is mapped to how this galaxy hits it. CS-engineering mechanics are quoted from free/official sources; repo-specific thresholds stay **[papa-gate]**.

---

## 1. Module resolution gotchas (NodeNext is unforgiving)

### 1.1 The missing `.js` suffix — the #1 silent fleet break
**CONFIRMED** against the official **TypeScript Handbook — Modules Reference** ([typescriptlang.org/docs/handbook/modules/reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)):
- Under `node16`/`nodenext`, an extensionless relative ESM import is **not supported**: the docs mark `import "pkg/dist/foo";` with **"needs `.js` extension"** and only `import "pkg/dist/foo.js";` resolves (extensionless paths are supported in `require`, not `import`).
- The trap that bites everyone: TypeScript performs **file-extension substitution** — you write `./mod.js`, and TS internally tries `./mod.ts` / `./mod.tsx` / `./mod.d.ts` first, then `./mod.js`. So **you write the `.js` extension even though the source file on disk is `.ts`.** Writing `.ts` in the import does *not* resolve, and writing no extension does *not* resolve.

**WHY it's silent:** the `.ts` file the author is editing exists and imports compile-clean if `moduleResolution` is loose; the break only surfaces under strict `nodenext` resolution or at Node runtime as `ERR_MODULE_NOT_FOUND`. The author "sees" the file right there, so the error reads as nonsensical.

**Expert avoidance:** add the `.js` suffix to every *relative* import the moment you write it; never trust that "the file is obviously there." When triaging a `TS2307 cannot find module` on a relative path, suspect the suffix before suspecting a missing dependency.

**Galaxy hit:** the single most common build break papa repairs fleet-wide — a slot adds a new engine, imports it `from "./NewEngine"` (no `.js`), build is green on their loose-resolution scratch run, then the canonical `nodenext` build fails. Fix once, grep the whole diff for suffixless relative imports, clone the fix (R15).

---

## 2. The esbuild-vs-tsc semantic gap (fast build LIES about correctness)

### 2.1 esbuild strips types — it does NOT type-check
**CONFIRMED** against the official **esbuild docs — Content Types** ([esbuild.github.io/content-types](https://esbuild.github.io/content-types/)):
- **"esbuild *does not* do any type checking so you will still need to run `tsc -noEmit` in parallel with esbuild to check types."**
- **"esbuild has built-in support for parsing TypeScript syntax and discarding the type annotations"** — it removes types, it does not verify them.

**WHY this is a trap:** a `build:fast` (esbuild-only) run going green means *the syntax parsed*, NOT *the types are sound*. A real `TS2322`/`TS2345` type error sails straight through esbuild and ships. "Build passed" is a lie if only the esbuild arm ran (this is R12 — fail loud — in build form).

**Expert avoidance:** treat esbuild output and `tsc --noEmit` output as two independent gates. Fast iteration on esbuild is fine; the *correctness* gate is always a separate `tsc` run. Never report "build passes" off the esbuild arm alone.

### 2.2 Per-file isolation → you MUST set `isolatedModules`
**CONFIRMED** (same esbuild source):
- **"tools like esbuild and Babel (and the TypeScript compiler's `transpileModule` API) compile each file in isolation so they can't tell if an imported name is a type or a value."**
- The docs' fix: **"you should enable the `isolatedModules` TypeScript configuration option if you use TypeScript with esbuild. This option prevents you from using features which could cause mis-compilation in environments like esbuild where each file is compiled independently without tracing type references across files."**

**WHY:** because esbuild sees one file at a time, it can't follow a type-only import to decide whether to erase it; constructs that depend on cross-file type knowledge (e.g. re-exporting a type without `export type`, or `const enum`) can mis-compile. `isolatedModules` makes `tsc` reject exactly those constructs up front, so the fast path can never silently mis-emit.

**Galaxy hit:** when papa wires the esbuild fast-build for a galaxy, `isolatedModules` is not optional — without it, a type re-export that `tsc` accepts will be silently wrong under esbuild. The galaxy owns making the two compilers *agree*, and `isolatedModules` is the contract that forces agreement.

---

## 3. Initialization-order gotchas (circular imports + the temporal dead zone)

### 3.1 Live bindings + cyclic imports → `ReferenceError: Cannot access X before initialization`
**CONFIRMED** against the **MDN JavaScript Modules guide** ([developer.mozilla.org/.../Guide/Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)):
- Imports are **hoisted** and are **live read-only views**: *"the imported values are available in the module's code even before the place that declares them, and ... the imported module's side effects are produced before the rest of the module's code starts running."*
- Cyclic imports do not always fail — but: *"The imported variable's value is only retrieved when the variable is actually used ... and only if the variable remains uninitialized at that time will a `ReferenceError` be thrown."*
- MDN's failing example: with `a.js` → `b.js` → `a.js`, a *synchronous* `console.log(a)` in `b.js` throws **`ReferenceError: Cannot access 'a' before initialization`** because `a.js` hasn't finished evaluating.

### 3.2 The underlying mechanism: the temporal dead zone
**CONFIRMED** against **MDN — `let`** ([developer.mozilla.org/.../Statements/let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)):
- *"A variable declared with `let`, `const`, or `class` is ... in a 'temporal dead zone' (TDZ) from the start of the block until code execution reaches the place where the variable is declared and initialized."*
- *"While inside the TDZ ... any attempt to access it will result in a `ReferenceError`."*
- Contrast with `var`, which is *"hoisted and initialized"* to `undefined` (so it returns `undefined`, not an error). This is why a `const`/`let`/`class` top-level binding read mid-cycle *throws*, while the old `var` style would have silently given `undefined`.

**WHY this is subtle:** the cycle compiles clean — TypeScript and esbuild both accept it. The failure is purely a *runtime evaluation-order* fault, and it only fires when the access happens *synchronously during module load* (an async/deferred access after both modules settle works fine, which is why "it works in tests but breaks on import" happens).

**Expert avoidance:** break the cycle (extract the shared symbol into a third leaf module both depend on), or defer the cross-module access (lazy `import()`, or read inside a function body rather than at module top level). When you see `Cannot access 'X' before initialization`, do not "fix" the symptom file — trace the import cycle; the bug is the *edge*, not the line.

**Galaxy hit:** PRISM's own `## Recent regressions` log records this exact class — a `[STATUSLINE-HOTFIX]` TDZ `ReferenceError` from a value used 38 lines before its `const` declaration (commit `15602c5a0`). Backend-helper triage for any "before initialization" error starts at the dependency graph, not the throwing line.

---

## 4. Type-system gotchas (silent suppression + merging surprises)

### 4.1 The `any`-leak — one untyped value masks a whole region of real errors
**CONFIRMED** against the official **TypeScript tsconfig reference** ([typescriptlang.org/tsconfig](https://www.typescriptlang.org/tsconfig/)):
- Without `noImplicitAny`, *"TypeScript will fall back to a type of `any` for a variable when it cannot infer the type. This can cause some errors to be missed."*
- The docs' own demo: `function fn(s) { console.log(s.subtr(3)); } fn(42);` — calling the misspelled `subtr` on a number produces **"No error?"** because `s` silently became `any`.
- `noImplicitAny` *"will issue an error whenever it would have inferred `any`"*; it is part of the `strict` family (`strict` *"is equivalent to enabling all of the strict mode options"* — `noImplicitAny`, `strictNullChecks`, etc.).

**WHY it's dangerous:** `any` is contagious — a value typed `any` (explicit `as any`, an untyped third-party import, or an inferred implicit `any`) disables checking on *everything it flows into*. The real bug downstream never surfaces; the build is green and wrong.

**Expert avoidance:** keep `noImplicitAny`/`strict` on; when chasing a "this clearly should have errored but didn't" report, hunt upstream for the `any` that poisoned the chain. Replace `any` with `unknown` at boundaries so the compiler forces a narrowing check instead of silently waving values through.

### 4.2 Single-source the type — fix the root, not the N symptoms
The foundations entry covers *why* `TS2322` reads as it does (unification failed on the most-general conflict). The *practice* gotcha: a single wrong type at a definition site produces a *cascade* of identical errors at every consumer. **CONFIRMED mechanism** (TS Handbook — Type Inference, cited in foundations): TS infers a **best common type / union** and propagates it via **contextual typing** "in the other direction" — so one bad union member or one wrong return type flows to every call site.

**Expert avoidance:** when `tsc` reports a cluster of the same `TS2322`/`TS2345` across many files, do NOT patch each call site (that doubles the maintenance and can hide the next regression — R7/R8). Find the single definition the inference flows *from* and fix it there; the cluster collapses to zero. PRISM's GOAL-TSC-FIX loop history (e.g. `82d3989b9` "via 2 single-source cascades", `7acff2dfb` "3 cluster cascades") is this technique applied at scale.

### 4.3 Declaration merging — same-name interfaces merge silently
**CONFIRMED** against the official **TypeScript Handbook — Declaration Merging** ([typescriptlang.org/docs/handbook/declaration-merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)):
- *"the compiler merges two separate declarations declared with the same name into a single definition ... Any number of declarations can be merged."* Two `interface Box {}` blocks become one combined `Box` — **no error, no warning**.
- The constraint that bites: *"Non-function members of the interfaces should be unique. If they are not unique, they must be of the same type."* — a same-name member with a *different* type is the only thing that errors; otherwise the surfaces silently fuse.
- For namespaces: *"Non-exported members are only visible in the original (un-merged) namespace ... merged members that came from other declarations cannot see non-exported members"* — and a namespace merging onto a class/function/enum **"must follow the declaration it will merge with"** (order-dependent).

**WHY it surprises:** an author writes `interface Options {}` not knowing the same name already exists in scope (or in an ambient `.d.ts`); the two merge into a single fatter type and a property they thought they owned now also carries the other declaration's members. Module augmentation has its own rule — *"You can't declare new top-level declarations in the augmentation — just patches"* and *"Default exports also cannot be augmented, only named exports."*

**Expert avoidance:** treat a same-name interface as intentional augmentation only when you *meant* it; otherwise rename. When a type "has fields it shouldn't," grep the whole project (and ambient `.d.ts`) for other declarations of that name before editing the one you found — the extra fields are coming from a merge, not the file in front of you (R8: read before you write).

**Galaxy hit:** declaration merging is invisible to a single-file reader, so it's exactly the failure that survives a localized fix and only the galaxy's cross-file search catches.

---

## 5. Build-infrastructure gotchas (the compiler itself runs out of room)

### 5.1 `tsc` heap-OOM on a large project → raise the V8 old-space
**CONFIRMED** against the official **Node.js CLI docs** ([nodejs.org/api/cli](https://nodejs.org/api/cli.html)):
- `--max-old-space-size=SIZE` sets the V8 **old-generation heap size in MiB**. Exceeding it triggers the fatal: **`FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`**.
- The flag can be carried via the environment: command-line options *"take precedence over options passed through the `NODE_OPTIONS` environment variable"* — so `NODE_OPTIONS="--max-old-space-size=4096"` applies to a `tsc` invocation that doesn't take the flag directly.

**WHY this hits TypeScript specifically:** `tsc` on a large monorepo holds the entire program's ASTs + type graph in memory; the default V8 heap is far below what a few-thousand-file project needs, so the *compiler crashes* — not the program it's compiling. The error mentions "heap out of memory" with no source line, which misleads people into hunting a code bug that doesn't exist.

**Expert avoidance:** a heap-OOM during `tsc` is an *infrastructure* fault — raise `--max-old-space-size` (via `NODE_OPTIONS` or the npm script's node invocation) rather than editing source. Pair it with `tsc --build` project references + `incremental` so only the changed subset is re-checked (foundations §6) — that's the durable fix; the heap bump is the immediate one. **[papa-gate]:** the exact MiB ceiling and which slots' galaxies need it depend on this repo's live size — bind against the actual `NODE_OPTIONS`/npm-script value, do not hardcode a number from this entry. (PRISM's own MCP build script already injects a large heap — see CLAUDE.md "16GB heap" note — confirming this is a live, repo-real need, not a hypothetical.)

---

## Owner-gate (NOT promoted)

papa promoted the established TypeScript/JS/Node mechanics above (each WebFetch-confirmed against a free or official source). The following remain **[papa-gate]** — they depend on PRISM's actual repository state and must be bound against live config, never hardcoded from this entry:
- The exact `--max-old-space-size` MiB value this repo's `tsc`/MCP build uses, and which galaxies' builds actually OOM (CLAUDE.md references a "16GB heap" — that figure is the repo's, confirm it live before quoting).
- The repo's concrete `tsconfig` values (`moduleResolution`, `isolatedModules`, `strict`/`noImplicitAny` on/off, `verbatimModuleSyntax`) — this entry asserts the *rules*, not the current settings.
- Per-slot build-break frequency / which break class dominates fleet-wide (the "#1 silent break" framing is qualitative; any rate is owner-gated, requires counting against the live commit log).
- `allowImportingTsExtensions` behavior — the Modules Reference page fetched did NOT document it (left unasserted per R12); re-fetch the tsconfig page's entry for it before adding a `.ts`-extension-import note.
- The official Node.js `esm.html` page did NOT contain the cyclic-dependency / live-binding rule (the fetch returned no such section) — the live-binding + cyclic-`ReferenceError` claim is sourced from MDN's Modules guide instead, which is authoritative for the language semantics. The ECMAScript spec's module-evaluation algorithm is referenced by name only; no quote was taken from it.

## Sources

> Each URL below was fetched + confirmed via WebFetch during creation (2026-06-10). All are official open documentation or free reference material — no paywalled or pirated content. Prioritized per the domain brief (TypeScript handbook + free engineering references) and extended with the official esbuild docs, MDN, and the official Node.js docs because the practitioner gotchas span the whole TS→esbuild→Node runtime chain.

- **TypeScript Handbook — Modules Reference (node16/nodenext `.js`-suffix resolution)** (official open docs) — https://www.typescriptlang.org/docs/handbook/modules/reference.html
- **TypeScript Handbook — Declaration Merging** (official open docs) — https://www.typescriptlang.org/docs/handbook/declaration-merging.html
- **TypeScript — tsconfig Reference (noImplicitAny / strict / implicit-any behavior)** (official open docs) — https://www.typescriptlang.org/tsconfig/
- **esbuild Docs — Content Types (no type-checking, type-stripping, isolatedModules)** (official open docs) — https://esbuild.github.io/content-types/
- **MDN — `let` (temporal dead zone, ReferenceError before initialization)** (free reference) — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let
- **MDN — JavaScript Modules guide (live bindings, hoisted imports, cyclic-import ReferenceError)** (free reference) — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- **Node.js Docs — CLI (`--max-old-space-size`, NODE_OPTIONS, heap-out-of-memory fatal error)** (official open docs) — https://nodejs.org/api/cli.html

> Not promoted (fetch returned no relevant section — handled per R12): Node.js `esm.html` (cyclic-dependency / live-binding section absent from the fetched content; claim sourced from MDN's Modules guide instead).

## Cross-refs
- Galaxy theory half (read first): `knowledge/wiki/backend-helper/backend-helper-foundations.md`
- Galaxy brain: `mcp-server/src/engines/backend-helper/MEMORY.md`
