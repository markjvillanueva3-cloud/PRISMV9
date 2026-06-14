/**
 * PrismResourceCard — Calculator Studio tile for surfacing a tribal/wiki
 * reference resource (PDF book, video tutorial, course module, tool catalog,
 * tribal-knowledge note, etc).
 *
 * Composes PrismGlowCard frame + PrismChip status badge + optional
 * PrismSpectrumFill progress + optional PrismLedSweep "currently-streaming"
 * overlay into the canonical "resource tile" pattern the JM Die TRIBAL + WIKI
 * corpus (130+ PDFs at H:/prism/JM DIE/TRIBAL + WIKI/) and the Lima academy
 * course library both render.
 *
 * Other chats wire this into their domain pages:
 *   - Lima (Academy) — course catalog tiles
 *   - Echo (Post-Proc) — controller-vendor reference shelf
 *   - Foxtrot (Mill Wizard) — Mastercam / InventorCAM book shelf
 *   - Mike (Wire Wizard) — wire-EDM tribal-knowledge shelf
 *   - Whiskey (Lathe Wizard) — turning reference shelf
 *   - Oscar (SF Calc) — material/tool speed-feed reference shelf
 *
 * Quebec /goal-loop 2026-05-26 / U-Q-PRISM-RESOURCE-CARD.
 */
import type { KeyboardEvent, ReactNode } from "react";
import { PrismGlowCard, type PrismGlowColor } from "./PrismGlowCard";
import { PrismChip, type PrismChipTone } from "./PrismChip";
import { PrismSpectrumFill } from "./PrismSpectrumFill";
import { PrismLedSweep } from "./PrismLedSweep";

interface Props {
  title: string;
  subtitle?: string;
  kind?: string;
  status?: "ready" | "draft" | "blocked" | "running" | "queued";
  color?: PrismGlowColor;
  progress?: number;
  meta?: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  thumb?: ReactNode;
  className?: string;
}

const STATUS_TONE: Record<NonNullable<Props["status"]>, PrismChipTone> = {
  ready: "emerald",
  draft: "amber",
  blocked: "red",
  running: "cyan",
  queued: "violet",
};

export function PrismResourceCard({
  title,
  subtitle,
  kind,
  status,
  color = "cyan",
  progress,
  meta,
  href,
  onClick,
  active = false,
  thumb,
  className,
}: Props) {
  const interactive = href !== undefined || onClick !== undefined;
  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (onClick) onClick();
      else if (href) window.location.href = href;
    }
  };

  const body = (
    <div className="flex items-start gap-3">
      {thumb ? <div className="flex-shrink-0">{thumb}</div> : null}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-slate-100 truncate" title={title}>
            {title}
          </h3>
          {kind ? <PrismChip tone="slate">{kind}</PrismChip> : null}
          {status ? <PrismChip tone={STATUS_TONE[status]}>{status}</PrismChip> : null}
        </div>
        {subtitle ? (
          <p className="text-xs text-slate-400 truncate mt-0.5" title={subtitle}>
            {subtitle}
          </p>
        ) : null}
        {progress !== undefined ? (
          <div className="mt-2">
            <PrismSpectrumFill value={progress} withPercent aria-label={`${title} progress`} />
          </div>
        ) : null}
        {meta ? <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-1.5">{meta}</p> : null}
      </div>
    </div>
  );

  const card = (
    <PrismGlowCard
      color={color}
      as={interactive ? "div" : "article"}
      className={[
        interactive
          ? "cursor-pointer transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-cyan-300"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {interactive ? (
        <div
          role={onClick ? "button" : "link"}
          tabIndex={0}
          onClick={onClick ?? (href ? () => { window.location.href = href; } : undefined)}
          onKeyDown={handleKey}
          aria-label={title}
        >
          {body}
        </div>
      ) : (
        body
      )}
    </PrismGlowCard>
  );

  return active ? <PrismLedSweep active>{card}</PrismLedSweep> : card;
}
