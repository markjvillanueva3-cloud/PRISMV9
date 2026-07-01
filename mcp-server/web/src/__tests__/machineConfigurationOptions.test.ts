import { describe, expect, it } from 'vitest';
import { normalizeMachineCatalogRows } from '../api/calculatorData';
import { resolveMachineSelectionOptions } from '../utils/machineConfigurationOptions';
import type { MachineCatalogItem } from '../data/calculatorWorkspace';
import { EXTENDED_MACHINE_CATALOG } from '../../../src/data/machine-profiles-catalog';
import { EXTENDED_MACHINE_CATALOG_EXT } from '../../../src/data/machine-profiles-catalog-ext';
import { EXTENDED_MACHINE_CATALOG_EXT2 } from '../../../src/data/machine-profiles-catalog-ext2';

function sourceProfileCorpus() {
  return [
    ...EXTENDED_MACHINE_CATALOG,
    ...EXTENDED_MACHINE_CATALOG_EXT,
    ...EXTENDED_MACHINE_CATALOG_EXT2,
  ];
}

function okumaSourceProfiles() {
  return sourceProfileCorpus().filter((entry) => entry.brand === 'Okuma');
}

function haasSourceProfiles() {
  return sourceProfileCorpus().filter((entry) => entry.brand === 'Haas');
}

function hurcoSourceProfiles() {
  return sourceProfileCorpus().filter((entry) => entry.brand === 'Hurco');
}

function brotherSourceProfiles() {
  return sourceProfileCorpus().filter((entry) => entry.brand === 'Brother');
}

function grobSourceProfiles() {
  return sourceProfileCorpus().filter((entry) => entry.brand === 'GROB');
}

function hellerSourceProfiles() {
  return sourceProfileCorpus().filter((entry) => entry.brand === 'Heller');
}

function kernSourceProfiles() {
  return sourceProfileCorpus().filter((entry) => entry.brand === 'Kern');
}

function rokuRokuSourceProfiles() {
  return sourceProfileCorpus().filter((entry) => entry.brand === 'Roku-Roku');
}

