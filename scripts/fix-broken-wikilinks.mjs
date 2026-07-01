#!/usr/bin/env node
// U-GALAXY-MS1-B4 (2026-05-27, slot:alpha): broken-wikilink classifier+fixer for
// the ~4136 dangling [[name]] refs the operator surfaced.
//
// NEVER auto-deletes/auto-creates. Emits 3 buckets to a routing JSON:
//   (a) aliasable     — snake_case ↔ kebab-case sibling exists; safe to alias
//   (b) create-stub   — referenced from N≥2 places; missing target is real gap
//   (c) delete-orphan — referenced from N=1 place; missing target is likely typo
// Operator approves per-bucket; a SEPARATE migration script applies.
//
// Run: node scripts/fix-broken-wikilinks.mjs              # dry, emits routing JSON
//      node scripts/fix-broken-wikilinks.mjs --apply-aliases  # only safe alias-bucket
//
// Output: state/shared/broken-wikilink-routing.json

import fs from "node:fs";
import path from "node:path";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const SCAN_ROOTS = ["knowledge", "state/shared/specs", "mcp-server/src/engines"]
  .map(r => path.join(PRISM, r));
const OUTPUT = path.join(PRISM, "state/shared/broken-wikilink-routing.json");

const WIKILINK = /\[\[([a-zA-Z0-9_\-./]+?)(?:\|[^\]]*)?\]\]/g;

function walk(root, accept = () => true) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) out.push(...walk(p, accept));
    else if (e.isFile() && accept(p)) out.push(p);
  }
  return out;
}

function nameVariants(name) {
  // snake_case ↔ kebab-case ↔ no-case-changing aliases
  return new Set([
    name,
    name.replace(/_/g, "-"),
    name.replace(/-/g, "_"),
    name.toLowerCase(),
    name.toLowerCase().replace(/_/g, "-"),
    name.toLowerCase().replace(/-/g, "_"),
  ]);
}

function fileBasenameNoExt(p) {
  return path.basename(p, path.extname(p));
}

function main() {
  const args = process.argv.slice(2);
  const applyAliases = args.includes("--apply-aliases");

  // 1. Index every existing markdown filename (by basename no-ext + variants)
  const allMd = SCAN_ROOTS.flatMap(r => walk(r, p => p.endsWith(".md")));
  const existing = new Map(); // variant → real file path
  for (const f of allMd) {
    const base = fileBasenameNoExt(f);
    for (const v of nameVariants(base)) {
      if (!existing.has(v)) existing.set(v, f);
    }
  }
  // 2. Scan every .md for [[refs]] + collect dangling
  const dangling = new Map(); // missing-name → [{fromFile, count}]
  for (const f of allMd) {
    const content = fs.readFileSync(f, "utf8");
    const refs = [...content.matchAll(WIKILINK)].map(m => m[1]);
    for (const r of refs) {
      if (existing.has(r)) continue; // resolved
      if (!dangling.has(r)) dangling.set(r, new Map());
      const refsByFile = dangling.get(r);
      refsByFile.set(f, (refsByFile.get(f) || 0) + 1);
    }
  }
  // 3. Bucket
  const aliasable = []; const createStub = []; const deleteOrphan = [];
  for (const [missing, refsByFile] of dangling) {
    const refCount = [...refsByFile.values()].reduce((a, b) => a + b, 0);
    const sourceFiles = [...refsByFile.keys()];
    // (a) aliasable — does a variant resolve?
    let aliasTarget = null;
    for (const v of nameVariants(missing)) {
      if (v !== missing && existing.has(v)) { aliasTarget = existing.get(v); break; }
    }
    if (aliasTarget) {
      aliasable.push({ missing, aliasTarget, refCount, sources: sourceFiles });
      continue;
    }
    // (b) create-stub — N≥2 references
    if (refCount >= 2) {
      createStub.push({ missing, refCount, sources: sourceFiles });
      continue;
    }
    // (c) delete-orphan — N=1
    deleteOrphan.push({ missing, refCount, sources: sourceFiles });
  }

  const result = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    scanned: { files: allMd.length, indexedNames: existing.size },
    dangling: {
      total: dangling.size,
      aliasable: aliasable.length,
      createStub: createStub.length,
      deleteOrphan: deleteOrphan.length,
    },
    buckets: { aliasable, createStub, deleteOrphan },
  };

  if (!fs.existsSync(path.dirname(OUTPUT))) fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));

  console.log(`Scanned ${result.scanned.files} .md files (${result.scanned.indexedNames} indexed names).`);
  console.log(`Total dangling: ${result.dangling.total}`);
  console.log(`  Aliasable (safe fix):   ${result.dangling.aliasable}`);
  console.log(`  Create-stub (N≥2 refs): ${result.dangling.createStub}`);
  console.log(`  Delete-orphan (N=1):    ${result.dangling.deleteOrphan}`);
  console.log(`Output: ${OUTPUT}`);

  if (applyAliases && aliasable.length > 0) {
    console.log(`\n[--apply-aliases] would rewrite ${aliasable.length} broken [[refs]] in-place across N source files.`);
    console.log(`SAFETY GUARD: implementation NOT auto-enabled — operator runs sed/replace via a separate tool after reviewing the routing JSON.`);
  }
}

try { main(); } catch (e) {
  console.error("fix-broken-wikilinks crashed:", e.message);
  process.exit(1);
}
