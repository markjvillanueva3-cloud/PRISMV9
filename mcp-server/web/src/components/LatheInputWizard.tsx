import { useState } from 'react';

export interface LatheWizardResult {
  partName: string;
  material: string;
  machineName: string;
  batchQuantity: number;
  stock: { diameter_mm: number; length_mm: number };
  finishRaUm?: number;
  tolerance?: string;
  notes?: string;
}

export interface LatheInputWizardProps {
  initial?: Partial<LatheWizardResult>;
  onComplete: (result: LatheWizardResult) => void;
  onCancel?: () => void;
}

const DEFAULTS: LatheWizardResult = {
  partName: '',
  material: '1018 Steel',
  machineName: 'Okuma LB-3000',
  batchQuantity: 10,
  stock: { diameter_mm: 25, length_mm: 100 },
};

export function LatheInputWizard({ initial, onComplete, onCancel }: LatheInputWizardProps) {
  const [state, setState] = useState<LatheWizardResult>({ ...DEFAULTS, ...initial, stock: { ...DEFAULTS.stock, ...initial?.stock } });

  const update = <K extends keyof LatheWizardResult>(key: K, value: LatheWizardResult[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-4 space-y-3 text-slate-200">
      <h3 className="text-lg font-semibold">Lathe Input</h3>

      <label className="block text-sm">
        Part name
        <input
          className="mt-1 block w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
          value={state.partName}
          onChange={(e) => update('partName', e.target.value)}
        />
      </label>

      <label className="block text-sm">
        Material
        <input
          className="mt-1 block w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
          value={state.material}
          onChange={(e) => update('material', e.target.value)}
        />
      </label>

      <label className="block text-sm">
        Machine
        <input
          className="mt-1 block w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
          value={state.machineName}
          onChange={(e) => update('machineName', e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          Stock dia (mm)
          <input
            type="number"
            className="mt-1 block w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
            value={state.stock.diameter_mm}
            onChange={(e) => update('stock', { ...state.stock, diameter_mm: Number(e.target.value) })}
          />
        </label>
        <label className="block text-sm">
          Stock len (mm)
          <input
            type="number"
            className="mt-1 block w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
            value={state.stock.length_mm}
            onChange={(e) => update('stock', { ...state.stock, length_mm: Number(e.target.value) })}
          />
        </label>
      </div>

      <label className="block text-sm">
        Batch quantity
        <input
          type="number"
          className="mt-1 block w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
          value={state.batchQuantity}
          onChange={(e) => update('batchQuantity', Number(e.target.value))}
        />
      </label>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          className="rounded bg-cyan-600 px-3 py-1 text-sm font-medium text-white hover:bg-cyan-500"
          onClick={() => onComplete(state)}
          disabled={!state.partName.trim()}
        >
          Continue
        </button>
        {onCancel && (
          <button
            type="button"
            className="rounded border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default LatheInputWizard;
