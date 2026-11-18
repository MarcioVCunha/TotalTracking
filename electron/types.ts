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
