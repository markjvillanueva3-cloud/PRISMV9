// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QualityManagementPage } from '../pages/QualityManagementPage';
import { MessagesPage } from '../pages/MessagesPage';
import { clearShellSession, persistAdminShellSession } from '../features/operating-system/shellSession';
import {
  qualityCalibrationAdd,
  qualityCalibrationDashboard,
  qualityFAICreate,
  qualityFAIList,
  qualityKPIs,
  qualityMaterialCert,
  qualityNCRCreate,
  qualityNCRList,
  qualitySPCChart,
  qualityTraceHeatLot,
  qualityTraceJob,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    qualityKPIs: vi.fn(),
    qualityCalibrationDashboard: vi.fn(),
    qualityNCRList: vi.fn(),
    qualityFAIList: vi.fn(),
    qualityTraceJob: vi.fn(),
    qualitySPCChart: vi.fn(),
    qualityCalibrationAdd: vi.fn(),
    qualityNCRCreate: vi.fn(),
    qualityFAICreate: vi.fn(),
    qualityMaterialCert: vi.fn(),
    qualityTraceHeatLot: vi.fn(),
  };
});

const mockQualityKpis = vi.mocked(qualityKPIs);
const mockQualityCalibrationDashboard = vi.mocked(qualityCalibrationDashboard);
const mockQualityNcrList = vi.mocked(qualityNCRList);
const mockQualityFaiList = vi.mocked(qualityFAIList);
const mockQualityTraceJob = vi.mocked(qualityTraceJob);
const mockQualitySpcChart = vi.mocked(qualitySPCChart);
const mockQualityCalibrationAdd = vi.mocked(qualityCalibrationAdd);
const mockQualityNcrCreate = vi.mocked(qualityNCRCreate);
const mockQualityFaiCreate = vi.mocked(qualityFAICreate);
const mockQualityMaterialCert = vi.mocked(qualityMaterialCert);
const mockQualityTraceHeatLot = vi.mocked(qualityTraceHeatLot);

function renderQuality(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/quality" element={<QualityManagementPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/jobs" element={<div>Jobs follow-up target</div>} />
        <Route path="/capture" element={<div>Capture follow-up target</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('QualityManagementPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearShellSession();
    persistAdminShellSession({
      id: 'login-quality-lead',
      displayName: 'Morgan Hale',
      email: 'morgan.hale@orchidprecision.com',
    });

    mockQualityKpis.mockReset();
    mockQualityCalibrationDashboard.mockReset();
    mockQualityNcrList.mockReset();
    mockQualityFaiList.mockReset();
    mockQualityTraceJob.mockReset();
    mockQualitySpcChart.mockReset();
    mockQualityCalibrationAdd.mockReset();
    mockQualityNcrCreate.mockReset();
    mockQualityFaiCreate.mockReset();
    mockQualityMaterialCert.mockReset();
    mockQualityTraceHeatLot.mockReset();

    mockQualityKpis.mockResolvedValue({
      result: {
        first_pass_yield: 97.2,
        scrap_rate: 1.1,
        ncr_count: 2,
        calibration_compliance: 98.5,
        fai_count: 11,
      },
    } as any);
    mockQualityCalibrationDashboard.mockResolvedValue({ result: { calibrations: [] } } as any);
    mockQualityNcrList.mockResolvedValue({
      result: {
        ncrs: [
          {
            id: 'NCR-221',
            job_id: 'JOB-2026-001',
            part_number: 'PART-77A',
            description: 'Containment review required before release.',
            severity: 'major',
            disposition: 'rework',
            status: 'open',
            cost_impact: 420,
          },
        ],
      },
    } as any);
    mockQualityFaiList.mockResolvedValue({ result: { fais: [] } } as any);
    mockQualityTraceJob.mockResolvedValue({ result: { job_id: 'JOB-2026-001', inspection_records: 3 } } as any);
    mockQualitySpcChart.mockResolvedValue({ result: {} } as any);
    mockQualityCalibrationAdd.mockResolvedValue({ result: { created: true } } as any);
    mockQualityNcrCreate.mockResolvedValue({ result: { created: true } } as any);
    mockQualityFaiCreate.mockResolvedValue({ result: { created: true } } as any);
    mockQualityMaterialCert.mockResolvedValue({ result: {} } as any);
    mockQualityTraceHeatLot.mockResolvedValue({ result: {} } as any);
  });

  it('preserves quality workflow context into messages while keeping upstream provenance visible', async () => {
    renderQuality(
      '/quality?source=jobs-desk&originSource=customers&originType=Customer&originId=CUST-001&originCustomer=Acme%20Aerospace&focusType=quality&focusId=NCR-221&focusJobId=JOB-2026-001&note=Carry%20containment%20review%20through%20quality%20and%20back%20into%20the%20customer%20thread.',
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Quality Management' })).toBeDefined();
    });

    expect(screen.getByText(/Jobs desk opened Quality Management with workflow context/i)).toBeDefined();
    expect(screen.getByText(/Upstream commercial origin:/i)).toBeDefined();
    expect(screen.getByText(/Customers & CRM/i)).toBeDefined();
    expect(screen.getByText(/Record:/i)).toBeDefined();
    expect(screen.getByText(/NCR NCR-221/i)).toBeDefined();
    expect(screen.getByText('NCR desk')).toBeDefined();

    const messagesLink = screen.getByRole('link', { name: /Open Messages follow-up/i });
    const captureLink = screen.getByRole('link', { name: /Capture quality evidence/i });
    const jobsLink = screen.getByRole('link', { name: /Return to Jobs/i });

    expect(messagesLink.getAttribute('href')).toContain('/messages?');
    expect(messagesLink.getAttribute('href')).toContain('source=quality-management');
    expect(messagesLink.getAttribute('href')).toContain('originSource=customers');
    expect(messagesLink.getAttribute('href')).toContain('focusType=quality');
    expect(messagesLink.getAttribute('href')).toContain('focusId=NCR-221');

    expect(captureLink.getAttribute('href')).toContain('/capture?');
    expect(captureLink.getAttribute('href')).toContain('source=quality-management');
    expect(captureLink.getAttribute('href')).toContain('originSource=customers');
    expect(captureLink.getAttribute('href')).toContain('target=quality');

    expect(jobsLink.getAttribute('href')).toContain('/jobs?');
    expect(jobsLink.getAttribute('href')).toContain('source=quality-management');
    expect(jobsLink.getAttribute('href')).toContain('originSource=customers');
    expect(jobsLink.getAttribute('href')).toContain('focusJobId=JOB-2026-001');

    fireEvent.click(messagesLink);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Messages' })).toBeDefined();
    });

    expect(screen.getByText(/Quality Management opened Messages with follow-up context/i)).toBeDefined();
    expect(screen.getByText(/Upstream commercial origin:/i)).toBeDefined();
    expect(screen.getAllByText(/Customers & CRM/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Focus:/i)).toBeDefined();
    expect(screen.getAllByText(/Quality NCR-221/i).length).toBeGreaterThan(0);
  });
});
