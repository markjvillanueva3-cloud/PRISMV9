/**
 * ResultsPageLayout — Shared results page layout for both lathe and wire EDM.
 *
 * Provides: header with safety score, tab navigation, download actions,
 * and a content area for mode-specific children.
 * Both lathe and wire EDM results pages use this as their base.
 */

import type { ReactNode } from 'react';

export interface ResultsTab {
  id: string;
  label: string;
  icon?: string;
}

export interface ResultsPageLayoutProps {
  mode: 'lathe' | 'wire_edm';
  title: string;
  subtitle?: string;
  safetyScore?: number;
  tabs: ResultsTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onDownload?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  children: ReactNode;
}

function safetyBadge(score: number) {
  if (score >= 0.9) return { label: 'SAFE', bg: 'bg-emerald-600', text: 'text-emerald-300' };
  if (score >= 0.7) return { label: 'CAUTION', bg: 'bg-amber-600', text: 'text-amber-300' };
  return { label: 'REVIEW', bg: 'bg-red-600', text: 'text-red-300' };
}

export function ResultsPageLayout({
  mode, title, subtitle, safetyScore, tabs, activeTab, onTabChange,
  onDownload, onExport, onShare, children,
}: ResultsPageLayoutProps) {
  const accentColor = mode === 'wire_edm' ? 'purple' : 'cyan';
  const badge = safetyScore != null ? safetyBadge(safetyScore) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold text-${accentColor}-400`}>{title}</h2>
          {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {badge && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${badge.bg}`}>
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white">{badge.label}</span>
              <span className="text-xs font-mono text-white/80">{(safetyScore! * 100).toFixed(0)}%</span>
            </div>
          )}
          {onDownload && (
            <button onClick={onDownload} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs text-zinc-200">
              Download
            </button>
          )}
          {onExport && (
            <button onClick={onExport} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs text-zinc-200">
              Export
            </button>
          )}
          {onShare && (
            <button onClick={onShare} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs text-zinc-200">
              Share
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      {tabs.length > 1 && (
        <div className="flex gap-1 border-b border-zinc-700 pb-0.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
                activeTab === tab.id
                  ? `bg-zinc-800 text-${accentColor}-400 border-b-2 border-${accentColor}-400`
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      <div className="min-h-[200px]">
        {children}
      </div>
    </div>
  );
}
