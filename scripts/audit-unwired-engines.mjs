#!/usr/bin/env node
// audit-unwired-engines.mjs
// Deep scan of canonical engines folder. Classifies each engine as:
//   WIRED-DIRECT       — imported by a dispatcher
//   WIRED-VIA-ROUTE    — imported by routes/*.ts (consumed by MCP server)
//   WIRED-VIA-REGISTRY — imported by registries/*.ts
//   WIRED-VIA-ORCH     — imported by *Orchestrator*.ts
//   WIRED-VIA-SINGLETON — wrapped by <Name>Singleton.ts that is itself wired
//   WIRED-VIA-HOOK     — imported by hooks/*.ts or src/hooks/**.ts
//   WIRED-VIA-ENGINE   -- imported by another engine (library-layer; a library
//                        dependency, not a dormant capability). LOWEST priority:
//                        only catches engines wired SOLELY via another engine.
//                        SINGLE-HOP: this pass does NOT verify the consuming
//                        engine is itself wired, so an engine consumed only by a
//                        dormant engine is still marked WIRED-VIA-ENGINE -- the
//                        dormant ROOT stays UNWIRED (the actionable signal), and
//                        wiring the leaf would change nothing.
//                        Added 2026-06-10 (U-AUDIT-WIRED-VIA-ENGINE) because the
//                        prior consumer set (dispatcher/route/registry/orch/hook/
//                        singleton) missed plain engine->engine consumption, so
//                        library engines (e.g. QdrantVectorStore) were mis-counted
//                        UNWIRED and chased as false dispatcher-wiring targets.
//   WIRE-EXEMPT        -- has `// WIRE-EXEMPT:` marker
//   WIRED-VIA-ENTRY    -- imported/booted by the server entry (src/index.ts),
//                         e.g. reactive-chains-boot's bootReactiveChains() call.
//   UNWIRED            -- none of the above (truly dormant: zero consumers)
//
// Output: state/shared/UNWIRED-ENGINE-AUDIT-<date>.json
//
// Also captures orphan-engine summary:
//   - legacy `H:/prism/src/engines/` uniques (3 confirmed)
//   - forge-archive note
//   - per-milestone-worktree note
//
// Read-only. Does not move, copy, or write to source code.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const PRISM_ROOT = path.resolve(path.dirname(__filename), "..");
const MCP = path.join(PRISM_ROOT, "mcp-server", "src");
const ENGINES_DIR = path.join(MCP, "engines");
const LEGACY_ENGINES = path.join(PRISM_ROOT, "src", "engines");
// Date-stamp the output filename (the header above promises "<date>"). It was
// frozen at 2026-05-07, so every re-run overwrote the same stale-named file:
// the audit read as ~39 days old FOREVER (resolveAuditPath picks newest by
// filename date), and build-state-snapshot saw "no audit younger than 24h" on
// EVERY invocation -> a wasted 180s regen spawn on every SessionStart fleet-wide.
// PRISM_UNWIRED_AUDIT_DATE overrides for deterministic/frozen-time runs.
const AUDIT_DATE = process.env.PRISM_UNWIRED_AUDIT_DATE || new Date().toISOString().slice(0, 10);
const OUTPUT = path.join(
  PRISM_ROOT,
  "state",
  "shared",
  `UNWIRED-ENGINE-AUDIT-${AUDIT_DATE}.json`,
);

async function listTsFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".d.ts"))
      .map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
}

