const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' && input.startsWith('/') ? `http://127.0.0.1:3100${input}` : input;
  return realFetch(url as any, init);
};
const mod = await import('./web/src/api/calculatorData.ts');
const machines = await mod.fetchMachineCatalog('lathe');
for (const id of ['OKUMA_LB3000_EXII_MY','OKUMA_LU3000EX_2SC','OKUMA_MULTUS_U3000','OKUMA_MULTUS_B400II']) {
  const m = machines.find((item) => item.id === id);
  console.log('===', id, '===');
  console.log(JSON.stringify(m ? {
    id: m.id,
    model: m.model,
    machineTypeId: m.machineTypeId,
    controllerOptions: m.controllerOptions,
    spindleOptions: m.spindleOptions,
    controllerCapabilityOptions: m.controllerCapabilityOptions,
    coolantOptionIds: m.coolantOptionIds,
    configurationOptions: m.configurationOptions,
    toolingLayout: m.toolingLayout,
  } : null, null, 2));
}
