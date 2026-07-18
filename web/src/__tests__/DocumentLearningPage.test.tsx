// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocumentLearningPage } from '../pages/DocumentLearningPage';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    docList: vi.fn(),
    docUpload: vi.fn(),
    docExtract: vi.fn(),
    docGet: vi.fn(),
    docDelete: vi.fn(),
  };
});

import { docDelete, docExtract, docGet, docList, docUpload } from '../api/client';

const mockDocList = vi.mocked(docList);
const mockDocUpload = vi.mocked(docUpload);
const mockDocExtract = vi.mocked(docExtract);
const mockDocGet = vi.mocked(docGet);
const mockDocDelete = vi.mocked(docDelete);

beforeEach(() => {
  cleanup();
  mockDocList.mockReset();
  mockDocUpload.mockReset();
  mockDocExtract.mockReset();
  mockDocGet.mockReset();
  mockDocDelete.mockReset();
  mockDocList.mockResolvedValue({ result: { documents: [] } } as any);
});

describe('DocumentLearningPage', () => {
  it('shows inventory population packs alongside the learning workflow', async () => {
    render(
      <MemoryRouter>
        <DocumentLearningPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Document Learning' })).toBeDefined();
    expect(screen.getByText('Document intake convergence')).toBeDefined();
    expect(screen.getByText(/Inventory intake: Live \+ fallback/i)).toBeDefined();
    expect(await screen.findByText('Inventory population packs')).toBeDefined();
    expect(screen.getAllByText('Purchase order / receiving').length).toBeGreaterThan(0);
  });

  it('lets the user switch document type to a tooling-focused intake pack', async () => {
    render(
      <MemoryRouter>
        <DocumentLearningPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByLabelText('Document type')[0]).toBeDefined();
    });

    fireEvent.change(screen.getAllByLabelText('Document type')[0], { target: { value: 'tooling-invoice' } });

    expect((await screen.findAllByText('Tooling invoice / insert pack')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/tool crib/i).length).toBeGreaterThan(0);
  });

  it('routes document intake into inventory, messages, and capture ops', async () => {
    render(
      <MemoryRouter>
        <DocumentLearningPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Open Inventory intake/i })).toBeDefined();
    });

    const inventoryLink = screen.getAllByRole('link', { name: /Open Inventory intake/i })[0];
    const messagesLink = screen.getAllByRole('link', { name: /Open Messages follow-up/i })[0];
    const captureLink = screen.getAllByRole('link', { name: /Open Capture Ops/i })[0];

    expect(inventoryLink.getAttribute('href')).toContain('/inventory?');
    expect(inventoryLink.getAttribute('href')).toContain('source=document-learning');
    expect(inventoryLink.getAttribute('href')).toContain('tab=documents');
    expect(inventoryLink.getAttribute('href')).toContain('templateId=purchase-order');

    expect(messagesLink.getAttribute('href')).toContain('/messages?');
    expect(messagesLink.getAttribute('href')).toContain('source=document-learning');
    expect(messagesLink.getAttribute('href')).toContain('recordType=Document');

    expect(captureLink.getAttribute('href')).toContain('/capture?');
    expect(captureLink.getAttribute('href')).toContain('source=document-learning');
    expect(captureLink.getAttribute('href')).toContain('target=inventory');
  });
});
