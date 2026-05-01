/**
 * JSDoc Method Enhancer — Adds JSDoc to public methods in exported classes.
 *
 * Third pass: finds public methods in exported classes that lack JSDoc,
 * then adds documentation based on the method signature.
 *
 * Usage: npx tsx scripts/jsdoc-methods.ts [directory,directory,...]
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);
const targetDir = process.argv[2] || "src/algorithms";
const rootDir = path.resolve(__dirname2, "..");

/** Convert camelCase to readable words. */
function nameToWords(name: string): string {
  return name.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
}

/** Generate description from method name. */
function describeMethod(name: string): string {
  const words = nameToWords(name);
  const prefixes: Record<string, string> = {
    calculate: "Calculates", compute: "Computes", get: "Gets", set: "Sets",
    create: "Creates", build: "Builds", validate: "Validates", parse: "Parses",
    format: "Formats", convert: "Converts", find: "Finds", resolve: "Resolves",
    normalize: "Normalizes", apply: "Applies", register: "Registers",
    init: "Initializes", load: "Loads", save: "Saves", update: "Updates",
    process: "Processes", handle: "Handles", select: "Selects",
    predict: "Predicts", estimate: "Estimates", optimize: "Optimizes",
    evaluate: "Evaluates", check: "Checks", run: "Runs", execute: "Executes",
    generate: "Generates", render: "Renders", transform: "Transforms",
    extract: "Extracts", detect: "Detects", analyze: "Analyzes",
    aggregate: "Aggregates", filter: "Filters", sort: "Sorts",
    merge: "Merges", map: "Maps", recommend: "Recommends", assess: "Assesses",
    determine: "Determines", classify: "Classifies", interpolate: "Interpolates",
    delete: "Deletes", remove: "Removes", add: "Adds", insert: "Inserts",
    append: "Appends", push: "Pushes", pop: "Pops", reset: "Resets",
    clear: "Clears", start: "Starts", stop: "Stops", enable: "Enables",
    disable: "Disables", toggle: "Toggles", dispatch: "Dispatches",
    emit: "Emits", subscribe: "Subscribes", unsubscribe: "Unsubscribes",
    listen: "Listens for", notify: "Notifies", publish: "Publishes",
    fetch: "Fetches", query: "Queries", search: "Searches", lookup: "Looks up",
    serialize: "Serializes", deserialize: "Deserializes", encode: "Encodes",
    decode: "Decodes", compress: "Compresses", decompress: "Decompresses",
    encrypt: "Encrypts", decrypt: "Decrypts", hash: "Hashes",
    verify: "Verifies", authenticate: "Authenticates", authorize: "Authorizes",
    log: "Logs", trace: "Traces", debug: "Debugs", warn: "Warns",
    error: "Reports error for", retry: "Retries", recover: "Recovers",
    rollback: "Rolls back", commit: "Commits", flush: "Flushes",
    close: "Closes", open: "Opens", connect: "Connects", disconnect: "Disconnects",
    prepare: "Prepares", configure: "Configures", setup: "Sets up",
    teardown: "Tears down", cleanup: "Cleans up", destroy: "Destroys",
    clone: "Clones", copy: "Copies", compare: "Compares", equals: "Checks equality of",
    contains: "Checks if contains", include: "Includes",
    exclude: "Excludes", match: "Matches", test: "Tests",
    accept: "Accepts", reject: "Rejects", approve: "Approves",
    deny: "Denies", grant: "Grants", revoke: "Revokes",
    allocate: "Allocates", release: "Releases", acquire: "Acquires",
    lock: "Locks", unlock: "Unlocks", sync: "Synchronizes",
    schedule: "Schedules", cancel: "Cancels", pause: "Pauses",
    resume: "Resumes", complete: "Completes", finalize: "Finalizes",
    submit: "Submits", send: "Sends", receive: "Receives",
    upload: "Uploads", download: "Downloads", import: "Imports",
    export: "Exports", backup: "Backs up", restore: "Restores",
    migrate: "Migrates", upgrade: "Upgrades", downgrade: "Downgrades",
    calibrate: "Calibrates", measure: "Measures", sample: "Samples",
    profile: "Profiles", benchmark: "Benchmarks", monitor: "Monitors",
    inspect: "Inspects", audit: "Audits", scan: "Scans", survey: "Surveys",
    score: "Scores", rank: "Ranks", rate: "Rates", weight: "Weights",
    balance: "Balances", distribute: "Distributes", partition: "Partitions",
    group: "Groups", split: "Splits", join: "Joins", concatenate: "Concatenates",
    trim: "Trims", pad: "Pads", truncate: "Truncates", wrap: "Wraps",
    unwrap: "Unwraps", flatten: "Flattens", nest: "Nests", expand: "Expands",
    collapse: "Collapses", zoom: "Zooms", pan: "Pans", rotate: "Rotates",
    scale: "Scales", translate: "Translates", mirror: "Mirrors",
    invert: "Inverts", negate: "Negates", reverse: "Reverses",
    to: "Converts to", from: "Creates from", as: "Returns as",
    with: "Returns with",
  };

  for (const [prefix, verb] of Object.entries(prefixes)) {
    if (name.startsWith(prefix) && name.length > prefix.length) {
      const rest = words.replace(new RegExp(`^${nameToWords(prefix)}\\s*`, "i"), "").toLowerCase();
      return `${verb} ${rest || words.toLowerCase()}.`;
    }
  }

  if (name.startsWith("is") || name.startsWith("has") || name.startsWith("can") ||
      name.startsWith("should") || name.startsWith("will") || name.startsWith("did"))
    return `Checks whether ${words.toLowerCase()}.`;

  if (name.startsWith("on")) return `Handler for ${words.replace(/^On\s*/, "").toLowerCase()} event.`;

  return `${words}.`;
}

