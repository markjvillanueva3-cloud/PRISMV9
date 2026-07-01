/**
 * Tests for fe-route-action-contract.mjs (U-FE-ROUTE-ACTION-CONTRACT, slot:sierra).
 *
 * Two layers:
 *   1. Pure-function unit tests on controlled string fixtures (stable, no fs/peers).
 *   2. A controlled end-to-end over a temp routes/dispatchers tree -- exercises the
 *      full P0/INFO/DYNAMIC/UNVERIFIABLE/resolved classification deterministically.
 *   3. A LIVE false-negative guard: the parser MUST resolve known-real, never-renamed
 *      actions on the real dispatchers (prism_auth:login, prism_auth:refresh_token,
 *      prism_grinding:wheel_select). This proves no parser-side false positives without
 *      coupling to peers' in-flight route fixes (so it does NOT assert a live P0 count).
 *
 * Run: node scripts/lib/fe-route-action-contract.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  stripComments,
  extractToolNames,
  extractCaseLabels,
  dispatcherActions,
  objectLiteralKeys,
  buildDispatcherMap,
  extractRouteCalls,
  mountedRouterFiles,
  auditContract,
} from "./fe-route-action-contract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
// 1. Pure-function unit tests
// ---------------------------------------------------------------------------

test("stripComments removes // and block comments but preserves http://", () => {
  const src = `const u = "http://example.com"; // trailing comment\n/* block */ const x = 1;`;
  const out = stripComments(src);
  assert.ok(out.includes('"http://example.com"'), "URL inside string must survive");
  assert.ok(!out.includes("trailing comment"), "line comment stripped");
  assert.ok(!out.includes("block"), "block comment stripped");
  assert.ok(out.includes("const x = 1"), "code after block comment survives");
});

test("stripComments: a `/*` INSIDE a `//` line comment is inert (does NOT open a block comment)", () => {
  // The exact bug that hid 59 mounted routers: routes/index.ts had
  //   `import x from "./x.js"; // mounts /shop/*`  -- a block-before-line regex misread the `/*`
  // inside the `//` comment as a block-comment OPENER and deleted everything to the next `*/`
  // (the following ~60 import lines). State-tracked stripping keeps the real code after it intact.
  const src = [
    `import a from "./a.js"; // mounts /shop/*`,
    `import b from "./b.js";`,
    `import c from "./c.js";`,
    `app.use("/x", createBRouter());`,
  ].join("\n");
  const out = stripComments(src);
  assert.ok(out.includes("./a.js"), "the line-commented import line's CODE survives");
  assert.ok(!out.includes("mounts /shop"), "the line comment itself is stripped");
  assert.ok(out.includes("./b.js"), "the NEXT import line is NOT eaten (the regression)");
  assert.ok(out.includes("./c.js"), "and the line after that survives too");
  assert.ok(out.includes("createBRouter"), "downstream app.use survives");
  assert.equal(out.split("\n").length, 4, "newline count preserved (mountedRouterFiles splits on newline)");
});

test("stripComments: a `//` inside a block comment is inert + block-comment markers in a string survive", () => {
  const src = `const s = "a /* not a comment */ b"; /* real\n // still block\n */ const y = 2;`;
  const out = stripComments(src);
  assert.ok(out.includes('"a /* not a comment */ b"'), "comment markers INSIDE a string are preserved verbatim");
  assert.ok(!out.includes("real"), "real block comment stripped");
  assert.ok(!out.includes("still block"), "a // inside the block comment does not terminate it early");
  assert.ok(out.includes("const y = 2"), "code after the multi-line block comment survives");
});

test("LIVE: mountedRouterFiles recovers the full mounted set (regression: was 17, must be many)", () => {
  const indexPath = path.join(REPO, "mcp-server/src/routes/index.ts");
  if (!fs.existsSync(indexPath)) return; // skip outside repo
  const { mounted } = mountedRouterFiles(indexPath);
  // The comment bug collapsed this to 17; the real mounted set is ~75. Assert well above the bug ceiling
  // AND that specific routers the comment bug hid are now visible.
  assert.ok(mounted.size > 40, `expected the full mounted set (~75), got ${mounted.size} -- comment bug regressed?`);
  for (const base of ["erp", "milling", "manus", "orchestration", "pipeline", "vibration", "cncOps"]) {
    assert.ok(mounted.has(base), `router '${base}' must be detected as mounted (was hidden by the comment bug)`);
  }
});

