---
title: Backend-Helper Foundations — compiler phases, type systems, module resolution + incremental build infrastructure
galaxy: backend-helper
owner_slot: papa
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: CS/compiler-infrastructure facts WebFetch-confirmed against free primary sources — "Crafting Interpreters" (Robert Nystrom, free online book) x5 chapters, Stanford CS143 Compilers course page, Cornell CS3110 free OCaml textbook (Hindley-Milner inference), and the official TypeScript Handbook (modules/reference, type-inference, project-references). Established compiler/type-theory literature (TAPL, lexical-scope, CFG theory) is asserted with citation; PRISM-specific engineering relevance is mapped per section.
tags: [backend-helper, compilers, lexing, parsing, ast, type-system, type-inference, hindley-milner, unification, module-resolution, nodenext, incremental-compilation, dependency-graph, tsc, static-analysis, lexical-scope]
---

# Backend-Helper Foundations

The domain-knowledge spine for the **backend-helper** galaxy: the compiler, type-system, and build-infrastructure theory that underpins every build/TSC-assist task this galaxy performs for the fleet (the galaxy's role per its `MEMORY.md`: "build/TSC assist every slot"). Created fresh by papa toward WORLD-LEADER encyclopedic breadth. **Established compiler + type-theory facts below are standard CS literature** (asserted with citation); **the specific definitions and rules quoted are WebFetch-confirmed against the named free sources** (marked CONFIRMED). Numeric thresholds, repo-specific tsconfig values, and per-slot build policy that depend on PRISM's actual code remain **[papa-gate]** — not hardcoded here.

## 1. The compiler / interpreter phase pipeline (the skeleton every build tool walks)

### Front-to-back phases
**CONFIRMED** against "Crafting Interpreters" — *A Map of the Territory / A Tree-Walk Interpreter* ([craftinginterpreters.com](https://craftinginterpreters.com/a-tree-walk-interpreter.html)):
- A language implementation moves **"front-to-back through the phases of the interpreter — scanning, parsing, and evaluating code."**
- **Scanning** is the first phase that converts raw source characters into tokens; **parsing** converts those tokens into an abstract syntax tree; **evaluating / code generation** consumes the tree.

### The phases a full optimizing compiler adds
**CONFIRMED** against Stanford **CS143 Compilers** course ([web.stanford.edu/class/cs143](https://web.stanford.edu/class/cs143/)): a full compiler course covers, in order, **lexical analysis → parsing (top-down and bottom-up) → semantic analysis & type checking → code generation → optimization (local and global) → run-time environments** (with register allocation, intermediate code, and JIT as advanced topics). CS143 builds a complete compiler for the *Cool* language using **Flex (lexing) and Bison (parsing)**.

**Engineering relevance for backend-helper:** when a slot's build fails, the error is anchored to a *phase* — a syntax error is a parser failure, a `TS2xxx` type error is a semantic-analysis failure, a "cannot find module" is a resolution failure. Diagnosing fleet build breaks means knowing which phase emitted the error before reaching for a fix.

## 2. Lexing / scanning (source characters → tokens)

### Lexeme vs token, and maximal munch
**CONFIRMED** against "Crafting Interpreters" — *Scanning* ([craftinginterpreters.com/scanning](https://craftinginterpreters.com/scanning.html)):
- **"The scanner takes in raw source code as a series of characters and groups it into a series of chunks we call tokens."**
- A **lexeme** is "the raw substrings of the source code"; a **token** is the lexeme **"bundled together with that other data"** — its token type, literal value, and location (line number).
- **Maximal munch (longest match):** "When two lexical grammar rules can both match a chunk of code... **whichever one matches the most characters wins.**" This is why `<=` scans as one token, not `<` then `=`, and `orchid` scans as an identifier, not the keyword `or` + `chid`.

**Engineering relevance:** the longest-match rule is exactly why a missing space or a stray character produces a *different* token stream and a confusing downstream parse error — backend-helper triage should suspect the lexer when an error points at a token that "shouldn't be there."

## 3. Grammars + parsing (tokens → abstract syntax tree)

### Context-free grammars: terminals, nonterminals, productions
**CONFIRMED** against "Crafting Interpreters" — *Representing Code* ([craftinginterpreters.com/representing-code](https://craftinginterpreters.com/representing-code.html)):
- A **context-free grammar (CFG)** is "the next heaviest tool in the toolbox of formal grammars," needed because expressions "can nest arbitrarily deeply" (regular languages, used for lexing, cannot).
- A **terminal** is "a letter from the grammar's alphabet" — a literal token like `if`. A **nonterminal** is "a named reference to another rule in the grammar."
- A **production** has a "head" (rule name) and a "body" (what it generates); productions are so named because they "produce strings in the grammar."
- An **abstract syntax tree (AST)** "elides productions that aren't needed by later phases," distinguishing it from a full parse tree where every production becomes a node.

### Recursive descent + precedence + associativity
**CONFIRMED** against "Crafting Interpreters" — *Parsing Expressions* ([craftinginterpreters.com/parsing-expressions](https://craftinginterpreters.com/parsing-expressions.html)):
- A parser transforms **"a sequence of tokens into one of those syntax trees."**
- **Recursive descent** "is the simplest way to build a parser" and is a **top-down** parser because it "starts from the top or outermost grammar rule... and works its way down into the nested subexpressions" — "**each rule becomes a function**" (terminals → token-matching, nonterminals → function calls, alternatives → conditionals, repetition → loops).
- **Precedence** "determines which operator is evaluated first in an expression containing a mixture of different operators" — higher-precedence operators "bind tighter." **Associativity** "determines which operator is evaluated first in a series of the same operator" (left- vs right-associative).

**Engineering relevance:** the AST is the data structure every codemod / refactor tool (and TypeScript's own compiler API) manipulates. Backend-helper edits that rewrite code mechanically operate on this tree, not on text — which is why an operator-precedence or associativity mistake in a generated expression is a *grammar* bug, not a typo.

## 4. Static analysis: name resolution, scope + binding (meaning without running the code)

**CONFIRMED** against "Crafting Interpreters" — *Resolving and Binding* ([craftinginterpreters.com/resolving-and-binding](https://craftinginterpreters.com/resolving-and-binding.html)):
- Semantic / static analysis is **"a powerful technique for extracting meaning from the user's source code without having to run it"** — it goes farther than the parser and "starts to figure out what pieces of the program actually mean."
- Most modern languages use **lexical scoping**: "you can figure out which declaration a variable name refers to just by reading the text of the program." These scope rules are the **"static semantics"** of the language (hence "static scope").
- The binding rule: **"A variable usage refers to the preceding declaration with the same name in the innermost scope that encloses the expression where the variable is used."** A resolver does a static pass to "resolve each variable use once" before execution.

**Engineering relevance:** TypeScript's `no-undef` / `cannot find name` and ESLint's no-use-before-define are exactly this static, pre-execution resolution. When backend-helper fixes a build, the bulk of fixable errors are name/scope/binding failures that a resolver pass surfaces *without running the program* — which is why the fleet can repair them deterministically.

## 5. Type systems + type inference (the semantic phase that catches the most fleet errors)

### TypeScript inference: best common type + contextual typing
**CONFIRMED** against the official **TypeScript Handbook — Type Inference** ([typescriptlang.org/docs/handbook/type-inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)):
- Inference provides type information **"when there is no explicit type annotation"** (`let x = 3` → `number`).
- **Best common type:** when inferring from several expressions, TS "considers each candidate type, and picks the type that is compatible with all the other candidates"; when no single candidate is a supertype of all, it infers a **union** (`[0, 1, null]` → `(number | null)[]`).
- **Contextual typing** runs inference "in the other direction" — "the type of an expression is implied by its location" (e.g. a callback parameter typed from the declared event-handler signature). It applies to "arguments to function calls, right hand sides of assignments, type assertions, members of object and array literals, and return statements."

### Hindley-Milner: constraint generation + unification (the theory underneath)
**CONFIRMED** against the free **Cornell CS3110** OCaml textbook — *Type Inference* ([cs3110.github.io/textbook](https://cs3110.github.io/textbook/chapters/interp/inference.html)):
- The typing relation is `env |- e : t -| C` — "in environment `env`, expression `e` is inferred to have type `t` and generates constraint set `C`."
- Inference works by **generating constraints** ("equations like you might have in algebra"), then solving them by **unification**, which recursively drops trivial constraints, eliminates variables by substitution ("like Gaussian elimination"), decomposes function types, and **fails if no solution exists**, producing a **"most general unifier."**
- **Let-polymorphism:** type schemes (`'a . t`) with `instantiate` (fresh variables per use) and `generalize` make inferred types reusable across call sites.

**Engineering relevance:** this is *why* `TS2322`/`TS2345` errors read the way they do — the compiler unified two types and they did not match, so it reports the most-general conflict. Backend-helper's TSC-assist work is, at its core, helping unification succeed (add an annotation, widen a union, fix a generic) rather than suppressing the error.

## 6. Module resolution + incremental build infrastructure (NodeNext discipline + the dependency graph)

### NodeNext `.js`-suffix discipline (a recurring fleet footgun)
**CONFIRMED** against the official **TypeScript Handbook — Modules Reference** ([typescriptlang.org/docs/handbook/modules/reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)):
- Under `node16`/`nodenext`, **"TypeScript imitates the host's module resolution, but with types."** You write the runtime specifier (with `.js`) and TS resolves the *types* first:
  ```
  import x from "./mod.js";
  // Runtime lookup:        "./mod.js"
  // TypeScript lookup #1:  "./mod.ts"
  // TypeScript lookup #2:  "./mod.d.ts"
  // TypeScript lookup #3:  "./mod.js"
  ```
- So a relative import **must carry the `.js` extension even though the source file is `.ts`** — TS "always wants to resolve internally to a file that can provide type information, while ensuring that the runtime or bundler can use the same path to resolve to a file that provides a JavaScript implementation."

### Project references → build dependency graph + incremental rebuild
**CONFIRMED** against the official **TypeScript Handbook — Project References** ([typescriptlang.org/docs/handbook/project-references](https://www.typescriptlang.org/docs/handbook/project-references.html)):
- `tsc --build` (`-b`) walks the reference graph: **"Find all referenced projects → Detect if they are up-to-date → Build out-of-date projects in the correct order."**
- Ordering is automatic: **"Don't worry about ordering the files you pass on the commandline — tsc will re-order them if needed so that dependencies are always built first."**
- `--build` enables **"smart incremental builds"** — only out-of-date projects rebuild. Referenced projects must set **`composite: true`**.

**Engineering relevance:** the two single most common fleet build breaks backend-helper repairs are (a) a relative import missing its `.js` extension under NodeNext, and (b) a stale incremental graph rebuilding the wrong subset. Both are *infrastructure* failures, not logic bugs — knowing the resolution algorithm + the dependency-ordered rebuild model is what lets the galaxy fix them once and clone the fix fleet-wide (R15).

## Owner-gate (NOT promoted)

papa promoted the established compiler/type-theory facts above (each WebFetch-confirmed against a free primary source). The following remain **[papa-gate]** — they depend on PRISM's actual repository state and must be bound against live config, never hardcoded from this entry:
- The repo's actual `moduleResolution` / `module` / `target` tsconfig values, the `composite`/`incremental` flags in use, and the `.tsbuildinfo` location (the project-references page did NOT document the `.tsbuildinfo` file, so it is intentionally left unasserted here).
- Concrete TSC error-code → fix mappings for *this* codebase (e.g. which `TS2307` cases are NodeNext-suffix misses vs genuinely missing deps).
- GNU Make's exact "older-than-any-prerequisite" rebuild wording was **NOT** confirmable — `gnu.org/software/make` returned HTTP 429 then ECONNREFUSED on both attempts; left out per R12. The TS project-references source covers the dependency-ordered incremental-build concept; re-fetch Make later to add the canonical mtime-comparison rule.
- TAPL (Pierce, *Types and Programming Languages*) is a paywalled textbook — its *concepts* (progress + preservation, subtyping) are referenced by name only; no quote was taken from it, so no TAPL claim is marked CONFIRMED here.

## Sources

> Each URL below was fetched + confirmed via WebFetch during creation (2026-06-10). All are free college-course pages, free online textbooks, or official open documentation — no paywalled/pirated material. Categories prioritized per the domain brief: free compiler course (Stanford CS143), free online book ("Crafting Interpreters"), free university textbook (Cornell CS3110), and official open language docs (TypeScript Handbook).

- **"Crafting Interpreters" — A Tree-Walk Interpreter** (free online book, Robert Nystrom) — https://craftinginterpreters.com/a-tree-walk-interpreter.html
- **"Crafting Interpreters" — Scanning** (free online book) — https://craftinginterpreters.com/scanning.html
- **"Crafting Interpreters" — Representing Code** (free online book) — https://craftinginterpreters.com/representing-code.html
- **"Crafting Interpreters" — Parsing Expressions** (free online book) — https://craftinginterpreters.com/parsing-expressions.html
- **"Crafting Interpreters" — Resolving and Binding** (free online book) — https://craftinginterpreters.com/resolving-and-binding.html
- **Stanford CS143 — Compilers** (free college course) — https://web.stanford.edu/class/cs143/
- **Cornell CS3110 — Type Inference** (free university textbook, Hindley-Milner / unification) — https://cs3110.github.io/textbook/chapters/interp/inference.html
- **TypeScript Handbook — Type Inference** (official open docs) — https://www.typescriptlang.org/docs/handbook/type-inference.html
- **TypeScript Handbook — Modules Reference (node16/nodenext resolution)** (official open docs) — https://www.typescriptlang.org/docs/handbook/modules/reference.html
- **TypeScript Handbook — Project References (build graph + incremental)** (official open docs) — https://www.typescriptlang.org/docs/handbook/project-references.html

> Not promoted (fetch failed — left out per R12): GNU Make manual *How Make Works* (HTTP 429 then ECONNREFUSED on both attempts).

## Cross-refs
- Galaxy brain: `mcp-server/src/engines/backend-helper/MEMORY.md`
- Sibling foundations exemplar (structure mirrored): `knowledge/wiki/academy/academy-pedagogy-foundations.md`