/** Describe a parameter. */
function describeParam(name: string): string {
  if (name === "params" || name === "args" || name === "options" || name === "config") return "configuration options";
  if (name === "input" || name === "data") return "input data";
  if (name === "ctx" || name === "context") return "execution context";
  if (name === "callback" || name === "cb" || name === "fn") return "callback function";
  if (name === "key" || name === "name" || name === "id") return `${name} identifier`;
  if (name === "value" || name === "val") return "value to set";
  if (name === "index" || name === "idx" || name === "i") return "index position";
  if (name === "count" || name === "n" || name === "num") return "number of items";
  if (name === "timeout" || name === "delay") return "timeout in milliseconds";
  if (name === "path" || name === "filePath") return "file path";
  if (name === "url" || name === "uri") return "resource URL";
  if (name === "query" || name === "search") return "search query";
  if (name === "filter") return "filter criteria";
  if (name === "limit") return "maximum number of results";
  if (name === "offset") return "pagination offset";
  if (name === "page") return "page number";
  if (name === "sort") return "sort order";
  if (name === "format") return "output format";
  if (name === "type") return "type identifier";
  if (name === "mode") return "operation mode";
  if (name === "level") return "depth or severity level";
  if (name === "depth") return "recursion or nesting depth";
  return nameToWords(name).toLowerCase();
}

interface MethodInfo {
  line: number;       // 0-based line of method declaration
  name: string;
  params: string[];   // parameter names
  isAsync: boolean;
  returnType: string;
}