test("extractToolNames finds every server.tool('prism_x')", () => {
  const src = `server.tool("prism_foo", "d", {}); server.tool('prism_bar', 'd', {});`;
  assert.deepEqual(extractToolNames(src).sort(), ["prism_bar", "prism_foo"]);
});

test("extractCaseLabels finds switch case strings", () => {
  const src = `switch(a){ case "alpha": break; case 'beta': break; }`;
  assert.deepEqual(extractCaseLabels(src).sort(), ["alpha", "beta"]);
});

test("dispatcherActions resolves z.enum(CONST) literal array", () => {
  const src = `const ACTIONS = ["alpha", "beta"] as const;\n{ action: z.enum(ACTIONS) }`;
  const { actions } = dispatcherActions(src);
  assert.ok(actions.has("alpha") && actions.has("beta"));
  assert.equal(actions.size, 2);
});

test("dispatcherActions resolves spreads in the ACTIONS array", () => {
  const src = `const A = ["x"]; const B = ["y"]; const ACTIONS = [...A, ...B, "z"] as const; z.enum(ACTIONS)`;
  const { actions } = dispatcherActions(src);
  assert.deepEqual([...actions].sort(), ["x", "y", "z"]);
});

test("dispatcherActions resolves `const X_ACTIONS = new Set([...])` (safetyDispatcher pattern)", () => {
  // safetyDispatcher declares action groups as new Set([...]) and spreads them; the parser
  // must read the Set's literals or prism_safety silently degrades to UNVERIFIABLE.
  const src = `const COLLISION_ACTIONS = new Set([\n "check_toolpath_collision", "validate_rapid_moves",\n]);\nconst ALL = [...COLLISION_ACTIONS, "extra"] as const;\nz.enum(ALL)`;
  const { actions } = dispatcherActions(src);
  assert.ok(actions.has("check_toolpath_collision"), "Set member resolved");
  assert.ok(actions.has("validate_rapid_moves"), "second Set member resolved");
  assert.ok(actions.has("extra"), "spread + literal both resolved");
});

test("dispatcherActions resolves inline z.enum([...]) and case labels and *_ACTIONS arrays", () => {
  const src = `z.enum(["inl1","inl2"]); case "cs1": const FOO_ACTIONS = ["arr1"];`;
  const { actions, sources } = dispatcherActions(src);
  assert.ok(actions.has("inl1") && actions.has("inl2"), "inline enum");
  assert.ok(actions.has("cs1"), "case label");
  assert.ok(actions.has("arr1"), "_ACTIONS array");
  assert.ok(sources.get("inl1").has("enum"));
  assert.ok(sources.get("cs1").has("case"));
  assert.ok(sources.get("arr1").has("array"));
});

test("objectLiteralKeys extracts top-level keys, never leaking nested array/object values", () => {
  // The fluidThermal/mechanical ACTION_MAP shape: key -> [Engine, engine, method] (array value).
  const src = `const ACTION_MAP: Record<string,[string,string,string]> = {\n` +
    `  heat_exchanger_calculate: ["HeatExchangerEngine", "heatExchangerEngine", "calculate"],\n` +
    `  "pump_select": ["PumpEngine", "pumpEngine", "calculate"],\n` +
    `  nested_obj: { inner_key: 1, deep: { deeper_key: 2 } },\n` +
    `};`;
  const keys = objectLiteralKeys(src, "ACTION_MAP");
  assert.deepEqual(keys.sort(), ["heat_exchanger_calculate", "nested_obj", "pump_select"]);
  assert.ok(!keys.includes("HeatExchangerEngine"), "array VALUE strings are never keys");
  assert.ok(!keys.includes("inner_key"), "nested object keys never leak");
  assert.ok(!keys.includes("deeper_key"), "doubly-nested keys never leak");
  assert.ok(!keys.includes("calculate"), "value tuple member is not a key");
});

