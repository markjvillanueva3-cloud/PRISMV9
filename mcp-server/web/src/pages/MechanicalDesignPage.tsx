/**
 * MechanicalDesignPage — Mechanical Engineering Calculator
 *
 * Tab-based layout covering 51 mechanical design actions:
 * Gears, Bearings, Springs, Shafts, Fasteners, Couplings, Brakes, Drivetrain, Structural
 */

import { useState, useCallback } from 'react';
import {
  useGearCalculation,
  useBearingCalculation,
  useSpringCalculation,
  useShaftCalculation,
  useFastenerCalculation,
  useCouplingCalculation,
  useBrakeCalculation,
  useDrivetrainCalculation,
} from '../hooks/useMechanical';
import { MECHANICAL_CATEGORIES } from '../types/mechanical';

type TabId = 'gears' | 'bearings' | 'springs' | 'shafts' | 'fasteners' | 'couplings' | 'brakes' | 'drivetrain' | 'structural';

const TABS: { id: TabId; label: string; description: string }[] = [
  { id: 'gears', label: 'Gears', description: 'Bevel, worm, planetary, hypoid, rack-pinion, harmonic' },
  { id: 'bearings', label: 'Bearings', description: 'Ball, roller, journal, rolling contact' },
  { id: 'springs', label: 'Springs', description: 'Compression, extension, torsion, leaf' },
  { id: 'shafts', label: 'Shafts', description: 'Alignment, keyways, splines, crankshafts' },
  { id: 'fasteners', label: 'Fasteners', description: 'Bolts, rivets, flange connections' },
  { id: 'couplings', label: 'Couplings', description: 'Couplings, clutches, power transmission' },
  { id: 'brakes', label: 'Brakes', description: 'Disk, drum, shock absorbers' },
  { id: 'drivetrain', label: 'Drivetrain', description: 'Belts, chains, ball screws, linear guides' },
  { id: 'structural', label: 'Structural', description: 'Flywheels, gaskets, seals, Hertz contact' },
];

// ─── Gears Tab ─────────────────────────────────────────────────────────────

