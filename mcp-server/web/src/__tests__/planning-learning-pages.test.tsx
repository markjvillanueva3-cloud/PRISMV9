import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BatchPlanningPage } from '../pages/BatchPlanningPage';
import { CapacityPlanningPage } from '../pages/CapacityPlanningPage';
import { DocumentLearningPage } from '../pages/DocumentLearningPage';
import {
  batchCapacity,
  batchGroup,
  batchSequence,
  batchSetupMatrix,
  capacityAllLoads,
  capacityBottlenecks,
  capacityScheduleJob,
  capacitySummary,
  capacityWhatIf,
  docDelete,
  docExtract,
  docGet,
  docList,
  docUpload,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    batchCapacity: vi.fn(),
    batchGroup: vi.fn(),
    batchSequence: vi.fn(),
    batchSetupMatrix: vi.fn(),
    capacityAllLoads: vi.fn(),
    capacityBottlenecks: vi.fn(),
    capacityScheduleJob: vi.fn(),
    capacitySummary: vi.fn(),
    capacityWhatIf: vi.fn(),
    docDelete: vi.fn(),
    docExtract: vi.fn(),
    docGet: vi.fn(),
    docList: vi.fn(),
    docUpload: vi.fn(),
  };
});

const mockBatchCapacity = vi.mocked(batchCapacity);
const mockBatchGroup = vi.mocked(batchGroup);
const mockBatchSequence = vi.mocked(batchSequence);
const mockBatchSetupMatrix = vi.mocked(batchSetupMatrix);
const mockCapacityAllLoads = vi.mocked(capacityAllLoads);
const mockCapacityBottlenecks = vi.mocked(capacityBottlenecks);
const mockCapacityScheduleJob = vi.mocked(capacityScheduleJob);
const mockCapacitySummary = vi.mocked(capacitySummary);
const mockCapacityWhatIf = vi.mocked(capacityWhatIf);
const mockDocDelete = vi.mocked(docDelete);
const mockDocExtract = vi.mocked(docExtract);
const mockDocGet = vi.mocked(docGet);
const mockDocList = vi.mocked(docList);
const mockDocUpload = vi.mocked(docUpload);