test("objectLiteralKeys resolves ...spread maps recursively and skips computed [expr] keys", () => {
  const src = `const BASE = { base_a: 1, base_b: 2 };\n` +
    `const KEY = "x";\n` +
    `const ACTION_MAP = { ...BASE, own_action: 3, [KEY]: 4 };`;
  const keys = objectLiteralKeys(src, "ACTION_MAP").sort();
  assert.deepEqual(keys, ["base_a", "base_b", "own_action"], "spread keys merged, computed [KEY] skipped");
});

test("objectLiteralKeys returns null when the named map literal is absent", () => {
  assert.equal(objectLiteralKeys(`const OTHER = { a: 1 };`, "ACTION_MAP"), null);
});

test("dispatcherActions resolves `const ACTIONS = Object.keys(ACTION_MAP)` (fluidThermal/mechanical pattern)", () => {
  // These dispatchers validate via `if (!ACTION_MAP[action])` and derive ACTIONS = Object.keys(ACTION_MAP)
  // -- invisible to the array/enum/case extractors. Without this the whole dispatcher was UNVERIFIABLE.
  const src = `const ACTION_MAP: Record<string,[string,string,string]> = {\n` +
    `  ball_screw_calculate: ["BallScrewEngine", "ballScrewEngine", "calculate"],\n` +
    `  bearing_select: ["BearingSelectionEngine", "bearingSelectionEngine", "calculate"],\n` +
    `};\n` +
    `const ACTIONS = Object.keys(ACTION_MAP) as unknown as readonly string[];\n` +
    `server.tool("prism_mechanical", "d", {});`;
  const { actions, sources } = dispatcherActions(src);
  assert.ok(actions.has("ball_screw_calculate") && actions.has("bearing_select"));
  assert.equal(actions.size, 2);
  assert.ok(sources.get("ball_screw_calculate").has("objectmap"), "source tagged objectmap");
});

test("dispatcherActions does NOT inject keys from a non-action Object.keys (anchored-name gate)", () => {
  // Guard against over-extraction: only an anchored ACTIONS/*_ACTIONS const triggers map-key
  // resolution, so an unrelated `Object.keys(config)` never broadens the action set (mask-a-P0 risk).
  const src = `const CONFIG_MAP = { timeout: 1, retries: 2 };\n` +
    `const settingKeys = Object.keys(CONFIG_MAP);\n` +
    `const ACTIONS = ["real_action"] as const; z.enum(ACTIONS);`;
  const { actions } = dispatcherActions(src);
  assert.ok(actions.has("real_action"));
  assert.ok(!actions.has("timeout") && !actions.has("retries"), "config keys must NOT become actions");
  assert.equal(actions.size, 1);
});

test("dispatcherActions over-extract guards: anchored name + reject chained Object.keys(x).length", () => {
  // Two latent over-extract holes a reviewer surfaced, both now closed:
  //   (1) a substring "action" name (baselineActionKeys) must NOT qualify -- only anchored *_ACTIONS;
  //   (2) a CHAINED Object.keys(x).length must NOT inject x's keys -- only a terminal Object.keys(MAP).
  const src = `const CONFIG = { cfg_a: 1, cfg_b: 2 };\n` +
    `const OTHER = { other_a: 1 };\n` +
    `const baselineActionKeys = Object.keys(CONFIG);\n` +      // substring "Action" but not anchored -> reject
    `const fooActionCount = Object.keys(OTHER).length;\n` +    // chained .length -> reject
    `const ENGINE_MAP = { real_one: ["E","e","calc"], real_two: ["F","f","calc"] };\n` +
    `const FOO_ACTIONS = Object.keys(ENGINE_MAP);\n`;          // anchored *_ACTIONS + terminal -> accept
  const { actions } = dispatcherActions(src);
  assert.ok(actions.has("real_one") && actions.has("real_two"), "anchored *_ACTIONS terminal map IS resolved");
  assert.ok(!actions.has("cfg_a") && !actions.has("cfg_b"), "unanchored 'ActionKeys' name must NOT inject");
  assert.ok(!actions.has("other_a"), "chained Object.keys(x).length must NOT inject");
  assert.equal(actions.size, 2);
});

