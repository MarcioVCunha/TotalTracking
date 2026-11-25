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
