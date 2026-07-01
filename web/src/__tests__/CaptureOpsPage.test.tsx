// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CaptureOpsPage } from '../pages/CaptureOpsPage';

const mockGetUserMedia = vi.fn();
const stopTrack = vi.fn();

class FakeBarcodeDetector {
  async detect() {
    return [{ rawValue: 'PRISMJOB|job=JOB-4821|machine=MC-04|department=Machining', format: 'qr_code' }];
  }
}

function renderPage(initialEntry = '/capture') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CaptureOpsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  stopTrack.mockReset();
  mockGetUserMedia.mockReset();
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
});

describe('CaptureOpsPage', () => {
  it('renders the capture workspace with device posture and evidence lanes', () => {
    renderPage();

    expect(screen.getByText('Capture Ops')).toBeDefined();
    expect(screen.getByText('Live device posture')).toBeDefined();
    expect(screen.getByText('Job, print, and setup evidence')).toBeDefined();
    expect(screen.getByText('Troubleshooting video and sound')).toBeDefined();
  });

  it('stages uploaded evidence into the capture ledger', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Photo / print / setup files'), {
      target: {
        files: [new File(['photo'], 'setup-shot.jpg', { type: 'image/jpeg' })],
      },
    });

    expect(screen.getByText('setup-shot.jpg')).toBeDefined();
    expect(screen.getByText(/staged for job packet routing/i)).toBeDefined();
  });

  it('opens a live preview and decodes a QR frame when supported', async () => {
    renderPage();

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
      expect(screen.getByText(/QR frame decoded from the live preview/i)).toBeDefined();
    }, { timeout: 5000 });
  });

  it('prefills capture context from upstream workflow links', () => {
    renderPage('/capture?originSource=alarm-decoder&originType=Alarm&originId=ALARM-414&originCustomer=North%20Cell&originThreadId=thread-alarm&target=alarm&job=ALARM-414&note=Capture%20chatter%20evidence');

    expect(screen.getAllByText('Alarm Decoder').length).toBeGreaterThan(0);
    expect(screen.getByText(/Target, record id, and capture note were prefilled/i)).toBeDefined();
    expect(screen.getByText(/Record:/)).toBeDefined();
    expect(screen.getByText(/Customer:/)).toBeDefined();
    expect(screen.getByText(/Thread:/)).toBeDefined();
    expect(screen.getByDisplayValue('ALARM-414')).toBeDefined();
    expect(screen.getByDisplayValue('Capture chatter evidence')).toBeDefined();
  });

  it('recognizes quote-builder as the launch source and preserves the prefills', () => {
    renderPage('/capture?originSource=quote-builder&originType=Quote&originId=QUOTE-902&originCustomer=Orbit%20Aero&originThreadId=thread-rfq&focusType=job&focusId=JOB-TRACK-1&focusJobId=JOB-TRACK-1&target=job&job=JOB-TRACK-1&note=Review%20tooling%20and%20setup');

    expect(screen.getAllByText('Quote Builder').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes('Context loaded from Quote Builder') ?? false)
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Target, record id, and capture note were prefilled/i)).toBeDefined();
    expect(screen.getByDisplayValue('JOB-TRACK-1')).toBeDefined();
    expect(screen.getByDisplayValue('Review tooling and setup')).toBeDefined();
  });

  it('returns to shop floor with preserved capture context', () => {
    renderPage('/capture?originSource=quote-builder&originType=Quote&originId=QUOTE-902&originCustomer=Orbit%20Aero&originThreadId=thread-rfq&focusType=job&focusId=JOB-TRACK-1&focusJobId=JOB-TRACK-1&job=JOB-TRACK-1&department=Quoting&machine=UMC-750&scan=PRISMJOB%7Cjob%3DJOB-TRACK-1&note=Review%20tooling%20and%20setup');

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

  it('keeps the capture launcher separate from upstream quote provenance when returning to shop floor', () => {
    renderPage('/capture?source=capture-ops&originSource=quote-builder&originType=Quote&originId=QUOTE-902&originCustomer=Orbit%20Aero&originThreadId=thread-rfq&focusType=job&focusId=JOB-TRACK-1&focusJobId=JOB-TRACK-1&job=JOB-TRACK-1&department=Quoting&machine=UMC-750&scan=PRISMJOB%7Cjob%3DJOB-TRACK-1&note=Review%20tooling%20and%20setup');

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

  it('opens messages follow-up with capture as the launcher while preserving upstream provenance', () => {
    renderPage('/capture?source=capture-ops&originSource=quote-builder&originType=Quote&originId=QUOTE-902&originCustomer=Orbit%20Aero&originThreadId=thread-rfq&focusType=job&focusId=JOB-TRACK-1&focusJobId=JOB-TRACK-1&job=JOB-TRACK-1&department=Quoting&machine=UMC-750&scan=PRISMJOB%7Cjob%3DJOB-TRACK-1&note=Review%20tooling%20and%20setup');

    const messagesLink = screen.getByRole('link', { name: 'Open Messages follow-up' });

    expect(messagesLink.getAttribute('href')).toContain('/messages?');
    expect(messagesLink.getAttribute('href')).toContain('source=capture-ops');
    expect(messagesLink.getAttribute('href')).toContain('originSource=quote-builder');
    expect(messagesLink.getAttribute('href')).toContain('originType=Quote');
    expect(messagesLink.getAttribute('href')).toContain('originId=QUOTE-902');
    expect(messagesLink.getAttribute('href')).toContain('thread=thread-rfq');
    expect(messagesLink.getAttribute('href')).toContain('focusJobId=JOB-TRACK-1');
  });
});