function GearsTab() {
  const { data, loading, error, calculateGear } = useGearCalculation();
  const [gearType, setGearType] = useState('bevel');
  const [params, setParams] = useState({
    module: 3,
    teeth_pinion: 20,
    teeth_gear: 60,
    pressure_angle: 20,
    power_kw: 5,
    rpm: 1500,
  });

  const handleCalculate = async () => {
    await calculateGear(gearType, { ...params, gear_type: gearType as any });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gear Type</label>
          <select
            value={gearType}
            onChange={e => setGearType(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="bevel">Bevel Gear</option>
            <option value="worm">Worm Gear</option>
            <option value="planetary">Planetary Gear</option>
            <option value="hypoid">Hypoid Gear</option>
            <option value="rack_pinion">Rack & Pinion</option>
            <option value="harmonic">Harmonic Drive</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Module (mm)</label>
          <input
            type="number"
            value={params.module}
            onChange={e => setParams(p => ({ ...p, module: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pinion Teeth</label>
          <input
            type="number"
            value={params.teeth_pinion}
            onChange={e => setParams(p => ({ ...p, teeth_pinion: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gear Teeth</label>
          <input
            type="number"
            value={params.teeth_gear}
            onChange={e => setParams(p => ({ ...p, teeth_gear: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Power (kW)</label>
          <input
            type="number"
            value={params.power_kw}
            onChange={e => setParams(p => ({ ...p, power_kw: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">RPM</label>
          <input
            type="number"
            value={params.rpm}
            onChange={e => setParams(p => ({ ...p, rpm: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
      </div>
      <button
        onClick={handleCalculate}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Calculating...' : 'Calculate'}
      </button>
      {error && <div className="text-red-600 dark:text-red-400">{error}</div>}
      {data && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium mb-2">Results</h4>
          <pre className="text-sm overflow-auto">{JSON.stringify(data.result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Bearings Tab ──────────────────────────────────────────────────────────

function BearingsTab() {
  const { data, loading, error, calculateBearing } = useBearingCalculation();
  const [action, setAction] = useState<'select' | 'rolling' | 'journal'>('select');
  const [params, setParams] = useState({
    bore_diameter: 25,
    radial_load: 5000,
    axial_load: 1000,
    rpm: 3000,
    life_hours: 10000,
  });

  const handleCalculate = async () => {
    await calculateBearing(action, { ...params, bearing_type: action === 'journal' ? 'journal' : 'ball' });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Calculation Type</label>
          <select
            value={action}
            onChange={e => setAction(e.target.value as any)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="select">Bearing Selection</option>
            <option value="rolling">Rolling Bearing Analysis</option>
            <option value="journal">Journal Bearing Analysis</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bore Diameter (mm)</label>
          <input
            type="number"
            value={params.bore_diameter}
            onChange={e => setParams(p => ({ ...p, bore_diameter: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Radial Load (N)</label>
          <input
            type="number"
            value={params.radial_load}
            onChange={e => setParams(p => ({ ...p, radial_load: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Axial Load (N)</label>
          <input
            type="number"
            value={params.axial_load}
            onChange={e => setParams(p => ({ ...p, axial_load: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">RPM</label>
          <input
            type="number"
            value={params.rpm}
            onChange={e => setParams(p => ({ ...p, rpm: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Required Life (hours)</label>
          <input
            type="number"
            value={params.life_hours}
            onChange={e => setParams(p => ({ ...p, life_hours: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
      </div>
      <button
        onClick={handleCalculate}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Calculating...' : 'Calculate'}
      </button>
      {error && <div className="text-red-600 dark:text-red-400">{error}</div>}
      {data && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium mb-2">Results</h4>
          <pre className="text-sm overflow-auto">{JSON.stringify(data.result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Springs Tab ───────────────────────────────────────────────────────────

function SpringsTab() {
  const { data, loading, error, calculateSpring } = useSpringCalculation();
  const [action, setAction] = useState<'calculate' | 'design'>('calculate');
  const [params, setParams] = useState({
    wire_diameter: 3,
    mean_diameter: 20,
    free_length: 50,
    active_coils: 8,
    load: 100,
  });

  const handleCalculate = async () => {
    await calculateSpring(action, { ...params, spring_type: 'compression' });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mode</label>
          <select
            value={action}
            onChange={e => setAction(e.target.value as any)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="calculate">Analyze Existing Spring</option>
            <option value="design">Design New Spring</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Wire Diameter (mm)</label>
          <input
            type="number"
            value={params.wire_diameter}
            onChange={e => setParams(p => ({ ...p, wire_diameter: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mean Diameter (mm)</label>
          <input
            type="number"
            value={params.mean_diameter}
            onChange={e => setParams(p => ({ ...p, mean_diameter: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Free Length (mm)</label>
          <input
            type="number"
            value={params.free_length}
            onChange={e => setParams(p => ({ ...p, free_length: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Active Coils</label>
          <input
            type="number"
            value={params.active_coils}
            onChange={e => setParams(p => ({ ...p, active_coils: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Load (N)</label>
          <input
            type="number"
            value={params.load}
            onChange={e => setParams(p => ({ ...p, load: +e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
      </div>
      <button
        onClick={handleCalculate}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Calculating...' : 'Calculate'}
      </button>
      {error && <div className="text-red-600 dark:text-red-400">{error}</div>}
      {data && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium mb-2">Results</h4>
          <pre className="text-sm overflow-auto">{JSON.stringify(data.result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Placeholder tabs (to be expanded) ─────────────────────────────────────

function PlaceholderTab({ name, actions }: { name: string; actions: string[] }) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-400">
        {name} calculations coming soon. Available actions:
      </p>
      <ul className="list-disc list-inside text-sm text-gray-500 dark:text-gray-500">
        {actions.map(a => (
          <li key={a}>{a.replace(/_/g, ' ')}</li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────

export function MechanicalDesignPage() {
  const [activeTab, setActiveTab] = useState<TabId>('gears');

  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'gears':
        return <GearsTab />;
      case 'bearings':
        return <BearingsTab />;
      case 'springs':
        return <SpringsTab />;
      case 'shafts':
        return <PlaceholderTab name="Shafts" actions={MECHANICAL_CATEGORIES.find(c => c.name === 'Shafts')?.actions || []} />;
      case 'fasteners':
        return <PlaceholderTab name="Fasteners" actions={MECHANICAL_CATEGORIES.find(c => c.name === 'Fasteners')?.actions || []} />;
      case 'couplings':
        return <PlaceholderTab name="Couplings" actions={MECHANICAL_CATEGORIES.find(c => c.name === 'Couplings')?.actions || []} />;
      case 'brakes':
        return <PlaceholderTab name="Brakes" actions={MECHANICAL_CATEGORIES.find(c => c.name === 'Brakes')?.actions || []} />;
      case 'drivetrain':
        return <PlaceholderTab name="Drivetrain" actions={MECHANICAL_CATEGORIES.find(c => c.name === 'Drivetrain')?.actions || []} />;
      case 'structural':
        return <PlaceholderTab name="Structural" actions={MECHANICAL_CATEGORIES.find(c => c.name === 'Structural')?.actions || []} />;
      default:
        return null;
    }
  }, [activeTab]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mechanical Design Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">51 engineering calculations for machine design</p>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex flex-wrap -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              title={tab.description}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        {renderTabContent()}
      </div>

      {/* Category Summary */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {MECHANICAL_CATEGORIES.map(cat => (
          <div key={cat.path} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white">{cat.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{cat.description}</p>
            <p className="text-xs text-gray-400 mt-1">{cat.actions.length} calculations</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MechanicalDesignPage;
