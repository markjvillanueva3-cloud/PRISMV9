const fs = require('fs');
const path = require('path');

const baseDir = 'H:/prism/JM DIE/WIRE EDM';
const results = { programs: [], e_codes: {}, h_offsets: [], feed_rates: [], m_codes: {} };

function parseNC(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const prog = { file: path.relative(baseDir, filePath), passes: [], h_vars: [], m_codes_found: [] };
    
    for (const line of lines) {
      // E-code extraction
      const eMatch = line.match(/E(\d{4})/);
      if (eMatch) {
        const ecode = eMatch[1];
        const passMatch = line.match(/PASS=(\d+)/i);
        const feedMatch = line.match(/F([.\d]+)/);
        const hMatch = line.match(/H(\d+)/);
        const pass = {
          ecode: 'E' + ecode,
          pass_num: passMatch ? parseInt(passMatch[1]) : null,
          feed: feedMatch ? parseFloat(feedMatch[1]) : null,
          h_var: hMatch ? 'H' + hMatch[1] : null
        };
        prog.passes.push(pass);
        results.e_codes[ecode] = (results.e_codes[ecode] || 0) + 1;
      }
      
      // H-variable offset extraction
      const hVarMatch = line.match(/H(\d+)\s*=\s*([.\d]+)\s*\+\s*H175/);
      if (hVarMatch) {
        prog.h_vars.push({ var: 'H' + hVarMatch[1], offset: parseFloat(hVarMatch[2]) });
      }
      
      // M-code tracking
      const mCodes = line.match(/M\d+/g);
      if (mCodes) {
        for (const mc of mCodes) {
          results.m_codes[mc] = (results.m_codes[mc] || 0) + 1;
          if (!prog.m_codes_found.includes(mc)) prog.m_codes_found.push(mc);
        }
      }
    }
    
    if (prog.passes.length > 0) {
      results.programs.push(prog);
    }
  } catch (e) { /* skip binary/unreadable */ }
}

function walkDir(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.includes('MCAM')) {
        walkDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.NC') || entry.name.endsWith('.nc') || entry.name.endsWith('.txt'))) {
        parseNC(fullPath);
      }
    }
  } catch (e) { /* skip inaccessible */ }
}

walkDir(baseDir);

// Summary
console.log('=== JM Die Wire EDM Technology Extraction ===');
console.log(`Programs with E-codes: ${results.programs.length}`);
console.log(`\nE-Code Frequency:`);
const sorted = Object.entries(results.e_codes).sort((a,b) => b[1] - a[1]);
for (const [code, count] of sorted) {
  console.log(`  E${code}: ${count} occurrences`);
}
console.log(`\nM-Code Frequency:`);
const mSorted = Object.entries(results.m_codes).sort((a,b) => b[1] - a[1]);
for (const [code, count] of mSorted.slice(0, 20)) {
  console.log(`  ${code}: ${count}`);
}

// Per-program detail
console.log(`\n=== Per-Program Pass Details ===`);
for (const prog of results.programs) {
  console.log(`\n${prog.file}:`);
  if (prog.h_vars.length) {
    console.log(`  H-offsets: ${prog.h_vars.map(h => h.var + '=' + h.offset).join(', ')}`);
  }
  for (const p of prog.passes) {
    console.log(`  ${p.ecode} Pass ${p.pass_num || '?'} F=${p.feed || '?'} ${p.h_var || ''}`);
  }
}

// Write JSON for PRISM ingestion
fs.writeFileSync('H:/prism/mcp-server/data/posts/jm-die-wedm-technology.json', JSON.stringify(results, null, 2));
console.log('\nJSON saved to mcp-server/data/posts/jm-die-wedm-technology.json');
