/**
 * hmemv08-bases-validate.test.mjs — validator for the HMEMV08-OBSIDIAN-BASES
 * deliverable (3 frontmatter-pivoted Obsidian `.base` views over the PRISM
 * knowledge vault). Run:
 *   node --test scripts/__tests__/hmemv08-bases-validate.test.mjs
 *
 * Strategy (R9 — tests verify intent, not byte-presence):
 *  - loadBase() YAML-PARSES each .base via the eemeli/yaml package installed at
 *    mcp-server/node_modules/yaml (js-yaml is NOT installed). A malformed base
 *    THROWS — proving the validator parses, not just reads bytes (F1).
 *  - frontmatterFieldExists() greps `^<field>:` across a vault dir against the
 *    LIVE corpus, so the "every pivot field exists" proof (H3, F3) fails the
 *    instant someone pivots on a phantom field.
 *  - The wrong-vault-root adversarial check (A2) catches the single most likely
 *    implementer mistake: a `knowledge/`-prefixed or absolute inFolder path that
 *    silently matches ZERO files.
 *
 * Vault root = H:/prism/knowledge/ ; all base file.* paths are relative to it.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// repo root = two levels up from scripts/__tests__/
const REPO_ROOT = resolve(__dirname, "..", "..");
const VAULT_ROOT = join(REPO_ROOT, "knowledge");
const BASES_DIR = join(VAULT_ROOT, "bases");

// The `yaml` package lives in the mcp-server install (eemeli/yaml). Resolve it
// from there explicitly — there is no yaml at the repo root.
const mcpRequire = createRequire(join(REPO_ROOT, "mcp-server", "package.json"));
const YAML = mcpRequire("yaml");

const BASE_FILES = ["memory-by-type.base", "wiki-by-domain.base", "wiki-by-slot.base"];

/** YAML.parse a .base file; throws on bad YAML (that is the point). */
function loadBase(absPath) {
  const text = readFileSync(absPath, "utf8");
  return YAML.parse(text);
}

/** loadBase from a raw string (used by the malformed-YAML failure test). */
function parseBaseText(text) {
  return YAML.parse(text);
}

/**
 * Recursively list .md files under a vault-relative dir.
 * dirRel is relative to VAULT_ROOT, e.g. "memories" or "wiki".
 */
function listMd(dirRel) {
  const abs = join(VAULT_ROOT, dirRel);
  const out = [];
  if (!existsSync(abs)) return out;
  const stack = [abs];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync(cur, { withFileTypes: true });
    } catch {
      continue; // unreadable dir — skip, do not crash the whole walk
    }
    for (const e of entries) {
      const p = join(cur, e.name);
      if (e.isDirectory()) {
        stack.push(p);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        out.push(p);
      }
    }
  }
  return out;
}

/**
 * frontmatterFieldExists — true iff >=1 .md under dirRel has a frontmatter line
 * matching `^<field>:\s*\S` (tolerant of leading whitespace after the colon, so
 * the trailing-whitespace `type:` variants in the corpus do not fool it — A1).
 * Reads only the first ~40 lines of each file (frontmatter lives at the top) to
 * stay fast over a 4K+/17K-file corpus.
 */
function frontmatterFieldExists(field, dirRel) {
  const re = new RegExp("^" + field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":\\s*\\S");
  for (const f of listMd(dirRel)) {
    let head;
    try {
      head = readFileSync(f, "utf8").split(/\r?\n/, 40);
    } catch {
      continue;
    }
    for (const line of head) {
      if (re.test(line)) return true;
    }
  }
  return false;
}

/** Pull every groupBy.property across all views in a parsed base. */
function groupByProps(base) {
  const props = [];
  for (const v of base.views || []) {
    if (v.groupBy && v.groupBy.property) props.push(v.groupBy.property);
  }
  return props;
}

/** Raw text of a base (for substring adversarial checks). */
function rawText(name) {
  return readFileSync(join(BASES_DIR, name), "utf8");
}

// Which frontmatter field each base pivots, and which vault dir it must exist in.
const PIVOT_CORPUS = {
  "memory-by-type.base": { field: "type", dirRel: "memories" },
  "wiki-by-domain.base": { field: "galaxy", dirRel: "wiki" },
  "wiki-by-slot.base": { field: "owner_slot", dirRel: "wiki" },
};

// ---------------------------------------------------------------------------
// HAPPY PATH
// ---------------------------------------------------------------------------

test("H1 — all 3 .base files YAML-parse and have a non-empty views array", () => {
  for (const name of BASE_FILES) {
    const abs = join(BASES_DIR, name);
    assert.ok(existsSync(abs), `missing base file: ${name}`);
    const base = loadBase(abs);
    assert.ok(base && typeof base === "object", `${name} did not parse to an object`);
    assert.ok(Array.isArray(base.views), `${name} has no views array`);
    assert.ok(base.views.length >= 1, `${name} views array is empty`);
    // every view is a real view: type in {table,cards,list} + a name + non-empty order
    for (const v of base.views) {
      assert.ok(["table", "cards", "list", "map"].includes(v.type), `${name} bad view type ${v.type}`);
      assert.ok(typeof v.name === "string" && v.name.length > 0, `${name} view missing name`);
      assert.ok(Array.isArray(v.order) && v.order.length >= 1, `${name} view '${v.name}' missing order`);
    }
  }
});

test("H2 — memory-by-type pivots on `type` as a grouped table including the field in order", () => {
  const base = loadBase(join(BASES_DIR, "memory-by-type.base"));
  const v0 = base.views[0];
  assert.equal(v0.type, "table", "memory-by-type view[0] must be a table");
  assert.ok(v0.groupBy && v0.groupBy.property === "type", "view[0] must groupBy type");
  assert.ok(v0.order.includes("type"), "view[0] order must include the `type` field");
});