describe('machine configuration compatibility', () => {
  it('keeps merged machine records configuration-aware instead of exposing impossible controller/spindle combinations', () => {
    const catalog = normalizeMachineCatalogRows([
      {
        id: 'TEST_MACHINE_A',
        manufacturer: 'TestBrand',
        model: 'MX-500',
        type: '5AXIS_TRUNNION',
        controller: { brand: 'TestBrand', model: 'Control A', type: 'Simultaneous 5-axis' },
        spindle: { max_rpm: 12000, power_continuous: 22, taper: 'HSK-A63', coolant_through: true },
        coolant: { pressure_bar: 7, tsc: true, tsc_pressure_bar: 70 },
        travels: { x: 500, y: 400, z: 300 },
      },
      {
        id: 'TEST_MACHINE_B',
        manufacturer: 'TestBrand',
        model: 'MX-500',
        type: '5AXIS_TRUNNION',
        controller: { brand: 'TestBrand', model: 'Control B', type: 'High-speed package' },
        spindle: { max_rpm: 18000, power_continuous: 30, taper: 'HSK-E40', coolant_through: false },
        coolant: { pressure_bar: 7, mist: true, air: true },
        travels: { x: 500, y: 400, z: 300 },
      },
    ]);

    expect(catalog).toHaveLength(1);

    const machine = catalog[0];
    expect(machine.configurationOptions).toHaveLength(2);

    const controlA = machine.controllerOptions.find((option) => /control a/i.test(option.label));
    const controlB = machine.controllerOptions.find((option) => /control b/i.test(option.label));
    expect(controlA).toBeDefined();
    expect(controlB).toBeDefined();

    const controlASelection = resolveMachineSelectionOptions(machine, controlA!.id, '', machine.mode);
    const controlBSelection = resolveMachineSelectionOptions(machine, controlB!.id, '', machine.mode);

    expect(controlASelection.spindleOptions).toHaveLength(1);
    expect(controlASelection.spindleOptions[0]?.label).toMatch(/12,000 RPM/i);
    expect(controlASelection.coolantOptionIds).toContain('tsc');

    expect(controlBSelection.spindleOptions).toHaveLength(1);
    expect(controlBSelection.spindleOptions[0]?.label).toMatch(/18,000 RPM/i);
    expect(controlBSelection.coolantOptionIds).toContain('mist');
    expect(controlBSelection.coolantOptionIds).toContain('air');
    expect(controlBSelection.coolantOptionIds).not.toContain('tsc');
  });

  it('scopes controller capability packages to the active machine configuration instead of the whole machine record', () => {
    const machine: MachineCatalogItem = {
      id: 'test-machine',
      mode: 'mill',
      manufacturer: 'TestBrand',
      model: 'MX-700',
      machineTypeId: 'mill_vertical_5',
      machineTypeLabel: '5-Axis Vertical',
      family: '5-Axis Vertical Machining Center',
      spindleRpm: 15000,
      powerHp: 30,
      envelope: '700 x 500 x 450 mm',
      axes: '5-axis',
      coolant: 'Flood + TSC',
      coolantOptionIds: ['flood', 'tsc'],
      controllerOptions: [
        { id: 'control-a', label: 'Control A', detail: 'Baseline control' },
        { id: 'control-b', label: 'Control B', detail: 'Advanced control' },
      ],
      spindleOptions: [
        { id: 'spindle-a', label: '12,000 RPM CAT40', detail: 'Standard spindle' },
        { id: 'spindle-b', label: '18,000 RPM HSK-A63', detail: 'High-speed spindle' },
      ],
      controllerCapabilityOptions: [
        { id: 'base-probing', label: 'Probing', detail: 'Probe support', checkTip: 'Check probe', defaultEnabled: true },
        { id: 'advanced-smoothing', label: 'Advanced smoothing', detail: 'High-speed contour mode', checkTip: 'Check smoothing' },
      ],
      configurationOptions: [
        {
          id: 'config-a',
          label: 'Control A package',
          detail: 'Baseline package',
          controllerOptions: [{ id: 'control-a', label: 'Control A', detail: 'Baseline control' }],
          spindleOptions: [{ id: 'spindle-a', label: '12,000 RPM CAT40', detail: 'Standard spindle' }],
          controllerCapabilityOptions: [
            { id: 'base-probing', label: 'Probing', detail: 'Probe support', checkTip: 'Check probe', defaultEnabled: true },
          ],
          coolantOptionIds: ['flood', 'tsc'],
        },
        {
          id: 'config-b',
          label: 'Control B package',
          detail: 'Advanced package',
          controllerOptions: [{ id: 'control-b', label: 'Control B', detail: 'Advanced control' }],
          spindleOptions: [{ id: 'spindle-b', label: '18,000 RPM HSK-A63', detail: 'High-speed spindle' }],
          controllerCapabilityOptions: [
            { id: 'advanced-smoothing', label: 'Advanced smoothing', detail: 'High-speed contour mode', checkTip: 'Check smoothing' },
          ],
          coolantOptionIds: ['flood'],
        },
      ],
      notes: [],
      bestFor: [],
    };

    const controlASelection = resolveMachineSelectionOptions(machine, 'control-a', '', machine.mode);
    const controlBSelection = resolveMachineSelectionOptions(machine, 'control-b', '', machine.mode);

    expect(controlASelection.controllerCapabilityOptions.map((option) => option.id)).toEqual(['base-probing']);
    expect(controlBSelection.controllerCapabilityOptions.map((option) => option.id)).toEqual(['advanced-smoothing']);
  });

  it('canonicalizes Doosan and DN Solutions live rows into one DN Solutions lathe entry', () => {
    const corpus = normalizeMachineCatalogRows([
      {
        id: 'doosan-puma-700lm',
        manufacturer: 'Doosan',
        model: 'PUMA 700LM',
        type: 'turning center',
        controller: { brand: 'FANUC', model: '31i-B', type: 'Turning control' },
        spindle: { max_rpm: 1000, power_continuous: 55, taper: 'A2-20' },
        coolant: { pressure_bar: 70, flood: true },
        travels: { x: 650, z: 4000 },
      },
      {
        id: 'dn-solutions-puma-700lm',
        manufacturer: 'DN Solutions',
        model: 'PUMA 700LM',
        type: 'turning center',
        controller: { brand: 'FANUC', model: '31i-B', type: 'Turning control' },
        spindle: { max_rpm: 1000, power_continuous: 55, taper: 'A2-20' },
        coolant: { pressure_bar: 70, flood: true },
        travels: { x: 650, z: 4000 },
      },
    ]);

    expect(corpus).toHaveLength(1);
    expect(corpus[0]?.manufacturer).toBe('DN Solutions');
    expect(corpus[0]?.model).toMatch(/PUMA 700LM/i);
    expect(corpus[0]?.controllerOptions.some((option) => /FANUC 31i-B/i.test(option.label))).toBe(true);
    expect(corpus[0]?.spindleOptions.length).toBeGreaterThan(0);
  });

  it('keeps the full machine corpus available across all supported machine families', () => {
    const sourceProfiles = sourceProfileCorpus();
    const uniqueBrandModels = new Set(sourceProfiles.map((entry) => `${entry.brand}::${entry.model}`));
    const brands = new Set(sourceProfiles.map((entry) => entry.brand));
    const types = new Set(sourceProfiles.map((entry) => entry.type));

    expect(sourceProfiles.length).toBeGreaterThanOrEqual(1941);
    expect(uniqueBrandModels.size).toBeGreaterThanOrEqual(1082);
    expect(brands.size).toBeGreaterThanOrEqual(49);
    ['VMC', 'HMC', '5axis', 'lathe', 'mill_turn', 'swiss', 'bridge', 'edm_wire', 'edm_sinker', 'router'].forEach((type) => {
      expect(types.has(type as never)).toBe(true);
    });
  });

  it('retains the major brands and representative models in the source machine profile catalogs', () => {
    const sourceProfiles = sourceProfileCorpus();
    const brands = new Set(sourceProfiles.map((entry) => entry.brand));

    expect(brands.has('Haas')).toBe(true);
    expect(brands.has('DMG MORI')).toBe(true);
    expect(brands.has('Hurco')).toBe(true);
    expect(brands.has('Mazak')).toBe(true);
    expect(brands.has('Makino')).toBe(true);
    expect(brands.has('Okuma')).toBe(true);
    expect(brands.has('Hermle')).toBe(true);
    expect(brands.has('Doosan')).toBe(true);
    expect(brands.has('DN Solutions')).toBe(true);
    expect(brands.has('Citizen')).toBe(true);
    expect(brands.has('Nakamura-Tome')).toBe(true);
    expect(brands.has('Brother')).toBe(true);
    expect(brands.has('GROB')).toBe(true);
    expect(brands.has('Heller')).toBe(true);
    expect(brands.has('Kern')).toBe(true);
    expect(brands.has('Roku-Roku')).toBe(true);

    expect(sourceProfiles.some((entry) => entry.brand === 'Haas' && /^VF-2$/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'DMG MORI' && /NLX 2500\/700/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'Hurco' && /VMX30i/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'Mazak' && /INTEGREX i-200S/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'Makino' && /^a61nx$/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'Okuma' && /LB3000 EX II MY/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'Hermle' && /^C 32 U$/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'Doosan' && /DNM 4500/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'DN Solutions' && /Puma 700LM/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'Citizen' && /Cincom L20/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'Nakamura-Tome' && /WT-150II/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'Brother' && /SPEEDIO S500X1|Brother SPEEDIO S500Xd1/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'GROB' && /^G350$|GROB G350T/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'Heller' && /Heller H 4000|Heller HF 5500/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'Kern' && /Kern Evo|Kern Pyramid Nano/i.test(entry.model))).toBe(true);
    expect(sourceProfiles.some((entry) => entry.brand === 'Roku-Roku' && /GENOS M460-VE|MU-500VA|DC-1612/i.test(entry.model))).toBe(true);
  });

  it('keeps the full source machine corpus available for calculator coverage audits', () => {
    const sourceProfiles = sourceProfileCorpus();
    const uniqueBrands = new Set(sourceProfiles.map((entry) => entry.brand));
    const uniqueBrandModels = new Set(sourceProfiles.map((entry) => `${entry.brand}::${entry.model}`));
    const machineTypes = new Set(sourceProfiles.map((entry) => entry.type));

    expect(sourceProfiles.length).toBeGreaterThanOrEqual(1941);
    expect(uniqueBrands.size).toBeGreaterThanOrEqual(49);
    expect(uniqueBrandModels.size).toBeGreaterThanOrEqual(1082);
    ['VMC', 'HMC', '5axis', 'lathe', 'mill_turn', 'swiss', 'bridge', 'router', 'edm_wire', 'edm_sinker'].forEach((type) => {
      expect(machineTypes.has(type as never)).toBe(true);
    });
  });

  it('keeps Haas source catalogs deep across the major mill and lathe family lines', () => {
    const sourceProfiles = sourceProfileCorpus().filter((entry) => entry.brand === 'Haas');
    const families = [
      { label: 'VF vertical machining centers', pattern: /^VF-/i, minModels: 20, representative: /VF-2/i },
      { label: 'UMC five-axis machining centers', pattern: /^UMC/i, minModels: 10, representative: /UMC-750/i },
      { label: 'EC horizontal machining centers', pattern: /^EC-/i, minModels: 5, representative: /EC-500/i },
      { label: 'ST turning centers', pattern: /^ST-/i, minModels: 3, representative: /ST-20Y/i },
      { label: 'TM toolroom mills', pattern: /^TM-/i, minModels: 5, representative: /TM-2P/i },
      { label: 'DM drill mills', pattern: /^DM-/i, minModels: 2, representative: /DM-2/i },
      { label: 'Mini Mill family', pattern: /Mini Mill/i, minModels: 5, representative: /Super Mini Mill/i },
      { label: 'CM compact mills', pattern: /^CM-/i, minModels: 1, representative: /CM-1/i },
      { label: 'VM vertical mills', pattern: /^VM-/i, minModels: 3, representative: /VM-6/i },
      { label: 'GM gantry / bridge mills', pattern: /^GM-/i, minModels: 2, representative: /GM-2-5AX/i },
      { label: 'Desktop Mill', pattern: /Desktop Mill/i, minModels: 2, representative: /Desktop Mill/i },
      { label: 'GR bridge router', pattern: /^GR-/i, minModels: 1, representative: /GR-510/i },
    ] as const;

    expect(sourceProfiles.length).toBeGreaterThanOrEqual(120);
    const types = new Set(sourceProfiles.map((entry) => entry.type));
    ['VMC', 'HMC', '5axis', 'lathe', 'router', 'bridge'].forEach((type) => {
      expect(types.has(type as never)).toBe(true);
    });

    families.forEach(({ label, pattern, minModels, representative }) => {
      const familyModels = sourceProfiles.filter((entry) => pattern.test(entry.model));
      const uniqueModels = new Set(familyModels.map((entry) => entry.model));

      expect(uniqueModels.size, label).toBeGreaterThanOrEqual(minModels);
      expect(
        familyModels.some((entry) => representative.test(entry.model)),
        label,
      ).toBe(true);
    });
  });

  it('keeps Okuma source catalogs deep across mill, HMC, 5-axis, lathe, mill-turn, and bridge families', () => {
    const okumaProfiles = okumaSourceProfiles();
    const models = new Set(okumaProfiles.map((entry) => entry.model));
    const types = new Set(okumaProfiles.map((entry) => entry.type));

    expect(okumaProfiles.length).toBeGreaterThanOrEqual(50);
    expect(models.size).toBeGreaterThanOrEqual(50);
    expect(types).toContain('5axis');
    expect(types).toContain('HMC');
    expect(types).toContain('VMC');
    expect(types).toContain('lathe');
    expect(types).toContain('mill_turn');
    expect(types).toContain('bridge');

    [
      /MU-5000V/i,
      /MU-6300V/i,
      /GENOS M560-V/i,
      /MB-5000H/i,
      /MA-600HII/i,
      /LB3000 EX II MY/i,
      /LB4000 EX II/i,
      /GENOS L300-MY/i,
      /MULTUS B300II/i,
      /MULTUS U4000/i,
      /VTM-2000YB/i,
      /MCR-A5CII/i,
    ].forEach((pattern) => {
      expect(okumaProfiles.some((entry) => pattern.test(entry.model))).toBe(true);
    });
  });

  it('keeps Hurco source catalogs deep across VMC, 5-axis, HMC, bridge, and lathe families', () => {
    const hurcoProfiles = hurcoSourceProfiles();
    const models = new Set(hurcoProfiles.map((entry) => entry.model));
    const types = new Set(hurcoProfiles.map((entry) => entry.type));

    expect(hurcoProfiles.length).toBeGreaterThanOrEqual(90);
    expect(models.size).toBeGreaterThanOrEqual(50);
    expect(types).toContain('VMC');
    expect(types).toContain('5axis');
    expect(types).toContain('HMC');
    expect(types).toContain('bridge');
    expect(types).toContain('lathe');

    [
      /VM10i/i,
      /VM20i/i,
      /VMX30i/i,
      /VMX42i/i,
      /VC500i/i,
      /VMX30Ui/i,
      /VMX60Ui/i,
      /HM1700Ri/i,
      /DCX 22 i/i,
      /TM10i/i,
      /TM12i/i,
    ].forEach((pattern) => {
      expect(hurcoProfiles.some((entry) => pattern.test(entry.model))).toBe(true);
    });
  });

  it('keeps Brother, GROB, Heller, Kern, and Roku-Roku source catalogs deep across the expected precision families', () => {
    const brotherProfiles = brotherSourceProfiles();
    const grobProfiles = grobSourceProfiles();
    const hellerProfiles = hellerSourceProfiles();
    const kernProfiles = kernSourceProfiles();
    const rokuRokuProfiles = rokuRokuSourceProfiles();

    expect(new Set(brotherProfiles.map((entry) => entry.model)).size).toBeGreaterThanOrEqual(20);
    ['VMC', 'HMC', '5axis'].forEach((type) => {
      expect(new Set(brotherProfiles.map((entry) => entry.type)).has(type as never)).toBe(true);
    });
    [/SPEEDIO S300X1/i, /Brother SPEEDIO H550Xd1/i, /Brother SPEEDIO W1000Xd1/i].forEach((pattern) => {
      expect(brotherProfiles.some((entry) => pattern.test(entry.model))).toBe(true);
    });

    expect(new Set(grobProfiles.map((entry) => entry.model)).size).toBeGreaterThanOrEqual(6);
    ['5axis', 'mill_turn'].forEach((type) => {
      expect(new Set(grobProfiles.map((entry) => entry.type)).has(type as never)).toBe(true);
    });
    [/^G350$/i, /^G550$/i, /GROB G350T/i].forEach((pattern) => {
      expect(grobProfiles.some((entry) => pattern.test(entry.model))).toBe(true);
    });

    expect(new Set(hellerProfiles.map((entry) => entry.model)).size).toBeGreaterThanOrEqual(8);
    ['HMC', 'VMC', '5axis'].forEach((type) => {
      expect(new Set(hellerProfiles.map((entry) => entry.type)).has(type as never)).toBe(true);
    });
    [/Heller H 4000/i, /Heller FP 6000/i, /Heller HF 5500/i].forEach((pattern) => {
      expect(hellerProfiles.some((entry) => pattern.test(entry.model))).toBe(true);
    });

    expect(new Set(kernProfiles.map((entry) => entry.model)).size).toBeGreaterThanOrEqual(4);
    ['VMC', '5axis'].forEach((type) => {
      expect(new Set(kernProfiles.map((entry) => entry.type)).has(type as never)).toBe(true);
    });
    [/Kern Evo/i, /Kern Evo 5AX/i, /Kern Pyramid Nano/i].forEach((pattern) => {
      expect(kernProfiles.some((entry) => pattern.test(entry.model))).toBe(true);
    });

    expect(new Set(rokuRokuProfiles.map((entry) => entry.model)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(rokuRokuProfiles.map((entry) => entry.type))).toEqual(new Set(['VMC']));
    [/GENOS M460-VE/i, /MU-500VA/i, /DC-1612/i].forEach((pattern) => {
      expect(rokuRokuProfiles.some((entry) => pattern.test(entry.model))).toBe(true);
    });
  });

  it('keeps Haas source catalogs deep across VMC, HMC, 5-axis, lathe, and router families', () => {
    const haasProfiles = haasSourceProfiles();
    const models = new Set(haasProfiles.map((entry) => entry.model));
    const types = new Set(haasProfiles.map((entry) => entry.type));

    expect(haasProfiles.length).toBeGreaterThanOrEqual(120);
    expect(models.size).toBeGreaterThanOrEqual(120);
    expect(types).toContain('VMC');
    expect(types).toContain('HMC');
    expect(types).toContain('5axis');
    expect(types).toContain('lathe');
    expect(types).toContain('router');

    [
      /^VF-2$/i,
      /VF-4SS with TRT210/i,
      /UMC-750/i,
      /UMC-1000/i,
      /EC-400/i,
      /ST-10Y/i,
      /ST-20Y/i,
      /ST-35/i,
      /TL-1/i,
      /GR-510/i,
    ].forEach((pattern) => {
      expect(haasProfiles.some((entry) => pattern.test(entry.model))).toBe(true);
    });
  });

  it('keeps deep model-count coverage and machine-family diversity across the major supplier catalogs', () => {
    const sourceProfiles = sourceProfileCorpus();
    const expectedCoverage = [
      { brand: 'Haas', minModels: 120, requiredTypes: ['VMC', 'HMC', '5axis', 'lathe', 'router', 'bridge'] },
      { brand: 'DMG MORI', minModels: 90, requiredTypes: ['VMC', 'HMC', '5axis', 'lathe', 'mill_turn', 'swiss'] },
      { brand: 'Hurco', minModels: 50, requiredTypes: ['VMC', 'HMC', '5axis', 'lathe', 'bridge'] },
      { brand: 'Mazak', minModels: 100, requiredTypes: ['VMC', 'HMC', '5axis', 'lathe', 'mill_turn', 'bridge'] },
      { brand: 'Okuma', minModels: 55, requiredTypes: ['VMC', 'HMC', '5axis', 'lathe', 'mill_turn', 'bridge'] },
      { brand: 'Makino', minModels: 25, requiredTypes: ['VMC', 'HMC', '5axis', 'edm_wire', 'edm_sinker'] },
      { brand: 'DN Solutions', minModels: 45, requiredTypes: ['VMC', 'HMC', '5axis', 'lathe', 'mill_turn'] },
      { brand: 'Hyundai WIA', minModels: 24, requiredTypes: ['VMC', 'HMC', '5axis', 'lathe', 'mill_turn'] },
      { brand: 'Hermle', minModels: 12, requiredTypes: ['VMC', '5axis', 'mill_turn'] },
      { brand: 'Brother', minModels: 20, requiredTypes: ['VMC', 'HMC'] },
      { brand: 'GROB', minModels: 6, requiredTypes: ['5axis', 'mill_turn'] },
      { brand: 'Heller', minModels: 8, requiredTypes: ['VMC', 'HMC', '5axis'] },
      { brand: 'Kern', minModels: 4, requiredTypes: ['VMC', '5axis'] },
      { brand: 'Roku-Roku', minModels: 6, requiredTypes: ['VMC'] },
      { brand: 'Citizen', minModels: 12, requiredTypes: ['lathe', 'swiss'] },
      { brand: 'Nakamura-Tome', minModels: 10, requiredTypes: ['lathe', 'mill_turn'] },
      { brand: 'Hardinge', minModels: 12, requiredTypes: ['lathe', 'VMC'] },
      { brand: 'Spinner', minModels: 15, requiredTypes: ['lathe', 'VMC', '5axis'] },
      { brand: 'EMAG', minModels: 6, requiredTypes: ['lathe'] },
      { brand: 'Index', minModels: 8, requiredTypes: ['lathe', 'VMC'] },
      { brand: 'Star', minModels: 6, requiredTypes: ['swiss'] },
      { brand: 'Tsugami', minModels: 8, requiredTypes: ['swiss'] },
      { brand: 'Traub', minModels: 5, requiredTypes: ['lathe', 'swiss'] },
      { brand: 'Doosan', minModels: 4, requiredTypes: ['VMC', '5axis'] },
    ] as const;

    expectedCoverage.forEach(({ brand, minModels, requiredTypes }) => {
      const profiles = sourceProfiles.filter((entry) => entry.brand === brand);
      const uniqueModels = new Set(profiles.map((entry) => entry.model));
      const types = new Set(profiles.map((entry) => entry.type));

      expect(uniqueModels.size).toBeGreaterThanOrEqual(minModels);
      requiredTypes.forEach((type) => {
        expect(types.has(type as never)).toBe(true);
      });
    });
  });

  it('covers the major turning suppliers and representative models in the source catalogs', () => {
    const sourceProfiles = sourceProfileCorpus();
    const turningProfiles = sourceProfiles.filter((entry) => /lathe|mill_turn|swiss|vtl/i.test(entry.type));

    expect(turningProfiles.length).toBeGreaterThan(0);

    const expectedTurningSuppliers = [
      { brand: 'Citizen', models: [/Cincom L20/i, /Miyano/i] },
      { brand: 'DMG MORI', models: [/NLX 2500\/700/i, /NTX 2000/i] },
      { brand: 'DN Solutions', models: [/PUMA 2600/i, /LYNX 2100/i] },
      { brand: 'EMAG', models: [/VLC 200 GT/i, /VSC 250/i] },
      { brand: 'Haas', models: [/ST-20Y/i, /ST-35/i] },
      { brand: 'Hardinge', models: [/Conquest T42/i, /Elite T42 SMY/i] },
      { brand: 'Hyundai WIA', models: [/SKT 200/i, /LM1800TTSY/i] },
      { brand: 'Index', models: [/R200/i, /G420/i] },
      { brand: 'Mazak', models: [/INTEGREX i-200S/i, /QT-NEXUS 250-II MY/i] },
      { brand: 'Nakamura-Tome', models: [/WT-150II/i, /NTRX-300/i] },
      { brand: 'Okuma', models: [/LB3000 EX II MY/i, /MULTUS U4000/i] },
      { brand: 'Hurco', models: [/TM10i/i, /TM12i/i] },
      { brand: 'Spinner', models: [/TC 600-65 SMCY/i, /TTS 300/i] },
      { brand: 'Star', models: [/SR-20JN Type C/i, /SB-20R Type G/i] },
      { brand: 'Traub', models: [/TNL12-7B/i, /TNA300/i] },
      { brand: 'Tsugami', models: [/SS20-V/i, /BO38S-V/i] },
    ];

    expectedTurningSuppliers.forEach(({ brand, models }) => {
      expect(turningProfiles.some((entry) => entry.brand === brand)).toBe(true);
      expect(
        models.some((pattern) => turningProfiles.some((entry) => entry.brand === brand && pattern.test(entry.model))),
      ).toBe(true);
    });
  });
});
