import { fetchMachineCatalog } from './web/src/api/calculatorData.ts';
const all = await fetchMachineCatalog();
const okuma = all.filter((m) => m.manufacturer?.toLowerCase().includes('okuma'));
const grouped = okuma.reduce((acc, m) => { acc[m.mode] = (acc[m.mode] || 0) + 1; return acc; }, {} as Record<string, number>);
console.log(JSON.stringify(grouped, null, 2));
for (const m of okuma.filter((m) => m.mode !== 'lathe').slice(0, 50)) {
  console.log(JSON.stringify({mode:m.mode, model:m.model, type:m.machineTypeId, family:m.family, axes:m.axes}));
}
