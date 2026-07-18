/**
 * fe-route-action-contract.mjs -- static FE-route to dispatcher-action contract verifier.
 *
 * U-FE-ROUTE-ACTION-CONTRACT (slot:sierra, SIERRA-BACKEND). Closes the silent-failure
 * class that bit the specialty mount (d9b533d27): a REST router calls
 * callTool("prism_X", "action", ...) for an `action` name that does NOT exist on the
 * `prism_X` dispatcher. The dispatcher's z.enum(ACTIONS) rejects it, so callTool returns
 * { error } with HTTP 200 -- a body the SPA's `if (!res.ok)` cannot detect (silent footgun).
 *
 * This module statically reconciles every callTool(tool, action) in mcp-server/src/routes/
 * against the action set each prism_* dispatcher actually accepts. It is fleet-wide: it
 * audits ALL route files = ALL galaxy FE surfaces, not one router.
 *
 * Resolution model (conservative -- favors NO false alarms over catching every edge):
 *   An action is RESOLVABLE on a dispatcher if it appears in that dispatcher file as ANY of
 *   (a) a z.enum(CONST) / inline z.enum([...]) entry, (b) a `case "...":` switch label, or
 *   (c) a member of any `const *_ACTIONS = [...]` array. The footgun actions (grinding_calculate,
 *   sheet_metal_calculate, ...) appear in NONE of these, so the union still catches them while
 *   not crying wolf on a working route. Each resolution records WHICH source matched.
 *
 * Severity:
 *   - P0  : a MOUNTED router calls a literal action that resolves NOWHERE in its dispatcher.
 *   - INFO: an UNMOUNTED router with the same problem (not live yet -- deferred/expected).
 *   - UNVERIFIABLE: the target dispatcher could not be parsed (registers via a non-server.tool
 *     path, e.g. aiReasoningDispatcher) -- reported honestly, NEVER counted as broken (R12).
 *   - DYNAMIC: the action argument is not a string literal (a variable/template) -- unverifiable
 *     statically; reported, not flagged broken.
 *
 * Pure + importable. CLI lives in scripts/audit-fe-route-action-contract.mjs.
 */
import fs from "node:fs";
import path from "node:path";

/**
 * Strip `//` line comments and block comments so commented-out callTool(...) /
 * commented dispatcher actions never produce phantom matches. URL-safe: a `//`
 * preceded by `:` (as in `http://`) is NOT treated as a comment start.
 * @param {string} src
 * @returns {string}
 */
