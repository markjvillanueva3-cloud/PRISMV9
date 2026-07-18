---
title: Backend-Helper Open Source Atlas — the living TypeScript + compilers + build-systems keep-learning directory
galaxy: backend-helper
owner_slot: papa
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: "Every source below was opened with WebFetch during creation (2026-06-10) and confirmed (a) real, (b) free/legal to read with no paywall or login, and (c) reachable. Confirmations: Crafting Interpreters full contents page (3 parts / 30 chapters, free online), Stanford CS143 Compilers course page (Flex/Bison Cool compiler, lecture topics public), Cornell CS3110 free OCaml textbook cover (CC-licensed, type-inference + interpreters chapters), official TypeScript Handbook intro, TypeScript Playground, TypeScript DevBlogs release blog, official microsoft/TypeScript GitHub Roadmap wiki, official Node.js ESM + Packages docs, official esbuild API docs + MIT-licensed evanw/esbuild repo, MDN JavaScript Modules guide, and the free TypeScript Deep Dive book. Two candidates were DROPPED per R12: UW-Madison CS701 (loaded but is an internal semester course, not a public free offering) and a candidate Stanford CS143 YouTube playlist (only YouTube footer rendered — could not confirm the playlist identity; not guessed)."
tags: [backend-helper, source-atlas, living-curriculum, keep-learning, typescript, compilers, build-systems, esbuild, nodenext, esm, crafting-interpreters, cs143, cs3110, official-docs, free-textbook]
---

# Backend-Helper Open Source Atlas

The **living-source curriculum** for the **backend-helper** galaxy (role per its `MEMORY.md`: "build/TSC assist every slot"). This is the *keep-learning directory* — WHERE to keep refreshing this galaxy's domain (TypeScript + compilers + build systems) from reputable FREE/LEGAL sources so the knowledge never goes stagnant.

**This entry is deliberately distinct from its two siblings — read them first, this does not repeat them:**
- `backend-helper-foundations.md` = the synthesized *theory* (compiler phases, lexing/parsing, type inference, the NodeNext resolution algorithm, the project-reference build graph).
- `backend-helper-applied-practice.md` = the practitioner *gotchas* (missing `.js` suffix, esbuild-vs-tsc gap, circular-import TDZ, declaration merging, any-leak, heap-OOM).
- **THIS file** = the *directory of sources* to learn from on an ongoing basis. It names WHERE the knowledge lives and HOW to keep it fresh — it does not re-teach the content.

Every source below was WebFetch-confirmed live + free during creation (2026-06-10). A short verified list beats a long fabricated one (R12).

---

## 1. Free college courses

| Source | URL | Teaches | Feeds this galaxy |
|--------|-----|---------|-------------------|
| **Stanford CS143 — Compilers** | https://web.stanford.edu/class/cs143/ | Full compiler pipeline: lexical analysis, top-down + bottom-up parsing, semantic analysis & type checking, code generation, local + global optimization, runtime systems. Builds a complete compiler for the *Cool* language using Flex (lexing) + Bison (parsing); assignments + lecture topics are public. | The phase-skeleton every build tool walks. Anchors a fleet build error to the *phase* that emitted it (parser vs semantic vs codegen) — the diagnostic spine behind foundations §1. |
| **Cornell CS3110 — OCaml textbook (free, CC-licensed)** | https://cs3110.github.io/textbook/cover.html | A full functional-programming + data-structures course-as-textbook with an explicit **Type Inference** chapter (Hindley-Milner, constraint generation, unification) and an **interpreters / language-implementation** section (lexing, parsing, evaluation). 200+ embedded videos. | The theory under TypeScript's inference: *why* `TS2322`/`TS2345` read as a most-general-unifier conflict (foundations §5). The interpreters chapters reinforce the AST-manipulation model behind codemods. |

> NOTE: A UW-Madison CS701 compilers page and a candidate CS143 YouTube playlist were evaluated and DROPPED (see frontmatter `verification_method`) — neither cleared the free-public + confirmable bar, so neither is listed.

## 2. Free online books / textbooks

