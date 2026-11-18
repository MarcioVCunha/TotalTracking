import fs, { FSWatcher } from 'fs';
import path from 'path';

export interface SaveMetadata {
  filePath: string;
  fileName: string;
  lordId?: number;
  factionName?: string;
  turn?: number;
  medalSuggestion?: 'short' | 'long' | 'crisis' | 'black';
  saveType?: 'manual' | 'auto' | 'quick';
  modifiedAt: number;
}

// Map common faction/save names to Lord IDs (English and Portuguese)
const FACTION_NAME_TO_LORD_ID: Record<string, number> = {
  // Empire
  'reikland': 1,
  'o império': 1,
  'imperio': 1,
  'the golden order': 10,
  'a ordem dourada': 10,
  'the huntmarshal\'s expedition': 40,
  'expedição do marechal caçador': 40,
  'middenland': 106,
  'nuln': 83,
  'elspeth': 83,

  // Dwarfs
  'karaz-a-karak': 2,
  'reinos dos anões': 2,
  'karak kadrin': 11,
  'clan angrund': 26,
  'clã angrund': 26,
  'ironbrow\'s expedition': 65,
  'expedição de sobrancelha de ferro': 65,
  'malakai\'s expedition': 95,
  'expedição de malakai': 95,

  // Greenskins
  'grimgor\'s \'ardboyz': 3,
  'bonerattlaz': 12,
  'the bloody handz': 19,
  'mão sangrenta': 19,
  'crooked moon': 29,
  'lua torta': 29,
  'broken axe': 45,
  'machado quebrado': 45,

  // Vampire Counts
  'sylvania': 23,
  'the barrow legion': 13,
  'a legião do túmulo': 13,
  'silver pinnacle': 109,

  // Warriors of Chaos & Beastmen
  'warhost of the apocalypse': 7,
  'warherd of the one-eye': 6,
  'legion of chaos': 88,
  'legião do caos': 88,

  // Wood Elves
  'heralds of ariel': 59,
  'arautos de ariel': 59,
  'talsyn': 27,
  'argwylon': 9,

  // Bretonnia
  'couronne': 5,
  'bordeleaux': 14,
  'carcassonne': 21,
  'chevaliers de lyonesse': 52,

  // Norsca
  'world walkers': 8,
  'andantes do mundo': 8,
  'wintertooth': 24,
  'dente de inverno': 24,

  // High Elves
  'eataine': 30,
  'lothern': 30,
  'order of loremasters': 38,
  'ordem dos mestres do saber': 38,
  'nagarythe': 46,
  'avelorn': 53,
  'knights of caledor': 66,
  'cavaleiros de caledor': 66,
  'yvresse': 61,

  // Dark Elves
  'naggarond': 31,
  'cult of pleasure': 39,
  'culto ao prazer': 39,
  'the blessed dread': 54,
  'har ganeth': 47,
  'hag graef': 62,
  'the thousand maws': 67,

  // Lizardmen
  'hexoatl': 32,
  'last defenders': 43,
  'últimos defensores': 43,
  'tlaqua': 48,
  'itza': 55,
  'cult of sotek': 63,
  'culto de sotek': 63,
  'spirit of the jungle': 37,
  'espírito da selva': 37,
  'ghosts of pahuax': 69,

  // Skaven
  'clan mors': 33,
  'clã mors': 33,
  'clan pestilens': 41,
  'clã pestilens': 41,
  'clan rictus': 56,
  'clã rictus': 56,
  'clan skryre': 49,
  'clã skryre': 49,
  'clan eshin': 64,
  'clã eshin': 64,
  'clan moulder': 68,
  'clã moulder': 68,
  'thanquol': 108,

  // Tomb Kings
  'khemri': 34,
  'followers of nagash': 42,
  'seguidores de nagash': 42,
  'court of lybaras': 50,
  'corte de lybaras': 50,
  'exiles of nehek': 57,
  'exilados de nehek': 57,

  // Vampire Coast
  'the awakened': 35,
  'os despertos': 35,
  'the dreadfleet': 44,
  'a frota do pavor': 44,
  'pirates of sartosa': 51,
  'piratas de sartosa': 51,
  'the drowned': 58,
  'os afogados': 58,

  // Grand Cathay
  'the northern provinces': 70,
  'as províncias do norte': 70,
  'provincias do norte': 70,
  'the western provinces': 77,
  'as províncias ocidentais': 77,
  'the jade court': 84,
  'a corte de jade': 84,

  // Kislev
  'the ice court': 72,
  'a corte de gelo': 72,
  'the great orthodoxy': 79,
  'a grande ortodoxia': 79,
  'ursun revivalists': 86,
  'renascentistas de ursun': 86,
  'daughters of the forest': 91,
  'filhas da floresta': 91,

  // Chaos Gods
  'exiles of khorne': 71,
  'exilados de khorne': 71,
  'goldtooth': 74,
  'dente de ouro': 74,
  'disciples of the maw': 82,
  'discípulos da bocarra': 82,
  'oracles of tzeentch': 76,
  'oráculos de tzeentch': 76,
  'poxmakers of nurgle': 73,
  'varíolos de nurgle': 73,
  'sedai': 78,
  'disciples of hashut': 75,
  'warhost of the gorequeen': 90,
  'the fecundites': 85,
  'os fecunditas': 85,
  'puppets of misrule': 94,
  'the decadent host': 98,
  'tamurkhan\'s horde': 92,
  'horda de tamurkhan': 92,
  'epidemius': 99,
  'skulltaker\'s slaughter': 96,
  'arbaal the undefeated': 103,
  'golgfag maneater': 93,
  'dechala': 101,
  'sayl': 100,
  'the masque': 107,
  'sea lord aislinn': 104,
  'bhashiva': 102,
  'nagash': 110,
  'the glottkin': 105
};

