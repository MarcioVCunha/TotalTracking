import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dices,
  Play,
  Pause,
  Trophy,
  Skull,
  Clock,
  Calendar,
  Sparkles,
  ExternalLink,
  Check,
  Filter,
  Save,
  Pencil,
  Trash2,
  X,
  Hourglass,
  Swords,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LORDS_DATA } from '../data/lords';
import { FACTIONS_META } from '../data/factions';
import { WIKI_PORTRAITS, getLordPortrait } from '../data/portraits';
import { useApp, doesLordMatchMedalFilter } from '../context/AppContext';
import { GameDifficulty, Lord, RouletteMedalFilter } from '../types';
import { formatHMS, formatDurationHuman, calculateCalendarDays, toUtcDateKey } from '../lib/timeUtils';

const MEDAL_FILTER_OPTIONS: { value: RouletteMedalFilter; label: string; hint: string }[] = [
  { value: 'unplayed_victory', label: 'Sem Medalha (0/4)', hint: 'Lordes que ainda não têm nenhuma das 4 medalhas' },
  { value: 'missing_short', label: 'Falta 🥉 Curta', hint: 'Lordes sem Vitória Curta (Bronze)' },
  { value: 'missing_long', label: 'Falta 🥈 Longa', hint: 'Lordes sem Vitória Longa (Prata)' },
  { value: 'missing_crisis', label: 'Falta 🥇 Crise Final', hint: 'Lordes sem Crise Final / Dominação (Ouro)' },
  { value: 'missing_black', label: 'Falta 🖤 Borda Preta', hint: 'Lordes sem Borda Preta (100% Manual & Sem Reload)' },
  { value: 'missing_any', label: 'Incompletos (< 4/4)', hint: 'Qualquer lorde que ainda não tenha as 4 medalhas completas' },
  { value: 'all', label: 'Todos (Incluir 4/4)', hint: 'Inclui todos os lordes, mesmo os 100% completos' },
];

