#!/usr/bin/env node
/**
 * validate-pipeline-registry.mjs — COMMAND-KERNEL-MS0 / U-CK12
 *
 * Walks `knowledge/wiki/os/pipelines/**.md`, extracts the YAML frontmatter
 * between the leading `---` fences, validates against
 * `.claude/schemas/pipeline-frontmatter.schema.json`, and emits a
 * structured report:
 *
 *   {
 *     ok: boolean,
 *     scanned: number,
 *     valid: number,
 *     invalid:             [{ file, errors:[...] }],
 *     missing_frontmatter: [string],
 *     warnings:            [{ file, code, message }],
 *     coverage: { title:N, slug:N, kind:N, status:N, date:N, ... }
 *   }
 *
 * THE LOAD-BEARING WARNING (P1 mitigation from U-CK12 Arm-B scrutiny):
 * the pipeline schema CANNOT mechanically enforce "at least one of
 * composed_of / composes / stages must be present" because the CK06-
 * derived validator subset lacks `anyOf` and a top-level `oneOf` would
 * reject knowledge-injection.md (which has BOTH `composes` AND `stages`,
 * matching 2 branches). This script emits a `missing-steps-field`
 * WARNING for every entry that lacks all three — keeping the P1
 * mitigation honest at the validator layer instead of in the schema.
 *
 * Excludes `_*.md` (e.g. `_schema.md` — the schema doc itself) and
 * hidden files (`.gitkeep`) from the scan. Symlinks are skipped.
 *
 * No external deps — mirrors the CK06 validator subset:
 *   type / required / pattern / enum / minLength / maxLength /
 *   minimum / maximum / minItems / uniqueItems / format:date /
 *   additionalProperties (boolean) / oneOf / array items.
 *
 * Exit codes: 0 = all valid (or `--report-only`), 1 = at least one
 * invalid, 2 = setup / IO error. Warnings DO NOT change the exit code
 * (they are advisory by design — `--strict-warnings` flips that for CI).
 *
 * CLI:
 *   node scripts/validate-pipeline-registry.mjs               # JSON report
 *   node scripts/validate-pipeline-registry.mjs --human       # human-readable
 *   node scripts/validate-pipeline-registry.mjs --strict      # exit 1 on missing-frontmatter too
 *   node scripts/validate-pipeline-registry.mjs --strict-warnings  # exit 1 on any warning
 *   node scripts/validate-pipeline-registry.mjs --report-only      # always exit 0
 *   node scripts/validate-pipeline-registry.mjs --dir <abs>        # override scan dir
 *   node scripts/validate-pipeline-registry.mjs --schema <abs>     # override schema path
 *
 * @milestone COMMAND-KERNEL-MS0/U-CK12
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRISM_ROOT = path.resolve(__dirname, "..");
const DEFAULT_PIPELINES_DIR = path.join(PRISM_ROOT, "knowledge/wiki/os/pipelines");
const DEFAULT_SCHEMA_PATH = path.join(PRISM_ROOT, ".claude/schemas/pipeline-frontmatter.schema.json");

const STEPS_FIELDS = ["composed_of", "composes", "stages"];

// ---------- IO helpers -------------------------------------------------------

function readSchema(schemaPath) {
  const raw = fs.readFileSync(schemaPath, "utf-8");
  return JSON.parse(raw);
}

/**
 * List `*.md` files in the pipelines dir, excluding:
 *   - dotfiles (`.gitkeep`)
 *   - underscore-prefixed files (`_schema.md`, `_README.md`)
 *   - symlinks (consistent with U-CK07's symlink-skip policy)
 */
function listPipelineFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    if (ent.name.startsWith("_")) continue;
    if (!ent.name.endsWith(".md")) continue;
    const full = path.join(dir, ent.name);
    try {
      if (fs.lstatSync(full).isSymbolicLink()) continue;
    } catch { continue; }
    out.push(full);
  }
  out.sort();
  return out;
}

// ---------- Minimal YAML parser (CK06-equivalent subset) --------------------

/**
 * YAML→JS for the frontmatter subset: scalars (string/number/boolean),
 * block lists (`- item`), block mappings, flow arrays `[a, b]`, single-
 * and double-quoted strings. Comments (`#`) and block-scalars (`|`, `>`)
 * are NOT supported — frontmatter that needs them should be rewritten to
 * flow-style JSON-in-YAML.
 */
