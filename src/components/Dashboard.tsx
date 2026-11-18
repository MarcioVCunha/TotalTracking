import React, { useMemo, useState } from 'react';
import {
  Clock,
  Calendar,
  Trophy,
  Zap,
  Shield,
  Skull,
  BarChart2,
  TrendingUp,
  Award,
  Layers,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LORDS_DATA } from '../data/lords';
import { formatHMS, formatDurationHuman, calculateUniqueDays, calculateMinutesPerTurn } from '../lib/timeUtils';
import { FACTIONS_META } from '../data/factions';
import { FactionStats } from '../types';

export const Dashboard: React.FC = () => {
  const { lordsProgress, runs, sessions, getLordTotalSeconds } = useApp();

  const [sortField, setSortField] = useState<keyof FactionStats>('totalSeconds');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // 1. KPI Computations
  const totalSecondsAll = useMemo(() => {
    return sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  }, [sessions]);

  const uniqueDays = useMemo(() => {
    return calculateUniqueDays(sessions);
  }, [sessions]);

  const { completedCount, blackCount, victories, defeats, avgHoursPerVictory, avgMinutesPerTurn } =
    useMemo(() => {
      let completed = 0;
      let black = 0;
      let v = 0;
      let d = 0;
      let victorySecondsTotal = 0;
      let totalTurnsCount = 0;
      let totalTurnsSeconds = 0;

      LORDS_DATA.forEach(lord => {
        const p = lordsProgress[lord.id];
        if (p && (p.short || p.long || p.crisis || p.black)) completed++;
        if (p?.black) black++;
      });

      runs.forEach(r => {
        if (r.status === 'victory') {
          v++;
          victorySecondsTotal += r.totalSeconds || 0;
        } else if (r.status === 'defeat') {
          d++;
        }
        if (r.finalTurn && r.finalTurn > 0) {
          totalTurnsCount += r.finalTurn;
          totalTurnsSeconds += r.totalSeconds || 0;
        }
      });

      const avgHoursVic = v > 0 ? (victorySecondsTotal / 3600 / v).toFixed(1) : '0.0';
      const avgMinTurn = totalTurnsCount > 0 ? ((totalTurnsSeconds / 60) / totalTurnsCount).toFixed(1) : '0.0';

      return {
        completedCount: completed,
        blackCount: black,
        victories: v,
        defeats: d,
        avgHoursPerVictory: avgHoursVic,
        avgMinutesPerTurn: avgMinTurn,
      };
    }, [lordsProgress, runs]);

  // 2. Hall of Fame Computations
  const hallOfFame = useMemo(() => {
    // A. Fastest Victory (lowest turn among victories)
    const victoryRuns = runs.filter(r => r.status === 'victory' && r.finalTurn > 0);
    const fastestTurnRun = [...victoryRuns].sort((a, b) => a.finalTurn - b.finalTurn)[0];
    const fastestLord = fastestTurnRun ? LORDS_DATA.find(l => l.id === fastestTurnRun.lordId) : null;

    // B. Longest Campaign (highest turn)
    const longestRun = [...runs].sort((a, b) => b.finalTurn - a.finalTurn)[0];
    const longestLord = longestRun ? LORDS_DATA.find(l => l.id === longestRun.lordId) : null;

    // C. Nemesis (Lord with most defeats)
    const defeatsMap: Record<number, number> = {};
    runs.filter(r => r.status === 'defeat').forEach(r => {
      defeatsMap[r.lordId] = (defeatsMap[r.lordId] || 0) + 1;
    });
    const nemesisEntry = Object.entries(defeatsMap).sort((a, b) => b[1] - a[1])[0];
    const nemesisLord = nemesisEntry ? LORDS_DATA.find(l => l.id === parseInt(nemesisEntry[0], 10)) : null;

    // D. Blitz Master (Lowest min/turn)
    const validTurnRuns = runs.filter(r => r.finalTurn > 10 && r.totalSeconds > 60);
    const blitzRun = [...validTurnRuns].sort((a, b) => {
      const minTurnA = (a.totalSeconds / 60) / a.finalTurn;
      const minTurnB = (b.totalSeconds / 60) / b.finalTurn;
      return minTurnA - minTurnB;
    })[0];
    const blitzLord = blitzRun ? LORDS_DATA.find(l => l.id === blitzRun.lordId) : null;

    return {
      fastestLord,
      fastestTurnRun,
      longestLord,
      longestRun,
      nemesisLord,
      nemesisDefeats: nemesisEntry ? nemesisEntry[1] : 0,
      blitzLord,
      blitzRun,
    };
  }, [runs]);

  // 3. Era & Wave Breakdown
  const eraStats = useMemo(() => {
    const eras = [
      { era: 1, name: 'Era 1 (Warhammer I)', total: 29, completed: 0, seconds: 0 },
      { era: 2, name: 'Era 2 (Warhammer II)', total: 40, completed: 0, seconds: 0 },
      { era: 3, name: 'Era 3 (Warhammer III)', total: 41, completed: 0, seconds: 0 },
    ];

    LORDS_DATA.forEach(l => {
      const p = lordsProgress[l.id];
      const done = p && (p.short || p.long || p.crisis || p.black);
      const target = eras.find(e => e.era === l.era);
      if (target) {
        if (done) target.completed++;
        target.seconds += getLordTotalSeconds(l.id);
      }
    });

    return eras;
  }, [lordsProgress, getLordTotalSeconds]);

  // 4. Factions Table Data
  const factionList = useMemo(() => {
    const map: Record<string, FactionStats> = {};

    LORDS_DATA.forEach(lord => {
      if (!map[lord.faction]) {
        map[lord.faction] = {
          faction: lord.faction,
          race: lord.race || lord.faction,
          totalLords: 0,
          completedLords: 0,
          totalSeconds: 0,
          victories: 0,
          defeats: 0,
          blackBorders: 0,
        };
      }

      const st = map[lord.faction];
      st.totalLords++;

      const p = lordsProgress[lord.id];
      if (p && (p.short || p.long || p.crisis || p.black)) st.completedLords++;
      if (p?.black) st.blackBorders++;
      st.totalSeconds += getLordTotalSeconds(lord.id);
    });

    runs.forEach(r => {
      const lord = LORDS_DATA.find(l => l.id === r.lordId);
      if (lord && map[lord.faction]) {
        if (r.status === 'victory') map[lord.faction].victories++;
        if (r.status === 'defeat') map[lord.faction].defeats++;
      }
    });

    const arr = Object.values(map);
    return arr.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [lordsProgress, runs, getLordTotalSeconds, sortField, sortAsc]);

  const handleSort = (field: keyof FactionStats) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const winRatePercent = victories + defeats > 0 ? Math.round((victories / (victories + defeats)) * 100) : 0;
  const marathonPercent = ((completedCount / 110) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Global KPIs (Ludohall Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="bg-[#0e0e12] p-4 rounded-xl border border-[#262633] shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9494a8]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tempo Total</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono-numbers mt-2">
            {formatHMS(totalSecondsAll)}
          </div>
          <div className="text-[11px] text-[#9494a8] mt-1">{sessions.length} sessões gravadas</div>
        </div>

        <div className="bg-[#0e0e12] p-4 rounded-xl border border-[#262633] shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9494a8]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dias Jogados</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono-numbers mt-2">{uniqueDays}</div>
          <div className="text-[11px] text-[#9494a8] mt-1">Dias únicos ativos (UTC)</div>
        </div>

        <div className="bg-[#0e0e12] p-4 rounded-xl border border-[#262633] shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9494a8]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Maratona 110</span>
            <Trophy className="w-4 h-4 text-[#ffd700]" />
          </div>
          <div className="text-2xl font-black text-[#ffd700] mt-2">
            {completedCount} <span className="text-sm text-[#9494a8]">/ 110</span>
          </div>
          <div className="w-full bg-[#1b1b24] h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-[#ffd700] h-full transition-all duration-500"
              style={{ width: `${marathonPercent}%` }}
            />
          </div>
          <div className="text-[10px] text-[#9494a8] mt-1">{marathonPercent}% concluído</div>
        </div>

        <div className="bg-[#0e0e12] p-4 rounded-xl border border-[#262633] shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9494a8]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Win Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {victories}V <span className="text-base text-neutral-500">-</span> {defeats}D
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-semibold">{winRatePercent}% de vitórias</div>
        </div>

        <div className="bg-[#0e0e12] p-4 rounded-xl border border-[#262633] shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9494a8]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Média / Vitória</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono-numbers mt-2">
            {avgHoursPerVictory}h
          </div>
          <div className="text-[11px] text-[#9494a8] mt-1">Horas reais por vitória</div>
        </div>

        <div className="bg-[#0e0e12] p-4 rounded-xl border border-[#262633] shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9494a8]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bordas Pretas</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400 mt-2">{blackCount}</div>
          <div className="text-[11px] text-[#9494a8] mt-1">100% Manuais conquistadas</div>
        </div>
      </div>

      {/* Hall of Fame (Ludohall Spotlight Cards) */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#9494a8] mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#ffd700]" />
          Hall da Fama das Campanhas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Fastest Victory */}
          <div className="bg-[#0e0e12] p-4 rounded-xl border border-[#262633] shadow-md relative overflow-hidden">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wide">
              <Zap className="w-4 h-4 fill-current" />
              Vitória Mais Rápida
            </div>
            {hallOfFame.fastestLord ? (
              <div className="mt-3">
                <div className="text-base font-bold text-white line-clamp-1">
                  #{hallOfFame.fastestLord.id} {hallOfFame.fastestLord.name}
                </div>
                <div className="text-xs text-[#9494a8] mt-0.5">{hallOfFame.fastestLord.faction}</div>
                <div className="text-sm font-bold text-emerald-400 mt-2">
                  Turno {hallOfFame.fastestTurnRun?.finalTurn} &middot;{' '}
                  {formatDurationHuman(hallOfFame.fastestTurnRun?.totalSeconds || 0)}
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#9494a8] mt-3">Nenhuma vitória registrada ainda.</div>
            )}
          </div>

          {/* Longest Campaign */}
          <div className="bg-[#0e0e12] p-4 rounded-xl border border-[#262633] shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wide">
              <Shield className="w-4 h-4" />
              Campanha Mais Longa
            </div>
            {hallOfFame.longestLord ? (
              <div className="mt-3">
                <div className="text-base font-bold text-white line-clamp-1">
                  #{hallOfFame.longestLord.id} {hallOfFame.longestLord.name}
                </div>
                <div className="text-xs text-[#9494a8] mt-0.5">{hallOfFame.longestLord.faction}</div>
                <div className="text-sm font-bold text-sky-400 mt-2">
                  Turno {hallOfFame.longestRun?.finalTurn} &middot;{' '}
                  {formatDurationHuman(hallOfFame.longestRun?.totalSeconds || 0)}
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#9494a8] mt-3">Nenhuma campanha registrada.</div>
            )}
          </div>

          {/* Nemesis */}
          <div className="bg-[#0e0e12] p-4 rounded-xl border border-[#262633] shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wide">
              <Skull className="w-4 h-4" />
              Nêmesis (Mais Falhas)
            </div>
            {hallOfFame.nemesisLord ? (
              <div className="mt-3">
                <div className="text-base font-bold text-white line-clamp-1">
                  #{hallOfFame.nemesisLord.id} {hallOfFame.nemesisLord.name}
                </div>
                <div className="text-xs text-[#9494a8] mt-0.5">{hallOfFame.nemesisLord.faction}</div>
                <div className="text-sm font-bold text-rose-400 mt-2">
                  {hallOfFame.nemesisDefeats} derrotas / reinícios
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#9494a8] mt-3">Nenhuma derrota registrada. Perfeito!</div>
            )}
          </div>

          {/* Blitz Master */}
          <div className="bg-[#0e0e12] p-4 rounded-xl border border-[#262633] shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wide">
              <Zap className="w-4 h-4" />
              Mestre da Velocidade
            </div>
            {hallOfFame.blitzLord && hallOfFame.blitzRun ? (
              <div className="mt-3">
                <div className="text-base font-bold text-white line-clamp-1">
                  #{hallOfFame.blitzLord.id} {hallOfFame.blitzLord.name}
                </div>
                <div className="text-xs text-[#9494a8] mt-0.5">{hallOfFame.blitzLord.faction}</div>
                <div className="text-sm font-bold text-purple-400 mt-2">
                  {calculateMinutesPerTurn(hallOfFame.blitzRun.totalSeconds, hallOfFame.blitzRun.finalTurn)} min / turno
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#9494a8] mt-3">Aguardando mais dados de turnos.</div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Breakdown by Eras */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#9494a8] mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          Progresso por Era de Lançamento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {eraStats.map(era => {
            const pct = Math.round((era.completed / era.total) * 100);
            return (
              <div key={era.era} className="bg-[#0e0e12] p-4 rounded-xl border border-[#262633] shadow-md">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-white">{era.name}</div>
                  <div className="text-xs font-bold text-[#c9a227]">
                    {era.completed} / {era.total}
                  </div>
                </div>
                <div className="w-full bg-[#1b1b24] h-2 rounded-full overflow-hidden mt-3">
                  <div className="bg-[#c9a227] h-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-[#9494a8] mt-2 font-mono-numbers">
                  <span>{pct}% concluído</span>
                  <span>⏱️ {formatDurationHuman(era.seconds)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Factions Performance Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#9494a8] flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#c9a227]" />
            Desempenho Detalhado por Facção / Raça
          </h3>
          <span className="text-xs text-[#9494a8]">Clique nas colunas para ordenar</span>
        </div>

        <div className="bg-[#0e0e12] rounded-xl border border-[#262633] overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#13131a] text-[#9494a8] uppercase text-[10px] font-bold tracking-wider border-b border-[#262633]">
                <tr>
                  <th
                    onClick={() => handleSort('faction')}
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Facção
                      {sortField === 'faction' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('completedLords')}
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Lordes Concluídos
                      {sortField === 'completedLords' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('totalSeconds')}
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Tempo Total
                      {sortField === 'totalSeconds' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('victories')}
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Vitórias / Falhas
                      {sortField === 'victories' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('blackBorders')}
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Bordas Pretas
                      {sortField === 'blackBorders' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1b24]">
                {factionList.map(item => {
                  const meta = FACTIONS_META[item.faction];
                  const color = meta?.colorHex || '#c9a227';
                  return (
                    <tr key={item.faction} className="hover:bg-[#13131a]/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        {item.faction}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {item.completedLords} / {item.totalLords}
                      </td>
                      <td className="py-3 px-4 font-mono-numbers text-emerald-400 font-semibold">
                        {formatHMS(item.totalSeconds)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-300">
                        <span className="text-emerald-400">{item.victories}V</span> /{' '}
                        <span className="text-rose-400">{item.defeats}D</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-purple-400">
                        {item.blackBorders > 0 ? `${item.blackBorders} 🖤` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
