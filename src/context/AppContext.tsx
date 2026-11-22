import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  LordProgress,
  CampaignRun,
  PlaySession,
  ActiveSession,
  AppSettings,
  SaveDetectionPayload,
  Lord,
  GameDifficulty,
  RunStatus
} from '../types';
import { LORDS_DATA } from '../data/lords';
import { getSupabaseClient, syncWithSupabase } from '../lib/supabase';
import { calculateCalendarDays, getCampaignStartDate } from '../lib/timeUtils';

interface AppContextType {
  lordsProgress: Record<number, LordProgress>;
  runs: CampaignRun[];
  sessions: PlaySession[];
  activeSession: ActiveSession | null;
  activeSeconds: number;
  isGameRunning: boolean;
  settings: AppSettings;
  portraitsCache: Record<number, string>;
  lastDetectedSave: SaveDetectionPayload | null;
  
  // Actions
  toggleMedal: (lordId: number, medal: 'short' | 'long' | 'crisis' | 'black') => void;
  togglePlaySession: (lordId: number) => void;
  stopActiveSession: (turnReached?: number) => void;
  updateSession: (sessionId: string, updates: Partial<PlaySession>) => void;
  deleteSession: (sessionId: string) => void;
  addRun: (lordId: number, run: Partial<CampaignRun>) => void;
  updateRun: (runId: string, updates: Partial<CampaignRun>) => void;
  deleteRun: (runId: string) => void;
  finishCampaign: (
    lordId: number,
    data?: {
      status?: RunStatus;
      difficulty?: GameDifficulty;
      finalTurn?: number;
      manualDays?: number;
      totalSeconds?: number;
      isBlackBorderEligible?: boolean;
      medal?: 'short' | 'long' | 'crisis' | 'black';
      notes?: string;
    }
  ) => void;
  getCampaignAutoDetails: (lordId: number) => Promise<{
    turn: number;
    days: number;
    startDate: string;
    totalSeconds: number;
    difficulty: GameDifficulty;
    isBlackBorderEligible: boolean;
    suggestedMedal?: 'short' | 'long' | 'crisis' | 'black';
  }>;
  setLordCustomImage: (lordId: number, url: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  getLordTotalSeconds: (lordId: number) => number;
  getLordActiveRun: (lordId: number) => CampaignRun | undefined;
  exportBackupJson: () => string;
  importBackupJson: (json: string) => boolean;
  triggerCloudSync: () => Promise<{ success: boolean; message: string }>;
}

const DEFAULT_SETTINGS: AppSettings = {
  processWatcherEnabled: true,
  autoPlayEnabled: true,
  minimizeToTray: true,
  savesPath: '',
  replaysPath: '',
  supabaseUrl: '',
  supabaseAnonKey: '',
  syncEnabled: false,
};

import { OLD_TO_NEW_LORDS } from '../data/lordsMigrationMap';
import { DEFAULT_PORTRAITS } from '../data/portraits';

const STORAGE_KEY = 'total_tracking_state_v2';
const OLD_STORAGE_KEY = 'total_tracking_state_v1';

function getInitialState(): any {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    const rawV1 = localStorage.getItem(OLD_STORAGE_KEY);

    let parsedV2: any = null;
    let parsedV1: any = null;

    if (rawV2) {
      try { parsedV2 = JSON.parse(rawV2); } catch {}
    }
    if (rawV1) {
      try { parsedV1 = JSON.parse(rawV1); } catch {}
    }

    // Merge lordsProgress from both versions
    const finalLordsProgress: Record<number, any> = {};
    if (parsedV1?.lordsProgress) {
      Object.entries(parsedV1.lordsProgress).forEach(([idStr, val]) => {
        const id = Number(idStr);
        const newId = Number(OLD_TO_NEW_LORDS[id] || id);
        finalLordsProgress[newId] = val;
      });
    }
    if (parsedV2?.lordsProgress) {
      Object.entries(parsedV2.lordsProgress).forEach(([idStr, val]) => {
        const id = Number(idStr);
        finalLordsProgress[id] = { ...(finalLordsProgress[id] || {}), ...(val as Record<string, any>) };
      });
    }

    // Merge sessions from both versions (deduplicated by id)
    const sessionsMap = new Map<string, any>();
    if (Array.isArray(parsedV1?.sessions)) {
      for (const s of parsedV1.sessions) {
        if (!s) continue;
        const mappedLordId = Number(OLD_TO_NEW_LORDS[s.lordId] || s.lordId);
        const id = s.id || `sess_${s.startedAt || Date.now()}`;
        sessionsMap.set(id, {
          ...s,
          id,
          lordId: mappedLordId,
          durationSeconds: Number(s.durationSeconds) || 0,
        });
      }
    }
    if (Array.isArray(parsedV2?.sessions)) {
      for (const s of parsedV2.sessions) {
        if (!s) continue;
        const id = s.id || `sess_${s.startedAt || Date.now()}`;
        sessionsMap.set(id, {
          ...s,
          id,
          lordId: Number(s.lordId),
          durationSeconds: Number(s.durationSeconds) || 0,
        });
      }
    }
    const finalSessions = Array.from(sessionsMap.values());

    // Merge runs from both versions (deduplicated by id)
    const runsMap = new Map<string, any>();
    if (Array.isArray(parsedV1?.runs)) {
      for (const r of parsedV1.runs) {
        if (!r) continue;
        const mappedLordId = Number(OLD_TO_NEW_LORDS[r.lordId] || r.lordId);
        const id = r.id || `run_${r.createdAt || Date.now()}`;
        runsMap.set(id, {
          ...r,
          id,
          lordId: mappedLordId,
        });
      }
    }
    if (Array.isArray(parsedV2?.runs)) {
      for (const r of parsedV2.runs) {
        if (!r) continue;
        const id = r.id || `run_${r.createdAt || Date.now()}`;
        runsMap.set(id, {
          ...r,
          id,
          lordId: Number(r.lordId),
        });
      }
    }
    const rawRuns = Array.from(runsMap.values());
    const finalRuns = rawRuns.map(r => {
      const lordId = Number(r.lordId);
      const sec = Number(r.totalSeconds) || 0;
      if (sec === 0) {
        const lordSessionsTotal = finalSessions
          .filter(s => Number(s.lordId) === lordId)
          .reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);
        if (lordSessionsTotal > 0) {
          return {
            ...r,
            totalSeconds: lordSessionsTotal,
          };
        }
      }
      return {
        ...r,
        totalSeconds: sec,
      };
    });

