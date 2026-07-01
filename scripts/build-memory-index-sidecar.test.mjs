// Tests for build-memory-index-sidecar.mjs builder + the lib's tryLoadMemorySidecar
// fast-path. Hermetic via injected fs implementations + a tmpdir for the lib
// stale-gate end-to-end test.

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildSidecar, writeSidecarAtomically, collectGalaxyBrains, extractGalaxyDomainText } from "./build-memory-index-sidecar.mjs";
import {
  SIDECAR_SCHEMA_VERSION,
  tryLoadMemorySidecar,
  runMemoryIndexSearch,
  isSupersededMemory,
  SUPERSEDED_DECL_RE,
  domainBoost,
  DEFAULT_DOMAIN_BOOST,
  __test_constants,
} from "./lib/memory-index-search-lib.mjs";

function makeFakeFs(layout) {
  // Path-separator tolerant: keys normalized to forward-slashes so
  // node:path.join (which emits "\\" on Windows) still hits.
  const norm = (p) => String(p).replace(/\\/g, "/");
  const fileBodies = new Map();
  const dirMtimes = new Map();
  const fileMtimes = new Map();
  for (const [path, body] of Object.entries(layout)) {
    const k = norm(path);
    fileBodies.set(k, body);
    fileMtimes.set(k, 1_000_000);
    let parent = k.split("/").slice(0, -1).join("/");
    while (parent) {
      dirMtimes.set(parent, 1_000_000);
      parent = parent.split("/").slice(0, -1).join("/");
    }
  }
  const setDirMtime = (dir, mtime) => dirMtimes.set(norm(dir), mtime);
  const existsImpl = (p) => {
    const k = norm(p);
    return fileBodies.has(k) || dirMtimes.has(k);
  };
  const readdirImpl = (dir) => {
    const out = [];
    const prefix = norm(dir) + "/";
    for (const path of fileBodies.keys()) {
      if (path.startsWith(prefix)) {
        const rest = path.slice(prefix.length);
        if (!rest.includes("/")) out.push(rest);
      }
    }
    return out;
  };
  const statImpl = (p) => {
    const k = norm(p);
    if (fileBodies.has(k)) {
      const b = fileBodies.get(k);
      return { size: Buffer.byteLength(b, "utf8"), mtimeMs: fileMtimes.get(k) || 0 };
    }
    if (dirMtimes.has(k)) return { size: 0, mtimeMs: dirMtimes.get(k) };
    throw new Error("ENOENT " + p);
  };
  const readFileImpl = (p) => {
    const k = norm(p);
    if (!fileBodies.has(k)) throw new Error("ENOENT " + p);
    return fileBodies.get(k);
  };
  return { existsImpl, readdirImpl, statImpl, readFileImpl, setDirMtime, fileBodies };
}

const SAMPLE_BODY = `---
name: foo-bar
description: Test memory describing the foo-bar thing
metadata:
  type: reference
---

This is the opening paragraph of the foo-bar memory.

A second paragraph that should not be captured.
`;

describe("buildSidecar (builder)", () => {
  it("walks namespaces and emits one record per memory file", () => {
    const fs = makeFakeFs({
      "/v/feedback/alpha.md": SAMPLE_BODY,
      "/v/reference/beta.md": SAMPLE_BODY,
      "/v/project/gamma.md": SAMPLE_BODY,
    });
    const sc = buildSidecar({
      vaultRoot: "/v",
      namespaces: ["feedback", "reference", "project"],
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    });
    assert.equal(sc.schemaVersion, SIDECAR_SCHEMA_VERSION);
    assert.equal(sc.recordCount, 3);
    assert.equal(sc.records.length, 3);
    assert.ok(sc.sourceMtimeMs > 0);
  });

  it("skips MEMORY.md and MEMORY-ARCHIVE.md (those are index files)", () => {
    const fs = makeFakeFs({
      "/v/feedback/real.md": SAMPLE_BODY,
      "/v/feedback/MEMORY.md": SAMPLE_BODY,
      "/v/feedback/MEMORY-ARCHIVE.md": SAMPLE_BODY,
    });
    const sc = buildSidecar({
      vaultRoot: "/v",
      namespaces: ["feedback"],
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    });
    assert.equal(sc.recordCount, 1);
    assert.equal(sc.records[0].name, "real");
  });

  it("skips non-md files", () => {
    const fs = makeFakeFs({
      "/v/feedback/real.md": SAMPLE_BODY,
      "/v/feedback/notes.txt": "ignored",
      "/v/feedback/script.mjs": "ignored",
    });
    const sc = buildSidecar({
      vaultRoot: "/v",
      namespaces: ["feedback"],
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    });
    assert.equal(sc.recordCount, 1);
  });

  it("handles a missing namespace directory without throwing", () => {
    const fs = makeFakeFs({
      "/v/feedback/real.md": SAMPLE_BODY,
    });
    const sc = buildSidecar({
      vaultRoot: "/v",
      namespaces: ["feedback", "reference", "doesnotexist"],
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    });
    assert.equal(sc.recordCount, 1);
  });

  it("sorts records deterministically (namespace, then name)", () => {
    const fs = makeFakeFs({
      "/v/reference/zulu.md": SAMPLE_BODY,
      "/v/reference/alpha.md": SAMPLE_BODY,
      "/v/feedback/yankee.md": SAMPLE_BODY,
      "/v/feedback/bravo.md": SAMPLE_BODY,
    });
    const sc = buildSidecar({
      vaultRoot: "/v",
      namespaces: ["feedback", "reference"],
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    });
    assert.deepEqual(
      sc.records.map((r) => `${r.namespace}/${r.name}`),
      ["feedback/bravo", "feedback/yankee", "reference/alpha", "reference/zulu"],
    );
  });

  it("captures description from frontmatter and opening paragraph in body", () => {
    const fs = makeFakeFs({ "/v/feedback/foo.md": SAMPLE_BODY });
    const sc = buildSidecar({
      vaultRoot: "/v",
      namespaces: ["feedback"],
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    });
    const rec = sc.records[0];
    assert.match(rec.description, /Test memory describing the foo-bar thing/);
    assert.match(rec.opening, /opening paragraph of the foo-bar memory/);
    assert.equal(rec.opening.length <= 200, true);
  });

  it("returns sourceMtimeMs = max namespace-dir mtime", () => {
    const fs = makeFakeFs({
      "/v/feedback/a.md": SAMPLE_BODY,
      "/v/reference/b.md": SAMPLE_BODY,
    });
    fs.setDirMtime("/v/feedback", 1_500_000);
    fs.setDirMtime("/v/reference", 2_500_000);
    const sc = buildSidecar({
      vaultRoot: "/v",
      namespaces: ["feedback", "reference"],
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    });
    assert.equal(sc.sourceMtimeMs, 2_500_000);
  });
});

