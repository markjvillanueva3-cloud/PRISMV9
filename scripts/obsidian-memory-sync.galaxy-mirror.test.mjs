// scripts/obsidian-memory-sync.galaxy-mirror.test.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 Wave 2 / U-FLEET-P3-GALAXY-MEMORY-OBSIDIAN-MIRROR
// — hermetic tests for syncGalaxyMemories() + parseGalaxyIndex().
//
// All tests run against tmp fixture trees (an injected enginesRoot + vaultRoot) so
// they NEVER read the live engines tree or touch the real H:/prism/knowledge vault.
// dry:false is exercised, but only against the tmp vaultRoot.
//
// Coverage (per comprehensive-build floor):
//   happy            — mirrors a fixture galaxy MEMORY.md, frontmatter + body + [[links]] preserved
//   failure mode 1   — missing engines root → {mirrored:0}, no throw
//   failure mode 2   — galaxy dir without MEMORY.md → skipped (counted), not mirrored
//   failure mode 3   — top-level enginesRoot/MEMORY.md (a FILE, not a galaxy) is NOT mirrored
//   no-clobber       — an existing routed reference_*.md in galaxies/<g>/ is left byte-for-byte intact
//   idempotent       — two runs leave the routed file untouched + MEMORY.md content stable
//   adversarial 1    — malformed/leading frontmatter source → mirrored verbatim, title fallback
//   adversarial 2    — empty MEMORY.md → counted as error, NOT written, no throw
//   parseGalaxyIndex — pure-unit: H1 title extraction, empty→null, unreadable→null

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncGalaxyMemories, parseGalaxyIndex, reconcileGalaxies } from './obsidian-memory-sync.mjs';

// --- fixture helpers -------------------------------------------------------

// Build a tmp engines root with the given galaxies (each → engines/<g>/MEMORY.md = body).
// Galaxies whose body is null get a directory but NO MEMORY.md (failure-mode-2 fixture).
function makeEnginesRoot(galaxies) {
  const root = mkdtempSync(join(tmpdir(), 'prism-eng-'));
  for (const [g, body] of Object.entries(galaxies)) {
    const gdir = join(root, g);
    mkdirSync(gdir, { recursive: true });
    if (body !== null) writeFileSync(join(gdir, 'MEMORY.md'), body);
  }
  return root;
}

function makeVaultRoot() {
  return mkdtempSync(join(tmpdir(), 'prism-vault-'));
}