async function listTsFilesRecursive(dir, exclude = new Set()) {
  const out = [];
  async function walk(d) {
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (exclude.has(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")) out.push(p);
    }
  }
  await walk(dir);
  return out;
}

/**
 * Escape regex metacharacters so an engine basename can be safely interpolated
 * into `new RegExp`. Basenames are normally PascalCase identifiers, but test /
 * spec / type-decl / archived siblings carry dots (e.g. `Foo.archive.2026-05-17`)
 * — unescaped, `.` is the any-char metacharacter and an unbalanced `(`/`[` would
 * throw `Invalid regular expression` and abort the entire audit.
 * @param {string} s
 * @returns {string}
 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Decide whether engine `name` is wired by consumer-file `content`.
 * Detects three reference forms:
 *   1. static import:          import { X } from "...EngineName.js"
 *   2. literal dynamic import: import("...EngineName.js") -- WITH OR WITHOUT `await`.
 *      The `await` is optional so route-map lazy loaders
 *      `() => import("...EngineName.js").then(m => m.engine)` (XPROC_ROUTES and every
 *      `Record<string, () => import(...)>` dispatch map) are detected -- they were a
 *      systematic false-UNWIRED blind spot before 2026-06-18 (e.g. XProcNeuralAutoFireEngine,
 *      wired via 3 xproc_autofire_* route entries in aiReasoningDispatcher).
 *      Forms 1-2 anchor the basename to the FINAL path segment (preceded by `/`
 *      or the opening quote) so `FooEngine` is not matched inside a longer
 *      segment such as `SuperFooEngine.js`.
 *   3. table-driven wiring:    a templated dynamic import — await import(`...${var}.js`)
 *      — PLUS the basename as a quoted token immediately followed by a comma,
 *      i.e. the first element of an ACTION_MAP tuple `["EngineName", "export",
 *      "method"]` (the shape used by mechanicalDesignDispatcher /
 *      fluidThermalDispatcher, where the engine name is data in a lookup table
 *      and never appears in an import path). Form 3 was a systematic
 *      false-UNWIRED blind spot before 2026-05-18.
 * SCOPE HONESTY (R12): Form-3's two conditions are file-global, not co-located.
 * The trailing comma excludes prose / error-string mentions (the common false
 * case), but a comma-separated quoted mention in a comment inside a
 * templated-import file could still match. That residual false-WIRED risk is
 * narrow and strictly less harmful than the false-UNWIRED bug it replaces.
 * @param {string} name    engine basename (no extension)
 * @param {string} content full text of the consumer file
 * @returns {boolean} true if `content` references `name` as a wiring
 */
// Single-entry cache: applyConsumerClassification iterates ALL engines for ONE consumer
// file before moving on, so consecutive engineReferencedInConsumer calls share the same
// `content`. Stripping per (engine,file) pair would be O(engines*files) multi-KB regex+split
// (millions of calls on the engine->engine pass). Caching the last (content,code) collapses
// it to O(files) -- the strip runs once per file, then every engine reuses it (alpha efficiency).
let _lastStripContent = null;
let _lastStripCode = null;
/**
 * Remove comments before wiring-detection so a commented-out or JSDoc import mention
 * (an "import(...Engine.js)" sitting INSIDE a comment) cannot false-WIRE a real orphan
 * (2026-06-18, arm-C P2 follow-up to U-AUDIT-LAZY-IMPORT-DETECT). C-style block comments are
 * removed ONLY when the block-open token sits at the START of a trimmed line (real JSDoc /
 * block comments do). The line-start anchor is LOAD-BEARING: a block-open or block-close token
 * sitting MID-LINE inside a string or regex literal (a glob, a MIME type, a regex literal) is
 * NOT a comment and must never start a strip span -- an earlier UNANCHORED block regex ate 100+
 * lines of real code (incl. genuine import() statements) between an in-string block-open and a
 * later in-regex block-close in ppDispatcher.ts (caught by per-file scrutiny 2026-06-18).
 * After block removal, pure line-comments and asterisk-prefixed
 * JSDoc lines are dropped. TRAILING same-line comments on a CODE line are left intact
 * (documented residual) so the sibling stop_on_unwired_assets footgun (eating a line-comment
 * marker inside "http://") also cannot occur -- we never mid-line strip.
 */
function stripCommentLines(content) {
  if (content === _lastStripContent) return _lastStripCode;
  const noBlock = content.replace(/^\s*\/\*[\s\S]*?\*\//gm, "");
  const code = noBlock
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return !(t.startsWith("//") || t.startsWith("*"));
    })
    .join("\n");
  _lastStripContent = content;
  _lastStripCode = code;
  return code;
}

/**
 * Decide whether a module is TYPE-ONLY -- it exports ONLY TypeScript types/interfaces
 * (`export type`, `export interface`, `export type { ... } from`, `export type * from`)
 * and therefore erases to ZERO runtime JavaScript. Such a file (e.g. `IEngine.ts`, a
 * convenience re-export of `EngineInfo`/`EngineCapability` type aliases) can NEVER be
 * "wired to a dispatcher" -- there is no runtime value to import -- so flagging it UNWIRED
 * is a false-positive that inflates the actionable orphan count and sends the fleet chasing
 * a phantom wiring target (sibling of the 2026-06-10 WIRED-VIA-ENGINE and 2026-06-11
 * array-dispatch false-positive fixes). The name-based `.types.ts` exclusion in main() does
 * NOT catch a type-only file that is conventionally named (`IEngine.ts`).
 *
 * CONSERVATIVE BY DESIGN (R12 -- never HIDE a real wiring gap): returns true ONLY when the
 * comment-stripped source has a POSITIVE type-export marker AND zero runtime-export signals.
 * Any runtime export (`const`/`let`/`var`/`function`/`class`/`default`/`enum`, a value
 * `export { ... }`/`export * from`, or a CommonJS `module.exports`/`exports.x =`), a file with
 * no exports at all, or an inline-type bare export (`export { type Foo }`) all return FALSE --
 * they stay classified as before. Better to leave a type-only file in UNWIRED than to wrongly
 * drop a genuine dormant engine.
 *
 * Callers MUST pass the FULL source (not a truncated head): a runtime export beyond a 2KB head
 * would otherwise be missed, flipping the safe false-negative into the dangerous false-positive
 * (excluding a real engine).
 * @param {string} rawSrc full module source
 * @returns {boolean} true iff the module exports only types (zero runtime JS)
 */