test("extractRouteCalls separates literal vs dynamic actions and ignores comments", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ferc-calls-"));
  fs.writeFileSync(
    path.join(dir, "x.ts"),
    `callTool("prism_foo", "alpha", {});\nconst v = "beta"; callTool("prism_foo", v);\n// callTool("prism_foo", "commented")\n`,
  );
  const calls = extractRouteCalls(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  const lit = calls.filter((c) => !c.dynamic);
  const dyn = calls.filter((c) => c.dynamic);
  assert.equal(lit.length, 1, "one literal call");
  assert.equal(lit[0].action, "alpha");
  assert.equal(dyn.length, 1, "one dynamic call");
  assert.ok(!calls.some((c) => c.action === "commented"), "commented call ignored");
});

// ---------------------------------------------------------------------------
// 2. Controlled end-to-end classification
// ---------------------------------------------------------------------------

test("auditContract classifies P0 / INFO / DYNAMIC / UNVERIFIABLE / resolved deterministically", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ferc-e2e-"));
  const dispDir = path.join(root, "dispatchers");
  const routesDir = path.join(root, "routes");
  fs.mkdirSync(dispDir);
  fs.mkdirSync(routesDir);

  // prism_foo: parseable, actions {alpha, beta}
  fs.writeFileSync(
    path.join(dispDir, "fooDispatcher.ts"),
    `const ACTIONS = ["alpha", "beta"] as const;\nserver.tool("prism_foo", "Foo", { action: z.enum(ACTIONS) });`,
  );
  // prism_bar: registered but NO parseable action set -> unverifiable
  fs.writeFileSync(
    path.join(dispDir, "barDispatcher.ts"),
    `server.tool("prism_bar", "Bar", { action: z.string() });`,
  );

  // mounted router: resolved (alpha) + P0 broken (gamma) + dynamic + unknown-tool(P0) + unverifiable
  fs.writeFileSync(
    path.join(routesDir, "mounted.ts"),
    [
      `export function createMountedRouter(callTool){`,
      `  callTool("prism_foo", "alpha", {});`,
      `  callTool("prism_foo", "gamma", {});`,
      `  const a = "x"; callTool("prism_foo", a);`,
      `  callTool("prism_qux", "nope", {});`,
      `  callTool("prism_bar", "whatever", {});`,
      `}`,
    ].join("\n"),
  );
  // unmounted router: broken (delta) -> INFO not P0
  fs.writeFileSync(
    path.join(routesDir, "unmounted.ts"),
    `export function createUnmountedRouter(callTool){ callTool("prism_foo", "delta", {}); }`,
  );
  // index.ts mounts ONLY mounted.ts
  fs.writeFileSync(
    path.join(routesDir, "index.ts"),
    [
      `import { createMountedRouter } from "./mounted.js";`,
      `import { createUnmountedRouter } from "./unmounted.js";`,
      `export function registerRoutes(app, callTool){`,
      `  app.use("/m", createMountedRouter(callTool));`,
      `  // createUnmountedRouter intentionally NOT mounted`,
      `}`,
    ].join("\n"),
  );

  const { summary, findings } = auditContract({
    routesDir,
    dispatchersDir: dispDir,
    indexPath: path.join(routesDir, "index.ts"),
  });
  fs.rmSync(root, { recursive: true, force: true });

  assert.equal(summary.resolved, 1, "alpha resolves");
  assert.equal(summary.p0Mounted, 2, "gamma (bad action) + qux (unknown tool), both mounted");
  assert.equal(summary.infoUnmounted, 1, "delta on unmounted router");
  assert.equal(summary.dynamic, 1, "dynamic action arg");
  assert.equal(summary.unverifiable, 1, "prism_bar has no parseable actions");
  assert.equal(summary.clean, false);

  const gamma = findings.find((f) => f.action === "gamma");
  assert.equal(gamma.severity, "P0");
  assert.equal(gamma.mounted, true);
  const delta = findings.find((f) => f.action === "delta");
  assert.equal(delta.severity, "INFO");
  assert.equal(delta.mounted, false);
  const qux = findings.find((f) => f.tool === "prism_qux");
  assert.equal(qux.severity, "P0");
});

