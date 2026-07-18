/**
 * Build PPG Asset Catalog — indexes all CPS posts, NC programs, and PRISM posts
 * from BOX directory, H drive, and test fixtures into a single catalog JSON.
 */
import fs from 'fs';
import path from 'path';

const catalog = {
  generated_at: new Date().toISOString(),
  cps_posts: [],
  nc_programs: [],
  step_models: [],
  prism_posts: [],
  summary: {}
};

// ── 1. CPS Posts from all sources (deduplicated by filename) ──
const cpsDirs = [
  'H:/prism/mcp-server/data/posts/fusion-cache',
  'H:/prism/mcp-server/data/posts/box-basic',
  'H:/prism/BOX/FUSION BASIC POSTS',
];
const seenPostFiles = new Set();
for (const cpsDir of cpsDirs) {
if (fs.existsSync(cpsDir)) {
  const files = fs.readdirSync(cpsDir).filter(f => f.endsWith('.cps'));
  for (const f of files) {
    if (seenPostFiles.has(f.toLowerCase())) continue;
    seenPostFiles.add(f.toLowerCase());
    const name = f.replace('.cps', '');
    const stats = fs.statSync(path.join(cpsDir, f));
    let vendor = 'Unknown', controller = 'generic_iso', types = ['mill'], axes = 3;

    const rules = [
      [/^haas/i, 'Haas', 'haas_ngc'],
      [/^fanuc/i, 'Fanuc', 'fanuc_31i'],
      [/^siemens/i, 'Siemens', 'siemens_840d'],
      [/^heidenhain/i, 'Heidenhain', 'heidenhain_tnc640'],
      [/^mazak/i, 'Mazak', 'mazak_smooth_ai'],
      [/^okuma/i, 'Okuma', 'okuma_osp_p300'],
      [/^dmg.mori/i, 'DMG MORI', 'dmg_celos_siemens'],
      [/^makino/i, 'Makino', 'fanuc_31i'],
      [/^doosan/i, 'Doosan', 'doosan_fanuc'],
      [/^brother/i, 'Brother', 'brother_speedio'],
      [/^hurco/i, 'Hurco', 'hurco_max5'],
      [/^datron/i, 'Datron', 'datron'],
      [/^citizen/i, 'Citizen', 'citizen_cincom'],
      [/^star/i, 'Star', 'star_fanuc'],
      [/^tormach/i, 'Tormach', 'tormach_pathpilot'],
      [/^robodrill/i, 'Fanuc', 'fanuc_31i'],
      [/^hermle/i, 'Hermle', 'heidenhain_tnc640'],
      [/^kern/i, 'Kern', 'heidenhain_tnc640'],
      [/^milltronics/i, 'Milltronics', 'generic_fanuc'],
      [/^mitsubishi/i, 'Mitsubishi', 'mitsubishi_m80'],
      [/^fadal/i, 'Fadal', 'generic_fanuc'],
      [/^fidia/i, 'Fidia', 'fidia'],
      [/^deckel/i, 'Deckel', 'heidenhain_tnc640'],
      [/^nakamura/i, 'Nakamura', 'fanuc_31i'],
      [/^toshiba/i, 'Toshiba', 'fanuc_31i'],
      [/^hwacheon/i, 'Hwacheon', 'fanuc_31i'],
      [/^kitamura/i, 'Kitamura', 'fanuc_31i'],
      [/^grbl/i, 'GRBL', 'grbl'],
      [/^amada/i, 'Amada', 'amada'],
      [/^mori.apt/i, 'Mori Seiki', 'fanuc_31i'],
    ];
    for (const [re, v, c] of rules) {
      if (re.test(name)) { vendor = v; controller = c; break; }
    }

    if (/turn|lathe|st-\d/i.test(name)) types = ['lathe'];
    if (/mill.turn|integrex|multus|nlx/i.test(name)) types = ['mill_turn'];
    if (/5.?ax|umc|variaxis|d\d00|a500|gm2/i.test(name)) { types = [...types.filter(t => t !== 'mill'), '5axis']; axes = 5; }
    if (/swiss|cincom/i.test(name)) types = ['swiss'];
    if (/laser/i.test(name)) types = ['laser'];
    if (/inspection/i.test(name)) types.push('inspection');
    if (/vr-/i.test(name)) { types = ['mill', '5axis']; axes = 5; }

    catalog.cps_posts.push({
      id: 'cps-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: name.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      vendor, controller,
      machine_types: [...new Set(types)],
      axes,
      source: 'cps',
      file: f,
      path: path.join(cpsDir, f).replace(/\\/g, '/'),
      size_bytes: stats.size
    });
  }
}
} // end for cpsDirs