| Source | URL | Teaches | Feeds this galaxy |
|--------|-----|---------|-------------------|
| **Crafting Interpreters** (Robert Nystrom) | https://craftinginterpreters.com/contents.html | The complete free online book — 3 parts / 30 chapters: Part I welcome + the Lox language, Part II a tree-walk interpreter (scanning -> parsing -> resolving/binding -> evaluation), Part III a bytecode VM. The canonical hands-on compiler/interpreter text. | The single best free walk-through of scanning, CFG/recursive-descent parsing, static name resolution + binding, and AST design — exactly the mechanics foundations §2-§4 quote. Re-read a chapter when triaging which phase broke. |
| **TypeScript Deep Dive** (Basarat Ali Syed) | https://basarat.gitbook.io/typescript | Free online book ("completely free… copy paste whatever you want"); real-world TypeScript distilled from Stack Overflow + DefinitelyTyped: type system, generics, declaration files, common footguns. | Deepens the applied-practice gotchas (declaration merging, `any` leaks, module patterns) with a practitioner lens beyond the official handbook. |

## 3. Official docs & standards (the canonical, version-tracking references)

| Source | URL | Teaches | Feeds this galaxy |
|--------|-----|---------|-------------------|
| **TypeScript Handbook (intro / hub)** | https://www.typescriptlang.org/docs/handbook/intro.html | The official handbook hub: Everyday Types, Narrowing, Functions, Object Types, Type Manipulation (generics/conditional/mapped/template-literal types), Classes, Modules, plus the Reference + Modules-Reference + Project-Configuration sections. | The authoritative source for every TS type + module rule the galaxy enforces. The Modules-Reference and Project-References pages (cited in the sibling entries) hang off this hub — start here when a rule needs re-checking against the current release. |
| **Node.js — ECMAScript Modules (ESM)** | https://nodejs.org/api/esm.html | The official ESM reference: `import`/`export`, dynamic `import()`, `.mjs`/`.cjs`/`.js` resolution, the `package.json` `"type"` field, the full specifier-resolution algorithm (relative/bare/absolute, `node:` builtins), `import.meta`, import attributes, top-level await. | The runtime half of the NodeNext story — TS resolves *types*, Node resolves the *runtime* module. Re-read when an `ERR_MODULE_NOT_FOUND` / suffix break crosses the TS->Node boundary (applied-practice §1). |
| **Node.js — Modules: Packages** | https://nodejs.org/api/packages.html | The `"type"` field, the `"exports"` field (subpath + pattern + conditional exports), `"imports"` internal `#`-mappings, and dual CommonJS/ESM package authoring. | How a dependency *exports* itself decides whether a slot's import resolves at all — the layer above the `.js`-suffix rule. Essential when a build break is "the package, not my file." |
| **esbuild — API docs** | https://esbuild.github.io/api/ | The official API reference: Build API, Transform API, incremental/watch/serve/rebuild modes, and every option (path resolution, JSX/TS transforms, minify, tree-shaking, source maps, logging). | The fast-build arm papa wires per galaxy. Pair with the already-cited Content-Types page (esbuild strips types, does NOT type-check) — this page is the config surface for the `tsc --noEmit` + esbuild two-gate model (applied-practice §2). |
| **esbuild — source repo (MIT, evanw/esbuild)** | https://github.com/evanw/esbuild | The open-source bundler itself (MIT license, Evan Wallace): release notes / CHANGELOG, issues, and the Go source — the ground truth when the docs lag a release. | The keep-fresh signal for the build toolchain — watch releases/CHANGELOG so the galaxy's fast-build config tracks esbuild behavior changes. |
| **MDN — JavaScript Modules guide** | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules | Free (CC-licensed) language-level guide: named/default export+import, import maps, module aggregation/namespacing, dynamic `import()`, top-level await, **cyclic imports + live bindings**, hoisting/scoping vs classic scripts. | The authoritative language-semantics source for the circular-import / TDZ `Cannot access X before initialization` class (applied-practice §3) — independent of any one runtime. |

## 4. Keep-fresh feeds (release + roadmap channels to watch)

