/**
 * Kienzle Tool Crib & Setup -- Page 1 of the Kienzle build.
 *
 * Layout: 3-column (356px setup+build | flex visual | 432px crib/offsets/work).
 * State is all client-side except the single real backend wire: inventory LIFE%
 * sourced from toolCribApi.inventory() via TanStack Query (loading/error/empty
 * states required by web CLAUDE.md). Everything else is the design's local
 * planner model (computeCribVals + per-machine crib/work/wp maps).
 *
 * The " * " (middle-dot) separator in tool names is load-bearing -- never replace.
 * 3D view deferred: renders the SVG kinematics view + a placeholder for 3D toggle.
 * Design source: design-imports/kienzle-app-build/Kienzle Tool Crib.dc.html
 */

import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toolCribApi } from '../api/toolCrib';
import type { InventoryReport } from '../api/toolCrib';

import {
  MACH,
  CONN_TYPES,
  TURRET_TYPES,
  GANG_TYPE,
  HOLDERS,
  TOOLING,
  INSERTS,
  typeTableFor,
  defaultTypeId,
  defaultCount,
  seedCrib,
  blankRow,
  defaultWork,
  defaultWP,
} from '../data/toolCribMachines';
import type { CribRow, WorkRow, WorkpieceState } from '../data/toolCribMachines';

import { computeCribVals } from '../lib/toolCribGeometry';
import type { CribState } from '../lib/toolCribGeometry';

import { AssemblyChain } from '../components/tool-crib/AssemblyChain';
import { CribTab } from '../components/tool-crib/CribTab';
import { OffsetsTab } from '../components/tool-crib/OffsetsTab';
import { ToolingSvg } from '../components/tool-crib/ToolingSvg';
import { TriageIssues } from '../components/tool-crib/TriageIssues';

// ── Types ─────────────────────────────────────────────────────────────────────

type RightTab = 'crib' | 'offsets' | 'work';

// Per-machine persisted state maps -- keyed by machineId.
interface PerMachineState {
  crib: CribRow[];
  work: WorkRow[];
  wp: WorkpieceState;
  setup: { typeId: string; count: number };
}

// ── Style constants ───────────────────────────────────────────────────────────

// Shared input style for the Setup + Build left panel (matches design exactly).
const INPUT_CLS =
  'w-full h-[40px] bg-[#14161B] border border-white/10 rounded-[9px] ' +
  'text-[#F3F4F6] text-[13px] font-mono px-[11px] focus:outline-none ' +
  'focus:border-white/25 transition-colors';

const SELECT_CLS =
  'w-full h-[40px] bg-[#14161B] border border-white/10 rounded-[9px] ' +
  'text-[#F3F4F6] text-[12.5px] px-[11px] pr-[30px] focus:outline-none ' +
  'focus:border-white/25 appearance-none cursor-pointer';

const LABEL_CLS = 'block text-[11.5px] text-[#9398A2] mb-[5px]';

const SECTION_HEADING =
  'font-mono text-[10.5px] tracking-[0.18em] text-[#FF5A2B] mb-[11px]';

// Tab button style factory (design: inline-flex pill tabs).
function tabBtnCls(active: boolean): string {
  return active
    ? 'px-[12px] py-[6px] rounded-[7px] font-mono text-[11.5px] font-semibold ' +
        'bg-[rgba(255,90,43,0.15)] text-[#FF7A4D] border border-[rgba(255,90,43,0.3)]'
    : 'px-[12px] py-[6px] rounded-[7px] font-mono text-[11.5px] ' +
        'text-[#6B7280] bg-transparent border border-transparent ' +
        'hover:text-[#9398A2] transition-colors';
}

// View toggle button style factory (design: segmented control pill inside the visual panel).
function viewBtnCls(active: boolean): string {
  return active
    ? 'px-[10px] py-[5px] rounded-[6px] font-mono text-[10.5px] font-semibold ' +
        'bg-[#FF5A2B] text-[#0A0B0D]'
    : 'px-[10px] py-[5px] rounded-[6px] font-mono text-[10.5px] ' +
        'text-[#6B7280] bg-transparent hover:text-[#9398A2] transition-colors';
}

// Unit toggle button style.
function unitBtnCls(active: boolean): string {
  return active
    ? 'px-[12px] py-[6px] rounded-[6px] font-mono text-[11.5px] font-semibold ' +
        'bg-[rgba(255,255,255,0.08)] text-[#F3F4F6]'
    : 'px-[12px] py-[6px] rounded-[6px] font-mono text-[11.5px] ' +
        'text-[#6B7280] bg-transparent hover:text-[#9398A2] transition-colors';
}

// ── Sub-panels (left column) ──────────────────────────────────────────────────

