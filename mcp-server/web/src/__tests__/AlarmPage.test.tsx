// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlarmPage } from '../pages/AlarmPage';
import { ApiError, decodeAlarm } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    decodeAlarm: vi.fn(),
  };
});

const mockDecodeAlarm = vi.mocked(decodeAlarm);

function renderPage(initialEntry = '/alarms') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AlarmPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  mockDecodeAlarm.mockReset();
});

describe('AlarmPage', () => {
  it('renders the alarm workspace and decode controls', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Alarm Decoder' })).toBeDefined();
    expect(screen.getByLabelText('Alarm Code')).toBeDefined();
    expect(screen.getByLabelText('Controller')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Decode Alarm' })).toBeDefined();
    expect(screen.getByText('Controller and alarm input')).toBeDefined();
  });

  it('decodes an alarm and renders the operator response workspace', async () => {
    mockDecodeAlarm.mockResolvedValue({
      result: {
        code: '414',
        description: 'X axis overtravel detected',
        severity: 'critical',
        causes: ['Work offset is incorrect', 'Manual jog exceeded the travel limit'],
        remediation: ['Reset the axis position', 'Verify the active offset and safe restart point'],
      },
      safety: { score: 0.51, warnings: ['Stop the machine before recovery'] },
      meta: { formula_used: 'alarm-decode', uncertainty: 0.08 },
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('Alarm Code'), { target: { value: '414' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decode Alarm' }));

    await waitFor(() => {
      expect(screen.getAllByText('X axis overtravel detected').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText('CRITICAL').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Possible Causes')).toBeDefined();
    expect(screen.getByText('Resolution Steps')).toBeDefined();
    expect(screen.getByText('Work offset is incorrect')).toBeDefined();
    expect(screen.getByText('Verify the active offset and safe restart point')).toBeDefined();
  });

  it('shows an actionable error state and retries the decode', async () => {
    mockDecodeAlarm
      .mockRejectedValueOnce(new ApiError(500, 'Decoder unavailable'))
      .mockResolvedValueOnce({
        result: {
          code: '2006',
          description: 'Tool changer not ready',
          severity: 'warning',
          causes: ['Magazine station not homed'],
          remediation: ['Home the tool changer and re-run the change command'],
        },
        safety: { score: 0.74, warnings: [] },
        meta: { formula_used: 'alarm-decode', uncertainty: 0.12 },
      });

    renderPage();

    fireEvent.change(screen.getByLabelText('Alarm Code'), { target: { value: '2006' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decode Alarm' }));

    await waitFor(() => {
      expect(screen.getByText('Decoder unavailable')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getAllByText('Tool changer not ready').length).toBeGreaterThanOrEqual(1);
    });

    expect(mockDecodeAlarm).toHaveBeenCalledTimes(2);
  });

  it('surfaces related parts data and buy options on the alarm desk', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Fix guidance, related parts data, and buy options')).toBeDefined();
    });

    expect(screen.getByText('Related parts data and pricing')).toBeDefined();
    expect(screen.getByText('Coolant concentrate + refractometer pack')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Buy a coolant rescue kit/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Buy a coolant rescue kit purchase options/i })).toBeDefined();
    });

    expect(screen.getAllByText(/MSC Industrial/i).length).toBeGreaterThan(0);
  });

  it('links alarm troubleshooting into Capture Ops with context', async () => {
    renderPage();

    const link = screen.getByRole('link', { name: 'Open Capture Ops' });

    expect(link.getAttribute('href')).toContain('/capture?');
    expect(link.getAttribute('href')).toContain('source=alarm-decoder');
    expect(link.getAttribute('href')).toContain('target=alarm');
  });

  it('preserves routed machine and department context in the handoff links', () => {
    renderPage('/alarms?job=JOB-77&department=Mill%20cell&machine=Haas%20VF-2SS&note=Watch%20offset%20drift');

    const captureLink = screen.getByRole('link', { name: /Open Capture Ops/i });
    const shopFloorLink = screen.getByRole('link', { name: /Open Shop Floor follow-up/i });
    const captureHref = (captureLink.getAttribute('href') ?? '').replace(/\+/g, ' ');
    const shopFloorHref = (shopFloorLink.getAttribute('href') ?? '').replace(/\+/g, ' ');

    expect(captureHref).toContain('job=JOB-77');
    expect(captureHref).toContain('department=Mill cell');
    expect(captureHref).toContain('machine=Haas VF-2SS');
    expect(shopFloorHref).toContain('/shop-clock?');
    expect(shopFloorHref).toContain('source=alarm-decoder');
    expect(shopFloorHref).toContain('operation=Alarm follow-up');
  });

  it('preserves alarm context in the capture handoff after decode state changes', async () => {
    mockDecodeAlarm.mockResolvedValue({
      result: {
        code: '414',
        description: 'X axis overtravel detected',
        severity: 'critical',
        causes: ['Work offset is incorrect'],
        remediation: ['Reset the axis position'],
      },
      safety: { score: 0.51, warnings: ['Stop the machine before recovery'] },
      meta: { formula_used: 'alarm-decode', uncertainty: 0.08 },
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('Alarm Code'), { target: { value: '414' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decode Alarm' }));

    await waitFor(() => {
      expect(screen.getAllByText('X axis overtravel detected').length).toBeGreaterThanOrEqual(1);
    });

    const link = screen.getByRole('link', { name: 'Open Capture Ops' });
    const shopFloorLink = screen.getByRole('link', { name: /Open Shop Floor follow-up/i });

    expect(link.getAttribute('href')).toContain('/capture?');
    expect(link.getAttribute('href')).toContain('source=alarm-decoder');
    expect(link.getAttribute('href')).toContain('job=ALARM-414');
    expect(link.getAttribute('href')).toContain('target=alarm');
    expect(shopFloorLink.getAttribute('href')).toContain('/shop-clock?');
    expect(shopFloorLink.getAttribute('href')).toContain('source=alarm-decoder');
    expect(shopFloorLink.getAttribute('href')).toContain('job=ALARM-414');
  });
});
