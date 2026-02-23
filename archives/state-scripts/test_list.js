const fs = require('fs');
const path = require('path');

async function listDir(d, opts) {
  const { recursive = false } = opts || {};
  const results = [];
  const entries = await fs.promises.readdir(d, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const fp = path.join(d, e.name);
    results.push({ name: e.name, path: fp, isDirectory: e.isDirectory() });
    if (recursive && e.isDirectory() && e.name !== 'node_modules' && e.name !== '__pycache__' && e.name !== '_archive') {
      const sub = await listDir(fp, opts);
      results.push(...sub);
    }
  }
  return results;
}

listDir('C:\\PRISM\\scripts', { recursive: true }).then(f => {
  const scripts = f.filter(x => !x.isDirectory && (x.name.endsWith('.py') || x.name.endsWith('.js') || x.name.endsWith('.ts') || x.name.endsWith('.ps1') || x.name.endsWith('.sh')));
  const noCache = scripts.filter(x => !x.path.includes('__pycache__') && !x.path.includes('_archive') && !x.path.includes('node_modules'));
  console.log('Total script files:', noCache.length);
  const topLevel = noCache.filter(x => path.dirname(x.path) === 'C:\\PRISM\\scripts');
  console.log('Top-level:', topLevel.length);
  const core = noCache.filter(x => x.path.includes('\\core\\'));
  console.log('core/:', core.length);
  console.log('Sample core:', core.slice(0, 3).map(x => x.name));
});
