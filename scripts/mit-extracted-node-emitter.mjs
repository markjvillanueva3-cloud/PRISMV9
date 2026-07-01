#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";

const REPO_ROOT = "H:/prism";
const COURSES_DIR = path.join(REPO_ROOT, "knowledge/wiki/architecture/courses");
const NODES_DIR = path.join(REPO_ROOT, "knowledge/memories/reference");

function safeName(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function parseEntry(filePath, slug) {
  const src = fs.readFileSync(filePath, "utf8");
  const fm = src.match(/^---\n([\s\S]*?)\n---/);
  const front = fm ? fm[1] : "";
  const title = (front.match(/^title:\s*(.+)$/m) || [])[1] || slug;
  const code = (front.match(/^course_code:\s*"?([^"\n]+)"?$/m) || [])[1] || "?";
  const dept = (front.match(/^department:\s*(.+)$/m) || [])[1] || "?";
  const cat = (front.match(/^primary_category:\s*(.+)$/m) || [])[1] || "uncategorized";
  const extracted = (src.match(/^\|\s*What's extracted\s*\|\s*(.+?)\s*\|$/m) || [])[1] || "";
  const consumersRaw = (src.match(/^\|\s*Consuming engines\s*\|\s*(.+?)\s*\|$/m) || [])[1] || "";
  const consumers = [...consumersRaw.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]);
  const tokens = extracted.replace(/\.$/, "").split(/,\s*|\s+and\s+/).map(t => t.trim()).filter(Boolean);
  return { slug, title, code, dept, cat, tokens, consumers };
}

function writeNode(name, fm, body) {
  fs.writeFileSync(path.join(NODES_DIR, name + ".md"), "---\n" + fm + "\n---\n\n" + body + "\n");
}

function emitCourse(c) {
  const name = "node_course_" + safeName(c.slug);
  const fm = "name: " + name.replace(/_/g, "-") + "\ndescription: Node pointer for MIT course " + c.code + " " + c.title + " (" + c.dept + ", " + c.cat + ").\nmetadata:\n  type: reference\n  node_kind: course\n  course_code: \"" + c.code + "\"\n  category: " + c.cat;
  const body = "# Course node - " + c.code + " " + c.title + "\n\nPointer: [[" + c.slug + "]]. Department: " + c.dept + ". Category: `" + c.cat + "`.\n" + (c.consumers.length ? "Consuming engines: " + c.consumers.map(x => "[[" + x + "]]").join(", ") + "." : "");
  writeNode(name, fm, body);
}

function emitFormulas(c) {
  let n = 0;
  for (const tok of c.tokens.slice(0, 8)) {
    const name = "node_formula_mit_" + safeName(c.code) + "_" + safeName(tok).slice(0, 40);
    const fm = "name: " + name.replace(/_/g, "-") + "\ndescription: Node pointer for formula/concept extracted from MIT " + c.code + " — " + tok + ".\nmetadata:\n  type: reference\n  node_kind: formula\n  course_code: \"" + c.code + "\"";
    const body = "# Formula node - " + tok + " (MIT " + c.code + ")\n\nExtracted from [[" + c.slug + "]]. " + (c.consumers.length ? "Candidate engines: " + c.consumers.map(x => "[[" + x + "]]").join(", ") + "." : "No engines mapped — lima audit pending.");
    writeNode(name, fm, body);
    n++;
  }
  return n;
}

fs.mkdirSync(NODES_DIR, { recursive: true });
const files = fs.readdirSync(COURSES_DIR).filter(f => f.startsWith("mit-") && f.endsWith(".md")).sort();
let courseNodes = 0, formulaNodes = 0;
for (const f of files) {
  const slug = f.replace(/\.md$/, "");
  const c = parseEntry(path.join(COURSES_DIR, f), slug);
  emitCourse(c); courseNodes++;
  formulaNodes += emitFormulas(c);
}
console.log("courses=" + courseNodes + " formulas=" + formulaNodes);
