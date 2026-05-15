#!/usr/bin/env node
/**
 * validate-command-frontmatter.mjs — U-CK06
 *
 * Walks .claude/commands/**.md, extracts the YAML frontmatter between the
 * leading `---` fences, and validates it against
 * `.claude/schemas/command-frontmatter.schema.json`. Emits a structured
 * report:
 *
 *   {
 *     ok: boolean,
 *     scanned: number,
 *     valid: number,
 *     invalid: { file, errors:[...] }[],
 *     missing_frontmatter: string[],
 *     coverage: { name:N, description:N, tier:N, triggers:N, ... }
 *   }
 *
 * No external deps — implements a minimal Draft 2020-12 subset sufficient
 * for the schema in use: type / required / pattern / enum / minLength /
 * maxLength / minimum / maximum / minItems / uniqueItems / format:date /
 * additionalProperties (object) / oneOf / array items.
 *
 * Exit codes: 0 = all valid (or `--report-only`), 1 = at least one
 * invalid, 2 = setup / IO error.
 *
 * CLI:
 *   node scripts/validate-command-frontmatter.mjs            # JSON report
 *   node scripts/validate-command-frontmatter.mjs --human    # human-readable
 *   node scripts/validate-command-frontmatter.mjs --strict   # exit 1 on any missing-frontmatter
 *   node scripts/validate-command-frontmatter.mjs --report-only   # always exit 0
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const COMMANDS_DIR = path.join(ROOT, ".claude/commands");
const SCHEMA_PATH = path.join(ROOT, ".claude/schemas/command-frontmatter.schema.json");

function readSchema() {
  const raw = fs.readFileSync(SCHEMA_PATH, "utf-8");
  return JSON.parse(raw);
}

function listCommandFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) listCommandFiles(p, acc);
    else if (ent.isFile() && ent.name.endsWith(".md")) acc.push(p);
  }
  return acc;
}

/**
 * Minimal YAML→JS parser scoped to the subset used by skill frontmatter:
 * scalars (strings / numbers / booleans), block lists (`- item`), block
 * mappings, and single-quoted / double-quoted strings. Comments (#) and
 * block-scalars (|, >) are intentionally NOT supported — frontmatter that
 * needs them should be rewritten to flow-style JSON-in-YAML.
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
      if (ind > baseIndent) break; // shouldn't happen at this level
      const line = raw.slice(ind);
      if (line.startsWith("- ")) {
        if (!arr) arr = [];
        const itemBody = line.slice(2);
        if (itemBody.includes(":")) {
          // List of mappings
          i++;
          // Re-parse the current line as the first key of a nested map
          const nestedLines = [" ".repeat(baseIndent + 2) + itemBody, ...lines.slice(i)];
          const savedLines = lines;
          let savedI = i;
          // We rebuild lines temporarily so parseBlock can recurse.
          // For simplicity, just split: the value of the list item is everything
          // indented > baseIndent.
          i = savedI;
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
        // Nested block
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
      i++;
      return parseValue(firstLineBody);
    }
    const key = firstLineBody.slice(0, colon).trim();
    const val = firstLineBody.slice(colon + 1).trim();
    if (val) item[key] = parseValue(val);
    i++;
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

/** Minimal Draft-2020-12 subset validator. Returns array of errors. */
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

function run() {
  const args = new Set(process.argv.slice(2));
  const human = args.has("--human");
  const strict = args.has("--strict");
  const reportOnly = args.has("--report-only");

  let schema;
  try { schema = readSchema(); }
  catch (e) {
    process.stderr.write(`failed to load schema: ${e.message}\n`);
    process.exit(2);
  }

  const files = listCommandFiles(COMMANDS_DIR);
  const report = {
    ok: true,
    scanned: files.length,
    valid: 0,
    invalid: [],
    missing_frontmatter: [],
    coverage: {
      name: 0, description: 0, version: 0, tier: 0, trigger: 0,
      consumes: 0, produces: 0, composes_with: 0, pipeline_integrations: 0,
      model: 0, effort: 0, allowed_tools: 0, context: 0,
    },
  };

  for (const f of files) {
    const content = fs.readFileSync(f, "utf-8");
    const fm = extractFrontmatter(content);
    const rel = path.relative(ROOT, f).replace(/\\/g, "/");
    if (!fm) { report.missing_frontmatter.push(rel); continue; }
    for (const k of Object.keys(report.coverage)) {
      if (k.replace(/_/g, "-") in fm || k in fm) report.coverage[k]++;
    }
    const errs = validate(fm, schema, "$");
    if (errs.length === 0) report.valid++;
    else { report.invalid.push({ file: rel, errors: errs }); report.ok = false; }
  }
  if (strict && report.missing_frontmatter.length > 0) report.ok = false;

  if (human) {
    process.stdout.write(`Scanned: ${report.scanned}\n`);
    process.stdout.write(`Valid:   ${report.valid}\n`);
    process.stdout.write(`Invalid: ${report.invalid.length}\n`);
    process.stdout.write(`Missing frontmatter: ${report.missing_frontmatter.length}\n\n`);
    process.stdout.write("Field coverage:\n");
    for (const [k, n] of Object.entries(report.coverage)) {
      process.stdout.write(`  ${k.padEnd(24)} ${n}\n`);
    }
    if (report.invalid.length) {
      process.stdout.write("\nFirst 5 invalid:\n");
      for (const inv of report.invalid.slice(0, 5)) {
        process.stdout.write(`  ${inv.file}\n`);
        for (const e of inv.errors.slice(0, 3)) process.stdout.write(`    · ${e}\n`);
      }
    }
  } else {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  }

  if (reportOnly) process.exit(0);
  process.exit(report.ok ? 0 : 1);
}

run();
