/**
 * build-wedm-knowledge-index.mjs — compile the curated WEDM WIKI knowledge.
 *
 * The TRIBAL half of the wedm knowledge corpus already lives in
 * mcp-server/src/data/wedm-knowledge-tips.ts (canonical source, consumed live by
 * WEDMTribalRuntimeEngine + WEDMKnowledgeIndexEngine). This compiles the WIKI
 * half — curated code-tribal wedm-*.md tactic pages + wedm/wire lessons — into
 * mcp-server/data/state/WEDM_WIKI_KNOWLEDGE.json (array of RawWikiDoc) so the
 * dispatcher can unify tips + wiki at query time via
 * WEDMKnowledgeIndexEngine.compile(). Real-file E2E for the engine's injected
 * reader core (RGS-MS1 lesson). Invoke with node from the worktree root.
 * Knob PRISM_ROOT overrides the root (default = cwd). slot:mike / galaxy:wedm.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const ROOT = process.env.PRISM_ROOT || process.cwd();
const OUT = join(ROOT, "mcp-server/data/state/WEDM_WIKI_KNOWLEDGE.json");
const SCHEMA_VERSION = "1.0.0";
const SUMMARY_CAP = 700;

const SOURCES = [
  { dir: "knowledge/wiki/code-tribal", kind: "tactic", match: /^wedm-.*\.md$/i },
  { dir: "knowledge/wiki/lessons", kind: "lesson", match: /(wedm|wire-edm|wire).*\.md$/i },
];

function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) return { fm: {}, body: text };
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([a-zA-Z0-9_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let val = kv[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      val = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    } else {
      val = val.replace(/^["']|["']$/g, "");
    }
    fm[kv[1]] = val;
  }
  return { fm, body: text.slice(m[0].length) };
}

function distil(body) {
  const out = [];
  let lastHeading = "";
  for (const ln of body.split("\n")) {
    const h = /^#{2,4}\s+(.*)$/.exec(ln);
    if (h) { lastHeading = h[1].trim(); continue; }
    const b = /^\s*[-*]\s+(.*)$/.exec(ln);
    if (b && lastHeading) {
      out.push(lastHeading + ": " + b[1].replace(/\*\*/g, "").replace(/`/g, "").trim());
      lastHeading = "";
    }
    if (out.join(" · ").length > SUMMARY_CAP) break;
  }
  return (out.join(" · ") || body.replace(/\s+/g, " ")).slice(0, SUMMARY_CAP);
}

function firstHeadingTitle(body) {
  const m = /^#\s+(.*)$/m.exec(body);
  return m ? m[1].trim() : null;
}

const docs = [];
for (const src of SOURCES) {
  const dir = join(ROOT, src.dir);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!src.match.test(f)) continue;
    const path = src.dir + "/" + f;
    let text;
    // normalise CRLF→LF so the frontmatter + heading/bullet regexes match
    // regardless of the file's line endings (3 of the curated pages are CRLF).
    try { text = readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n"); } catch { continue; }
    const { fm, body } = parseFrontmatter(text);
    const tags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
    const topics = Array.isArray(fm.topics) ? fm.topics : (fm.topics ? [fm.topics] : []);
    docs.push({
      path,
      title: fm.title || firstHeadingTitle(body) || basename(f, ".md"),
      kind: src.kind,
      tags,
      topics,
      summary: distil(body),
      confidence: 90,
    });
  }
}

if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
const payload = { schemaVersion: SCHEMA_VERSION, generatedFrom: SOURCES.map((s) => s.dir), count: docs.length, docs };
writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
console.log("WEDM_WIKI_KNOWLEDGE.json: " + docs.length + " curated wiki docs -> " + OUT);
for (const d of docs) console.log("  [" + d.kind + "] " + d.title + "  (" + d.tags.length + " tags)");