| Source | URL | Teaches | Feeds this galaxy |
|--------|-----|---------|-------------------|
| **TypeScript DevBlogs (official release blog)** | https://devblogs.microsoft.com/typescript/ | "The official blog of the TypeScript team" — free, no login. Publishes every "Announcing TypeScript X.Y" release post (beta -> RC -> stable) with breaking-change + new-feature writeups. | The primary freshness feed: a new TS release can change inference, module resolution, or a strict-flag default — this is where the galaxy learns what shifted before a fleet build mysteriously changes behavior. |
| **microsoft/TypeScript — Roadmap (GitHub wiki)** | https://github.com/microsoft/TypeScript/wiki/Roadmap | Public official roadmap: planned features + fixes per upcoming release, with linked PRs, plus a "Future" investigation list (e.g. nominal typing). | Forward-looking complement to the blog — tells the galaxy what type-system / build behavior is *coming*, so doctrine can be staged before it lands. |
| **TypeScript Playground (official)** | https://www.typescriptlang.org/play | Free in-browser TS compiler/REPL: live JS emit, switchable `tsconfig` options + TS version, sharable links. | The zero-setup reproduction surface — when a slot reports a `TS2xxx`, reproduce it in the Playground at the exact TS version + flags to confirm the cause before editing source. Turns a guess into a verified diagnosis. |

## Keep-fresh cadence

The build/TS toolchain moves on a *release* clock, so this atlas stays alive by tracking releases, not the calendar:

- **Per TypeScript release (~quarterly):** read the matching "Announcing TypeScript X.Y" post on **DevBlogs**; if it touches module resolution, inference, or a strict-flag default, re-fetch the affected **TypeScript Handbook** / Modules-Reference page and update the sibling foundations/applied-practice entries (not this atlas — this atlas only changes if a *URL* moves).
- **Per esbuild release:** skim the **evanw/esbuild** CHANGELOG for behavior changes to the fast-build path; re-check the **esbuild API** page if an option changed.
- **Per Node.js LTS line:** the **ESM** + **Packages** docs are versioned — confirm the resolution algorithm / `exports` rules still match the runtime the fleet builds against.
- **Link-rot check (every ~90 days or before relying on a link):** re-WebFetch each URL in `## Sources`; if one fails, retry once then mark it dead in `verification_method` and find a current canonical replacement — never leave a guessed/stale URL (R12).
- **Course pages (CS143 / CS3110):** stable, syllabus-level — re-verify only on link rot, not on a release clock.

## Sources

> All 13 URLs below were opened with WebFetch and confirmed real + free/legal + reachable during creation (2026-06-10). No paywalled, login-gated, or pirated material. Distinct list (de-duplicated):

- **Stanford CS143 — Compilers** (free college course) — https://web.stanford.edu/class/cs143/
- **Cornell CS3110 — OCaml Programming textbook** (free CC-licensed textbook) — https://cs3110.github.io/textbook/cover.html
- **Crafting Interpreters — full contents** (free online book, Robert Nystrom) — https://craftinginterpreters.com/contents.html
- **TypeScript Deep Dive** (free online book, Basarat Ali Syed) — https://basarat.gitbook.io/typescript
- **TypeScript Handbook — intro / hub** (official open docs) — https://www.typescriptlang.org/docs/handbook/intro.html
- **Node.js — ECMAScript Modules (ESM)** (official open docs) — https://nodejs.org/api/esm.html
- **Node.js — Modules: Packages** (official open docs) — https://nodejs.org/api/packages.html
- **esbuild — API docs** (official open docs) — https://esbuild.github.io/api/
- **esbuild — source repo (MIT)** (open source) — https://github.com/evanw/esbuild
- **MDN — JavaScript Modules guide** (free CC-licensed reference) — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- **TypeScript DevBlogs — official release blog** (free, official) — https://devblogs.microsoft.com/typescript/
- **microsoft/TypeScript — Roadmap (GitHub wiki)** (free, official) — https://github.com/microsoft/TypeScript/wiki/Roadmap
- **TypeScript Playground** (free, official) — https://www.typescriptlang.org/play

> Dropped per R12 (not listed above): UW-Madison CS701 compilers page (loaded but is an internal semester course, not a public free offering); a candidate Stanford CS143 YouTube lecture playlist (only the YouTube footer rendered — playlist identity unconfirmable; not guessed).

## Cross-refs
- Galaxy theory (read first): `knowledge/wiki/backend-helper/backend-helper-foundations.md`
- Galaxy practitioner gotchas (read first): `knowledge/wiki/backend-helper/backend-helper-applied-practice.md`
- Galaxy brain: `mcp-server/src/engines/backend-helper/MEMORY.md`