function cleanup(...dirs) {
  for (const d of dirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
}

const SAMPLE_BODY = `# CAD Galaxy MEMORY.md — per-domain index

## Master-brain link
- **UP (pull):** master memory dir
- **MASTER-INDEX edge:** master carries the [[cad]] back-pointer

## Cross-galaxy edges
- cad ↔ cam (strategy input)
- see [[engines/CADEngine|CADEngine]] and prism_cad
`;

// ---------------------------------------------------------------------------
// happy path
// ---------------------------------------------------------------------------
test('happy: mirrors a fixture galaxy MEMORY.md — frontmatter + body + [[links]] preserved', () => {
  const eng = makeEnginesRoot({ cad: SAMPLE_BODY });
  const vault = makeVaultRoot();
  try {
    const r = syncGalaxyMemories({ enginesRoot: eng, vaultRoot: vault, dry: false });

    assert.equal(r.mirrored, 1, 'one galaxy mirrored');
    assert.equal(r.errors, 0, 'no errors');
    assert.deepEqual(r.galaxies, ['cad']);

    const dest = join(vault, 'memories', 'galaxies', 'cad', 'MEMORY.md');
    assert.ok(existsSync(dest), 'MEMORY.md written into galaxies/cad/');
    const written = readFileSync(dest, 'utf8');

    // Obsidian frontmatter prepended (graph + bridge-v2 backlink pass).
    assert.match(written, /^---\n/, 'starts with YAML frontmatter');
    assert.match(written, /^type: galaxy-index$/m, 'carries type: galaxy-index');
    assert.match(written, /^galaxy: cad$/m, 'carries galaxy: cad');
    assert.match(written, /^source: prism-galaxy-index$/m, 'distinguishable source');

    // Body preserved VERBATIM (so every [[link]] survives for the graph).
    assert.ok(written.includes('# CAD Galaxy MEMORY.md'), 'original H1 body preserved');
    assert.ok(written.includes('[[cad]]'), 'wikilink #1 preserved');
    assert.ok(written.includes('[[engines/CADEngine|CADEngine]]'), 'wikilink #2 preserved');
    assert.ok(written.includes('cad ↔ cam'), 'unicode body content preserved');
  } finally {
    cleanup(eng, vault);
  }
});

// ---------------------------------------------------------------------------
// failure mode 1 — missing engines root
// ---------------------------------------------------------------------------
test('failure-1: missing engines root → {mirrored:0}, no throw', () => {
  const vault = makeVaultRoot();
  try {
    const missing = join(tmpdir(), 'prism-eng-does-not-exist-' + Date.now());
    const r = syncGalaxyMemories({ enginesRoot: missing, vaultRoot: vault, dry: false });
    assert.equal(r.mirrored, 0);
    assert.equal(r.errors, 0);
    assert.deepEqual(r.galaxies, []);
    // Nothing written into the vault.
    assert.ok(!existsSync(join(vault, 'memories', 'galaxies', 'cad')), 'no galaxy dir created');
  } finally {
    cleanup(vault);
  }
});

// ---------------------------------------------------------------------------
// failure mode 2 — galaxy dir without MEMORY.md is skipped (counted), not mirrored
// ---------------------------------------------------------------------------
test('failure-2: galaxy dir with no MEMORY.md → skipped, not mirrored', () => {
  const eng = makeEnginesRoot({ cad: SAMPLE_BODY, lib: null, plugins: null });
  const vault = makeVaultRoot();
  try {
    const r = syncGalaxyMemories({ enginesRoot: eng, vaultRoot: vault, dry: false });
    assert.equal(r.mirrored, 1, 'only the dir with a MEMORY.md is mirrored');
    assert.equal(r.skipped, 2, 'two MEMORY.md-less dirs skipped');
    assert.deepEqual(r.galaxies, ['cad']);
    assert.ok(!existsSync(join(vault, 'memories', 'galaxies', 'lib')), 'no dir for skipped galaxy');
  } finally {
    cleanup(eng, vault);
  }
});

// ---------------------------------------------------------------------------
// failure mode 3 — top-level enginesRoot/MEMORY.md (a FILE) is NOT a galaxy
// ---------------------------------------------------------------------------
test('failure-3: top-level enginesRoot/MEMORY.md file is NOT mirrored (only dirs are galaxies)', () => {
  const eng = makeEnginesRoot({ cad: SAMPLE_BODY });
  // Drop a top-level MEMORY.md FILE at the engines root (mirrors the real
  // engines/MEMORY.md parent-dir index that must be excluded).
  writeFileSync(join(eng, 'MEMORY.md'), '# Engines parent index\n');
  const vault = makeVaultRoot();
  try {
    const r = syncGalaxyMemories({ enginesRoot: eng, vaultRoot: vault, dry: false });
    assert.equal(r.mirrored, 1, 'only the real galaxy dir is mirrored');
    assert.ok(!r.galaxies.includes('MEMORY.md'), 'top-level MEMORY.md file not treated as a galaxy');
    // The parent-index content must NOT have leaked into any vault file.
    const dest = join(vault, 'memories', 'galaxies', 'cad', 'MEMORY.md');
    assert.ok(!readFileSync(dest, 'utf8').includes('Engines parent index'));
  } finally {
    cleanup(eng, vault);
  }
});

// ---------------------------------------------------------------------------
// no-clobber — pre-existing routed memory file is left byte-for-byte intact
// ---------------------------------------------------------------------------
test('no-clobber: existing routed reference_*.md in galaxies/<g>/ is untouched', () => {
  const eng = makeEnginesRoot({ cad: SAMPLE_BODY });
  const vault = makeVaultRoot();
  try {
    // Seed an already-shipped routed copy (the kind from commit 63bb5048fe).
    const cadVault = join(vault, 'memories', 'galaxies', 'cad');
    mkdirSync(cadVault, { recursive: true });
    const routedPath = join(cadVault, 'reference_delta_cad_domain_map.md');
    const ROUTED = '---\ntype: reference\nslot: delta\n---\n\n# Pre-existing routed memory\nDO NOT TOUCH\n';
    writeFileSync(routedPath, ROUTED);
    const gitkeep = join(cadVault, '.gitkeep');
    writeFileSync(gitkeep, '');

    const r = syncGalaxyMemories({ enginesRoot: eng, vaultRoot: vault, dry: false });
    assert.equal(r.mirrored, 1);

    // Routed file byte-for-byte intact (no overwrite, no duplicate).
    assert.equal(readFileSync(routedPath, 'utf8'), ROUTED, 'routed memory unchanged');
    assert.ok(existsSync(gitkeep), '.gitkeep untouched');
    // MEMORY.md is a NEW distinct file — never collides with routed *_*.md names.
    assert.ok(existsSync(join(cadVault, 'MEMORY.md')), 'MEMORY.md added alongside');
  } finally {
    cleanup(eng, vault);
  }
});

// ---------------------------------------------------------------------------
// idempotent — two runs: routed file untouched, MEMORY.md body stable
// ---------------------------------------------------------------------------
test('idempotent: second run leaves routed file intact + MEMORY.md body stable', () => {
  const eng = makeEnginesRoot({ cad: SAMPLE_BODY });
  const vault = makeVaultRoot();
  try {
    const cadVault = join(vault, 'memories', 'galaxies', 'cad');
    mkdirSync(cadVault, { recursive: true });
    const routedPath = join(cadVault, 'feedback_delta_rule.md');
    const ROUTED = '---\ntype: feedback\n---\n\nrule body\n';
    writeFileSync(routedPath, ROUTED);

    const r1 = syncGalaxyMemories({ enginesRoot: eng, vaultRoot: vault, dry: false });
    const dest = join(cadVault, 'MEMORY.md');
    // Strip the synced: timestamp line (the only intentionally-varying field).
    const stripSynced = (s) => s.replace(/^synced: .*$/m, 'synced: <ts>');
    const body1 = stripSynced(readFileSync(dest, 'utf8'));

    const r2 = syncGalaxyMemories({ enginesRoot: eng, vaultRoot: vault, dry: false });
    const body2 = stripSynced(readFileSync(dest, 'utf8'));

    assert.equal(r1.mirrored, 1);
    assert.equal(r2.mirrored, 1);
    assert.equal(body1, body2, 'MEMORY.md content stable across runs (modulo synced ts)');
    assert.equal(readFileSync(routedPath, 'utf8'), ROUTED, 'routed file still intact after 2 runs');
  } finally {
    cleanup(eng, vault);
  }
});

// ---------------------------------------------------------------------------
// adversarial 1 — malformed/leading source is mirrored verbatim w/ title fallback
// ---------------------------------------------------------------------------
test('adversarial-1: malformed source (no H1, junk frontmatter) → mirrored verbatim', () => {
  // No H1 anywhere, a half-open YAML fence, random unicode + a deep #heading.
  const MALFORMED = '---\nbroken: [unclosed\n\nsome text\n\n###### deep heading not the title\n � weird\n';
  const eng = makeEnginesRoot({ weird: MALFORMED });
  const vault = makeVaultRoot();
  try {
    const r = syncGalaxyMemories({ enginesRoot: eng, vaultRoot: vault, dry: false });
    assert.equal(r.mirrored, 1, 'malformed but non-empty file still mirrors (fail-soft)');
    assert.equal(r.errors, 0);
    const dest = join(vault, 'memories', 'galaxies', 'weird', 'MEMORY.md');
    const written = readFileSync(dest, 'utf8');
    // Our frontmatter prepended, original body verbatim below it.
    assert.match(written, /^galaxy: weird$/m);
    assert.ok(written.includes('broken: [unclosed'), 'malformed source body preserved verbatim');
    assert.ok(written.includes('deep heading not the title'), 'deep #heading not lost');
  } finally {
    cleanup(eng, vault);
  }
});

// ---------------------------------------------------------------------------
// adversarial 2 — empty MEMORY.md → counted error, NOT written, no throw
// ---------------------------------------------------------------------------
test('adversarial-2: empty MEMORY.md → error counted, nothing written, no throw', () => {
  const eng = makeEnginesRoot({ cad: SAMPLE_BODY, empty: '   \n  \n' });
  const vault = makeVaultRoot();
  try {
    const r = syncGalaxyMemories({ enginesRoot: eng, vaultRoot: vault, dry: false });
    assert.equal(r.mirrored, 1, 'only the non-empty galaxy mirrored');
    assert.equal(r.errors, 1, 'empty file counted as an error (R12 fail-loud in the count)');
    assert.ok(!r.galaxies.includes('empty'));
    assert.ok(!existsSync(join(vault, 'memories', 'galaxies', 'empty', 'MEMORY.md')),
      'empty galaxy produced no vault file');
  } finally {
    cleanup(eng, vault);
  }
});

// ---------------------------------------------------------------------------
// dry-run — no writes, but mirrored count still reported
// ---------------------------------------------------------------------------
test('dry-run: reports mirrored count but writes NOTHING', () => {
  const eng = makeEnginesRoot({ cad: SAMPLE_BODY, cam: SAMPLE_BODY });
  const vault = makeVaultRoot();
  try {
    const r = syncGalaxyMemories({ enginesRoot: eng, vaultRoot: vault, dry: true });
    assert.equal(r.mirrored, 2, 'dry-run still counts what it WOULD mirror');
    assert.ok(!existsSync(join(vault, 'memories', 'galaxies')), 'no galaxies dir created in dry-run');
  } finally {
    cleanup(eng, vault);
  }
});

// ---------------------------------------------------------------------------
// parseGalaxyIndex — pure-unit
// ---------------------------------------------------------------------------
test('parseGalaxyIndex: extracts first H1 as title, body verbatim', () => {
  const eng = makeEnginesRoot({ cad: SAMPLE_BODY });
  try {
    const p = parseGalaxyIndex(join(eng, 'cad', 'MEMORY.md'));
    assert.ok(p, 'returns a parse result');
    assert.equal(p.title, 'CAD Galaxy MEMORY.md — per-domain index', 'first H1 is the title');
    assert.equal(p.body, SAMPLE_BODY, 'body returned verbatim');
  } finally {
    cleanup(eng);
  }
});

test('parseGalaxyIndex: empty file → null; missing file → null (no throw)', () => {
  const eng = makeEnginesRoot({ empty: '\n   \n' });
  try {
    assert.equal(parseGalaxyIndex(join(eng, 'empty', 'MEMORY.md')), null, 'empty → null');
    assert.equal(parseGalaxyIndex(join(eng, 'nope', 'MEMORY.md')), null, 'missing → null');
  } finally {
    cleanup(eng);
  }
});

test('parseGalaxyIndex: no H1 → title null, body still returned', () => {
  const eng = makeEnginesRoot({ x: 'just prose, no heading\nline two\n' });
  try {
    const p = parseGalaxyIndex(join(eng, 'x', 'MEMORY.md'));
    assert.ok(p);
    assert.equal(p.title, null, 'no H1 → null title (caller still mirrors body)');
    assert.equal(p.body, 'just prose, no heading\nline two\n');
  } finally {
    cleanup(eng);
  }
});

// ---------------------------------------------------------------------------
// reconcileGalaxies — P3 idempotence: a mirrored MEMORY.md is NEVER quarantined
// ---------------------------------------------------------------------------

// Build a tmp galaxies-root with the given files per galaxy.
// galaxiesSpec :: { <galaxy>: { <filename>: <contents>, ... }, ... }
function makeGalaxiesRoot(galaxiesSpec) {
  const root = mkdtempSync(join(tmpdir(), 'prism-galaxies-'));
  for (const [g, files] of Object.entries(galaxiesSpec)) {
    const gdir = join(root, g);
    mkdirSync(gdir, { recursive: true });
    for (const [name, body] of Object.entries(files)) {
      writeFileSync(join(gdir, name), body);
    }
  }
  return root;
}

test('reconcileGalaxies: mirrored MEMORY.md is NOT moved to _stale/ (P3 idempotence)', () => {
  // cad galaxy holds ONLY the mirrored MEMORY.md (never part of currentPlacements).
  const root = makeGalaxiesRoot({ cad: { 'MEMORY.md': '# CAD galaxy index\nbody\n' } });
  try {
    // currentPlacements does NOT contain cad/MEMORY.md — pre-fix this would quarantine it.
    const quarantined = reconcileGalaxies(new Set(), root);

    assert.equal(quarantined, 0, 'nothing quarantined — MEMORY.md is excluded from the scan');
    // MEMORY.md still in place, byte-for-byte.
    assert.ok(existsSync(join(root, 'cad', 'MEMORY.md')), 'mirrored MEMORY.md left in place');
    assert.equal(
      readFileSync(join(root, 'cad', 'MEMORY.md'), 'utf8'),
      '# CAD galaxy index\nbody\n',
      'MEMORY.md content untouched',
    );
    // It was NOT copied into _stale/.
    assert.ok(!existsSync(join(root, '_stale', 'cad', 'MEMORY.md')), 'MEMORY.md NOT in _stale/');
  } finally {
    cleanup(root);
  }
});

test('reconcileGalaxies: idempotent across two runs — MEMORY.md survives both', () => {
  const root = makeGalaxiesRoot({ cam: { 'MEMORY.md': '# CAM galaxy index\n' } });
  try {
    const q1 = reconcileGalaxies(new Set(), root);
    const q2 = reconcileGalaxies(new Set(), root);
    assert.equal(q1, 0, 'first run quarantines nothing');
    assert.equal(q2, 0, 'second run quarantines nothing (idempotent)');
    assert.ok(existsSync(join(root, 'cam', 'MEMORY.md')), 'MEMORY.md still present after 2 runs');
    assert.ok(!existsSync(join(root, '_stale')), 'no _stale dir ever created');
  } finally {
    cleanup(root);
  }
});

test('reconcileGalaxies: a genuinely-stale routed file IS still quarantined (filter is selective, not a blanket skip)', () => {
  // A routed reference_*.md NOT in currentPlacements is real stale debt → must move.
  // MEMORY.md alongside it must NOT move. Proves the new clause excludes ONLY MEMORY.md.
  const root = makeGalaxiesRoot({
    cad: {
      'MEMORY.md': '# CAD galaxy index\n',
      'reference_stale_note.md': '# orphaned, reclassified away\n',
    },
  });
  try {
    const quarantined = reconcileGalaxies(new Set(), root);
    assert.equal(quarantined, 1, 'exactly the stale routed file is quarantined');
    assert.ok(existsSync(join(root, '_stale', 'cad', 'reference_stale_note.md')), 'stale file moved to _stale/');
    assert.ok(!existsSync(join(root, 'cad', 'reference_stale_note.md')), 'stale file removed from galaxy dir');
    // MEMORY.md untouched throughout.
    assert.ok(existsSync(join(root, 'cad', 'MEMORY.md')), 'MEMORY.md stays put');
    assert.ok(!existsSync(join(root, '_stale', 'cad', 'MEMORY.md')), 'MEMORY.md never quarantined');
  } finally {
    cleanup(root);
  }
});