// ---------------------------------------------------------------------------
// A3 (2026-05-29 slot:alpha): index the 34 per-galaxy MEMORY.md brains.
// ---------------------------------------------------------------------------

// Galaxy brains live one-per-subdir under the engines root as MEMORY.md. The
// vault makeFakeFs readdir only returns immediate FILE children, so galaxy
// enumeration (which needs subdir NAMES) gets a purpose-built fake.
function makeGalaxyFs({ galaxies = {}, extraSubdirs = [], enginesRoot = "/eng", galaxyMtime = 2_000_000 } = {}) {
  const norm = (p) => String(p).replace(/\\/g, "/");
  const files = new Map();
  for (const [slug, body] of Object.entries(galaxies)) {
    files.set(`${enginesRoot}/${slug}/MEMORY.md`, body);
  }
  const subdirNames = [...Object.keys(galaxies), ...extraSubdirs];
  return {
    enginesRoot,
    existsImpl: (p) => {
      const k = norm(p);
      return files.has(k) || k === enginesRoot;
    },
    readdirImpl: (dir) => (norm(dir) === enginesRoot ? subdirNames : []),
    statImpl: (p) => {
      const k = norm(p);
      if (files.has(k)) return { mtimeMs: galaxyMtime, size: Buffer.byteLength(files.get(k), "utf8") };
      if (k === enginesRoot) return { mtimeMs: galaxyMtime, size: 0 };
      throw new Error("ENOENT " + p);
    },
    readFileImpl: (p) => {
      const k = norm(p);
      if (!files.has(k)) throw new Error("ENOENT " + p);
      return files.get(k);
    },
  };
}

const GALAXY_BODY_TOKENOPT = `# ALPHA Galaxy Memory — Token Optimization + Efficiency Hunting

Cross-session memory for the alpha slot. Append-only.`;

describe("collectGalaxyBrains (A3 — per-galaxy MEMORY.md indexing)", () => {
  it("collects one record per engines/<slug>/MEMORY.md (name=slug, namespace=galaxies)", () => {
    const fs = makeGalaxyFs({
      galaxies: {
        "token-optimization": GALAXY_BODY_TOKENOPT,
        "cad": "# CAD Galaxy Brain\n\nFeature recognition and STEP round-trip.",
      },
    });
    const { records, maxMtimeMs, skipped } = collectGalaxyBrains({
      enginesRoot: fs.enginesRoot,
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    });
    assert.equal(records.length, 2);
    assert.equal(skipped, 0);
    assert.ok(maxMtimeMs > 0);
    const tok = records.find((r) => r.name === "token-optimization");
    assert.ok(tok, "token-optimization brain should be indexed");
    assert.equal(tok.namespace, "galaxies");
    assert.equal(tok.fileName, "token-optimization/MEMORY.md");
  });

  it("derives the description from the leading H1 (galaxy brains carry no frontmatter)", () => {
    const fs = makeGalaxyFs({ galaxies: { "token-optimization": GALAXY_BODY_TOKENOPT } });
    const { records } = collectGalaxyBrains({
      enginesRoot: fs.enginesRoot,
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    });
    assert.match(records[0].description, /ALPHA Galaxy Memory — Token Optimization/);
  });

  it("skips a subdir with no MEMORY.md (it isn't a galaxy brain)", () => {
    const fs = makeGalaxyFs({
      galaxies: { "cad": "# CAD Galaxy Brain\n\nbody" },
      extraSubdirs: ["utils-no-brain", "node_modules"], // present as names but no MEMORY.md
    });
    const { records } = collectGalaxyBrains({
      enginesRoot: fs.enginesRoot,
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    });
    assert.equal(records.length, 1);
    assert.equal(records[0].name, "cad");
  });

  it("increments skipped (does not throw) when a galaxy MEMORY.md is unreadable", () => {
    // Fail-soft contract (R12): a brain that exists but can't be read is skipped,
    // not fatal — the other 33 brains + the whole vault must still index.
    const fs = makeGalaxyFs({
      galaxies: { "cad": "# CAD Galaxy Brain\n\nbody", "wedm": "# WEDM Galaxy Brain\n\nbody" },
    });
    const throwingRead = (p) => {
      if (String(p).replace(/\\/g, "/").endsWith("/wedm/MEMORY.md")) throw new Error("EACCES");
      return fs.readFileImpl(p);
    };
    const { records, skipped } = collectGalaxyBrains({
      enginesRoot: fs.enginesRoot,
      readdirImpl: fs.readdirImpl,
      readFileImpl: throwingRead,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    });
    assert.equal(records.length, 1, "the readable brain still indexes");
    assert.equal(records[0].name, "cad");
    assert.equal(skipped, 1, "the unreadable brain increments skipped, not throws");
  });

  it("returns empty (no throw) when the engines root is absent", () => {
    const { records, maxMtimeMs, skipped } = collectGalaxyBrains({
      enginesRoot: "/nope",
      existsImpl: () => false,
    });
    assert.deepEqual(records, []);
    assert.equal(maxMtimeMs, 0);
    assert.equal(skipped, 0);
  });
});