export class SaveWatcher {
  private watchers: FSWatcher[] = [];
  private listeners: ((save: SaveMetadata) => void)[] = [];
  private watchedPaths: string[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.detectDefaultPaths();
  }

  private detectDefaultPaths() {
    const appData = process.env.APPDATA || '';
    if (!appData) return;

    const baseCa = path.join(appData, 'The Creative Assembly', 'Warhammer3');
    const steamSaveDir = path.join(baseCa, 'save_games');
    const eosSaveDir = path.join(baseCa, 'EOS', 'save_games');

    if (fs.existsSync(steamSaveDir)) this.watchedPaths.push(steamSaveDir);
    if (fs.existsSync(eosSaveDir)) this.watchedPaths.push(eosSaveDir);
    
    // Also add baseCa if it exists to catch dynamic save folder creation
    if (this.watchedPaths.length === 0 && fs.existsSync(baseCa)) {
      this.watchedPaths.push(baseCa);
    }
  }

  public setCustomPath(customPath: string) {
    if (customPath && fs.existsSync(customPath)) {
      if (!this.watchedPaths.includes(customPath)) {
        this.watchedPaths.push(customPath);
        this.restart();
      }
    }
  }

  public getWatchedPaths(): string[] {
    return this.watchedPaths;
  }

  public start() {
    if (this.watchers.length > 0) return;
    if (this.watchedPaths.length === 0) {
      console.warn('No valid save directories found to watch.');
      return;
    }

    for (const dir of this.watchedPaths) {
      try {
        if (!fs.existsSync(dir)) continue;
        const w = fs.watch(dir, { persistent: true }, (_eventType, filename) => {
          if (!filename) return;
          const fileNameStr = filename.toString();
          if (fileNameStr.endsWith('.save')) {
            const fullPath = path.join(dir, fileNameStr);
            this.debounceTrigger(fullPath);
          }
        });
        this.watchers.push(w);
      } catch (err) {
        console.error('Error starting fs.watch on', dir, err);
      }
    }
  }

