export type EraType = 1 | 2 | 3;
export type WaveType = 1 | 2 | 3 | 4 | 5 | 6;

export type RunStatus = 'in_progress' | 'victory' | 'defeat';

export type GameDifficulty = 'Normal' | 'Hard' | 'Very Hard' | 'Legendary';

export interface Lord {
  id: number;
  name: string;
  faction: string;
  race: string;
  era: EraType;
  wave: WaveType;
  wiki: string;
  dlcName?: string;
  portraitUrl?: string;
}

export interface LordProgress {
  short: boolean;
  long: boolean;
  crisis: boolean;
  black: boolean;
  customImg?: string;
}

export interface CampaignRun {
  id: string;
  lordId: number;
  status: RunStatus;
  difficulty: GameDifficulty;
  finalTurn: number;
  startDate: string; // ISO String UTC
  endDate?: string;  // ISO String UTC
  manualDays?: number;
  totalSeconds: number;
  notes?: string;
  isBlackBorderEligible?: boolean; // 100% manual battles & no-retreat
  createdAt: number;
}

export interface PlaySession {
  id: string;
  runId?: string;
  lordId: number;
  startedAt: number; // ms
  endedAt: number;   // ms
  durationSeconds: number;
  turnReached?: number;
  autoDetected: boolean;
}

export interface ActiveSession {
  lordId: number;
  startedAt: number;
  runId?: string;
}

export interface FactionStats {
  faction: string;
  race: string;
  totalLords: number;
  completedLords: number;
  totalSeconds: number;
  victories: number;
  defeats: number;
  blackBorders: number;
}

export interface AppSettings {
  processWatcherEnabled: boolean;
  autoPlayEnabled: boolean;
  minimizeToTray: boolean;
  savesPath: string;
  replaysPath: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  syncEnabled: boolean;
  lastSyncedAt?: number;
}

export interface SaveDetectionPayload {
  filePath: string;
  fileName: string;
  lordId?: number;
  factionName?: string;
  turn?: number;
  medalSuggestion?: 'short' | 'long' | 'crisis' | 'black';
  saveType?: 'manual' | 'auto' | 'quick';
  modifiedAt: number;
}

export interface ReplayItem {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  modifiedAt: string;
  settlement?: string;
  playerFaction?: string;
  enemyFaction?: string;
  playerLord?: string;
  detectedUnits?: string[];
  battleType?: string;
}

export interface ElectronAPI {
  getProcessStatus: () => Promise<boolean>;
  onProcessStatusChange: (callback: (running: boolean) => void) => () => void;
  onSaveDetected: (callback: (payload: SaveDetectionPayload) => void) => () => void;
  getSavesList: (customPath?: string) => Promise<SaveDetectionPayload[]>;
  getReplaysList: (customPath?: string) => Promise<ReplayItem[]>;
  browseFolder: () => Promise<string | null>;
  createDesktopShortcut: () => Promise<{ success: boolean; message: string }>;
  minimizeWindow: () => void;
  closeWindow: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
