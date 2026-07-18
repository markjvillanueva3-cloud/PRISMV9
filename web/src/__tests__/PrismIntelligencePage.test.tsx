// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PrismIntelligencePage } from '../pages/PrismIntelligencePage';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

function renderPage() {
  return render(
    <MemoryRouter>
      <OperatingSystemProvider services={fixtureOperatingSystemServices}>
        <PrismIntelligencePage />
      </OperatingSystemProvider>
    </MemoryRouter>,
  );
}

describe('PrismIntelligencePage', () => {
  it('renders the intelligence workspace and CLI catalog', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'PRISM Intelligence' })).toBeDefined();
    expect(screen.getByText('Reason over a live PRISM prompt')).toBeDefined();
    expect(screen.getByText('Chain Classifier')).toBeDefined();
    expect(screen.getByText('Chatter Anomaly Detector')).toBeDefined();
  });

  it('analyzes a roadmap prompt and exposes the routed chain', async () => {
    renderPage();

    const promptField = await screen.findByLabelText('Manufacturing prompt');
    fireEvent.change(promptField, {
      target: { value: 'Resume the roadmap milestone and show the next dependency-aware task.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Analyze prompt' }));

    await waitFor(() => {
      expect(screen.getByText('chain-roadmap')).toBeDefined();
    });

    expect(screen.getByText(/Open roadmap reasoning/i)).toBeDefined();
    expect(screen.getByText(/Task Orchestrator/i)).toBeDefined();
  });
});