test("mountedRouterFiles requires explicit app.use evidence (unused import is not mounted)", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ferc-mount-"));
  fs.writeFileSync(
    path.join(root, "index.ts"),
    [
      `import { createUsedRouter } from "./used.js";`,
      `import { createUnusedRouter } from "./unused.js";`,
      `app.use("/u", createUsedRouter(callTool));`,
    ].join("\n"),
  );
  const { mounted } = mountedRouterFiles(path.join(root, "index.ts"));
  fs.rmSync(root, { recursive: true, force: true });
  assert.ok(mounted.has("used"), "used router is mounted");
  assert.ok(!mounted.has("unused"), "imported-but-not-used router is NOT mounted");
});

// ---------------------------------------------------------------------------
// 3. LIVE false-negative guard (parser correctness on real dispatchers)
// ---------------------------------------------------------------------------

test("LIVE: parser resolves known-real, stable actions on real dispatchers (no false negatives)", () => {
  const dispatchersDir = path.join(REPO, "mcp-server/src/tools/dispatchers");
  if (!fs.existsSync(dispatchersDir)) return; // skip if run outside the repo
  const { map } = buildDispatcherMap(dispatchersDir);

  const auth = map.get("prism_auth");
  assert.ok(auth, "prism_auth dispatcher parsed");
  assert.ok(auth.actions.has("login"), "prism_auth resolves canonical 'login'");
  assert.ok(auth.actions.has("refresh_token"), "prism_auth resolves canonical 'refresh_token'");
  // The footgun the audit caught: the SPA route calls 'whoami', which is NOT a real action.
  assert.ok(!auth.actions.has("whoami"), "prism_auth has no 'whoami' (the real silent-failure)");

  const grinding = map.get("prism_grinding");
  assert.ok(grinding, "prism_grinding dispatcher parsed");
  assert.ok(grinding.actions.has("wheel_select"), "prism_grinding resolves canonical 'wheel_select'");
});

test("LIVE: Object.keys(ACTION_MAP) dispatchers (fluid_thermal, mechanical) are no longer UNVERIFIABLE", () => {
  const dispatchersDir = path.join(REPO, "mcp-server/src/tools/dispatchers");
  if (!fs.existsSync(dispatchersDir)) return; // skip outside repo
  const { map, unparsable } = buildDispatcherMap(dispatchersDir);

  const fluid = map.get("prism_fluid_thermal");
  assert.ok(fluid, "prism_fluid_thermal dispatcher parsed");
  assert.ok(fluid.actions.size > 0, "fluid_thermal now resolves its Object.keys(ACTION_MAP) action set");
  assert.ok(fluid.actions.has("heat_exchanger_calculate"), "fluid_thermal resolves a known map key");
  assert.ok(!unparsable.has("prism_fluid_thermal"), "fluid_thermal no longer UNVERIFIABLE");

  const mech = map.get("prism_mechanical");
  assert.ok(mech, "prism_mechanical dispatcher parsed");
  assert.ok(mech.actions.has("ball_screw_calculate"), "mechanical resolves a known map key");
  assert.ok(!unparsable.has("prism_mechanical"), "mechanical no longer UNVERIFIABLE");

  // Cross-isolation: fluid's keys must NOT bleed into mechanical's set and vice-versa.
  assert.ok(!mech.actions.has("heat_exchanger_calculate"), "no cross-map key bleed");
  assert.ok(!fluid.actions.has("ball_screw_calculate"), "no cross-map key bleed (reverse)");
});

test("LIVE: full audit runs over real routes and reports a sane shape", () => {
  const routesDir = path.join(REPO, "mcp-server/src/routes");
  if (!fs.existsSync(routesDir)) return; // skip outside repo
  const { summary } = auditContract({
    routesDir,
    dispatchersDir: path.join(REPO, "mcp-server/src/tools/dispatchers"),
    indexPath: path.join(routesDir, "index.ts"),
  });
  assert.ok(summary.routeFiles > 0, "scanned real route files");
  assert.ok(summary.dispatchers > 50, "parsed the real dispatcher fleet");
  assert.ok(summary.resolved > 0, "most real calls resolve (parser is not blind)");
  // resolved must dominate -- if the parser were broken, resolved would collapse to ~0.
  assert.ok(summary.resolved > summary.p0Mounted, "resolved calls dominate P0s (parser sane)");
});
