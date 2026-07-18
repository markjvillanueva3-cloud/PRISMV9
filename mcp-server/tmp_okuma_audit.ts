import { fetchMachineCatalog } from './web/src/api/calculatorData.ts';
const machines = await fetchMachineCatalog('lathe');
const targets = machines.filter((m) => m.manufacturer?.toLowerCase().includes('okuma') && /(genos l|multus|lb3000)/i.test(m.model));
for (const m of targets) {
  console.log(JSON.stringify({
    id: m.id,
    manufacturer: m.manufacturer,
    model: m.model,
    machineTypeId: m.machineTypeId,
    family: m.family,
    coolantOptionIds: m.coolantOptionIds,
    controllerOptions: m.controllerOptions,
    spindleOptions: m.spindleOptions,
    controllerCapabilityOptions: m.controllerCapabilityOptions,
    configurationOptions: m.configurationOptions,
    toolingLayout: m.toolingLayout,
  }, null, 2));
}