  public stop() {
    for (const w of this.watchers) {
      try {
        w.close();
      } catch {}
    }
    this.watchers = [];
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  public restart() {
    this.stop();
    this.start();
  }

  private debounceTrigger(filePath: string) {
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath)!);
    }
    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      this.handleFileEvent(filePath);
    }, 600);
    this.debounceTimers.set(filePath, timer);
  }

  public onSaveDetected(callback: (save: SaveMetadata) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public parseSaveFile(filePath: string): SaveMetadata | null {
    if (!filePath.endsWith('.save')) return null;

    try {
      if (!fs.existsSync(filePath)) return null;
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      const metadata: SaveMetadata = {
        filePath,
        fileName,
        modifiedAt: stats.mtimeMs,
      };

      // 1. Trophy convention: e.g. 001_KarlFranz_Bronze_T48.save
      const trophyMatch = fileName.match(/^([0-9]{1,3})_([A-Za-z0-9_-]+)_(Bronze|Silver|Gold|Black)_T([0-9]+)\.save$/i);
      if (trophyMatch) {
        metadata.lordId = parseInt(trophyMatch[1], 10);
        const medalRaw = trophyMatch[3].toLowerCase();
        if (medalRaw === 'bronze') metadata.medalSuggestion = 'short';
        else if (medalRaw === 'silver') metadata.medalSuggestion = 'long';
        else if (medalRaw === 'gold') metadata.medalSuggestion = 'crisis';
        else if (medalRaw === 'black') metadata.medalSuggestion = 'black';
        metadata.turn = parseInt(trophyMatch[4], 10);
        metadata.saveType = 'manual';
        return metadata;
      }

      // 2. Total War WH3 standard naming:
      let rawName = fileName.replace(/\.save$/, '');
      if (rawName.includes('_Auto-save')) {
        metadata.saveType = 'auto';
      } else if (rawName.includes('_Quick Save') || rawName.includes('Quick Save')) {
        metadata.saveType = 'quick';
      } else {
        metadata.saveType = 'manual';
      }

      const dotIndex = rawName.lastIndexOf('.');
      if (dotIndex !== -1) {
        const prefix = rawName.slice(0, dotIndex);
        const suffix = rawName.slice(dotIndex + 1);

        const cleanFaction = prefix.replace(/(_Auto-save|_Quick Save)/i, '').trim();
        metadata.factionName = cleanFaction;

        const lowerFac = cleanFaction.toLowerCase();
        if (FACTION_NAME_TO_LORD_ID[lowerFac]) {
          metadata.lordId = FACTION_NAME_TO_LORD_ID[lowerFac];
        }

        // In WH3: suffix is <turn><campaignTimestamp(exact 10 digits)>
        if (/^\d{11,14}$/.test(suffix)) {
          const turnStr = suffix.slice(0, suffix.length - 10);
          const turnNum = parseInt(turnStr, 10);
          if (!isNaN(turnNum) && turnNum > 0 && turnNum < 5000) {
            metadata.turn = turnNum;
          }
        }
      }

      return metadata;
    } catch (e) {
      console.error('Error parsing save file:', filePath, e);
      return null;
    }
  }

  private handleFileEvent(filePath: string) {
    const meta = this.parseSaveFile(filePath);
    if (!meta) return;

    for (const listener of this.listeners) {
      try {
        listener(meta);
      } catch (err) {
        console.error('Error in save listener:', err);
      }
    }
  }

  public scanExistingSaves(customPath?: string): SaveMetadata[] {
    const targets = customPath ? [customPath] : this.watchedPaths;
    const results: SaveMetadata[] = [];

    for (const dir of targets) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith('.save')) {
            const meta = this.parseSaveFile(path.join(dir, file));
            if (meta) results.push(meta);
          }
        }
      } catch (e) {
        console.error('Error scanning dir:', dir, e);
      }
    }

    return results.sort((a, b) => b.modifiedAt - a.modifiedAt);
  }
}
