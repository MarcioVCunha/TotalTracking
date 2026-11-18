import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { LORDS_DATA } from '../data/lords';
import { LordCard } from './LordCard';
import { useApp } from '../context/AppContext';

interface LordsGridProps {
  onOpenModal: (lordId: number) => void;
}

export const LordsGrid: React.FC<LordsGridProps> = ({ onOpenModal }) => {
  const { lordsProgress, runs, activeSession, getLordTotalSeconds } = useApp();

  const [search, setSearch] = useState('');
  const [eraFilter, setEraFilter] = useState<string>('all');
  const [waveFilter, setWaveFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [factionFilter, setFactionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'chrono' | 'time' | 'name'>('chrono');

  // Unique factions list for filter dropdown
  const allFactions = useMemo(() => {
    const set = new Set<string>();
    LORDS_DATA.forEach(l => set.add(l.faction));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, []);

  const filteredLords = useMemo(() => {
    return LORDS_DATA.filter(lord => {
      // 1. Search text
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = lord.name.toLowerCase().includes(q);
        const matchesFaction = lord.faction.toLowerCase().includes(q);
        const matchesRace = lord.race?.toLowerCase().includes(q);
        if (!matchesName && !matchesFaction && !matchesRace) return false;
      }

      // 2. Era filter
      if (eraFilter !== 'all' && String(lord.era) !== eraFilter) {
        return false;
      }

      // 3. Wave filter
      if (waveFilter !== 'all' && String(lord.wave) !== waveFilter) {
        return false;
      }

      // 4. Faction filter
      if (factionFilter !== 'all' && lord.faction !== factionFilter) {
        return false;
      }

      // 5. Status filter
      const progress = lordsProgress[lord.id] || { short: false, long: false, crisis: false, black: false };
      const hasVictory = progress.short || progress.long || progress.crisis || progress.black;
      const isPlaying = activeSession && Number(activeSession.lordId) === Number(lord.id);
      const hasActiveRun = runs.some(r => Number(r.lordId) === Number(lord.id) && r.status === 'in_progress');

      if (statusFilter === 'pending') {
        if (hasVictory || isPlaying || hasActiveRun) return false;
      } else if (statusFilter === 'active') {
        if (!isPlaying && !hasActiveRun) return false;
      } else if (statusFilter === 'completed') {
        if (!hasVictory) return false;
      } else if (statusFilter === 'black') {
        if (!progress.black) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'time') {
        return getLordTotalSeconds(b.id) - getLordTotalSeconds(a.id);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return a.id - b.id; // chronological
    });
  }, [search, eraFilter, waveFilter, statusFilter, factionFilter, sortBy, lordsProgress, runs, activeSession, getLordTotalSeconds]);

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="bg-[#0e0e12] p-4 rounded-xl border border-[#262633] shadow-lg flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9494a8]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por Lorde, Facção ou Raça..."
            className="w-full bg-[#13131a] text-[#f2f2f7] pl-9 pr-3 py-2 rounded-lg border border-[#262633] text-xs focus:outline-none focus:border-[#c9a227] transition-colors"
          />
        </div>

        {/* Era Filter */}
        <div className="min-w-[150px]">
          <select
            value={eraFilter}
            onChange={e => setEraFilter(e.target.value)}
            className="w-full bg-[#13131a] text-[#f2f2f7] px-3 py-2 rounded-lg border border-[#262633] text-xs focus:outline-none focus:border-[#c9a227]"
          >
            <option value="all">Todas as Eras (1-3)</option>
            <option value="1">Era 1 — Warhammer I</option>
            <option value="2">Era 2 — Warhammer II</option>
            <option value="3">Era 3 — Warhammer III</option>
          </select>
        </div>

        {/* Wave Filter */}
        <div className="min-w-[130px]">
          <select
            value={waveFilter}
            onChange={e => setWaveFilter(e.target.value)}
            className="w-full bg-[#13131a] text-[#f2f2f7] px-3 py-2 rounded-lg border border-[#262633] text-xs focus:outline-none focus:border-[#c9a227]"
          >
            <option value="all">Todas as Ondas (1-6)</option>
            <option value="1">Onda 1</option>
            <option value="2">Onda 2</option>
            <option value="3">Onda 3</option>
            <option value="4">Onda 4</option>
            <option value="5">Onda 5</option>
            <option value="6">Onda 6</option>
          </select>
        </div>

        {/* Faction Filter */}
        <div className="min-w-[160px]">
          <select
            value={factionFilter}
            onChange={e => setFactionFilter(e.target.value)}
            className="w-full bg-[#13131a] text-[#f2f2f7] px-3 py-2 rounded-lg border border-[#262633] text-xs focus:outline-none focus:border-[#c9a227]"
          >
            <option value="all">Todas as Facções</option>
            {allFactions.map(f => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="min-w-[160px]">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-[#13131a] text-[#f2f2f7] px-3 py-2 rounded-lg border border-[#262633] text-xs focus:outline-none focus:border-[#c9a227]"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendentes</option>
            <option value="active">Em Campanha Ativa</option>
            <option value="completed">Com Vitória (Medalha)</option>
            <option value="black">Borda Preta 🖤</option>
          </select>
        </div>

        {/* Sort */}
        <div className="min-w-[150px]">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="w-full bg-[#13131a] text-[#f2f2f7] px-3 py-2 rounded-lg border border-[#262633] text-xs focus:outline-none focus:border-[#c9a227]"
          >
            <option value="chrono">Ordem Cronológica (#1-110)</option>
            <option value="time">Mais Horas Jogadas</option>
            <option value="name">Nome (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Results Header Counter */}
      <div className="flex items-center justify-between text-xs text-[#9494a8] px-1">
        <span>
          Mostrando <strong className="text-white">{filteredLords.length}</strong> de 110 Lordes Lendários
        </span>
        <span className="text-[11px] opacity-75">
          Ordem Intercalada Oficial &middot; Clique no lorde para editar medalhas e histórico
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5">
        {filteredLords.map(lord => (
          <LordCard key={lord.id} lord={lord} onOpenModal={onOpenModal} />
        ))}
      </div>
    </div>
  );
};