    // Active session
    let finalActiveSession = parsedV2?.activeSession || parsedV1?.activeSession || null;
    if (finalActiveSession && finalActiveSession.lordId) {
      const activeLordId = parsedV2?.activeSession
        ? Number(finalActiveSession.lordId)
        : Number(OLD_TO_NEW_LORDS[finalActiveSession.lordId] || finalActiveSession.lordId);
      finalActiveSession = {
        ...finalActiveSession,
        lordId: activeLordId,
      };
    }

    // Default portraits
    const newPortraits: Record<number, string> = { ...DEFAULT_PORTRAITS };
    if (parsedV1?.portraitsCache) {
      Object.entries(parsedV1.portraitsCache).forEach(([idStr, val]) => {
        const id = Number(idStr);
        const newId = Number(OLD_TO_NEW_LORDS[id] || id);
        if (typeof val === 'string' && !val.includes('wikia.nocookie.net') && !val.includes('fandom.com')) {
          newPortraits[newId] = val;
        }
      });
    }
    if (parsedV2?.portraitsCache) {
      Object.entries(parsedV2.portraitsCache).forEach(([idStr, val]) => {
        const id = Number(idStr);
        if (typeof val === 'string' && !val.includes('wikia.nocookie.net') && !val.includes('fandom.com')) {
          newPortraits[id] = val;
        }
      });
    }

    const rawSettings = parsedV2?.settings || parsedV1?.settings || DEFAULT_SETTINGS;
    const cleanSettings: AppSettings = {
      processWatcherEnabled: rawSettings.processWatcherEnabled ?? true,
      autoPlayEnabled: rawSettings.autoPlayEnabled ?? true,
      minimizeToTray: rawSettings.minimizeToTray ?? true,
      savesPath: rawSettings.savesPath || '',
      replaysPath: rawSettings.replaysPath || '',
      supabaseUrl: rawSettings.supabaseUrl || '',
      supabaseAnonKey: rawSettings.supabaseAnonKey || '',
      syncEnabled: rawSettings.syncEnabled ?? false,
      lastSyncedAt: rawSettings.lastSyncedAt,
    };