/** Left column: machine type/count/interface + travel chips. */
function MachineSetupPanel({
  machineId,
  typeId,
  count,
  unit,
  iface,
  onTypeChange,
  onCountChange,
}: {
  machineId: string;
  typeId: string;
  count: number;
  unit: 'in' | 'mm';
  iface: string;
  onTypeChange: (id: string) => void;
  onCountChange: (n: number) => void;
}) {
  const m = MACH[machineId];
  const typeTbl = typeTableFor(machineId);
  const typeOptions = Object.entries(typeTbl).map(([id, v]) => ({ id, label: v.label }));
  const lathe = m.kind !== 'magazine';

  const typeFieldLabel = m.kind === 'magazine' ? 'Spindle interface' : m.kind === 'turret' ? 'Turret type' : 'Gang configuration';
  const countFieldLabel = m.kind === 'magazine' ? 'ATC pockets' : m.kind === 'turret' ? 'Turret stations' : 'Gang stations';

  // Travel chips
  const chips: { k: string; v: string }[] = [];
  chips.push({ k: 'X', v: `${m.travels.x}"` });
  if (m.travels.y != null) chips.push({ k: 'Y', v: `${m.travels.y}"` });
  chips.push({ k: 'Z', v: `${m.travels.z}"` });
  if (!lathe && m.zClear != null) chips.push({ k: 'Z-CLR', v: `${m.zClear}"` });
  if (lathe && m.swing != null)   chips.push({ k: 'SWING', v: `${m.swing}"` });
  if (lathe && m.barCap != null)  chips.push({ k: 'BAR', v: `${m.barCap}"` });

  return (
    <>
      <div className={SECTION_HEADING}>MACHINE SETUP</div>
      <label className={LABEL_CLS}>{typeFieldLabel}</label>
      <select
        className={SELECT_CLS + ' mb-[10px]'}
        value={typeId}
        onChange={e => onTypeChange(e.target.value)}
      >
        {typeOptions.map(o => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-x-[10px] gap-y-[8px] mb-[11px]">
        <div>
          <label className={LABEL_CLS}>{countFieldLabel}</label>
          <input
            className={INPUT_CLS + ' border-[rgba(255,90,43,0.25)]'}
            type="number"
            inputMode="numeric"
            step={1}
            min={1}
            max={80}
            value={count}
            onChange={e => {
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n) && n > 0) onCountChange(n);
            }}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Interface</label>
          <div className="h-[40px] flex items-center px-[11px] bg-[#0E0F12] border border-white/[0.07] rounded-[9px] font-mono text-[12.5px] text-[#C7CCD4]">
            {iface}
          </div>
        </div>
      </div>

      {/* Travel chips -- 3 columns */}
      <div className="grid grid-cols-3 gap-[7px] mb-[16px]">
        {chips.map(c => (
          <div key={c.k} className="bg-[#0E0F12] border border-white/[0.07] rounded-[8px] px-[9px] py-[7px]">
            <div className="font-mono text-[9px] text-[#6B7280] tracking-[0.05em]">{c.k}</div>
            <div className="font-mono text-[12px] text-[#C7CCD4] mt-[2px]">{c.v}</div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Left column: workpiece dimensions. */
function WorkpiecePanel({
  machineId,
  wp,
  unit,
  onChange,
}: {
  machineId: string;
  wp: WorkpieceState;
  unit: 'in' | 'mm';
  onChange: (patch: Partial<WorkpieceState>) => void;
}) {
  const m = MACH[machineId];
  const lathe = m.kind !== 'magazine';

  const fields: { key: keyof WorkpieceState; label: string; step: number }[] = lathe
    ? [
        { key: 'dia',  label: `Part dia (${unit})`,    step: 0.1  },
        { key: 'pz',   label: `Part length (${unit})`, step: 0.1  },
      ]
    : [
        { key: 'px',    label: `Part X (${unit})`,     step: 0.1  },
        { key: 'py',    label: `Part Y (${unit})`,     step: 0.1  },
        { key: 'pz',    label: `Part Z / height (${unit})`, step: 0.1 },
        { key: 'depth', label: `Feature depth (${unit})`,   step: 0.01 },
      ];

  return (
    <>
      <div className={SECTION_HEADING}>WORKPIECE</div>
      <div className="grid grid-cols-2 gap-x-[10px] gap-y-[8px] mb-[16px]">
        {fields.map(f => (
          <div key={String(f.key)}>
            <label className={LABEL_CLS}>{f.label}</label>
            <input
              className={INPUT_CLS}
              type="number"
              inputMode="decimal"
              step={f.step}
              value={Number(wp[f.key])}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 0) onChange({ [f.key]: v } as Partial<WorkpieceState>);
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}

/** Left column: fixturing panel (mill only). */
function FixturingPanel({
  wp,
  unit,
  onChange,
}: {
  wp: WorkpieceState;
  unit: 'in' | 'mm';
  onChange: (patch: Partial<WorkpieceState>) => void;
}) {
  const fixTypes = [
    { id: 'vise',     label: 'Kurt DX6 vise'     },
    { id: 'plate',    label: 'Fixture plate'      },
    { id: 'trunnion', label: '5-ax trunnion'      },
    { id: 'softjaw',  label: 'Soft jaws'          },
  ];

  const originOptions = [
    { id: 'corner', label: 'Origin: front-left corner' },
    { id: 'center', label: 'Origin: part center'       },
  ];

  return (
    <>
      <div className={SECTION_HEADING}>FIXTURING & ORIGIN</div>
      <select
        className={SELECT_CLS + ' mb-[10px]'}
        value={wp.fixType}
        onChange={e => onChange({ fixType: e.target.value })}
      >
        {fixTypes.map(f => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-x-[10px] gap-y-[8px] mb-[10px]">
        <div>
          <label className={LABEL_CLS}>Fixture height ({unit})</label>
          <input
            className={INPUT_CLS}
            type="number"
            inputMode="decimal"
            step={0.5}
            value={wp.fixture}
            onChange={e => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= 0) onChange({ fixture: v });
            }}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Fixture X ({unit})</label>
          <input
            className={INPUT_CLS}
            type="number"
            inputMode="decimal"
            step={0.5}
            value={wp.fixX}
            onChange={e => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange({ fixX: v });
            }}
          />
        </div>
      </div>
      <div className="flex gap-[8px] mb-[16px]">
        <button
          onClick={() => onChange({ snap: !wp.snap })}
          className={
            'h-[36px] px-[10px] rounded-[8px] font-mono text-[11px] border transition-colors ' +
            (wp.snap
              ? 'bg-[rgba(42,111,219,0.15)] border-[rgba(42,111,219,0.35)] text-[#7FB2FF]'
              : 'bg-transparent border-white/10 text-[#6B7280]')
          }
        >
          {String.fromCharCode(0x229e)} Snap to T-slots
        </button>
        <select
          className={SELECT_CLS + ' flex-1'}
          style={{ height: '36px' }}
          value={wp.origin}
          onChange={e => onChange({ origin: e.target.value })}
        >
          {originOptions.map(o => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>
    </>
  );
}

/** Left column: build tool panel. Adds a tool to the selected station. */
function BuildToolPanel({
  machineId,
  unit,
  selStation,
  builder,
  onBuilderChange,
  onAddToCrib,
  onClearStation,
}: {
  machineId: string;
  unit: 'in' | 'mm';
  selStation: number;
  builder: CribState['builder'];
  onBuilderChange: (patch: Partial<CribState['builder']>) => void;
  onAddToCrib: () => void;
  onClearStation: () => void;
}) {
  const m = MACH[machineId];
  const kind = m.kind;
  const lathe = kind !== 'magazine';

  const holderOptions = HOLDERS[kind];
  const toolingOptions = TOOLING[kind];
  const insertOptions = INSERTS[kind];

  const heightFieldLabel = lathe ? 'Height # (H)' : 'Pocket # (H)';
  const diaFieldLabel    = lathe ? 'Dia offset (in)' : `Dia (${unit})`;

  const selSlotLabel =
    kind === 'magazine'
      ? `pocket ${selStation}`
      : kind === 'turret'
        ? `station ${selStation}`
        : `gang pos ${selStation}`;

  return (
    <>
      <div className={SECTION_HEADING}>BUILD TOOL {String.fromCharCode(0x2192)} {selSlotLabel.toUpperCase()}</div>

      <label className={LABEL_CLS}>Holder</label>
      <select
        className={SELECT_CLS + ' mb-[10px]'}
        value={builder.holderId}
        onChange={e => onBuilderChange({ holderId: e.target.value })}
      >
        {holderOptions.map(h => (
          <option key={h.id} value={h.id}>{h.label}</option>
        ))}
      </select>

      <label className={LABEL_CLS}>Tooling</label>
      <select
        className={SELECT_CLS + ' mb-[10px]'}
        value={builder.toolingId}
        onChange={e => onBuilderChange({ toolingId: e.target.value })}
      >
        {toolingOptions.map(t => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>

      <label className={LABEL_CLS}>Insert / edge</label>
      <select
        className={SELECT_CLS + ' mb-[12px]'}
        value={builder.insertId}
        onChange={e => onBuilderChange({ insertId: e.target.value })}
      >
        {insertOptions.map(i => (
          <option key={i.id} value={i.id}>{i.label}</option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-x-[10px] gap-y-[9px] mb-[13px]">
        <div>
          <label className={LABEL_CLS}>Tool # (T)</label>
          <input
            className={INPUT_CLS}
            type="number"
            inputMode="numeric"
            step={1}
            min={1}
            value={builder.toolNo}
            onChange={e => {
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n) && n > 0) onBuilderChange({ toolNo: n });
            }}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>{heightFieldLabel}</label>
          <input
            className={INPUT_CLS}
            type="number"
            inputMode="numeric"
            step={1}
            min={1}
            value={builder.heightNo}
            onChange={e => {
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n) && n > 0) onBuilderChange({ heightNo: n });
            }}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Gauge/proj ({unit})</label>
          <input
            className={INPUT_CLS}
            type="number"
            inputMode="decimal"
            step={0.001}
            value={builder.gauge}
            onChange={e => onBuilderChange({ gauge: e.target.value })}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>{diaFieldLabel}</label>
          <input
            className={INPUT_CLS}
            type="number"
            inputMode="decimal"
            step={0.0001}
            value={builder.offDia}
            onChange={e => onBuilderChange({ offDia: e.target.value })}
          />
        </div>
      </div>

      <button
        onClick={onAddToCrib}
        className="w-full border-0 bg-[#FF5A2B] text-[#0A0B0D] rounded-[10px] py-[12px] font-sans font-semibold text-[14px] cursor-pointer mb-[9px] hover:bg-[#FF7A4D] transition-colors min-h-[44px]"
      >
        + Add to {m.short} crib
      </button>
      <button
        onClick={onClearStation}
        className="w-full border border-white/[0.14] bg-transparent text-[#9398A2] rounded-[10px] py-[9px] font-sans font-semibold text-[12.5px] cursor-pointer hover:text-[#F3F4F6] transition-colors min-h-[44px]"
      >
        Clear {selSlotLabel}
      </button>
    </>
  );
}

/** Right col: Work Offsets tab -- G54..G59 editable table with machine-position card. */
function WorkOffsetsTab({
  machineId,
  work,
  onEditWork,
}: {
  machineId: string;
  work: WorkRow[];
  onEditWork: (code: string, field: 'x' | 'y' | 'z' | 'src', value: string) => void;
}) {
  const m = MACH[machineId];
  const hasY = m.kind === 'magazine';
  const axisCount = hasY ? 3 : 2;

  const machinePos = [
    { axis: 'X', val: '0.0000' },
    ...(hasY ? [{ axis: 'Y', val: '0.0000' }] : []),
    { axis: 'Z', val: '0.0000' },
  ];

  const liveOrigin = [
    { axis: 'X', val: '-12.4051' },
    ...(hasY ? [{ axis: 'Y', val: '-8.2210' }] : []),
    { axis: 'Z', val: '-14.0330' },
  ];

  const wcsColsLabel = hasY ? 'X / Y / Z' : 'X / Z';

  const srcOptions: { value: WorkRow['src']; label: string }[] = [
    { value: 'probe',  label: 'Probe'   },
    { value: 'manual', label: 'Manual'  },
    { value: 'g53',    label: 'From G53'},
  ];

  const codeColor = (code: string) =>
    code === 'G54' ? '#FF7A4D' : '#7FB2FF';

  const gridStyle = {
    gridTemplateColumns: `repeat(${axisCount},minmax(0,1fr))`,
    gap: '5px',
    display: 'grid' as const,
  };

  return (
    <div>
      {/* Machine position card */}
      <div className="bg-[#0E0F12] border border-white/[0.08] rounded-[11px] p-[12px_14px] mb-[13px]">
        <div className="flex justify-between items-center mb-[8px]">
          <span className="font-mono text-[10px] tracking-[0.1em] text-[#9398A2]">MACHINE POSITION {String.fromCharCode(0xB7)} G53</span>
          <span className="font-mono text-[9.5px] text-[#36D399]">{String.fromCharCode(0x25CF)} HOMED</span>
        </div>
        <div className="grid gap-[9px]" style={{ gridTemplateColumns: `repeat(${axisCount},minmax(0,1fr))` }}>
          {machinePos.map(p => (
            <div key={p.axis} className="bg-[#0A0B0D] border border-white/[0.07] rounded-[8px] px-[9px] py-[7px]">
              <div className="font-mono text-[10px] text-[#6B7280]">{p.axis}</div>
              <div className="font-mono text-[13px] text-[#C7CCD4] mt-[2px]">{p.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live origin from setup card */}
      <div
        className="rounded-[11px] p-[12px_14px] mb-[13px]"
        style={{
          background: 'linear-gradient(135deg,rgba(255,90,43,0.07),#0E0F12)',
          border: '1px solid rgba(255,90,43,0.22)',
        }}
      >
        <div className="flex justify-between items-center mb-[8px]">
          <span className="font-mono text-[10px] tracking-[0.1em] text-[#FF7A4D]">LIVE ORIGIN {String.fromCharCode(0xB7)} FROM SETUP</span>
          <button className="border border-[rgba(255,90,43,0.3)] bg-[rgba(255,90,43,0.1)] text-[#FF7A4D] rounded-[6px] px-[9px] py-[3px] font-mono text-[9.5px] cursor-pointer hover:bg-[rgba(255,90,43,0.18)] transition-colors min-h-[28px]">
            {String.fromCharCode(0x21B3)} set G54
          </button>
        </div>
        <div style={{ ...gridStyle, gap: '9px' }}>
          {liveOrigin.map(o => (
            <div key={o.axis} className="bg-[#0A0B0D] border border-white/[0.07] rounded-[8px] px-[9px] py-[7px]">
              <div className="font-mono text-[10px] text-[#6B7280]">{o.axis}</div>
              <div className="font-mono text-[13px] text-[#C7CCD4] mt-[2px]">{o.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WCS offset table header */}
      <div
        className="grid gap-[7px] px-[8px] pb-[6px] font-mono text-[9.5px] tracking-[0.06em] text-[#6B7280]"
        style={{ gridTemplateColumns: '46px 1fr 64px' }}
      >
        <span>WCS</span>
        <span>{wcsColsLabel}</span>
        <span>SOURCE</span>
      </div>

      {work.map(row => (
        <div key={row.code} className="px-[8px] py-[7px] border-b border-white/[0.05]">
          <div className="grid gap-[7px] items-center" style={{ gridTemplateColumns: '46px 1fr 64px' }}>
            <span className="font-mono text-[12px] font-bold" style={{ color: codeColor(row.code) }}>
              {row.code}
            </span>
            {/* Axis inputs */}
            <div style={gridStyle}>
              <input
                className="h-[31px] bg-[#14161B] border border-white/10 rounded-[7px] text-[#F3F4F6] font-mono text-[10.5px] px-[6px] w-full focus:outline-none focus:border-white/25"
                inputMode="decimal"
                value={row.x}
                onChange={e => onEditWork(row.code, 'x', e.target.value)}
              />
              {hasY && (
                <input
                  className="h-[31px] bg-[#14161B] border border-white/10 rounded-[7px] text-[#F3F4F6] font-mono text-[10.5px] px-[6px] w-full focus:outline-none focus:border-white/25"
                  inputMode="decimal"
                  value={row.y}
                  onChange={e => onEditWork(row.code, 'y', e.target.value)}
                />
              )}
              <input
                className="h-[31px] bg-[#14161B] border border-white/10 rounded-[7px] text-[#F3F4F6] font-mono text-[10.5px] px-[6px] w-full focus:outline-none focus:border-white/25"
                inputMode="decimal"
                value={row.z}
                onChange={e => onEditWork(row.code, 'z', e.target.value)}
              />
            </div>
            <select
              className="h-[31px] bg-[#14161B] border border-white/10 rounded-[7px] text-[#9398A2] text-[10.5px] px-[7px] w-full appearance-none focus:outline-none focus:border-white/25 cursor-pointer"
              value={row.src}
              onChange={e => onEditWork(row.code, 'src', e.target.value)}
            >
              {srcOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end mt-[5px]">
            <button className="border border-[rgba(255,90,43,0.3)] bg-[rgba(255,90,43,0.08)] text-[#FF7A4D] rounded-[6px] px-[9px] py-[3px] font-mono text-[9.5px] cursor-pointer hover:bg-[rgba(255,90,43,0.15)] transition-colors min-h-[28px]">
              {String.fromCharCode(0x2295)} capture machine pos
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const MACHINE_IDS = Object.keys(MACH);
const INITIAL_MACHINE = 'vm30i';

function makeMachineState(machineId: string): PerMachineState {
  const typeId = defaultTypeId(machineId);
  const count  = defaultCount(machineId, typeId);
  return {
    crib: seedCrib(machineId, count),
    work: defaultWork(machineId),
    wp:   defaultWP(machineId),
    setup: { typeId, count },
  };
}

function makeDefaultBuilder(machineId: string): CribState['builder'] {
  const m = MACH[machineId];
  const kind = m.kind;
  return {
    holderId:  HOLDERS[kind][0].id,
    toolingId: TOOLING[kind][0].id,
    insertId:  INSERTS[kind][0].id,
    toolNo:    TOOLING[kind][0] ? 1 : 1,
    heightNo:  1,
    gauge:     String(TOOLING[kind][0]?.proj ?? '3.000'),
    offDia:    '0.5000',
  };
}

export function ToolCribPage() {
  // ── Core state ───────────────────────────────────────────────────────────
  const [machineId, setMachineId] = useState<string>(INITIAL_MACHINE);
  const [unit, setUnit] = useState<'in' | 'mm'>('in');
  const [selStation, setSelStation] = useState<number>(1);
  const [view, setView] = useState<CribState['view']>('tooling');
  const [rightTab, setRightTab] = useState<RightTab>('crib');

  // Per-machine maps -- initialised lazily, avoids rebuilding all 12 machines.
  const [machineStateMap, setMachineStateMap] = useState<Record<string, PerMachineState>>(() => ({
    [INITIAL_MACHINE]: makeMachineState(INITIAL_MACHINE),
  }));

  // Per-machine builder state map.
  const [builderMap, setBuilderMap] = useState<Record<string, CribState['builder']>>(() => ({
    [INITIAL_MACHINE]: makeDefaultBuilder(INITIAL_MACHINE),
  }));

  // Lazily get-or-create per-machine state.
  const getMachineState = useCallback((id: string): PerMachineState => {
    return machineStateMap[id] ?? makeMachineState(id);
  }, [machineStateMap]);

  const getBuilder = useCallback((id: string): CribState['builder'] => {
    return builderMap[id] ?? makeDefaultBuilder(id);
  }, [builderMap]);

  const ms   = getMachineState(machineId);
  const bldr = getBuilder(machineId);

  // Patcher helpers.
  const patchMs = useCallback((patch: Partial<PerMachineState>) => {
    setMachineStateMap(prev => ({
      ...prev,
      [machineId]: { ...getMachineState(machineId), ...patch },
    }));
  }, [machineId, getMachineState]);

  const patchWp = useCallback((patch: Partial<WorkpieceState>) => {
    patchMs({ wp: { ...getMachineState(machineId).wp, ...patch } });
  }, [machineId, getMachineState, patchMs]);

  const patchBuilder = useCallback((patch: Partial<CribState['builder']>) => {
    setBuilderMap(prev => ({
      ...prev,
      [machineId]: { ...getBuilder(machineId), ...patch },
    }));
  }, [machineId, getBuilder]);

  // ── Machine switch ────────────────────────────────────────────────────────
  const handleMachineChange = useCallback((id: string) => {
    setMachineId(id);
    // Lazily seed the new machine if not yet visited.
    if (!machineStateMap[id]) {
      setMachineStateMap(prev => ({ ...prev, [id]: makeMachineState(id) }));
    }
    if (!builderMap[id]) {
      setBuilderMap(prev => ({ ...prev, [id]: makeDefaultBuilder(id) }));
    }
    setSelStation(1);
  }, [machineStateMap, builderMap]);

  // ── Setup panel: type / count changes ────────────────────────────────────
  const handleTypeChange = useCallback((typeId: string) => {
    const count = defaultCount(machineId, typeId);
    patchMs({
      setup: { typeId, count },
      crib: seedCrib(machineId, count),
    });
  }, [machineId, patchMs]);

  const handleCountChange = useCallback((count: number) => {
    const cur = getMachineState(machineId);
    // Grow or shrink the crib array, preserving loaded rows.
    const current = cur.crib;
    let updated: CribRow[];
    if (count > current.length) {
      updated = [
        ...current,
        ...Array.from({ length: count - current.length }, (_, i) => blankRow(current.length + i + 1)),
      ];
    } else {
      updated = current.slice(0, count);
    }
    patchMs({ setup: { ...cur.setup, count }, crib: updated });
  }, [machineId, getMachineState, patchMs]);

  // ── Add tool to crib ──────────────────────────────────────────────────────
  const handleAddToCrib = useCallback(() => {
    const cur = getMachineState(machineId);
    const m = MACH[machineId];
    const kind = m.kind;
    const holderLib  = HOLDERS[kind];
    const toolingLib = TOOLING[kind];
    const insertLib  = INSERTS[kind];
    const hSel = holderLib.find(h => h.id === bldr.holderId)   ?? holderLib[0];
    const tSel = toolingLib.find(t => t.id === bldr.toolingId) ?? toolingLib[0];
    const iSel = insertLib.find(i => i.id === bldr.insertId)   ?? insertLib[0];

    const proj = parseFloat(bldr.gauge) || tSel.proj;
    const name = `${tSel.label} ${String.fromCharCode(0xB7)} ${hSel.label}`;
    const dia  = parseFloat(bldr.offDia) || 0;

    const updated = cur.crib.map(r =>
      r.stn !== selStation
        ? r
        : {
            ...r,
            loaded: true,
            T:      bldr.toolNo,
            H:      bldr.heightNo,
            name,
            holder:  hSel.label,
            tooling: tSel.label,
            insert:  iSel.label,
            proj,
            w:    tSel.w,
            len:  proj.toFixed(4),
            dia:  dia.toFixed(4),
            wear: '0.0000',
            lifePct: 1.0,
          }
    );
    patchMs({ crib: updated });
  }, [machineId, getMachineState, bldr, selStation, patchMs]);

  // ── Clear selected station ─────────────────────────────────────────────────
  const handleClearStation = useCallback(() => {
    const cur = getMachineState(machineId);
    const updated = cur.crib.map(r =>
      r.stn !== selStation ? r : blankRow(r.stn)
    );
    patchMs({ crib: updated });
  }, [machineId, getMachineState, selStation, patchMs]);

  // ── Offset edits ──────────────────────────────────────────────────────────
  const handleEditOffset = useCallback((stn: number, field: 'len' | 'dia' | 'wear', value: string) => {
    const cur = getMachineState(machineId);
    patchMs({
      crib: cur.crib.map(r => r.stn !== stn ? r : { ...r, [field]: value }),
    });
  }, [machineId, getMachineState, patchMs]);

  // ── Work offset edits ─────────────────────────────────────────────────────
  const handleEditWork = useCallback((code: string, field: 'x' | 'y' | 'z' | 'src', value: string) => {
    const cur = getMachineState(machineId);
    patchMs({
      work: cur.work.map(r => r.code !== code ? r : { ...r, [field]: value }),
    });
  }, [machineId, getMachineState, patchMs]);

  // ── Inventory query (the ONE real backend wire) ───────────────────────────
  const inventoryQuery = useQuery<InventoryReport, Error>({
    queryKey: ['toolCribInventory'],
    queryFn:  toolCribApi.inventory,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // ── Derived vals via computeCribVals (useMemo -- pure) ────────────────────
  const m = MACH[machineId];
  const isLathe = m.kind !== 'magazine';

  const cribState: CribState = useMemo(() => ({
    machineId,
    unit,
    selStation,
    view,
    builder: bldr,
    crib:    ms.crib,
    work:    ms.work,
    wp:      ms.wp,
    setup:   ms.setup,
  }), [machineId, unit, selStation, view, bldr, ms]);

  const vals = useMemo(() => computeCribVals(cribState), [cribState]);

  // ── iface label for computeCribVals (already in vals) ────────────────────
  const iface = vals.iface;

  // ── Live backend inventory health (deepened wire) ─────────────────────────
  // The inventory query is the page's one live backend wire, but it only fed
  // CribTab's life-map -- the report's crib-wide fields (total_items /
  // below_reorder) were fetched then dropped. Surface them in the header
  // subtitle, fail-soft: nothing renders until real data arrives (no fabricated
  // numbers during loading/error -- R12).
  const inv = inventoryQuery.data ?? null;
  // Shape-guard the low-stock count: below_reorder is always an array under the
  // ToolCribEngine contract, but a malformed cache write / partial payload must
  // DEGRADE, not crash the page (there is no error boundary above this).
  const lowStockCount = inv && Array.isArray(inv.below_reorder) ? inv.below_reorder.length : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col min-h-0 h-full"
      style={{ background: '#0A0B0D', color: '#F3F4F6', fontFamily: 'var(--font-sans, system-ui)' }}
    >
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header
        className="flex-none flex items-center justify-between px-[24px]"
        style={{
          height: '64px',
          background: '#0C0D10',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div>
          <div className="font-sans font-semibold text-[19px]" style={{ letterSpacing: '-0.01em' }}>
            Tool Crib &amp; Setup
          </div>
          <div className="font-mono text-[10.5px] text-[#6B7280] tracking-[0.04em] mt-[1px]">
            JM DIE {String.fromCharCode(0xB7)} {vals.layoutLabel} {String.fromCharCode(0xB7)} {vals.loadedCount}/{vals.stationCount} LOADED {String.fromCharCode(0xB7)} {vals.issueSummary}
            {inv && (
              <>
                {' '}{String.fromCharCode(0xB7)}{' '}
                <span
                  data-testid="crib-stock-health"
                  style={{ color: lowStockCount > 0 ? '#F4B740' : '#36D399' }}
                >
                  CRIB {inv.total_items ?? 0} TOOLS {String.fromCharCode(0xB7)}{' '}
                  {lowStockCount > 0 ? `${lowStockCount} LOW STOCK` : 'STOCK OK'}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-[10px]">
          {/* Machine selector */}
          <select
            className="h-[38px] bg-[#14161B] border border-white/10 rounded-[9px] text-[#F3F4F6] text-[13px] px-[12px] pr-[32px] appearance-none cursor-pointer focus:outline-none focus:border-white/25"
            value={machineId}
            onChange={e => handleMachineChange(e.target.value)}
          >
            <optgroup label="Mills">
              <option value="vm30i">VMC-01 {String.fromCharCode(0xB7)} Hurco VM30i {String.fromCharCode(0xB7)} CAT40</option>
              <option value="m460v">VMC-02 {String.fromCharCode(0xB7)} Okuma M460V-5AX {String.fromCharCode(0xB7)} CAT40</option>
              <option value="vf2">VMC-03 {String.fromCharCode(0xB7)} Haas VF-2 {String.fromCharCode(0xB7)} CAT40</option>
              <option value="om2">VMC-04 {String.fromCharCode(0xB7)} Haas OM-2 {String.fromCharCode(0xB7)} CAT40</option>
              <option value="roku">VMC-05 {String.fromCharCode(0xB7)} Roku-Roku HC658-II {String.fromCharCode(0xB7)} HSK</option>
            </optgroup>
            <optgroup label="Lathes / mill-turn">
              <option value="l300m">LTH-01 {String.fromCharCode(0xB7)} GENOS L300-M {String.fromCharCode(0xB7)} live</option>
              <option value="l200em">LTH-02 {String.fromCharCode(0xB7)} GENOS L200E-M {String.fromCharCode(0xB7)} live</option>
              <option value="lnc8">LTH-03 {String.fromCharCode(0xB7)} Okuma LNC8</option>
              <option value="crown">LTH-04 {String.fromCharCode(0xB7)} Crown L1060</option>
              <option value="l400ii">LTH-05 {String.fromCharCode(0xB7)} GENOS L400II-E</option>
              <option value="lb3000">LTH-06 {String.fromCharCode(0xB7)} LB3000EX Big Bore</option>
              <option value="multus">LTH-07 {String.fromCharCode(0xB7)} Multus B250II {String.fromCharCode(0xB7)} B-axis</option>
            </optgroup>
          </select>

          {/* Unit toggle */}
          <div
            className="inline-flex rounded-[8px] p-[3px] border border-white/[0.07]"
            style={{ background: '#16181D' }}
          >
            <button className={unitBtnCls(unit === 'in')}  onClick={() => setUnit('in')}>inch</button>
            <button className={unitBtnCls(unit === 'mm')}  onClick={() => setUnit('mm')}>mm</button>
          </div>
        </div>
      </header>

      {/* ── 3-COLUMN BODY ─────────────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0"
        style={{ display: 'grid', gridTemplateColumns: '356px minmax(0,1fr) 432px' }}
      >

        {/* ── COL 1: SETUP + BUILD ───────────────────────────────────────── */}
        <section
          className="overflow-y-auto min-w-0"
          style={{
            borderRight: '1px solid rgba(255,255,255,0.06)',
            background: '#0A0B0D',
            padding: '18px 20px 44px',
          }}
        >
          <MachineSetupPanel
            machineId={machineId}
            typeId={ms.setup.typeId}
            count={ms.setup.count}
            unit={unit}
            iface={iface}
            onTypeChange={handleTypeChange}
            onCountChange={handleCountChange}
          />
          <WorkpiecePanel
            machineId={machineId}
            wp={ms.wp}
            unit={unit}
            onChange={patchWp}
          />
          {!isLathe && (
            <FixturingPanel wp={ms.wp} unit={unit} onChange={patchWp} />
          )}
          <BuildToolPanel
            machineId={machineId}
            unit={unit}
            selStation={selStation}
            builder={bldr}
            onBuilderChange={patchBuilder}
            onAddToCrib={handleAddToCrib}
            onClearStation={handleClearStation}
          />
        </section>

        {/* ── COL 2: VISUAL (tooling / kinematics) ──────────────────────── */}
        <section
          className="overflow-hidden min-w-0 flex flex-col gap-[13px] p-[16px_18px]"
          style={{
            background:
              'radial-gradient(900px 480px at 70% -12%, rgba(255,90,43,0.05), transparent 60%), #0B0C0F',
          }}
        >
          {/* SVG panel */}
          <div
            className="min-h-0 flex flex-col overflow-hidden"
            style={{
              flex: '1.45',
              background: '#0C0D11',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '15px',
            }}
          >
            {/* Panel toolbar */}
            <div className="flex justify-between items-center px-[16px] pt-[11px] pb-[6px] flex-none">
              <div
                className="inline-flex rounded-[8px] p-[3px] border border-white/[0.07]"
                style={{ background: '#16181D' }}
              >
                <button className={viewBtnCls(view === 'tooling')} onClick={() => setView('tooling')}>
                  Tooling layout
                </button>
                <button className={viewBtnCls(view === 'kin')} onClick={() => setView('kin')}>
                  Kinematics &amp; envelope
                </button>
              </div>

              {/* 3D toggle (deferred) -- shown only in kin mode */}
              {view === 'kin' && (
                <div
                  className="inline-flex rounded-[8px] p-[3px] border border-white/[0.07] ml-[8px]"
                  style={{ background: '#16181D' }}
                >
                  <button className={viewBtnCls(true)}>2D</button>
                  <button
                    className={viewBtnCls(false)}
                    title="3D: verify in hyperMILL sim"
                    disabled
                    style={{ opacity: 0.45 }}
                  >
                    3D
                  </button>
                </div>
              )}

              {/* Status badge */}
              <div
                className="flex items-center gap-[8px] px-[11px] py-[5px] rounded-[8px] font-mono text-[11px] ml-auto"
                style={{
                  border: `1px solid ${vals.statusBorder}`,
                  background: vals.statusBg,
                  color: vals.statusColor,
                }}
              >
                <span
                  className="w-[7px] h-[7px] rounded-full flex-none"
                  style={{ background: vals.statusColor }}
                />
                {vals.statusLabel}
              </div>
            </div>

            {/* SVG viewport */}
            <div className="flex-1 min-h-0 relative">
              <ToolingSvg
                slots={vals.slots}
                toolShapes={vals.toolShapes}
                ctxRects={vals.ctxRects}
                ctxLines={vals.ctxLines}
                ctxCircles={vals.ctxCircles}
                svgLabels={vals.svgLabels}
                onSelectStation={setSelStation}
              />
            </div>
          </div>

          {/* Assembly / issues panel below SVG */}
          <div
            className="flex-none rounded-[15px] p-[13px_18px]"
            style={{
              background: '#0C0D11',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex justify-between items-center mb-[11px]">
              <span className="font-sans font-semibold text-[13.5px]">
                {vals.worst >= 1 ? 'Triage' : 'Assembly chain'}
              </span>
              <span className="font-mono text-[10px] text-[#6B7280]">
                {vals.worst >= 1
                  ? `${vals.issues.filter(i => i.tag !== 'OK').length} issues`
                  : `stn ${selStation} · ${vals.iface}`}
              </span>
            </div>

            {vals.worst >= 1 ? (
              <TriageIssues issues={vals.issues} />
            ) : (
              <AssemblyChain assembly={vals.assembly} />
            )}
          </div>
        </section>

        {/* ── COL 3: CRIB / OFFSETS / WORK ──────────────────────────────── */}
        <section
          className="flex flex-col min-w-0 min-h-0"
          style={{
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            background: '#0A0B0D',
          }}
        >
          {/* Tab bar */}
          <div className="flex-none flex gap-[5px] px-[16px] pt-[14px] pb-0">
            <button className={tabBtnCls(rightTab === 'crib')}    onClick={() => setRightTab('crib')}>
              Tool crib
            </button>
            <button className={tabBtnCls(rightTab === 'offsets')} onClick={() => setRightTab('offsets')}>
              Tool offsets
            </button>
            <button className={tabBtnCls(rightTab === 'work')}    onClick={() => setRightTab('work')}>
              Work offsets
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-[16px] pt-[14px] pb-[40px]">
            {/* Inventory loading / error states (required by web CLAUDE.md) */}
            {inventoryQuery.isLoading && (
              <div className="font-mono text-[11px] text-[#6B7280] py-2 flex items-center gap-2">
                <span
                  className="inline-block w-[8px] h-[8px] rounded-full"
                  style={{
                    background: '#F4B740',
                    animation: 'kzpulse 1.4s ease-in-out infinite',
                  }}
                />
                Loading inventory data...
              </div>
            )}
            {inventoryQuery.isError && (
              <div
                className="mb-3 p-[10px_13px] rounded-[9px] font-mono text-[11px] border"
                style={{
                  background: 'rgba(255,82,71,0.07)',
                  border: '1px solid rgba(255,82,71,0.25)',
                  color: '#FF9A6A',
                }}
              >
                Inventory unavailable: {inventoryQuery.error.message}. Life% uses local planner values.
              </div>
            )}
            {!inventoryQuery.isLoading && !inventoryQuery.isError && inventoryQuery.data?.below_reorder.length === 0 && (
              <div
                className="mb-3 p-[10px_13px] rounded-[9px] font-mono text-[10.5px] border"
                style={{
                  background: 'rgba(54,211,153,0.05)',
                  border: '1px solid rgba(54,211,153,0.2)',
                  color: '#36D399',
                }}
              >
                All tools above reorder point.
              </div>
            )}

            {rightTab === 'crib' && (
              <CribTab
                crib={ms.crib}
                selStation={selStation}
                inventory={inventoryQuery.data ?? null}
                onSelectStation={setSelStation}
              />
            )}
            {rightTab === 'offsets' && (
              <OffsetsTab
                crib={ms.crib}
                isLathe={isLathe}
                unit={unit}
                onEditOffset={handleEditOffset}
              />
            )}
            {rightTab === 'work' && (
              <WorkOffsetsTab
                machineId={machineId}
                work={ms.work}
                onEditWork={handleEditWork}
              />
            )}
          </div>
        </section>
      </div>

      {/* Pulse animation for loading indicator (no three.js import) */}
      <style>{`@keyframes kzpulse { 0%,100% { opacity:.5 } 50% { opacity:1 } }`}</style>
    </div>
  );
}
