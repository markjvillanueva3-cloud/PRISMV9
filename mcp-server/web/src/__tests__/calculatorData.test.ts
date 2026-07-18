// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchMachineCatalog,
  fetchMaterialCatalog,
  fetchProgrammingCatalogState,
  fetchToolCatalog,
  fetchToolCatalogState,
  fetchToolHolderCatalog,
  fetchToolHolderCatalogState,
  fetchWorkholdingCatalogState,
  resetCalculatorDataCachesForTest,
} from '../api/calculatorData';
import { HOLDER_PACKAGE_LIBRARY } from '../data/calculatorHolderLibrary';

describe('fetchMachineCatalog', () => {
  afterEach(() => {
    resetCalculatorDataCachesForTest();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('unwraps nested machine payloads and maps controller plus spindle metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'HAAS_VF_2_TR',
                name: 'HAAS VF-2 TR',
                manufacturer: 'Haas',
                type: '5AXIS_TRUNNION',
                travels: { x: 762, y: 406, z: 508 },
                spindle: {
                  type: 'inline_direct_drive',
                  max_rpm: 12000,
                  taper: 'CAT40',
                  power_continuous: 18.5,
                  torque_max: 150,
                  coolant_through: true,
                },
                controller: {
                  brand: 'Haas',
                  model: 'NGC',
                  type: 'Haas Next Generation Control',
                  axes: 5,
                  tcpc: true,
                },
                coolant: {
                  tsc: true,
                  tsc_pressure_bar: 70,
                },
                atc: {
                  capacity: 24,
                },
                has3DModel: true,
                layer: 'ENHANCED',
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const machines = await fetchMachineCatalog('mill');

    expect(machines).toHaveLength(1);
    expect(machines[0]?.mode).toBe('mill');
    expect(machines[0]?.axes).toBe('5-axis');
    expect(machines[0]?.envelope).toBe('762 x 406 x 508 mm');
    expect(machines[0]?.controllerOptions[0]?.label).toBe('Haas NGC');
    expect(machines[0]?.controllerOptions[0]?.detail).toContain('TCPC / TCPM ready');
    expect(machines[0]?.spindleOptions[0]?.label).toContain('12,000 RPM');
    expect(machines[0]?.spindleOptions[0]?.detail).toContain('Through-spindle coolant');
    expect(machines[0]?.coolantOptionIds).toEqual(['flood', 'tsc']);
    expect(machines[0]?.canonicalMachineId).toBe('mill-haas-vf-2-tr');
    expect(machines[0]?.taxonomy?.familyId).toBe('mill-vertical');
    expect(machines[0]?.packageProvenance?.confidence).toBe('published');
  });

  it('skips malformed live machine records instead of falling back to the static catalog', async () => {
    const brokenMachine = {
      id: 'BROKEN_MACHINE',
      name: 'Broken Machine',
      manufacturer: 'BrokenCo',
      type: '3AXIS_VMC',
      get controller() {
        throw new Error('bad controller payload');
      },
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              brokenMachine,
              {
                id: 'HAAS_VF_1',
                name: 'HAAS VF-1',
                manufacturer: 'Haas',
                type: '3AXIS_VMC',
                travels: { x: 508, y: 406, z: 508 },
                spindle: {
                  max_rpm: 10000,
                  taper: 'CAT40',
                  power_continuous: 11,
                  torque_max: 120,
                  coolant_through: true,
                },
                controller: {
                  brand: 'Haas',
                  model: 'Haas NGC',
                  type: 'Haas Next Generation Control',
                },
                coolant: {
                  tsc: true,
                  tsc_pressure_bar: 70,
                },
                atc: {
                  capacity: 20,
                },
              },
            ],
            total: 2,
            hasMore: false,
          },
        }),
      }),
    );

    const machines = await fetchMachineCatalog('mill');

    expect(machines).toHaveLength(1);
    expect(machines[0]?.id).toBe('HAAS_VF_1');
    expect(machines[0]?.controllerOptions[0]?.label).toBe('Haas NGC');
  });

  it('unwraps dev-server machine collections stored under _items', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: {
              _items: [
                {
                  id: 'HAAS_VF_1',
                  name: 'HAAS VF-1',
                  manufacturer: 'Haas',
                  type: '3AXIS_VMC',
                  travels: { x: 508, y: 406, z: 508 },
                  spindle: {
                    max_rpm: 10000,
                    taper: 'CAT40',
                    power_continuous: 11,
                    torque_max: 120,
                    coolant_through: true,
                  },
                  controller: {
                    brand: 'Haas',
                    model: 'Haas NGC',
                    type: 'Haas Next Generation Control',
                  },
                  coolant: {
                    tsc: true,
                    tsc_pressure_bar: 70,
                  },
                },
              ],
              _total: 1,
              _showing: 1,
            },
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const machines = await fetchMachineCatalog('mill');

    expect(machines).toHaveLength(1);
    expect(machines[0]?.id).toBe('HAAS_VF_1');
    expect(machines[0]?.spindleOptions[0]?.label).toContain('10,000 RPM');
  });

  it('skips standalone rotary-table accessory records so they never surface as mill machines', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'giddings_rtc_4000',
                model: 'RTC 4000',
                manufacturer: {
                  name: 'Giddings & Lewis',
                },
                type: 'ROTARY_TABLE',
                axis_type: 'rotary_table',
                spindle: {
                  max_rpm: 0,
                  power_continuous: 0,
                },
              },
              {
                id: 'HAAS_VF_3',
                name: 'HAAS VF-3',
                manufacturer: 'Haas',
                type: '3AXIS_VMC',
                travels: { x: 1016, y: 508, z: 635 },
                spindle: {
                  max_rpm: 8100,
                  taper: 'CAT40',
                  power_continuous: 22.4,
                },
                controller: {
                  brand: 'Haas',
                  model: 'NGC',
                  type: 'Haas Next Generation Control',
                },
              },
            ],
            total: 2,
            hasMore: false,
          },
        }),
      }),
    );

    const machines = await fetchMachineCatalog('mill');

    expect(machines.map((machine) => machine.id)).toEqual(['HAAS_VF_3']);
  });

  it('deep-merges complementary tooling layout rows so sparse lathe records do not erase richer turret data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'DN_PUMA_700LM_SPARSE',
                manufacturer: 'DN Solutions',
                model: 'PUMA 700LM',
                type: 'TURNING_CENTER',
                spindle: {
                  max_rpm: 2200,
                  power_continuous: 45,
                },
                controller: {
                  brand: 'Fanuc',
                  model: '31i-B',
                  type: 'Fanuc 31i-B',
                },
              },
              {
                id: 'DN_PUMA_700LM_LAYOUT',
                manufacturer: 'DN Solutions',
                model: 'PUMA 700LM',
                type: 'TURNING_CENTER',
                turret: {
                  type: 'VDI80',
                  positions: 12,
                },
                live_tooling: true,
                sub_spindle: true,
              },
            ],
            total: 2,
            hasMore: false,
          },
        }),
      }),
    );

    const machines = await fetchMachineCatalog('lathe');

    expect(machines).toHaveLength(1);
    expect(machines[0]?.toolingLayout?.turretTypeId).toBe('vdi80');
    expect(machines[0]?.toolingLayout?.turretTypeLabel).toBe('VDI80');
    expect(machines[0]?.toolingLayout?.liveTooling).toBe(true);
    expect(machines[0]?.toolingLayout?.hasSubSpindle).toBe(true);
  });

  it('walks paginated machine-search responses so the full machine registry is available', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              machines: {
                _items: [
                  {
                    id: 'HAAS_VF_1',
                    name: 'HAAS VF-1',
                    manufacturer: 'Haas',
                    type: '3AXIS_VMC',
                    controller: {
                      brand: 'Haas',
                      model: 'Haas NGC',
                      type: 'Haas Next Generation Control',
                    },
                    spindle: {
                      max_rpm: 10000,
                      taper: 'CAT40',
                    },
                  },
                ],
                _total: 2,
              },
              total: 2,
              hasMore: true,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              machines: {
                _items: [
                  {
                    id: 'HAAS_ST_20Y',
                    name: 'HAAS ST-20Y',
                    manufacturer: 'Haas',
                    type: 'Y_AXIS_TURNING_CENTER',
                    controller: {
                      brand: 'Haas',
                      model: 'Haas NGC',
                      type: 'Haas Next Generation Control',
                    },
                    spindle: {
                      max_rpm: 4000,
                      taper: 'A2-6',
                    },
                  },
                ],
                _total: 2,
              },
              total: 2,
              hasMore: false,
            },
          }),
        }),
    );

    const machines = await fetchMachineCatalog();

    expect(machines.map((machine) => machine.id)).toEqual(['HAAS_VF_1', 'HAAS_ST_20Y']);
  });

  it('requests the expanded calculator machine catalog before falling back to the legacy search slice', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          machines: [
            {
              id: 'AWEA_AF_1600',
              name: 'AWEA AF-1600',
              manufacturer: 'AWEA',
              type: 'vertical_machining_center',
              controller: {
                brand: 'Fanuc',
                model: '0i-MF',
                type: 'Fanuc 0i-MF',
              },
              spindle: {
                max_rpm: 8000,
                power_continuous: 30,
                taper: 'CAT50',
              },
              travels: { x: 1600, y: 750, z: 710 },
            },
          ],
          total: 1,
          hasMore: false,
          source: 'aggregated',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const machines = await fetchMachineCatalog('mill');

    expect(machines).toHaveLength(1);
    expect(machines[0]?.manufacturer).toBe('Awea');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/api/v1/data/machine/search');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      calculatorCatalog: true,
      limit: 5000,
      offset: 0,
    });
  });

  it('merges duplicate Okuma 5-axis mill records and builds spindle data from specs payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'okuma_genos_m460v_5ax',
                name: 'okuma_genos_m460v_5ax',
                manufacturer: 'OKUMA',
                type: '5AXIS_TRUNNION',
                specs: {
                  maxRpm: 15000,
                  peakHp: 22,
                  taper: 'CAT40',
                  axes: 5,
                  table: 'trunnion',
                  tsc: true,
                },
              },
              {
                id: 'OKUMA_GENOS_M460V_5AX_SETUP',
                name: 'Okuma GENOS M460V-5AX',
                manufacturer: 'Okuma',
                type: '5AXIS_TRUNNION',
                controller: {
                  brand: 'Okuma',
                  model: 'OSP-P300M',
                  type: 'Okuma Multiaxis Control',
                  axes: 5,
                },
              },
            ],
            total: 2,
            hasMore: false,
          },
        }),
      }),
    );

    const machines = await fetchMachineCatalog('mill');

    expect(machines).toHaveLength(1);
    expect(machines[0]?.model).toBe('GENOS M460V-5AX');
    expect(machines[0]?.machineTypeId).toBe('mill_vertical_5');
    expect(machines[0]?.machineTypeLabel).toBe('5-Axis Vertical');
    expect(machines[0]?.controllerOptions[0]?.label).toBe('Okuma OSP-P300M');
    expect(machines[0]?.spindleOptions[0]?.label).toContain('15,000 RPM');
    expect(machines[0]?.spindleOptions[0]?.label).toContain('CAT40');
    expect(machines[0]?.spindleOptions[0]?.detail).toContain('Through-spindle coolant');
    expect(machines[0]?.powerHp).toBe(22);
    expect(machines[0]?.canonicalMachineId).toBe('mill-okuma-genos-m460v-5ax');
    expect(machines[0]?.packageId).toBe('mill-okuma-genos-m460v-5ax::standard');
    expect(machines[0]?.packageProvenance?.source).toBe('registry-merged');
    expect(machines[0]?.packageProvenance?.sourceRecordIds).toEqual(
      expect.arrayContaining(['okuma_genos_m460v_5ax', 'OKUMA_GENOS_M460V_5AX_SETUP']),
    );
    expect(machines[0]?.configurationOptions?.[0]?.confidence).toBe('merged');
    expect(machines[0]?.toolingLayout?.stations).toBe(48);
    expect(machines[0]?.toolingLayout?.stationOptions).toEqual([30, 48, 60]);
    expect(machines[0]?.toolingLayout?.allowCustomStations).toBe(true);
    expect(machines[0]?.toolingLayout?.interfaceId).toBe('cat40-big-plus');
    expect(machines[0]?.toolingLayout?.spindleConnectionTypeId).toBe('cat40-big-plus');
    expect(machines[0]?.toolingLayout?.spindleConnectionLabel).toBe('CAT 40 Big+');
  });

  it('builds Okuma 5-axis coolant and controller-package options for the M460V-5AX posture', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'okuma_genos_m460v_5ax',
                name: 'okuma_genos_m460v-5ax',
                manufacturer: 'Okuma',
                type: '5AXIS_TRUNNION',
                spindle: {
                  max_rpm: 15000,
                  taper: 'CAT 40 Big+',
                  coolant_through: true,
                  through_air: true,
                },
                controller: {
                  brand: 'Okuma',
                  model: 'OSP-P300MA-H',
                  type: 'Okuma OSP-P300MA-H',
                  axes: 5,
                },
                coolant: {
                  flood: true,
                  tsc: true,
                  air_blast: true,
                  through_air: true,
                  tsc_pressure_bar: 70,
                },
                okuma_technologies: {
                  collision_avoidance: {
                    enabled: true,
                    name: 'CAS',
                  },
                  machining_navi: {
                    enabled: true,
                  },
                },
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const machines = await fetchMachineCatalog('mill');

    expect(machines).toHaveLength(1);
    expect(machines[0]?.coolantOptionIds).toEqual(['flood', 'tsc', 'through_air', 'air']);
    expect(machines[0]?.toolingLayout?.stations).toBe(48);
    expect(machines[0]?.toolingLayout?.stationOptions).toEqual([30, 48, 60]);
    expect(machines[0]?.controllerCapabilityOptions?.map((option) => option.id)).toEqual(
      expect.arrayContaining([
        'okuma-cas',
        'okuma-machining-navi',
        'okuma-hsm',
        'okuma-hpcc',
        'okuma-tcp',
        'okuma-tilted-plane',
      ]),
    );
    expect(
      machines[0]?.controllerCapabilityOptions?.find((option) => option.id === 'okuma-cas')?.defaultEnabled,
    ).toBe(true);
  });

  it('keeps lathe-structured machines out of the mill catalog even when their type text is weak', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'MYSTERY_TURN',
                name: 'Citizen Platform 20',
                manufacturer: 'Citizen',
                type: 'PRODUCTION_MACHINE',
                guide_bushing: true,
                turret: {
                  stations: 8,
                  live_tooling: true,
                },
                spindle: {
                  max_rpm: 10000,
                  spindle_nose: 'Swiss spindle',
                },
                controller: {
                  brand: 'Citizen',
                  model: 'Cincom',
                  type: 'Swiss control',
                },
              },
              {
                id: 'HAAS_VF_1',
                name: 'HAAS VF-1',
                manufacturer: 'Haas',
                type: '3AXIS_VMC',
                spindle: {
                  max_rpm: 10000,
                  taper: 'CAT40',
                },
                controller: {
                  brand: 'Haas',
                  model: 'NGC',
                  type: 'Haas Next Generation Control',
                },
              },
            ],
            total: 2,
            hasMore: false,
          },
        }),
      }),
    );

    const mills = await fetchMachineCatalog('mill');
    const lathes = await fetchMachineCatalog('lathe');

    expect(mills.map((machine) => machine.id)).toEqual(['HAAS_VF_1']);
    expect(lathes.map((machine) => machine.id)).toEqual(['MYSTERY_TURN']);
    expect(lathes[0]?.machineTypeId).toBe('lathe_swiss');
  });

  it('classifies multitask mill-turn platforms as lathe machines instead of leaking them into mills', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'OKUMA_MULTUS_U3000',
                name: 'OKUMA MULTUS U3000',
                manufacturer: 'Okuma',
                type: 'MULTITASK',
                capabilities: ['milling', 'turning', 'mill-turn', '5-axis'],
                spindle: {
                  max_rpm: 5000,
                  taper: 'A2-8',
                },
                controller: {
                  brand: 'Okuma',
                  model: 'OSP-P300SA',
                  type: 'Okuma multitasking control',
                },
                turret: {
                  stations: 40,
                  live_tooling: true,
                },
                sub_spindle: true,
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const mills = await fetchMachineCatalog('mill');
    const lathes = await fetchMachineCatalog('lathe');

    expect(mills.some((machine) => machine.id === 'OKUMA_MULTUS_U3000')).toBe(false);
    expect(lathes).toHaveLength(1);
    expect(lathes[0]?.model).toBe('MULTUS U3000');
    expect(lathes[0]?.machineTypeId).toBe('lathe_multitask');
    expect(lathes[0]?.toolingLayout?.turretTypeId).toBe('capto-c6');
    expect(lathes[0]?.toolingLayout?.turretCount).toBe(1);
    expect(lathes[0]?.toolingLayout?.hasSubSpindle).toBe(true);
    expect(lathes[0]?.toolingLayout?.hasMillingHead).toBe(true);
    expect(lathes[0]?.toolingLayout?.millingHeadLabel).toBe('B-axis milling head');
  });

  it('captures twin-turret topology so lathe holder filtering can avoid impossible mill-turn packages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'NAKAMURA_WT_150II',
                name: 'Nakamura WT-150II',
                manufacturer: 'Nakamura-Tome',
                type: 'SUB_SPINDLE_TURNING_CENTER',
                capabilities: ['turning', 'twin turret', 'sub spindle'],
                spindle: {
                  max_rpm: 5000,
                  spindle_nose: 'A2-5',
                },
                controller: {
                  brand: 'Fanuc',
                  model: '31i-A',
                  type: 'Twin-turret control',
                },
                turret: {
                  stations: 24,
                  interface: 'VDI30',
                },
                turret_count: 2,
                sub_spindle: true,
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const lathes = await fetchMachineCatalog('lathe');

    expect(lathes).toHaveLength(1);
    expect(lathes[0]?.toolingLayout?.turretTypeId).toBe('vdi30');
    expect(lathes[0]?.toolingLayout?.turretCount).toBe(2);
    expect(lathes[0]?.toolingLayout?.hasSubSpindle).toBe(true);
    expect(lathes[0]?.toolingLayout?.hasMillingHead).toBe(false);
  });

  it('normalizes Okuma lathe live-tool rows with camelCase topology, coolant, and controller packages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'OKUMA_LB3000_EXII_MY',
                name: 'Okuma LB3000 EX II MY',
                manufacturer: 'Okuma',
                type: 'Y_AXIS_TURNING_CENTER',
                capabilities: ['turning', 'live tooling', 'y-axis'],
                controller: {
                  brand: 'Okuma',
                  model: 'OSP-P300LA',
                  type: 'OSP control',
                },
                spindle: {
                  max_rpm: 4500,
                  spindle_nose: 'A2-8',
                },
                turret: {
                  stations: 24,
                  type: 'VDI40',
                  liveTooling: true,
                },
                toolInterface: 'VDI40',
                dualTurret: true,
                subSpindle: true,
                liveTools: true,
                yAxis: true,
                coolant: {
                  tscAvailable: true,
                  airBlast: true,
                },
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const lathes = await fetchMachineCatalog('lathe');

    expect(lathes).toHaveLength(1);
    expect(lathes[0]?.toolingLayout?.turretTypeId).toBe('vdi40');
    expect(lathes[0]?.toolingLayout?.turretCount).toBe(2);
    expect(lathes[0]?.toolingLayout?.hasSubSpindle).toBe(true);
    expect(lathes[0]?.toolingLayout?.liveTooling).toBe(true);
    expect(lathes[0]?.coolantOptionIds).toEqual(['flood', 'tsc', 'air']);
    expect(lathes[0]?.controllerCapabilityOptions?.map((option) => option.id)).toEqual(
      expect.arrayContaining([
        'okuma-cas',
        'okuma-machining-navi',
        'okuma-hsm',
        'okuma-hpcc',
        'okuma-probing',
        'okuma-ssv',
      ]),
    );
  });

  it('normalizes Okuma BMT45 lathe rows into stable BMT turret ids for downstream holder compatibility', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'OKUMA_GENOS_L300MY',
                name: 'Okuma GENOS L300-MY',
                manufacturer: 'Okuma',
                type: 'Y_AXIS_TURNING_CENTER',
                capabilities: ['turning', 'live tooling', 'y-axis'],
                controller: {
                  brand: 'Okuma',
                  model: 'OSP-P300LA',
                },
                spindle: {
                  max_rpm: 4200,
                  spindle_nose: 'A2-6',
                },
                turret: {
                  stations: 12,
                  interface: 'BMT45',
                  liveTooling: true,
                },
                toolInterface: 'BMT45',
                liveTools: true,
                yAxis: true,
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const lathes = await fetchMachineCatalog('lathe');

    expect(lathes).toHaveLength(1);
    expect(lathes[0]?.toolingLayout?.turretTypeId).toBe('bmt45');
    expect(lathes[0]?.toolingLayout?.turretTypeLabel).toBe('BMT45');
    expect(lathes[0]?.toolingLayout?.liveTooling).toBe(true);
  });

  it('prefers published turret_type over generic turret.type so VDI lathes keep the correct holder family', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'HAAS_ST_35',
                name: 'Haas ST-35',
                manufacturer: 'Haas',
                type: 'turning_center',
                spindle: {
                  max_rpm: 4500,
                  spindle_nose: 'A2-11',
                },
                controller: {
                  brand: 'Haas',
                  model: 'NGC',
                  type: 'Haas Next Generation Control',
                },
                turret: {
                  stations: 12,
                  type: 'BOT',
                  live_tooling_option: true,
                },
                turret_type: 'VDI40',
                coolant: {
                  tsc: true,
                },
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const lathes = await fetchMachineCatalog('lathe');

    expect(lathes).toHaveLength(1);
    expect(lathes[0]?.toolingLayout?.turretTypeId).toBe('vdi40');
    expect(lathes[0]?.toolingLayout?.turretTypeLabel).toBe('VDI40');
    expect(lathes[0]?.toolingLayout?.liveTooling).toBe(true);
  });

  it('normalizes generic BMT turret signatures into a stable fallback family for holder compatibility', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'NAKAMURA_WY_150',
                name: 'Nakamura-Tome WY-150',
                manufacturer: 'Nakamura Tome',
                type: 'turning_center',
                spindle: {
                  max_rpm: 4500,
                  spindle_nose: 'A2-6',
                },
                controller: {
                  brand: 'Fanuc',
                  model: '31i-B5',
                  type: 'Fanuc 31i-B5',
                },
                turret: {
                  stations: 24,
                  type: 'BMT',
                },
                liveTools: true,
                subSpindle: true,
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const lathes = await fetchMachineCatalog('lathe');

    expect(lathes).toHaveLength(1);
    expect(lathes[0]?.toolingLayout?.turretTypeId).toBe('bmt-standard');
    expect(lathes[0]?.toolingLayout?.turretTypeLabel).toBe('BMT');
    expect(lathes[0]?.toolingLayout?.liveTooling).toBe(true);
  });

  it('normalizes underscored VDI turret interfaces into stable ids for holder compatibility', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'OKUMA_LB4000_EXII',
                name: 'Okuma LB4000 EX II',
                manufacturer: 'Okuma',
                type: 'Y_AXIS_TURNING_CENTER',
                capabilities: ['turning', 'live tooling', 'y-axis'],
                controller: {
                  brand: 'Okuma',
                  model: 'OSP-P300LA',
                },
                spindle: {
                  max_rpm: 4500,
                  spindle_nose: 'A2-11',
                },
                turret: {
                  stations: 12,
                  interface: 'VDI_50',
                  liveTooling: true,
                },
                toolInterface: 'VDI_50',
                liveTools: true,
                yAxis: true,
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const lathes = await fetchMachineCatalog('lathe');

    expect(lathes).toHaveLength(1);
    expect(lathes[0]?.toolingLayout?.turretTypeId).toBe('vdi50');
    expect(lathes[0]?.toolingLayout?.turretTypeLabel).toBe('VDI50');
  });

  it('normalizes large VDI80 turning-center rows so heavy lathes stay compatible with fallback holder packages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'DN_PUMA_700LM',
                name: 'DN Solutions Puma 700LM',
                manufacturer: 'DN Solutions',
                type: 'turning_center',
                spindle: {
                  max_rpm: 4500,
                  spindle_nose: 'A2-20',
                },
                controller: {
                  brand: 'Fanuc',
                  model: '31i-B',
                  type: 'Fanuc 31i-B',
                },
                turret: {
                  stations: 12,
                  type: 'VDI80',
                },
                liveTools: true,
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const lathes = await fetchMachineCatalog('lathe');

    expect(lathes).toHaveLength(1);
    expect(lathes[0]?.toolingLayout?.turretTypeId).toBe('vdi80');
    expect(lathes[0]?.toolingLayout?.turretTypeLabel).toBe('VDI80');
    expect(lathes[0]?.toolingLayout?.liveTooling).toBe(true);
  });

  it('normalizes VTM turn-mill rows into multitask profiles with a published milling-head posture', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'OKUMA_VTM_120',
                name: 'Okuma VTM-120',
                manufacturer: 'Okuma',
                type: '5AXIS_VTL_MILLTURN',
                simultaneous_axes: 5,
                controller: {
                  brand: 'Okuma',
                  model: 'OSP-P300SA',
                },
                spindle: {
                  max_rpm: 50,
                  spindle_nose: 'Turning table',
                },
                millingSpindle: {
                  max_rpm: 12000,
                  taper: 'HSK-A63',
                },
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const lathes = await fetchMachineCatalog('lathe');

    expect(lathes).toHaveLength(1);
    expect(lathes[0]?.machineTypeId).toBe('lathe_multitask');
    expect(lathes[0]?.toolingLayout?.turretTypeId).toBe('turret-standard');
    expect(lathes[0]?.toolingLayout?.liveTooling).toBe(true);
    expect(lathes[0]?.toolingLayout?.hasMillingHead).toBe(true);
    expect(lathes[0]?.toolingLayout?.millingHeadLabel).toBe('B-axis milling head');
    expect(lathes[0]?.toolingLayout?.turretCount).toBe(1);
    expect(lathes[0]?.toolingLayout?.liveRpm).toBe(12000);
  });

  it('does not invent a CAT40 spindle interface when sparse mill rows do not publish one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'SPARSE_MILL_ROW',
                name: 'Sparse Mill Row',
                manufacturer: 'Builder',
                type: 'vertical_mill',
                spindle: {
                  max_rpm: 12000,
                },
                controller: {
                  brand: 'Builder',
                  model: 'Generic',
                },
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const mills = await fetchMachineCatalog('mill');

    expect(mills).toHaveLength(1);
    expect(mills[0]?.toolingLayout?.spindleConnectionTypeId).toBe('spindle-interface-unknown');
    expect(mills[0]?.toolingLayout?.spindleConnectionLabel).toBe('Spindle interface not published');
  });

  it('does not claim flood coolant capability when a machine row publishes no coolant evidence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            machines: [
              {
                id: 'NO_COOLANT_PUBLISHED',
                name: 'No Coolant Published',
                manufacturer: 'Builder',
                type: 'vertical_mill',
                spindle: {
                  max_rpm: 12000,
                  taper: 'CAT40',
                },
                controller: {
                  brand: 'Builder',
                  model: 'Generic',
                },
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const mills = await fetchMachineCatalog('mill');

    expect(mills).toHaveLength(1);
    expect(mills[0]?.coolantOptionIds ?? []).toEqual([]);
  });

  it('merges fetched material rows with the richer static catalog instead of dropping Kienzle baseline steels', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            materials: [
              {
                id: '4140',
                name: '4140 Steel',
                group: 'steel',
                base_sfm: 275,
              },
              {
                id: '1045',
                name: '1045 Steel',
                group: 'steel',
                base_sfm: 250,
              },
            ],
          },
        }),
      }),
    );

    const materials = await fetchMaterialCatalog('steel');
    const ids = materials.map((material) => material.id);

    expect(ids).toContain('1045');
    expect(ids).toContain('1018');
    expect(ids).toContain('4140-ph');
    expect(ids).toContain('4340');
    expect(materials.find((material) => material.id === '4140')?.hardness).toBe('197-235 HB');
  });

  it('pages the live material registry and maps ISO plus material taxonomy into calculator groups', async () => {
    const firstPage = {
      ok: true,
      json: async () => ({
        result: {
          materials: {
            _items: [
              {
                material_id: 'TS-P20-QT38',
                name: 'P20 Q&T 38 HRC',
                iso_group: 'P',
                material_type: 'tool_steel',
                subcategory: 'mold_steel',
                mechanical: {
                  hardness: {
                    rockwell_c: { min: 38, max: 40 },
                  },
                },
                machinability: {
                  aisi_rating: 36,
                },
                chip_formation: {
                  chip_breaking: 'moderate',
                  chip_type: 'continuous',
                },
                coolant_primary_recommendation: 'FLOOD',
                taylor: {
                  C_carbide: 156.8,
                },
              },
              {
                material_id: 'M-SS-0017',
                name: 'AISI 430 Standard Ferritic Cold Worked',
                iso_group: 'M',
                material_type: 'stainless',
                mechanical: {
                  hardness: {
                    brinell: { typical: 180 },
                  },
                },
                machinability: {
                  aisi_rating: 133,
                },
                chip_formation: {
                  chip_breaking: 'poor',
                  chip_type: 'continuous',
                },
                coolant_primary_recommendation: 'FLOOD',
                taylor: {
                  C_carbide: 310.5,
                },
              },
              {
                material_id: 'K-CI-036',
                name: 'Malleable Iron M3210 Ferritic (Blackheart)',
                iso_group: 'K',
                material_type: 'Malleable Cast Iron - Ferritic',
                subcategory: 'ferritic',
                mechanical: {
                  hardness: {
                    brinell: { min: 130, max: 180 },
                  },
                },
              },
            ],
            _total: 4,
          },
          total: 4,
          hasMore: true,
        },
      }),
    };
    const secondPage = {
      ok: true,
      json: async () => ({
        result: {
          materials: {
            _items: [
              {
                material_id: 'N-AL-6061-T6',
                name: '6061-T6 Aluminum',
                iso_group: 'N',
                material_type: 'aluminum',
                machinability: {
                  aisi_rating: 320,
                },
                chip_formation: {
                  chip_breaking: 'good',
                  chip_type: 'continuous',
                },
                coolant_primary_recommendation: 'MQL',
                taylor: {
                  C_carbide: 900,
                },
              },
            ],
            _total: 4,
          },
          total: 4,
          hasMore: false,
        },
      }),
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url, init) => {
        const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
        return (body?.offset ?? 0) >= 3 ? secondPage : firstPage;
      }),
    );

    const toolSteels = await fetchMaterialCatalog('tool_steel');
    const stainless = await fetchMaterialCatalog('stainless');
    const nonferrous = await fetchMaterialCatalog('aluminum');

    expect(toolSteels.find((material) => material.id === 'TS-P20-QT38')?.group).toBe('tool_steel');
    expect(toolSteels.find((material) => material.id === 'TS-P20-QT38')?.hardness).toBe('38-40 HRC');
    expect(stainless.find((material) => material.id === 'M-SS-0017')?.group).toBe('stainless');
    expect(stainless.find((material) => material.id === 'M-SS-0017')?.hardness).toBe('180 HB');
    expect(nonferrous.find((material) => material.id === 'N-AL-6061-T6')?.group).toBe('aluminum');
    expect(stainless.some((material) => material.id === 'K-CI-036')).toBe(false);
    expect((await fetchMaterialCatalog('cast')).find((material) => material.id === 'K-CI-036')?.group).toBe('cast');
  });

  it('maps titanium, copper, and exotic alloys into cleaner subcategories and preserves top-level hardness variants', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            materials: {
              _items: [
                {
                  material_id: 'TI-G5-STA',
                  name: 'Ti-6Al-4V (Grade 5) STA',
                  material_type: 'titanium alloy',
                  subcategory: 'alpha beta',
                  hardness_hrc: { min: 36, max: 38 },
                  coolant_primary_recommendation: 'HPC',
                },
                {
                  material_id: 'CU-C360-H',
                  name: 'C360 Free-Cutting Brass Hard',
                  material_type: 'brass',
                  hardness_hb: { min: 95, max: 105 },
                },
                {
                  material_id: 'EX-ZR702',
                  name: 'Zirconium 702 Annealed',
                  material_type: 'reactive alloy',
                  subcategory: 'zirconium',
                  hardness_hb: { typical: 165 },
                },
              ],
              _total: 3,
            },
            total: 3,
            hasMore: false,
          },
        }),
      }),
    );

    const titanium = await fetchMaterialCatalog('titanium');
    const copper = await fetchMaterialCatalog('copper');
    const exotic = await fetchMaterialCatalog('exotic_alloy');

    expect(titanium.find((material) => material.id === 'TI-G5-STA')?.group).toBe('titanium');
    expect(titanium.find((material) => material.id === 'TI-G5-STA')?.subcategoryId).toBe('alpha_beta');
    expect(titanium.find((material) => material.id === 'TI-G5-STA')?.hardness).toBe('36-38 HRC');

    expect(copper.find((material) => material.id === 'CU-C360-H')?.group).toBe('copper');
    expect(copper.find((material) => material.id === 'CU-C360-H')?.subcategoryId).toBe('brass');
    expect(copper.find((material) => material.id === 'CU-C360-H')?.hardness).toBe('95-105 HB');

    expect(exotic.find((material) => material.id === 'EX-ZR702')?.group).toBe('exotic_alloy');
    expect(exotic.find((material) => material.id === 'EX-ZR702')?.subcategoryId).toBe('zirconium');
    expect(exotic.find((material) => material.id === 'EX-ZR702')?.hardness).toBe('165 HB');
  });

  it('canonicalizes noisy live material taxonomy and backfills alternate machinability, chip, coolant, and speed fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            materials: {
              _items: [
                {
                  material_id: 'K-CI-036',
                  name: 'Malleable Iron M3210 Ferritic (Blackheart)',
                  material_type: 'Malleable Cast Iron - Ferritic',
                  subcategory: 'austenitic',
                  description: 'Blackheart malleable iron for precision machining',
                  condition: '',
                  identification: {
                    iso_group: 'K',
                    material_class: 'Cast Iron',
                  },
                  machinability_index: {
                    value: 110,
                  },
                  chip_breakability: 'fair',
                  chip_type: 'segmented',
                  recommended_coolant: 'FLOOD',
                  hardness_hb: {
                    value: 156,
                  },
                  recommendations: {
                    milling: {
                      speed: 180,
                    },
                  },
                },
              ],
              _total: 1,
            },
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const castMaterials = await fetchMaterialCatalog('cast');
    const material = castMaterials.find((item) => item.id === 'K-CI-036');

    expect(material?.group).toBe('cast');
    expect(material?.subcategoryId).toBe('malleable_iron');
    expect(material?.subcategoryLabel).toBe('Malleable Iron');
    expect(material?.conditionId).toBe('blackheart');
    expect(material?.conditionLabel).toBe('Blackheart');
    expect(material?.familyLabel).toBe('Cast Iron');
    expect(material?.isoGroup).toBe('K');
    expect(material?.machinability).toBe('110% AISI 1212');
    expect(material?.chipControl).toBe('Fair · Segmented');
    expect(material?.idealCoolant).toBe('Flood');
    expect(material?.hardness).toBe('156 HB');
    expect(material?.baseSfm).toBe(180);
  });

  it('does not let noisy subcategories pull steels, aluminum, or additive feedstock into the wrong top-level material groups', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            materials: {
              _items: [
                {
                  material_id: 'P-A572-NOISY',
                  name: 'A572 Grade 50',
                  iso_group: 'P',
                  material_type: 'structural steel',
                  subcategory: 'alpha-beta',
                  identification: {
                    material_class: 'Carbon/Alloy Steel',
                  },
                },
                {
                  material_id: 'N-7075-NOISY',
                  name: '7075-T6',
                  iso_group: 'N',
                  material_type: 'aluminum alloy',
                  subcategory: 'alpha-beta',
                  identification: {
                    material_class: 'Aluminum',
                  },
                },
                {
                  material_id: 'X-MIM-TI64',
                  name: 'MIM Ti-6Al-4V',
                  iso_group: 'X',
                  material_type: 'feedstock',
                  subcategory: 'hot_work',
                  identification: {
                    material_class: 'MIM feedstock',
                  },
                },
              ],
              _total: 3,
            },
            total: 3,
            hasMore: false,
          },
        }),
      }),
    );

    const allMaterials = await fetchMaterialCatalog();
    const titanium = await fetchMaterialCatalog('titanium');
    const toolSteel = await fetchMaterialCatalog('tool_steel');

    expect(allMaterials.find((material) => material.id === 'P-A572-NOISY')?.group).toBe('steel');
    expect(allMaterials.find((material) => material.id === 'N-7075-NOISY')?.group).toBe('aluminum');
    expect(allMaterials.find((material) => material.id === 'X-MIM-TI64')?.group).toBe('nontraditional');
    expect(titanium.some((material) => material.id === 'P-A572-NOISY')).toBe(false);
    expect(titanium.some((material) => material.id === 'N-7075-NOISY')).toBe(false);
    expect(toolSteel.some((material) => material.id === 'X-MIM-TI64')).toBe(false);
  });

  it('merges fetched tool rows with the richer static catalog so specialty mill and lathe tools stay available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            tools: [
              {
                id: 'adaptive-endmill',
                name: '0.5 in high-performance rougher',
                mode: 'mill',
                family: 'Variable-Flute End Mill',
                primary_operation: 'roughing',
              },
              {
                id: 'custom-lathe-drill',
                name: 'Custom center drill',
                mode: 'lathe',
                family: 'Centerline Drill',
                primary_operation: 'boring',
              },
            ],
          },
        }),
      }),
    );

    const millTools = await fetchToolCatalog('mill');
    const latheTools = await fetchToolCatalog('lathe');

    expect(millTools.map((tool) => tool.id)).toContain('ball-endmill');
    expect(millTools.map((tool) => tool.id)).toContain('carbide-drill');
    expect(latheTools.map((tool) => tool.id)).toContain('turn-thread');
    expect(latheTools.map((tool) => tool.id)).toContain('live-tool-endmill');
    expect(latheTools.map((tool) => tool.id)).toContain('custom-lathe-drill');
  });

  it('maps live backend tool rows into mode-correct calculator tools with rich catalog metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
        const query = body.query ?? '';

        if (query === '*') {
          return {
            ok: true,
            json: async () => ({
              result: {
                tools: [
                  {
                    id: 'EM-CAT-20001',
                    vendor: 'imco',
                    catalog_number: 'IMCO-POW-R-FEED-3-4F',
                    category: 'MILLING',
                    subcategory: 'END_MILLS',
                    type: 'SQUARE',
                    name: 'imco Pow-R-Feed Ø3 4F AlTiN',
                    description: 'High performance variable helix end mills',
                    cutting_diameter_mm: 3,
                    flute_count: 4,
                    helix_angle_deg: 35,
                    coating: 'AlTiN',
                    substrate: 'CARBIDE',
                    center_cutting: true,
                    coolant_through: true,
                    variable_helix: true,
                    cutting_params: {
                      P_STEELS: { vc_rec: 140, fz_rec: 0.02 },
                      M_STAINLESS: { vc_rec: 90, fz_rec: 0.015 },
                    },
                    roughing_capable: true,
                    finishing_capable: true,
                    price_usd: 61,
                    confidence: 0.88,
                  },
                  {
                    id: 'TN-CAT-9001',
                    vendor: 'sandvik',
                    catalog_number: 'CNMG120408-PM',
                    category: 'TURNING',
                    subcategory: 'EXTERNAL_TURNING',
                    type: 'CNMG',
                    name: 'CNMG120408 External Tool',
                    description: 'General-purpose rough turning insert',
                    insert_type: 'CNMG120408',
                    insert_grades: ['P25', 'M25'],
                    coating: 'TiCN/Al2O3',
                    substrate: 'CARBIDE',
                    nose_radius_mm: 0.8,
                    price_usd: 18,
                    confidence: 0.91,
                  },
                  {
                    id: 'BB-CAT-120',
                    vendor: 'iscar',
                    catalog_number: 'S12M-SCLCR06',
                    category: 'TURNING',
                    subcategory: 'BORING_BARS',
                    type: 'BORING_BAR',
                    name: '12 mm Boring Bar',
                    description: 'Internal turning boring bar',
                    coating: 'PVD',
                    substrate: 'CARBIDE',
                    price_usd: 142,
                    confidence: 0.86,
                  },
                ],
                total: 3,
                hasMore: false,
              },
            }),
          };
        }

        return {
          ok: true,
          json: async () => ({
            result: {
              tools: [],
              total: 0,
              hasMore: false,
            },
          }),
        };
      }),
    );

    const millTools = await fetchToolCatalog('mill');
    const latheTools = await fetchToolCatalog('lathe');

    const liveMill = millTools.find((tool) => tool.id === 'EM-CAT-20001');
    const liveLatheInsert = latheTools.find((tool) => tool.id === 'TN-CAT-9001');
    const liveLatheBoringBar = latheTools.find((tool) => tool.id === 'BB-CAT-120');

    expect(liveMill).toMatchObject({
      mode: 'mill',
      vendor: 'imco',
      catalogNumber: 'IMCO-POW-R-FEED-3-4F',
      source: 'database',
      bodyType: 'solid',
      geometryClass: 'variable-helix-endmill',
      toolMaterialClass: 'carbide',
      coolantThrough: true,
      centerCutting: true,
      variableHelix: true,
    });
    expect(liveMill?.materialGroupIds).toEqual(['P_STEELS', 'M_STAINLESS']);

    expect(liveLatheInsert).toMatchObject({
      mode: 'lathe',
      bodyType: 'indexable',
      geometryClass: 'roughing-insert',
      operation: 'turning_rough',
      vendor: 'sandvik',
      source: 'database',
    });
    expect(liveLatheInsert?.insertType).toBe('CNMG120408');
    expect(liveLatheBoringBar).toMatchObject({
      mode: 'lathe',
      geometryClass: 'boring-bar',
      operation: 'boring',
      holder: 'Boring bar holder',
    });
  });

  it('unwraps holder catalog payloads and preserves live style plus interface metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            holders: [
              {
                id: 'haimer-cat40-power-mini',
                label: 'Haimer Power Mini',
                detail: 'CAT40 Big Plus · Shrink fit · Through coolant',
                mode: 'mill',
                brandId: 'haimer',
                brandLabel: 'Haimer',
                holderStyleIds: ['machine-standard', 'shrink-fit'],
                holderType: 'SHRINK_FIT',
                spindleInterface: 'CAT40 Big Plus',
                compatibleLayoutKinds: ['magazine'],
                compatibleSpindleConnectionTypeIds: ['cat40-big-plus', 'cat40'],
                coolantThrough: true,
                maxRpm: 25000,
                source: 'database',
              },
            ],
          },
        }),
      }),
    );

    const holders = await fetchToolHolderCatalog({
      mode: 'mill',
      layoutKind: 'magazine',
      spindleConnectionTypeId: 'cat40-big-plus',
      toolId: 'finisher',
      toolOperation: 'finishing',
      toolGeometryClass: 'endmill',
    });

    expect(holders).toHaveLength(1);
    expect(holders[0]?.brandId).toBe('haimer');
    expect(holders[0]?.holderStyleId).toBe('shrink-fit');
    expect(holders[0]?.holderStyleIds).toEqual(['machine-standard', 'shrink-fit']);
    expect(holders[0]?.spindleInterface).toBe('CAT40 Big Plus');
    expect(holders[0]?.compatibleSpindleConnectionTypeIds).toEqual(['cat40-big-plus', 'cat40']);
    expect(holders[0]?.source).toBe('database');
  });

  it('returns an empty holder list when the holder catalog route is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'boom',
      }),
    );

    const holders = await fetchToolHolderCatalog({
      mode: 'lathe',
      layoutKind: 'turret',
      turretTypeId: 'vdi30',
      liveTooling: true,
      turretCount: 2,
      toolId: 'turn-finish',
      toolOperation: 'turning_finish',
      toolGeometryClass: 'finishing-insert',
    });

    expect(holders).toEqual([]);
  });

  it('surfaces a live nontraditional tool slice for wire edm instead of forcing a zero-row fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        const payload = init?.body ? JSON.parse(String(init.body)) : {};
        const query = String(payload.query ?? '');

        if (query === '*') {
          return {
            ok: true,
            json: async () => ({
              result: {
                tools: [
                  {
                    id: 'WIRE-025-BRASS',
                    vendor: 'fanuc',
                    category: 'WIRE_EDM',
                    subcategory: 'WIRE',
                    type: 'BRASS_WIRE',
                    name: '0.25 mm Brass Wire',
                    description: 'General-purpose brass wire for profile cutting and skim work',
                    confidence: 0.88,
                  },
                ],
                total: 1,
                hasMore: false,
              },
            }),
          };
        }

        return {
          ok: true,
          json: async () => ({
            result: {
              tools: [],
              total: 0,
              hasMore: false,
            },
          }),
        };
      }),
    );

    const toolState = await fetchToolCatalogState('wire_edm');

    expect(toolState.items.some((tool) => tool.id === 'WIRE-025-BRASS')).toBe(true);
    expect(toolState.liveCount).toBeGreaterThan(0);
    expect(toolState.source).not.toBe('fallback');
  });

  it('hydrates programming packages from the backend programming catalog route', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            programming: [
              {
                id: 'db-mill',
                mode: 'mill',
                label: 'Database CAM',
                vendor: 'Kienzle Data',
                kind: 'cam',
                summary: 'Live programming package from the backend route.',
                badge: 'Live',
                toolpaths: [
                  {
                    id: 'db-adaptive',
                    label: 'Adaptive Roughing',
                    path: 'Database CAM > Milling > Adaptive Roughing',
                    summary: 'Backend-served adaptive roughing path.',
                    operationId: 'roughing',
                  },
                ],
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const programmingState = await fetchProgrammingCatalogState('mill');

    expect(programmingState.source).toBe('live');
    expect(programmingState.liveCount).toBe(1);
    expect(programmingState.items).toEqual([
      {
        id: 'db-mill',
        mode: 'mill',
        label: 'Database CAM',
        vendor: 'Kienzle Data',
        kind: 'cam',
        summary: 'Live programming package from the backend route.',
        badge: 'Live',
        toolpaths: [
          {
            id: 'db-adaptive',
            label: 'Adaptive Roughing',
            path: 'Database CAM > Milling > Adaptive Roughing',
            summary: 'Backend-served adaptive roughing path.',
            operationId: 'roughing',
          },
        ],
      },
    ]);
  });

  it('marks backend-served curated programming packages as advisory fallback state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            source: 'curated',
            programming: [
              {
                id: 'db-laser',
                mode: 'laser',
                label: 'Curated Laser CAM',
                vendor: 'Kienzle Curated',
                kind: 'nesting',
                summary: 'Backend-served curated laser programming package.',
                badge: 'Curated',
                toolpaths: [
                  {
                    id: 'db-laser-profile',
                    label: 'Profile Cut',
                    path: 'Curated Laser CAM > Cutting > Profile',
                    summary: 'Curated backend-served profile cutting path.',
                    operationId: 'laser_cut',
                  },
                ],
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const programmingState = await fetchProgrammingCatalogState('laser');

    expect(programmingState.source).toBe('fallback');
    expect(programmingState.liveCount).toBe(0);
    expect(programmingState.fallbackCount).toBe(1);
    expect(programmingState.note).toContain('Backend-served curated programming catalog is active');
    expect(programmingState.authority).toMatchObject({
      badge: 'Curated programming service',
      posture: 'curated-service',
      usesJMDieSeed: false,
    });
    expect(programmingState.items[0]).toMatchObject({
      id: 'db-laser',
      mode: 'laser',
      label: 'Curated Laser CAM',
    });
  });

  it('marks curated mill programming with the JM Die authority spine when the canonical seed exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            source: 'curated',
            programming: [
              {
                id: 'db-mill-curated',
                mode: 'mill',
                label: 'Curated Mill CAM',
                vendor: 'Kienzle Curated',
                kind: 'cam',
                summary: 'Backend-served curated mill programming package.',
                badge: 'Curated',
                toolpaths: [
                  {
                    id: 'db-mill-adaptive',
                    label: 'Adaptive Roughing',
                    path: 'Curated Mill CAM > Milling > Adaptive',
                    summary: 'Curated backend-served adaptive path.',
                    operationId: 'roughing',
                  },
                ],
              },
            ],
            total: 1,
            hasMore: false,
          },
        }),
      }),
    );

    const programmingState = await fetchProgrammingCatalogState('mill');

    expect(programmingState.source).toBe('fallback');
    expect(programmingState.authority).toMatchObject({
      badge: 'JM Die curated programming',
      posture: 'curated-service',
      seedLabel: 'Cimatron',
      usesJMDieSeed: true,
    });
    expect(programmingState.note).toContain('JM Die canonical Cimatron seed remains advisory');
  });

  it('loads the full live tool catalog with wildcard paging instead of sampled query slices', async () => {
    const requests: Array<{ query?: string; offset?: number; limit?: number }> = [];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        const payload = init?.body ? JSON.parse(String(init.body)) : {};
        requests.push(payload);

        if ((payload.offset ?? 0) === 0) {
          return {
            ok: true,
            json: async () => ({
              result: {
                tools: [
                  {
                    id: 'DB-ENDMILL-12',
                    vendor: 'Sandvik',
                    category: 'ENDMILL',
                    subcategory: 'VARIABLE_HELIX',
                    type: 'VARIABLE_FLUTE_END_MILL',
                    name: '12 mm Variable Helix End Mill',
                    description: 'Full-catalog variable helix tool',
                    cutting_diameter_mm: 12,
                    flute_count: 5,
                    coating: 'AlTiN',
                  },
                ],
                total: 2,
                hasMore: true,
              },
            }),
          };
        }

        return {
          ok: true,
          json: async () => ({
            result: {
              tools: [
                {
                  id: 'DB-BALL-8',
                  vendor: 'Mitsubishi',
                  category: 'ENDMILL',
                  subcategory: 'BALL_NOSE',
                  type: 'BALL_END_MILL',
                  name: '8 mm Ball Nose End Mill',
                  description: 'Full-catalog ball nose finishing tool',
                  cutting_diameter_mm: 8,
                  flute_count: 2,
                  coating: 'TiSiN',
                },
              ],
              total: 2,
              hasMore: false,
            },
          }),
        };
      }),
    );

    const toolState = await fetchToolCatalogState('mill');

    expect(requests.length).toBe(2);
    expect(requests.every((payload) => payload.query === '*')).toBe(true);
    expect(toolState.sampled).toBe(false);
    expect(toolState.liveCount).toBeGreaterThanOrEqual(2);
    expect(toolState.items.some((tool) => tool.id === 'DB-ENDMILL-12')).toBe(true);
    expect(toolState.items.some((tool) => tool.id === 'DB-BALL-8')).toBe(true);
  });

  it('normalizes live nontraditional tool rows across edm, wire edm, laser, and waterjet', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        const payload = init?.body ? JSON.parse(String(init.body)) : {};
        const query = String(payload.query ?? '');

        if (query === '*') {
          return {
            ok: true,
            json: async () => ({
              result: {
                tools: [
                  {
                    id: 'EDM-GRAPHITE-10',
                    vendor: '3r',
                    category: 'SINKER_EDM',
                    subcategory: 'GRAPHITE_ELECTRODE',
                    type: 'GRAPHITE_ELECTRODE',
                    name: '10 mm Fine Graphite Electrode',
                    description: 'Graphite electrode for cavity roughing and finishing.',
                    confidence: 0.91,
                  },
                  {
                    id: 'WIRE-025-BRASS',
                    vendor: 'fanuc',
                    category: 'WIRE_EDM',
                    subcategory: 'WIRE',
                    type: 'BRASS_WIRE',
                    name: '0.25 mm Brass Wire',
                    description: 'General-purpose brass wire for profile cutting and skim work',
                    confidence: 0.88,
                  },
                  {
                    id: 'LASER-NOZZLE-15',
                    vendor: 'precitec',
                    category: 'LASER',
                    subcategory: 'NOZZLE',
                    type: 'SINGLE_NOZZLE',
                    name: '1.5 mm Single Nozzle',
                    description: 'Nitrogen cutting nozzle for edge-quality passes.',
                    confidence: 0.86,
                  },
                  {
                    id: 'WJ-NOZZLE-030',
                    vendor: 'omax',
                    category: 'WATERJET',
                    subcategory: 'MIXING_TUBE',
                    type: 'ABRASIVE_NOZZLE',
                    name: '0.030 in Orifice + 0.040 in Mixing Tube',
                    description: 'General abrasive cutting nozzle with taper-control compatibility.',
                    confidence: 0.84,
                  },
                ],
                total: 4,
                hasMore: false,
              },
            }),
          };
        }

        return {
          ok: true,
          json: async () => ({
            result: {
              tools: [],
              total: 0,
              hasMore: false,
            },
          }),
        };
      }),
    );

    const expectations = [
      { mode: 'edm', id: 'EDM-GRAPHITE-10', geometryClass: 'electrode', operation: 'burn_roughing' },
      { mode: 'wire_edm', id: 'WIRE-025-BRASS', geometryClass: 'wire', operation: 'wire_profile' },
      { mode: 'laser', id: 'LASER-NOZZLE-15', geometryClass: 'beam', operation: 'laser_cut' },
      { mode: 'waterjet', id: 'WJ-NOZZLE-030', geometryClass: 'stream', operation: 'abrasive_cut' },
    ] as const;

    for (const expectation of expectations) {
      const toolState = await fetchToolCatalogState(expectation.mode);
      const tool = toolState.items.find((item) => item.id === expectation.id);

      expect(tool).toBeDefined();
      expect(tool?.mode).toBe(expectation.mode);
      expect(tool?.geometryClass).toBe(expectation.geometryClass);
      expect(tool?.operation).toBe(expectation.operation);
      expect(tool?.source).toBe('database');
      expect(toolState.liveCount).toBeGreaterThan(0);
      expect(toolState.source).not.toBe('fallback');
    }
  });

  it('keeps holder choices populated from the curated fallback when the holder route is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'boom',
      }),
    );

    const holderState = await fetchToolHolderCatalogState({
      mode: 'lathe',
      layoutKind: 'turret',
      turretTypeId: 'capto-c6',
      liveTooling: true,
      hasMillingHead: true,
      toolId: 'turn-finish',
      toolOperation: 'turning_finish',
      toolGeometryClass: 'finishing-insert',
    }, HOLDER_PACKAGE_LIBRARY);

    expect(holderState.source).toBe('fallback');
    expect(holderState.items.length).toBeGreaterThan(0);
    expect(holderState.items.every((holder) => holder.mode === 'lathe')).toBe(true);
    expect(holderState.note).toContain('JM Die canonical VDI30 Turning Baseline');
  });

  it('keeps fallback lathe holder choices populated for VDI80 heavy-turning machines when the live holder route has no matching rows', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            holders: [],
          },
        }),
      }),
    );

    const holderState = await fetchToolHolderCatalogState({
      mode: 'lathe',
      layoutKind: 'turret',
      turretTypeId: 'vdi80',
      liveTooling: true,
      toolId: 'bore-bar',
      toolOperation: 'boring',
      toolGeometryClass: 'boring-bar',
    }, HOLDER_PACKAGE_LIBRARY);

    expect(holderState.source).toBe('fallback');
    expect(holderState.items.some((holder) => holder.id === 'sandvik-vdi-turn')).toBe(true);
  });

  it('normalizes canonical JM Die live holder seeds and keeps them selectable in the merged holder catalog', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            holders: [
              {
                id: 'th-jmd-vdi30-turning-baseline',
                label: 'VDI30 Turning Baseline',
                detail: 'JM Die canonical single-turret VDI turning baseline.',
                mode: 'lathe',
                brandId: 'jm-die',
                brandLabel: 'JM Die',
                holderStyleId: 'rigid-turning',
                holderStyleIds: ['machine-standard', 'rigid-turning'],
                holderType: 'OD_TURNING',
                holderSubcategory: 'JM_DIE_VDI_BASELINE',
                toolInterface: 'VDI30',
                compatibleLayoutKinds: ['turret'],
                compatibleTurretTypeIds: ['vdi40', 'vdi50', 'vdi60', 'vdi80'],
                source: 'database',
              },
            ],
          },
        }),
      }),
    );

    const holderState = await fetchToolHolderCatalogState({
      mode: 'lathe',
      layoutKind: 'turret',
      turretTypeId: 'vdi80',
      liveTooling: false,
      toolId: 'turn-finish',
      toolOperation: 'turning_finish',
      toolGeometryClass: 'finishing-insert',
    }, HOLDER_PACKAGE_LIBRARY);

    expect(holderState.source).toBe('hybrid');
    expect(holderState.items.some((holder) => holder.id === 'th-jmd-vdi30-turning-baseline')).toBe(true);
    expect(holderState.items.find((holder) => holder.id === 'th-jmd-vdi30-turning-baseline')?.source).toBe('database');
    expect(holderState.note).toContain('JM Die canonical VDI30 Turning Baseline seed remains selectable');
  });

  it('loads the backend-served live-plus-curated workholding catalog slice for the active machine mode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            categoryOptions: [
              { id: 'all', label: 'All workholding', detail: 'Show every fixture family.' },
              { id: 'vise', label: 'Vise systems', detail: 'Standard and 5-axis vise packages.' },
            ],
            brandOptions: [
              { id: 'all', label: 'All brands', detail: 'Show every workholding brand.' },
              { id: 'kurt', label: 'Kurt', detail: 'Precision vise systems.' },
            ],
            presetOptions: [
              {
                id: 'kurt-vise-parallels',
                label: 'Kurt vise + parallels',
                detail: 'Classic plate setup.',
                modes: ['mill'],
                categoryId: 'vise',
                brandId: 'kurt',
                workholdingId: 'vise-soft-jaw',
                stabilityId: 'production-stable',
              },
            ],
            stabilityOptions: [
              { id: 'production-stable', label: 'Production stable', detail: 'Balanced default.' },
            ],
            source: 'hybrid',
            liveCount: 12,
            fallbackCount: 1,
            note: 'Live H:\\Kienzle workholding and fixture products are merged with calculator-native presets so support-only and nontraditional setup packages remain selectable.',
          },
        }),
      }),
    );

    const workholdingState = await fetchWorkholdingCatalogState('mill');

    expect(workholdingState.source).toBe('hybrid');
    expect(workholdingState.liveCount).toBe(12);
    expect(workholdingState.fallbackCount).toBe(1);
    expect(workholdingState.bundle.categoryOptions.some((item) => item.id === 'vise')).toBe(true);
    expect(workholdingState.bundle.brandOptions.some((item) => item.id === 'kurt')).toBe(true);
    expect(workholdingState.bundle.presetOptions.some((item) => item.id === 'kurt-vise-parallels')).toBe(true);
    expect(workholdingState.note).toContain('Live H:\\Kienzle workholding and fixture products');
  });

  it('falls back to the local curated workholding catalog when the backend route is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'boom',
      }),
    );

    const workholdingState = await fetchWorkholdingCatalogState('lathe');

    expect(workholdingState.source).toBe('fallback');
    expect(workholdingState.bundle.presetOptions.some((item) => item.id === 'hainbuch-collet')).toBe(true);
    expect(workholdingState.note).toContain('local curated workholding catalog');
  });
});
