/**
 * Tests for DbBackedSelect -- renders a reference-catalog-backed select with honest
 * loading / live / curated / error state. Mocks the fetcher registry (no live server).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../api/sfcReferenceCatalogs', () => ({
  SFC_CATALOG_FETCHERS: { coating: vi.fn(), stock: vi.fn() },
}));

import { DbBackedSelect } from '../components/DbBackedSelect';
import { SFC_CATALOG_FETCHERS } from '../api/sfcReferenceCatalogs';

const mockCoating = SFC_CATALOG_FETCHERS.coating as unknown as ReturnType<typeof vi.fn>;
const mockStock = (SFC_CATALOG_FETCHERS as Record<string, unknown>).stock as ReturnType<typeof vi.fn>;

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  mockCoating.mockReset();
  mockStock.mockReset();
});
afterEach(() => cleanup());

const sampleDb = {
  options: [
    { id: 'tialn', label: 'TiAlN', detail: 'PVD - 3300 HV' },
    { id: 'altin', label: 'AlTiN', detail: 'PVD - 3500 HV' },
  ],
  source: 'database' as const,
  liveCount: 2,
};

describe('DbBackedSelect', () => {
  it('shows a loading option first, then renders the live options + a "live" badge', async () => {
    const d = deferred<typeof sampleDb>();
    mockCoating.mockReturnValue(d.promise);
    render(<DbBackedSelect catalog="coating" value="" onChange={() => {}} label="Coating" />);

    // While the promise is unresolved the select is busy + shows Loading.
    const select = screen.getByLabelText('Coating') as HTMLSelectElement;
    expect(select).toBeDisabled();
    expect(select.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Loading...')).toBeTruthy();

    d.resolve(sampleDb);
    await waitFor(() => expect(select).not.toBeDisabled());

    // Options came from the fetcher (not hardcoded).
    expect(screen.getByRole('option', { name: 'TiAlN' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'AlTiN' })).toBeTruthy();
    expect(screen.getByText('live')).toBeTruthy();
    expect(mockCoating).toHaveBeenCalledTimes(1);
  });

  it('renders a "curated" badge when the backend served the fallback set', async () => {
    mockCoating.mockResolvedValue({ ...sampleDb, source: 'curated' });
    render(<DbBackedSelect catalog="coating" value="" onChange={() => {}} label="Coating" />);
    await waitFor(() => expect(screen.getByText('curated')).toBeTruthy());
    expect(screen.queryByText('live')).toBeNull();
  });

  it('calls onChange with the selected option id', async () => {
    const onChange = vi.fn();
    mockCoating.mockResolvedValue(sampleDb);
    render(<DbBackedSelect catalog="coating" value="" onChange={onChange} label="Coating" />);
    const select = screen.getByLabelText('Coating') as HTMLSelectElement;
    await waitFor(() => expect(select).not.toBeDisabled());

    fireEvent.change(select, { target: { value: 'altin' } });
    expect(onChange).toHaveBeenCalledWith('altin');
  });

  it('surfaces an error state (alert + disabled + Unavailable) when the fetch rejects', async () => {
    mockCoating.mockRejectedValue(new Error('network boom'));
    render(<DbBackedSelect catalog="coating" value="" onChange={() => {}} label="Coating" />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toContain('network boom');
    const select = screen.getByLabelText('Coating') as HTMLSelectElement;
    expect(select).toBeDisabled();
    expect(screen.getByText('Unavailable')).toBeTruthy();
  });

  it('associates the label with the select (a11y) using the default catalog-derived id', async () => {
    mockCoating.mockResolvedValue(sampleDb);
    render(<DbBackedSelect catalog="coating" value="" onChange={() => {}} label="Tool Coating" />);
    await waitFor(() => expect(screen.getByLabelText('Tool Coating')).toBeTruthy());
    expect((screen.getByLabelText('Tool Coating') as HTMLSelectElement).id).toBe('dbselect-coating');
  });

  it('honors an explicit id + custom placeholder + showSourceBadge=false', async () => {
    mockCoating.mockResolvedValue(sampleDb);
    render(
      <DbBackedSelect
        catalog="coating"
        value=""
        onChange={() => {}}
        label="Coating"
        id="my-coating"
        placeholder="Pick a coating"
        showSourceBadge={false}
      />,
    );
    await waitFor(() => expect(screen.getByText('Pick a coating')).toBeTruthy());
    expect((screen.getByLabelText('Coating') as HTMLSelectElement).id).toBe('my-coating');
    expect(screen.queryByText('live')).toBeNull(); // badge suppressed
  });

  it('re-fetches via the new key when the catalog prop changes (generic key-driven)', async () => {
    mockCoating.mockResolvedValue(sampleDb);
    mockStock.mockResolvedValue({
      options: [{ id: 'stk-d2', label: 'D2 plate', detail: 'Plate - AISI D2' }],
      source: 'database' as const,
      liveCount: 1,
    });
    const { rerender } = render(
      <DbBackedSelect catalog="coating" value="" onChange={() => {}} label="Catalog" />,
    );
    await waitFor(() => expect(screen.getByRole('option', { name: 'TiAlN' })).toBeTruthy());
    expect(mockCoating).toHaveBeenCalledTimes(1);
    expect(mockStock).not.toHaveBeenCalled();

    // Change the catalog key -> the [catalog] dep must re-fetch via the new fetcher.
    rerender(<DbBackedSelect catalog="stock" value="" onChange={() => {}} label="Catalog" />);
    await waitFor(() => expect(screen.getByRole('option', { name: 'D2 plate' })).toBeTruthy());
    expect(mockStock).toHaveBeenCalledTimes(1);
    // The previous catalog's option must be gone (clean re-fetch, no stale flash).
    expect(screen.queryByRole('option', { name: 'TiAlN' })).toBeNull();
  });

  it('shows a distinct "No options available" when the catalog loads empty', async () => {
    mockCoating.mockResolvedValue({ options: [], source: 'curated' as const, liveCount: 0 });
    render(<DbBackedSelect catalog="coating" value="" onChange={() => {}} label="Coating" />);
    await waitFor(() => expect(screen.getByText('No options available')).toBeTruthy());
    expect(screen.queryByText('Select...')).toBeNull(); // not the generic placeholder
  });

  it('emits the option LABEL as the value when valueField="label" (contract-preserving wire)', async () => {
    // SpeedFeedPage sends tool_coating as the display string ("TiAlN"). valueField="label"
    // makes the <option value> the label so DB-wiring grows the list WITHOUT changing the
    // value the backend receives (the default valueField="id" path is pinned by the
    // "calls onChange with the selected option id" test above).
    const onChange = vi.fn();
    mockCoating.mockResolvedValue(sampleDb);
    render(<DbBackedSelect catalog="coating" valueField="label" value="" onChange={onChange} label="Coating" />);
    const select = screen.getByLabelText('Coating') as HTMLSelectElement;
    await waitFor(() => expect(select).not.toBeDisabled());

    const opt = screen.getByRole('option', { name: 'TiAlN' }) as HTMLOptionElement;
    expect(opt.value).toBe('TiAlN'); // the LABEL, not the id "tialn"

    fireEvent.change(select, { target: { value: 'AlTiN' } });
    expect(onChange).toHaveBeenCalledWith('AlTiN');
  });

  it('resolves a pre-set controlled LABEL value to the matching option (label-mode round-trip, no out-of-list warning)', async () => {
    // Pins the third contract path: SpeedFeedPage holds tool_coating="TiAlN" (a label) in
    // state and passes it as `value`; in label mode that must select the label-valued option.
    mockCoating.mockResolvedValue(sampleDb);
    render(<DbBackedSelect catalog="coating" valueField="label" value="TiAlN" onChange={() => {}} label="Coating" />);
    const select = screen.getByLabelText('Coating') as HTMLSelectElement;
    await waitFor(() => expect(select).not.toBeDisabled());
    expect(select.value).toBe('TiAlN');
  });

  it('applies labelClassName + selectClassName overrides, replacing (not appending) the defaults', async () => {
    mockCoating.mockResolvedValue(sampleDb);
    render(
      <DbBackedSelect
        catalog="coating"
        value=""
        onChange={() => {}}
        label="Coating"
        labelClassName="host-label-cls"
        selectClassName="host-select-cls"
      />,
    );
    const select = screen.getByLabelText('Coating') as HTMLSelectElement;
    await waitFor(() => expect(select).not.toBeDisabled());
    expect(select.className).toContain('host-select-cls');
    expect(select.className).not.toContain('bg-slate-800'); // default dark classes must not leak when overridden
    expect(screen.getByText('Coating').className).toContain('host-label-cls');
  });
});
