/**
 * dispatcher-registration-coverage tests -- synthetic dispatchers dir + index.ts
 * with known registered/dormant/commented/cross-lane/safety/superseded/
 * intentionally-skipped cases, plus the `(server as any).tool(...)` cast form.
 *
 * DISCOVERY-EFFICIENCY/U-DISPATCHER-REGISTRATION-COVERAGE (slot:tango, 2026-06-15).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  listDispatcherExports,
  listIndexRegistrations,
  extractIndexComments,
  classifyDispatcher,
  computeCoverage,
} from "./dispatcher-registration-coverage.mjs";

const REG = "register"; // avoid this test file self-matching the index-call regex on its own text

function disp(regName, toolName, cast = false) {
  const recv = cast ? "(server as any)" : "server";
  return `export function ${regName}(server) {\n  ${recv}.tool(\n    "${toolName}",\n    "desc",\n    {},\n    async () => ({}),\n  );\n}\n`;
}

function buildFixture() {
  const root = mkdtempSync(join(tmpdir(), "disp-cov-"));
  const dispatchers = join(root, "dispatchers");
  mkdirSync(dispatchers, { recursive: true });
  writeFileSync(join(dispatchers, "alphaDispatcher.ts"), disp("registerAlphaDispatcher", "prism_alpha"));
  writeFileSync(join(dispatchers, "betaDispatcher.ts"), disp("registerBetaDispatcher", "prism_beta", true)); // cast form
  writeFileSync(join(dispatchers, "machineDispatcher.ts"), disp("registerMachineDispatcher", "prism_machine"));
  writeFileSync(join(dispatchers, "securityDispatcher.ts"), disp("registerSecurityDispatcher", "prism_security"));
  writeFileSync(join(dispatchers, "cadAutomationDispatcher.ts"), disp("registerCadAutomationDispatcher", "prism_cad_automation"));
  writeFileSync(join(dispatchers, "aiDispatcher.ts"), disp("registerAIDispatcher", "prism_ai"));
  writeFileSync(join(dispatchers, "gammaDispatcher.ts"), disp("registerGammaDispatcher", "prism_shared"));
  writeFileSync(join(dispatchers, "deltaDispatcher.ts"), disp("registerDeltaDispatcher", "prism_shared")); // collides with gamma
  writeFileSync(join(dispatchers, "alphaDispatcher.test.ts"), `// test -- must be excluded`);
  // index.ts: Alpha + Beta + Gamma registered; Machine commented-out; Cad/AI/Delta absent.
  const indexTs = [
    `import { stuff } from "./x.js";`,
    `${REG}AlphaDispatcher(server);`,
    `${REG}BetaDispatcher(server);`,
    `${REG}GammaDispatcher(server);`,
    `// ${REG}MachineDispatcher(server);   // disabled for now`,
    `// prism_ai tool name owned by registerAIReasoningDispatcher -- crashed boot, do not re-add`,
  ].join("\n");
  writeFileSync(join(root, "index.ts"), indexTs);
  return { root, dispatchers, indexPath: join(root, "index.ts") };
}

// -- listDispatcherExports --

test("listDispatcherExports: finds all register fns, excludes tests, extracts tool names", () => {
  const { root, dispatchers } = buildFixture();
  try {
    const exps = listDispatcherExports(dispatchers);
    const names = exps.map((e) => e.regName).sort();
    assert.ok(names.includes("registerAlphaDispatcher"));
    assert.ok(names.includes("registerMachineDispatcher"));
    assert.ok(!names.some((n) => n.includes("test")), "no test-file exports");
    const alpha = exps.find((e) => e.regName === "registerAlphaDispatcher");
    assert.equal(alpha.toolName, "prism_alpha");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("listDispatcherExports: extracts tool name through a (server as any).tool() cast", () => {
  const { root, dispatchers } = buildFixture();
  try {
    const beta = listDispatcherExports(dispatchers).find((e) => e.regName === "registerBetaDispatcher");
    assert.equal(beta.toolName, "prism_beta", "cast form must still yield the tool name");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// -- listIndexRegistrations --

test("listIndexRegistrations: counts active calls, ignores commented-out calls", () => {
  const { root, indexPath } = buildFixture();
  try {
    const called = listIndexRegistrations(indexPath);
    assert.ok(called.has("registerAlphaDispatcher"));
    assert.ok(called.has("registerGammaDispatcher"));
    assert.ok(!called.has("registerMachineDispatcher"), "commented-out call must NOT count");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// -- extractIndexComments --

test("extractIndexComments: returns lowercased comment text including the prism_ai skip note", () => {
  const { root, indexPath } = buildFixture();
  try {
    const c = extractIndexComments(indexPath);
    assert.ok(c.includes("prism_ai"));
    assert.ok(c.includes("crashed boot"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// -- classifyDispatcher --

test("classifyDispatcher: documentedSkip > collision > safety > cross-lane > candidate", () => {
  assert.equal(classifyDispatcher("AI", "prism_ai", { documentedSkip: true }).klass, "intentionally-skipped");
  assert.equal(classifyDispatcher("Foo", "prism_shared", { collidesWith: ["registerGammaDispatcher"] }).klass, "superseded");
  assert.equal(classifyDispatcher("Machine", "prism_machine").klass, "safety-sensitive");
  assert.equal(classifyDispatcher("Security", "prism_security").klass, "safety-sensitive");
  assert.equal(classifyDispatcher("CadAutomation", "prism_cad_automation").klass, "cross-lane");
  assert.equal(classifyDispatcher("CadAutomation", "prism_cad_automation").owner, "delta");
  assert.equal(classifyDispatcher("CamFunction", "prism_cam_function").owner, "kilo");
  assert.equal(classifyDispatcher("Widget", "prism_widget").klass, "candidate");
});

// -- computeCoverage: full integration --

test("computeCoverage: classifies every dormant dispatcher with a reason", () => {
  const { root, dispatchers, indexPath } = buildFixture();
  try {
    const r = computeCoverage({ dispatchersDir: dispatchers, indexPath });
    // 8 exports; Alpha+Beta+Gamma registered = 3; dormant = Machine, Security, CadAutomation, AI, Delta = 5.
    assert.equal(r.totalExports, 8);
    assert.equal(r.registeredCount, 3);
    assert.equal(r.dormantCount, 5);
    const byName = Object.fromEntries(r.dormant.map((d) => [d.regName, d.klass]));
    // Machine has a commented-out call in index.ts -> deliberate disable -> intentionally-skipped.
    assert.equal(byName.registerMachineDispatcher, "intentionally-skipped");
    // Security is simply absent from index.ts -> classified by its safety nature.
    assert.equal(byName.registerSecurityDispatcher, "safety-sensitive");
    assert.equal(byName.registerCadAutomationDispatcher, "cross-lane");
    assert.equal(byName.registerAIDispatcher, "intentionally-skipped"); // prism_ai documented in index comment
    assert.equal(byName.registerDeltaDispatcher, "superseded"); // prism_shared owned by registered Gamma
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("computeCoverage: empty dispatchers dir -> 0 exports, no throw", () => {
  const root = mkdtempSync(join(tmpdir(), "disp-empty-"));
  try {
    mkdirSync(join(root, "dispatchers"), { recursive: true });
    writeFileSync(join(root, "index.ts"), `// nothing`);
    const r = computeCoverage({ dispatchersDir: join(root, "dispatchers"), indexPath: join(root, "index.ts") });
    assert.equal(r.totalExports, 0);
    assert.equal(r.dormantCount, 0);
    assert.equal(r.coveragePct, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("computeCoverage: real PRISM tree -- no dormant dispatcher is left as a blind 'candidate' that is actually unsafe", () => {
  // Live regression oracle: registerAIDispatcher (prism_ai collision, documented in
  // index.ts) must classify as intentionally-skipped, NEVER 'candidate' (registering
  // it crashes boot). And every dormant dispatcher must carry a klass.
  const r = computeCoverage();
  assert.ok(r.totalExports > 90, `expected 90+ dispatcher exports, got ${r.totalExports}`);
  const ai = r.dormant.find((d) => d.regName === "registerAIDispatcher");
  if (ai) assert.equal(ai.klass, "intentionally-skipped", "prism_ai must be intentionally-skipped, not a register candidate");
  for (const d of r.dormant) {
    assert.ok(["candidate", "cross-lane", "safety-sensitive", "superseded", "intentionally-skipped"].includes(d.klass), `unknown klass ${d.klass}`);
  }
});
