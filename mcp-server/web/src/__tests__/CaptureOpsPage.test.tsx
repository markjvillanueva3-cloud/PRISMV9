// @vitest-environment jsdom
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CaptureOpsPage } from '../pages/CaptureOpsPage';

const mockGetUserMedia = vi.fn();
const stopTrack = vi.fn();
const fetchMock = vi.fn();

class FakeBarcodeDetector {
  async detect() {
    return [{ rawValue: 'PRISMJOB|job=JOB-4821|machine=MC-04|department=Machining', format: 'qr_code' }];
  }
}

async function renderPage(initialEntry = '/capture') {
  const view = render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CaptureOpsPage />
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(screen.getByText(/PRISM AI copilot/i)).toBeDefined();
  });

  return view;
}

function parseRelativeUrl(href: string) {
  return new URL(href, 'http://localhost');
}

beforeEach(() => {
  cleanup();
  stopTrack.mockReset();
  mockGetUserMedia.mockReset();
  fetchMock.mockReset();
  mockGetUserMedia.mockResolvedValue({
    getTracks: () => [{ stop: stopTrack }],
  } as unknown as MediaStream);

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: mockGetUserMedia,
    },
  });

  Object.defineProperty(globalThis, 'BarcodeDetector', {
    configurable: true,
    value: FakeBarcodeDetector,
  });

  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith('/session/memory/recall')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            success: true,
            categories: ['identity', 'roadmap'],
            memory: {
              identity: {
                purpose: {
                  value: 'PRISM is building a safety-critical manufacturing operating system with AI-native desk continuity.',
                },
              },
              roadmap: {
                current_phase: {
                  value: 'Keep hardening the beginning-of-app APPW desks around canonical routes, persistent memory, and explicit source posture.',
                },
              },
            },
          },
        }),
      } as Response;
    }

    if (url.endsWith('/session/health')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            health_status: 'GREEN',
            advisory: 'Healthy. Continue normally.',
            estimated_tokens: 49000,
          },
        }),
      } as Response;
    }

    if (url.endsWith('/classify')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            category: 'analysis',
            subcategory: 'capture_ops_brief',
            confidence: 0.93,
            tier: 'multi_domain',
            domains: ['operations', 'capture', 'workflow'],
          },
        }),
      } as Response;
    }

    if (url.endsWith('/route')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            tier: 'full_chain',
            domains: ['operations', 'manufacturing', 'workflow'],
            complexity: 'high',
            reason: 'Capture Ops spans workflow continuity, device fallback posture, and evidence routing.',
            estimated_steps: 3,
          },
        }),
      } as Response;
    }

    return {
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          task_id: 'TASK-CAPTURE-1',
          tier: 'full_chain',
          status: 'success',
          started_at: '2026-04-15T12:00:00Z',
          completed_at: '2026-04-15T12:00:01Z',
          duration_ms: 1000,
          domain_results: [
            {
              domain: 'operations',
              result: {
                summary: 'Route staged evidence back to the job packet first, then use messages only for follow-up that needs human continuity.',
              },
            },
          ],
          final_result: {
            summary: 'Route staged evidence back to the job packet first, then use messages only for follow-up that needs human continuity.',
          },
          authority_resolution: {
            winning_source: 'mounted',
            confidence: 0.95,
            conflicts_resolved: 0,
          },
          recommendations: [
            'Route staged evidence back to the job packet first, then use messages only for follow-up that needs human continuity.',
            'Keep manual QR and file-upload fallbacks available until live preview posture is stable.',
          ],
        },
      }),
    } as Response;
  });

  vi.stubGlobal('fetch', fetchMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('CaptureOpsPage', () => {
  it('keeps the PRISM AI copilot built into the capture desk with persistent memory context', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/PRISM AI copilot/i)).toBeDefined();
      expect(screen.getByText(/Persistent PRISM memory/i)).toBeDefined();
      expect(screen.getByText(/Mounted workflow continuity/i)).toBeDefined();
      expect(screen.getByText(/safety-critical manufacturing operating system with AI-native desk continuity/i)).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Refresh AI brief/i })).toBeDefined();
    await waitFor(() =>
      expect(
        screen.getAllByText(/Route staged evidence back to the job packet first, then use messages only for follow-up that needs human continuity\./i).length,
      ).toBeGreaterThan(0),
    );
  });

  it('renders the capture workspace with device posture and evidence lanes', async () => {
    await renderPage();

    expect(screen.getByText('Capture Ops')).toBeDefined();
    expect(screen.getByText('Live device posture')).toBeDefined();
    expect(screen.getByText('Job, print, and setup evidence')).toBeDefined();
    expect(screen.getByText('Troubleshooting video and sound')).toBeDefined();
    expect(screen.getByText('Command-surface truth')).toBeDefined();
  });

  it('stages uploaded evidence into the capture ledger', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText('Photo / print / setup files'), {
      target: {
        files: [new File(['photo'], 'setup-shot.jpg', { type: 'image/jpeg' })],
      },
    });

    expect(screen.getByText('setup-shot.jpg')).toBeDefined();
    expect(screen.getByText(/staged for job packet routing/i)).toBeDefined();
  });

  it('opens a live preview and decodes a QR frame when supported', async () => {
    await renderPage();

    const previewButton = screen.getByRole('button', { name: 'Start camera preview' });
    await waitFor(() => {
      expect(previewButton.hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
      expect(screen.getByText('Camera live')).toBeDefined();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByRole('button', { name: 'Scan live frame' }));

    await waitFor(() => {
      expect(screen.getByText('Live QR frame')).toBeDefined();
      expect(screen.getAllByText(/QR frame decoded from the live preview/i).length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });

  it('prefills capture context from upstream workflow links', async () => {
    await renderPage('/capture?originSource=alarm-decoder&originType=Alarm&originId=ALARM-414&originCustomer=North%20Cell&originThreadId=thread-alarm&target=alarm&job=ALARM-414&note=Capture%20chatter%20evidence');

    expect(screen.getAllByText('Alarm Decoder').length).toBeGreaterThan(0);
    expect(screen.getByText(/Target, record id, and capture note were prefilled/i)).toBeDefined();
    expect(screen.getByText(/Record:/)).toBeDefined();
    expect(screen.getByText(/Customer:/)).toBeDefined();
    expect(screen.getByText(/Thread:/)).toBeDefined();
    expect(screen.getByDisplayValue('ALARM-414')).toBeDefined();
    expect(screen.getByDisplayValue('Capture chatter evidence')).toBeDefined();
  });

  it('recognizes quote-builder as the launch source and preserves the prefills', async () => {
    await renderPage('/capture?originSource=quote-builder&originType=Quote&originId=QUOTE-902&originCustomer=Orbit%20Aero&originThreadId=thread-rfq&focusType=job&focusId=JOB-TRACK-1&focusJobId=JOB-TRACK-1&target=job&job=JOB-TRACK-1&note=Review%20tooling%20and%20setup');

    expect(screen.getAllByText('Quote Builder').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes('Context loaded from Quote Builder') ?? false)
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Target, record id, and capture note were prefilled/i)).toBeDefined();
    expect(screen.getByDisplayValue('JOB-TRACK-1')).toBeDefined();
    expect(screen.getByDisplayValue('Review tooling and setup')).toBeDefined();
  });

  it('returns to shop floor with preserved capture context', async () => {
    await renderPage('/capture?originSource=quote-builder&originType=Quote&originId=QUOTE-902&originCustomer=Orbit%20Aero&originThreadId=thread-rfq&focusType=job&focusId=JOB-TRACK-1&focusJobId=JOB-TRACK-1&job=JOB-TRACK-1&department=Quoting&machine=UMC-750&scan=PRISMJOB%7Cjob%3DJOB-TRACK-1&note=Review%20tooling%20and%20setup');

    const returnLink = screen.getByRole('link', { name: 'Return to shop-floor clock' });

    expect(returnLink.getAttribute('href')).toContain('/shop-clock?');
    expect(returnLink.getAttribute('href')).toContain('originSource=quote-builder');
    expect(returnLink.getAttribute('href')).toContain('originType=Quote');
    expect(returnLink.getAttribute('href')).toContain('originId=QUOTE-902');
    expect(returnLink.getAttribute('href')).toContain('focusType=job');
    expect(returnLink.getAttribute('href')).toContain('focusJobId=JOB-TRACK-1');
    expect(returnLink.getAttribute('href')).toContain('source=capture-ops');
    expect(returnLink.getAttribute('href')).toContain('job=JOB-TRACK-1');
    expect(returnLink.getAttribute('href')).toContain('department=Job+setup');
    expect(returnLink.getAttribute('href')).toContain('machine=UMC-750');
    expect(returnLink.getAttribute('href')).toContain('scan=PRISMJOB');
  });

  it('keeps the capture launcher separate from upstream quote provenance when returning to shop floor', async () => {
    await renderPage('/capture?source=capture-ops&originSource=quote-builder&originType=Quote&originId=QUOTE-902&originCustomer=Orbit%20Aero&originThreadId=thread-rfq&focusType=job&focusId=JOB-TRACK-1&focusJobId=JOB-TRACK-1&job=JOB-TRACK-1&department=Quoting&machine=UMC-750&scan=PRISMJOB%7Cjob%3DJOB-TRACK-1&note=Review%20tooling%20and%20setup');

    expect(screen.getByText(/Context loaded from/i)).toBeDefined();
    expect(screen.getAllByText(/Capture Ops/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Quote Builder').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Upstream commercial origin:/i).length).toBeGreaterThan(0);

    const returnLink = screen.getByRole('link', { name: 'Return to shop-floor clock' });

    expect(returnLink.getAttribute('href')).toContain('/shop-clock?');
    expect(returnLink.getAttribute('href')).toContain('source=capture-ops');
    expect(returnLink.getAttribute('href')).toContain('originSource=quote-builder');
    expect(returnLink.getAttribute('href')).toContain('originType=Quote');
    expect(returnLink.getAttribute('href')).toContain('originId=QUOTE-902');
  });

  it('opens messages follow-up with capture as the launcher while preserving upstream provenance', async () => {
    await renderPage('/capture?source=capture-ops&originSource=quote-builder&originType=Quote&originId=QUOTE-902&originCustomer=Orbit%20Aero&originThreadId=thread-rfq&focusType=job&focusId=JOB-TRACK-1&focusJobId=JOB-TRACK-1&job=JOB-TRACK-1&department=Quoting&machine=UMC-750&scan=PRISMJOB%7Cjob%3DJOB-TRACK-1&note=Review%20tooling%20and%20setup');

    const messagesLink = screen.getByRole('link', { name: 'Open Messages follow-up' });

    expect(messagesLink.getAttribute('href')).toContain('/messages?');
    expect(messagesLink.getAttribute('href')).toContain('source=capture-ops');
    expect(messagesLink.getAttribute('href')).toContain('originSource=quote-builder');
    expect(messagesLink.getAttribute('href')).toContain('originType=Quote');
    expect(messagesLink.getAttribute('href')).toContain('originId=QUOTE-902');
    expect(messagesLink.getAttribute('href')).toContain('thread=thread-rfq');
    expect(messagesLink.getAttribute('href')).toContain('focusJobId=JOB-TRACK-1');
  });

  it('preserves explicit packet focus when Capture Ops hands work back to shop floor and messages', async () => {
    await renderPage('/capture?source=print-to-cnc&originSource=wire-edm-results&originType=Wire%20EDM%20Result&originId=profile&focusType=packet&focusId=pkt__wire_edm__profile&focusPacketId=pkt__wire_edm__profile&job=JOB-TRACK-1&department=Programming&machine=ALN600G&scan=PRISMJOB%7Cjob%3DJOB-TRACK-1&note=Capture%20wire%20proof');

    const returnLink = screen.getByRole('link', { name: 'Return to shop-floor clock' });
    const messagesLink = screen.getByRole('link', { name: 'Open Messages follow-up' });
    const returnHref = returnLink.getAttribute('href');
    const messagesHref = messagesLink.getAttribute('href');

    expect(returnHref).toBeTruthy();
    expect(messagesHref).toBeTruthy();

    const returnUrl = parseRelativeUrl(returnHref ?? '');
    expect(returnUrl.pathname).toBe('/shop-clock');
    expect(returnUrl.searchParams.get('source')).toBe('capture-ops');
    expect(returnUrl.searchParams.get('originSource')).toBe('wire-edm-results');
    expect(returnUrl.searchParams.get('originType')).toBe('Wire EDM Result');
    expect(returnUrl.searchParams.get('originId')).toBe('profile');
    expect(returnUrl.searchParams.get('focusType')).toBe('packet');
    expect(returnUrl.searchParams.get('focusId')).toBe('pkt__wire_edm__profile');
    expect(returnUrl.searchParams.get('focusPacketId')).toBe('pkt__wire_edm__profile');
    expect(returnUrl.searchParams.get('focusJobId')).toBeNull();
    expect(returnUrl.searchParams.get('job')).toBe('JOB-TRACK-1');
    expect(returnUrl.searchParams.get('department')).toBe('CAM programming');
    expect(returnUrl.searchParams.get('machine')).toBe('ALN600G');

    const messagesUrl = parseRelativeUrl(messagesHref ?? '');
    expect(messagesUrl.pathname).toBe('/messages');
    expect(messagesUrl.searchParams.get('source')).toBe('capture-ops');
    expect(messagesUrl.searchParams.get('originSource')).toBe('wire-edm-results');
    expect(messagesUrl.searchParams.get('originType')).toBe('Wire EDM Result');
    expect(messagesUrl.searchParams.get('originId')).toBe('profile');
    expect(messagesUrl.searchParams.get('focusType')).toBe('packet');
    expect(messagesUrl.searchParams.get('focusId')).toBe('pkt__wire_edm__profile');
    expect(messagesUrl.searchParams.get('focusPacketId')).toBe('pkt__wire_edm__profile');
    expect(messagesUrl.searchParams.get('focusJobId')).toBeNull();
  });
});
