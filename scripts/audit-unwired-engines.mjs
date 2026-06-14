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
const OUTPUT = path.join(
  PRISM_ROOT,
  "state",
  "shared",
  "UNWIRED-ENGINE-AUDIT-2026-05-07.json",
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
 *   2. literal dynamic import: await import("...EngineName.js")
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
export function engineReferencedInConsumer(name, content) {
  if (!name || !content || !content.includes(name)) return false;
  const n = escapeRegExp(name);
  // Forms 1 & 2 — basename as the final segment of a literal import path.
  // `(?:[^'"]*/)?` consumes any leading path that ends in `/`, forcing the
  // basename to start a path segment rather than be a suffix of a longer one.
  // Form-2 trails with `\\s*\\)` (not `\\)`) so multi-line `await import(\n "x"\n)`
  // dispatcher style matches — fixed 2026-05-25 (november DEA-MS0) after the
  // tighter regex falsely flagged BuildAdvisor/BuildDebrief/Contextual et al.
  const literalRe = new RegExp(
    `(?:import\\s+[^;]+from\\s+['"](?:[^'"]*/)?${n}(?:\\.js)?['"])` +
      `|(?:await\\s+import\\(\\s*['"](?:[^'"]*/)?${n}(?:\\.js)?['"]\\s*\\))`,
    "m",
  );
  if (literalRe.test(content)) return true;
  // Form 3 — table-driven: a templated dynamic import (engine name supplied via
  // a variable) AND the basename as a quoted token that opens a tuple element
  // (immediately followed by a comma). The comma requirement excludes prose and
  // error-message mentions; the templated-import guard excludes files with no
  // dynamic-import table at all.
  const tableDriven = /import\(\s*`[^`]*\$\{/.test(content);
  if (tableDriven && new RegExp(`['"]${n}['"]\\s*,`).test(content)) return true;
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
  const registryFiles = await listTsFiles(path.join(MCP, "registries"));
  const orchestratorFiles = engineFiles.filter((f) => /Orchestrator/i.test(path.basename(f)));
  const hookFiles = await listTsFilesRecursive(path.join(MCP, "hooks"), new Set(["__tests__"]));
  const singletonFiles = engineFiles.filter((f) => /Singleton\.ts$/.test(f));
  console.log(
    `  dispatchers=${dispatcherFiles.length} routes=${routeFiles.length} registries=${registryFiles.length} orch=${orchestratorFiles.length} hooks=${hookFiles.length} singletons=${singletonFiles.length} engines=${engineFiles.length}`,
  );

  async function readConsumers(files) {
    return Promise.all(
      files.map(async (f) => {
        let content = "";
        try {
          content = await fs.readFile(f, "utf8");
        } catch {
          content = "";
        }
        return { rel: path.relative(MCP, f), content, engineName: path.basename(f, ".ts") };
      }),
    );
  }

  // Classify in priority order: direct dispatcher -> routes -> registries ->
  // orchestrators -> hooks -> singletons -> other engines (library-layer). The
  // WIRED-VIA-ENGINE pass is LAST (lowest priority) + self-excluded, so it only
  // catches engines consumed solely by another engine -- a correctly-wired
  // library, NOT a dormant capability. Detection reuses the pure, exported
  // engineReferencedInConsumer (static / dynamic / table-driven ACTION_MAP).
  applyConsumerClassification(engines, await readConsumers(dispatcherFiles), "WIRED-DIRECT");
  applyConsumerClassification(engines, await readConsumers(routeFiles), "WIRED-VIA-ROUTE");
  applyConsumerClassification(engines, await readConsumers(registryFiles), "WIRED-VIA-REGISTRY");
  applyConsumerClassification(engines, await readConsumers(orchestratorFiles), "WIRED-VIA-ORCH");
  applyConsumerClassification(engines, await readConsumers(hookFiles), "WIRED-VIA-HOOK");
  applyConsumerClassification(engines, await readConsumers(singletonFiles), "WIRED-VIA-SINGLETON");
  applyConsumerClassification(engines, await readConsumers(engineFiles), "WIRED-VIA-ENGINE", { excludeSelf: true });

  // Anything still unclassified is UNWIRED
  for (const [_n, info] of engines) {
    if (!info.classified) info.classified = "UNWIRED";
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
    notes: [
      "WIRE-EXEMPT engines have a `// WIRE-EXEMPT: <reason>` marker in the first 2KB.",
      "Singleton wrappers count as WIRED-VIA-SINGLETON. The wrapping engine itself must still be wired separately.",
      "WIRED-VIA-ENGINE means the engine is consumed by another engine (library-layer) -- a library dependency, NOT a dispatcher-wiring target. SINGLE-HOP: the pass does not verify the consuming engine is itself wired, so an engine consumed only by a dormant engine is still WIRED-VIA-ENGINE (the dormant ROOT stays UNWIRED, which is the actionable signal). Only UNWIRED (zero consumers of any kind) engines are candidate for wiring.",
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
