import { describe, expect, it } from 'vitest';

import {
  buildMachineAlarmCommerceView,
  buildMachinePartsCommerceView,
  buildMaterialCommerceView,
} from '../utils/calculatorPurchaseRecommendations';

describe('calculatorPurchaseRecommendations', () => {
  const selection = {
    unitSystem: 'inch' as const,
    tierId: 'standard',
    addOnIds: ['distributor-sourcing'],
    regionId: 'upper-midwest',
  };

  it('includes the expanded national vendor matrix in material buy options', () => {
    const view = buildMaterialCommerceView({
      selection,
      material: {
        id: 'h13',
        name: 'H13 Tool Steel',
        group: 'tool_steel',
        groupLabel: 'Tool steel',
        subcategoryLabel: 'Hot-work tool steel',
        conditionLabel: '44-48 HRC',
        hardness: '44-48 HRC',
        note: 'Typical hot-work die steel.',
        machinability: 'Moderate',
        chipControl: 'Short-breaking with the right edge prep',
        idealCoolant: 'Air blast / dry roughing',
        baseSfm: 220,
      },
      stockShape: 'plate',
      stockSource: 'purchased',
    });

    const firstRecommendation = view.recommendations[0];
    const vendorNames = firstRecommendation?.distributors.map((offer) => offer.name);

    expect(view.recommendations).toHaveLength(3);
    expect(vendorNames).toContain('MSC Industrial');
    expect(vendorNames).toContain('Grainger');
    expect(vendorNames).toContain('McMaster-Carr');
    expect(vendorNames).toContain('Misumi');
    expect(vendorNames).toContain('Fastenal');
    expect(vendorNames).toContain('PTSolutions');
    expect(vendorNames).toContain('Precision Marshall');
  });

  it('surfaces internal part records in machine parts buy options', () => {
    const view = buildMachinePartsCommerceView({
      selection,
      machine: {
        id: 'okuma-m460v-5ax',
        manufacturer: 'Okuma',
        model: 'GENOS M460V-5AX',
      } as never,
      controllerLabel: 'Okuma OSP-P300MA-H',
      spindleLabel: '15,000 RPM CAT 40 Big+',
      parts: [
        {
          id: 'part-1',
          part_number: 'OKM-TSC-SEAL',
          name: 'TSC rotary union seal kit',
          description: 'Seal and backup ring kit for coolant-through spindle service.',
          current_revision: 'B',
          status: 'active',
        },
      ],
    });

    expect(view.relatedRecords?.[0]?.label).toBe('TSC rotary union seal kit');
    expect(view.highlights[2]?.value).toBe('1 related records');
  });

  it('preserves alarm workspace parts and recommendations', () => {
    const view = buildMachineAlarmCommerceView({
      selection,
      machine: {
        id: 'haas-vf2ss',
        manufacturer: 'Haas',
        model: 'VF-2SS',
      } as never,
      workspace: {
        summary: 'Alarm desk summary',
        repairTracks: [
          {
            id: 'track-1',
            title: 'Verify root cause',
            detail: 'Check state and document recovery.',
            posture: 'Guided recovery',
          },
        ],
        relatedParts: [
          {
            id: 'sensor-kit',
            label: 'Axis sensor kit',
            category: 'Electrical',
            priceLabel: '$120 - $340',
            stockNote: 'Keep one on the shelf.',
            usageNote: 'Useful for recurring limit alarms.',
          },
        ],
        recommendations: [
          {
            id: 'alarm-kit',
            title: 'Alarm recovery kit',
            category: 'Top performing',
            detail: 'Recovery recommendation.',
            roiStrength: 'High ROI',
            estimatedPrice: '$220 - $680',
            payback: 'Recovered after one avoided stop',
            whyNow: 'Repeated alarm risk.',
            distributors: [],
          },
        ],
      },
    });

    expect(view.relatedRecords?.[0]?.label).toBe('Axis sensor kit');
    expect(view.recommendations[0]?.title).toBe('Alarm recovery kit');
  });
});
