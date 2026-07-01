---
title: Backend-Helper Resource Atlas
galaxy: backend-helper
owner_slot: papa
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas-meta (2026-06-10)"
verification_method: "Local PRISM paths confirmed via filesystem listing (engine dir + tsconfig + esbuild.config.mjs + npm build tiers). Online URLs each WebFetch-confirmed to resolve AND match the described resource; unverified/hallucinated seeds dropped. No numeric thresholds promoted (R12)."
tags: [backend-helper, resource-atlas, typescript, tsc, esbuild, nodenext, build-perf, reach-index, meta-infra, papa]
---

# Backend-Helper Resource Atlas

> **What this is:** the *where-to-REACH* index for the backend-helper meta/infra galaxy (TypeScript / tsc perf / esbuild / NodeNext). One hub that jumps a chat STRAIGHT to the authoritative source — the local PRISM code/store trove **plus** the canonical free online repo / paper / standard.
>
> **Distinct from [[backend-helper-source-atlas]]** — that sibling is the *where-to-LEARN* curriculum (a course/reading path). This atlas is the *where-to-REACH* index: the canonical upstream repo + the official spec/docs + the galaxy's own code, not a course list.
>
> **R12 / owner-gate:** this atlas links **methods and sources only**. No numeric threshold, build-tier limit, heap size, or compiler constant is reproduced here — those stay owner-gated to papa + `mcp-server/src/physics/constants.ts` (see `## Owner-gate` below).

---

## Local code + stores (PRISM-internal — verified paths)

The galaxy's own code and the build surfaces it owns. Reach these FIRST — they are the live, authoritative PRISM state.

| Pointer | What it is |
|---------|------------|
| `mcp-server/src/engines/backend-helper/` | The backend-helper galaxy engine directory — the galaxy's own code root (carries `CLAUDE.md`, `MEMORY.md`, `PATHS.md`, `TOOLBELT.md`). |
| `mcp-server/tsconfig.json` | The MCP-server TypeScript compiler configuration — module / moduleResolution (NodeNext) / incremental / strictness surface that this galaxy tunes. |
| `mcp-server/esbuild.config.mjs` | The esbuild bundler configuration — the fast-emit path used by the build tiers. |
| `npm run build` tiers (in `mcp-server/package.json` scripts) | The build-tier ladder this galaxy owns: `build` (full tsc + esbuild, pre-commit gate) · `build:tsc` · `build:incremental` (tsc incremental + esbuild) · `build:fast` (esbuild only, rapid iteration) · `build:verify` · `build:all`. |

Galaxy MEMORY index entry: `[galaxy:backend-helper] mcp-server/src/engines/backend-helper/MEMORY.md` — build/TSC assist for every slot (papa).

---

## Canonical repos + papers + standards (verified — WebFetch-confirmed 2026-06-10)

Every URL below was fetched and confirmed to resolve AND match the described resource. Free + legal sources only.

### TypeScript (compiler + language)
- **microsoft/TypeScript** — the official Microsoft TypeScript compiler/language source repository (the tsc you build with). <https://github.com/microsoft/TypeScript>
  - *Verified:* official MS repo, "a language for application-scale JavaScript," compiles to standards-based JS.
- **TypeScript Handbook / Docs** — the official, authoritative documentation hub (Handbook, type-manipulation reference, declaration files, project configuration). <https://www.typescriptlang.org/docs/>
  - *Verified:* official MS-maintained docs; covers Handbook + Reference + tsconfig + tooling.
- **TSConfig Reference** — the official, complete `tsconfig.json` compiler-option reference (every option with default + release version + cross-refs; `module`, `moduleResolution` incl. `nodenext`, `incremental`, strictness flags). <https://www.typescriptlang.org/tsconfig/>
  - *Verified:* official reference; documents the NodeNext module-resolution + incremental options this galaxy tunes.
- **TypeScript Compiler Performance wiki** — the official `--generateTrace` profiling guide (performance tracing, `@typescript/analyze-trace`, `--generateCpuProfile`). <https://github.com/microsoft/TypeScript/wiki/Performance>
  - *Verified:* the seeded "tsc --generateTrace docs" candidate resolves here — official MS wiki page documenting `tsc --generateTrace` + hot-spot analysis. **The canonical reach for tsc build-time profiling.**

