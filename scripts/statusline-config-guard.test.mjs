// Tests for statusline-config-guard.mjs (self-heal of the chat-slot statusLine config)
// + a never-blank smoke test of the statusline itself (node:test).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { needsHeal, healed } from './statusline-config-guard.mjs';

// Resolve a real node binary (bare "node" is not on PATH in the portable-node env).
const NODE = fs.existsSync('H:/Tools/nodejs/node.exe') ? 'H:/Tools/nodejs/node.exe' : process.execPath;

// ── pure needsHeal ──────────────────────────────────────────────────────────
test('needsHeal: missing statusLine -> "missing"', () => {
  assert.equal(needsHeal({ theme: 'dark' }), 'missing');
  assert.equal(needsHeal({ statusLine: null }), 'missing');
  assert.equal(needsHeal({}), 'missing');
});

test('needsHeal: statusLine present but wrong command -> "wrong-command"', () => {
  assert.equal(needsHeal({ statusLine: { type: 'command', command: 'echo hi' } }), 'wrong-command');
  assert.equal(needsHeal({ statusLine: { type: 'command' } }), 'wrong-command');
});

test('needsHeal: healthy statusLine -> null (no heal)', () => {
  assert.equal(needsHeal({ statusLine: { type: 'command', command: '"node" H:/prism/.claude/statusline.mjs', padding: 0 } }), null);
});

test('healed: injects the desired statusLine, preserves the rest', () => {
  const out = healed({ theme: 'dark', effortLevel: 'xhigh' });
  assert.equal(out.theme, 'dark');
  assert.equal(out.effortLevel, 'xhigh');
  assert.match(out.statusLine.command, /statusline\.mjs/);
  assert.equal(needsHeal(out), null); // healed is, by construction, healthy
});

// ── IO roundtrip via a temp settings file (env override) ────────────────────
test('main(): restores a missing statusLine to the settings file, idempotent second run', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-guard-'));
  try {
    const settingsPath = path.join(dir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({ theme: 'dark', skipAutoPermissionPrompt: true }, null, 2));
    const run = () => execFileSync(NODE, ['scripts/statusline-config-guard.mjs'], {
      cwd: path.resolve('.'), env: { ...process.env, PRISM_STATUSLINE_GUARD_SETTINGS: settingsPath }, encoding: 'utf8',
    });
    const out1 = run();
    const after1 = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.match(after1.statusLine?.command || '', /statusline\.mjs/); // restored
    assert.equal(after1.theme, 'dark'); // preserved
    assert.match(out1, /restored the chat-slot statusLine/); // announced the heal
    // second run is a silent no-op (healthy now)
    const out2 = run();
    assert.equal(out2.trim(), '');
    assert.deepEqual(JSON.parse(fs.readFileSync(settingsPath, 'utf8')), after1); // byte-identical
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('main(): never touches an unparseable settings file (no corruption)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-guard-'));
  try {
    const settingsPath = path.join(dir, 'settings.json');
    const garbage = '{ this is NOT valid json ]]]';
    fs.writeFileSync(settingsPath, garbage);
    execFileSync(NODE, ['scripts/statusline-config-guard.mjs'], {
      cwd: path.resolve('.'), env: { ...process.env, PRISM_STATUSLINE_GUARD_SETTINGS: settingsPath }, encoding: 'utf8',
    });
    assert.equal(fs.readFileSync(settingsPath, 'utf8'), garbage); // untouched — never corrupt
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── never-blank guarantee of the statusline itself ──────────────────────────
test('statusline.mjs NEVER emits an empty line (garbage stdin, missing session)', () => {
  const node = fs.existsSync('H:/Tools/nodejs/node.exe') ? 'H:/Tools/nodejs/node.exe' : 'node';
  const run = (stdin) => execFileSync(node, ['.claude/statusline.mjs'], {
    cwd: path.resolve('.'), input: stdin, encoding: 'utf8',
  });
  // garbage stdin must still render (JSON parse is guarded)
  const g = run('NOT JSON GARBAGE');
  assert.ok(g.length > 0, 'garbage stdin produced a blank statusline');
  assert.match(g, /\x1b\[/, 'statusline has no ANSI styling (render failed silently)');
  // empty stdin
  const e = run('{}');
  assert.ok(e.length > 0, 'empty session produced a blank statusline');
});