function renderPage(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

beforeEach(() => {
  mockBatchCapacity.mockReset();
  mockBatchGroup.mockReset();
  mockBatchSequence.mockReset();
  mockBatchSetupMatrix.mockReset();
  mockCapacityAllLoads.mockReset();
  mockCapacityBottlenecks.mockReset();
  mockCapacityScheduleJob.mockReset();
  mockCapacitySummary.mockReset();
  mockCapacityWhatIf.mockReset();
  mockDocDelete.mockReset();
  mockDocExtract.mockReset();
  mockDocGet.mockReset();
  mockDocList.mockReset();
  mockDocUpload.mockReset();

  mockBatchGroup.mockResolvedValue({
    result: {
      groups: [
        { group_id: 'G1', jobs: ['J-001', 'J-002'], material: '6061-T6', setup_savings_min: 42, total_time_min: 210 },
      ],
    },
  } as any);
  mockBatchSequence.mockResolvedValue({
    result: {
      sequence: [
        { job_id: 'J-001', setup_min: 18, run_min: 62 },
        { job_id: 'J-002', setup_min: 12, run_min: 48 },
      ],
      total_setup_min: 30,
      savings_vs_naive_pct: 16.4,
    },
  } as any);
  mockBatchSetupMatrix.mockResolvedValue({
    result: {
      setup_matrix: {
        J001_to_J002: 12,
      },
    },
  } as any);
  mockBatchCapacity.mockResolvedValue({
    result: {
      fits_capacity: true,
      constrained_machine: 'VF2',
    },
  } as any);

  mockCapacityAllLoads.mockResolvedValue({
    result: {
      loads: [
        { machine_id: 'VF2', machine_name: 'Haas VF-2', total_hours: 64, capacity_hours: 80, utilization_pct: 80, jobs: [{ job_id: 'JOB-1', hours: 8, due_date: '2026-03-29' }] },
      ],
    },
  } as any);
  mockCapacityBottlenecks.mockResolvedValue({
    result: {
      bottlenecks: [
        { machine_id: 'UMC750', machine_name: 'Haas UMC-750', utilization_pct: 102, overload_hours: 4.5, recommendations: ['Shift one five-axis setup to weekend capacity.'] },
      ],
    },
  } as any);
  mockCapacitySummary.mockResolvedValue({
    result: {
      total_machines: 9,
      avg_utilization: 78,
      active_jobs: 24,
    },
  } as any);
  mockCapacityScheduleJob.mockResolvedValue({
    result: {
      machine_id: 'VF2',
      scheduled_start: '2026-03-28T08:00:00Z',
    },
  } as any);
  mockCapacityWhatIf.mockResolvedValue({
    result: {
      delta_utilization: -6.2,
      recommendation: 'Add overtime on VF2 and keep UMC load steady.',
    },
  } as any);

  mockDocList.mockResolvedValue({
    result: {
      documents: [
        {
          id: 'doc-1',
          file_path: 'C:/PRISM/RESOURCES/Sandvik-Handbook.pdf',
          title: 'Sandvik Handbook',
          format: 'pdf',
          status: 'complete',
          created_at: '2026-03-27T00:00:00Z',
          error: null,
        },
        {
          id: 'doc-2',
          file_path: 'C:/PRISM/RESOURCES/Turning-Guide.pdf',
          title: 'Turning Guide',
          format: 'pdf',
          status: 'pending',
          created_at: '2026-03-27T00:00:00Z',
          error: null,
        },
      ],
    },
  } as any);
  mockDocUpload.mockResolvedValue({ result: { ok: true } } as any);
  mockDocExtract.mockResolvedValue({ result: { ok: true } } as any);
  mockDocGet.mockResolvedValue({
    result: {
      id: 'doc-1',
      title: 'Sandvik Handbook',
      entries: [
        { type: 'tooling-guidance', content: 'Use positive-rake geometry for freer cutting in aluminum.', confidence: 0.91, tags: ['aluminum', 'geometry'] },
      ],
    },
  } as any);
  mockDocDelete.mockResolvedValue({ result: { ok: true } } as any);
});

afterEach(() => {
  cleanup();
});

describe('planning and learning pages', () => {
  it('renders the rebuilt batch planning workspace across group and sequence lanes', async () => {
    renderPage(<BatchPlanningPage />);

    expect(screen.getByRole('heading', { name: 'Batch Planning' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Group jobs' }));

    await waitFor(() => {
      expect(screen.getByText('42 min saved')).toBeDefined();
      expect(screen.getByText('J-001')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sequence' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Sequence' })[1]);

    await waitFor(() => {
      expect(screen.getByText('16.4%')).toBeDefined();
      expect(screen.getByText('1. J-001')).toBeDefined();
    });
  });

  it('renders the rebuilt capacity planning workspace and scenario lanes', async () => {
    renderPage(<CapacityPlanningPage />);

    expect(await screen.findByRole('heading', { name: 'Capacity Planning' })).toBeDefined();
    expect(screen.getByText('Haas VF-2')).toBeDefined();
    expect(screen.getByText('Haas UMC-750')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Schedule Job' }));
    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }));

    await waitFor(() => {
      expect(screen.getByText(/"machine_id": "VF2"/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'What-If Analysis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));

    await waitFor(() => {
      expect(screen.getByText(/"delta_utilization": -6.2/i)).toBeDefined();
    });
  });

  it('renders the rebuilt document learning desk and knowledge lane', async () => {
    renderPage(<DocumentLearningPage />);

    expect(await screen.findByRole('heading', { name: 'Document Learning' })).toBeDefined();
    expect(screen.getByText('Sandvik Handbook')).toBeDefined();

    fireEvent.click(screen.getAllByRole('button', { name: 'View knowledge' })[1]);

    await waitFor(() => {
      expect(screen.getByText('tooling-guidance')).toBeDefined();
      expect(screen.getByText(/positive-rake geometry/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Extraction Queue' }));
    expect(screen.getByText('Turning Guide')).toBeDefined();
  });
});
