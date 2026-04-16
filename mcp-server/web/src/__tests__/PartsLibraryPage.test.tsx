// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PartsLibraryPage } from '../pages/PartsLibraryPage';
import {
  addPartRevision,
  attachPacketFile,
  createPart,
  getFileVersions,
  getPart,
  listPacketAttachments,
  listPartRevisions,
  listParts,
  uploadPacketFile,
} from '../api/parts';

vi.mock('../api/parts', () => ({
  listParts: vi.fn(),
  getPart: vi.fn(),
  listPartRevisions: vi.fn(),
  listPacketAttachments: vi.fn(),
  getFileVersions: vi.fn(),
  createPart: vi.fn(),
  addPartRevision: vi.fn(),
  uploadPacketFile: vi.fn(),
  attachPacketFile: vi.fn(),
}));

const mockListParts = vi.mocked(listParts);
const mockGetPart = vi.mocked(getPart);
const mockListPartRevisions = vi.mocked(listPartRevisions);
const mockListPacketAttachments = vi.mocked(listPacketAttachments);
const mockGetFileVersions = vi.mocked(getFileVersions);
const mockCreatePart = vi.mocked(createPart);
const mockAddPartRevision = vi.mocked(addPartRevision);
const mockUploadPacketFile = vi.mocked(uploadPacketFile);
const mockAttachPacketFile = vi.mocked(attachPacketFile);

function seedPartsApi() {
  mockListParts.mockResolvedValue({
    parts: [
      {
        id: 'part-1',
        part_number: 'PART-2401',
        name: 'Hydraulic manifold body',
        description: '5-axis manifold body',
        material_name: '7075-T651',
        current_revision: 'Rev B',
      },
    ],
    total: 1,
  });
  mockGetPart.mockResolvedValue({
    part: {
      id: 'part-1',
      part_number: 'PART-2401',
      name: 'Hydraulic manifold body',
      description: '5-axis manifold body',
      material_name: '7075-T651',
      current_revision: 'Rev B',
    },
    revisions: [],
  });
  mockListPartRevisions.mockResolvedValue([
    { id: 'rev-1', revision: 'Rev A', change_description: 'Initial release' },
    { id: 'rev-2', revision: 'Rev B', change_description: 'Added clamp relief' },
  ]);
  mockListPacketAttachments.mockResolvedValue([
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
    },
  ] as any);
  mockGetFileVersions.mockResolvedValue([
    { version: 1, original_name: 'manifold.step', change_description: 'Seed upload' },
    { version: 2, original_name: 'manifold.step', change_description: 'Updated stock allowance' },
  ]);
}

function renderPage(initialEntry = '/parts-library') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PartsLibraryPage />
    </MemoryRouter>,
  );
}

describe('PartsLibraryPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    seedPartsApi();
  });

  it('renders the mounted parts library and hydrates selected part detail', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Parts Library' })).toBeDefined();
    expect(await screen.findByText('PART-2401')).toBeDefined();
    expect(await screen.findAllByText('Hydraulic manifold body')).not.toHaveLength(0);
    expect(await screen.findByText('Revision lineage')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Open Quote Builder' })).toBeDefined();
  });

  it('supports adding revisions and uploading attachments', async () => {
    mockAddPartRevision.mockResolvedValue({
      id: 'rev-3',
      revision: 'Rev C',
      change_description: 'Added deburr note',
    } as any);
    mockUploadPacketFile.mockResolvedValue({
      file_id: 'file-2',
      original_name: 'setup-notes.pdf',
    } as any);
    mockAttachPacketFile.mockResolvedValue({
      id: 'att-2',
      file_id: 'file-2',
    } as any);

    renderPage();
    await screen.findByText('Hydraulic manifold body');

    fireEvent.change(screen.getByPlaceholderText('Rev C'), { target: { value: 'Rev C' } });
    fireEvent.change(screen.getByPlaceholderText(/Document what changed/i), { target: { value: 'Added deburr note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add revision' }));

    await waitFor(() => {
      expect(mockAddPartRevision).toHaveBeenCalledWith('part-1', expect.objectContaining({ revision: 'Rev C' }));
    });

    fireEvent.change(screen.getByLabelText('Attach part file'), {
      target: { files: [new File(['pdf'], 'setup-notes.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.change(screen.getByPlaceholderText('cad, drawing, setup'), { target: { value: 'drawing' } });
    fireEvent.change(screen.getByLabelText('Attachment notes'), { target: { value: 'Initial setup note upload.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload and attach' }));

    await waitFor(() => {
      expect(mockUploadPacketFile).toHaveBeenCalled();
        expect(mockAttachPacketFile).toHaveBeenCalledWith(
          expect.objectContaining({
            entity_type: 'part',
            entity_id: 'part-1',
            attachment_type: 'drawing',
            notes: 'Initial setup note upload.',
          }),
        );
    });
  });

  it('preserves launcher and upstream origin in downstream handoffs', async () => {
    renderPage('/parts-library?source=quote-builder&originSource=customers&originType=Customer&originId=CUST-001&originCustomer=Acme%20Aerospace&focusType=part&focusId=part-1');

    expect(await screen.findByText(/Quote Builder opened Parts Library with workflow context/i)).toBeDefined();
    expect(screen.getByText(/Upstream commercial origin:/i)).toBeDefined();
    expect(screen.getByText('Customers & CRM')).toBeDefined();

    const quoteLink = screen.getByRole('link', { name: 'Open Quote Builder' });
    const releaseLink = screen.getByRole('link', { name: 'Open Print to CNC' });
    const inventoryLink = screen.getByRole('link', { name: 'Open Inventory follow-up' });

    expect(decodeURIComponent(quoteLink.getAttribute('href') ?? '')).toContain('source=parts-library');
    expect(decodeURIComponent(quoteLink.getAttribute('href') ?? '')).toContain('originSource=customers');
    expect(decodeURIComponent(quoteLink.getAttribute('href') ?? '')).toContain('focusType=part');
    expect(decodeURIComponent(releaseLink.getAttribute('href') ?? '')).toContain('partClassId=hydraulic-manifold');
    expect(decodeURIComponent(releaseLink.getAttribute('href') ?? '')).toContain('cadSourceId=neutral-compare');
    expect(decodeURIComponent(inventoryLink.getAttribute('href') ?? '')).toContain('tab=documents');
  });

  it('registers a new part from the intake form', async () => {
    mockCreatePart.mockResolvedValue({
      part: { id: 'part-2', part_number: 'PART-9999', name: 'Fixture plate' },
      revision: { id: 'rev-9', revision: 'Rev A', change_description: 'Seed' },
    } as any);
    mockListParts.mockResolvedValueOnce({ parts: [], total: 0 }).mockResolvedValueOnce({
      parts: [{ id: 'part-2', part_number: 'PART-9999', name: 'Fixture plate', current_revision: 'Rev A' }],
      total: 1,
    });

    renderPage();

    fireEvent.change(screen.getByPlaceholderText('PART-2401'), { target: { value: 'PART-9999' } });
    fireEvent.change(screen.getByPlaceholderText('Hydraulic manifold body'), { target: { value: 'Fixture plate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register part' }));

    await waitFor(() => {
      expect(mockCreatePart).toHaveBeenCalledWith(expect.objectContaining({ part_number: 'PART-9999' }));
    });
  });
});
