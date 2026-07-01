// materialize-mit-ocw-corpus.test.mjs
// External behavioral test suite for materialize-mit-ocw-corpus.mjs exports.
// Complements the 6 self-tests embedded in the script's if(import.meta.url) block.
// Run: node scripts/materialize-mit-ocw-corpus.test.mjs
//
// R9: every assertion encodes WHY the behavior matters -- a regression in
// buildCorpusIndex/writeCorpusIndex must make at least one test FAIL.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildCorpusIndex, writeCorpusIndex } from './materialize-mit-ocw-corpus.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;
const pendingAsync = [];

function test(name, fn) {
  let result;
  try {
    result = fn();
  } catch (err) {
    process.stderr.write(`  FAIL: ${name}\n    ${err.message}\n`);
    failed++;
    return;
  }
  if (result && typeof result.then === 'function') {
    // async test -- summary block waits for all pendingAsync
    pendingAsync.push(
      result.then(
        () => { process.stdout.write(`  PASS: ${name}\n`); passed++; },
        (err) => { process.stderr.write(`  FAIL: ${name}\n    ${err.message}\n`); failed++; },
      ),
    );
  } else {
    process.stdout.write(`  PASS: ${name}\n`);
    passed++;
  }
}

process.stdout.write('[materialize-mit-ocw-corpus.test] Running external behavioral tests...\n');

// -------------------------------------------------------------------------
// Group A: buildCorpusIndex contract
// -------------------------------------------------------------------------

// A1: return shape -- {entries, warnings} both arrays; never throws
test('A1 return shape -- {entries,warnings} arrays, never throws', () => {
  const result = buildCorpusIndex({ silent: true });
  assert.ok(result !== null && typeof result === 'object', 'must return object');
  assert.ok(Array.isArray(result.entries), 'entries must be array');
  assert.ok(Array.isArray(result.warnings), 'warnings must be array');
});

// A2: entries count >= 80 (MIT_COURSE_INDEX has 225 listed; even with disk misses >= 80 survive)
// WHY: the corpus index is only useful if it covers a meaningful slice of MIT-OCW;
// a count below 80 means the hardcoded index or dedup logic is broken.
test('A2 entries count >= 80', () => {
  const { entries } = buildCorpusIndex({ silent: true });
  assert.ok(entries.length >= 80,
    `Expected >= 80 entries, got ${entries.length} -- index or dedup logic broken`);
});

// A3: required schema fields on every entry
// WHY: downstream consumers (training pipeline, inventory) rely on all these fields;
// a missing field silently breaks the consumer without a schema-validation step.
test('A3 all entries have required schema fields', () => {
  const { entries } = buildCorpusIndex({ silent: true });
  const required = [
    'course_id', 'slug', 'title', 'category', 'priority',
    'topics', 'prism_engines', 'sections', 'url',
    'source_path', 'has_zip', 'is_extracted', 'relevance', 'extracted_at',
  ];
  for (const entry of entries) {
    for (const f of required) {
      assert.ok(Object.prototype.hasOwnProperty.call(entry, f),
        `Entry ${entry.course_id || '?'} missing required field: ${f}`);
    }
  }
});

// A4: typed fields -- arrays are arrays, booleans are booleans
// WHY: a string-coerced boolean breaks === comparisons in the training pipeline;
// a non-array topics field breaks Array.prototype methods downstream.
test('A4 typed fields -- arrays/booleans not coerced to string', () => {
  const { entries } = buildCorpusIndex({ silent: true });
  for (const e of entries) {
    assert.ok(Array.isArray(e.topics),
      `topics must be array for ${e.course_id}, got ${typeof e.topics}`);
    assert.ok(Array.isArray(e.prism_engines),
      `prism_engines must be array for ${e.course_id}`);
    assert.ok(Array.isArray(e.sections),
      `sections must be array for ${e.course_id}`);
    assert.ok(typeof e.has_zip === 'boolean',
      `has_zip must be boolean for ${e.course_id}, got ${typeof e.has_zip}`);
    assert.ok(typeof e.is_extracted === 'boolean',
      `is_extracted must be boolean for ${e.course_id}, got ${typeof e.is_extracted}`);
  }
});

