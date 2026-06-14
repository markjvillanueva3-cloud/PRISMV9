#!/usr/bin/env node
// One-shot: split HOOK_REGISTRY.json into 8 audit slices.
import fs from 'node:fs';
const reg = JSON.parse(fs.readFileSync('state/shared/HOOK_REGISTRY.json','utf8'));
const real = reg.hooks.filter(h => {
  const f = String(h.file||h.path||'').replace(/\\/g,'/');
  if (!f.endsWith('.mjs')) return false;
  if (f.includes('.test.')) return false;
  if (f.includes('/.deprecated/')) return false;
  if (f.includes('.bak')) return false;
  if (f.includes('_archive')) return false;
  if (f.includes('/bundles/lib/')) return false;
  return true;
});
real.sort((a,b) => String(a.name||a.file).localeCompare(String(b.name||b.file)));
const N = 8;
const sz = Math.ceil(real.length / N);
fs.mkdirSync('state/shared/audits', { recursive: true });
for (let i = 0; i < N; i++) {
  const slice = real.slice(i*sz, (i+1)*sz);
  fs.writeFileSync(`state/shared/audits/hook-slice-${i+1}.json`, JSON.stringify(slice, null, 2));
}
console.log(`Total real hooks: ${real.length} | 8 slices of ~${sz} each`);
console.log(`Slice 1 range: ${real[0]?.name} -> ${real[sz-1]?.name}`);
console.log(`Slice 8 range: ${real[(N-1)*sz]?.name} -> ${real[real.length-1]?.name}`);
