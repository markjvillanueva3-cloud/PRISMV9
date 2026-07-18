#!/usr/bin/env node
/**
 * call-engine.mjs — server-free PRISM engine invoker
 * ===================================================
 * Calls any PRISM engine method directly, WITHOUT the MCP server (:3100).
 *
 * The MCP `prism_*` dispatchers are thin Zod-validate → `engine.method(params)`
 * routers over plain singletons in `mcp-server/src/engines/*.ts`. This harness
 * replicates that call path for code/CLI work when the server is down or when
 * you want zero-daemon access. It imports the engine's TS source directly via
 * `tsx` (no dist bundle needed) and invokes the target.
 *
 * It does NOT replicate dispatcher-side param normalization (snake_case→camelCase,
 * unit coercion) — pass params in the shape the engine method expects. For
 * physics/safety work prefer the real dispatcher when the server is up; this is
 * the documented fallback (CLAUDE.md "run lean" / direct-engine-invocation).
 *
 * USAGE
 *   node scripts/call-engine.mjs <module> <export.method> '<json-params>'
 *   node scripts/call-engine.mjs --list <module>            # list exports
 *   node scripts/call-engine.mjs --methods <module> <export> # list methods on a singleton
 *
 *   <module>        path under mcp-server/src (with or without .ts), OR a bare
 *                   engine name resolved against mcp-server/src/engines/.
 *   <export.method> dotted: singleton-or-namespace export + method.
 *                   A single token (no dot) = a named-export FUNCTION called directly.
 *
 * EXAMPLES
 *   node scripts/call-engine.mjs utils/validators validateKienzle '[1800,0.25,"P"]'
 *   node scripts/call-engine.mjs PRISMSelfAwarenessEngine prismSelfAwarenessEngine.searchTribalKnowledge '["thin wall"]'
 *   node scripts/call-engine.mjs --list utils/validators
 *
 * PARAMS JSON:
 *   - a JSON array  → spread as positional args:  fn(a, b, c)
 *   - any other JSON (object/number/string) → single arg:  fn(value)
 *   - omitted        → fn()
 *
 * Run THROUGH tsx so TS sources + their deps resolve:
 *   npx --prefix H:/prism/mcp-server tsx scripts/call-engine.mjs ...
 * The wrapper `scripts/call-engine.cmd` / `.sh` does this for you.
 *
 * Exit codes: 0 ok · 2 usage error · 3 module not found · 4 export/method not found · 5 invocation threw.
 */
import { pathToFileURL } from "node:url";
import { existsSync, readdirSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";

const MCP_SRC = "H:/prism/mcp-server/src";
const ENGINES_DIR = `${MCP_SRC}/engines`;

function die(code, msg) {
  process.stderr.write(`call-engine: ${msg}\n`);
  process.exit(code);
}

/** Resolve a user-supplied module token to an absolute .ts path. Fail loud. */
function resolveModule(token) {
  if (!token) die(2, "missing <module>. See header for usage.");
  const candidates = [];
  const stripped = token.replace(/\.(ts|js|mjs)$/i, "");
  if (isAbsolute(token) || token.startsWith(".") || token.includes("/")) {
    candidates.push(resolve(MCP_SRC, `${stripped}.ts`));
    candidates.push(resolve(MCP_SRC, stripped, "index.ts"));
  }
  // bare name → engines dir (and as-given camelCase)
  candidates.push(resolve(ENGINES_DIR, `${stripped}.ts`));
  for (const c of candidates) if (existsSync(c)) return c;
  // last resort: case-insensitive scan of engines dir
  try {
    const lower = `${stripped.toLowerCase()}.ts`;
    const hit = readdirSync(ENGINES_DIR).find((f) => f.toLowerCase() === lower);
    if (hit) return resolve(ENGINES_DIR, hit);
  } catch { /* dir read best-effort */ }
  die(
    3,
    `module not found: '${token}'. Tried:\n  ${candidates.join("\n  ")}\n` +
      `Give a path under mcp-server/src (e.g. utils/validators) or a bare engine name.`
  );
}

function listMethods(obj) {
  const out = new Set();
  for (let o = obj; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) {
    for (const k of Object.getOwnPropertyNames(o)) {
      if (k === "constructor") continue;
      if (typeof obj[k] === "function") out.add(k);
    }
  }
  return [...out].sort();
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    process.stdout.write(
      "usage: call-engine <module> <export.method> '<json-params>'\n" +
        "       call-engine --list <module>\n" +
        "       call-engine --methods <module> <export>\n"
    );
    process.exit(argv.length === 0 ? 2 : 0);
  }

  // --list <module>
  if (argv[0] === "--list") {
    const file = resolveModule(argv[1]);
    const mod = await import(pathToFileURL(file).href);
    const exports = Object.keys(mod);
    process.stdout.write(JSON.stringify({ module: file, exports }, null, 2) + "\n");
    return;
  }

  // --methods <module> <export>
  if (argv[0] === "--methods") {
    const file = resolveModule(argv[1]);
    const mod = await import(pathToFileURL(file).href);
    const target = mod[argv[2]] ?? mod.default;
    if (target == null) die(4, `export '${argv[2]}' not found in ${file}. Have: ${Object.keys(mod).join(", ")}`);
    process.stdout.write(
      JSON.stringify({ export: argv[2], methods: listMethods(target) }, null, 2) + "\n"
    );
    return;
  }

  const [moduleToken, exportPath, rawParams] = argv;
  if (!exportPath) die(2, "missing <export.method>. Use --list to see exports.");

  const file = resolveModule(moduleToken);
  let mod;
  try {
    mod = await import(pathToFileURL(file).href);
  } catch (e) {
    die(3, `failed to import ${file}: ${e?.message ?? e}`);
  }

  // Resolve the callable. Two shapes:
  //   "singleton.method" → mod.singleton.method  (bound to singleton)
  //   "fnName"           → mod.fnName  (named-export function, no receiver)
  let receiver = null;
  let fn = null;
  let label = exportPath;
  if (exportPath.includes(".")) {
    const [exp, method] = exportPath.split(".");
    receiver = mod[exp] ?? (exp === "default" ? mod.default : undefined);
    if (receiver == null)
      die(4, `export '${exp}' not found in ${file}. Have: ${Object.keys(mod).join(", ")}`);
    fn = receiver[method];
    if (typeof fn !== "function")
      die(4, `'${exp}.${method}' is not a function. Methods: ${listMethods(receiver).join(", ")}`);
  } else {
    fn = mod[exportPath] ?? (exportPath === "default" ? mod.default : undefined);
    if (typeof fn !== "function")
      die(4, `named export '${exportPath}' is not a function. Exports: ${Object.keys(mod).join(", ")}`);
  }

  // Parse params: JSON array → spread positional; else → single arg; absent → none.
  let args = [];
  if (rawParams != null && rawParams !== "") {
    let parsed;
    try {
      parsed = JSON.parse(rawParams);
    } catch (e) {
      die(2, `params is not valid JSON: ${e?.message ?? e}\n  got: ${rawParams}`);
    }
    args = Array.isArray(parsed) ? parsed : [parsed];
  }

  let result;
  try {
    result = receiver ? await fn.apply(receiver, args) : await fn(...args);
  } catch (e) {
    die(5, `${label}(...) threw: ${e?.stack ?? e?.message ?? e}`);
  }

  // Emit JSON when serializable, else a String() fallback (fail loud about which).
  try {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch {
    process.stdout.write(`[non-JSON result] ${String(result)}\n`);
  }
}

main().catch((e) => die(5, e?.stack ?? e?.message ?? String(e)));
