import type { ApiError } from '../../api/client';

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

export function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function num(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function bool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export function payloadOf(response: unknown): unknown {
  const record = asRecord(response);
  return record ? (record.result ?? record.data ?? null) : null;
}

export function arrayFromPayload(response: unknown, preferredKeys: string[] = []): Record<string, unknown>[] {
  const payload = payloadOf(response);
  if (Array.isArray(payload)) {
    return payload.flatMap((entry) => {
      const record = asRecord(entry);
      return record ? [record] : [];
    });
  }

  const record = asRecord(payload);
  if (!record) {
    return [];
  }

  for (const key of preferredKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.flatMap((entry) => {
        const item = asRecord(entry);
        return item ? [item] : [];
      });
    }
  }

  return [];
}

export function firstText(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(record[key]);
    if (value) return value;
  }
  return '';
}

export function firstNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = num(record[key]);
    if (value != null) return value;
  }
  return null;
}

export function formatMoney(value: number | null | undefined): string {
  return value != null ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}` : '$0.00';
}

export function formatPercent(value: number | null | undefined): string {
  return value != null ? `${value.toFixed(1)}%` : '0.0%';
}

export function formatDateLabel(value: unknown): string {
  const candidate = text(value);
  if (!candidate) return 'Unavailable';

  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) return candidate;

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatJsonPreview(value: unknown): string {
  if (value == null) return 'Unavailable';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return 'Unavailable';
  }
}

export function errorMessage(issue: unknown, fallback: string): string {
  if (issue && typeof issue === 'object' && 'message' in issue && typeof (issue as ApiError).message === 'string') {
    return (issue as ApiError).message;
  }
  if (issue instanceof Error && issue.message.trim().length > 0) {
    return issue.message;
  }
  return fallback;
}