export const LordRoulette: React.FC = () => {
  const {
    lordsProgress,
    rouletteState,
    updateRouletteFilters,
    drawRandomLord,
    dismissRouletteBanner,
    runs,
    sessions,
    activeSession,
    togglePlaySession,
    toggleMedal,
    addRun,
    updateRun,
    finishCampaign,
    getCampaignAutoDetails,
    updateSession,
    deleteSession,
    lastDetectedSave,
  } = useApp();

  const [showFactionsPanel, setShowFactionsPanel] = useState<boolean>(true);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [rollingPreviewLord, setRollingPreviewLord] = useState<Lord | null>(null);
  const rollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // All unique factions in game order
  const allFactions = useMemo(() => {
    const set = new Set<string>();
    LORDS_DATA.forEach(l => set.add(l.faction));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, []);

  // Eligible lords pool based on current filters
  const eligibleLords = useMemo(() => {
    return LORDS_DATA.filter(l => {
      if (
        rouletteState.selectedFactions.length > 0 &&
        !rouletteState.selectedFactions.includes(l.faction)
      ) {
        return false;
      }
      return doesLordMatchMedalFilter(lordsProgress[l.id], rouletteState.medalFilter);
    });
  }, [rouletteState.selectedFactions, rouletteState.medalFilter, lordsProgress]);

  // Count per faction (respecting medalFilter)
  const factionCounts = useMemo(() => {
    const map: Record<string, { eligible: number; total: number }> = {};
    LORDS_DATA.forEach(l => {
      if (!map[l.faction]) map[l.faction] = { eligible: 0, total: 0 };
      map[l.faction].total++;
      if (doesLordMatchMedalFilter(lordsProgress[l.id], rouletteState.medalFilter)) {
        map[l.faction].eligible++;
      }
    });
    return map;
  }, [lordsProgress, rouletteState.medalFilter]);

  const toggleFactionFilter = (faction: string) => {
    const current = rouletteState.selectedFactions;
    const next = current.includes(faction)
      ? current.filter(f => f !== faction)
      : [...current, faction];
    updateRouletteFilters({ selectedFactions: next });
  };

  const selectAllFactions = () => {
    updateRouletteFilters({ selectedFactions: [] });
  };

  // Cleanup rolling animation on unmount
  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    };
  }, []);

  const handleDrawClick = () => {
    if (eligibleLords.length === 0 || isRolling) return;

    if (eligibleLords.length === 1) {
      drawRandomLord(false);
      return;
    }

    setIsRolling(true);
    let ticks = 0;
    const maxTicks = 8;

    rollIntervalRef.current = setInterval(() => {
      const rand = eligibleLords[Math.floor(Math.random() * eligibleLords.length)];
      setRollingPreviewLord(rand);
      ticks++;
      if (ticks >= maxTicks) {
        if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
        drawRandomLord(true);
        setRollingPreviewLord(null);
        setIsRolling(false);
      }
    }, 55);
  };

  const displayedLord: Lord | null = useMemo(() => {
    if (isRolling && rollingPreviewLord) return rollingPreviewLord;
    if (!rouletteState.currentLordId) return null;
    return LORDS_DATA.find(l => l.id === rouletteState.currentLordId) || null;
  }, [isRolling, rollingPreviewLord, rouletteState.currentLordId]);

  // ================= CURRENT RUN STATE FOR DRAWN LORD =================
  const activeRun = useMemo(() => {
    if (!displayedLord) return undefined;
    return runs.find(r => Number(r.lordId) === displayedLord.id && r.status === 'in_progress');
  }, [runs, displayedLord]);

  // Cutoff timestamp so we ONLY include sessions from the CURRENT run (never from past finished runs)
  const currentRunCutoffMs = useMemo(() => {
    if (!displayedLord) return 0;
    const finishedRuns = runs.filter(
      r => Number(r.lordId) === displayedLord.id && (r.status === 'victory' || r.status === 'defeat')
    );
    let latestEnd = 0;
    for (const r of finishedRuns) {
      const endMs = r.endDate ? new Date(r.endDate).getTime() : r.createdAt || 0;
      if (endMs > latestEnd) latestEnd = endMs;
    }
    if (activeRun) {
      const startMs = new Date(activeRun.startDate).getTime();
      return isNaN(startMs) ? latestEnd : Math.min(startMs, latestEnd || startMs);
    }
    return Math.max(latestEnd, (rouletteState.drawnAt || 0) - 5000);
  }, [displayedLord, runs, activeRun, rouletteState.drawnAt]);

  const currentRunSessions = useMemo(() => {
    if (!displayedLord) return [];
    return sessions.filter(s => {
      if (Number(s.lordId) !== displayedLord.id) return false;
      if (activeRun && s.runId === activeRun.id) return true;
      return s.startedAt >= currentRunCutoffMs;
    });
  }, [sessions, displayedLord, activeRun, currentRunCutoffMs]);

  const isPlayingThisLord = Boolean(
    displayedLord && activeSession && Number(activeSession.lordId) === displayedLord.id
  );

  // Isolated 1s timer only when activeSession is running for the drawn lord
  const [localActiveElapsed, setLocalActiveElapsed] = useState<number>(0);
  useEffect(() => {
    if (!isPlayingThisLord || !activeSession) {
      setLocalActiveElapsed(0);
      return;
    }
    const tick = () => {
      setLocalActiveElapsed(Math.max(0, Math.floor((Date.now() - activeSession.startedAt) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isPlayingThisLord, activeSession?.startedAt, activeSession?.lordId]);

  const currentRunSeconds = useMemo(() => {
    const sessSec = currentRunSessions.reduce((acc, s) => acc + (Number(s.durationSeconds) || 0), 0);
    const baseSec = activeRun?.totalSeconds ? Math.max(sessSec, activeRun.totalSeconds) : sessSec;
    return baseSec + localActiveElapsed;
  }, [currentRunSessions, activeRun, localActiveElapsed]);

  // Current Run Editable Form Fields
  const [difficulty, setDifficulty] = useState<GameDifficulty>('Very Hard');
  const [turn, setTurn] = useState<number>(1);
  const [days, setDays] = useState<number>(1);
  const [medalChoice, setMedalChoice] = useState<'short' | 'long' | 'crisis'>('short');
  const [isBlackBorderEligible, setIsBlackBorderEligible] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  // Portrait state with fallbacks
  const progress = displayedLord
    ? lordsProgress[displayedLord.id] || { short: false, long: false, crisis: false, black: false }
    : { short: false, long: false, crisis: false, black: false };

  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    if (!displayedLord) return;
    setImgSrc(getLordPortrait(displayedLord.id, progress.customImg));
  }, [displayedLord?.id, progress.customImg]);

  // Populate current run fields whenever the drawn lord changes
  useEffect(() => {
    if (!displayedLord || isRolling) return;
    let isMounted = true;

    const existingActive = runs.find(
      r => Number(r.lordId) === displayedLord.id && r.status === 'in_progress'
    );

    if (existingActive) {
      setDifficulty(existingActive.difficulty || 'Very Hard');
      setTurn(Math.max(1, existingActive.finalTurn || 1));
      const calcDays = existingActive.manualDays || calculateCalendarDays(existingActive.startDate, Date.now());
      setDays(Math.max(1, calcDays));
      setIsBlackBorderEligible(existingActive.isBlackBorderEligible ?? true);
      setNotes(existingActive.notes || '');
    } else {
      setDifficulty('Very Hard');
      setTurn(1);
      setDays(1);
      setIsBlackBorderEligible(true);
      setNotes('');

      getCampaignAutoDetails(displayedLord.id).then(details => {
        if (!isMounted) return;
        // Only apply save-detected turn if it comes from a live save or active session
        if (lastDetectedSave?.lordId === displayedLord.id && lastDetectedSave.turn) {
          setTurn(lastDetectedSave.turn);
        }
        if (details.suggestedMedal && details.suggestedMedal !== 'black') {
          setMedalChoice(details.suggestedMedal);
        }
      });
    }

    const p = lordsProgress[displayedLord.id];
    if (rouletteState.medalFilter === 'missing_long' && !p?.long) {
      setMedalChoice('long');
    } else if (rouletteState.medalFilter === 'missing_crisis' && !p?.crisis) {
      setMedalChoice('crisis');
    } else if (rouletteState.medalFilter === 'missing_short' && !p?.short) {
      setMedalChoice('short');
    } else if (!p?.short) {
      setMedalChoice('short');
    } else if (!p?.long) {
      setMedalChoice('long');
    } else {
      setMedalChoice('crisis');
    }

    return () => {
      isMounted = false;
    };
  }, [displayedLord?.id, rouletteState.drawnAt, rouletteState.medalFilter, isRolling]);

  // Auto-update turn if SaveWatcher detects a new save for this drawn lord
  useEffect(() => {
    if (
      displayedLord &&
      lastDetectedSave?.lordId === displayedLord.id &&
      lastDetectedSave.turn &&
      lastDetectedSave.turn > turn
    ) {
      setTurn(lastDetectedSave.turn);
    }
  }, [lastDetectedSave, displayedLord?.id]);

  // Inline session editing for current run sessions
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState<number>(0);
  const [editMinutes, setEditMinutes] = useState<number>(0);
  const [editSeconds, setEditSeconds] = useState<number>(0);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<string | null>(null);

  const startEditSession = (s: any) => {
    setEditingSessionId(s.id);
    const dur = Math.max(0, s.durationSeconds);
    setEditHours(Math.floor(dur / 3600));
    setEditMinutes(Math.floor((dur % 3600) / 60));
    setEditSeconds(dur % 60);
    setConfirmDeleteSessionId(null);
  };

  const saveEditSession = (sessionId: string) => {
    const totalSec = Math.max(0, editHours * 3600 + editMinutes * 60 + editSeconds);
    updateSession(sessionId, { durationSeconds: totalSec });
    setEditingSessionId(null);
  };

  // Save in-progress current run config without finishing it
  const handleSaveCurrentRunConfig = () => {
    if (!displayedLord) return;
    if (activeRun) {
      updateRun(activeRun.id, {
        difficulty,
        finalTurn: Math.max(1, turn),
        manualDays: Math.max(1, days),
        isBlackBorderEligible,
        notes: notes.trim(),
      });
    } else {
      addRun(displayedLord.id, {
        status: 'in_progress',
        difficulty,
        finalTurn: Math.max(1, turn),
        manualDays: Math.max(1, days),
        totalSeconds: currentRunSeconds,
        isBlackBorderEligible,
        notes: notes.trim(),
      });
    }
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1800);
  };

  // Finish campaign (Victory or Defeat) -> automatically draws next Lord via AppContext!
  const handleConcludeCampaign = (outcome: 'victory' | 'defeat') => {
    if (!displayedLord) return;
    finishCampaign(displayedLord.id, {
      status: outcome,
      difficulty,
      finalTurn: Math.max(1, turn),
      manualDays: Math.max(1, days),
      totalSeconds: currentRunSeconds,
      isBlackBorderEligible: outcome === 'victory' ? isBlackBorderEligible : false,
      medal: outcome === 'victory' ? medalChoice : undefined,
      notes: notes.trim(),
    });
  };

  // Border style for drawn lord showcase
  let borderClass = 'border-btd-default';
  if (progress.black) borderClass = 'border-btd-black';
  else if (progress.crisis) borderClass = 'border-btd-gold';
  else if (progress.long) borderClass = 'border-btd-silver';
  else if (progress.short) borderClass = 'border-btd-bronze';
  else if (isPlayingThisLord || activeRun) borderClass = 'border-btd-active';

  const factionMeta = displayedLord ? FACTIONS_META[displayedLord.faction] : undefined;
  const factionColor = factionMeta?.colorHex || '#c9a227';

  return (
    <div className="space-y-5">
      {/* Auto-Advance Notification Banner when a campaign was just won or lost */}
      {rouletteState.lastOutcomeBanner && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-semibold animate-in fade-in duration-200 ${
            rouletteState.lastOutcomeBanner.outcome === 'victory'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {rouletteState.lastOutcomeBanner.outcome === 'victory' ? (
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Skull className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>
              {rouletteState.lastOutcomeBanner.outcome === 'victory'
                ? `Vitória com ${rouletteState.lastOutcomeBanner.previousLordName} salva! Um novo Lorde já foi sorteado para sua próxima campanha.`
                : `Derrota com ${rouletteState.lastOutcomeBanner.previousLordName} registrada! Um novo Lorde já foi sorteado automaticamente.`}
            </span>
          </div>
          <button
            type="button"
            onClick={dismissRouletteBanner}
            className="p-1 text-neutral-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Roulette Filters & Roll Controls Card */}
      <div className="bg-[#0e0e12] rounded-2xl border border-[#262633] shadow-lg overflow-hidden">
        <div className="p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#262633] bg-[#111117]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <Dices className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-cinzel font-bold text-white">Sorteador de Campanha</h2>
              <p className="text-xs text-[#9494a8]">
                <strong className="text-white">{eligibleLords.length}</strong> lorde(s) elegíveis no filtro atual &middot;{' '}
                {rouletteState.selectedFactions.length === 0
                  ? 'Todas as facções'
                  : `${rouletteState.selectedFactions.length} facção(ões) selecionada(s)`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Expand/Collapse Faction Chips */}
            <button
              type="button"
              onClick={() => setShowFactionsPanel(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#181822] hover:bg-[#262633] text-[#f2f2f7] border border-[#262633] transition-colors cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-[#c9a227]" />
              <span>Facções</span>
              {showFactionsPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Big Roll Button */}
            <button
              type="button"
              disabled={eligibleLords.length === 0 || isRolling}
              onClick={handleDrawClick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#c9a227] to-amber-500 hover:from-[#d8b030] hover:to-amber-400 text-black shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              <Dices className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
              <span>{displayedLord ? 'Sortear Outro Lorde' : 'Sortear Lorde'}</span>
            </button>
          </div>
        </div>

        {/* Missing Medal Filter Bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-[#262633] bg-[#0c0c10] flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9494a8] mr-1">
            Medalha Faltando:
          </span>
          {MEDAL_FILTER_OPTIONS.map(opt => {
            const active = rouletteState.medalFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                title={opt.hint}
                onClick={() => updateRouletteFilters({ medalFilter: opt.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  active
                    ? 'bg-[#1b1b26] border-[#c9a227] text-white shadow-sm shadow-[#c9a227]/15'
                    : 'bg-[#13131a] border-[#262633] text-[#9494a8] hover:text-white hover:border-[#3b3b4f]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Multi-Select Factions Chips */}
        {showFactionsPanel && (
          <div className="p-4 sm:px-6 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-[#9494a8]">
              <span>
                Clique em uma ou mais facções para filtrar (ex: Skaven, Peles-Verdes e Império), ou mantenha{' '}
                <strong className="text-white">Todas as Facções</strong>:
              </span>
              {rouletteState.selectedFactions.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllFactions}
                  className="text-[#c9a227] hover:underline font-semibold cursor-pointer"
                >
                  Limpar filtro de facções
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Default: All Factions Pill */}
              <button
                type="button"
                onClick={selectAllFactions}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  rouletteState.selectedFactions.length === 0
                    ? 'bg-[#c9a227]/20 border-[#c9a227] text-white shadow-sm shadow-[#c9a227]/20'
                    : 'bg-[#13131a] border-[#262633] text-[#9494a8] hover:text-white hover:border-[#3b3b4f]'
                }`}
              >
                {rouletteState.selectedFactions.length === 0 && <Check className="w-3.5 h-3.5 text-[#c9a227]" />}
                <span>Todas as Facções</span>
              </button>

              {allFactions.map(faction => {
                const isSelected = rouletteState.selectedFactions.includes(faction);
                const meta = FACTIONS_META[faction];
                const color = meta?.colorHex || '#c9a227';
                const counts = factionCounts[faction] || { eligible: 0, total: 0 };
                const label = faction === 'Peles-Verdes' ? 'Peles-Verdes (Orcs)' : faction;

                return (
                  <button
                    key={faction}
                    type="button"
                    onClick={() => toggleFactionFilter(faction)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1b1b26] text-white border-[#c9a227] shadow-sm shadow-[#c9a227]/15'
                        : 'bg-[#13131a] border-[#262633] text-[#9494a8] hover:text-white hover:border-[#3b3b4f]'
                    } ${counts.eligible === 0 ? 'opacity-45' : ''}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span>{label}</span>
                    <span className="text-[10px] opacity-70 font-mono-numbers">({counts.eligible})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Empty State vs Drawn Lord Current Run Dossier */}
      {!displayedLord ? (
        <div className="bg-[#0e0e12] border border-[#262633] rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#181822] border border-[#262633] flex items-center justify-center">
            <Dices className="w-8 h-8 text-[#c9a227]" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-cinzel font-bold text-white">
              {eligibleLords.length === 0
                ? 'Nenhum Lorde disponível neste filtro'
                : 'Pronto para sortear sua próxima campanha'}
            </h3>
            <p className="text-xs text-[#9494a8]">
              {eligibleLords.length === 0
                ? 'Nenhum lorde das facções selecionadas se encaixa no filtro de medalha atual! Selecione outro filtro de medalha ou mais facções.'
                : 'Escolha o filtro de medalha faltando e as facções desejadas acima, depois clique em "Sortear Lorde". Sempre que vencer ou perder, o próximo será sorteado automaticamente!'}
            </p>
          </div>
          {eligibleLords.length > 0 && (
            <button
              type="button"
              onClick={handleDrawClick}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#c9a227] to-amber-500 hover:from-[#d8b030] hover:to-amber-400 text-black shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Dices className="w-5 h-5" />
              <span>Sortear Lorde Agora</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Drawn Lord Portrait Showcase */}
          <div
            className={`lg:col-span-4 rounded-2xl overflow-hidden bg-[#0e0e12] border-2 shadow-2xl flex flex-col transition-all ${borderClass}`}
          >
            <div className="relative h-80 sm:h-96 bg-[#181822] overflow-hidden flex items-center justify-center">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={displayedLord.name}
                  className={`w-full h-full object-cover object-top transition-all duration-300 ${
                    isRolling ? 'scale-105 blur-[1px]' : 'scale-100'
                  }`}
                  onError={() => {
                    const localFallback = `./portraits/${displayedLord.id}.webp`;
                    if (imgSrc !== localFallback) {
                      setImgSrc(localFallback);
                    } else {
                      const wikiFallback = WIKI_PORTRAITS[displayedLord.id];
                      if (wikiFallback && imgSrc !== wikiFallback) {
                        setImgSrc(wikiFallback);
                      }
                    }
                  }}
                />
              ) : (
                <Swords className="w-16 h-16 text-neutral-600" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e12] via-[#0e0e12]/20 to-black/30 pointer-events-none" />

              {/* Top Badges */}
              <div className="absolute top-3 left-3 bg-[#0c0c10]/95 border border-[#262633] px-2.5 py-1 rounded-lg text-xs font-extrabold tracking-wide text-[#c9a227]">
                #{String(displayedLord.id).padStart(3, '0')} &middot; Era {displayedLord.era} &middot; Onda{' '}
                {displayedLord.wave}
              </div>

              <a
                href={`https://totalwarwarhammer.fandom.com/wiki/${displayedLord.wiki}`}
                target="_blank"
                rel="noreferrer"
                className="absolute top-3 right-3 p-2 rounded-lg bg-[#0c0c10]/90 hover:bg-[#1b1b24] text-[#9494a8] hover:text-white border border-[#262633] transition-colors"
                title="Abrir página oficial na Wiki"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Bottom Overlay Identity */}
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                <div>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-md bg-black/75 border border-[#262633] mb-1.5"
                    style={{ color: factionColor }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: factionColor }} />
                    {displayedLord.faction}
                  </span>
                  <h2 className="text-2xl font-cinzel font-black text-white drop-shadow-md leading-tight">
                    {displayedLord.name}
                  </h2>
                </div>
              </div>
            </div>

            {/* Portrait Card Actions Footer */}
            <div className="p-4 space-y-3 bg-[#0e0e12]">
              {/* Medals Summary Pill */}
              <div className="flex items-center justify-between bg-[#13131a] px-3.5 py-2.5 rounded-xl border border-[#262633] text-xs">
                <span className="text-[#9494a8] font-semibold">Medalhas do Lorde:</span>
                <div className="flex items-center gap-1.5 text-sm">
                  {progress.short && <span title="Vitória Curta">🥉</span>}
                  {progress.long && <span title="Vitória Longa">🥈</span>}
                  {progress.crisis && <span title="Crise Final">🥇</span>}
                  {progress.black && <span title="Borda Preta">🖤</span>}
                  {!progress.short && !progress.long && !progress.crisis && !progress.black && (
                    <span className="text-xs text-[#9494a8]">Ainda não zerado</span>
                  )}
                </div>
              </div>

              {/* Start / Pause Play Session */}
              <button
                type="button"
                onClick={() => togglePlaySession(displayedLord.id)}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
                  isPlayingThisLord
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/50 animate-pulse'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/40'
                }`}
              >
                {isPlayingThisLord ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pausar Cronômetro da Run</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Iniciar / Retomar Sessão (Play)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: ONLY Current Run Info & Campaign Configs */}
          <div className="lg:col-span-8 bg-[#0e0e12] border border-[#262633] rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
            {/* Section Title */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262633] pb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Dossiê Exclusivo da Campanha Sorteada
                </div>
                <h3 className="text-lg font-cinzel font-bold text-white mt-0.5">
                  Informações da Run Atual
                </h3>
              </div>

              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  isPlayingThisLord || activeRun
                    ? 'bg-sky-950/50 text-sky-300 border-sky-700/60'
                    : 'bg-[#181822] text-[#9494a8] border-[#262633]'
                }`}
              >
                <Hourglass className={`w-3.5 h-3.5 ${isPlayingThisLord ? 'animate-spin text-sky-400' : ''}`} />
                <span>{isPlayingThisLord ? 'Jogando Agora' : activeRun ? 'Campanha em Andamento' : 'Nova Run Sorteada'}</span>
              </div>
            </div>

            {/* 4 Live KPIs of the Current Run ONLY */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#13131a] p-3.5 rounded-xl border border-[#262633]">
              <div>
                <div className="text-[10px] text-[#9494a8] uppercase font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  Tempo da Run Atual
                </div>
                <div className="text-lg font-black text-emerald-400 font-mono-numbers mt-0.5">
                  {formatHMS(currentRunSeconds)}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-[#9494a8] uppercase font-bold">Turno Atual</div>
                <div className="text-lg font-black text-sky-400 font-mono-numbers mt-0.5">
                  Turno {turn}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-[#9494a8] uppercase font-bold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  Dias na Run
                </div>
                <div className="text-lg font-black text-white font-mono-numbers mt-0.5">
                  {days} dia(s)
                </div>
              </div>

              <div>
                <div className="text-[10px] text-[#9494a8] uppercase font-bold">Sessões desta Run</div>
                <div className="text-lg font-black text-white font-mono-numbers mt-0.5">
                  {currentRunSessions.length}
                </div>
              </div>
            </div>

            {/* BTD6 Medals Toggles for this Lord */}
            <div>
              <h4 className="text-xs font-bold uppercase text-[#9494a8] tracking-wider mb-2 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-[#ffd700]" />
                Medalhas &amp; Borda do Lorde (Estilo BTD6)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <label
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    progress.short
                      ? 'bg-[#cd7f32]/10 border-[#cd7f32] text-white'
                      : 'bg-[#13131a] border-[#262633] text-[#9494a8] hover:border-neutral-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={progress.short}
                    onChange={() => toggleMedal(displayedLord.id, 'short')}
                    className="rounded accent-[#cd7f32]"
                  />
                  <span className="text-xs font-semibold">🥉 Vitória Curta</span>
                </label>

                <label
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    progress.long
                      ? 'bg-neutral-300/10 border-neutral-300 text-white'
                      : 'bg-[#13131a] border-[#262633] text-[#9494a8] hover:border-neutral-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={progress.long}
                    onChange={() => toggleMedal(displayedLord.id, 'long')}
                    className="rounded accent-neutral-300"
                  />
                  <span className="text-xs font-semibold">🥈 Vitória Longa</span>
                </label>

                <label
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    progress.crisis
                      ? 'bg-[#ffd700]/10 border-[#ffd700] text-white'
                      : 'bg-[#13131a] border-[#262633] text-[#9494a8] hover:border-neutral-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={progress.crisis}
                    onChange={() => toggleMedal(displayedLord.id, 'crisis')}
                    className="rounded accent-[#ffd700]"
                  />
                  <span className="text-xs font-semibold">🥇 Crise Final</span>
                </label>

                <label
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    progress.black
                      ? 'bg-purple-950/40 border-purple-500 text-white'
                      : 'bg-[#13131a] border-[#262633] text-[#9494a8] hover:border-neutral-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={progress.black}
                    onChange={() => toggleMedal(displayedLord.id, 'black')}
                    className="rounded accent-purple-500"
                  />
                  <span className="text-xs font-semibold">🖤 Borda Preta</span>
                </label>
              </div>
            </div>

            {/* Current Campaign Configuration & Completion Panel */}
            <div className="bg-[#13131a] p-4 rounded-xl border border-[#262633] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-[#9494a8] tracking-wider">
                  Configurações &amp; Desfecho da Run Atual
                </h4>
                <button
                  type="button"
                  onClick={handleSaveCurrentRunConfig}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold bg-[#1b1b24] hover:bg-[#262633] text-[#c9a227] border border-[#3b3b4f] transition-colors cursor-pointer"
                  title="Salvar dificuldade, turno e notas mantendo a campanha em andamento"
                >
                  {savedFeedback ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{savedFeedback ? 'Salvo!' : 'Salvar em Andamento'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-[#9494a8] block mb-1">Dificuldade</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as GameDifficulty)}
                    className="w-full bg-[#1b1b24] text-white px-3 py-2 rounded-lg border border-[#262633] text-xs focus:outline-none focus:border-[#c9a227]"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Hard">Difícil (Hard)</option>
                    <option value="Very Hard">Muito Difícil (Very Hard)</option>
                    <option value="Legendary">Lendário (Legendary)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#9494a8] block mb-1">Turno</label>
                  <input
                    type="number"
                    min="1"
                    value={turn}
                    onChange={e => setTurn(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-[#1b1b24] text-white px-3 py-2 rounded-lg border border-[#262633] text-xs font-mono-numbers focus:outline-none focus:border-[#c9a227]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#9494a8] block mb-1">Dias Corridos</label>
                  <input
                    type="number"
                    min="1"
                    value={days}
                    onChange={e => setDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-[#1b1b24] text-white px-3 py-2 rounded-lg border border-[#262633] text-xs font-mono-numbers focus:outline-none focus:border-[#c9a227]"
                  />
                </div>
              </div>

              {/* Medal on Victory + Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#9494a8] block mb-1">Medalha ao Vencer</label>
                  <select
                    value={medalChoice}
                    onChange={e => setMedalChoice(e.target.value as 'short' | 'long' | 'crisis')}
                    className="w-full bg-[#1b1b24] text-white px-3 py-2 rounded-lg border border-[#262633] text-xs focus:outline-none focus:border-[#c9a227]"
                  >
                    <option value="short">🥉 Vitória Curta (Bronze)</option>
                    <option value="long">🥈 Vitória Longa (Prata)</option>
                    <option value="crisis">🥇 Crise Final / Dominação (Ouro)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#9494a8] block mb-1">Anotações desta Run</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="ex: Campanha temática, alianças, etc."
                    className="w-full bg-[#1b1b24] text-white px-3 py-2 rounded-lg border border-[#262633] text-xs focus:outline-none focus:border-[#c9a227]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-purple-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isBlackBorderEligible}
                  onChange={e => setIsBlackBorderEligible(e.target.checked)}
                  className="rounded accent-purple-500 w-4 h-4"
                />
                <span>🖤 100% Batalhas Manuais &amp; Sem Reload nesta Run (Elegível Borda Preta)</span>
              </label>

              {/* Finish Buttons (Auto-draws next Lord!) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#262633]">
                <button
                  type="button"
                  onClick={() => handleConcludeCampaign('victory')}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#c9a227] to-amber-500 hover:from-[#d8b030] hover:to-amber-400 text-black shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Trophy className="w-4 h-4 fill-current" />
                  <span>Vitória &amp; Sortear Próximo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConcludeCampaign('defeat')}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-extrabold bg-rose-600/90 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Skull className="w-4 h-4" />
                  <span>Derrota &amp; Sortear Próximo</span>
                </button>
              </div>
            </div>

            {/* Sessions of ONLY this Current Run */}
            <div>
              <h4 className="text-xs font-bold uppercase text-[#9494a8] tracking-wider mb-2">
                Sessões desta Run Atual ({currentRunSessions.length})
              </h4>
              {currentRunSessions.length === 0 ? (
                <div className="text-xs text-[#9494a8] bg-[#13131a] p-3 rounded-xl border border-[#262633] text-center">
                  Nenhuma sessão finalizada nesta run ainda. Clique em Play ao iniciar o jogo!
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {currentRunSessions.map(s => {
                    const isEditing = editingSessionId === s.id;
                    const isConfirming = confirmDeleteSessionId === s.id;

                    if (isEditing) {
                      return (
                        <div
                          key={s.id}
                          className="bg-[#181822] p-3 rounded-lg border border-amber-500/50 space-y-2 text-xs font-mono-numbers"
                        >
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-[9px] text-[#9494a8] block">Horas</span>
                              <input
                                type="number"
                                min="0"
                                value={editHours}
                                onChange={e => setEditHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                className="w-full bg-[#13131a] text-center text-xs text-white py-1 rounded border border-[#262633]"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] text-[#9494a8] block">Minutos</span>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={editMinutes}
                                onChange={e =>
                                  setEditMinutes(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))
                                }
                                className="w-full bg-[#13131a] text-center text-xs text-white py-1 rounded border border-[#262633]"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] text-[#9494a8] block">Segundos</span>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={editSeconds}
                                onChange={e =>
                                  setEditSeconds(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))
                                }
                                className="w-full bg-[#13131a] text-center text-xs text-white py-1 rounded border border-[#262633]"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingSessionId(null)}
                              className="px-2 py-1 bg-[#13131a] text-[11px] text-[#9494a8] rounded"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEditSession(s.id)}
                              className="px-3 py-1 bg-amber-600 text-white text-[11px] font-bold rounded"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={s.id}
                        className="bg-[#13131a] px-3 py-2 rounded-lg border border-[#262633] flex items-center justify-between text-xs font-mono-numbers"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#9494a8]" />
                          <span>{toUtcDateKey(s.startedAt)}</span>
                          {s.turnReached && (
                            <span className="text-[10px] text-sky-400 font-bold">T{s.turnReached}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-emerald-400 font-bold">
                            {formatDurationHuman(s.durationSeconds)}
                          </span>
                          {isConfirming ? (
                            <div className="flex items-center gap-1 text-[10px]">
                              <button
                                type="button"
                                onClick={() => {
                                  deleteSession(s.id);
                                  setConfirmDeleteSessionId(null);
                                }}
                                className="px-1.5 py-0.5 bg-rose-600 text-white font-bold rounded"
                              >
                                Sim
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSessionId(null)}
                                className="px-1.5 py-0.5 bg-[#1b1b24] text-[#9494a8] rounded"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEditSession(s)}
                                className="p-1 text-[#9494a8] hover:text-amber-400"
                                title="Editar sessão"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSessionId(s.id)}
                                className="p-1 text-[#9494a8] hover:text-rose-400"
                                title="Excluir sessão"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
