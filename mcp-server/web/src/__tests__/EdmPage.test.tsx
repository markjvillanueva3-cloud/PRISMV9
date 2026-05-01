import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EdmPage from '../pages/EdmPage';

vi.mock('../hooks/useEdm', () => ({
  useEdmWire: () => ({
    params: {
      material: 'D2',
      thickness_mm: 25,
      wire_diameter_mm: 0.25,
      surface_finish_target_um: 0.8,
    },
    setParams: vi.fn(),
    results: {
      mrr_mm3_min: 12.5,
      cutting_speed_mm_min: 3.2,
      recommended_passes: 4,
      estimated_time_min: 45,
    },
    calculate: vi.fn(),
    loading: false,
    error: null,
  }),
  useEdmSinker: () => ({
    params: { material: 'Graphite', electrode_area_mm2: 100 },
    setParams: vi.fn(),
    results: { mrr_mm3_min: 8.5, wear_ratio: 0.3 },
    calculate: vi.fn(),
    loading: false,
    error: null,
  }),
  useEdmLaser: () => ({
    params: { material: 'Steel', power_w: 1000 },
    setParams: vi.fn(),
    results: { cutting_speed_mm_s: 50, kerf_width_mm: 0.15 },
    calculate: vi.fn(),
    loading: false,
    error: null,
  }),
}));

vi.mock('../api/wedmStudio', () => ({
  quickGenerate: vi.fn().mockResolvedValue({ ok: true }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/edm']}>
      <Routes>
        <Route path="/edm" element={<EdmPage />} />
        <Route path="/wire-edm" element={<div>Wire EDM Studio</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EdmPage', () => {
  describe('page structure', () => {
    it('renders the EDM page with title', () => {
      renderPage();
      expect(screen.getByText(/EDM/i)).toBeDefined();
    });

    it('displays Wire EDM tab', () => {
      renderPage();
      const wireTab = screen.getByRole('tab', { name: /wire/i });
      expect(wireTab).toBeDefined();
    });

    it('displays Sinker EDM tab', () => {
      renderPage();
      const sinkerTab = screen.getByRole('tab', { name: /sinker/i });
      expect(sinkerTab).toBeDefined();
    });

    it('displays Laser tab', () => {
      renderPage();
      const laserTab = screen.getByRole('tab', { name: /laser/i });
      expect(laserTab).toBeDefined();
    });
  });

  describe('Wire EDM calculator', () => {
    it('shows material input field', () => {
      renderPage();
      const materialInput = screen.getByLabelText(/material/i) ||
                           screen.getByPlaceholderText(/material/i) ||
                           screen.getByText(/D2/i);
      expect(materialInput).toBeDefined();
    });

    it('shows thickness input field', () => {
      renderPage();
      const thicknessInput = screen.getByLabelText(/thickness/i) ||
                            screen.getByText(/25/i);
      expect(thicknessInput).toBeDefined();
    });

    it('displays calculation results', () => {
      renderPage();
      expect(screen.getByText(/12\.5/i) || screen.getByText(/mrr/i)).toBeDefined();
    });
  });

  describe('Quick Generate panel', () => {
    it('displays Quick Generate section', () => {
      renderPage();
      expect(screen.getByText(/Quick Generate/i)).toBeDefined();
    });

    it('has file upload area', () => {
      renderPage();
      const uploadArea = screen.getByText(/DXF/i) ||
                        document.querySelector('input[type="file"]');
      expect(uploadArea).toBeDefined();
    });

    it('has controller selection dropdown', () => {
      renderPage();
      const controllerSelect = screen.getByText(/Fanuc/i) ||
                              screen.getByText(/controller/i);
      expect(controllerSelect).toBeDefined();
    });
  });

  describe('tab switching', () => {
    it('switches to Sinker EDM tab when clicked', async () => {
      renderPage();

      const sinkerTab = screen.getByRole('tab', { name: /sinker/i });
      fireEvent.click(sinkerTab);

      await waitFor(() => {
        expect(screen.getByText(/electrode/i) || screen.getByText(/sinker/i)).toBeDefined();
      });
    });

    it('switches to Laser tab when clicked', async () => {
      renderPage();

      const laserTab = screen.getByRole('tab', { name: /laser/i });
      fireEvent.click(laserTab);

      await waitFor(() => {
        expect(screen.getByText(/power/i) || screen.getByText(/laser/i)).toBeDefined();
      });
    });
  });

  describe('navigation', () => {
    it('has link to Wire EDM Studio', () => {
      renderPage();
      const studioLink = screen.getByRole('link', { name: /studio/i }) ||
                        screen.getByText(/wire.*edm.*studio/i);
      expect(studioLink).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('handles empty state gracefully', () => {
      renderPage();
      expect(screen.queryByText(/error/i)).toBeNull();
    });
  });
});
