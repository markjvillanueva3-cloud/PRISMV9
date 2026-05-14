/**
 * SafetyBadge — Color-blind accessible safety indicator using shape + color.
 * Ported from mcp-server/web with self-contained types.
 */

export type SafetyLevel = 'pass' | 'warn' | 'fail' | 'info';

export function safetyLevel(score: number): SafetyLevel {
  if (score >= 0.85) return 'pass';
  if (score >= 0.70) return 'warn';
  return 'fail';
}

export const SAFETY_SHAPES: Record<SafetyLevel, string> = {
  pass: '\u25CF',  // filled circle
  warn: '\u25B2',  // triangle
  fail: '\u25A0',  // filled square
  info: '\u25C6',  // diamond
};

const LEVEL_CLASSES: Record<SafetyLevel, string> = {
  pass: 'bg-green-50 text-green-700 border-green-200',
  warn: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  fail: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
};

interface SafetyBadgeProps {
  score: number;
  showScore?: boolean;
}

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