// Fixture mirroring the real cascade-index stub shape (lathe/wedm): boilerplate
// header + Master-brain block, then the DOMAIN-rich body.
const CASCADE_STUB_BRAIN = `# Lathe Galaxy MEMORY.md — per-domain memory cascade index (P1+P4 hybrid, 2026-05-27)

> **Per-domain memory cascade** per SCOPE-EXPANSION. Auto-loads when Claude edits under engines/lathe/.
>
> **Status: STUB / awaiting migration.**

---

## Master-brain link
- **UP (pull):** master memory — recall: \`prism_memory:semantic_search query="lathe" topK=20\`
- **DOWN (push):** write to master memory dir → fed by stop-obsidian-memory-feed.mjs
- **Last master-sync:** 2026-05-29

## Candidate lathe-domain memories
Filename heuristic: lathe, turning, css, g96, g97, threading, parting, grooving, boring-bar, swiss, hard-turn.

## What goes WHERE under lathe/
\`\`\`
feedback/  # G96 always paired with G50 RPM cap; boring-bar L/D <= 4 steel
\`\`\`
`;

describe("extractGalaxyDomainText (A3-enrichment)", () => {
  it("captures domain vocabulary (heading text + filename-heuristic + fenced rules), not the H1", () => {
    const t = extractGalaxyDomainText(CASCADE_STUB_BRAIN);
    assert.match(t, /Filename heuristic: lathe, turning, css, g96/);
    assert.match(t, /Candidate lathe-domain memories/);    // H2 heading text kept
    assert.match(t, /G96 always paired with G50/);          // fenced domain rule kept
    assert.doesNotMatch(t, /per-domain memory cascade index/); // H1 boilerplate dropped
  });

  it("drops the verbatim cascade-template boilerplate (Master-brain block, UP/DOWN, cascade, STUB)", () => {
    const t = extractGalaxyDomainText(CASCADE_STUB_BRAIN);
    assert.doesNotMatch(t, /Master-brain link/);
    assert.doesNotMatch(t, /Per-domain memory cascade/i);
    assert.doesNotMatch(t, /UP \(pull/);
    assert.doesNotMatch(t, /DOWN \(push/);
    assert.doesNotMatch(t, /Last master-sync/);
    assert.doesNotMatch(t, /Status: STUB/);
    assert.doesNotMatch(t, /prism_memory:semantic_search/);
  });

  it("drops the generic governance lead on RICH brains so domain terms aren't crowded out (Reviewer-B P2-1)", () => {
    // Mirrors the post-processor/token-optimization shape: H1 + a governance lead
    // paragraph + a Master-brain block, THEN the real domain content.
    const RICH_BRAIN = `# ECHO Galaxy Memory — Post-Processors (G-code emission)

Cross-session working brain for the echo slot. Append-only — older entries collapse to state/shared/MEMORY-RECENT.md per the central MEMORY.md size discipline.

## Master-brain link
> First compliant exemplar of MASTER-BRAIN-TEMPLATE (owner eats its own dogfood).

## Domain map
Controllers: Haas, Okuma, Fanuc, Hurco. MasterPost ships as product. JM .cps fleet.`;
    const t = extractGalaxyDomainText(RICH_BRAIN);
    assert.match(t, /Controllers: Haas, Okuma, Fanuc/);     // domain content survives
    assert.match(t, /MasterPost ships as product/);
    assert.doesNotMatch(t, /Cross-session working brain/);  // governance lead dropped
    assert.doesNotMatch(t, /older entries collapse/);
    assert.doesNotMatch(t, /MASTER-BRAIN-TEMPLATE/);
    assert.doesNotMatch(t, /eats its own dogfood/);
  });

  it("does NOT drop legitimate domain content that resembles governance words (e.g. DB append-only)", () => {
    // juliett's database galaxy legitimately discusses append-only .jsonl — bare
    // "append-only" must NOT be treated as boilerplate (only the distinctive
    // "older entries collapse" / "Cross-session memory" phrases are).
    const DB_BRAIN = `# Database Galaxy

## Storage model
Qdrant + AgentDB + SQLite-WAL + append-only .jsonl event logs with schema-version migration.`;
    const t = extractGalaxyDomainText(DB_BRAIN);
    assert.match(t, /append-only \.jsonl/);
    assert.match(t, /Qdrant \+ AgentDB \+ SQLite-WAL/);
  });

  it("caps at maxChars and returns '' on empty/non-string", () => {
    const long = "# H1\n\n" + "alpha beta gamma ".repeat(200);
    assert.ok(extractGalaxyDomainText(long, { maxChars: 120 }).length <= 120);
    assert.equal(extractGalaxyDomainText(""), "");
    assert.equal(extractGalaxyDomainText(null), "");
    assert.equal(extractGalaxyDomainText(undefined), "");
  });

  it("the enriched opening flows into the galaxy record's opening (collectGalaxyBrains)", () => {
    const fs = makeGalaxyFs({ galaxies: { "lathe": CASCADE_STUB_BRAIN } });
    const { records } = collectGalaxyBrains({
      enginesRoot: fs.enginesRoot,
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    });
    assert.equal(records.length, 1);
    // The DOMAIN signal ("turning") is now in opening — the whole point of the enrichment.
    assert.match(records[0].opening, /turning/);
    assert.doesNotMatch(records[0].opening, /per-domain memory cascade index/);
    // description still carries the H1 (galaxy name signal preserved).
    assert.match(records[0].description, /Lathe Galaxy MEMORY/);
  });
});

describe("buildSidecar galaxy-brain integration (A3)", () => {
  // Combined fake: serves both the vault namespace dirs (file children) and the
  // engines root (subdir names).
  function makeCombinedFs({ vault = {}, galaxies = {}, vaultRoot = "/v", enginesRoot = "/eng" }) {
    const norm = (p) => String(p).replace(/\\/g, "/");
    const files = new Map();
    const dirs = new Map();
    for (const [ns, fns] of Object.entries(vault)) {
      dirs.set(`${vaultRoot}/${ns}`, 1_000_000);
      for (const [fn, body] of Object.entries(fns)) files.set(`${vaultRoot}/${ns}/${fn}`, body);
    }
    dirs.set(enginesRoot, 9_000_000);
    for (const [slug, body] of Object.entries(galaxies)) files.set(`${enginesRoot}/${slug}/MEMORY.md`, body);
    const galaxySlugs = Object.keys(galaxies);
    return {
      existsImpl: (p) => { const k = norm(p); return files.has(k) || dirs.has(k); },
      readdirImpl: (dir) => {
        const k = norm(dir);
        if (k === enginesRoot) return galaxySlugs;
        const prefix = k + "/"; const out = [];
        for (const f of files.keys()) {
          if (f.startsWith(prefix)) { const rest = f.slice(prefix.length); if (!rest.includes("/")) out.push(rest); }
        }
        return out;
      },
      statImpl: (p) => {
        const k = norm(p);
        if (files.has(k)) return { mtimeMs: k.includes(enginesRoot) ? 9_500_000 : 1_000_000, size: Buffer.byteLength(files.get(k), "utf8") };
        if (dirs.has(k)) return { mtimeMs: dirs.get(k), size: 0 };
        throw new Error("ENOENT " + p);
      },
      readFileImpl: (p) => { const k = norm(p); if (!files.has(k)) throw new Error("ENOENT " + p); return files.get(k); },
    };
  }

  it("folds galaxy brains into the galaxies namespace and reports galaxyBrainCount", () => {
    const fs = makeCombinedFs({
      vault: { feedback: { "a.md": SAMPLE_BODY } },
      galaxies: { "token-optimization": GALAXY_BODY_TOKENOPT, "cad": "# CAD Galaxy Brain\n\nbody" },
    });
    const sc = buildSidecar({
      vaultRoot: "/v", namespaces: ["feedback"], galaxyEnginesRoot: "/eng",
      readdirImpl: fs.readdirImpl, readFileImpl: fs.readFileImpl, statImpl: fs.statImpl, existsImpl: fs.existsImpl,
    });
    assert.equal(sc.galaxyBrainCount, 2);
    const gx = sc.records.filter((r) => r.namespace === "galaxies");
    assert.equal(gx.length, 2);
    assert.equal(sc.recordCount, 3); // 1 vault + 2 galaxy
  });

  it("LOAD-BEARING: sourceMtimeMs stays VAULT-ONLY (galaxy mtime tracked separately)", () => {
    // The lib's staleness oracle compares sourceMtimeMs against vault dir mtimes.
    // Folding the fast-churning engines/ mtime into it would suppress the
    // 'sidecar stale' advisory that prompts a vault regen. Guard that contract.
    const fs = makeCombinedFs({
      vault: { feedback: { "a.md": SAMPLE_BODY } },
      galaxies: { "token-optimization": GALAXY_BODY_TOKENOPT },
    });
    const sc = buildSidecar({
      vaultRoot: "/v", namespaces: ["feedback"], galaxyEnginesRoot: "/eng",
      readdirImpl: fs.readdirImpl, readFileImpl: fs.readFileImpl, statImpl: fs.statImpl, existsImpl: fs.existsImpl,
    });
    assert.equal(sc.sourceMtimeMs, 1_000_000, "sourceMtimeMs must remain the vault-dir mtime, not the 9M+ galaxy mtime");
    assert.ok(sc.galaxyMtimeMs >= 9_000_000, "galaxy mtime is tracked separately for observability");
  });

  it("includeGalaxyBrains:false leaves the corpus vault-only (back-compat)", () => {
    const fs = makeCombinedFs({
      vault: { feedback: { "a.md": SAMPLE_BODY } },
      galaxies: { "token-optimization": GALAXY_BODY_TOKENOPT },
    });
    const sc = buildSidecar({
      vaultRoot: "/v", namespaces: ["feedback"], galaxyEnginesRoot: "/eng", includeGalaxyBrains: false,
      readdirImpl: fs.readdirImpl, readFileImpl: fs.readFileImpl, statImpl: fs.statImpl, existsImpl: fs.existsImpl,
    });
    assert.equal(sc.galaxyBrainCount, 0);
    assert.equal(sc.records.filter((r) => r.namespace === "galaxies").length, 0);
    assert.equal(sc.recordCount, 1);
  });
});

describe("writeSidecarAtomically", () => {
  it("writes via .tmp + rename (atomic) to the requested out path", () => {
    const written = new Map();
    const renames = [];
    const dirs = new Set();
    const sidecar = { schemaVersion: SIDECAR_SCHEMA_VERSION, records: [] };
    const out = writeSidecarAtomically({
      outPath: "/state/sidecar.json",
      sidecar,
      writeFileImpl: (p, data) => written.set(p, data),
      renameImpl: (from, to) => renames.push([from, to]),
      mkdirImpl: (p) => dirs.add(p),
      existsImpl: () => true,
    });
    assert.equal(out, "/state/sidecar.json");
    assert.equal(renames.length, 1);
    assert.ok(renames[0][0].includes(".tmp."));
    assert.equal(renames[0][1], "/state/sidecar.json");
    const writtenKey = [...written.keys()][0];
    assert.ok(writtenKey.includes(".tmp."));
  });

  it("creates the dir if missing", () => {
    const dirs = new Set();
    writeSidecarAtomically({
      outPath: "/missing/sidecar.json",
      sidecar: { schemaVersion: SIDECAR_SCHEMA_VERSION, records: [] },
      writeFileImpl: () => {},
      renameImpl: () => {},
      mkdirImpl: (p) => dirs.add(p),
      existsImpl: () => false,
    });
    assert.ok(dirs.has("/missing"));
  });

  it("refuses to write a null sidecar (R12 — refuse to clobber)", () => {
    assert.throws(
      () => writeSidecarAtomically({ sidecar: null }),
      /refusing to write empty sidecar/,
    );
  });
});

describe("tryLoadMemorySidecar (lib fast-path)", () => {
  it("returns null when knob PRISM_MEMORY_INDEX_SIDECAR_DISABLE=1", () => {
    const prev = process.env.PRISM_MEMORY_INDEX_SIDECAR_DISABLE;
    process.env.PRISM_MEMORY_INDEX_SIDECAR_DISABLE = "1";
    try {
      const r = tryLoadMemorySidecar({
        sidecarPath: "/any.json",
        existsImpl: () => true,
        readFileImpl: () => "{}",
      });
      assert.equal(r, null);
    } finally {
      if (prev === undefined) delete process.env.PRISM_MEMORY_INDEX_SIDECAR_DISABLE;
      else process.env.PRISM_MEMORY_INDEX_SIDECAR_DISABLE = prev;
    }
  });

  it("returns null silently when sidecar file is absent", () => {
    const r = tryLoadMemorySidecar({
      sidecarPath: "/missing.json",
      existsImpl: () => false,
    });
    assert.equal(r, null);
  });

  it("returns null on schema-version mismatch (R12 stderr-warns)", () => {
    const r = tryLoadMemorySidecar({
      sidecarPath: "/sc.json",
      existsImpl: () => true,
      readFileImpl: () => JSON.stringify({ schemaVersion: "9.9.9", records: [], sourceMtimeMs: 1 }),
      statImpl: () => ({ mtimeMs: 0 }),
    });
    assert.equal(r, null);
  });

  it("returns null on unparseable JSON", () => {
    const r = tryLoadMemorySidecar({
      sidecarPath: "/sc.json",
      existsImpl: () => true,
      readFileImpl: () => "not json {{{",
    });
    assert.equal(r, null);
  });

  it("returns null when records is not an array (malformed)", () => {
    const r = tryLoadMemorySidecar({
      sidecarPath: "/sc.json",
      existsImpl: () => true,
      readFileImpl: () => JSON.stringify({
        schemaVersion: SIDECAR_SCHEMA_VERSION,
        records: "oops",
        sourceMtimeMs: 1,
      }),
    });
    assert.equal(r, null);
  });

  it("returns null when sourceMtimeMs is missing", () => {
    const r = tryLoadMemorySidecar({
      sidecarPath: "/sc.json",
      existsImpl: () => true,
      readFileImpl: () => JSON.stringify({
        schemaVersion: SIDECAR_SCHEMA_VERSION,
        records: [],
      }),
    });
    assert.equal(r, null);
  });

  it("USES a stale sidecar anyway (U-OBF graceful degradation — live-scan reserved for corruption)", () => {
    // U-OBF (2026-05-29 slot:alpha) flipped staleness from fatal→advisory: a stale
    // sidecar (missing only memories added since the last regen) is still vastly
    // cheaper than a live-scan over the 11k+-file vault that blows the UPS timeout
    // (the production no-fire bug). So tryLoadMemorySidecar returns the records,
    // not null. Only genuine corruption (unparseable/schema/malformed) → null→live.
    const norm = (p) => String(p).replace(/\\/g, "/");
    const records = [{ name: "stale-rec", fileName: "stale-rec.md", namespace: "feedback", description: "d", opening: "o" }];
    const r = tryLoadMemorySidecar({
      sidecarPath: "/sc.json",
      vaultRoot: "/v",
      namespaces: ["feedback"],
      existsImpl: (p) => {
        const k = norm(p);
        return k === "/sc.json" || k === "/v/feedback";
      },
      readFileImpl: () => JSON.stringify({
        schemaVersion: SIDECAR_SCHEMA_VERSION,
        records,
        sourceMtimeMs: 1000, // < the 5000 vault-dir mtime below → STALE
      }),
      statImpl: (p) => {
        if (norm(p) === "/v/feedback") return { mtimeMs: 5000 };
        return { mtimeMs: 0 };
      },
    });
    assert.ok(Array.isArray(r), "stale sidecar should be used (records returned), not discarded to null");
    assert.equal(r.length, 1);
    assert.equal(r[0].name, "stale-rec");
  });

  it("returns records[] on a fresh, valid sidecar", () => {
    const records = [{ name: "a", fileName: "a.md", namespace: "feedback", description: "x", opening: "y" }];
    const r = tryLoadMemorySidecar({
      sidecarPath: "/sc.json",
      vaultRoot: "/v",
      namespaces: ["feedback"],
      existsImpl: (p) => p === "/sc.json" || p === "/v/feedback",
      readFileImpl: () => JSON.stringify({
        schemaVersion: SIDECAR_SCHEMA_VERSION,
        records,
        sourceMtimeMs: 10_000,
      }),
      statImpl: () => ({ mtimeMs: 5000 }),
    });
    assert.equal(Array.isArray(r), true);
    assert.equal(r.length, 1);
    assert.equal(r[0].name, "a");
  });
});

describe("runMemoryIndexSearch with sidecar fast-path", () => {
  it("uses sidecar records when present and reports source:'sidecar'", () => {
    const records = [
      { name: "foo-bar", fileName: "foo-bar.md", namespace: "feedback",
        description: "Test memory about cutting tools", opening: "details on cutting tools" },
      { name: "baz", fileName: "baz.md", namespace: "reference",
        description: "something else", opening: "irrelevant content" },
    ];
    const sidecarJson = JSON.stringify({
      schemaVersion: SIDECAR_SCHEMA_VERSION,
      records,
      sourceMtimeMs: 10_000,
    });
    const { tokens, hits, source } = runMemoryIndexSearch("cutting tools query", {
      sidecarPath: "/sc.json",
      vaultRoot: "/v",
      namespaces: ["feedback"],
      existsImpl: (p) => p === "/sc.json" || p === "/v/feedback",
      readFileImpl: () => sidecarJson,
      statImpl: () => ({ mtimeMs: 5000 }),
      readdirImpl: () => [],
    });
    assert.equal(source, "sidecar");
    assert.ok(tokens.length >= 2);
    assert.ok(hits.length >= 1);
    assert.equal(hits[0].name, "foo-bar");
  });

  it("falls back to live scan when sidecar is CORRUPT and reports source:'live'", () => {
    // Post-U-OBF the ONLY trigger for a live-scan is genuine corruption (a stale
    // sidecar is now used as-is — see the staleness test above). An unparseable
    // sidecar → tryLoadMemorySidecar returns null → runMemoryIndexSearch live-scans
    // the vault. This keeps the live-scan branch under coverage.
    const corruptSidecar = "not json {{{ corrupt";
    const liveBody = `---
description: live-scan memory about cutting tools
---

Content body here.`;
    const fs = makeFakeFs({ "/v/feedback/live-memo.md": liveBody });
    fs.setDirMtime("/v/feedback", 5000);

    const { source, hits } = runMemoryIndexSearch("cutting tools", {
      sidecarPath: "/sc.json",
      vaultRoot: "/v",
      namespaces: ["feedback"],
      existsImpl: (p) => p === "/sc.json" || fs.existsImpl(p),
      readFileImpl: (p) => p === "/sc.json" ? corruptSidecar : fs.readFileImpl(p),
      statImpl: (p) => p === "/sc.json" ? { mtimeMs: 5000 } : fs.statImpl(p),
      readdirImpl: fs.readdirImpl,
    });
    assert.equal(source, "live");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].name, "live-memo");
  });

  it("returns empty hits + source on empty query", () => {
    const r = runMemoryIndexSearch("", {
      sidecarPath: "/sc.json",
      existsImpl: () => false,
    });
    assert.deepEqual(r.hits, []);
  });
});