function parseYaml(text) {
  const lines = text.split(/\r?\n/);
  let i = 0;
  function parseValue(s) {
    s = s.trim();
    if (s === "" || s === "~" || s === "null") return null;
    if (s === "true") return true;
    if (s === "false") return false;
    if (/^-?\d+$/.test(s)) return Number(s);
    if (/^-?\d+\.\d+$/.test(s)) return Number(s);
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
    if (s.startsWith("[") && s.endsWith("]")) {
      const inner = s.slice(1, -1).trim();
      if (!inner) return [];
      return splitTopLevel(inner, ",").map(x => parseValue(x.trim()));
    }
    return s;
  }
  function splitTopLevel(str, sep) {
    const out = [];
    let depth = 0, q = null, cur = "";
    for (const c of str) {
      if (q) { cur += c; if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === "[" || c === "{") depth++;
      if (c === "]" || c === "}") depth--;
      if (c === sep && depth === 0) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    if (cur) out.push(cur);
    return out;
  }
  function indentOf(line) {
    const m = line.match(/^(\s*)/);
    return m ? m[1].length : 0;
  }
  function parseBlock(baseIndent) {
    const result = {};
    let arr = null;
    while (i < lines.length) {
      const raw = lines[i];
      if (raw.trim() === "" || raw.trim().startsWith("#")) { i++; continue; }
      const ind = indentOf(raw);
      if (ind < baseIndent) break;
      if (ind > baseIndent) break;
      const line = raw.slice(ind);
      if (line.startsWith("- ")) {
        if (!arr) arr = [];
        const itemBody = line.slice(2);
        if (itemBody.includes(":")) {
          i++;
          const item = parseListItem(baseIndent + 2, itemBody);
          arr.push(item);
        } else {
          arr.push(parseValue(itemBody));
          i++;
        }
        continue;
      }
      const colon = line.indexOf(":");
      if (colon < 0) { i++; continue; }
      const key = line.slice(0, colon).trim();
      const rest = line.slice(colon + 1);
      if (rest.trim() === "") {
        i++;
        const next = lines[i] && indentOf(lines[i]);
        if (next && next > baseIndent) {
          result[key] = parseBlock(next);
        } else {
          result[key] = null;
        }
      } else {
        result[key] = parseValue(rest);
        i++;
      }
    }
    return arr !== null ? arr : result;
  }
  function parseListItem(itemIndent, firstLineBody) {
    const item = {};
    const colon = firstLineBody.indexOf(":");
    if (colon < 0) {
      return parseValue(firstLineBody);
    }
    const key = firstLineBody.slice(0, colon).trim();
    const val = firstLineBody.slice(colon + 1).trim();
    if (val) item[key] = parseValue(val);
    while (i < lines.length) {
      const raw = lines[i];
      if (raw.trim() === "" || raw.trim().startsWith("#")) { i++; continue; }
      const ind = indentOf(raw);
      if (ind < itemIndent) break;
      const line = raw.slice(ind);
      if (line.startsWith("- ")) break;
      const c = line.indexOf(":");
      if (c < 0) { i++; continue; }
      const k = line.slice(0, c).trim();
      const v = line.slice(c + 1).trim();
      if (v) { item[k] = parseValue(v); i++; }
      else {
        i++;
        const next = lines[i] && indentOf(lines[i]);
        if (next && next > itemIndent) item[k] = parseBlock(next);
      }
    }
    return item;
  }
  return parseBlock(0);
}

function extractFrontmatter(content) {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("\n---", 3);
  if (end < 0) return null;
  const body = content.slice(3, end).replace(/^\r?\n/, "");
  try { return parseYaml(body); } catch { return null; }
}

// ---------- Minimal Draft-2020-12 subset validator (CK06-equivalent) --------

/** Returns array of error strings. Empty array = valid. */
function validate(value, schema, pathPrefix = "$") {
  const errs = [];
  if (schema.type) {
    const t = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
    if (Array.isArray(schema.type) ? !schema.type.includes(t) : t !== schema.type) {
      errs.push(`${pathPrefix}: type ${t}, expected ${schema.type}`);
      return errs;
    }
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errs.push(`${pathPrefix}: value ${JSON.stringify(value)} not in enum ${JSON.stringify(schema.enum)}`);
  }
  if (typeof value === "string") {
    if (schema.minLength != null && value.length < schema.minLength) {
      errs.push(`${pathPrefix}: length ${value.length} < minLength ${schema.minLength}`);
    }
    if (schema.maxLength != null && value.length > schema.maxLength) {
      errs.push(`${pathPrefix}: length ${value.length} > maxLength ${schema.maxLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errs.push(`${pathPrefix}: pattern mismatch ${schema.pattern}`);
    }
    if (schema.format === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      errs.push(`${pathPrefix}: invalid date format`);
    }
  }
  if (typeof value === "number") {
    if (schema.minimum != null && value < schema.minimum) errs.push(`${pathPrefix}: < minimum ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) errs.push(`${pathPrefix}: > maximum ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) errs.push(`${pathPrefix}: length ${value.length} < minItems ${schema.minItems}`);
    if (schema.uniqueItems) {
      const seen = new Set();
      for (const it of value) {
        const k = JSON.stringify(it);
        if (seen.has(k)) { errs.push(`${pathPrefix}: duplicate item ${k}`); break; }
        seen.add(k);
      }
    }
    if (schema.items) {
      value.forEach((v, idx) => errs.push(...validate(v, schema.items, `${pathPrefix}[${idx}]`)));
    }
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    if (Array.isArray(schema.required)) {
      for (const r of schema.required) {
        if (!(r in value)) errs.push(`${pathPrefix}: missing required field "${r}"`);
      }
    }
    if (schema.properties) {
      for (const [k, sub] of Object.entries(schema.properties)) {
        if (k in value) errs.push(...validate(value[k], sub, `${pathPrefix}.${k}`));
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      const known = new Set(Object.keys(schema.properties));
      for (const k of Object.keys(value)) {
        if (!known.has(k)) errs.push(`${pathPrefix}: unexpected property "${k}"`);
      }
    }
  }
  if (Array.isArray(schema.oneOf)) {
    let passes = 0;
    for (const sub of schema.oneOf) if (validate(value, sub, pathPrefix).length === 0) passes++;
    if (passes !== 1) errs.push(`${pathPrefix}: oneOf matched ${passes}/${schema.oneOf.length} alternatives (expected 1)`);
  }
  return errs;
}

// ---------- Advisory warnings (the P1 mitigation surface) -------------------

/**
 * Returns advisory warnings for one parsed frontmatter object. Warnings
 * are NEVER errors by default — they surface design-intent issues the
 * schema deliberately cannot enforce structurally.
 *
 * Currently emits:
 *  - `missing-steps-field`: no composed_of/composes/stages — the unit
 *    has no orchestration list. INTENTIONAL for pure-trigger pipelines
 *    (hook-only); a smell otherwise. Schema's `x-rationale.no_steps_required`
 *    documents the design choice + names this warning as enforcement.
 *  - `tier-budget-mismatch`: token_budget.tier names a tier whose ceiling
 *    the explicit max_tokens exceeds (entry-router 500 / coding 2000 /
 *    product-autopilot 5000). Catches the P2 unenforced coherence.
 *  - `deprecated-without-replacement`: status=deprecated but no
 *    `replacement` field. P2 unenforced coherence.
 */
function computeAdvisoryWarnings(fm) {
  const warnings = [];
  if (!fm || typeof fm !== "object" || Array.isArray(fm)) return warnings;
  // missing-steps-field
  const hasSteps = STEPS_FIELDS.some((k) => Array.isArray(fm[k]) && fm[k].length > 0);
  if (!hasSteps) {
    warnings.push({
      code: "missing-steps-field",
      message: `no composed_of / composes / stages — pipeline has no orchestration list. Intentional only for pure-trigger pipelines (hook-only). See pipeline-frontmatter.schema.json x-rationale.no_steps_required.`,
    });
  }
  // tier-budget-mismatch
  const TIER_CEILINGS = { "entry-router": 500, "coding": 2000, "product-autopilot": 5000 };
  const tb = fm.token_budget;
  if (tb && typeof tb === "object" && !Array.isArray(tb)) {
    const ceiling = TIER_CEILINGS[tb.tier];
    if (ceiling != null && typeof tb.max_tokens === "number" && tb.max_tokens > ceiling) {
      warnings.push({
        code: "tier-budget-mismatch",
        message: `token_budget.tier=${tb.tier} names ceiling ${ceiling} but max_tokens=${tb.max_tokens} exceeds it. Either lower max_tokens, switch tier to 'custom', or update the tier ceiling in the schema.`,
      });
    }
  }
  // deprecated-without-replacement
  if (fm.status === "deprecated" && (typeof fm.replacement !== "string" || fm.replacement.length === 0)) {
    warnings.push({
      code: "deprecated-without-replacement",
      message: `status=deprecated but no replacement slug — downstream consumers cannot route to a successor pipeline.`,
    });
  }
  return warnings;
}

// ---------- Report builder (pure) -------------------------------------------

/**
 * Pure: given a parsed schema, a list of {file, content} entries, and the
 * scan dir, produce a structured report. No IO. The CLI is a thin shell
 * around this function — keeps the test surface hermetic.
 */
function buildReport({ schema, entries, root = PRISM_ROOT }) {
  const report = {
    ok: true,
    scanned: entries.length,
    valid: 0,
    invalid: [],
    missing_frontmatter: [],
    warnings: [],
    coverage: {
      title: 0, slug: 0, kind: 0, status: 0, date: 0,
      milestone: 0, unit: 0, author: 0, trigger: 0,
      composed_of: 0, composes: 0, stages: 0,
      token_budget: 0, downgrade: 0, telemetry: 0,
      consumes: 0, produces: 0, replacement: 0,
    },
  };
  for (const { file, content } of entries) {
    const fm = extractFrontmatter(content);
    const rel = path.relative(root, file).replace(/\\/g, "/");
    if (!fm) { report.missing_frontmatter.push(rel); continue; }
    for (const k of Object.keys(report.coverage)) {
      if (k in fm) report.coverage[k]++;
    }
    const errs = validate(fm, schema, "$");
    if (errs.length === 0) report.valid++;
    else { report.invalid.push({ file: rel, errors: errs }); report.ok = false; }
    const ws = computeAdvisoryWarnings(fm);
    for (const w of ws) report.warnings.push({ file: rel, ...w });
  }
  return report;
}

// ---------- CLI -------------------------------------------------------------

function parseArgs(argv) {
  const args = new Set();
  let dir = DEFAULT_PIPELINES_DIR;
  let schemaPath = DEFAULT_SCHEMA_PATH;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dir" && argv[i + 1]) { dir = argv[++i]; continue; }
    if (a === "--schema" && argv[i + 1]) { schemaPath = argv[++i]; continue; }
    args.add(a);
  }
  return { args, dir, schemaPath };
}

function run() {
  const { args, dir, schemaPath } = parseArgs(process.argv.slice(2));
  const human = args.has("--human");
  const strict = args.has("--strict");
  const strictWarnings = args.has("--strict-warnings");
  const reportOnly = args.has("--report-only");

  let schema;
  try { schema = readSchema(schemaPath); }
  catch (e) {
    process.stderr.write(`failed to load schema ${schemaPath}: ${e.message}\n`);
    process.exit(2);
  }

  const files = listPipelineFiles(dir);
  const entries = files.map((f) => ({ file: f, content: fs.readFileSync(f, "utf-8") }));
  const report = buildReport({ schema, entries });

  if (strict && report.missing_frontmatter.length > 0) report.ok = false;
  if (strictWarnings && report.warnings.length > 0) report.ok = false;

  if (human) {
    process.stdout.write(`Scanned: ${report.scanned}\n`);
    process.stdout.write(`Valid:   ${report.valid}\n`);
    process.stdout.write(`Invalid: ${report.invalid.length}\n`);
    process.stdout.write(`Missing frontmatter: ${report.missing_frontmatter.length}\n`);
    process.stdout.write(`Warnings: ${report.warnings.length}\n\n`);
    process.stdout.write("Field coverage:\n");
    for (const [k, n] of Object.entries(report.coverage)) {
      process.stdout.write(`  ${k.padEnd(24)} ${n}\n`);
    }
    if (report.invalid.length) {
      process.stdout.write("\nInvalid:\n");
      for (const inv of report.invalid.slice(0, 5)) {
        process.stdout.write(`  ${inv.file}\n`);
        for (const e of inv.errors.slice(0, 3)) process.stdout.write(`    · ${e}\n`);
      }
    }
    if (report.warnings.length) {
      process.stdout.write("\nWarnings:\n");
      for (const w of report.warnings.slice(0, 10)) {
        process.stdout.write(`  ${w.file} [${w.code}]\n    · ${w.message}\n`);
      }
    }
  } else {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  }

  if (reportOnly) process.exit(0);
  process.exit(report.ok ? 0 : 1);
}

// ---------- Exports (test surface) ------------------------------------------

export {
  parseYaml,
  extractFrontmatter,
  validate,
  computeAdvisoryWarnings,
  buildReport,
  listPipelineFiles,
  parseArgs,
  DEFAULT_PIPELINES_DIR,
  DEFAULT_SCHEMA_PATH,
  STEPS_FIELDS,
};

// CLI entry guard.
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  run();
}