### esbuild (fast bundler / emit)
- **evanw/esbuild** — the official esbuild source repository by Evan Wallace ("an extremely fast bundler for the web"; JS/CSS/TS/JSX, tree-shaking, ESM+CJS). <https://github.com/evanw/esbuild>
  - *Verified:* official repo, Go-implemented, the bundler behind PRISM's fast-emit build tier.
- **esbuild Documentation** — the official esbuild docs site (Getting Started, full API reference, Content Types incl. TypeScript/JSX, plugin system + callbacks). <https://esbuild.github.io/>
  - *Verified:* official docs; the authoritative API/plugin reference for `esbuild.config.mjs`.

> **Dropped candidates:** 0. All four seeded URLs resolved and matched; two additional canonical free sources (esbuild docs site, TSConfig reference) were WebFetch-verified and added.

---

## Curated video

None listed — no video source was WebFetch-verifiable for this meta/infra galaxy at verification time. The official docs above are the authoritative reach. (Add a verified canonical talk here on a future keep-fresh pass if one resolves.)

---

## Cross-links (sibling wiki layers)

- [[backend-helper-foundations]] — first-principles of the galaxy's build/type discipline.
- [[backend-helper-source-atlas]] — the *where-to-LEARN* curriculum (course/reading path) — the complement to this *where-to-REACH* atlas.
- [[backend-helper-applied-practice]] — applying the build/type tooling in PRISM day-to-day.
- [[backend-helper-advanced-techniques]] — deep tsc-perf / NodeNext / esbuild-plugin techniques.
- [[prism-methodology-foundations]] — the cross-galaxy PRISM method substrate.

---

## Keep-fresh cadence

- **Trigger a re-verify when:** a TypeScript/esbuild major version ships, a build tier is added/renamed in `mcp-server/package.json`, `tsconfig.json` module/resolution strategy changes, or any linked URL 404s/redirects.
- **Re-verify method:** WebFetch each online URL (confirm it still resolves AND matches); re-list the local `mcp-server/src/engines/backend-helper/` + `tsconfig.json` + `esbuild.config.mjs` + build tiers against the live filesystem. Drop anything that fails.
- **Owner:** papa (this galaxy). Routine staleness floor: re-validate any link older than the freshness window before relying on it.
- **R12 on refresh:** never promote a numeric value into this file on a refresh — link the source, keep numbers owner-gated.

---

## Owner-gate (NOT promoted)

The following stay owner-gated to **papa** + canonical PRISM sources — this atlas links the *method/source*, never the *number*:
- Build-tier heap sizes, tsc/esbuild flag values, incremental-cache thresholds, and any compiler perf budget → live in `mcp-server/package.json` scripts + `tsconfig.json` + `esbuild.config.mjs`, owned by papa.
- Any physics/manufacturing constant referenced downstream → `mcp-server/src/physics/constants.ts` (canonical, never duplicated here).
- This file promotes **no** numeric threshold or constant (R12). If a number is needed, read it from the owner-gated source above.

## Sources

**Local (PRISM filesystem — verified 2026-06-10):**
- `mcp-server/src/engines/backend-helper/` (engine dir: CLAUDE.md / MEMORY.md / PATHS.md / TOOLBELT.md)
- `mcp-server/tsconfig.json`
- `mcp-server/esbuild.config.mjs`
- `mcp-server/package.json` build scripts: build · build:tsc · build:incremental · build:fast · build:verify · build:all

**Online (WebFetch-confirmed 2026-06-10):**
- microsoft/TypeScript — <https://github.com/microsoft/TypeScript>
- TypeScript Handbook/Docs — <https://www.typescriptlang.org/docs/>
- TSConfig Reference — <https://www.typescriptlang.org/tsconfig/>
- TypeScript Compiler Performance (`--generateTrace`) — <https://github.com/microsoft/TypeScript/wiki/Performance>
- evanw/esbuild — <https://github.com/evanw/esbuild>
- esbuild Documentation — <https://esbuild.github.io/>
