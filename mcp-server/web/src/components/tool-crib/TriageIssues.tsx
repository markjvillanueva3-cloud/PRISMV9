/**
 * TriageIssues -- 2-column grid of triage issue cards from computeCribVals.
 */

import type { TriageIssue } from '../../lib/toolCribGeometry';

interface Props {
  issues: TriageIssue[];
}

export function TriageIssues({ issues }: Props) {
  if (issues.length === 0) {
    return (
      <div className="text-[11px] text-[#6B7280] font-mono py-2">No issues.</div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0">
      {issues.map((issue, i) => (
        <div key={i} className="flex gap-[10px] items-start py-[6px]">
          <span
            className="flex-none mt-[3px] w-[9px] h-[9px] rounded-full"
            style={{ background: issue.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-[#F3F4F6] leading-snug">{issue.title}</div>
            <div className="text-[10.5px] text-[#9398A2] leading-snug mt-[1px]">{issue.detail}</div>
          </div>
          <span
            className="flex-none font-mono text-[9.5px]"
            style={{ color: issue.color }}
          >
            {issue.tag}
          </span>
        </div>
      ))}
    </div>
  );
}
