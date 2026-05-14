/**
 * WedmControllerCodePreview — P2P-FULLSTACK-MS0/U-P2PFS50
 *
 * Scrollable, syntax-highlighted preview of Mitsubishi Wire-EDM
 * controller code (M700/M800-series dialect as emitted by JM Die's
 * MV2400S and MC-series posts). Highlights:
 *
 *   - G-codes (G00/G01/G02/G03, G40/41/42 offset, G92 preset, G50/51 taper, G90/91)
 *   - M-codes (M00/M01/M02/M03/M05/M30/M80/M81/M82 power, flush, wire threading)
 *   - Registers (E1..E999 energy, C1..C999 condition, T1..T99 technology file,
 *     H1..H999 offset compensation, D1..D99 dielectric, P1..P99 program)
 *   - Addresses (X/Y/Z/U/V/F/S coordinate & feed words, N line numbers)
 *   - Parenthesized comments
 *   - Ground / percent delimiters (% at start/end, comments)
 *
 * Features:
 *   - Optional line numbers (default on)
 *   - Highlight a specific line (1-based)
 *   - Optional copy-to-clipboard button
 *   - Optional inline annotations per line (e.g. operator warnings)
 *   - Defensive: empty/null code renders an empty placeholder
 */

import { useCallback, useMemo, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type WedmTokenKind =
  | 'g_code'
  | 'm_code'
  | 'e_register'
  | 'c_register'
  | 't_register'
  | 'h_register'
  | 'd_register'
  | 'p_register'
  | 'n_number'
  | 'address'
  | 'comment'
  | 'delimiter'
  | 'plain';

export interface WedmCodeToken {
  kind: WedmTokenKind;
  text: string;
}

export interface WedmCodeAnnotation {
  /** 1-based line number the annotation attaches to. */
  line: number;
  severity: 'info' | 'warn' | 'error';
  message: string;
}

// ============================================================================
// TOKENIZER
// ============================================================================

// Ordered by priority; first regex that matches wins at each position.
const TOKEN_PATTERNS: Array<{ kind: WedmTokenKind; re: RegExp }> = [
  { kind: 'comment', re: /^\([^)]*\)/ },
  { kind: 'g_code', re: /^G\d+(?:\.\d+)?/i },
  { kind: 'm_code', re: /^M\d+/i },
  { kind: 'e_register', re: /^E\d+/i },
  { kind: 'c_register', re: /^C\d+/i },
  { kind: 't_register', re: /^T\d+/i },
  { kind: 'h_register', re: /^H\d+/i },
  { kind: 'd_register', re: /^D\d+/i },
  { kind: 'p_register', re: /^P\d+/i },
  { kind: 'n_number', re: /^N\d+/i },
  // Accept trailing-dot decimals (common Mitsubishi/Fanuc style: I0. J10.).
  { kind: 'address', re: /^[XYZUVFSRIJKAB][+\-]?\d+(?:\.\d*)?/i },
  { kind: 'delimiter', re: /^%/ },
];

