import fs from 'fs';
import path from 'path';

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

export class ReplayInspector {
  private replayPaths: string[] = [];

  constructor() {
    this.detectPaths();
  }

  private detectPaths() {
    const appData = process.env.APPDATA || '';
    if (!appData) return;

    const baseCa = path.join(appData, 'The Creative Assembly', 'Warhammer3');
    const steamReplayDir = path.join(baseCa, 'replays');
    const eosReplayDir = path.join(baseCa, 'EOS', 'replays');

    if (fs.existsSync(steamReplayDir)) this.replayPaths.push(steamReplayDir);
    if (fs.existsSync(eosReplayDir)) this.replayPaths.push(eosReplayDir);
  }

  public getReplayPaths(): string[] {
    return this.replayPaths;
  }

  private parseReplay(filePath: string): Partial<ReplayItem> {
    try {
      const buf = fs.readFileSync(filePath);
      const text = buf.toString('latin1');

      // 1. Settlement extraction
      let settlement: string | undefined;
      const settMatch = text.match(/wh[0-9]?_main_combi_region_([a-zA-Z0-9_]+)/) || text.match(/settlement:wh[0-9]?_main_combi_region_([a-zA-Z0-9_]+)/);
      if (settMatch) {
        // Strip trailing digits and format
        settlement = settMatch[1].replace(/[0-9]+$/, '').replace(/_/g, ' ').trim();
        settlement = settlement.replace(/\b\w/g, l => l.toUpperCase());
      }

      // 2. Factions extraction
      const factions: string[] = [];
      const flagMatches = text.matchAll(/ui[\\\/]flags[\\\/]([a-zA-Z0-9_]+)/g);
      for (const m of flagMatches) {
        if (!factions.includes(m[1])) factions.push(m[1]);
      }

      let playerFaction = 'O Império';
      let enemyFaction = 'Facção Inimiga';
      let playerLord = 'General';

      if (factions.some(f => f.includes('separatist') || f.includes('empire'))) {
        playerFaction = 'O Império (Reikland)';
        playerLord = 'Karl Franz';
        enemyFaction = factions.some(f => f.includes('separatist')) ? 'Secessionistas do Império' : 'Inimigos do Império';
      } else if (factions.some(f => f.includes('northern_provinces') || f.includes('cathay'))) {
        playerFaction = 'Grande Catai (Províncias do Norte)';
        playerLord = 'Miao Ying';
        enemyFaction = 'Rebeldes de Catai / Invasores do Caos';
      } else if (factions.some(f => f.includes('lybaras') || f.includes('tomb_kings'))) {
        playerFaction = 'Corte de Lybaras';
        playerLord = 'Alta Rainha Khalida';
        enemyFaction = 'Rebeldes Vampiros';
      } else if (factions.some(f => f.includes('karaz_a_karak') || f.includes('dwarfs'))) {
        playerFaction = 'Reinos Anões';
        playerLord = 'Thorgrim Grudgebearer';
        enemyFaction = 'Peles-Verdes / Skaven';
      } else if (factions.some(f => f.includes('heralds_of_ariel') || f.includes('wood_elves'))) {
        playerFaction = 'Elfos Silvestres (Heralds of Ariel)';
        playerLord = 'Irmãs do Crepúsculo';
        enemyFaction = 'Invasores de Norsca';
      }

      // 3. Units extraction
      const unitCatalog: Record<string, string> = {
        'karl_franz': 'Karl Franz',
        'swordsmen': 'Espadachins do Império',
        'spearmen': 'Lanceiros',
        'crossbowmen': 'Besteiros',
        'handgunners': 'Arcabuzeiros',
        'halberdiers': 'Alabardeiros',
        'reiksguard': 'Cavaleiros Reiksguard',
        'mortar': 'Bateria de Morteiros',
        'greatswords': 'Grandes Espadachins',
        'hellstorm': 'Baterias Hellstorm',
        'steam_tank': 'Tanque a Vapor',
        'demigryph': 'Cavaleiros Semigrifos',
        'tomb_guard': 'Guarda da Tumba',
        'ushabti': 'Ushabti',
        'khalida': 'Rainha Khalida',
        'miao_ying': 'Miao Ying',
        'jade_warriors': 'Guerreiros de Jade',
        'celestial_dragon': 'Guarda Celeste do Dragão',
        'skeleton_warriors': 'Guerreiros Esqueleto',
        'fell_bats': 'Morcegos Vampíricos',
        'black_orcs': 'Orcs Pretos',
        'ironbreakers': 'Quebra-Ferros',
        'organ_gun': 'Canhões Órgão'
      };

      const detectedUnits: string[] = [];
      for (const [key, label] of Object.entries(unitCatalog)) {
        if (text.includes(key) && !detectedUnits.includes(label)) {
          detectedUnits.push(label);
        }
      }

      // 4. Battle type
      let battleType = 'Batalha em Campo Aberto';
      if (settlement) {
        battleType = `Batalha por Assentamento (${settlement})`;
      } else if (text.includes('qb_') || text.includes('quest_battle')) {
        battleType = 'Batalha de Missão Lendária (Quest Battle)';
      }

      return {
        settlement: settlement || undefined,
        playerFaction,
        enemyFaction,
        playerLord,
        detectedUnits,
        battleType,
      };
    } catch (e) {
      console.warn('Could not parse replay details:', filePath, e);
      return {};
    }
  }

  public scanReplays(customPath?: string): ReplayItem[] {
    const dirs = customPath ? [customPath] : this.replayPaths;
    const replays: ReplayItem[] = [];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith('.replay')) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            const parsed = this.parseReplay(fullPath);

            replays.push({
              fileName: file,
              filePath: fullPath,
              sizeBytes: stat.size,
              modifiedAt: new Date(stat.mtimeMs).toISOString(),
              ...parsed,
            });
          }
        }
      } catch (err) {
        console.error('Error scanning replays in', dir, err);
      }
    }

    return replays.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  }
}