describe("end-to-end: build → write → load (real fs in tmpdir)", () => {
  it("round-trips through real disk", () => {
    const tmp = mkdtempSync(join(tmpdir(), "memidx-"));
    try {
      mkdirSync(join(tmp, "vault", "feedback"), { recursive: true });
      writeFileSync(join(tmp, "vault", "feedback", "alpha.md"), SAMPLE_BODY);
      writeFileSync(join(tmp, "vault", "feedback", "beta.md"), SAMPLE_BODY);

      const sc = buildSidecar({
        vaultRoot: join(tmp, "vault"),
        namespaces: ["feedback"],
        includeGalaxyBrains: false, // A3: vault-only round-trip — don't scan the real engines/ tree
      });
      assert.equal(sc.recordCount, 2);

      const outPath = join(tmp, "sidecar.json");
      writeSidecarAtomically({ outPath, sidecar: sc });
      assert.equal(existsSync(outPath), true);

      const reloaded = JSON.parse(readFileSync(outPath, "utf8"));
      assert.equal(reloaded.schemaVersion, SIDECAR_SCHEMA_VERSION);
      assert.equal(reloaded.records.length, 2);

      const loaded = tryLoadMemorySidecar({
        sidecarPath: outPath,
        vaultRoot: join(tmp, "vault"),
        namespaces: ["feedback"],
      });
      assert.equal(Array.isArray(loaded), true);
      assert.equal(loaded.length, 2);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("test_constants surfaces SIDECAR_* exports", () => {
  it("exports the schema version", () => {
    assert.equal(__test_constants.SIDECAR_SCHEMA_VERSION, "1.0.0");
    assert.equal(typeof __test_constants.DEFAULT_SIDECAR_PATH, "string");
  });
});

// MEMORY-RECALL-SUPERSEDE (2026-06-01 slot:golf) — formally-superseded memories
// are excluded from the recall corpus so no galaxy surfaces stale doctrine as
// current. Fixtures mirror the EXACT corpus syntax (verified against the live
// vault). The negative controls are the real false-positive traps.
const SUPERSEDED_DESC_FORM = `---
name: alpha-owns-reaper
description: "[SUPERSEDED 2026-05-16 → [[golf-owns-reaper]]] The alpha slot USED TO own the fleet reaper."
metadata:
  type: feedback
---

> **SUPERSEDED 2026-05-16 — see [[golf-owns-reaper]].** The golf slot now owns the fleet reaper.
`;
const SUPERSEDED_BODY_FORM = `---
name: old-rule
description: An older rule about something.
---

> **SUPERSEDED 2026-05-20 — see [[new-rule]].** Kept for provenance only.

Body text that mentions the old behavior.
`;
// The SUPERSEDER — present tense, must STAY in recall.
const SUPERSEDER_FORM = `---
name: golf-owns-reaper
description: "The golf slot owns the fleet reaper — SUPERSEDES the prior alpha-owns rule (2026-05-16). See [[alpha-owns-reaper]]."
metadata:
  type: feedback
---

Why golf instead of alpha: the shift unifies hygiene ownership.
`;
// Topical / status-enum mentions — must STAY in recall.
const STATUS_ENUM_FORM = `---
name: unblock-detect
description: Use a closed DONE_STATUSES allowlist.
---

The allowlist is complete/completed/consolidated/superseded/done; treat any
UNRECOGNIZED status as not-done.
`;
const CONCEPT_FORM = `---
name: never-delete-only-disable
description: Reversibility rule — never delete, only disable; mark superseded with a redirect.
---

When a doctrine is replaced, the old memory is kept and gets a supersession note.
`;

describe("isSupersededMemory (recall exclusion detector)", () => {
  it("matches the description-field redirect declaration", () => {
    assert.equal(isSupersededMemory(SUPERSEDED_DESC_FORM), true);
  });
  it("matches the body blockquote redirect declaration", () => {
    assert.equal(isSupersededMemory(SUPERSEDED_BODY_FORM), true);
  });
  it("does NOT match the SUPERSEDER (present-tense 'SUPERSEDES')", () => {
    assert.equal(isSupersededMemory(SUPERSEDER_FORM), false);
  });
  it("does NOT match a lowercase status-enum mention", () => {
    assert.equal(isSupersededMemory(STATUS_ENUM_FORM), false);
  });
  it("does NOT match a memory that merely discusses supersession", () => {
    assert.equal(isSupersededMemory(CONCEPT_FORM), false);
  });
  it("is case-sensitive on the past-tense token + null-safe", () => {
    assert.equal(isSupersededMemory("this rule was superseded by another"), false);
    assert.equal(isSupersededMemory(null), false);
    assert.equal(isSupersededMemory(""), false);
    assert.equal(SUPERSEDED_DECL_RE instanceof RegExp, true);
  });
});

describe("buildSidecar excludes superseded memories", () => {
  const layout = {
    "/v/feedback/alpha-owns-reaper.md": SUPERSEDED_DESC_FORM,
    "/v/feedback/golf-owns-reaper.md": SUPERSEDER_FORM,
    "/v/reference/unblock-detect.md": STATUS_ENUM_FORM,
    "/v/reference/plain.md": SAMPLE_BODY,
  };
  const opts = (extra) => ({
    vaultRoot: "/v",
    namespaces: ["feedback", "reference"],
    includeGalaxyBrains: false,
    ...extra,
  });

  it("drops the superseded memory but keeps the superseder + controls", () => {
    const fs = makeFakeFs(layout);
    const sc = buildSidecar(opts({
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    }));
    const names = sc.records.map((r) => r.name).sort();
    assert.deepEqual(names, ["golf-owns-reaper", "plain", "unblock-detect"]);
    assert.equal(sc.supersededSkipped, 1);
    assert.equal(sc.recordCount, 3);
  });

  it("retains superseded when excludeSuperseded:false (reversible knob)", () => {
    const fs = makeFakeFs(layout);
    const sc = buildSidecar(opts({
      excludeSuperseded: false,
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    }));
    assert.equal(sc.records.some((r) => r.name === "alpha-owns-reaper"), true);
    assert.equal(sc.supersededSkipped, 0);
    assert.equal(sc.recordCount, 4);
  });
});

describe("runMemoryIndexSearch live-scan honors supersession exclusion", () => {
  it("never returns a superseded memory; surfaces the superseder instead", () => {
    const fs = makeFakeFs({
      "/v/feedback/alpha-owns-reaper.md": SUPERSEDED_DESC_FORM,
      "/v/feedback/golf-owns-reaper.md": SUPERSEDER_FORM,
    });
    // No sidecar present at this path → forces the live-scan branch.
    const res = runMemoryIndexSearch("reaper owns fleet", {
      vaultRoot: "/v",
      namespaces: ["feedback"],
      sidecarPath: "/nonexistent/sidecar.json",
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
    });
    assert.equal(res.source, "live");
    const hitNames = res.hits.map((h) => h.name);
    assert.equal(hitNames.includes("alpha-owns-reaper"), false);
    assert.equal(hitNames.includes("golf-owns-reaper"), true);
  });
});

// MEMORY-RECALL-DOMAIN-BOOST (2026-06-01 slot:golf) — keep each galaxy's primary
// domain context in recall via an ADDITIVE, RELEVANCE-GATED, OPT-IN boost.
describe("domainBoost (per-galaxy recall boost)", () => {
  it("boosts only the matching galaxy brain (galaxies namespace, name === domain)", () => {
    assert.equal(domainBoost({ namespace: "galaxies", name: "mill" }, "mill"), DEFAULT_DOMAIN_BOOST);
  });
  it("does NOT boost a different galaxy", () => {
    assert.equal(domainBoost({ namespace: "galaxies", name: "lathe" }, "mill"), 0);
  });
  it("does NOT boost a same-named record in another namespace", () => {
    assert.equal(domainBoost({ namespace: "reference", name: "mill" }, "mill"), 0);
  });
  it("is a no-op when boostDomain is falsy (opt-in)", () => {
    assert.equal(domainBoost({ namespace: "galaxies", name: "mill" }, null), 0);
    assert.equal(domainBoost({ namespace: "galaxies", name: "mill" }, ""), 0);
  });
  it("honors a custom weight + is null-safe", () => {
    assert.equal(domainBoost({ namespace: "galaxies", name: "mill" }, "mill", 5), 5);
    assert.equal(domainBoost(null, "mill"), 0);
  });
});

describe("runMemoryIndexSearch applies the domain boost additively (live-scan)", () => {
  // Both match "mill toolpath strategy". The reference note out-scores the brain
  // on raw BM25 (3 description hits @ W_DESC=2.5 = 7.5 vs the brain's name+body
  // = 3.0+1.0+1.0 = 5.0), so WITHOUT a boost the note ranks first.
  const fsLayout = {
    "/v/galaxies/mill.md": "# mill\n\nmilling toolpath strategy hub.\n",
    "/v/reference/notes.md": "---\ndescription: mill toolpath strategy roughing notes\n---\n\nSome body.\n",
  };
  const baseOpts = (extra) => {
    const fs = makeFakeFs(fsLayout);
    return {
      vaultRoot: "/v",
      namespaces: ["galaxies", "reference"],
      sidecarPath: "/nonexistent/sidecar.json",   // force live-scan
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
      ...extra,
    };
  };

  it("without boost: the reference note out-ranks the galaxy brain", () => {
    const res = runMemoryIndexSearch("mill toolpath strategy", baseOpts({}));
    assert.equal(res.source, "live");
    assert.equal(res.hits[0].name, "notes");
  });

  it("with boost: the slot's galaxy brain rises to #1 — note STILL present (additive, not suppressing)", () => {
    const res = runMemoryIndexSearch("mill toolpath strategy", baseOpts({ boostDomain: "mill" }));
    assert.equal(res.hits[0].name, "mill");
    const names = res.hits.map((h) => h.name);
    assert.equal(names.includes("notes"), true);   // cross-domain hit NOT dropped
  });

  it("relevance-gated: a domain brain with ZERO query match is NOT injected by the boost", () => {
    const res = runMemoryIndexSearch("zzqqx nonexistentterm", baseOpts({ boostDomain: "mill" }));
    assert.equal(res.hits.length, 0);
  });
});