function processFile(filePath: string): number {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Find public methods in classes that lack JSDoc
  // Pattern: method declarations (not private/# prefix) without preceding JSDoc
  const methodPattern = /^(\s+)(async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*(\S+.*))?{?\s*$/;
  const privatePattern = /^\s+(private|protected|#)/;
  const jsDocEndPattern = /\*\/\s*$/;

  const insertions: Array<{ lineIdx: number; jsdoc: string }> = [];
  let inClass = false;
  let classIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track class boundaries
    if (trimmed.match(/^export\s+class\s+/)) {
      inClass = true;
      classIndent = (line.match(/^(\s*)/)?.[1] || "").length;
      continue;
    }
    if (inClass && trimmed === "}" && (line.match(/^(\s*)/)?.[1] || "").length <= classIndent) {
      inClass = false;
      continue;
    }

    if (!inClass) continue;

    // Skip private/protected methods
    if (privatePattern.test(line)) continue;

    // Skip constructor, getters, setters, static
    if (trimmed.startsWith("constructor") || trimmed.startsWith("get ") ||
        trimmed.startsWith("set ") || trimmed.startsWith("static ") ||
        trimmed.startsWith("readonly ") || trimmed.startsWith("//") ||
        trimmed.startsWith("/*") || trimmed.startsWith("*") ||
        trimmed === "" || trimmed === "{" || trimmed === "}") continue;

    // Skip property declarations (no parentheses)
    if (!trimmed.includes("(")) continue;

    const match = line.match(methodPattern);
    if (!match) continue;

    const [, indent, asyncKw, methodName, paramsStr, returnType] = match;

    // Skip if already has JSDoc above
    const prevLine = (lines[i - 1] || "").trim();
    const prevPrevLine = (lines[i - 2] || "").trim();
    if (prevLine.endsWith("*/") || prevPrevLine.endsWith("*/") || prevLine.startsWith("*/")) continue;

    // Check 5 lines above for JSDoc
    let hasDoc = false;
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const check = lines[j].trim();
      if (check.endsWith("*/") || check.includes("/**")) { hasDoc = true; break; }
      if (check !== "" && !check.startsWith("*") && !check.startsWith("@")) break;
    }
    if (hasDoc) continue;

    // Parse params
    const params = paramsStr.split(",")
      .map(p => p.trim().split(/[:\s=]/)[0].replace(/\?$/, ""))
      .filter(p => p && p !== "");

    // Build JSDoc
    const desc = describeMethod(methodName);
    const jsdocLines = [`${indent}/** ${desc}`];

    for (const param of params) {
      if (param === "...args" || param === "...rest") {
        jsdocLines.push(`${indent} * @param ${param.replace("...", "")} - additional arguments`);
      } else {
        jsdocLines.push(`${indent} * @param ${param} - ${describeParam(param)}`);
      }
    }

    const ret = returnType?.trim().replace(/\s*{?\s*$/, "") || "void";
    if (ret === "void" || ret === "Promise<void>") {
      jsdocLines.push(`${indent} * @returns void`);
    } else if (ret === "boolean" || ret === "Promise<boolean>") {
      jsdocLines.push(`${indent} * @returns true if condition is met`);
    } else if (ret === "number" || ret === "Promise<number>") {
      jsdocLines.push(`${indent} * @returns computed numeric result`);
    } else if (ret === "string" || ret === "Promise<string>") {
      jsdocLines.push(`${indent} * @returns formatted string result`);
    } else {
      jsdocLines.push(`${indent} * @returns ${nameToWords(ret.replace(/Promise<(.*)>/, "$1")).toLowerCase()}`);
    }

    jsdocLines.push(`${indent} */`);
    insertions.push({ lineIdx: i, jsdoc: jsdocLines.join("\n") });
  }

  if (insertions.length === 0) return 0;

  // Insert in reverse
  for (let k = insertions.length - 1; k >= 0; k--) {
    lines.splice(insertions[k].lineIdx, 0, insertions[k].jsdoc);
  }

  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  return insertions.length;
}

function main() {
  const dirs = targetDir.split(",").map(d => path.resolve(rootDir, d.trim()));
  let totalAdded = 0;
  let totalFiles = 0;

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) { console.error(`Not found: ${dir}`); continue; }

    const files = fs.readdirSync(dir).filter(
      f => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".spec.ts") && f !== "index.ts"
    );

    for (const file of files) {
      try {
        const added = processFile(path.join(dir, file));
        if (added > 0) {
          console.log(`  ${file}: +${added} method JSDoc`);
          totalAdded += added;
        }
        totalFiles++;
      } catch (err: any) {
        console.error(`  ERROR ${file}: ${err.message}`);
      }
    }
  }

  console.log(`\nDONE: ${totalAdded} method JSDoc blocks added, ${totalFiles} files processed`);
}

main();
