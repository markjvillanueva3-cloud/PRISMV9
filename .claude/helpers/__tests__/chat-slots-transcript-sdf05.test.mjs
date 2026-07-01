// SLOT-DRIFT-FIX-MS0/U-SDF05 regression guard (slot:bravo 2026-05-30).
// Intent: findTranscriptFile must scan sibling `H--prism*` worktree project dirs,
// not just the hardcoded `H--prism`. The slot-worktree migration moved every chat
// into H:/prism-slot-<nato> (transcript dir H--prism-slot-<nato>); the single-dir
// lookup returned null for ALL of them -> liveness dead -> slots drifted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findTranscriptFile } from '../chat-slots.mjs';

test('U-SDF05: finds a transcript living in a H--prism-slot-* worktree dir (not H--prism)', () => {
  const prevHome = process.env.USERPROFILE;
  const prevBase = process.env.PRISM_SLOT_TRANSCRIPT_BASE;
  delete process.env.PRISM_SLOT_TRANSCRIPT_BASE; // must NOT pin to a single dir
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdf05-'));
  try {
    process.env.USERPROFILE = tmp;
    const projects = path.join(tmp, '.claude', 'projects');
    // hardcoded dir exists but holds NO matching transcript (the old trap)
    fs.mkdirSync(path.join(projects, 'H--prism'), { recursive: true });
    // the real transcript lives in the worktree project dir
    const wt = path.join(projects, 'H--prism-slot-bravo');
    fs.mkdirSync(wt, { recursive: true });
    fs.writeFileSync(path.join(wt, 'abcd1234-0000-0000-0000-000000000000.jsonl'), '{}');
    const got = findTranscriptFile('claude-abcd1234');
    assert.ok(got, 'expected a hit, got null (single-dir regression)');
    assert.ok(got.toLowerCase().includes('h--prism-slot-bravo'), 'must resolve the worktree dir, got=' + got);
  } finally {
    if (prevHome === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = prevHome;
    if (prevBase !== undefined) process.env.PRISM_SLOT_TRANSCRIPT_BASE = prevBase;
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});

test('U-SDF05: picks the FRESHEST transcript when the id collides across worktrees', () => {
  const prevHome = process.env.USERPROFILE;
  const prevBase = process.env.PRISM_SLOT_TRANSCRIPT_BASE;
  delete process.env.PRISM_SLOT_TRANSCRIPT_BASE;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdf05b-'));
  try {
    process.env.USERPROFILE = tmp;
    const projects = path.join(tmp, '.claude', 'projects');
    const a = path.join(projects, 'H--prism-slot-alpha');
    const b = path.join(projects, 'H--prism-slot-bravo');
    fs.mkdirSync(a, { recursive: true });
    fs.mkdirSync(b, { recursive: true });
    const fA = path.join(a, 'cafe1234-0000-0000-0000-000000000000.jsonl');
    const fB = path.join(b, 'cafe1234-1111-1111-1111-111111111111.jsonl');
    fs.writeFileSync(fA, '{}');
    fs.writeFileSync(fB, '{}');
    // make B strictly newer
    const now = Date.now();
    fs.utimesSync(fA, new Date(now - 60000), new Date(now - 60000));
    fs.utimesSync(fB, new Date(now), new Date(now));
    const got = findTranscriptFile('claude-cafe1234');
    assert.ok(got && got.toLowerCase().includes('h--prism-slot-bravo'), 'freshest (bravo) must win, got=' + got);
  } finally {
    if (prevHome === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = prevHome;
    if (prevBase !== undefined) process.env.PRISM_SLOT_TRANSCRIPT_BASE = prevBase;
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});

test('U-SDF05: malformed / unknown chatId returns null (no false-positive slot protection)', () => {
  assert.equal(findTranscriptFile('not-a-claude-id'), null);
  assert.equal(findTranscriptFile(''), null);
  assert.equal(findTranscriptFile(null), null);
});
