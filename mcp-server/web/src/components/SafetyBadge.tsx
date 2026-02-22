import { safetyLevel, SAFETY_SHAPES, type SafetyLevel } from '../api/types';

const LEVEL_CLASSES: Record<SafetyLevel, string> = {
  pass: 'bg-safety-pass/10 text-safety-pass border-safety-pass/30',
  warn: 'bg-safety-warn/10 text-safety-warn border-safety-warn/30',
  fail: 'bg-safety-fail/10 text-safety-fail border-safety-fail/30',
  info: 'bg-safety-info/10 text-safety-info border-safety-info/30',
};

interface SafetyBadgeProps {
  score: number;
  showScore?: boolean;
}

/** Color-blind accessible safety indicator using shape + color */
export function SafetyBadge({ score, showScore = true }: SafetyBadgeProps) {
  const level = safetyLevel(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-sm font-medium ${LEVEL_CLASSES[level]}`}
      role="status"
      aria-label={`Safety: ${level} (${(score * 100).toFixed(0)}%)`}
    >
      <span aria-hidden="true">{SAFETY_SHAPES[level]}</span>
      {showScore && <span>{(score * 100).toFixed(0)}%</span>}
    </span>
  );
}
