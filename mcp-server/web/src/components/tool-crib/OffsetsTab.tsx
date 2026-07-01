/**
 * OffsetsTab -- right-panel "Tool offsets" tab.
 * Editable table: T / holder tag / len / dia / wear per loaded crib station.
 * Lathe shows H# column header; mill shows T# column header.
 */

import type { CribRow } from '../../data/toolCribMachines';

interface Props {
  crib: CribRow[];
  isLathe: boolean;
  unit: 'in' | 'mm';
  onEditOffset: (stn: number, field: 'len' | 'dia' | 'wear', value: string) => void;
}

const INPUT_BASE =
  'h-[32px] bg-[#14161B] border border-white/10 rounded-[7px] text-[#F3F4F6] font-mono text-[11px] px-[7px] w-full focus:outline-none focus:border-white/25';

export function OffsetsTab({ crib, isLathe, unit, onEditOffset }: Props) {
  const loaded = crib.filter((r) => r.loaded);

  const heightFieldShort = isLathe ? 'HOLDER' : 'TOOL TAG';
  const lenColLabel = isLathe ? `LEN (${unit})` : `GAUGE (${unit})`;
  const diaColLabel = isLathe ? `DIA (${unit})` : `DIA (${unit})`;

  const offsetNote = isLathe
    ? `Offsets measured at tool tip. Geometry (len/dia) set via tool-preset gauge; wear (${unit}) added by controller on execution.`
    : `Tool gauge = measured distance from spindle face to tool tip. Dia = nominal cutting diameter. Wear correction applied by controller.`;

  return (
    <div>
      {/* header */}
      <div
        className="grid gap-[7px] px-[8px] pb-[8px] font-mono text-[9.5px] tracking-[0.06em] text-[#6B7280]"
        style={{ gridTemplateColumns: '30px 1fr 64px 64px 52px' }}
      >
        <span>T</span>
        <span>{heightFieldShort}</span>
        <span>{lenColLabel}</span>
        <span>{diaColLabel}</span>
        <span>WEAR</span>
      </div>

      {loaded.length === 0 && (
        <div className="text-[11px] text-[#6B7280] font-mono py-3 px-2">
          No tools loaded. Add tools via the Build panel.
        </div>
      )}

      {loaded.map((row) => (
        <div
          key={row.stn}
          className="grid gap-[7px] items-center px-[8px] py-[5px] border-b border-white/5"
          style={{ gridTemplateColumns: '30px 1fr 64px 64px 52px' }}
        >
          <span className="font-mono text-[12px] font-bold text-amber-400">
            {row.T}
          </span>
          <span className="font-mono text-[11px] text-[#9398A2] truncate">
            {row.name.split(' · ')[0]}
          </span>
          <input
            className={INPUT_BASE}
            inputMode="decimal"
            value={row.len}
            onChange={(e) => onEditOffset(row.stn, 'len', e.target.value)}
          />
          <input
            className={INPUT_BASE}
            inputMode="decimal"
            value={row.dia}
            onChange={(e) => onEditOffset(row.stn, 'dia', e.target.value)}
          />
          <input
            className={INPUT_BASE}
            inputMode="decimal"
            value={row.wear}
            onChange={(e) => onEditOffset(row.stn, 'wear', e.target.value)}
            style={{ borderColor: 'rgba(255,90,43,0.2)', color: '#FF9A6A' }}
          />
        </div>
      ))}

      {/* note card */}
      <div className="mt-3 p-[11px_13px] border border-[rgba(42,111,219,0.25)] bg-[rgba(42,111,219,0.06)] rounded-[10px] text-[11.5px] text-[#9CC] leading-relaxed">
        {offsetNote}
      </div>
    </div>
  );
}
