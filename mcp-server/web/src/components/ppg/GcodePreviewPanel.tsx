import { useCallback, useMemo, useRef, useState } from 'react';
import { ActionButton, StatusPill } from '../workspace/WorkspacePrimitives';

export interface GcodePreviewPanelProps {
  code: string;
  title?: string;
  maxLines?: number;
}

type TokenType = 'gcode' | 'mcode' | 'sfeed' | 'comment' | 'coord' | 'number' | 'plain';

function classifyToken(token: string): TokenType {
  if (/^\(.*\)$/.test(token) || token.startsWith(';')) return 'comment';
  if (/^G\d+(\.\d+)?$/i.test(token)) return 'gcode';
  if (/^M\d+$/i.test(token)) return 'mcode';
  if (/^[SF]\d+(\.\d+)?$/i.test(token)) return 'sfeed';
  if (/^[XYZABCIJKR]-?\d+(\.\d+)?$/i.test(token)) return 'coord';
  if (/^[THDP]\d+$/i.test(token)) return 'number';
  return 'plain';
}

const TOKEN_COLORS: Record<TokenType, string> = {
  gcode: 'text-emerald-400',
  mcode: 'text-sky-400',
  sfeed: 'text-amber-300',
  comment: 'text-slate-500 italic',
  coord: 'text-cyan-300',
  number: 'text-violet-300',
  plain: 'text-slate-300',
};

function tokenizeLine(line: string): Array<{ text: string; type: TokenType }> {
  const tokens: Array<{ text: string; type: TokenType }> = [];
  const trimmed = line.trimStart();

  // Comment lines
  if (trimmed.startsWith(';') || trimmed.startsWith('%')) {
    tokens.push({ text: line, type: 'comment' });
    return tokens;
  }

  // Inline comments in parentheses
  const commentMatch = line.match(/^(.*?)(\(.*\))(.*)$/);
  if (commentMatch) {
    if (commentMatch[1]) {
      tokens.push(...tokenizeSegment(commentMatch[1]));
    }
    tokens.push({ text: commentMatch[2], type: 'comment' });
    if (commentMatch[3]) {
      tokens.push(...tokenizeSegment(commentMatch[3]));
    }
    return tokens;
  }

  return tokenizeSegment(line);
}

function tokenizeSegment(segment: string): Array<{ text: string; type: TokenType }> {
  const tokens: Array<{ text: string; type: TokenType }> = [];
  const pattern = /([GMSFTHDPXYZABCIJKR]-?\d+(?:\.\d+)?|N\d+|%|\s+)/gi;
  let lastIndex = 0;

  for (const match of segment.matchAll(pattern)) {
    if (match.index! > lastIndex) {
      tokens.push({ text: segment.slice(lastIndex, match.index!), type: 'plain' });
    }
    const word = match[0];
    if (/^\s+$/.test(word)) {
      tokens.push({ text: word, type: 'plain' });
    } else {
      tokens.push({ text: word, type: classifyToken(word) });
    }
    lastIndex = match.index! + word.length;
  }

  if (lastIndex < segment.length) {
    tokens.push({ text: segment.slice(lastIndex), type: 'plain' });
  }

  return tokens;
}

export function GcodePreviewPanel({ code, title, maxLines = 1000 }: GcodePreviewPanelProps) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => {
    const allLines = code.split('\n');
    return allLines.slice(0, maxLines);
  }, [code, maxLines]);

  const totalLines = code.split('\n').length;
  const gCodeCount = useMemo(() => lines.filter(l => /\bG\d+/i.test(l)).length, [lines]);
  const mCodeCount = useMemo(() => lines.filter(l => /\bM\d+/i.test(l)).length, [lines]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  }, [code]);

  if (!code.trim()) {
    return (
      <div className="rounded-[16px] border border-white/6 bg-white/[0.01] p-6 text-center text-sm text-slate-500">
        No G-code to preview
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {title && <span className="text-sm font-semibold text-slate-300">{title}</span>}
          <StatusPill label={`${totalLines} lines`} tone="slate" />
          <StatusPill label={`${gCodeCount} G-codes`} tone="emerald" />
          <StatusPill label={`${mCodeCount} M-codes`} tone="sky" />
        </div>
        <ActionButton onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </ActionButton>
      </div>

      {/* Code view */}
      <div
        ref={preRef}
        className="max-h-[500px] overflow-auto rounded-[16px] border border-white/6 bg-black/40 font-mono text-xs leading-5"
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-white/[0.03]">
                <td className="select-none border-r border-white/6 px-3 py-0 text-right text-slate-600">
                  {idx + 1}
                </td>
                <td className="whitespace-pre px-3 py-0">
                  {tokenizeLine(line).map((tok, tidx) => (
                    <span key={tidx} className={TOKEN_COLORS[tok.type]}>{tok.text}</span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Truncation notice */}
      {totalLines > maxLines && (
        <div className="text-xs text-slate-500">
          Showing first {maxLines} of {totalLines} lines
        </div>
      )}
    </div>
  );
}
