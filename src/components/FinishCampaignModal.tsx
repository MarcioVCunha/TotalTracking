import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Sparkles,
  CheckCircle2,
  Skull,
  Clock,
  Calendar,
  Shield,
  Swords,
  Award,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Lord, RunStatus, GameDifficulty } from '../types';
import { useApp } from '../context/AppContext';
import { formatHMS, formatDurationHuman } from '../lib/timeUtils';
import { FACTIONS_META } from '../data/factions';
import { DEFAULT_PORTRAITS, WIKI_PORTRAITS, getLordPortrait } from '../data/portraits';

interface FinishCampaignModalProps {
  lord: Lord;
  onClose: () => void;
}

export const FinishCampaignModal: React.FC<FinishCampaignModalProps> = ({ lord, onClose }) => {
  const {
    lordsProgress,
    portraitsCache,
    getCampaignAutoDetails,
    finishCampaign,
    activeSeconds,
  } = useApp();

  const progress = lordsProgress[lord.id] || { short: false, long: false, crisis: false, black: false };
  const factionMeta = FACTIONS_META[lord.faction];
  const primaryPortrait = getLordPortrait(lord.id, progress.customImg);
  const [imgSrc, setImgSrc] = useState<string>(primaryPortrait);
  const [loading, setLoading] = useState(true);

  // Form State
  const [status, setStatus] = useState<RunStatus>('victory');
  const [turn, setTurn] = useState<number>(1);
  const [days, setDays] = useState<number>(1);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('Very Hard');
  const [medal, setMedal] = useState<'short' | 'long' | 'crisis'>('short');
  const [isBlackBorderEligible, setIsBlackBorderEligible] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [startDateStr, setStartDateStr] = useState<string>('');
  const [turnSource, setTurnSource] = useState<string>('Detectando...');

  useEffect(() => {
    let isMounted = true;

    getCampaignAutoDetails(lord.id).then(details => {
      if (!isMounted) return;
      setTurn(details.turn);
      setDays(details.days);
      setTotalSeconds(details.totalSeconds);
      setDifficulty(details.difficulty);
      setIsBlackBorderEligible(details.isBlackBorderEligible);

      if (details.startDate) {
        try {
          const d = new Date(details.startDate);
          setStartDateStr(d.toLocaleDateString('pt-BR'));
        } catch {}
      }

      if (details.turn > 1) {
        setTurnSource('Detectado automaticamente via Save Game');
      } else {
        setTurnSource('Estimado do progresso');
      }

      if (details.suggestedMedal && details.suggestedMedal !== 'black') {
        setMedal(details.suggestedMedal);
      } else if (!progress.short) {
        setMedal('short');
      } else if (!progress.long) {
        setMedal('long');
      } else {
        setMedal('crisis');
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [lord.id, getCampaignAutoDetails, progress.short, progress.long]);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    finishCampaign(lord.id, {
      status,
      difficulty,
      finalTurn: Math.max(1, turn),
      manualDays: Math.max(1, days),
      totalSeconds: Math.max(0, totalSeconds),
      isBlackBorderEligible,
      medal: status === 'victory' ? medal : undefined,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0e0e12] border border-[#c9a227]/60 rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl shadow-black/90 flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="sticky top-0 bg-[#0e0e12]/95 backdrop-blur-md border-b border-[#262633] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#181822] border border-[#c9a227]/40 shrink-0 shadow-md">
              <img
                src={imgSrc}
                alt={lord.name}
                className="w-full h-full object-cover object-top"
                onError={() => {
                  const localFallback = `./portraits/${lord.id}.webp`;
                  if (imgSrc !== localFallback) {
                    setImgSrc(localFallback);
                  } else {
                    const wikiFallback = WIKI_PORTRAITS[lord.id];
                    if (wikiFallback && imgSrc !== wikiFallback) {
                      setImgSrc(wikiFallback);
                    }
                  }
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  Finalizar Campanha
                </span>
                <span className="text-xs text-[#9494a8]">#{String(lord.id).padStart(3, '0')}</span>
              </div>
              <h2 className="text-base font-cinzel font-bold text-white flex items-center gap-2 mt-0.5">
                {lord.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#9494a8] hover:text-white rounded-lg hover:bg-[#1b1b24] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          {/* Quick Auto-Detected Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Auto Turn */}
            <div className="bg-[#13131a] p-3 rounded-xl border border-[#262633] relative overflow-hidden">
              <div className="text-[10px] font-bold text-[#9494a8] uppercase flex items-center justify-between">
                <span>Turno Final</span>
                <Sparkles className="w-3 h-3 text-sky-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <input
                  type="number"
                  min="1"
                  value={turn}
                  onChange={e => setTurn(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-20 bg-[#1b1b24] text-white font-mono-numbers font-black text-xl px-2 py-0.5 rounded border border-[#3b3b4f] focus:border-sky-400 focus:outline-none"
                />
                <span className="text-[11px] text-[#9494a8]">turnos</span>
              </div>
              <div className="text-[9px] text-sky-400/90 mt-1 truncate" title={turnSource}>
                {turnSource}
              </div>
            </div>

            {/* Auto Days */}
            <div className="bg-[#13131a] p-3 rounded-xl border border-[#262633]">
              <div className="text-[10px] font-bold text-[#9494a8] uppercase flex items-center justify-between">
                <span>Dias Corridos</span>
                <Calendar className="w-3 h-3 text-amber-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <input
                  type="number"
                  min="1"
                  value={days}
                  onChange={e => setDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-16 bg-[#1b1b24] text-white font-mono-numbers font-black text-xl px-2 py-0.5 rounded border border-[#3b3b4f] focus:border-amber-400 focus:outline-none"
                />
                <span className="text-[11px] text-[#9494a8]">dia(s)</span>
              </div>
              <div className="text-[9px] text-[#9494a8] mt-1 truncate">
                {startDateStr ? `Desde ${startDateStr}` : 'Calculado de hoje'}
              </div>
            </div>

            {/* Auto Total Time */}
            <div className="bg-[#13131a] p-3 rounded-xl border border-[#262633]">
              <div className="text-[10px] font-bold text-[#9494a8] uppercase flex items-center justify-between">
                <span>Tempo da Run</span>
                <Clock className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="text-xl font-mono-numbers font-black text-emerald-400 mt-1">
                {formatDurationHuman(totalSeconds || activeSeconds)}
              </div>
              <div className="text-[9px] text-emerald-400/80 mt-1">
                Sessões + timer ativo somados
              </div>
            </div>
          </div>

          {/* Outcome Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#9494a8] block mb-2">
              Resultado da Campanha
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('victory')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${
                  status === 'victory'
                    ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-[#13131a] border-[#262633] text-[#9494a8] hover:border-neutral-700'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${status === 'victory' ? 'text-emerald-400' : ''}`} />
                Vitória Conquistada
              </button>

              <button
                type="button"
                onClick={() => setStatus('defeat')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${
                  status === 'defeat'
                    ? 'bg-rose-950/50 border-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-[#13131a] border-[#262633] text-[#9494a8] hover:border-neutral-700'
                }`}
              >
                <Skull className={`w-4 h-4 ${status === 'defeat' ? 'text-rose-400' : ''}`} />
                Derrota / Reinício
              </button>
            </div>
          </div>

          {/* Victory Specifics */}
          {status === 'victory' && (
            <div className="space-y-4 bg-[#13131a]/80 p-4 rounded-xl border border-[#262633]">
              {/* Medal Choice (BTD6 Style) */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#9494a8] block mb-2">
                  Medalha a Conquistar (Estilo BTD6)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMedal('short')}
                    className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all ${
                      medal === 'short'
                        ? 'bg-[#cd7f32]/20 border-[#cd7f32] text-white shadow-sm'
                        : 'bg-[#181822] border-[#262633] text-[#9494a8] hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-[13px]">🥉 Vitória Curta</div>
                    <div className="text-[10px] text-[#9494a8] font-normal mt-0.5">Objetivo inicial</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMedal('long')}
                    className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all ${
                      medal === 'long'
                        ? 'bg-neutral-300/20 border-neutral-300 text-white shadow-sm'
                        : 'bg-[#181822] border-[#262633] text-[#9494a8] hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-[13px]">🥈 Vitória Longa</div>
                    <div className="text-[10px] text-[#9494a8] font-normal mt-0.5">Dominação do mapa</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMedal('crisis')}
                    className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all ${
                      medal === 'crisis'
                        ? 'bg-[#ffd700]/20 border-[#ffd700] text-white shadow-sm'
                        : 'bg-[#181822] border-[#262633] text-[#9494a8] hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-[13px]">🥇 Crise Final</div>
                    <div className="text-[10px] text-[#9494a8] font-normal mt-0.5">Fim dos tempos</div>
                  </button>
                </div>
              </div>

              {/* Black Border Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-lg bg-purple-950/20 border border-purple-900/50 cursor-pointer text-xs font-semibold text-purple-200 hover:border-purple-600 transition-colors">
                <input
                  type="checkbox"
                  checked={isBlackBorderEligible}
                  onChange={e => setIsBlackBorderEligible(e.target.checked)}
                  className="rounded accent-purple-500 w-4 h-4"
                />
                <span className="flex-1">
                  🖤 Conquista Borda Preta (100% Batalhas Manuais & Sem Reloads)
                </span>
              </label>
            </div>
          )}

          {/* Difficulty Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#9494a8] block mb-1.5">
                Dificuldade da Campanha
              </label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as GameDifficulty)}
                className="w-full bg-[#1b1b24] text-white text-xs px-3 py-2 rounded-lg border border-[#262633] focus:border-[#c9a227] focus:outline-none"
              >
                <option value="Normal">Normal</option>
                <option value="Hard">Difícil (Hard)</option>
                <option value="Very Hard">Muito Difícil (Very Hard)</option>
                <option value="Legendary">Lendário (Legendary)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#9494a8] block mb-1.5">
                Anotações (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="ex: Campanha sem cavalaria"
                className="w-full bg-[#1b1b24] text-white text-xs px-3 py-2 rounded-lg border border-[#262633] focus:border-[#c9a227] focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262633]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#1b1b24] hover:bg-[#262633] text-xs font-bold text-[#9494a8] hover:text-white transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
                status === 'victory'
                  ? 'bg-gradient-to-r from-[#c9a227] to-amber-500 hover:from-[#d8b030] hover:to-amber-400 text-black shadow-amber-500/20'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              }`}
            >
              {status === 'victory' ? (
                <>
                  <Trophy className="w-4 h-4 fill-current" />
                  Salvar e Concluir Campanha
                </>
              ) : (
                <>
                  <Skull className="w-4 h-4" />
                  Registrar Derrota / Reinício
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
