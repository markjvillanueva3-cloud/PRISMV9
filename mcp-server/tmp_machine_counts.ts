import { fetchMachineCatalog } from './web/src/api/calculatorData.ts';
const all = await fetchMachineCatalog();
console.log('TOTAL', all.length);
const byMode = all.reduce((acc, m) => { acc[m.mode] = (acc[m.mode] || 0) + 1; return acc; }, {} as Record<string, number>);
console.log(JSON.stringify(byMode,null,2));
