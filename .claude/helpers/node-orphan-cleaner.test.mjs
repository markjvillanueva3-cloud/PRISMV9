/**
 * Tests for node-orphan-cleaner.mjs decision logic (pure functions).
 * Run: node --test .claude/helpers/node-orphan-cleaner.test.mjs
 *
 * Focus: the 2026-06-11 incident fix -- a node running PRISM/fleet tooling must
 * NEVER be reaped (shared DEFAULT_PRISM_WORKER_PROTECT_REGEX), while genuinely
 * foreign transient/unknown nodes stay reapable (recall preserved).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isProtected, shouldKill, isTransient } from './node-orphan-cleaner.mjs';

function proc(o = {}) {
  return { commandLine: '', ports: [], parentName: '', age: 60, cpu: 0, mem: 100, pid: 1, ...o };
}

test('PRISM galaxy miner cmdline -> protected (incident fix)', () => {
  assert.equal(isProtected(proc({ commandLine: 'node H:/prism/scripts/mine-galaxy-transcripts.mjs --galaxy fleet-hygiene' })), true);
});

test('build-memory-embeddings-sidecar -> protected', () => {
  assert.equal(isProtected(proc({ commandLine: 'node H:/prism/scripts/build-memory-embeddings-sidecar.mjs --resume' })), true);
});

test('fleet / ollama / vault worker families -> protected', () => {
  for (const c of ['node /x/fleet-memory-monitor.mjs', 'node /x/ollama-docker-launcher.mjs', 'node /x/overnight-vault-compound.mjs']) {
    assert.equal(isProtected(proc({ commandLine: c })), true, c);
  }
});

test('any node under the prism tree -> protected', () => {
  assert.equal(isProtected(proc({ commandLine: 'node H:\\prism\\scripts\\foo-worker.mjs' })), true);
});

test('mcp-server dist/index.js -> protected', () => {
  assert.equal(isProtected(proc({ commandLine: 'node H:/prism/mcp-server/dist/index.js' })), true);
});

test('port 3100 (MCP bridge) -> protected', () => {
  assert.equal(isProtected(proc({ commandLine: 'node whatever.js', ports: [3100] })), true);
});

test('foreign vitest transient -> NOT protected (still reapable)', () => {
  assert.equal(isProtected(proc({ commandLine: 'node /tmp/x/node_modules/.bin/vitest run' })), false);
});

test('aggressive mode: idle <=350MB PRISM worker -> NOT killed (protected gate fires first)', () => {
  const p = proc({ commandLine: 'node H:/prism/scripts/mine-galaxy-transcripts.mjs', cpu: 0, mem: 200, age: 120 });
  assert.equal(isProtected(p), true);
  assert.equal(shouldKill(p, true), false); // pre-fix this idle worker was reaped in aggressive mode
});

test('aggressive mode: idle <=350MB FOREIGN unknown -> still killed (recall preserved)', () => {
  const p = proc({ commandLine: 'node /opt/foreign/server.js', cpu: 0, mem: 200, age: 120 });
  assert.equal(isProtected(p), false);
  assert.equal(shouldKill(p, true), true);
});

test('transient empty-cmdline non-Codex remains transient (behavior unchanged)', () => {
  assert.equal(isTransient(proc({ commandLine: '', parentName: 'explorer.exe' })), true);
});