// A5: no duplicate course_ids -- dedup is enforced
// WHY: duplicate course_ids would make training-pipeline iterators process the
// same course twice, inflating course-weight in the training set.
test('A5 no duplicate course_ids', () => {
  const { entries } = buildCorpusIndex({ silent: true });
  const ids = entries.map((e) => e.course_id);
  const unique = new Set(ids);
  assert.strictEqual(unique.size, ids.length,
    `Duplicate course_ids: ${ids.length} entries but only ${unique.size} unique`);
});

// A6: OCW URLs are well-formed -- all start with https://ocw.mit.edu/courses/
// WHY: the url field is the canonical external reference; a wrong prefix means
// the course cannot be fetched or cross-referenced.
test('A6 all URLs are valid ocw.mit.edu/courses/ paths', () => {
  const { entries } = buildCorpusIndex({ silent: true });
  for (const e of entries) {
    assert.ok(typeof e.url === 'string' && e.url.startsWith('https://ocw.mit.edu/courses/'),
      `Bad URL for ${e.course_id}: ${e.url}`);
    assert.ok(!e.url.includes(' '),
      `URL has spaces for ${e.course_id}: ${e.url}`);
  }
});

// A7: manufacturing-critical course 2.810 is present and wired to PRISM engines
// WHY: 2.810 (Manufacturing Processes) is the most directly relevant MIT course;
// if it disappears from the index or loses prism_engines the physics wiring is broken.
test('A7 course 2.810 present with prism_engines wired', () => {
  const { entries } = buildCorpusIndex({ silent: true });
  const c = entries.find((e) => e.course_id === '2.810');
  assert.ok(c, 'Course 2.810 (Manufacturing Processes) must be in index');
  assert.ok(c.prism_engines.length > 0,
    '2.810 must have at least one prism_engines entry from prismMapping');
  // The prismMapping must wire at least one Force/Tool/Speed-related engine.
  const hasPhysicsEngine = c.prism_engines.some(
    (e) => e.includes('Force') || e.includes('Tool') || e.includes('Speed'),
  );
  assert.ok(hasPhysicsEngine,
    `2.810 prism_engines should reference a Force/Tool/Speed engine. Got: [${c.prism_engines.join(', ')}]`);
});

// A8: relevance field is a known value -- guards against stray strings
// WHY: downstream filters (training pipeline priority selection) rely on
// relevance being one of the known tiers from classifyRelevance(); an unknown
// value silently skips the course or triggers an assertion error downstream.
// Known tiers (from classifyRelevance return statements + disk-only fallback):
//   manufacturing | controls | algorithms | design | fluid_thermal |
//   general_engineering | other
test('A8 relevance field is a known tier string', () => {
  const KNOWN = new Set([
    'manufacturing', 'controls', 'algorithms', 'design',
    'fluid_thermal', 'general_engineering', 'other',
  ]);
  const { entries } = buildCorpusIndex({ silent: true });
  for (const e of entries) {
    assert.ok(KNOWN.has(e.relevance),
      `Unknown relevance '${e.relevance}' for ${e.course_id}; must be one of [${[...KNOWN].join('/')}]`);
  }
});

// -------------------------------------------------------------------------
// Group B: writeCorpusIndex contract
// -------------------------------------------------------------------------