// ── 2. NC Programs from test fixtures + BOX ──
const programDirs = [
  // Extracted from Box cloud → H drive
  { dir: 'H:/prism/mcp-server/data/programs/okuma', controller: 'okuma_osp_p300', vendor: 'Okuma' },
  { dir: 'H:/prism/mcp-server/data/programs/haas', controller: 'haas_ngc', vendor: 'Haas' },
  { dir: 'H:/prism/mcp-server/data/programs/hurco', controller: 'hurco_max5', vendor: 'Hurco' },
  // Test fixtures (curated real programs)
  { dir: 'H:/prism/mcp-server/src/__tests__/fixtures/okuma-programs', controller: 'okuma_osp_p300', vendor: 'Okuma' },
  { dir: 'H:/prism/mcp-server/src/__tests__/fixtures/haas-programs', controller: 'haas_ngc', vendor: 'Haas' },
  { dir: 'H:/prism/mcp-server/src/__tests__/fixtures/hurco-programs', controller: 'hurco_max5', vendor: 'Hurco' },
  // BOX local copies
  { dir: 'H:/prism/BOX/MACRO PROGRAMS', controller: 'okuma_osp_p300', vendor: 'Okuma' },
  { dir: 'H:/prism/BOX/PRISM FOLDER FROM HOME/PRISM PROGRAM EXAMPLES', controller: 'okuma_osp_p300', vendor: 'Okuma' },
  { dir: 'H:/prism/BOX/PRISM CAD-CAM TRAINING/BASIC SINGLE HOLE CASING', controller: 'okuma_osp_p300', vendor: 'Okuma' },
];

for (const { dir, controller, vendor } of programDirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => /\.(min|MIN|nc|ngc|tap|hnc|gcode|prg|mpf)$/.test(f));
  for (const f of files) {
    const fp = path.join(dir, f);
    const stats = fs.statSync(fp);
    const content = fs.readFileSync(fp, 'utf8');
    const lines = content.split('\n').length;
    const ops = (content.match(/\([A-Z][A-Z0-9 ]+\d/g) || []).map(m => m.replace(/[()]/g, '').trim());
    catalog.nc_programs.push({
      id: 'prog-' + f.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
      name: f,
      vendor, controller,
      path: fp.replace(/\\/g, '/'),
      lines,
      size_bytes: stats.size,
      has_css: /G96|G97/i.test(content),
      has_macros: /VCALL|MCALL|#\d+|VARI|IF\s/i.test(content),
      operations: ops
    });
  }
}

// Real test NC files
for (const p of [
  'H:/prism/mcp-server/src/__tests__/data/real-itw-shakeproof.nc',
  'H:/prism/mcp-server/src/__tests__/data/real-noze-test.nc'
]) {
  if (!fs.existsSync(p)) continue;
  const f = path.basename(p);
  const stats = fs.statSync(p);
  const content = fs.readFileSync(p, 'utf8');
  catalog.nc_programs.push({
    id: 'prog-' + f.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
    name: f, vendor: 'Various', controller: 'fanuc_31i',
    path: p.replace(/\\/g, '/'), lines: content.split('\n').length, size_bytes: stats.size,
    has_css: /G96|G97/i.test(content), has_macros: /#\d+/i.test(content),
    operations: (content.match(/\([A-Z][A-Z0-9 ]+\d/g) || []).map(m => m.replace(/[()]/g, '').trim())
  });
}

// ── 3. STEP Models ──
const stepIndex = 'H:/prism/mcp-server/data/box-extraction/step-file-index.json';
if (fs.existsSync(stepIndex)) {
  catalog.step_models = JSON.parse(fs.readFileSync(stepIndex, 'utf8'));
}

// ── 4. PRISM Posts ──
catalog.prism_posts = [
  { id: 'prism-cps-fusion', name: 'PRISM.cps (Fusion 360 Post)', path: 'H:/prism/mcp-server/scripts/fusion360-post/PRISM.cps', controllers: 17, features: 7, server_mode: true },
  { id: 'prism-cps-addin', name: 'PRISM.cps (Fusion Add-in)', path: 'H:/prism/mcp-server/scripts/fusion360-prism-addin/PRISM.cps', controllers: 17, features: 7, server_mode: true },
];

// ── Summary ──
catalog.summary = {
  total_cps_posts: catalog.cps_posts.length,
  total_nc_programs: catalog.nc_programs.length,
  total_step_models: catalog.step_models.length,
  total_prism_posts: catalog.prism_posts.length,
  vendors: [...new Set(catalog.cps_posts.map(p => p.vendor))].sort(),
  controllers: [...new Set(catalog.cps_posts.map(p => p.controller))].sort(),
  program_vendors: [...new Set(catalog.nc_programs.map(p => p.vendor))].sort(),
};

fs.writeFileSync('H:/prism/mcp-server/data/ppg-asset-catalog.json', JSON.stringify(catalog, null, 2));
console.log('PPG Asset Catalog built:');
console.log(JSON.stringify(catalog.summary, null, 2));