export function stripComments(src) {
  // Single-pass char scanner with {string, line-comment, block-comment} state. A regex that strips
  // block comments BEFORE line comments (the prior impl) mis-reads a `/*` that lives INSIDE a `//`
  // line comment -- e.g. `import x from "./x.js"; // mounts /shop/*` -- as a block-comment OPENER and
  // deletes everything to the next `*/` (here ~60 router import lines), which silently collapsed
  // mountedRouterFiles() to 17 of ~76 mounted routers -> P0s on the hidden routers were mis-graded
  // INFO. State tracking is the correct fix: a comment marker inside a string or another comment is
  // inert. Newlines are preserved (mountedRouterFiles splits the result on "\n").
  let out = "";
  const n = src.length;
  let i = 0;
  let inStr = null; // active string/template quote char, or null
  while (i < n) {
    const ch = src[i];
    if (inStr) {
      out += ch;
      if (ch === "\\" && i + 1 < n) { out += src[i + 1]; i += 2; continue; } // escaped char in string
      if (ch === inStr) inStr = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; out += ch; i++; continue; }
    if (ch === "/" && src[i + 1] === "/") { // line comment -> drop to (not incl.) the newline
      i += 2;
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") { // block comment -> drop to */, keep inner newlines
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") out += "\n";
        i++;
      }
      i += 2; // consume the closing */
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/** All prism_* tool names a dispatcher file registers via server.tool("prism_x", ...). */
export function extractToolNames(src) {
  const out = new Set();
  for (const m of src.matchAll(/server\.tool\(\s*["'](prism_[a-z0-9_]+)["']/gi)) out.add(m[1]);
  return [...out];
}

/**
 * String literals inside the first `[...]` array assigned to a const, accepting both
 * `const NAME = [ ... ]` and `const NAME = new Set([ ... ])` (several dispatchers, e.g.
 * safetyDispatcher, declare their action groups as `new Set([...])` and spread them into
 * the z.enum array). The `[...]` bracket-walker is identical once positioned at the `[`.
 */
function arrayLiteralEntries(src, constName) {
  const m = src.match(new RegExp(`const\\s+${constName}\\s*=\\s*(?:new\\s+Set\\s*\\(\\s*)?\\[`));
  if (!m) return null;
  const start = m.index + m[0].length - 1; // at the '['
  let depth = 0;
  let end = -1;
  for (let i = start; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end < 0) return null;
  const body = src.slice(start + 1, end);
  const entries = [];
  for (const s of body.matchAll(/["']([a-zA-Z0-9_\-.]+)["']/g)) entries.push(s[1]);
  // spreads: ...OTHER_CONST  -> resolve recursively
  for (const sp of body.matchAll(/\.\.\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    const nested = arrayLiteralEntries(src, sp[1]);
    if (nested) entries.push(...nested);
  }
  return entries;
}

/**
 * Top-level keys of an object literal `const|let|var <mapName> [: Type] = { ... }`.
 * Resolves dispatchers whose action set is `Object.keys(ACTION_MAP)` -- a computed list
 * the array/enum/case extractors cannot see (fluidThermalDispatcher, mechanicalDesignDispatcher
 * both validate via `if (!ACTION_MAP[action])`, so ACTION_MAP's keys ARE the action set).
 *
 * Char-accurate depth walk so nested array/object VALUES never leak their inner keys:
 * a key is recorded only at object-depth 1 (directly inside the map's braces). Handles
 * unquoted + quoted keys, skips computed `[expr]:` keys, resolves `...OTHER` spreads
 * recursively (with a cycle guard). Returns string[] of keys, or null if no static map
 * literal named <mapName> exists. Pure.
 * @param {string} src  comment-stripped source
 * @param {string} mapName
 * @param {Set<string>} [_seen] cycle guard for recursive spreads
 * @returns {string[] | null}
 */
export function objectLiteralKeys(src, mapName, _seen = new Set()) {
  if (_seen.has(mapName)) return [];
  _seen.add(mapName);
  // `[^=]*` allows a `: Type` annotation between the name and the `=` assignment.
  const m = src.match(new RegExp(`(?:export\\s+)?(?:const|let|var)\\s+${mapName}\\b[^=]*=\\s*\\{`));
  if (!m) return null;
  const open = m.index + m[0].length - 1; // index of the map's opening '{'
  const keys = [];
  let depth = 0;
  let inStr = null;       // active string-quote char, or null
  let expectKey = false;  // next non-ws token at depth 1 starts a property key
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === inStr && src[i - 1] !== "\\") inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      if (depth === 1 && expectKey) { // quoted key
        let j = i + 1, k = "";
        while (j < src.length && !(src[j] === ch && src[j - 1] !== "\\")) { k += src[j]; j++; }
        let t = j + 1;
        while (t < src.length && /\s/.test(src[t])) t++;
        if (src[t] === ":") keys.push(k);
        expectKey = false;
        i = j; // resume past the closing quote
        continue;
      }
      inStr = ch;
      continue;
    }
    if (ch === "{" || ch === "[" || ch === "(") {
      depth++;
      if (ch === "{" && depth === 1) expectKey = true; // just entered the map object
      continue;
    }
    if (ch === "}" || ch === "]" || ch === ")") {
      depth--;
      if (depth === 0) break; // closed the map object
      continue;
    }
    if (depth === 1) {
      if (ch === ",") { expectKey = true; continue; }
      if (expectKey && !/\s/.test(ch)) {
        if (ch === "." && src.slice(i, i + 3) === "...") { // spread ...OTHER -> resolve recursively
          let j = i + 3, name = "";
          while (j < src.length && /[\w$]/.test(src[j])) { name += src[j]; j++; }
          if (name) {
            const nested = objectLiteralKeys(src, name, _seen);
            if (nested) keys.push(...nested);
          }
          expectKey = false;
          i = j - 1;
          continue;
        }
        if (/[A-Za-z_$]/.test(ch)) { // unquoted identifier key
          let j = i, k = "";
          while (j < src.length && /[\w$]/.test(src[j])) { k += src[j]; j++; }
          let t = j;
          while (t < src.length && /\s/.test(src[t])) t++;
          if (src[t] === ":") keys.push(k);
          expectKey = false;
          i = j - 1;
          continue;
        }
        expectKey = false; // computed [expr] key or other -> skip
      }
    }
  }
  return keys;
}

/** Inline z.enum([ "a", "b" ]) literal entries anywhere in the source. */
function inlineEnumEntries(src) {
  const out = [];
  for (const m of src.matchAll(/z\.enum\(\s*\[([^\]]*)\]/g)) {
    for (const s of m[1].matchAll(/["']([a-zA-Z0-9_\-.]+)["']/g)) out.push(s[1]);
  }
  return out;
}

/** `case "action":` switch labels. */
export function extractCaseLabels(src) {
  const out = [];
  for (const m of src.matchAll(/case\s+["']([a-zA-Z0-9_\-.]+)["']\s*:/g)) out.push(m[1]);
  return out;
}

/**
 * Resolvable action set for a single dispatcher source: union of every
 * z.enum(CONST)/inline-enum entry, every `case` label, and every
 * `const *_ACTIONS = [...]` member. Returns { actions:Set, sources:Map<action,Set<src>> }.
 */
export function dispatcherActions(src) {
  const actions = new Set();
  const sources = new Map();
  const add = (a, source) => {
    actions.add(a);
    if (!sources.has(a)) sources.set(a, new Set());
    sources.get(a).add(source);
  };

  // z.enum(CONST) -> resolve the named const's array
  const seenConst = new Set();
  for (const m of src.matchAll(/z\.enum\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)) {
    const name = m[1];
    if (seenConst.has(name)) continue;
    seenConst.add(name);
    const entries = arrayLiteralEntries(src, name);
    if (entries) entries.forEach((a) => add(a, "enum"));
  }
  // inline z.enum([...])
  inlineEnumEntries(src).forEach((a) => add(a, "enum"));
  // case labels
  extractCaseLabels(src).forEach((a) => add(a, "case"));
  // any const *_ACTIONS = [...]
  const seenArr = new Set();
  for (const m of src.matchAll(/const\s+([A-Za-z_][A-Za-z0-9_]*ACTIONS[A-Za-z0-9_]*)\s*=\s*\[/g)) {
    const name = m[1];
    if (seenArr.has(name)) continue;
    seenArr.add(name);
    const entries = arrayLiteralEntries(src, name);
    if (entries) entries.forEach((a) => add(a, "array"));
  }
  // const <ACTIONS-named> = Object.keys(<MAP>)  -> the MAP's top-level keys ARE the actions.
  // Several dispatchers (fluidThermal, mechanicalDesign) validate via `if (!ACTION_MAP[action])`
  // and derive their action list as `Object.keys(ACTION_MAP)` -- invisible to the array/enum/case
  // extractors. Two guards keep this from OVER-extracting (the direction that would MASK a real P0):
  //   (a) the const name must be anchored `ACTIONS` / `*_ACTIONS` (NOT a loose "action" substring),
  //       so e.g. `baselineActionKeys` never qualifies;
  //   (b) `(?!\s*\.)` rejects a CHAINED `Object.keys(x).length` / `.find(...)` -- only a TERMINAL
  //       `Object.keys(MAP)` (assigned directly as the action list) counts.
  // Both guards fail-safe toward UNDER-extraction (a false-positive cry-wolf), never a masked P0.
  const seenMap = new Set();
  for (const m of src.matchAll(/const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*Object\.keys\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)(?!\s*\.)/g)) {
    const [, constName, mapName] = m;
    if (!/(?:^|_)ACTIONS$/i.test(constName)) continue;
    if (seenMap.has(mapName)) continue;
    seenMap.add(mapName);
    const keys = objectLiteralKeys(src, mapName);
    if (keys) keys.forEach((a) => add(a, "objectmap"));
  }
  return { actions, sources };
}

/**
 * Build a map toolName -> { actions:Set, file } over a dispatcher directory.
 * A dispatcher file that registers a prism_* tool but yields ZERO resolvable
 * actions is tracked in `unparsable` so its routes are reported UNVERIFIABLE, not broken.
 */
export function buildDispatcherMap(dispatchersDir) {
  const map = new Map();      // tool -> { actions:Set, file, sources:Map }
  const unparsable = new Set(); // tool names registered but no actions extractable
  const files = fs.readdirSync(dispatchersDir).filter((f) => f.endsWith(".ts"));
  for (const f of files) {
    const raw = fs.readFileSync(path.join(dispatchersDir, f), "utf8");
    const src = stripComments(raw);
    const tools = extractToolNames(src);
    if (tools.length === 0) continue;
    const { actions, sources } = dispatcherActions(src);
    for (const tool of tools) {
      const prev = map.get(tool);
      if (prev) {
        actions.forEach((a) => prev.actions.add(a));
        sources.forEach((set, a) => {
          if (!prev.sources.has(a)) prev.sources.set(a, new Set());
          set.forEach((s) => prev.sources.get(a).add(s));
        });
      } else {
        map.set(tool, { actions: new Set(actions), file: f, sources: new Map(sources) });
      }
      if (actions.size === 0) unparsable.add(tool);
    }
  }
  // A tool is only truly unparsable if NO file contributed any action for it.
  for (const tool of [...unparsable]) {
    if ((map.get(tool)?.actions.size ?? 0) > 0) unparsable.delete(tool);
  }
  return { map, unparsable };
}

/**
 * Every callTool("prism_x", "action" | <expr>, ...) in a routes directory.
 * Literal-action calls carry dynamic:false; non-literal first/second args carry dynamic:true.
 */
export function extractRouteCalls(routesDir) {
  const calls = [];
  const files = fs.readdirSync(routesDir).filter((f) => f.endsWith(".ts"));
  for (const f of files) {
    const raw = fs.readFileSync(path.join(routesDir, f), "utf8");
    const src = stripComments(raw);
    // tool literal + action literal
    for (const m of src.matchAll(/callTool\(\s*["'](prism_[a-z0-9_]+)["']\s*,\s*["']([a-zA-Z0-9_\-.]+)["']/gi)) {
      calls.push({ file: f, tool: m[1], action: m[2], dynamic: false });
    }
    // tool literal + non-literal action (the 2nd-arg first char excludes a quote/space/paren,
    // so this matches ONLY when the action is a variable/template -- never a string literal).
    for (const m of src.matchAll(/callTool\(\s*["'](prism_[a-z0-9_]+)["']\s*,\s*([^"'\s)][^,)]*)/gi)) {
      calls.push({ file: f, tool: m[1], action: null, dynamic: true, expr: m[2].trim().slice(0, 40) });
    }
  }
  return calls;
}

/**
 * Set of route-file basenames (e.g. "specialty") that are actually MOUNTED, derived from
 * index.ts: a create*Router imported `from "./<basename>.js"` AND referenced on an
 * app.use(...) line. Requires explicit app.use evidence so an unused import is NOT "mounted".
 */
export function mountedRouterFiles(indexPath) {
  const src = stripComments(fs.readFileSync(indexPath, "utf8"));
  const createToFile = new Map(); // createFn -> basename
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']\.\/([A-Za-z0-9_\-./]+?)\.js["']/g)) {
    for (const n of m[1].split(",").map((s) => s.trim())) {
      if (/^create\w*Router$/.test(n)) createToFile.set(n, path.basename(m[2]));
    }
  }
  const mounted = new Set();
  for (const line of src.split("\n")) {
    if (!line.includes("app.use(")) continue;
    for (const [fn, base] of createToFile) {
      if (new RegExp(`\\b${fn}\\s*\\(`).test(line)) mounted.add(base);
    }
  }
  return { mounted, createToFile };
}

/**
 * Full contract audit.
 * @param {{routesDir:string, dispatchersDir:string, indexPath:string}} opts
 * @returns {{ findings:Array, summary:object }}
 */
export function auditContract({ routesDir, dispatchersDir, indexPath }) {
  const { map, unparsable } = buildDispatcherMap(dispatchersDir);
  const calls = extractRouteCalls(routesDir);
  const { mounted } = mountedRouterFiles(indexPath);

  const findings = [];
  let pairs = 0, dynamic = 0, resolved = 0, p0 = 0, info = 0, unverifiable = 0, unknownDisp = 0;

  for (const c of calls) {
    const fileBase = c.file.replace(/\.ts$/, "");
    const isMounted = mounted.has(fileBase);
    if (c.dynamic) {
      dynamic++;
      findings.push({ ...c, severity: "DYNAMIC", mounted: isMounted, reason: `non-literal action (${c.expr ?? "expr"})` });
      continue;
    }
    pairs++;
    const disp = map.get(c.tool);
    if (!disp) {
      unknownDisp++;
      findings.push({ ...c, severity: isMounted ? "P0" : "INFO", mounted: isMounted, reason: `no dispatcher registers tool '${c.tool}'` });
      if (isMounted) p0++; else info++;
      continue;
    }
    if (unparsable.has(c.tool)) {
      unverifiable++;
      findings.push({ ...c, severity: "UNVERIFIABLE", mounted: isMounted, reason: `dispatcher '${c.tool}' has no statically-parseable action set` });
      continue;
    }
    if (disp.actions.has(c.action)) {
      resolved++;
      continue;
    }
    findings.push({ ...c, severity: isMounted ? "P0" : "INFO", mounted: isMounted, reason: `action '${c.action}' not in dispatcher '${c.tool}' (${disp.actions.size} actions)` });
    if (isMounted) p0++; else info++;
  }

  return {
    findings,
    summary: {
      routeFiles: new Set(calls.map((c) => c.file)).size,
      dispatchers: map.size,
      unparsableDispatchers: [...unparsable],
      literalPairs: pairs,
      resolved,
      dynamic,
      p0Mounted: p0,
      infoUnmounted: info,
      unverifiable,
      unknownDispatcherCalls: unknownDisp,
      clean: p0 === 0,
    },
  };
}
