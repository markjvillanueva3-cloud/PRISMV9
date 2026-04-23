export function safeRegex(
  pattern: string,
  flags?: string,
  maxLen: number = 200
): RegExp | null {
  if (pattern.length > maxLen) return null;
  if (/(\([^)]*[+*][^)]*\))[+*{]/.test(pattern)) return null;
  if ((pattern.match(/\|/g) || []).length > 10) return null;

  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}
