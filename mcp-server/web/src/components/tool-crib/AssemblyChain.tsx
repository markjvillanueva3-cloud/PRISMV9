/**
 * AssemblyChain -- renders the 4-stage holder -> tooling -> insert chain
 * displayed below the SVG panel. Data comes directly from computeCribVals
 * assembly array; no logic here.
 */

import type { AssemblyStage } from '../../lib/toolCribGeometry';

interface Props {
  assembly: AssemblyStage[];
}

export function AssemblyChain({ assembly }: Props) {
  return (
    <div className="flex items-stretch gap-0">
      {assembly.map((a, i) => (
        <div key={i} className="flex flex-1 min-w-0 items-center">
          <div
            className="flex-1 min-w-0 rounded-[10px] p-[10px_12px]"
            style={{
              background: a.bg,
              border: `1px solid ${a.border}`,
            }}
          >
            <div
              className="font-mono text-[9px] tracking-[0.06em] mb-[5px]"
              style={{ color: a.tagColor }}
            >
              {a.tag}
            </div>
            <div className="font-sans font-semibold text-[12.5px] text-[#F3F4F6] leading-tight">
              {a.name}
            </div>
            <div className="text-[10.5px] text-[#9398A2] mt-[3px] leading-snug">
              {a.spec}
            </div>
          </div>
          {a.arrow && (
            <span className="flex-none w-[22px] text-center text-[14px] text-amber-400">
              {a.arrow}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
