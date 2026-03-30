import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import {
  useListScorecards,
  useGetScorecard,
  useCreateScorecard,
  useUpdateScorecard,
  useDeleteScorecard,
  useGetCourseHoles,
  getListScorecardsQueryKey,
  getGetScorecardQueryKey,
} from "@workspace/api-client-react";

export function useCourseHoles() {
  return useGetCourseHoles();
}

export function useScorecards() {
  return useListScorecards();
}

export function useScorecard(id: number) {
  return useGetScorecard(id, {
    query: {
      enabled: !isNaN(id) && id > 0,
    }
  });
}

export function useCreateNewScorecard() {
  const queryClient = useQueryClient();
  return useCreateScorecard({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListScorecardsQueryKey() });
      },
    },
  });
}

export function useUpdateRoundScores() {
  const queryClient = useQueryClient();
  return useUpdateScorecard({
    mutation: {
      onSuccess: (data: { id: number }) => {
        queryClient.invalidateQueries({ queryKey: getGetScorecardQueryKey(data.id) });
        queryClient.invalidateQueries({ queryKey: getListScorecardsQueryKey() });
      },
    },
  });
}

export function useDeleteRound() {
  const queryClient = useQueryClient();
  return useDeleteScorecard({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListScorecardsQueryKey() });
      },
    },
  });
}

const HANDICAP_STORE_KEY = "golf-player-handicaps";

/**
 * Persists calculated handicap indexes keyed by lowercase player name.
 * Survives page reloads via localStorage.
 */
export function useStoredHandicaps() {
  function load(): Record<string, number> {
    try {
      return JSON.parse(localStorage.getItem(HANDICAP_STORE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function getHandicap(name: string): number | null {
    const all = load();
    const key = name.trim().toLowerCase();
    return key in all ? all[key] : null;
  }

  function saveHandicap(name: string, handicap: number) {
    const all = load();
    all[name.trim().toLowerCase()] = handicap;
    localStorage.setItem(HANDICAP_STORE_KEY, JSON.stringify(all));
  }

  function saveAll(updates: { name: string; handicap: number }[]) {
    const all = load();
    for (const { name, handicap } of updates) {
      all[name.trim().toLowerCase()] = handicap;
    }
    localStorage.setItem(HANDICAP_STORE_KEY, JSON.stringify(all));
  }

  return { getHandicap, saveHandicap, saveAll };
}

// ── Player roster ──────────────────────────────────────────────────────────

export interface SavedPlayer {
  id: string;
  name: string;
  handicap: number;
}

const PLAYERS_STORE_KEY = "golf-player-roster";

function loadPlayers(): SavedPlayer[] {
  try {
    return JSON.parse(localStorage.getItem(PLAYERS_STORE_KEY) || "[]");
  } catch {
    return [];
  }
}

function storePlayers(players: SavedPlayer[]) {
  localStorage.setItem(PLAYERS_STORE_KEY, JSON.stringify(players));
}

export function usePlayers() {
  const [players, setPlayers] = useState<SavedPlayer[]>(() => loadPlayers());

  // Keep state in sync if another tab/window updates localStorage
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === PLAYERS_STORE_KEY) setPlayers(loadPlayers());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const addPlayer = useCallback((name: string, handicap: number) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlayers(prev => {
      // Prevent duplicate names (case-insensitive)
      if (prev.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = [...prev, { id: crypto.randomUUID(), name: trimmed, handicap }];
      storePlayers(next);
      return next;
    });
  }, []);

  const updatePlayer = useCallback((id: string, name: string, handicap: number) => {
    setPlayers(prev => {
      const next = prev.map(p => p.id === id ? { ...p, name: name.trim() || p.name, handicap } : p);
      storePlayers(next);
      return next;
    });
  }, []);

  const removePlayer = useCallback((id: string) => {
    setPlayers(prev => {
      const next = prev.filter(p => p.id !== id);
      storePlayers(next);
      return next;
    });
  }, []);

  // Called by handicap auto-calc to sync new handicap into roster
  const syncHandicap = useCallback((name: string, handicap: number) => {
    setPlayers(prev => {
      const next = prev.map(p =>
        p.name.toLowerCase() === name.trim().toLowerCase() ? { ...p, handicap } : p
      );
      storePlayers(next);
      return next;
    });
  }, []);

  return { players, addPlayer, updatePlayer, removePlayer, syncHandicap };
}
