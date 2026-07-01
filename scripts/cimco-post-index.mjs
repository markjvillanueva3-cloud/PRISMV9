// cimco-post-index.mjs — index CIMCO's post-processor + controller-definition surface.
//
// Catalogs WHICH controllers CIMCO can already post to / model — the "post any machine"
// feasibility map for echo (post-processor) + the master-post goal. Two corpora:
//   - Posts/*.js     : CIMCO's own JS post processors (readable — parse PostInfo + globals)
//   - RPost/*.eRPost : vendor controller definitions (BINARY/compiled — name+vendor inventory only)
//
// Source: H:/prism/resources/cimco-2026/CIMCOEdit/{Posts,RPost} (verified 2026-06-02).
// Output: state/shared/cimco/post-index.json (schema-versioned).
//
// Wiki: [[cimco-verification-simulation-integration]] · Memory: reference_cimco_install_corpus_2026_06_02

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, basename } from "node:path";

export const DEFAULT_POSTS = "H:/prism/resources/cimco-2026/CIMCOEdit/Posts";
export const DEFAULT_RPOST = "H:/prism/resources/cimco-2026/CIMCOEdit/RPost";
export const DEFAULT_OUT = "H:/prism/state/shared/cimco/post-index.json";

function walk(dir, exts) {
  if (!existsSync(dir)) return [];
  let names;
  try {
    names = readdirSync(dir, { recursive: true });
  } catch {
    return [];
  }
  return names
    .map((n) => String(n).replace(/\\/g, "/"))
    .filter((rel) => exts.some((e) => rel.toLowerCase().endsWith(e)));
}

const _field = (block, re) => {
  const m = block.match(re);
  return m ? m[1].trim() : null;
};

/** Parse a CIMCO .js post's PostInfo + a few globals via tolerant regex (no eval). */
export function parseJsPost(absPath) {
  let txt;
  try {
    txt = readFileSync(absPath, "utf8");
  } catch (e) {
    return { parsed: false, error: e.code || e.message };
  }
  const piMatch = txt.match(/PostInfo\s*=\s*\{([\s\S]*?)\}/);
  const gMatch = txt.match(/globals\s*=\s*\{([\s\S]*?)\}/);
  if (!piMatch) return { parsed: false, error: "no PostInfo block" };
  const pi = piMatch[1];
  const g = gMatch ? gMatch[1] : "";
  return {
    parsed: true,
    title: _field(pi, /title\s*:\s*['"]([^'"]*)['"]/),
    summary: _field(pi, /summary\s*:\s*['"]([^'"]*)['"]/),
    type: _field(pi, /type\s*:\s*([A-Za-z_]\w*)/) || _field(pi, /type\s*:\s*['"]([^'"]*)['"]/),
    author: _field(pi, /author\s*:\s*['"]([^'"]*)['"]/),
    version: _field(pi, /version\s*:\s*['"]([^'"]*)['"]/),
    diameterProgramming: /xDiameterProg\s*:\s*true/.test(g) ? true : /xDiameterProg\s*:\s*false/.test(g) ? false : null,
    xAxisName: _field(g, /xAxisName\s*:\s*['"]([^'"]*)['"]/),
    zAxisName: _field(g, /zAxisName\s*:\s*['"]([^'"]*)['"]/),
  };
}

/** Build the post + controller inventory. */
export function buildPostIndex(postsDir = DEFAULT_POSTS, rpostDir = DEFAULT_RPOST) {
  const jsRel = walk(postsDir, [".js"]);
  const jsPosts = jsRel.map((rel) => ({ file: rel, ...parseJsPost(`${postsDir}/${rel}`) }));

  const rpRel = walk(rpostDir, [".erpost", ".erpostext"]);
  const rposts = rpRel.map((rel) => {
    const parts = rel.split("/");
    const vendor = parts.length > 1 ? parts[0] : "(root)";
    return { file: rel, vendor, name: basename(rel).replace(/\.(eRPost|eRPostExt)$/i, ""), binary: true };
  });

  const byType = {};
  for (const p of jsPosts) {
    if (!p.parsed) continue;
    const t = p.type || "unknown";
    byType[t] = (byType[t] || 0) + 1;
  }
  const vendors = {};
  for (const r of rposts) vendors[r.vendor] = (vendors[r.vendor] || 0) + 1;

  return {
    schemaVersion: "1.0.0",
    generatedFrom: { posts: postsDir, rpost: rpostDir },
    jsPostCount: jsPosts.length,
    jsParsedCount: jsPosts.filter((p) => p.parsed).length,
    rpostCount: rposts.length,
    vendorCount: Object.keys(vendors).length,
    byType,
    vendors,
    jsPosts,
    rposts,
    note: ".eRPost is binary/compiled (vendor+name inventory only — not text-authorable; needs CIMCO RPost editor). .js posts are readable/authorable.",
  };
}

export function writePostIndex(outPath = DEFAULT_OUT, postsDir = DEFAULT_POSTS, rpostDir = DEFAULT_RPOST) {
  const idx = buildPostIndex(postsDir, rpostDir);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(idx, null, 2) + "\n");
  return { outPath, jsPostCount: idx.jsPostCount, jsParsedCount: idx.jsParsedCount, rpostCount: idx.rpostCount, vendorCount: idx.vendorCount, byType: idx.byType };
}

// ─── CLI (argv-guarded) ──────────────────────────────────────────────────────
function _main(argv) {
  let out = DEFAULT_OUT, posts = DEFAULT_POSTS, rpost = DEFAULT_RPOST;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out = argv[++i];
    else if (argv[i] === "--posts") posts = argv[++i];
    else if (argv[i] === "--rpost") rpost = argv[++i];
  }
  try {
    process.stdout.write(JSON.stringify(writePostIndex(out, posts, rpost)) + "\n");
    return 0;
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    return 1;
  }
}

const _argv1 = process.argv[1];
if (_argv1 && (_argv1.endsWith("cimco-post-index.mjs") || _argv1.endsWith("cimco-post-index"))) {
  process.exit(_main(process.argv.slice(2)));
}