// B1: writeCorpusIndex produces a valid JSONL file -- one parseable JSON object per line
// WHY: the training pipeline reads this file with JSONL parsing; a malformed line
// silently truncates the corpus at that point.
test('B1 writeCorpusIndex produces valid JSONL (one JSON object per line)', () => {
  const { entries } = buildCorpusIndex({ silent: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mit-ocw-test-'));
  const tmpFile = path.join(tmpDir, 'corpus-index.jsonl');
  try {
    writeCorpusIndex(entries, tmpFile);
    assert.ok(fs.existsSync(tmpFile), 'writeCorpusIndex must create the output file');
    const raw = fs.readFileSync(tmpFile, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    assert.ok(lines.length > 0, 'JSONL file must not be empty');
    // Every line must be a parseable JSON object
    for (let i = 0; i < lines.length; i++) {
      let obj;
      try {
        obj = JSON.parse(lines[i]);
      } catch (e) {
        assert.fail(`Line ${i + 1} is not valid JSON: ${lines[i].slice(0, 80)}`);
      }
      assert.ok(obj && typeof obj === 'object' && !Array.isArray(obj),
        `Line ${i + 1} must be a JSON object, got: ${typeof obj}`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// B2: writeCorpusIndex round-trip -- every written entry preserves course_id
// WHY: if writeCorpusIndex truncates, reorders, or drops course_id the corpus
// index is untrustworthy as a registry.
test('B2 writeCorpusIndex round-trip preserves all course_ids', () => {
  const { entries } = buildCorpusIndex({ silent: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mit-ocw-test-'));
  const tmpFile = path.join(tmpDir, 'corpus-index.jsonl');
  try {
    writeCorpusIndex(entries, tmpFile);
    const raw = fs.readFileSync(tmpFile, 'utf8');
    const written = raw.split('\n')
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l));
    const writtenIds = new Set(written.map((e) => e.course_id));
    const sourceIds = new Set(entries.map((e) => e.course_id));
    for (const id of sourceIds) {
      assert.ok(writtenIds.has(id),
        `course_id '${id}' was in entries but missing from written JSONL`);
    }
    assert.strictEqual(written.length, entries.length,
      `Written ${written.length} lines but entries had ${entries.length}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// B3: writeCorpusIndex creates parent directory if missing
// WHY: if the output dir does not exist and mkdir is not called, the write
// throws and the corpus index is never produced (silent failure in cron).
test('B3 writeCorpusIndex creates parent directory if missing', () => {
  const { entries } = buildCorpusIndex({ silent: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mit-ocw-test-'));
  const nestedFile = path.join(tmpDir, 'nested', 'deep', 'corpus-index.jsonl');
  try {
    // nested/deep does not exist yet
    assert.ok(!fs.existsSync(path.dirname(nestedFile)), 'Precondition: nested dir must not exist');
    writeCorpusIndex(entries, nestedFile);
    assert.ok(fs.existsSync(nestedFile), 'writeCorpusIndex must create nested dirs + file');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// -------------------------------------------------------------------------
// Group C: inventory wiring -- MIT-OCW entry present in SOURCES
// -------------------------------------------------------------------------

// C1: build-fleet-training-corpus-inventory SOURCES includes mit-ocw-corpus-index
// WHY: this is the R15 consumer-wire test -- if the entry disappears from SOURCES
// the MIT-OCW corpus is an orphan: no training pipeline can discover it.
test('C1 fleet-training-corpus-inventory SOURCES includes mit-ocw-corpus-index', async () => {
  const inventoryUrl = pathToFileURL(path.join(__dirname, 'build-fleet-training-corpus-inventory.mjs')).href;
  const { SOURCES } = await import(inventoryUrl);
  const entry = SOURCES.find((s) => s.id === 'mit-ocw-corpus-index');
  assert.ok(entry, 'SOURCES must contain an entry with id "mit-ocw-corpus-index"');
  assert.strictEqual(entry.kind, 'mit-ocw-corpus-index',
    `kind must be 'mit-ocw-corpus-index', got '${entry.kind}'`);
  assert.ok(typeof entry.path === 'string' && entry.path.includes('mit-ocw'),
    `path must reference mit-ocw directory, got: ${entry.path}`);
  assert.ok(Array.isArray(entry.domains) && entry.domains.length > 0,
    'domains must be a non-empty array');
});

// C2: the path in SOURCES points at the same file writeCorpusIndex produces
// WHY: a path mismatch means the inventory points at a file that never exists
// (the "where does it actually go" wiring gap this unit exists to close).
test('C2 SOURCES[mit-ocw-corpus-index].path matches writeCorpusIndex output path', async () => {
  const inventoryUrl = pathToFileURL(path.join(__dirname, 'build-fleet-training-corpus-inventory.mjs')).href;
  const { SOURCES } = await import(inventoryUrl);
  const entry = SOURCES.find((s) => s.id === 'mit-ocw-corpus-index');
  assert.ok(entry, 'Precondition: mit-ocw-corpus-index must be in SOURCES');
  // The canonical output from writeCorpusIndex is extracted/mit-ocw/corpus-index.jsonl
  const normalised = entry.path.replace(/\\/g, '/');
  assert.ok(normalised.endsWith('extracted/mit-ocw/corpus-index.jsonl'),
    `SOURCES path must end with 'extracted/mit-ocw/corpus-index.jsonl', got: ${entry.path}`);
});

// -------------------------------------------------------------------------
// Summary -- wait for async tests (C1, C2) before printing results
// -------------------------------------------------------------------------
void (async () => {
  await Promise.all(pendingAsync);
  process.stdout.write('\n');
  process.stdout.write(`[materialize-mit-ocw-corpus.test] ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