    return {
      lordsProgress: finalLordsProgress,
      runs: finalRuns,
      sessions: finalSessions,
      activeSession: finalActiveSession,
      settings: cleanSettings,
      portraitsCache: newPortraits,
    };
  } catch (e) {
    console.error('Error recovering state:', e);
  }

  return {
    portraitsCache: { ...DEFAULT_PORTRAITS },
  };
}

const INITIAL_DATA = getInitialState();

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load persisted state
  const [lordsProgress, setLordsProgress] = useState<Record<number, LordProgress>>(() => {
    return INITIAL_DATA.lordsProgress || {};
  });

  const [runs, setRuns] = useState<CampaignRun[]>(() => {
    return INITIAL_DATA.runs || [];
  });

  const [sessions, setSessions] = useState<PlaySession[]>(() => {
    return INITIAL_DATA.sessions || [];
  });

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(() => {
    return INITIAL_DATA.activeSession || null;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    return { ...DEFAULT_SETTINGS, ...(INITIAL_DATA.settings || {}) };
  });

  const [portraitsCache, setPortraitsCache] = useState<Record<number, string>>(() => {
    return INITIAL_DATA.portraitsCache || {};
  });

  const [isStorageLoaded, setIsStorageLoaded] = useState<boolean>(false);
  const [isGameRunning, setIsGameRunning] = useState<boolean>(false);
  const [activeSeconds, setActiveSeconds] = useState<number>(0);
  const [lastDetectedSave, setLastDetectedSave] = useState<SaveDetectionPayload | null>(null);

  // Auto-heal / Recover from storage.json file backup if needed
  useEffect(() => {
    if (window.electronAPI?.loadStorageFile) {
      window.electronAPI.loadStorageFile().then(content => {
        if (!content) {
          setIsStorageLoaded(true);
          return;
        }
        try {
          const fileData = JSON.parse(content);
          if (fileData) {
            // Intelligent merge: ensure no user progress or medals are lost
            if (fileData.lordsProgress && Object.keys(fileData.lordsProgress).length > 0) {
              setLordsProgress(curr => {
                const merged: Record<number, LordProgress> = { ...curr };
                Object.entries(fileData.lordsProgress).forEach(([idStr, val]: [string, any]) => {
                  const id = Number(idStr);
                  const c = merged[id] || { short: false, long: false, crisis: false, black: false };
                  merged[id] = {
                    short: c.short || Boolean(val.short),
                    long: c.long || Boolean(val.long),
                    crisis: c.crisis || Boolean(val.crisis),
                    black: c.black || Boolean(val.black),
                    customImg: c.customImg || val.customImg,
                  };
                });
                return merged;
              });
            }

            if (fileData.runs && fileData.runs.length > 0) {
              setRuns(curr => {
                const map = new Map<string, CampaignRun>();
                fileData.runs.forEach((r: CampaignRun) => map.set(r.id, r));
                curr.forEach(r => {
                  const existing = map.get(r.id);
                  if (!existing) {
                    map.set(r.id, r);
                  } else {
                    map.set(r.id, {
                      ...r,
                      totalSeconds: (r.totalSeconds && r.totalSeconds > 0) ? r.totalSeconds : (existing.totalSeconds || 0),
                      manualDays: (r.manualDays && r.manualDays > 0) ? r.manualDays : (existing.manualDays || 1),
                    });
                  }
                });
                return Array.from(map.values());
              });
            }

            if (fileData.sessions && fileData.sessions.length > 0) {
              setSessions(curr => {
                const map = new Map<string, PlaySession>();
                fileData.sessions.forEach((s: PlaySession) => map.set(s.id, s));
                curr.forEach(s => map.set(s.id, s));
                return Array.from(map.values()).sort((a, b) => b.startedAt - a.startedAt);
              });
            }
          }
        } catch (e) {
          console.error('Error recovering state from file backup:', e);
        } finally {
          setIsStorageLoaded(true);
        }
      }).catch(() => {
        setIsStorageLoaded(true);
      });
    } else {
      setIsStorageLoaded(true);
    }
  }, []);

  // Save to localStorage and storage.json file backup (guarded against uninitialized saves)
  useEffect(() => {
    if (!isStorageLoaded) return;
    try {
      const stateObj = {
        lordsProgress,
        runs,
        sessions,
        activeSession,
        settings,
        portraitsCache,
      };
      const jsonStr = JSON.stringify(stateObj);
      localStorage.setItem(STORAGE_KEY, jsonStr);

      if (window.electronAPI?.saveStorageFile) {
        window.electronAPI.saveStorageFile(jsonStr);
      }
    } catch (err) {
      console.error('Failed to save state to localStorage', err);
    }
  }, [isStorageLoaded, lordsProgress, runs, sessions, activeSession, settings, portraitsCache]);

  // Live timer tick
  useEffect(() => {
    if (!activeSession) {
      setActiveSeconds(0);
      return;
    }
    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - activeSession.startedAt) / 1000);
      setActiveSeconds(Math.max(0, elapsed));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Stop active session helper
  const stopActiveSession = useCallback((turnReached?: number) => {
    if (!activeSession) return;
    const now = Date.now();
    const duration = Math.max(1, Math.floor((now - activeSession.startedAt) / 1000));
    
    const newSession: PlaySession = {
      id: `sess_${now}_${Math.random().toString(36).substring(2, 7)}`,
      runId: activeSession.runId,
      lordId: activeSession.lordId,
      startedAt: activeSession.startedAt,
      endedAt: now,
      durationSeconds: duration,
      turnReached: turnReached,
      autoDetected: !document.hasFocus(),
    };

    setSessions(prev => [newSession, ...prev]);

    // Also update run total seconds if linked
    if (activeSession.runId) {
      setRuns(prev =>
        prev.map(r => {
          if (r.id === activeSession.runId) {
            return {
              ...r,
              totalSeconds: (r.totalSeconds || 0) + duration,
              finalTurn: turnReached ? Math.max(r.finalTurn, turnReached) : r.finalTurn,
            };
          }
          return r;
        })
      );
    }

    setActiveSession(null);
  }, [activeSession]);

  // Start / Toggle play session
  const togglePlaySession = useCallback((lordId: number) => {
    if (activeSession && activeSession.lordId === lordId) {
      stopActiveSession();
      return;
    }

    if (activeSession) {
      stopActiveSession();
    }

    // Check if there is an in_progress run for this lord
    const inProgRun = runs.find(r => r.lordId === lordId && r.status === 'in_progress');

    setActiveSession({
      lordId,
      startedAt: Date.now(),
      runId: inProgRun?.id,
    });
  }, [activeSession, runs, stopActiveSession]);

  // Electron IPC Automations
  useEffect(() => {
    if (!window.electronAPI) return;

    // 1. Initial process check
    window.electronAPI.getProcessStatus().then(running => {
      setIsGameRunning(running);
    });

    // 2. Process status listener (Auto-play / Auto-pause)
    const unsubscribeProcess = window.electronAPI.onProcessStatusChange(running => {
      setIsGameRunning(running);

      if (settings.processWatcherEnabled) {
        if (settings.autoPlayEnabled && running && !activeSession) {
          // Check if there is an in_progress run, or use the most recent save!
          const activeRun = runs.find(r => r.status === 'in_progress');
          if (activeRun) {
            setActiveSession({
              lordId: activeRun.lordId,
              startedAt: Date.now(),
              runId: activeRun.id,
            });
          } else {
            window.electronAPI?.getSavesList(settings.savesPath).then(saves => {
              if (saves && saves.length > 0 && saves[0].lordId) {
                const targetLordId = saves[0].lordId;
                const existingRun = runs.find(r => r.lordId === targetLordId && r.status === 'in_progress');
                setActiveSession({
                  lordId: targetLordId,
                  startedAt: Date.now(),
                  runId: existingRun?.id,
                });
              }
            });
          }
        } else if (!running && activeSession) {
          // Game closed, pause timer!
          stopActiveSession();
        }
      }
    });

    // 3. Save detection listener
    const unsubscribeSave = window.electronAPI.onSaveDetected(payload => {
      setLastDetectedSave(payload);

      // Auto update current turn, medal and ACTIVE SESSION
      if (payload.lordId) {
        // Auto-switch / start session for this Lord if game is running or autoPlay is active
        if (settings.processWatcherEnabled && settings.autoPlayEnabled) {
          setActiveSession(curr => {
            if (!curr || curr.lordId !== payload.lordId) {
              if (curr) {
                // Log elapsed seconds for previous lord
                const now = Date.now();
                const dur = Math.max(1, Math.floor((now - curr.startedAt) / 1000));
                const sess: PlaySession = {
                  id: `sess_${now}_${Math.random().toString(36).substring(2, 7)}`,
                  runId: curr.runId,
                  lordId: curr.lordId,
                  startedAt: curr.startedAt,
                  endedAt: now,
                  durationSeconds: dur,
                  autoDetected: true,
                };
                setSessions(prev => [sess, ...prev]);
                if (curr.runId) {
                  setRuns(prev => prev.map(r => r.id === curr.runId ? { ...r, totalSeconds: (r.totalSeconds || 0) + dur } : r));
                }
              }

              const targetRun = runs.find(r => r.lordId === payload.lordId && r.status === 'in_progress');
              return {
                lordId: payload.lordId!,
                startedAt: Date.now(),
                runId: targetRun?.id,
              };
            }
            return curr;
          });
        }
        // If medal suggested, update lord progress
        if (payload.medalSuggestion) {
          setLordsProgress(prev => {
            const current = prev[payload.lordId!] || { short: false, long: false, crisis: false, black: false };
            return {
              ...prev,
              [payload.lordId!]: {
                ...current,
                [payload.medalSuggestion!]: true,
              },
            };
          });
        }

        // Update run final turn if turn found
        if (payload.turn) {
          setRuns(prev => {
            const targetRun = prev.find(r => r.lordId === payload.lordId && r.status === 'in_progress');
            if (targetRun) {
              return prev.map(r => (r.id === targetRun.id ? { ...r, finalTurn: Math.max(r.finalTurn, payload.turn!) } : r));
            }
            return prev;
          });
        }
      }
    });

    return () => {
      unsubscribeProcess();
      unsubscribeSave();
    };
  }, [activeSession, runs, settings, stopActiveSession]);

  // Medals toggle
  const toggleMedal = useCallback((lordId: number, medal: 'short' | 'long' | 'crisis' | 'black') => {
    setLordsProgress(prev => {
      const current = prev[lordId] || { short: false, long: false, crisis: false, black: false };
      return {
        ...prev,
        [lordId]: {
          ...current,
          [medal]: !current[medal],
        },
      };
    });
  }, []);

  // Add a new Run
  const addRun = useCallback((lordId: number, runData: Partial<CampaignRun>) => {
    const targetId = Number(lordId);
    const isFinished = runData.status === 'victory' || runData.status === 'defeat';

    // 1. If an active session is running for this lord and the run is completed, stop and commit it
    let activeDurationToAdd = 0;
    if (activeSession && Number(activeSession.lordId) === targetId) {
      const now = Date.now();
      activeDurationToAdd = Math.max(1, Math.floor((now - activeSession.startedAt) / 1000));

      const newSession: PlaySession = {
        id: `sess_${now}_${Math.random().toString(36).substring(2, 7)}`,
        runId: undefined,
        lordId: targetId,
        startedAt: activeSession.startedAt,
        endedAt: now,
        durationSeconds: activeDurationToAdd,
        turnReached: runData.finalTurn,
        autoDetected: !document.hasFocus(),
      };

      if (isFinished) {
        setActiveSession(null);
      }
      setSessions(prev => [newSession, ...prev]);
    }

    // 2. Determine totalSeconds: auto-calculate from unallocated sessions if not provided
    let computedSeconds = Number(runData.totalSeconds);
    if (!computedSeconds || computedSeconds <= 0) {
      const allocated = runs
        .filter(r => Number(r.lordId) === targetId)
        .reduce((sum, r) => sum + (Number(r.totalSeconds) || 0), 0);
      const lordSessionSec = sessions
        .filter(s => Number(s.lordId) === targetId)
        .reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);
      const totalAvailable = lordSessionSec + activeDurationToAdd;
      const unallocated = totalAvailable - allocated;
      computedSeconds = unallocated > 0 ? unallocated : totalAvailable;
    }

    const newRun: CampaignRun = {
      id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      lordId: targetId,
      status: runData.status || 'in_progress',
      difficulty: runData.difficulty || 'Normal',
      finalTurn: runData.finalTurn || 0,
      startDate: runData.startDate || new Date().toISOString(),
      endDate: isFinished ? (runData.endDate || new Date().toISOString()) : undefined,
      manualDays: runData.manualDays || 1,
      totalSeconds: Math.max(0, computedSeconds),
      notes: runData.notes || '',
      isBlackBorderEligible: runData.isBlackBorderEligible || false,
      createdAt: Date.now(),
    };

    setRuns(prev => [newRun, ...prev]);

    // If victory, auto-grant Short Victory medal if not yet granted
    if (newRun.status === 'victory') {
      setLordsProgress(prev => {
        const cur = prev[targetId] || { short: false, long: false, crisis: false, black: false };
        return {
          ...prev,
          [targetId]: {
            ...cur,
            short: true,
            black: newRun.isBlackBorderEligible ? true : cur.black,
          },
        };
      });
    }
  }, [activeSession, runs, sessions]);

  const updateRun = useCallback((runId: string, updates: Partial<CampaignRun>) => {
    setRuns(prev =>
      prev.map(r => {
        if (r.id !== runId) return r;
        const updated = { ...r, ...updates };
        if (updates.status === 'victory') {
          setLordsProgress(lp => {
            const cur = lp[r.lordId] || { short: false, long: false, crisis: false, black: false };
            return {
              ...lp,
              [r.lordId]: {
                ...cur,
                short: true,
                black: updates.isBlackBorderEligible !== undefined ? updates.isBlackBorderEligible : cur.black,
              },
            };
          });
        }
        return updated;
      })
    );
  }, []);

  const deleteRun = useCallback((runId: string) => {
    setRuns(prev => prev.filter(r => r.id !== runId));
  }, []);

  const updateSession = useCallback((sessionId: string, updates: Partial<PlaySession>) => {
    setSessions(prev =>
      prev.map(s => {
        if (s.id !== sessionId) return s;
        const updated = { ...s, ...updates };
        if (updates.durationSeconds !== undefined) {
          updated.durationSeconds = Math.max(0, Number(updates.durationSeconds));
          updated.endedAt = updated.startedAt + updated.durationSeconds * 1000;
        }
        if (updates.lordId !== undefined) {
          updated.lordId = Number(updates.lordId);
        }
        if (updates.turnReached !== undefined) {
          updated.turnReached = updates.turnReached ? Number(updates.turnReached) : undefined;
        }
        return updated;
      })
    );
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  const setLordCustomImage = useCallback((lordId: number, url: string) => {
    setLordsProgress(prev => {
      const cur = prev[lordId] || { short: false, long: false, crisis: false, black: false };
      return {
        ...prev,
        [lordId]: {
          ...cur,
          customImg: url,
        },
      };
    });
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const getLordTotalSeconds = useCallback(
    (lordId: number): number => {
      const targetId = Number(lordId);
      let sessionTotal = sessions
        .filter(s => Number(s.lordId) === targetId)
        .reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);
      if (activeSession && Number(activeSession.lordId) === targetId) {
        sessionTotal += activeSeconds;
      }
      const runsTotal = runs
        .filter(r => Number(r.lordId) === targetId)
        .reduce((sum, r) => sum + (Number(r.totalSeconds) || 0), 0);
      return Math.max(sessionTotal, runsTotal);
    },
    [sessions, activeSession, activeSeconds, runs]
  );

  const getCampaignAutoDetails = useCallback(
    async (lordId: number) => {
      const targetId = Number(lordId);
      const now = Date.now();

      // 1. Turn detection
      let turn = 1;
      if (lastDetectedSave?.lordId === targetId && lastDetectedSave.turn) {
        turn = lastDetectedSave.turn;
      } else if (window.electronAPI?.getSavesList) {
        try {
          const saves = await window.electronAPI.getSavesList(settings.savesPath);
          const matchingSave = saves?.find(s => Number(s.lordId) === targetId && s.turn);
          if (matchingSave?.turn) {
            turn = matchingSave.turn;
          }
        } catch (e) {
          console.error('Error fetching saves in getCampaignAutoDetails:', e);
        }
      }

      if (turn === 1) {
        const inProg = runs.find(r => Number(r.lordId) === targetId && r.status === 'in_progress');
        if (inProg?.finalTurn) {
          turn = inProg.finalTurn;
        } else {
          const maxSessionTurn = sessions
            .filter(s => Number(s.lordId) === targetId)
            .reduce((max, s) => Math.max(max, s.turnReached || 0), 0);
          if (maxSessionTurn > 0) turn = maxSessionTurn;
        }
      }

      // 2. Start date and days
      const startDate = getCampaignStartDate(targetId, runs, sessions, activeSession);
      const days = calculateCalendarDays(startDate, now);

      // 3. Unallocated totalSeconds
      const allocated = runs
        .filter(r => Number(r.lordId) === targetId && (r.status === 'victory' || r.status === 'defeat'))
        .reduce((sum, r) => sum + (Number(r.totalSeconds) || 0), 0);
      const lordSessionSec = sessions
        .filter(s => Number(s.lordId) === targetId)
        .reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);
      const currentActive = (activeSession && Number(activeSession.lordId) === targetId) ? activeSeconds : 0;
      const totalAvailable = lordSessionSec + currentActive;
      const unallocated = totalAvailable - allocated;
      const totalSeconds = unallocated > 0 ? unallocated : totalAvailable;

      // 4. In progress run reference
      const activeRun = runs.find(r => Number(r.lordId) === targetId && r.status === 'in_progress');

      return {
        turn,
        days,
        startDate,
        totalSeconds,
        difficulty: (activeRun?.difficulty || 'Very Hard') as GameDifficulty,
        isBlackBorderEligible: activeRun?.isBlackBorderEligible ?? true,
        suggestedMedal: (lastDetectedSave?.lordId === targetId && lastDetectedSave.medalSuggestion) || 'short',
      };
    },
    [lastDetectedSave, settings.savesPath, runs, sessions, activeSession, activeSeconds]
  );

  const finishCampaign = useCallback(
    (
      lordId: number,
      data?: {
        status?: RunStatus;
        difficulty?: GameDifficulty;
        finalTurn?: number;
        manualDays?: number;
        totalSeconds?: number;
        isBlackBorderEligible?: boolean;
        medal?: 'short' | 'long' | 'crisis' | 'black';
        notes?: string;
      }
    ) => {
      const targetId = Number(lordId);
      const now = Date.now();
      const status: RunStatus = data?.status || 'victory';
      const isBlackBorder = data?.isBlackBorderEligible ?? true;

      // 1. Commit active session if running for this lord
      let activeDurationToAdd = 0;
      if (activeSession && Number(activeSession.lordId) === targetId) {
        activeDurationToAdd = Math.max(1, Math.floor((now - activeSession.startedAt) / 1000));
        const newSession: PlaySession = {
          id: `sess_${now}_${Math.random().toString(36).substring(2, 7)}`,
          runId: undefined,
          lordId: targetId,
          startedAt: activeSession.startedAt,
          endedAt: now,
          durationSeconds: activeDurationToAdd,
          turnReached: data?.finalTurn,
          autoDetected: !document.hasFocus(),
        };
        setActiveSession(null);
        setSessions(prev => [newSession, ...prev]);
      }

      // 2. Compute totalSeconds
      let computedSeconds = Number(data?.totalSeconds);
      if (!computedSeconds || computedSeconds <= 0) {
        const allocated = runs
          .filter(r => Number(r.lordId) === targetId && (r.status === 'victory' || r.status === 'defeat'))
          .reduce((sum, r) => sum + (Number(r.totalSeconds) || 0), 0);
        const lordSessionSec = sessions
          .filter(s => Number(s.lordId) === targetId)
          .reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);
        const totalAvailable = lordSessionSec + activeDurationToAdd;
        const unallocated = totalAvailable - allocated;
        computedSeconds = unallocated > 0 ? unallocated : totalAvailable;
      }

      // 3. Determine start date and days
      const startDate = getCampaignStartDate(targetId, runs, sessions, activeSession);
      const manualDays = data?.manualDays || calculateCalendarDays(startDate, now);

      // 4. Determine finalTurn
      let finalTurn = data?.finalTurn;
      if (!finalTurn || finalTurn <= 0) {
        if (lastDetectedSave?.lordId === targetId && lastDetectedSave.turn) {
          finalTurn = lastDetectedSave.turn;
        } else {
          const inProgRun = runs.find(r => Number(r.lordId) === targetId && r.status === 'in_progress');
          finalTurn = inProgRun?.finalTurn || 1;
        }
      }

      const difficulty: GameDifficulty = data?.difficulty || 'Very Hard';

      // 5. Update in_progress run or create new run
      const inProgRun = runs.find(r => Number(r.lordId) === targetId && r.status === 'in_progress');
      if (inProgRun) {
        setRuns(prev =>
          prev.map(r =>
            r.id === inProgRun.id
              ? {
                  ...r,
                  status,
                  difficulty,
                  finalTurn,
                  endDate: new Date(now).toISOString(),
                  manualDays,
                  totalSeconds: Math.max(0, computedSeconds),
                  notes: data?.notes !== undefined ? data.notes : r.notes,
                  isBlackBorderEligible: isBlackBorder,
                }
              : r
          )
        );
      } else {
        const newRun: CampaignRun = {
          id: `run_${now}_${Math.random().toString(36).substring(2, 7)}`,
          lordId: targetId,
          status,
          difficulty,
          finalTurn,
          startDate,
          endDate: new Date(now).toISOString(),
          manualDays,
          totalSeconds: Math.max(0, computedSeconds),
          notes: data?.notes || '',
          isBlackBorderEligible: isBlackBorder,
          createdAt: now,
        };
        setRuns(prev => [newRun, ...prev]);
      }

      // 6. If victory, award medals
      if (status === 'victory') {
        const medalKey = data?.medal || 'short';
        setLordsProgress(prev => {
          const cur = prev[targetId] || { short: false, long: false, crisis: false, black: false };
          return {
            ...prev,
            [targetId]: {
              ...cur,
              [medalKey]: true,
              short: true,
              black: isBlackBorder ? true : cur.black,
            },
          };
        });
      }
    },
    [activeSession, runs, sessions, lastDetectedSave]
  );

  const getLordActiveRun = useCallback(
    (lordId: number): CampaignRun | undefined => {
      const targetId = Number(lordId);
      return runs.find(r => Number(r.lordId) === targetId && r.status === 'in_progress');
    },
    [runs]
  );

  // Backup JSON
  const exportBackupJson = useCallback((): string => {
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        lordsProgress,
        runs,
        sessions,
        settings,
        portraitsCache,
      },
      null,
      2
    );
  }, [lordsProgress, runs, sessions, settings, portraitsCache]);

  const importBackupJson = useCallback((jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.lordsProgress) setLordsProgress(data.lordsProgress);
      if (data.runs) setRuns(data.runs);
      if (data.sessions) setSessions(data.sessions);
      if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
      if (data.portraitsCache) setPortraitsCache(data.portraitsCache);
      return true;
    } catch (e) {
      console.error('Failed to import JSON', e);
      return false;
    }
  }, []);

  // Supabase Cloud Sync
  const triggerCloudSync = useCallback(async () => {
    const client = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
    if (!client) {
      return { success: false, message: 'Configure a URL e Anon Key do Supabase nas Configurações.' };
    }
    const res = await syncWithSupabase(client, {
      lords: lordsProgress,
      runs,
      sessions,
    });
    if (res.success) {
      setSettings(prev => ({ ...prev, lastSyncedAt: Date.now() }));
    }
    return res;
  }, [settings, lordsProgress, runs, sessions]);

  return (
    <AppContext.Provider
      value={{
        lordsProgress,
        runs,
        sessions,
        activeSession,
        activeSeconds,
        isGameRunning,
        settings,
        portraitsCache,
        lastDetectedSave,
        toggleMedal,
        togglePlaySession,
        stopActiveSession,
        updateSession,
        deleteSession,
        addRun,
        updateRun,
        deleteRun,
        finishCampaign,
        getCampaignAutoDetails,
        setLordCustomImage,
        updateSettings,
        getLordTotalSeconds,
        getLordActiveRun,
        exportBackupJson,
        importBackupJson,
        triggerCloudSync,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
