// Comprehensive coverage audit
const fs = require('fs');
const path = require('path');
const DATA_BASE = 'C:\\PRISM\\data\\materials';
const CONSOLIDATED = 'C:\\PRISM\\data\\materials_consolidated';

// 1. What's in X_SPECIALTY?
console.log('=== X_SPECIALTY BREAKDOWN ===');
const xDir = path.join(DATA_BASE, 'X_SPECIALTY');
if (fs.existsSync(xDir)) {
  const files = fs.readdirSync(xDir).filter(f=>f.includes('verified'));
  for (const f of files) {
    const mats = JSON.parse(fs.readFileSync(path.join(xDir,f),'utf8')).materials||[];
    const cats = {};
    mats.forEach(m => {
      const sub = m.subcategory || m.material_type || 'unknown';
      if (!cats[sub]) cats[sub] = [];
      cats[sub].push(m.name);
    });
    console.log(`\n${f} (${mats.length} total):`);
    for (const [cat, names] of Object.entries(cats).sort((a,b)=>b[1].length-a[1].length)) {
      console.log(`  ${cat}: ${names.length}`);
      names.slice(0,3).forEach(n => console.log(`    - ${n}`));
      if (names.length > 3) console.log(`    ... +${names.length-3} more`);
    }
  }
}

// 2. Check hardness variations in steels
console.log('\n\n=== HARDNESS VARIATIONS CHECK ===');
const hardnessVars = {};
for (const group of ['P_STEELS', 'H_HARDENED', 'M_STAINLESS']) {
  const dir = path.join(DATA_BASE, group);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f=>f.includes('verified'));
  let hrcCount = 0, totalInGroup = 0;
  const hrcSamples = [];
  for (const f of files) {
    const mats = JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')).materials||[];
    totalInGroup += mats.length;
    for (const m of mats) {
      if (m.name.match(/\d+\s*HRC/i) || m.condition?.match(/HRC/i)) {
        hrcCount++;
        if (hrcSamples.length < 5) hrcSamples.push(m.name);
      }
    }
  }
  console.log(`${group}: ${totalInGroup} total, ${hrcCount} with HRC variants`);
  hrcSamples.forEach(s => console.log(`  - ${s}`));
}

// 3. Check what categories are MISSING
console.log('\n\n=== MISSING CATEGORIES ANALYSIS ===');
const allNames = [];
for (const group of fs.readdirSync(DATA_BASE).filter(d=>fs.statSync(path.join(DATA_BASE,d)).isDirectory())) {
  fs.readdirSync(path.join(DATA_BASE,group)).filter(f=>f.includes('verified')).forEach(f=>{
    try { JSON.parse(fs.readFileSync(path.join(DATA_BASE,group,f),'utf8')).materials.forEach(m=>allNames.push(m.name.toLowerCase())); } catch(e) {}
  });
}

const CHECKLIST = {
  'COMPOSITES': ['cfrp','carbon fiber','gfrp','glass fiber','fiberglass','kevlar','aramid','g10','fr4','phenolic','epoxy composite'],
  'PLASTICS/POLYMERS': ['nylon','delrin','acetal','pom','peek','ptfe','teflon','polycarbonate','abs','pvc','hdpe','ldpe','uhmwpe','pei','ultem','pps','acrylic','pmma','polyethylene','polypropylene'],
  'CERAMICS': ['alumina','al2o3','zirconia','zro2','silicon carbide','sic','silicon nitride','si3n4','boron carbide','b4c','machinable ceramic','macor'],
  'WOOD': ['oak','maple','mdf','plywood','hardwood','softwood','pine','walnut','birch','cherry'],
  'GRAPHITE/CARBON': ['graphite','edm graphite','carbon','pyrolytic','isostatic graphite'],
  'FOAM/HONEYCOMB': ['foam','honeycomb','rohacell','nomex','divinycell'],
  'RUBBER/ELASTOMERS': ['rubber','silicone','neoprene','viton','epdm','polyurethane'],
  'ARMOR/BALLISTIC': ['ar500','ar400','armor plate','ballistic','mil-dtl','mil-a-46100','rha','rolled homogeneous'],
  'TOOL STEELS (all types)': ['a2 ','d2 ','h13','m2 ','m42','s7 ','o1 ','w1 ','cpm 10v','cpm 3v','cpm m4','asp ','t15','t1 ','m35','m33','vanadis'],
  'TITANIUM GRADES': ['ti-6al-4v','ti-6al-2sn','ti-5al','cp ti','ti-10v','ti-6246','ti-17','beta-c','ti-15-3'],
  'NICKEL SUPERALLOYS': ['inconel 718','inconel 625','waspaloy','hastelloy','rene','udimet','nimonic','monel','incoloy'],
  'COBALT ALLOYS': ['stellite','l-605','haynes 25','mp35n','elgiloy'],
  'REFRACTORY': ['tungsten','molybdenum','niobium','tantalum','rhenium'],
};

for (const [category, keywords] of Object.entries(CHECKLIST)) {
  const found = [];
  const missing = [];
  for (const kw of keywords) {
    if (allNames.some(n => n.includes(kw))) found.push(kw);
    else missing.push(kw);
  }
  const pct = Math.round(found.length / keywords.length * 100);
  const icon = pct >= 80 ? '✅' : pct >= 40 ? '⚠️' : '❌';
  console.log(`${icon} ${category}: ${found.length}/${keywords.length} (${pct}%)`);
  if (missing.length > 0) console.log(`   MISSING: ${missing.join(', ')}`);
}
