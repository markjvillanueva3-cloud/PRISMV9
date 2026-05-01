const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' && input.startsWith('/') ? `http://127.0.0.1:3100${input}` : input;
  return realFetch(url as any, init);
};
const dataMod = await import('./web/src/api/calculatorData.ts');
const pageMod = await import('./web/src/pages/CalculatorPage.tsx');
const machines = await dataMod.fetchMachineCatalog('lathe');
for (const id of ['OKUMA_LB3000_EXII_MY','OKUMA_LU3000EX_2SC','OKUMA_MULTUS_U3000','OKUMA_MULTUS_B400II']) {
  const m = machines.find((item) => item.id === id);
  const holders = await dataMod.fetchToolHolderCatalog({
    mode: 'lathe',
    layoutKind: m?.toolingLayout?.kind,
    turretTypeId: m?.toolingLayout?.turretTypeId,
    hasLiveTooling: m?.toolingLayout?.liveTooling,
    hasMillingHead: m?.toolingLayout?.hasMillingHead,
    turretCount: m?.toolingLayout?.turretCount,
  });
  const compatible = holders.filter((h) => pageMod.holderPackageMatchesMachine(h, m));
  console.log('===', id, m?.model, '===');
  console.log('layout', JSON.stringify(m?.toolingLayout));
  console.log('compatible', compatible.map((h) => ({id:h.id, label:h.label, brand:h.brandId, styles:h.holderStyleIds ?? [h.holderStyleId]})));
}
