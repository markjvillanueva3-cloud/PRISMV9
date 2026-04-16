/**
 * CommandPalette — Global search & navigation (Ctrl+K).
 * Ported from mcp-server/web (no external dependencies).
 */
import { useState, useEffect, useRef, useCallback } from "react";

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "page" | "material" | "machine" | "tool" | "job" | "action";
  icon?: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  items: CommandItem[];
  onClose: () => void;
  isOpen: boolean;
}

function fuzzyMatch(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return 100 - t.indexOf(q);
  let score = 0, qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) { score += 10; qi++; }
  }
  return qi === q.length ? score : 0;
}

const CATEGORY_ICONS: Record<string, string> = {
  page: "📄", material: "🔧", machine: "⚙️", tool: "🔩", job: "📋", action: "⚡",
};

export function CommandPalette({ items, onClose, isOpen }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.length === 0
    ? items.slice(0, 10)
    : items
        .map(item => ({ item, score: Math.max(fuzzyMatch(query, item.title), fuzzyMatch(query, item.subtitle ?? ""), ...(item.keywords ?? []).map(k => fuzzyMatch(query, k))) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 15)
        .map(r => r.item);

  const executeItem = useCallback((item: CommandItem) => {
    item.action();
    onClose();
    setQuery("");
  }, [onClose]);

  useEffect(() => { if (isOpen) { inputRef.current?.focus(); setQuery(""); setSelectedIndex(0); } }, [isOpen]);
  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); break;
      case "ArrowUp": e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); break;
      case "Enter": e.preventDefault(); if (filtered[selectedIndex]) executeItem(filtered[selectedIndex]); break;
      case "Escape": e.preventDefault(); onClose(); break;
    }
  }, [filtered, selectedIndex, executeItem, onClose]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 560, backgroundColor: "#1e1e2e", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", border: "1px solid #313244", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #313244" }}>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Search pages, materials, machines, tools..."
            style={{ width: "100%", background: "transparent", border: "none", color: "#cdd6f4", fontSize: 16, outline: "none", fontFamily: "inherit" }} />
        </div>
        <div ref={listRef} style={{ maxHeight: 400, overflowY: "auto", padding: "4px 0" }}>
          {filtered.length === 0 && query.length > 0 && (
            <div style={{ padding: "16px", textAlign: "center", color: "#6c7086" }}>No results for "{query}"</div>
          )}
          {filtered.map((item, i) => (
            <div key={item.id} onClick={() => executeItem(item)} style={{ padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, backgroundColor: i === selectedIndex ? "#313244" : "transparent", color: i === selectedIndex ? "#cdd6f4" : "#a6adc8" }}>
              <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[item.category] ?? "📄"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{item.title}</div>
                {item.subtitle && <div style={{ fontSize: 12, color: "#6c7086", marginTop: 2 }}>{item.subtitle}</div>}
              </div>
              <span style={{ fontSize: 11, color: "#585b70", textTransform: "uppercase", padding: "2px 6px", borderRadius: 4, backgroundColor: "#181825" }}>{item.category}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 16px", borderTop: "1px solid #313244", display: "flex", gap: 16, color: "#585b70", fontSize: 12 }}>
          <span><kbd style={{ backgroundColor: "#313244", padding: "1px 4px", borderRadius: 3 }}>↑↓</kbd> Navigate</span>
          <span><kbd style={{ backgroundColor: "#313244", padding: "1px 4px", borderRadius: 3 }}>↵</kbd> Open</span>
          <span><kbd style={{ backgroundColor: "#313244", padding: "1px 4px", borderRadius: 3 }}>esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}

export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); onOpen(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpen]);
}
