/**
 * useFavorites — Persistent favorites with localStorage
 * UX-MS0-U03: Recent items + favorites
 */
import { useState, useCallback, useEffect } from "react";

interface FavoriteItem {
  id: string;
  title: string;
  path: string;
  category: string;
  addedAt: number;
}

const STORAGE_KEY = "prism-favorites";
const RECENTS_KEY = "prism-recents";
const MAX_RECENTS = 20;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — ignore */ }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => load(STORAGE_KEY, []));
  const [recents, setRecents] = useState<FavoriteItem[]>(() => load(RECENTS_KEY, []));

  useEffect(() => { save(STORAGE_KEY, favorites); }, [favorites]);
  useEffect(() => { save(RECENTS_KEY, recents); }, [recents]);

  const addFavorite = useCallback((item: Omit<FavoriteItem, "addedAt">) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === item.id)) return prev;
      return [...prev, { ...item, addedAt: Date.now() }];
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  }, []);

  const isFavorite = useCallback((id: string) => {
    return favorites.some(f => f.id === id);
  }, [favorites]);

  const addRecent = useCallback((item: Omit<FavoriteItem, "addedAt">) => {
    setRecents(prev => {
      const filtered = prev.filter(r => r.id !== item.id);
      return [{ ...item, addedAt: Date.now() }, ...filtered].slice(0, MAX_RECENTS);
    });
  }, []);

  return { favorites, recents, addFavorite, removeFavorite, isFavorite, addRecent };
}
