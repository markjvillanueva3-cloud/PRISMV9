import fs from "fs";
const DIR = "H:/prism/mcp-server/src/data/";
function parsePairs(file, mfgKey) {
  const lines = fs.readFileSync(DIR + file, "utf8").split(/\r?\n/);
  const out = [];
  let cur = null;
  const mfgRe = new RegExp('^\\s*' + mfgKey + ':\\s*["\']([^"\']+)');
  const modelRe = /^\s*model:\s*["']([^"']+)/;
  for (const line of lines) {
    let m;
    if ((m = line.match(mfgRe))) { cur = m[1]; }
    else if ((m = line.match(modelRe)) && cur !== null) {
      out.push([cur, m[1]]);
      cur = null;
    }
  }
  return out;
}
// normalize: lowercase, strip spaces/dashes/underscores in model; canonicalize a few mfg aliases
function normMfg(s) {
  let x = s.toLowerCase().replace(/\s+/g, "").replace(/[-_]/g, "");
  const alias = {
    "dnsolutions": "doosan", "dmgmori": "dmgmori",
    "cincinnatimachine": "cincinnati",
    "mhimachinetool": "mhi", "huyndaiwia": "hyundaiwia",
  };
  return alias[x] || x;
}
function normModel(s) { return s.toLowerCase().replace(/\s+/g, "").replace(/[-_/]/g, ""); }
function keyOf([mfg, model]) { return normMfg(mfg) + "||" + normModel(model); }

const cat = parsePairs("machine-kinematics-catalog.ts", "manufacturer");
const enr = parsePairs("machine-kinematics-enriched.ts", "manufacturer");
const post = parsePairs("machine-post-enriched.ts", "brand");

const allRecords = [...cat, ...enr, ...post];
const normUnion = new Set(allRecords.map(keyOf));
console.log("raw total records (3 catalogs):", allRecords.length);
console.log("NORMALIZED distinct machines (case/space/dash-insensitive):", normUnion.size);

// normalized per source
const nCat = new Set(cat.map(keyOf)), nEnr = new Set(enr.map(keyOf)), nPost = new Set(post.map(keyOf));
console.log("norm distinct: catalog", nCat.size, "| enriched", nEnr.size, "| post", nPost.size);
console.log("catalog NOT in enriched (norm):", [...nCat].filter(x => !nEnr.has(x)).length);
console.log("post NOT in (cat+enr) (norm):", [...nPost].filter(x => !nEnr.has(x) && !nCat.has(x)).length);
console.log("cat NOT in (enr+post) (norm):", [...nCat].filter(x => !nEnr.has(x) && !nPost.has(x)).length);

// distinct normalized manufacturers
const mfgs = {};
for (const k of normUnion) { const m = k.split("||")[0]; mfgs[m] = (mfgs[m] || 0) + 1; }
const sorted = Object.entries(mfgs).sort((a, b) => b[1] - a[1]);
console.log("distinct normalized manufacturers:", sorted.length);
for (const [m, c] of sorted) console.log(`${c}\t${m}`);
