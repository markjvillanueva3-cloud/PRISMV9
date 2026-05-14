import { describe, expect, it } from 'vitest';
import { buildPartsLibraryReleaseSeed } from '../utils/partsLibraryReleaseSeed';

describe('buildPartsLibraryReleaseSeed', () => {
  it('infers hydraulic manifold and neutral compare posture from manifold STEP lineage', () => {
    expect(
      buildPartsLibraryReleaseSeed({
        part: {
          id: 'part-1',
          part_number: 'PART-2401',
          name: 'Hydraulic manifold body',
          description: '5-axis manifold body',
          material_name: '7075-T651',
          current_revision: 'Rev B',
        },
        revisions: [{ id: 'rev-2', revision: 'Rev B', change_description: 'Added clamp relief' }],
        attachments: [
          {
            id: 'att-1',
            file_id: 'file-1',
            entity_type: 'part',
            entity_id: 'part-1',
            attachment_type: 'cad',
            created_at: '2026-03-29T00:00:00Z',
            file: {
              id: 'file-1',
              original_name: 'manifold.step',
              mime_type: 'model/step',
              version: 2,
            },
          } as any,
        ],
      }),
    ).toEqual({
      partClassId: 'hydraulic-manifold',
      cadSourceId: 'neutral-compare',
    });
  });

  it('infers fusion master when the attached cad source is a fusion archive', () => {
    expect(
      buildPartsLibraryReleaseSeed({
        part: {
          id: 'part-2',
          part_number: 'PART-9901',
          name: 'Fixture plate',
        },
        revisions: [],
        attachments: [
          {
            id: 'att-2',
            file_id: 'file-2',
            entity_type: 'part',
            entity_id: 'part-2',
            attachment_type: 'cad',
            created_at: '2026-03-29T00:00:00Z',
            file: {
              id: 'file-2',
              original_name: 'fixture-plate.f3d',
              mime_type: 'application/octet-stream',
              version: 1,
            },
          } as any,
        ],
      }),
    ).toEqual({
      partClassId: 'fixture-plate',
      cadSourceId: 'fusion-master',
    });
  });
});