export function tokenizeWedmLine(line: string): WedmCodeToken[] {
  const tokens: WedmCodeToken[] = [];
  let remaining = line;
  while (remaining.length > 0) {
    // Leading whitespace → plain
    const wsMatch = remaining.match(/^\s+/);
    if (wsMatch) {
      tokens.push({ kind: 'plain', text: wsMatch[0] });
      remaining = remaining.slice(wsMatch[0].length);
      continue;
    }
    let matched = false;
    for (const { kind, re } of TOKEN_PATTERNS) {
      const m = remaining.match(re);
      if (m) {
        tokens.push({ kind, text: m[0] });
        remaining = remaining.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Consume one character as plain to make progress.
      tokens.push({ kind: 'plain', text: remaining[0] });
      remaining = remaining.slice(1);
    }
  }
  // Coalesce consecutive plain tokens to keep the DOM small.
  return coalescePlain(tokens);
}

function coalescePlain(tokens: WedmCodeToken[]): WedmCodeToken[] {
  const out: WedmCodeToken[] = [];
  for (const t of tokens) {
    const last = out[out.length - 1];
    if (t.kind === 'plain' && last && last.kind === 'plain') {
      last.text += t.text;
    } else {
      out.push({ ...t });
    }
  }
  return out;
}

// ============================================================================
// STYLING
// ============================================================================

const TOKEN_CLASS: Record<WedmTokenKind, string> = {
  g_code: 'text-cyan-300 font-bold',
  m_code: 'text-amber-300 font-bold',
  e_register: 'text-emerald-300 font-bold',
  c_register: 'text-emerald-300',
  t_register: 'text-violet-300 font-bold',
  h_register: 'text-sky-300',
  d_register: 'text-teal-300',
  p_register: 'text-indigo-300',
  n_number: 'text-slate-500',
  address: 'text-slate-200',
  comment: 'text-slate-500 italic',
  delimiter: 'text-rose-400 font-bold',
  plain: 'text-slate-300',
};

const SEVERITY_CHIP: Record<WedmCodeAnnotation['severity'], string> = {
  info: 'bg-sky-500 text-white',
  warn: 'bg-amber-500 text-white',
  error: 'bg-rose-600 text-white',
};

// ============================================================================
// COMPONENT
// ============================================================================

export interface WedmControllerCodePreviewProps {
  /** Raw Mitsubishi-dialect controller code (newline-separated). */
  code: string | null | undefined;
  /** Optional controller family label, e.g. "Mitsubishi M700". */
  controller?: string;
  /** Render line numbers on the gutter. */
  showLineNumbers?: boolean;
  /** 1-based line index to highlight (e.g. current-block during simulation). */
  highlightLine?: number;
  /** Per-line annotations shown as inline chips. */
  annotations?: WedmCodeAnnotation[];
  /** Max height (px) — defaults to 360. */
  maxHeightPx?: number;
  /** Show the copy-to-clipboard button. */
  showCopy?: boolean;
  /** Optional clipboard writer — pass a mock in tests. */
  onCopy?: (code: string) => void;
}

export function WedmControllerCodePreview({
  code,
  controller = 'Mitsubishi M700',
  showLineNumbers = true,
  highlightLine,
  annotations = [],
  maxHeightPx = 360,
  showCopy = true,
  onCopy,
}: WedmControllerCodePreviewProps) {
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => {
    if (code == null) return [];
    // Preserve empty trailing lines — split on \n only.
    return code.split(/\r?\n/);
  }, [code]);

  const annotationsByLine = useMemo(() => {
    const map = new Map<number, WedmCodeAnnotation[]>();
    for (const a of annotations) {
      const arr = map.get(a.line) ?? [];
      arr.push(a);
      map.set(a.line, arr);
    }
    return map;
  }, [annotations]);

  const copy = useCallback(() => {
    if (code == null) return;
    onCopy?.(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code, onCopy]);

  if (!code || lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
    return (
      <div
        className="rounded-2xl border border-slate-700/40 bg-slate-900/30 px-4 py-6 text-center text-[11px] text-slate-500"
        role="region"
        aria-label={`WEDM ${controller} code preview — empty`}
        data-testid="wedm-code-preview-empty"
      >
        No controller code to preview.
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-slate-700/40 bg-[#0c1522] px-0 py-0 overflow-hidden"
      role="region"
      aria-label={`WEDM ${controller} code preview, ${lines.length} lines`}
      data-testid="wedm-controller-code-preview"
      data-controller={controller}
      data-line-count={lines.length}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/40 bg-slate-900/60 px-3 py-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          <span data-testid="code-preview-controller">{controller}</span>
          <span className="ml-2 text-[10px] normal-case text-slate-500">
            &middot; {lines.length} lines
          </span>
        </div>
        {showCopy && (
          <button
            type="button"
            onClick={copy}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-widest text-slate-300 hover:bg-slate-700"
            data-testid="code-preview-copy"
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        )}
      </div>

      <div
        className="overflow-auto bg-slate-950/60"
        style={{ maxHeight: maxHeightPx }}
        data-testid="code-preview-scroll"
      >
        <pre className="font-mono text-[11.5px] leading-[1.45]">
          {lines.map((line, idx) => {
            const lineNo = idx + 1;
            const isHighlighted = highlightLine === lineNo;
            const tokens = tokenizeWedmLine(line);
            const ann = annotationsByLine.get(lineNo) ?? [];
            return (
              <div
                key={idx}
                className={`flex items-start gap-2 px-3 py-0.5 border-l-2 ${
                  isHighlighted
                    ? 'bg-cyan-950/40 border-cyan-400'
                    : 'border-transparent hover:bg-slate-900/40'
                }`}
                data-testid="code-preview-line"
                data-line={lineNo}
                data-highlighted={isHighlighted ? 'true' : 'false'}
              >
                {showLineNumbers && (
                  <span
                    className="inline-block w-10 flex-shrink-0 text-right text-[10px] text-slate-600 select-none"
                    data-testid="code-preview-line-number"
                  >
                    {lineNo}
                  </span>
                )}
                <span className="flex-1 whitespace-pre-wrap break-all">
                  {tokens.length === 0 ? (
                    <span className={TOKEN_CLASS.plain}>{'\u00a0'}</span>
                  ) : (
                    tokens.map((t, i) => (
                      <span
                        key={i}
                        className={TOKEN_CLASS[t.kind]}
                        data-token-kind={t.kind}
                      >
                        {t.text}
                      </span>
                    ))
                  )}
                  {ann.length > 0 && (
                    <span
                      className="ml-2 inline-flex items-center gap-1 align-baseline"
                      data-testid={`code-preview-annotations-${lineNo}`}
                    >
                      {ann.map((a, i) => (
                        <span
                          key={i}
                          className={`rounded px-1 py-0 text-[9px] font-bold uppercase tracking-widest ${SEVERITY_CHIP[a.severity]}`}
                          data-testid="code-preview-annotation-chip"
                          data-severity={a.severity}
                          title={a.message}
                        >
                          {a.severity}: {a.message}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
