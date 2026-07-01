/**
 * CribTab -- right-panel "Tool crib" tab.
 * Renders the station list (STN / TOOL * HOLDER / LIFE%) from crib rows.
 * The LIFE column sources real data from the inventory query when a crib tool's
 * name prefix matches an inventory item description; otherwise falls back to the
 * crib row's lifePct (local planner value).
 *
 * The middle-dot separator " * " in tool names is load-bearing (computeCribVals
 * and data split on it) -- never replace with en/em dash.
 */

import type { CribRow } from '../../data/toolCribMachines';
import type { InventoryReport } from '../../api/toolCrib';

interface Props {
  crib: CribRow[];
  selStation: number;
  inventory: InventoryReport | null;
  onSelectStation: (stn: number) => void;
}

/** Map inventory items by lower-cased description prefix for life lookup. */
function buildLifeMap(inventory: InventoryReport | null): Map<string, number> {
  const map = new Map<string, number>();
  if (!inventory) return map;
  // Collect all items from below_reorder (the only item list the API returns).
  // Use avg_life_min / (avg_life_min + total_usage_min) as remaining life ratio.
  for (const item of inventory.below_reorder) {
    const total = item.avg_life_min + item.total_usage_min;
    const pct = total > 0 ? Math.max(0, Math.min(1, item.avg_life_min / total)) : 1;
    map.set(item.description.toLowerCase(), pct);
  }
  return map;
}

function lifeColor(pct: number): string {
  if (pct >= 0.7) return '#36D399';
  if (pct >= 0.4) return '#F4B740';
  return '#FF5247';
}

export function CribTab({ crib, selStation, inventory, onSelectStation }: Props) {
  const lifeMap = buildLifeMap(inventory);

  return (
    <div>
      {/* header row */}
      <div className="grid gap-2 px-[10px] pb-2 font-mono text-[9.5px] tracking-[0.08em] text-[#6B7280]"
        style={{ gridTemplateColumns: '34px 1fr 52px' }}>
        <span>STN</span>
        <span>TOOL {'·'} HOLDER</span>
        <span className="text-right">LIFE</span>
      </div>

      {crib.map((row) => {
        const isSel = row.stn === selStation;

        // Life% -- prefer inventory real data when a match exists on tool name prefix
        const toolPrefix = row.name.split(' · ')[0].toLowerCase();
        const invLife = lifeMap.get(toolPrefix) ?? null;
        const lifePct = invLife !== null ? invLife : row.lifePct;

        const stnColor = isSel ? '#FF5A2B' : row.loaded ? '#7FB2FF' : '#6B7280';
        const nameColor = isSel ? '#FF7A4D' : row.loaded ? '#F3F4F6' : '#6B7280';
        const lc = lifeColor(lifePct);
        const lifeLabel = row.loaded ? `${Math.round(lifePct * 100)}%` : '--';
        const lifeBarW = row.loaded ? `${Math.round(lifePct * 100)}%` : '0%';

        const rowBg = isSel
          ? 'rgba(255,90,43,0.09)'
          : row.loaded
            ? 'rgba(42,111,219,0.05)'
            : 'transparent';
        const rowBorder = isSel
          ? 'rgba(255,90,43,0.3)'
          : 'rgba(255,255,255,0.05)';

        return (
          <div
            key={row.stn}
            onClick={() => onSelectStation(row.stn)}
            className="grid items-center gap-2 px-[10px] py-[8px] rounded-[9px] mb-[3px] cursor-pointer transition-colors duration-150"
            style={{
              gridTemplateColumns: '34px 1fr 52px',
              background: rowBg,
              border: `1px solid ${rowBorder}`,
            }}
          >
            <span className="font-mono text-[13px] font-bold" style={{ color: stnColor }}>
              {row.stn}
            </span>
            <div className="min-w-0">
              <div
                className="text-[12.5px] truncate"
                style={{ color: nameColor }}
              >
                {row.loaded ? row.name : <span className="text-[#3A3D44] italic">empty</span>}
              </div>
              <div className="font-mono text-[10px] text-[#6B7280] truncate mt-[1px]">
                {row.loaded ? `T${row.T} H${row.H} proj ${row.proj}"` : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[11px]" style={{ color: lc }}>
                {lifeLabel}
              </div>
              <div className="h-[4px] rounded-full bg-[#1B1E24] mt-[3px] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: lifeBarW, background: lc }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
