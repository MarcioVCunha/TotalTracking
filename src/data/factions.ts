export interface FactionMeta {
  name: string;
  race: string;
  colorHex: string;
  saveAliases: string[];
}

export const FACTIONS_META: Record<string, FactionMeta> = {
  "Império": {
    name: "Império",
    race: "Império",
    colorHex: "#c9a227",
    saveAliases: ["Reikland", "The Golden Order", "The Huntmarshal's Expedition", "Elspeth", "Wissemburg", "Middenland", "Empire"]
  },
  "Anões": {
    name: "Anões",
    race: "Anões",
    colorHex: "#3b82f6",
    saveAliases: ["Karaz-a-Karak", "Karak Kadrin", "Clan Angrund", "Ironbrow's Expedition", "Malakai's Expedition", "Dwarfs"]
  },
  "Peles-Verdes": {
    name: "Peles-Verdes",
    race: "Peles-Verdes",
    colorHex: "#22c55e",
    saveAliases: ["Grimgor's 'Ardboyz", "Bonerattlaz", "The Bloody Handz", "Crooked Moon", "Broken Axe", "Gorbad's Waaagh", "Greenskins"]
  },
  "Condes Vampiros": {
    name: "Condes Vampiros",
    race: "Condes Vampiros",
    colorHex: "#a855f7",
    saveAliases: ["Sylvania", "The Barrow Legion", "Carstein", "Silver Pinnacle", "Vampire Counts"]
  },
  "Guerreiros do Caos": {
    name: "Guerreiros do Caos",
    race: "Caos",
    colorHex: "#ef4444",
    saveAliases: ["Warhost of the Apocalypse", "Shadows of Chaos", "Legion of the Gorequeen", "The Fecundites", "Puppets of Misrule", "The Decadent Host", "Warriors of Chaos"]
  },
  "Homens-Fera": {
    name: "Homens-Fera",
    race: "Homens-Fera",
    colorHex: "#b45309",
    saveAliases: ["Warherd of the One-Eye", "Harbingers of Disaster", "Warherd of the Shadowgave", "Slaughterhorn Tribe", "Beastmen"]
  },
  "Elfos Silvestres": {
    name: "Elfos Silvestres",
    race: "Elfos Silvestres",
    colorHex: "#10b981",
    saveAliases: ["Heralds of Ariel", "Talsyn", "Argwylon", "Wydrioth", "Wood Elves"]
  },
  "Bretonnia": {
    name: "Bretonnia",
    race: "Bretonnia",
    colorHex: "#60a5fa",
    saveAliases: ["Couronne", "Bordeleaux", "Carcassonne", "Chevaliers de Lyonesse", "Bretonnia"]
  },
  "Norsca": {
    name: "Norsca",
    race: "Norsca",
    colorHex: "#64748b",
    saveAliases: ["World Walkers", "Wintertooth", "Sayl", "Norsca"]
  },
  "Altos Elfos": {
    name: "Altos Elfos",
    race: "Altos Elfos",
    colorHex: "#38bdf8",
    saveAliases: ["Eataine", "Order of Loremasters", "Nagarythe", "Avelorn", "Knights of Caledor", "Yvresse", "High Elves"]
  },
  "Elfos Negros": {
    name: "Elfos Negros",
    race: "Elfos Negros",
    colorHex: "#9333ea",
    saveAliases: ["Naggarond", "Cult of Pleasure", "The Blessed Dread", "Har Ganeth", "Hag Graef", "The Thousand Maws", "Dark Elves"]
  },
  "Homens-Lagarto": {
    name: "Homens-Lagarto",
    race: "Homens-Lagarto",
    colorHex: "#14b8a6",
    saveAliases: ["Hexoatl", "Last Defenders", "Tlaqua", "Cult of Sotek", "Itza", "Spirit of the Jungle", "Ghosts of Pahuax", "Lizardmen"]
  },
  "Skaven": {
    name: "Skaven",
    race: "Skaven",
    colorHex: "#84cc16",
    saveAliases: ["Clan Mors", "Clan Pestilens", "Clan Rictus", "Clan Skryre", "Clan Eshin", "Clan Moulder", "Thanquol", "Skaven"]
  },
  "Reis das Tumbas": {
    name: "Reis das Tumbas",
    race: "Reis das Tumbas",
    colorHex: "#eab308",
    saveAliases: ["Khemri", "Followers of Nagash", "Court of Lybaras", "Exiles of Nehek", "Tomb Kings"]
  },
  "Costa dos Vampiros": {
    name: "Costa dos Vampiros",
    race: "Costa dos Vampiros",
    colorHex: "#06b6d4",
    saveAliases: ["The Awakened", "The Dreadfleet", "Pirates of Sartosa", "The Drowned", "Vampire Coast"]
  },
  "Grande Catai": {
    name: "Grande Catai",
    race: "Grande Catai",
    colorHex: "#f59e0b",
    saveAliases: ["The Northern Provinces", "The Western Provinces", "The Jade Court", "Bhashiva", "Cathay", "Grand Cathay"]
  },
  "Kislev": {
    name: "Kislev",
    race: "Kislev",
    colorHex: "#0284c7",
    saveAliases: ["The Ice Court", "The Great Orthodoxy", "Ursun Revivalists", "Daughters of the Forest", "Kislev"]
  },
  "Khorne": {
    name: "Khorne",
    race: "Caos",
    colorHex: "#dc2626",
    saveAliases: ["Exiles of Khorne", "Skulltaker's Slaughter", "Arbaal the Undefeated", "Khorne"]
  },
  "Nurgle": {
    name: "Nurgle",
    race: "Caos",
    colorHex: "#65a30d",
    saveAliases: ["Poxmakers of Nurgle", "Tamurkhan's Horde", "Epidemius", "The Glottkin", "Nurgle"]
  },
  "Slaanesh": {
    name: "Slaanesh",
    race: "Caos",
    colorHex: "#d946ef",
    saveAliases: ["Sedai", "The Masque of Slaanesh", "Tormentors of Slaanesh", "Slaanesh"]
  },
  "Tzeentch": {
    name: "Tzeentch",
    race: "Caos",
    colorHex: "#0ea5e9",
    saveAliases: ["Oracles of Tzeentch", "The Changeling", "Tzeentch"]
  },
  "Demônios do Caos": {
    name: "Demônios do Caos",
    race: "Caos",
    colorHex: "#7c3aed",
    saveAliases: ["Legion of Chaos", "Daemon Prince", "Daemons of Chaos"]
  },
  "Reinos Ogros": {
    name: "Reinos Ogros",
    race: "Reinos Ogros",
    colorHex: "#d97706",
    saveAliases: ["Goldtooth", "Disciples of the Maw", "Golgfag Maneater", "Ogre Kingdoms"]
  },
  "Anões do Caos": {
    name: "Anões do Caos",
    race: "Anões do Caos",
    colorHex: "#ea580c",
    saveAliases: ["Disciples of Hashut", "Warhost of Zharr", "Warhost of the Black Fortress", "Chaos Dwarfs"]
  },
  "Legiões Mortas-Vivas": {
    name: "Legiões Mortas-Vivas",
    race: "Mortos-Vivos",
    colorHex: "#8b5cf6",
    saveAliases: ["Nagash", "Legions of Nagash", "Undead"]
  }
};
