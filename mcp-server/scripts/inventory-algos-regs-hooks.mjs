import { readdirSync, statSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";

function scanTsFiles(dir, category) {
  const results = [];
  if (!existsSync(dir)) return results;

  function walk(d) {
    for (const item of readdirSync(d)) {
      const fullPath = path.join(d, item);
      const stat = statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith('.') && item !== '__tests__') {
        walk(fullPath);
      } else if (item.endsWith('.ts') && !item.includes('.test.') && !item.includes('.spec.')) {
        const content = readFileSync(fullPath, 'utf8');
        const relPath = fullPath.replace(/\\/g, '/').replace(dir.replace(/\\/g, '/') + '/', '');

        // Check for registration patterns
        const hasRegister = content.includes('register') || content.includes('Registry');
        const exportCount = (content.match(/export\s+(const|function|class|async)/g) || []).length;

        results.push({
          name: item.replace('.ts', ''),
          path: relPath,
          size_kb: Math.round(stat.size / 1024),
          exports: exportCount,
          registered: hasRegister
        });
      }
    }
  }
  walk(dir);
  return results;
}

function scanJsonRegistries(dir) {
  const results = [];
  if (!existsSync(dir)) return results;

  for (const item of readdirSync(dir)) {
    if (item.endsWith('.json')) {
      const fullPath = path.join(dir, item);
      try {
        const content = JSON.parse(readFileSync(fullPath, 'utf8'));
        let entryCount = 0;
        if (Array.isArray(content)) {
          entryCount = content.length;
        } else if (typeof content === 'object') {
          entryCount = Object.keys(content).length;
        }
        results.push({
          name: item,
          entry_count: entryCount,
          size_kb: Math.round(statSync(fullPath).size / 1024)
        });
      } catch {
        results.push({ name: item, entry_count: 0, error: 'parse_failed' });
      }
    }
  }
  return results;
}

// Scan algorithms
const algorithms = scanTsFiles('src/algorithms', 'algorithms');

// Scan registries (TypeScript)
const registries = scanTsFiles('src/registries', 'registries');

// Scan hooks
const hooks = scanTsFiles('src/hooks', 'hooks');

// Scan data JSON registries
const dataRegistries = scanJsonRegistries('data');

// Also check data/registries if exists
const dataRegsPath = 'data/registries';
const dataRegs2 = existsSync(dataRegsPath) ? scanJsonRegistries(dataRegsPath) : [];

const result = {
  scan_timestamp: new Date().toISOString(),
  source: 'ground_truth_from_code',
  summary: {
    algorithm_files: algorithms.length,
    algorithm_registered: algorithms.filter(a => a.registered).length,
    registry_ts_files: registries.length,
    hook_files: hooks.length,
    data_json_files: dataRegistries.length + dataRegs2.length,
    total_data_entries: dataRegistries.reduce((s, r) => s + r.entry_count, 0) +
                        dataRegs2.reduce((s, r) => s + r.entry_count, 0)
  },
  algorithms: {
    count: algorithms.length,
    registered: algorithms.filter(a => a.registered).length,
    items: algorithms.sort((a, b) => b.size_kb - a.size_kb)
  },
  registries: {
    ts_count: registries.length,
    items: registries.sort((a, b) => b.exports - a.exports)
  },
  hooks: {
    count: hooks.length,
    items: hooks.sort((a, b) => b.size_kb - a.size_kb)
  },
  data_registries: {
    count: dataRegistries.length + dataRegs2.length,
    total_entries: dataRegistries.reduce((s, r) => s + r.entry_count, 0) +
                   dataRegs2.reduce((s, r) => s + r.entry_count, 0),
    items: [...dataRegistries, ...dataRegs2].sort((a, b) => b.entry_count - a.entry_count)
  }
};

writeFileSync('state/QA-MS0/inventory-algorithms-registries-hooks.json', JSON.stringify(result, null, 2));
console.log('=== INVENTORY SUMMARY ===');
console.log('Algorithms:', result.summary.algorithm_files, '(' + result.summary.algorithm_registered + ' registered)');
console.log('Registries (TS):', result.summary.registry_ts_files);
console.log('Hooks:', result.summary.hook_files);
console.log('Data JSON:', result.summary.data_json_files, 'files,', result.summary.total_data_entries, 'entries');
