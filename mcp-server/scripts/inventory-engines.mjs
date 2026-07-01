import { promises as fs } from "node:fs";
import { readdirSync, statSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";

async function scanDir(dir, results = []) {
  if (!existsSync(dir)) return results;

  for (const item of readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== '__tests__') {
      await scanDir(fullPath, results);
    } else if (item.endsWith('.ts') && !item.endsWith('.test.ts') && !item.endsWith('.spec.ts')) {
      const content = readFileSync(fullPath, 'utf8');

      const exportedFunctions = (content.match(/export\s+(async\s+)?function\s+\w+/g) || []).length;
      const exportedClasses = (content.match(/export\s+(default\s+)?class\s+\w+/g) || []).length;
      const exportedConsts = (content.match(/export\s+const\s+\w+Engine/g) || []).length;

      const relPath = fullPath.replace(/\\/g, '/').replace('src/engines/', '');
      results.push({
        path: relPath,
        name: item.replace('.ts', ''),
        size_kb: Math.round(stat.size / 1024),
        exports: exportedFunctions + exportedClasses + exportedConsts,
        has_class: exportedClasses > 0
      });
    }
  }
  return results;
}

const engines = await scanDir('src/engines');

const byCategory = {};
engines.forEach(e => {
  const parts = e.path.split('/');
  // Extract category from path
  let cat = 'root';
  if (e.path.includes('src\\engines\\')) {
    const afterEngines = e.path.split('src\\engines\\')[1];
    if (afterEngines && afterEngines.includes('\\')) {
      cat = afterEngines.split('\\')[0];
    }
  } else if (parts.length > 1) {
    cat = parts[0];
  }
  byCategory[cat] = (byCategory[cat] || 0) + 1;
});

const result = {
  scan_timestamp: new Date().toISOString(),
  source: 'ground_truth_from_code',
  engine_count: engines.length,
  total_exports: engines.reduce((s, e) => s + e.exports, 0),
  total_size_kb: engines.reduce((s, e) => s + e.size_kb, 0),
  by_category: byCategory,
  top_50_by_size: engines.sort((a, b) => b.size_kb - a.size_kb).slice(0, 50).map(e => ({
    name: e.name,
    size_kb: e.size_kb,
    exports: e.exports
  }))
};

writeFileSync('state/QA-MS0/inventory-engines.json', JSON.stringify(result, null, 2));
console.log('Engine files:', result.engine_count);
console.log('Total exports:', result.total_exports);
console.log('Total size:', Math.round(result.total_size_kb / 1024), 'MB');