test("H3 — every pivot field exists in its real targeted corpus (cited refs)", () => {
  // type in memories
  assert.equal(frontmatterFieldExists("type", "memories"), true, "`type` must exist in knowledge/memories");
  // galaxy + owner_slot in wiki
  assert.equal(frontmatterFieldExists("galaxy", "wiki"), true, "`galaxy` must exist in knowledge/wiki");
  assert.equal(frontmatterFieldExists("owner_slot", "wiki"), true, "`owner_slot` must exist in knowledge/wiki");

  // Cited example files actually carry the claimed fields (anchors the proof).
  const cites = [
    ["memories/feedback/feedback_ai_first_development.md", /^type:\s*feedback\s*$/m],
    ["memories/reference/tribal-ai-ml-2026-24.md", /^type:\s*tribal-consolidation\s*$/m],
    ["memories/galaxies/academy/MEMORY.md", /^galaxy:\s*academy\s*$/m],
    ["wiki/academy/academy-pedagogy-foundations.md", /^owner_slot:\s*lima\s*$/m],
    ["wiki/bug-hunting/bug-hunting-source-atlas.md", /^owner_slot:\s*golf\s*$/m],
  ];
  for (const [rel, re] of cites) {
    const abs = join(VAULT_ROOT, rel);
    assert.ok(existsSync(abs), `cited reference file missing: ${rel}`);
    const text = readFileSync(abs, "utf8");
    assert.match(text, re, `cited file ${rel} no longer carries the claimed frontmatter`);
  }
});

// ---------------------------------------------------------------------------
// FAILURE MODES
// ---------------------------------------------------------------------------

test("F1 — malformed YAML is rejected (parser actually runs, not a byte-read stub)", () => {
  const bad = "views:\n  - type: table\n   name: bad\n"; // 3-space child indent under a 2-space list item
  assert.throws(() => parseBaseText(bad), /YAML|parse/i, "malformed base must throw on parse");
});

test("F2 — a base with no `views:` fails the structural check", () => {
  const noViews = parseBaseText("filters: {}\n");
  assert.equal(noViews.views, undefined, "fixture should have no views");
  // The structural invariant from H1 must reject this.
  assert.ok(!Array.isArray(noViews.views), "a base without a views array must not pass the views check");
});

test("F3 — phantom fields are detected; no base pivots on a non-existent field", () => {
  // A field that does not exist anywhere in the memory corpus -> false.
  assert.equal(
    frontmatterFieldExists("nonexistent_xyz", "memories"),
    false,
    "a guaranteed-absent field must report false",
  );
  // Known-absent PRISM frontmatter fields named in the blueprint.
  for (const phantom of ["priority", "due", "author"]) {
    assert.equal(
      frontmatterFieldExists(phantom, "memories"),
      false,
      `${phantom} must NOT exist in knowledge/memories frontmatter`,
    );
  }
  // Load-bearing: NO base groups by a field absent from its targeted corpus.
  for (const name of BASE_FILES) {
    const base = loadBase(join(BASES_DIR, name));
    const { dirRel } = PIVOT_CORPUS[name];
    for (const prop of groupByProps(base)) {
      // file.* are intrinsic file props, not frontmatter — skip those.
      if (prop.startsWith("file.")) continue;
      assert.equal(
        frontmatterFieldExists(prop, dirRel),
        true,
        `${name} groups by '${prop}' which does NOT exist in knowledge/${dirRel}`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// ADVERSARIAL
// ---------------------------------------------------------------------------

test("A1 — field-existence proof tolerates trailing-whitespace `type:` variants", () => {
  // The corpus has both `type: reference` and a trailing-whitespace variant.
  // The `^type:\s*\S` matcher must catch the bare/clean form regardless. Build a
  // synthetic temp-free assertion: the regex used by frontmatterFieldExists must
  // match a value that has trailing whitespace after the value too.
  const re = new RegExp("^type:\\s*\\S");
  assert.ok(re.test("type: reference"), "clean form must match");
  assert.ok(re.test("type:   feedback"), "extra leading whitespace after colon must match");
  assert.ok(re.test("type: reference   "), "trailing whitespace on value must still match");
  assert.ok(!re.test("type:"), "an empty `type:` (no value) must NOT match");
  assert.ok(!re.test("typewriter: x"), "a different field sharing a prefix must NOT match");
  // And it genuinely finds the field live.
  assert.equal(frontmatterFieldExists("type", "memories"), true);
});

test("A2 — no base uses a wrong vault-root path (would silently match ZERO files)", () => {
  // Vault root IS knowledge/, so a knowledge/-prefixed or absolute inFolder, or a
  // `file.folder == "knowledge"` comparison, matches nothing -> silent empty view.
  const forbidden = [
    'inFolder("knowledge/',
    'inFolder("knowledge\\',
    'inFolder("H:/',
    'inFolder("H:\\',
    'file.folder == "knowledge"',
    "file.folder == 'knowledge'",
  ];
  for (const name of BASE_FILES) {
    const text = rawText(name);
    for (const bad of forbidden) {
      assert.ok(
        !text.includes(bad),
        `${name} contains wrong-root path fragment ${JSON.stringify(bad)} (matches zero files)`,
      );
    }
    // Positive: each base targets a real vault-relative folder.
    assert.ok(
      text.includes('inFolder("memories")') || text.includes('inFolder("wiki")'),
      `${name} must filter on a real vault-root-relative folder`,
    );
  }
});
