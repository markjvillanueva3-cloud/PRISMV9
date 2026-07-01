#!/usr/bin/env node
/**
 * build-engine-index.mjs
 *
 * Permanent-memory generator for two complementary surfaces:
 *
 *   1. state/shared/ENGINE_WIRING_INDEX.json   — per-engine
 *      { wired, dispatcher, actions[], hasTest, importsFound }
 *      Replaces grep-for-engine-wiring. Audit chats can answer
 *      "is X wired? where? what actions?" by JSON lookup.
 *
 *   2. state/shared/TEST_COVERAGE_INDEX.json   — per-engine
 *      { engine, hasTest, testPath, testMtime }
 *      Surfaces the BUILT-but-UNTESTED gap (5th BUILD_STATE
 *      dimension) which audit chats currently miss entirely.
 *
 * Idempotent. Run from anywhere; resolves paths from script location.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const ENGINES_DIR = resolve(REPO_ROOT, "mcp-server/src/engines");
const DISPATCHER_DIR = resolve(REPO_ROOT, "mcp-server/src/tools/dispatchers");
const TESTS_DIR = resolve(REPO_ROOT, "mcp-server/src/__tests__");
const STATE_DIR = resolve(REPO_ROOT, "state/shared");
const WIRING_OUT = resolve(STATE_DIR, "ENGINE_WIRING_INDEX.json");
const TESTS_OUT = resolve(STATE_DIR, "TEST_COVERAGE_INDEX.json");

async function listEngines() {
  let files;
  try { files = await readdir(ENGINES_DIR); } catch { return []; }
  return files.filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => f.slice(0, -3));
}

async function listDispatchers() {
  let files;
  try { files = await readdir(DISPATCHER_DIR); } catch { return []; }
  return files.filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => ({ name: f.slice(0, -3), path: join(DISPATCHER_DIR, f) }));
}

async function indexDispatcher(dispPath) {
  let body;
  try { body = await readFile(dispPath, "utf8"); } catch {
    return { engineToActions: new Map(), engineImports: new Map() };
  }
  const engineToActions = new Map();
  const engineImports = new Map();
  const reLazy = /(\w+)\s*:\s*\(\s*\)\s*=>\s*import\(\s*["']([^"']+)["']\s*\)/g;
  let m;
  while ((m = reLazy.exec(body)) !== null) {
    const action = m[1];
    const eng = basename(m[2]).replace(/\.js$/, "");
    if (!eng.endsWith("Engine") && !/^[A-Z]/.test(eng)) continue;
    if (!engineToActions.has(eng)) engineToActions.set(eng, new Set());
    engineToActions.get(eng).add(action);
    engineImports.set(eng, (engineImports.get(eng) ?? 0) + 1);
  }
  const reBare = /await\s+import\(\s*["']([^"']+\/engines\/([A-Za-z0-9_]+))\.js["']/g;
  while ((m = reBare.exec(body)) !== null) {
    const eng = m[2];
    engineImports.set(eng, (engineImports.get(eng) ?? 0) + 1);
    if (!engineToActions.has(eng)) engineToActions.set(eng, new Set());
  }
  return { engineToActions, engineImports };
}

async function buildTestCoverageIndex(engines) {
  const rows = [];
  for (const eng of engines) {
    const path = join(TESTS_DIR, `${eng}.test.ts`);
    let hasTest = false;
    let mtime = null;
    if (existsSync(path)) {
      try { const s = statSync(path); hasTest = s.isFile(); mtime = s.mtime.toISOString(); } catch {}
    }
    rows.push({
      engine: eng,
      hasTest,
      testPath: hasTest ? `mcp-server/src/__tests__/${eng}.test.ts` : null,
      testMtime: mtime,
    });
  }
  return rows;
}

async function main() {
  const engines = await listEngines();
  const dispatchers = await listDispatchers();
  const engineMap = new Map();
  for (const eng of engines) {
    engineMap.set(eng, { dispatchers: new Map(), totalActions: 0, totalImports: 0 });
  }
  for (const disp of dispatchers) {
    const { engineToActions, engineImports } = await indexDispatcher(disp.path);
    for (const [eng, actions] of engineToActions.entries()) {
      if (!engineMap.has(eng)) {
        engineMap.set(eng, { dispatchers: new Map(), totalActions: 0, totalImports: 0, orphan_no_engine_file: true });
      }
      const ent = engineMap.get(eng);
      const existing = ent.dispatchers.get(disp.name) ?? new Set();
      for (const a of actions) existing.add(a);
      ent.dispatchers.set(disp.name, existing);
    }
    for (const [eng, n] of engineImports.entries()) {
      if (engineMap.has(eng)) engineMap.get(eng).totalImports += n;
    }
  }
  const wiringRows = [];
  let wiredCount = 0;
  let unwiredCount = 0;
  for (const [eng, ent] of engineMap.entries()) {
    const dispatcherList = [...ent.dispatchers.entries()].map(([dispName, actionsSet]) => ({
      dispatcher: dispName,
      actions: [...actionsSet].sort(),
    }));
    const totalActions = dispatcherList.reduce((a, d) => a + d.actions.length, 0);
    const wired = dispatcherList.length > 0 || ent.totalImports > 0;
    if (wired) wiredCount++; else unwiredCount++;
    wiringRows.push({
      engine: eng,
      wired,
      dispatchers: dispatcherList,
      totalActions,
      totalImports: ent.totalImports,
      orphanNoEngineFile: ent.orphan_no_engine_file ?? false,
    });
  }
  wiringRows.sort((a, b) => a.engine.localeCompare(b.engine));
  const testRows = await buildTestCoverageIndex(engines);
  const testedCount = testRows.filter((r) => r.hasTest).length;
  const untestedCount = testRows.length - testedCount;
  const wiringOut = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    summary: {
      total_engines: engines.length, wired: wiredCount, unwired: unwiredCount,
      coverage_pct: engines.length > 0 ? Math.round((wiredCount / engines.length) * 100) : 0,
      dispatchers_scanned: dispatchers.length,
    },
    engines: wiringRows,
  };
  const testsOut = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    summary: {
      total_engines: engines.length, tested: testedCount, untested: untestedCount,
      coverage_pct: engines.length > 0 ? Math.round((testedCount / engines.length) * 100) : 0,
    },
    engines: testRows,
  };
  await writeFile(WIRING_OUT, JSON.stringify(wiringOut, null, 2) + "\n", "utf8");
  await writeFile(TESTS_OUT, JSON.stringify(testsOut, null, 2) + "\n", "utf8");
  process.stderr.write(`[engine-index] WIRING: ${wiredCount}/${engines.length} wired across ${dispatchers.length} dispatchers\n`);
  process.stderr.write(`[engine-index] TESTS: ${testedCount}/${engines.length} tested\n`);
}

main().catch((err) => {
  process.stderr.write(`[engine-index] FAILED: ${err.stack || err.message}\n`);
  process.exit(1);
});
