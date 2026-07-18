/**
 * Document Learning Page — Unit tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocumentLearningPage } from '../pages/DocumentLearningPage';

vi.mock('../api/client', () => ({
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  docList: vi.fn().mockResolvedValue({
    result: {
      documents: [
        { id: 'DOC-001', file_path: 'C:/Kienzle/CATALOGS/test.pdf', title: 'Test Catalog', format: 'pdf', status: 'complete', created_at: '2026-03-06', error: null },
        { id: 'DOC-002', file_path: 'C:/Kienzle/CATALOGS/pending.pdf', title: null, format: 'pdf', status: 'pending', created_at: '2026-03-06', error: null },
        { id: 'DOC-003', file_path: 'C:/Kienzle/CATALOGS/failed.pdf', title: 'Failed Doc', format: 'pdf', status: 'failed', created_at: '2026-03-06', error: 'Parse error' },
      ],
    },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  docUpload: vi.fn().mockResolvedValue({
    result: { id: 'DOC-004', status: 'pending' },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  docExtract: vi.fn().mockResolvedValue({
    result: { id: 'DOC-002', status: 'extracting' },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  docGet: vi.fn().mockResolvedValue({
    result: {
      id: 'DOC-001',
      title: 'Test Catalog',
      entries: [
        { type: 'cutting_parameter', content: 'Vc = 200 m/min for 6061-T6', confidence: 0.95, tags: ['aluminum', 'speed'] },
        { type: 'tool_recommendation', content: 'Use 3-flute carbide for roughing', confidence: 0.88 },
      ],
    },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
  docDelete: vi.fn().mockResolvedValue({
    result: { deleted: true },
    safety: { score: 1, warnings: [] },
    meta: { formula_used: 'none', uncertainty: 0 },
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <DocumentLearningPage />
    </MemoryRouter>,
  );
}

describe('DocumentLearningPage', () => {
  it('renders page title and upload form', async () => {
    renderPage();
    expect(screen.getByText('Document Learning')).toBeDefined();
    expect(screen.getByText('Upload Document')).toBeDefined();
    expect(screen.getByPlaceholderText(/CATALOGS/)).toBeDefined();
  });

  it('loads and displays document list', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Catalog')).toBeDefined();
    });
    expect(screen.getByText('pending')).toBeDefined();
    expect(screen.getByText('complete')).toBeDefined();
    expect(screen.getByText('failed')).toBeDefined();
  });

  it('shows error message for failed documents', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Parse error')).toBeDefined();
    });
  });

  it('shows Extract button for pending documents', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Extract')).toBeDefined();
    });
  });

  it('shows View button for complete documents', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('View')).toBeDefined();
    });
  });

  it('calls docUpload when registering a document', async () => {
    const { docUpload } = await import('../api/client');
    renderPage();
    const pathInput = screen.getByPlaceholderText(/CATALOGS/);
    fireEvent.change(pathInput, { target: { value: 'C:/test/new.pdf' } });
    fireEvent.click(screen.getByText('Register Document'));
    await waitFor(() => {
      expect(docUpload).toHaveBeenCalledWith({ file_path: 'C:/test/new.pdf', title: undefined });
    });
  });

  it('calls docGet and shows knowledge entries when View is clicked', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('View')).toBeDefined();
    });
    fireEvent.click(screen.getByText('View'));
    await waitFor(() => {
      expect(screen.getByText(/Vc = 200/)).toBeDefined();
      expect(screen.getByText('cutting_parameter')).toBeDefined();
      expect(screen.getByText('95% confidence')).toBeDefined();
    });
  });

  it('shows tags on knowledge entries', async () => {
    renderPage();
    await waitFor(() => screen.getByText('View'));
    fireEvent.click(screen.getByText('View'));
    await waitFor(() => {
      expect(screen.getByText('aluminum')).toBeDefined();
      expect(screen.getByText('speed')).toBeDefined();
    });
  });

  it('shows document count in header', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Documents (3)')).toBeDefined();
    });
  });
});