export function isTypeOnlyModule(rawSrc) {
  if (!rawSrc) return false;
  const code = stripCommentLines(rawSrc);
  // Any of these = a runtime export -> NOT type-only (enum/const-enum counted as runtime: conservative).
  const RUNTIME_EXPORT =
    /\bexport\s+(?:default|const|let|var|async\s+function|function|abstract\s+class|class|enum)\b/;
  // Value named/star re-export: `export { ... }` / `export * from`. `export type {` and
  // `export type *` do NOT match (the `type` keyword sits between `export` and the `{`/`*`).
  const VALUE_REEXPORT = /\bexport\s*\{|\bexport\s+\*/;
  // CommonJS runtime export.
  const CJS_EXPORT = /\bmodule\.exports\b|\bexports\.[A-Za-z_$]/;
  if (RUNTIME_EXPORT.test(code) || VALUE_REEXPORT.test(code) || CJS_EXPORT.test(code)) return false;
  // A positive type-only signal is required -- an empty / no-export / side-effect-only file is NOT type-only.
  return /\bexport\s+(?:type|interface)\b/.test(code);
}

export function engineReferencedInConsumer(name, content) {
  if (!name || !content) return false;
  // Strip comments first (see stripCommentLines) so commented-out / JSDoc import mentions
  // don't false-WIRE. The basename presence check + all regex forms run on stripped `code`.
  const code = stripCommentLines(content);
  if (!code.includes(name)) return false;
  const n = escapeRegExp(name);
  // Forms 1 & 2 — basename as the final segment of a literal import path.
  // `(?:[^'"]*/)?` consumes any leading path that ends in `/`, forcing the
  // basename to start a path segment rather than be a suffix of a longer one.
  // Form-2 trails with `\\s*\\)` (not `\\)`) so multi-line `await import(\n "x"\n)`
  // dispatcher style matches — fixed 2026-05-25 (november DEA-MS0) after the
  // tighter regex falsely flagged BuildAdvisor/BuildDebrief/Contextual et al.
  // `(?!type[\\s{])` excludes a TS type-only import (`import type { X } from "...X.js"` /
  // `import type X from`) -- it is erased at runtime, so it is NOT real wiring and must not mask a
  // genuinely-unwired engine (U-AUDIT-TYPE-ONLY-IMPORT 2026-06-21). An inline `import { type X }` or
  // a mixed `import { type X, y }` stays a VALUE import (the lookahead only fires on `import type`).
  const literalRe = new RegExp(
    `(?:import\\s+(?!type[\\s{])[^;]+from\\s+['"](?:[^'"]*/)?${n}(?:\\.js)?['"])` +
      `|(?:(?:await\\s+)?import\\(\\s*['"](?:[^'"]*/)?${n}(?:\\.js)?['"]\\s*\\))`,
    "m",
  );
  if (literalRe.test(code)) return true;
  // Form 3 — table-driven: a templated dynamic import (engine name supplied via
  // a variable) AND the basename as a quoted token that opens a tuple element
  // (immediately followed by a comma). The comma requirement excludes prose and
  // error-message mentions; the templated-import guard excludes files with no
  // dynamic-import table at all.
  const tableDriven = /import\(\s*`[^`]*\$\{/.test(code);
  if (tableDriven && new RegExp(`['"]${n}['"]\\s*,`).test(code)) return true;
  // Form 4 -- module-specifier-array + VARIABLE dynamic import. An engine whose
  // path is a quoted string element of a module list that is later imported via a
  // VARIABLE (`const MODULES=["./EngineA.js",...]; for (m of MODULES) import(m)`,
  // or an `importer(m)` wrapping `import(m)`). The literal `import("...EngineA.js")`
  // never appears, so Forms 1-2 miss it. Motivating case (2026-06-18,
  // U-AUDIT-ENTRY-CONSUMER): reactive-chains-boot's REGISTRATION_MODULES booting
  // reactiveChainBootstrap + cycleSchedulingBridge. Guarded like Form 3 with TWO
  // file-global conditions, BOTH required: (a) a bare-identifier dynamic import is
  // present (`import(<ident>)`), AND (b) the basename is the FINAL segment of a
  // quoted PATH string -- a MANDATORY leading slash excludes a bare prose /
  // error-string mention (`"EngineA failed"`), and a path string with no variable
  // import (or a variable import with no path string) does NOT match.
  const variableImport = /import\(\s*[A-Za-z_$][\w$]*\s*\)/.test(code);
  if (variableImport && new RegExp("['\"`](?:[^'\"`]*/)" + n + "(?:\\.js)?['\"`]").test(code)) {
    return true;
  }
  return false;
}

/**
 * Apply ONE consumer-classification pass over the engines map (mutating it).
 * Pure w.r.t. I/O: callers pass PRE-READ consumer files so this is unit-testable
 * without touching disk or the live engine tree. An engine is (re)classified to
 * `classification` when a consumer file references it (via engineReferencedInConsumer)
 * AND it is not already classified by a higher-priority pass -- callers invoke
 * passes in priority order, so the first match wins and later passes only ADD a
 * reason. WIRE-EXEMPT engines are never reclassified. When opts.excludeSelf is
 * true, a consumer file is skipped for the engine whose own definition file it is
 * (engineName === name) -- so the engine->engine pass never marks an engine
 * "wired" by its own source. Returns the same (mutated) engines map.
 *
 * @param {Map<string,{classified:(string|null),reasons:string[]}>} engines
 * @param {Array<{rel:string, content:string, engineName?:string}>} consumerFiles  pre-read
 * @param {string} classification  e.g. "WIRED-DIRECT", "WIRED-VIA-ENGINE"
 * @param {{excludeSelf?:boolean}} [opts]
 * @returns {Map} the mutated engines map
 */
export function applyConsumerClassification(engines, consumerFiles, classification, opts = {}) {
  const excludeSelf = opts.excludeSelf === true;
  for (const f of consumerFiles) {
    if (!f || !f.content) continue;
    for (const [name, info] of engines) {
      if (info.classified === "WIRE-EXEMPT") continue;
      if (excludeSelf && f.engineName === name) continue;
      if (!engineReferencedInConsumer(name, f.content)) continue;
      if (!info.classified || info.classified === "UNWIRED") {
        info.classified = classification;
        info.reasons.push(`${classification}:${f.rel}`);
      } else if (!info.reasons.some((r) => r.startsWith(`${classification}:`))) {
        info.reasons.push(`${classification}:${f.rel}`);
      }
    }
  }
  return engines;
}

/**
 * Reclassify engines that are wired SOLELY via a GATED module-load boot path as DORMANT-BRIDGE.
 * Motivating case (BACKEND-COMPLETION-TRIAGE-2026-06-18 #1b): reactive-chains-boot.ts side-effect-
 * imports its REGISTRATION_MODULES (reactiveChainBootstrap, cycleSchedulingBridge) to register
 * EventBus chains, but the boot is gated behind PRISM_REACTIVE_CHAINS_ENABLE (default-off). So those
 * bridges are BUILT + boot-wired yet DORMANT in production. Lumping them with fully-active WIRED-VIA-*
 * engines makes the backend-completion signal read "done" when really it is "built but not running".
 * DORMANT-BRIDGE is the distinct, more-accurate class -- remedy "enable the gate", NOT "add a
 * dispatcher action" (the UNWIRED remedy).
 *
 * Detection is DRIVEN BY THE BOOT MODULE'S OWN EXPORTS (the *_ENABLE env literal + REGISTRATION_MODULES
 * basenames), so it auto-adapts when a gated bridge is added/removed -- nothing is hardcoded in the
 * audit. An ungated boot (no *_ENABLE literal) leaves its modules WIRED (they are genuinely active).
 * A module that ALSO has a non-boot consumer (a dispatcher/route/etc. reason) is genuinely active and
 * is left as-is -- only a SOLELY-boot-wired (or otherwise UNWIRED) engine is reclassified.
 *
 * Pure w.r.t. I/O (caller passes the pre-read boot source) -- unit-testable like applyConsumerClassification.
 * @param {Map<string,{classified:(string|null),reasons:string[]}>} engines  post-cascade, post-UNWIRED map.
 * @param {string|null} bootSrc  the gated boot module source (null/absent -> no-op).
 * @param {string} bootBase  the boot module basename (no ext), e.g. "reactive-chains-boot" -- used to
 *                           detect the solely-via-boot reasons (path-separator-agnostic).
 * @returns {{reclassified:string[], gateEnv:(string|null), modules:string[]}}
 */
export function applyDormantBridgeClassification(engines, bootSrc, bootBase) {
  const result = { reclassified: [], gateEnv: null, modules: [] };
  if (!bootSrc || !bootBase) return result;
  // GATED only if an explicit `*_ENABLE` env literal is present; an ungated boot site means its
  // modules run unconditionally -> they are genuinely WIRED, not dormant. (The literal is the env
  // NAME, e.g. "PRISM_REACTIVE_CHAINS_ENABLE", declared as the gate constant.)
  const gateM = bootSrc.match(/["']([A-Z][A-Z0-9_]*_ENABLE)["']/);
  result.gateEnv = gateM ? gateM[1] : null;
  if (!result.gateEnv) return result;
  const modM = bootSrc.match(/REGISTRATION_MODULES\s*=\s*\[([\s\S]*?)\]/);
  if (!modM) return result;
  result.modules = [...modM[1].matchAll(/['"`](?:[^'"`]*\/)?([A-Za-z0-9_]+)\.js['"`]/g)].map((m) => m[1]);
  for (const name of result.modules) {
    const info = engines.get(name);
    if (!info || info.classified === "WIRE-EXEMPT") continue;
    // SOLELY via the gated boot: either still UNWIRED, or every wiring reason cites the boot module.
    // If any reason is a non-boot consumer, the engine is genuinely active -> leave it.
    const onlyViaBoot =
      info.classified === "UNWIRED" ||
      (info.reasons.length > 0 && info.reasons.every((r) => r.includes(bootBase)));
    if (onlyViaBoot) {
      info.classified = "DORMANT-BRIDGE";
      info.reasons.push(
        `DORMANT-BRIDGE: registered only via gated boot ${bootBase} (set ${result.gateEnv}=1 to activate; default-off)`,
      );
      result.reclassified.push(name);
    }
  }
  return result;
}

async function main() {
  console.log("scanning engines …");
  // Exclude test / spec / type-decl / archived siblings from the engine set —
  // they are not engines; counting them inflates totals and lands them in the
  // UNWIRED list as noise the fleet would chase as false targets.
  const engineFiles = (await listTsFiles(ENGINES_DIR)).filter((f) => {
    const b = path.basename(f);
    return !/\.(test|spec|types)\.ts$/.test(b) && !/\.archive\./.test(b);
  });
  console.log(`  ${engineFiles.length} engine files`);

  // build engine identifier set: filename without .ts and lowerCamel singleton names
  const engines = new Map(); // basename -> { path, mtime, size, exports: [] }
  for (const f of engineFiles) {
    const stat = await fs.stat(f);
    const basename = path.basename(f, ".ts");
    engines.set(basename, {
      path: f,
      mtime: stat.mtime.toISOString(),
      size_kb: Math.round(stat.size / 1024),
      classified: null,
      reasons: [],
    });
  }

  // check WIRE-EXEMPT markers
  const exemptCount = { count: 0 };
  for (const [name, info] of engines) {
    try {
      const head = (await fs.readFile(info.path, "utf8")).slice(0, 2000);
      if (/\/\/\s*WIRE-EXEMPT:/.test(head)) {
        info.classified = "WIRE-EXEMPT";
        const m = head.match(/\/\/\s*WIRE-EXEMPT:\s*(.+)/);
        info.reasons.push(`exempt: ${m ? m[1].trim() : "no reason given"}`);
        exemptCount.count++;
      }
    } catch {}
  }

  // collect candidate consumer files, then PRE-READ each into {rel, content,
  // engineName} so classification is a pure, unit-testable pass
  // (applyConsumerClassification above) rather than disk-coupled.
  console.log("scanning consumers ...");
  const dispatcherFiles = await listTsFiles(path.join(MCP, "tools", "dispatchers"));
  const routeFiles = await listTsFilesRecursive(path.join(MCP, "routes"), new Set(["__tests__"]));
  // Server REQUEST middleware (e.g. attachUserPlan) consumes engines at runtime to serve HTTP
  // requests -- a genuine active wiring path. It was MISSING from the consumer set, so an engine
  // consumed SOLELY by middleware (e.g. EntitlementOverrideStore <- attachUserPlan) was falsely
  // UNWIRED (2026-06-21, U-AUDIT-WIRED-VIA-MIDDLEWARE; sibling of the 2026-06-10 engine->engine fix).
  const middlewareFiles = await listTsFilesRecursive(path.join(MCP, "middleware"), new Set(["__tests__"]));
  const registryFiles = await listTsFiles(path.join(MCP, "registries"));
  const orchestratorFiles = engineFiles.filter((f) => /Orchestrator/i.test(path.basename(f)));
  const hookFiles = await listTsFilesRecursive(path.join(MCP, "hooks"), new Set(["__tests__"]));
  const singletonFiles = engineFiles.filter((f) => /Singleton\.ts$/.test(f));
  // Server ENTRY-point boot: index.ts directly boots engines via
  // `await import("./engines/X.js")` (e.g. reactive-chains-boot at index.ts:949).
  // It is a legitimate top-level wiring surface that was MISSING from the consumer
  // set, so entry-only-booted engines were falsely UNWIRED (2026-06-18,
  // U-AUDIT-ENTRY-CONSUMER). Include only entry files that actually exist.
  const entryCandidates = [path.join(MCP, "index.ts")];
  const entryFiles = [];
  for (const ec of entryCandidates) {
    try { await fs.access(ec); entryFiles.push(ec); } catch { /* absent -> skip */ }
  }
  console.log(
    `  dispatchers=${dispatcherFiles.length} routes=${routeFiles.length} middleware=${middlewareFiles.length} registries=${registryFiles.length} orch=${orchestratorFiles.length} hooks=${hookFiles.length} singletons=${singletonFiles.length} entry=${entryFiles.length} engines=${engineFiles.length}`,
  );

  let consumerReadFailures = 0;
  async function readConsumers(files) {
    return Promise.all(
      files.map(async (f) => {
        let content = "";
        try {
          content = await fs.readFile(f, "utf8");
        } catch (e) {
          // An unreadable consumer file means any engine it references goes
          // UNDETECTED here -> falsely classified UNWIRED. Surface it (R12)
          // instead of silently under-counting wiring (the false-UNWIRED bug).
          consumerReadFailures++;
          console.warn(`  [warn] unreadable consumer (engines it references may be falsely UNWIRED): ${path.relative(MCP, f)} -- ${e.code || e.message}`);
          content = "";
        }
        return { rel: path.relative(MCP, f), content, engineName: path.basename(f, ".ts") };
      }),
    );
  }

  // Classify in priority order: direct dispatcher -> routes -> middleware -> registries ->
  // orchestrators -> hooks -> singletons -> entry-boot -> other engines
  // (library-layer). WIRED-VIA-ENTRY ranks ABOVE the engine->engine pass: an
  // engine the server entry boots is wired at the top level, not merely a library
  // dep; it ranks BELOW the specific surfaces (first-match-wins, so it only labels
  // engines those passes missed -- e.g. reactive-chains-boot, booted only by
  // index.ts). The WIRED-VIA-ENGINE pass stays LAST + self-excluded, so it only
  // catches engines consumed solely by another engine -- a correctly-wired
  // library, NOT a dormant capability. Detection reuses the pure, exported
  // engineReferencedInConsumer (static / dynamic / table-driven / module-array).
  applyConsumerClassification(engines, await readConsumers(dispatcherFiles), "WIRED-DIRECT");
  applyConsumerClassification(engines, await readConsumers(routeFiles), "WIRED-VIA-ROUTE");
  applyConsumerClassification(engines, await readConsumers(middlewareFiles), "WIRED-VIA-MIDDLEWARE");
  applyConsumerClassification(engines, await readConsumers(registryFiles), "WIRED-VIA-REGISTRY");
  applyConsumerClassification(engines, await readConsumers(orchestratorFiles), "WIRED-VIA-ORCH");
  applyConsumerClassification(engines, await readConsumers(hookFiles), "WIRED-VIA-HOOK");
  applyConsumerClassification(engines, await readConsumers(singletonFiles), "WIRED-VIA-SINGLETON");
  applyConsumerClassification(engines, await readConsumers(entryFiles), "WIRED-VIA-ENTRY");
  applyConsumerClassification(engines, await readConsumers(engineFiles), "WIRED-VIA-ENGINE", { excludeSelf: true });

  // Anything still unclassified is UNWIRED
  for (const [_n, info] of engines) {
    if (!info.classified) info.classified = "UNWIRED";
  }

  // TYPE-ONLY reclassification: a file that exports ONLY TS types/interfaces (e.g. IEngine.ts,
  // `export type { ... } from "./BaseEngine.js"`) erases to zero runtime JS and can NEVER be wired
  // to a dispatcher -- flagging it UNWIRED is a false-positive that inflates the actionable orphan
  // count (the name-based `.types.ts` filter in the engine scan misses a conventionally-named
  // type-only file). Read the FULL source for the SMALL UNWIRED set ONLY (minimal IO, not all 3825),
  // so a runtime export beyond any head-slice is still detected (conservative -- see isTypeOnlyModule).
  const unwiredCandidates = [...engines.values()].filter((i) => i.classified === "UNWIRED");
  let typeOnlyReadFailures = 0;
  await Promise.all(
    unwiredCandidates.map(async (info) => {
      try {
        const src = await fs.readFile(info.path, "utf8");
        if (isTypeOnlyModule(src)) {
          info.classified = "TYPE-ONLY";
          info.reasons.push(
            "type-only module (exports only TS types/interfaces; zero runtime JS -- not a wireable engine)",
          );
        }
      } catch {
        // unreadable -> leave UNWIRED (fail-safe; never silently drop a candidate).
        typeOnlyReadFailures++;
      }
    }),
  );
  if (typeOnlyReadFailures > 0) {
    console.warn(`  [warn] ${typeOnlyReadFailures} UNWIRED candidate(s) unreadable during the TYPE-ONLY check -- left as UNWIRED (surfaced per R12, not silently swallowed).`);
  }
  if (consumerReadFailures > 0) {
    console.warn(`  [warn] ${consumerReadFailures} consumer file(s) were unreadable -- some engines may be FALSELY classified UNWIRED (surfaced per R12, not silently swallowed).`);
  }

  // DORMANT-BRIDGE reclassification (BACKEND-COMPLETION-TRIAGE-2026-06-18 #1b): engines wired SOLELY
  // via the gated reactive-chains boot path are built + boot-wired but DORMANT by default
  // (PRISM_REACTIVE_CHAINS_ENABLE off) -- a distinct state from fully-active WIRED and from UNWIRED.
  // Driven by the boot module's own REGISTRATION_MODULES export (no hardcoded engine list here).
  const bootModulePath = path.join(ENGINES_DIR, "reactive-chains-boot.ts");
  let dormantResult = { reclassified: [], gateEnv: null, modules: [] };
  try {
    const bootSrc = await fs.readFile(bootModulePath, "utf8");
    dormantResult = applyDormantBridgeClassification(engines, bootSrc, path.basename(bootModulePath, ".ts"));
  } catch {
    // boot module absent (older trees / pre-U-REACTIVE-CHAINS-BOOT) -> no DORMANT-BRIDGE class.
  }

  // Tally
  const tally = {};
  for (const info of engines.values()) {
    tally[info.classified] = (tally[info.classified] || 0) + 1;
  }

  // Sort unwired by mtime ascending
  const unwired = [...engines.entries()]
    .filter(([_n, i]) => i.classified === "UNWIRED")
    .sort(([_a, a], [_b, b]) => a.mtime.localeCompare(b.mtime))
    .map(([name, info]) => ({
      engine: name,
      mtime: info.mtime,
      size_kb: info.size_kb,
      suggestedDispatcher: suggestDispatcher(name),
    }));

  // DORMANT-BRIDGE list: built + boot-wired engines that are dormant until the gate flag is set.
  // Remedy is "enable the gate", NOT "add a dispatcher action" (the UNWIRED remedy) -- so the fleet
  // does not chase them as false dispatcher-wiring targets.
  const dormantBridges = [...engines.entries()]
    .filter(([_n, i]) => i.classified === "DORMANT-BRIDGE")
    .sort(([_a, a], [_b, b]) => a.mtime.localeCompare(b.mtime))
    .map(([name, info]) => ({
      engine: name,
      mtime: info.mtime,
      size_kb: info.size_kb,
      gateEnv: dormantResult.gateEnv,
      remedy: `boot-wired but default-off -- set ${dormantResult.gateEnv}=1 to activate (NOT a dispatcher-wiring gap)`,
    }));

  // TYPE-ONLY list: modules that export only TS types/interfaces (zero runtime JS). Surfaced here
  // (not silently dropped -- R12) so the reclassification is auditable; remedy is "none -- not an
  // engine", NOT "add a dispatcher action" (the UNWIRED remedy).
  const typeOnlyModules = [...engines.entries()]
    .filter(([_n, i]) => i.classified === "TYPE-ONLY")
    .sort(([_a, a], [_b, b]) => a.mtime.localeCompare(b.mtime))
    .map(([name, info]) => ({
      engine: name,
      mtime: info.mtime,
      size_kb: info.size_kb,
      remedy:
        "type-only module (exports only TS types/interfaces) -- not a wireable engine, no dispatcher action needed",
    }));

  // Orphan summary (cheap restate)
  const legacyOnly = [];
  if (await pathExists(LEGACY_ENGINES)) {
    const legacyFiles = await listTsFiles(LEGACY_ENGINES);
    const legacySet = new Set(legacyFiles.map((f) => path.basename(f)));
    const canonicalSet = new Set([...engines.keys()].map((n) => `${n}.ts`));
    for (const f of legacySet) {
      if (!canonicalSet.has(f)) legacyOnly.push(f);
    }
  }

  const out = {
    schemaVersion: "1.0.0",
    generated: new Date().toISOString(),
    generatedBy: "scripts/audit-unwired-engines.mjs",
    canonicalEnginesFolder: ENGINES_DIR,
    counts: {
      totalCanonicalEngines: engines.size,
      ...tally,
    },
    orphans: {
      legacyTopLevel: {
        path: LEGACY_ENGINES,
        uniqueNotInCanonical: legacyOnly,
      },
      forgeArchive: {
        path: path.join(PRISM_ROOT, "..", "prism-forge-archive", "src", "engines"),
        note: "Full archive of canonical. Leave alone (per user policy: copy never move).",
      },
      worktreeClones: {
        pattern: "H:/prism-*/mcp-server/src/engines/",
        note: "Per-milestone branch scaffolding (~30 worktrees). Expected, not orphans.",
      },
    },
    unwiredEngines: unwired,
    dormantBridges,
    typeOnlyModules,
    notes: [
      "DORMANT-BRIDGE: an engine wired SOLELY via a gated module-load boot path (reactive-chains-boot's REGISTRATION_MODULES, gated default-off behind PRISM_REACTIVE_CHAINS_ENABLE). BUILT + boot-wired but DORMANT in prod -- a distinct backend-completion state from fully-active WIRED-* and from UNWIRED. Remedy: enable the gate (NOT add a dispatcher action). Driven by the boot module's own REGISTRATION_MODULES export -- not a hardcoded list.",
      "WIRE-EXEMPT engines have a `// WIRE-EXEMPT: <reason>` marker in the first 2KB.",
      "TYPE-ONLY: a module that exports only TS types/interfaces (e.g. `export type { ... } from`, `export interface`) and erases to zero runtime JavaScript -- it cannot be wired to a dispatcher, so it is NOT a UNWIRED orphan. Detected by CONTENT (isTypeOnlyModule) over the UNWIRED candidate set, because a conventionally-named type-only file (IEngine.ts) escapes the name-based `.types.ts` filter. Conservative: only reclassified when the source has a positive type-export AND zero runtime exports (2026-06-22, U-AUDIT-TYPE-ONLY).",
      "Singleton wrappers count as WIRED-VIA-SINGLETON. The wrapping engine itself must still be wired separately.",
      "WIRED-VIA-ENGINE means the engine is consumed by another engine (library-layer) -- a library dependency, NOT a dispatcher-wiring target. SINGLE-HOP: the pass does not verify the consuming engine is itself wired, so an engine consumed only by a dormant engine is still WIRED-VIA-ENGINE (the dormant ROOT stays UNWIRED, which is the actionable signal). Only UNWIRED (zero consumers of any kind) engines are candidate for wiring.",
      "WIRED-VIA-MIDDLEWARE means the engine is consumed by an HTTP server request-middleware (mcp-server/src/middleware/*.ts, e.g. attachUserPlan importing EntitlementOverrideStore) -- a genuine active wiring path reached on every request, NOT a dispatcher-wiring gap. Added 2026-06-21 (U-AUDIT-WIRED-VIA-MIDDLEWARE) because an engine consumed SOLELY by middleware was falsely UNWIRED.",
      "An engine can have multiple wiring paths; classification stops at first match in priority order.",
      "Run with: node scripts/audit-unwired-engines.mjs",
    ],
  };

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(out, null, 2), "utf8");

  console.log("\n=== Unwired Engine Audit Summary ===");
  console.log(`total engines:            ${engines.size}`);
  for (const [k, v] of Object.entries(tally).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${k.padEnd(22)} ${v}`);
  }
  if (dormantBridges.length) {
    console.log(`dormant bridges (gated):  ${dormantBridges.map((d) => d.engine).join(", ")} -- set ${dormantResult.gateEnv}=1 to activate`);
  }
  console.log(`legacy-only orphans:      ${legacyOnly.length}`);
  console.log(`output:                   ${OUTPUT}`);
}

async function pathExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

// Heuristic dispatcher suggester
function suggestDispatcher(name) {
  const n = name.toLowerCase();
  if (/(adaptive|control|chatter|stability|spindle).*spindle|spindlecontrol/.test(n)) return "prism_adaptive_control";
  if (/^adaptive/.test(n) || /control(?!ler)/.test(n) || /closedloop|feedcontrol/.test(n)) return "prism_adaptive_control";
  if (/post|gcode|controller|dialect|fanuc|mazak|haas|okuma/.test(n)) return "prism_cam";
  if (/toolpath|cam|hsm|trochoidal|adaptive.*clearing|operation.*plan/.test(n)) return "prism_cam";
  if (/wedm|edm|wire.*edm/.test(n)) return "prism_edm";
  if (/turning|lathe|milltunr/.test(n)) return "prism_turning";
  if (/grind|wheel|dressing/.test(n)) return "prism_grinding";
  if (/laser|waterjet/.test(n)) return "prism_edm";
  if (/safety|collision|envelope|workhold|veto|gate/.test(n)) return "prism_safety";
  if (/cad|geometry|sketch|nurbs|brep|mesh|step|iges/.test(n)) return "prism_cad";
  if (/5axis|fiveaxis|multiaxis|kinematic/.test(n)) return "prism_5axis";
  if (/welding|braz|adhesive/.test(n)) return "prism_welding";
  if (/material|alloy|machinability|kienzle|taylor/.test(n)) return "prism_data";
  if (/forming|stamping|press|sheet|forging|rolling/.test(n)) return "prism_forming";
  if (/fluid|thermal|heatexchanger|cooling|valve|pump|piping/.test(n)) return "prism_fluid_thermal";
  if (/mechanical|gear|spring|bearing|shaft/.test(n)) return "prism_mechanical";
  if (/anodiz|nitrid|carburiz|heattreat|coating|plating|peening|cryogenic|passivation/.test(n)) return "prism_material_processing";
  if (/vibration|fourier|wavelet|chatter|tribology|frequency/.test(n)) return "prism_vibration_physics";
  if (/cnc.*op|broach|chamfer|countersink|knurl|drilling.*deep|threading.*single/.test(n)) return "prism_cnc_ops";
  if (/quote|cost|invoice|payroll|inventory|customer|hr|order|capacity/.test(n)) return "prism_business";
  if (/quality|spc|cpk|gauge|cmm|inspect|fai|gdt/.test(n)) return "prism_quality";
  if (/diagnos|forensic|inverse|sustain|genplan|alarm/.test(n)) return "prism_diagnosis";
  if (/feasibility|accessibility|workhold|rigidity/.test(n)) return "prism_feasibility";
  if (/auth|login|session|user|jwt|rbac/.test(n)) return "prism_auth";
  if (/automation|oee|bottleneck|workinst|shifthand/.test(n)) return "prism_automation";
  if (/(ai|ml|neural|bayesian|markov|reinforce|reasoning|cognitive|knowledge|graph|wisdom|agi|fewshot|lora)/.test(n)) return "prism_ai";
  if (/calc|formula|algorithm|cutting|force|deflect|surface.*finish|merchant|oxley|johnson.*cook|chip|peck|thread|monte.*carlo|optimi/.test(n)) return "prism_calc";
  if (/orchestrat|swarm|agent|plan|roadmap/.test(n)) return "prism_orchestrate";
  if (/session|context|memory|wip|checkpoint|handoff|kv/.test(n)) return "prism_session";
  if (/dev|build|quality.*score|svi|gap.*scan|test.*generat/.test(n)) return "prism_dev";
  if (/skill|script|bundle/.test(n)) return "prism_skill_script";
  if (/threading|tap.*drill/.test(n)) return "prism_thread";
  if (/multi.*op|rest.*machining|sequence|transition/.test(n)) return "prism_multi_op";
  if (/process.*control|doe|spc.*ewma|cusum/.test(n)) return "prism_process_control";
  if (/scheduling|capacity.*plan|leadtime|bottleneck/.test(n)) return "prism_scheduling";
  if (/parts|file.*upload|file.*storage|attachment/.test(n)) return "prism_parts";
  if (/realtime|websocket|broadcast|message.*queue/.test(n)) return "prism_realtime";
  if (/grafana|prometheus|monitor|metric/.test(n)) return "prism_monitoring";
  if (/atcs|autonomous|autopilot/.test(n)) return "prism_atcs";
  return "UNKNOWN — review manually";
}

// Run the audit only when executed directly — guarded so test files can
// `import { engineReferencedInConsumer }` without triggering a full engine scan
// and a write to UNWIRED-ENGINE-AUDIT-*.json.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (invokedDirectly) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
