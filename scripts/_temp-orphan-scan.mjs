import fs from 'node:fs';

const cSettings = fs.readFileSync('C:/Users/wompu/.claude/settings.json', 'utf8');
const hSettings = fs.readFileSync('H:/.claude/settings.json', 'utf8');
const bundleFiles = fs.readdirSync('H:/prism/.claude/hooks/bundles').filter(f => f.endsWith('.mjs'));
const bundleRefs = new Set();
for (const bf of bundleFiles) {
  const txt = fs.readFileSync('H:/prism/.claude/hooks/bundles/' + bf, 'utf8');
  const matches = txt.match(/[\w-]+\.mjs/g) || [];
  matches.forEach(m => bundleRefs.add(m.replace('.mjs', '')));
}
// Also collect hooks referenced FROM other hooks (router-dispatched)
const hooksDir = fs.readdirSync('H:/prism/.claude/hooks').filter(f => f.endsWith('.mjs'));
const refdByHook = new Set();
for (const h of hooksDir) {
  const txt = fs.readFileSync('H:/prism/.claude/hooks/' + h, 'utf8');
  const m = txt.match(/[\w-]+\.mjs/g) || [];
  m.forEach(x => {
    const name = x.replace('.mjs', '');
    if (name !== h.replace('.mjs', '')) refdByHook.add(name);
  });
}
const wired = new Set();
[cSettings, hSettings].forEach(s => {
  const m = s.match(/[\w-]+\.mjs/g) || [];
  m.forEach(x => wired.add(x.replace('.mjs', '')));
});
bundleRefs.forEach(x => wired.add(x));
refdByHook.forEach(x => wired.add(x));
const skipPattern = /cad|cam|blueprint|edm|lathe|mill|fiveaxis|turning|grinder|swiss|hyper|fanuc|haas|mazak|okuma|mastercam|fusion|sinker|wedm|catia|powermill|inventor|solidcam|kienzle|taylor|spindle|coolant|workholding|gcode|machining|chipload/i;
const orphans = hooksDir.filter(f => {
  const name = f.replace('.mjs', '');
  return !wired.has(name) && !name.startsWith('_') && !name.endsWith('.test') && !skipPattern.test(name);
}).sort();
console.log('Dev-tool orphans (truly unwired, all sources):', orphans.length);
orphans.slice(0, 80).forEach(o => console.log('  ' + o));
