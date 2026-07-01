import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrSticker({
  payload,
  title,
  subtitle,
  caption,
  compact = false,
}: {
  payload: string;
  title: string;
  subtitle?: string;
  caption?: string;
  compact?: boolean;
}) {
  const [svgMarkup, setSvgMarkup] = useState('');

  useEffect(() => {
    let cancelled = false;

    QRCode.toString(payload, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      width: compact ? 120 : 180,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })
      .then((svg) => {
        if (!cancelled) {
          setSvgMarkup(svg);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSvgMarkup('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [compact, payload]);

  return (
    <div className={`rounded-[24px] border border-white/10 bg-white p-4 text-slate-900 ${compact ? 'max-w-[220px]' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Sticker QR</div>
          <div className="mt-2 text-base font-semibold text-slate-950">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
        </div>
        <div className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Scan
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-slate-200 bg-white p-3">
        {svgMarkup ? (
          <div className="mx-auto w-full max-w-[180px]" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
        ) : (
          <div className="flex h-[180px] items-center justify-center rounded-[14px] border border-dashed border-slate-200 text-sm text-slate-500">
            QR unavailable
          </div>
        )}
      </div>

      <div className="mt-3 rounded-[16px] bg-slate-100 px-3 py-2 text-[11px] font-medium leading-5 text-slate-600">
        {caption ?? payload}
      </div>
    </div>
  );
}
