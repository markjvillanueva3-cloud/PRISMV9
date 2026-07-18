const fs = require('fs');
const path = require('path');
const baseDir = 'H:/prism/JM DIE/CNC MILL HAAS';
const stats = { files: 0, tools: {}, materials: [], speeds: [], feeds: [], wcs: {} };

function parseNC(fp) {
  try {
    const lines = fs.readFileSync(fp, 'utf8').split('\n');
    stats.files++;
    for (const line of lines) {
      // Material from comment
      const matMatch = line.match(/MATERIAL\s*-\s*(.+?)(?:\)|\|)/i);
      if (matMatch) stats.materials.push(matMatch[1].trim());
      // Tool comment
      const toolMatch = line.match(/\(T(\d+)\|([^|]+)\|/);
      if (toolMatch) {
        const desc = toolMatch[2].trim();
        stats.tools[desc] = (stats.tools[desc] || 0) + 1;
      }
      // Spindle speed
      const sMatch = line.match(/S(\d+)/);
      if (sMatch && parseInt(sMatch[1]) > 50 && parseInt(sMatch[1]) < 20000) {
        stats.speeds.push(parseInt(sMatch[1]));
      }
      // Feed rate
      const fMatch = line.match(/F([\d.]+)/);
      if (fMatch && parseFloat(fMatch[1]) > 0.1 && parseFloat(fMatch[1]) < 500) {
        stats.feeds.push(parseFloat(fMatch[1]));
      }
      // Work offset
      const wcsMatch = line.match(/G5[4-9]/);
      if (wcsMatch) stats.wcs[wcsMatch[0]] = (stats.wcs[wcsMatch[0]] || 0) + 1;
    }
  } catch(e) {}
}

function walk(dir) {
  try {
    for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) walk(fp);
      else if (e.name.match(/\.NC$/i)) parseNC(fp);
    }
  } catch(e) {}
}

walk(baseDir);

console.log('=== JM Die Haas Mill Production Data ===');
console.log('Programs analyzed:', stats.files);
console.log('\nMaterials found:');
const mats = [...new Set(stats.materials)];
mats.forEach(m => console.log(' ', m));
console.log('\nTop tools:');
Object.entries(stats.tools).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([t,c]) => console.log(`  ${t}: ${c}x`));
console.log('\nSpeed range:', Math.min(...stats.speeds), '-', Math.max(...stats.speeds), 'RPM');
console.log('Feed range:', Math.min(...stats.feeds).toFixed(1), '-', Math.max(...stats.feeds).toFixed(1), 'IPM');
console.log('Avg speed:', Math.round(stats.speeds.reduce((a,b)=>a+b,0)/stats.speeds.length), 'RPM');
console.log('WCS usage:', JSON.stringify(stats.wcs));
