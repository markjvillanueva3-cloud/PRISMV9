import { fetchMachineCatalog } from './web/src/api/calculatorData.ts';
const machines = await fetchMachineCatalog('lathe');
const okuma = machines.filter((m) => m.manufacturer?.toLowerCase().includes('okuma'));
console.log('COUNT', okuma.length);
for (const m of okuma.slice(0, 30)) {
  console.log(JSON.stringify({
    id: m.id,
    model: m.model,
    machineTypeId: m.machineTypeId,
    family: m.family,
    controllerIds: m.controllerOptions?.map((x)=>x.id),
    spindleIds: m.spindleOptions?.map((x)=>x.id),
    capabilityIds: m.controllerCapabilityOptions?.map((x)=>x.id),
    coolant: m.coolantOptionIds,
    toolingLayout: m.toolingLayout,
    configCount: m.configurationOptions?.length ?? 0,
  }));
}
