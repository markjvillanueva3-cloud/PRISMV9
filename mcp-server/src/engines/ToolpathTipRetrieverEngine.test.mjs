// Tests for ToolpathTipRetrieverEngine
// Run: node --test mcp-server/src/engines/ToolpathTipRetrieverEngine.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseToolpathMd, scoreTipRelevance, retrieve, listAvailableToolpaths, META } from './ToolpathTipRetrieverEngine.mjs';

const SAMPLE_MD = `---
name: tribal-mastercam-dynamic-mill
description: Per-toolpath tribal — mastercam dynamic-mill
software: mastercam
toolpath: dynamic-mill
tipCount: 2
---

# mastercam — dynamic-mill

_Header text._

### Mastercam Dynamic Motion @120s

**Source:** [In-House Solutions](https://youtube.com/watch?v=abc123&t=100s) · video \`abc123\` · 2026-05-26T12:00:00Z

\`\`\`
Dynamic Motion varies stepover to maintain constant engagement.
Use it on aluminum and steel — engagement stays in the 10-15% sweet spot.
\`\`\`

### Mastercam Dynamic Mill Setup @240s

**Source:** [Mastercam YouTube](https://youtube.com/watch?v=def456&t=220s) · video \`def456\` · 2026-05-26T12:00:00Z

\`\`\`
Set entry helix angle to 5 degrees for inconel and titanium.
\`\`\`
`;

test('parseToolpathMd: parses frontmatter correctly', () => {
  const { frontmatter } = parseToolpathMd(SAMPLE_MD);
  assert.equal(frontmatter.software, 'mastercam');
  assert.equal(frontmatter.toolpath, 'dynamic-mill');
  assert.equal(frontmatter.tipCount, '2');
});

test('parseToolpathMd: parses tip records with provenance', () => {
  const { tips } = parseToolpathMd(SAMPLE_MD);
  assert.equal(tips.length, 2);
  assert.equal(tips[0].title, 'Mastercam Dynamic Motion');
  assert.equal(tips[0].timestamp, 120);
  assert.equal(tips[0].videoId, 'abc123');
  assert.match(tips[0].sourceUrl, /youtube\.com/);
  assert.match(tips[0].text, /Dynamic Motion varies stepover/);
});

test('parseToolpathMd: empty/null input returns empty result, no throw', () => {
  assert.deepEqual(parseToolpathMd(null), { frontmatter: {}, tips: [] });
  assert.deepEqual(parseToolpathMd(''), { frontmatter: {}, tips: [] });
});

test('parseToolpathMd: MD with no frontmatter still extracts tips', () => {
  const noFm = SAMPLE_MD.replace(/^---\n[\s\S]*?\n---\n/, '');
  const { frontmatter, tips } = parseToolpathMd(noFm);
  assert.deepEqual(frontmatter, {});
  assert.ok(tips.length >= 1);
});

test('scoreTipRelevance: baseline 1 + length tie-break for empty hints', () => {
  const s = scoreTipRelevance({ text: 'short tip' }, {});
  assert.ok(s >= 1 && s < 2);
});

test('scoreTipRelevance: materialHint match adds 2', () => {
  const s = scoreTipRelevance({ text: 'great for aluminum stock' }, { materialHint: 'aluminum' });
  assert.ok(s >= 3); // baseline 1 + match 2
});

test('scoreTipRelevance: feature + material both match', () => {
  const s = scoreTipRelevance(
    { text: 'pocket roughing in aluminum with dynamic motion' },
    { materialHint: 'aluminum', featureHint: 'pocket' }
  );
  assert.ok(s >= 5); // baseline 1 + 2 + 2
});

test('scoreTipRelevance: null tip returns 0', () => {
  assert.equal(scoreTipRelevance(null, {}), 0);
  assert.equal(scoreTipRelevance({ text: '' }, {}), 0);
});

test('retrieve: end-to-end against tmp corpus dir', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-tt-test-'));
  fs.writeFileSync(path.join(tmpDir, 'tribal-mastercam-dynamic-mill.md'), SAMPLE_MD);
  const r = retrieve({ software: 'mastercam', toolpath: 'dynamic-mill', corpusDir: tmpDir, topK: 5 });
  assert.equal(r.ok, true);
  assert.equal(r.software, 'mastercam');
  assert.equal(r.toolpath, 'dynamic-mill');
  assert.equal(r.tipCount, 2);
  assert.equal(r.tips.length, 2);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('retrieve: missing software returns reason, no throw', () => {
  const r = retrieve({ toolpath: 'dynamic-mill' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'missing-software');
});

test('retrieve: missing toolpath returns reason', () => {
  const r = retrieve({ software: 'mastercam' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'missing-toolpath');
});

test('retrieve: missing corpus file returns reason + path', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-tt-test-'));
  const r = retrieve({ software: 'mastercam', toolpath: 'nonexistent', corpusDir: tmpDir });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'no-corpus-file');
  assert.match(r.expectedPath, /nonexistent/);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('retrieve: invalid query returns reason', () => {
  assert.equal(retrieve(null).reason, 'invalid-query');
  assert.equal(retrieve('not-an-object').reason, 'invalid-query');
});

test('retrieve: materialHint ranks matching tip higher', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-tt-test-'));
  fs.writeFileSync(path.join(tmpDir, 'tribal-mastercam-dynamic-mill.md'), SAMPLE_MD);
  const r = retrieve({ software: 'mastercam', toolpath: 'dynamic-mill', materialHint: 'inconel', corpusDir: tmpDir, topK: 1 });
  assert.equal(r.ok, true);
  assert.equal(r.tips.length, 1);
  // The 2nd tip mentions 'inconel' — should be ranked first.
  assert.match(r.tips[0].text, /inconel/i);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('retrieve: topK defaults to 5', () => {
  assert.equal(META.defaultTopK, 5);
});

test('listAvailableToolpaths: empty dir returns empty array', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-tt-test-'));
  assert.deepEqual(listAvailableToolpaths(tmpDir), []);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('listAvailableToolpaths: parses filename pattern correctly', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-tt-test-'));
  fs.writeFileSync(path.join(tmpDir, 'tribal-mastercam-dynamic-mill.md'), '');
  fs.writeFileSync(path.join(tmpDir, 'tribal-fusion360-adaptive-clearing.md'), '');
  fs.writeFileSync(path.join(tmpDir, 'not-a-tribal-file.md'), '');
  const list = listAvailableToolpaths(tmpDir);
  assert.equal(list.length, 2);
  assert.ok(list.some((x) => x.software === 'mastercam' && x.toolpath === 'dynamic-mill'));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('retrieve: against real corpus (current per-toolpath dir)', () => {
  // This is an integration test — only runs if the corpus exists.
  const r = retrieve({ software: 'mastercam', toolpath: 'dynamic-mill', topK: 3 });
  // The corpus may or may not have this exact slug — both outcomes are valid.
  if (r.ok) {
    assert.ok(r.tips.length > 0);
    assert.ok(r.tips[0].videoId);
  } else {
    assert.ok(['no-corpus-file', 'empty-corpus-file'].includes(r.reason));
  }
});
