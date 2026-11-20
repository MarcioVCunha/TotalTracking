import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Trophy, Plus, Trash2, Clock, Calendar, CheckCircle2, Skull, Hourglass, Pencil } from 'lucide-react';
import { Lord, CampaignRun, GameDifficulty, RunStatus } from '../types';
import { useApp } from '../context/AppContext';
import { formatHMS, formatDurationHuman, toUtcDateKey } from '../lib/timeUtils';
import { FACTIONS_META } from '../data/factions';
import { DEFAULT_PORTRAITS, WIKI_PORTRAITS, getLordPortrait } from '../data/portraits';

interface LordModalProps {
  lord: Lord;
  onClose: () => void;
}

export const LordModal: React.FC<LordModalProps> = ({ lord, onClose }) => {
  const {
    lordsProgress,
    runs,
    sessions,
    toggleMedal,
    addRun,
    updateRun,
    deleteRun,
    finishCampaign,
    getCampaignAutoDetails,
    setLordCustomImage,
    getLordTotalSeconds,
    portraitsCache,
  } = useApp();

  const progress = lordsProgress[lord.id] || { short: false, long: false, crisis: false, black: false };
  const lordRuns = runs.filter(r => Number(r.lordId) === Number(lord.id));
  const lordSessions = sessions.filter(s => Number(s.lordId) === Number(lord.id));
  const totalSeconds = getLordTotalSeconds(lord.id);

  const previousRunsSeconds = lordRuns.reduce((sum, r) => sum + (Number(r.totalSeconds) || 0), 0);
  const unallocatedSeconds = Math.max(0, totalSeconds - previousRunsSeconds) || totalSeconds;

  // New Run Form State
  const [status, setStatus] = useState<RunStatus>('victory');
  const [difficulty, setDifficulty] = useState<GameDifficulty>('Very Hard');
  const [turns, setTurns] = useState<string>('50');
  const [days, setDays] = useState<string>('2');
  const [isBlackBorderEligible, setIsBlackBorderEligible] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [customImgInput, setCustomImgInput] = useState<string>(progress.customImg || '');

  // Edit Run State
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [editTurn, setEditTurn] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<RunStatus>('victory');
  const [editDifficulty, setEditDifficulty] = useState<GameDifficulty>('Normal');
  const [editHours, setEditHours] = useState<number>(0);
  const [editMinutes, setEditMinutes] = useState<number>(0);
  const [editBlackBorder, setEditBlackBorder] = useState<boolean>(false);
  const [editDays, setEditDays] = useState<number>(1);

  const startEditRun = (r: CampaignRun) => {
    setEditingRunId(r.id);
    setEditTurn(r.finalTurn || 0);
    setEditStatus(r.status);
    setEditDifficulty(r.difficulty);
    const sec = r.totalSeconds || totalSeconds;
    setEditHours(Math.floor(sec / 3600));
    setEditMinutes(Math.floor((sec % 3600) / 60));
    setEditBlackBorder(!!r.isBlackBorderEligible);
    setEditDays(r.manualDays || 1);
  };

  const saveEditRun = (runId: string) => {
    const newSec = Math.max(0, editHours * 3600 + editMinutes * 60);
    updateRun(runId, {
      finalTurn: editTurn,
      status: editStatus,
      difficulty: editDifficulty,
      totalSeconds: newSec,
      isBlackBorderEligible: editBlackBorder,
      manualDays: editDays,
    });
    setEditingRunId(null);
  };

  const primaryPortrait = getLordPortrait(lord.id, progress.customImg);
  const [imgSrc, setImgSrc] = useState<string>(primaryPortrait);

  useEffect(() => {
    setImgSrc(getLordPortrait(lord.id, progress.customImg));
  }, [progress.customImg, lord.id]);

  useEffect(() => {
    let isMounted = true;
    getCampaignAutoDetails(lord.id).then(details => {
      if (!isMounted) return;
      if (details.turn > 0) setTurns(String(details.turn));
      if (details.days > 0) setDays(String(details.days));
      if (details.difficulty) setDifficulty(details.difficulty);
      setIsBlackBorderEligible(details.isBlackBorderEligible);
    });
    return () => {
      isMounted = false;
    };
  }, [lord.id, getCampaignAutoDetails]);

  const factionMeta = FACTIONS_META[lord.faction];
  const wikiUrl = `https://totalwarwarhammer.fandom.com/wiki/${lord.wiki}`;

  const handleAddRun = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTurns = parseInt(turns, 10) || 0;
    const parsedDays = parseInt(days, 10) || 1;

    addRun(lord.id, {
      status,
      difficulty,
      finalTurn: parsedTurns,
      manualDays: parsedDays,
      totalSeconds: unallocatedSeconds,
      isBlackBorderEligible: isBlackBorderEligible,
      notes: notes.trim(),
    });

    setNotes('');
  };

  const handleSaveCustomImage = () => {
    setLordCustomImage(lord.id, customImgInput.trim());
    alert('Retrato atualizado!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e0e12] border border-[#262633] rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-[#0e0e12]/95 backdrop-blur-md border-b border-[#262633] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#181822] border border-[#3b3b4f] shrink-0">
              {imgSrc ? (
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
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-600">
                  <Skull className="w-6 h-6" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-cinzel font-bold text-white flex items-center gap-2">
                #{String(lord.id).padStart(3, '0')} {lord.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#9494a8]">
                <span style={{ color: factionMeta?.colorHex || '#c9a227' }} className="font-semibold">
                  {lord.faction}
                </span>
                <span>&middot;</span>
                <span>Era {lord.era}</span>
                <span>&middot;</span>
                <span>Onda {lord.wave}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={wikiUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-[#9494a8] hover:text-white rounded-lg hover:bg-[#1b1b24] transition-colors"
              title="Ver página oficial na Wiki"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-[#9494a8] hover:text-white rounded-lg hover:bg-[#1b1b24] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Quick Stats overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#13131a] p-3 rounded-xl border border-[#262633]">
            <div>
              <div className="text-[10px] text-[#9494a8] uppercase font-bold">Tempo Total</div>
              <div className="text-base font-bold text-emerald-400 font-mono-numbers">
                {formatHMS(totalSeconds)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#9494a8] uppercase font-bold">Tentativas</div>
              <div className="text-base font-bold text-white">{lordRuns.length} runs</div>
            </div>
            <div>
              <div className="text-[10px] text-[#9494a8] uppercase font-bold">Sessões Gravadas</div>
              <div className="text-base font-bold text-white">{lordSessions.length} sessões</div>
            </div>
            <div>
              <div className="text-[10px] text-[#9494a8] uppercase font-bold">Status BTD6</div>
              <div className="text-xs font-bold text-[#c9a227] mt-1">
                {progress.black
                  ? '🖤 Borda Preta'
                  : progress.crisis
                  ? '🥇 Ouro'
                  : progress.long
                  ? '🥈 Prata'
                  : progress.short
                  ? '🥉 Bronze'
                  : 'Nenhuma'}
              </div>
            </div>
          </div>

          {/* BTD6 Medals Toggles */}
          <div>
            <h3 className="text-xs font-bold uppercase text-[#9494a8] tracking-wider mb-2 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-[#ffd700]" />
              Medalhas & Borda do Lorde (Estilo BTD6)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  progress.short
                    ? 'bg-[#cd7f32]/10 border-[#cd7f32] text-white shadow-sm shadow-[#cd7f32]/20'
                    : 'bg-[#13131a] border-[#262633] text-[#9494a8] hover:border-neutral-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={progress.short}
                  onChange={() => toggleMedal(lord.id, 'short')}
                  className="rounded accent-[#cd7f32]"
                />
                <span className="text-sm font-semibold">🥉 Vitória Curta</span>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  progress.long
                    ? 'bg-neutral-300/10 border-neutral-300 text-white shadow-sm shadow-neutral-300/20'
                    : 'bg-[#13131a] border-[#262633] text-[#9494a8] hover:border-neutral-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={progress.long}
                  onChange={() => toggleMedal(lord.id, 'long')}
                  className="rounded accent-neutral-300"
                />
                <span className="text-sm font-semibold">🥈 Vitória Longa</span>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  progress.crisis
                    ? 'bg-[#ffd700]/10 border-[#ffd700] text-white shadow-sm shadow-[#ffd700]/20'
                    : 'bg-[#13131a] border-[#262633] text-[#9494a8] hover:border-neutral-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={progress.crisis}
                  onChange={() => toggleMedal(lord.id, 'crisis')}
                  className="rounded accent-[#ffd700]"
                />
                <span className="text-sm font-semibold">🥇 Crise Final</span>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  progress.black
                    ? 'bg-purple-950/40 border-purple-500 text-white shadow-md shadow-purple-500/30'
                    : 'bg-[#13131a] border-[#262633] text-[#9494a8] hover:border-neutral-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={progress.black}
                  onChange={() => toggleMedal(lord.id, 'black')}
                  className="rounded accent-purple-500"
                />
                <span className="text-sm font-semibold">🖤 Borda Preta</span>
              </label>
            </div>
          </div>

          {/* New Run Form */}
          <div className="bg-[#13131a] p-4 rounded-xl border border-[#262633]">
            <h3 className="text-xs font-bold uppercase text-[#9494a8] tracking-wider mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#c9a227]" />
              Registrar Nova Campanha (Run)
            </h3>
            <form onSubmit={handleAddRun} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#9494a8] block mb-1">Resultado</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as RunStatus)}
                    className="w-full bg-[#1b1b24] text-white px-3 py-1.5 rounded-lg border border-[#262633] text-xs"
                  >
                    <option value="victory">✅ Vitória</option>
                    <option value="in_progress">⏳ Em Andamento</option>
                    <option value="defeat">💀 Derrota / Falha</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#9494a8] block mb-1">Dificuldade</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as GameDifficulty)}
                    className="w-full bg-[#1b1b24] text-white px-3 py-1.5 rounded-lg border border-[#262633] text-xs"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Hard">Difícil (Hard)</option>
                    <option value="Very Hard">Muito Difícil (Very Hard)</option>
                    <option value="Legendary">Lendário (Legendary)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#9494a8] block mb-1">Turno Final</label>
                  <input
                    type="number"
                    value={turns}
                    onChange={e => setTurns(e.target.value)}
                    placeholder="ex: 54"
                    className="w-full bg-[#1b1b24] text-white px-3 py-1.5 rounded-lg border border-[#262633] text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#9494a8] block mb-1">Dias Corridos</label>
                  <input
                    type="number"
                    value={days}
                    onChange={e => setDays(e.target.value)}
                    placeholder="ex: 3"
                    className="w-full bg-[#1b1b24] text-white px-3 py-1.5 rounded-lg border border-[#262633] text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#1b1b24] px-3.5 py-2 rounded-lg border border-[#262633] text-xs">
                <span className="text-[#9494a8] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Tempo a creditar nesta campanha:
                </span>
                <span className="font-bold text-emerald-400 font-mono-numbers">
                  {formatDurationHuman(unallocatedSeconds)}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-purple-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBlackBorderEligible}
                    onChange={e => setIsBlackBorderEligible(e.target.checked)}
                    className="rounded accent-purple-500"
                  />
                  100% Batalhas Manuais & Sem Reload (Borda Preta)
                </label>

                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c9a227] hover:bg-[#d8b030] text-black font-bold text-xs rounded-lg transition-colors shadow-md"
                >
                  + Salvar Campanha
                </button>
              </div>
            </form>
          </div>

          {/* Runs History */}
          <div>
            <h3 className="text-xs font-bold uppercase text-[#9494a8] tracking-wider mb-2">
              Histórico de Tentativas ({lordRuns.length})
            </h3>
            {lordRuns.length === 0 ? (
              <div className="text-xs text-[#9494a8] bg-[#13131a] p-4 rounded-xl border border-[#262633] text-center">
                Nenhuma campanha registrada para este Lorde ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {lordRuns.map(r => (
                  editingRunId === r.id ? (
                    <div key={r.id} className="bg-[#181822] p-3.5 rounded-xl border border-[#c9a227]/50 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-[#c9a227]">
                        <span>Editar Campanha</span>
                        <button
                          type="button"
                          onClick={() => setEditingRunId(null)}
                          className="text-neutral-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-[#9494a8] block mb-1">Resultado</label>
                          <select
                            value={editStatus}
                            onChange={e => setEditStatus(e.target.value as RunStatus)}
                            className="w-full bg-[#13131a] text-white px-2 py-1.5 rounded border border-[#262633]"
                          >
                            <option value="victory">✅ Vitória</option>
                            <option value="in_progress">⏳ Em Andamento</option>
                            <option value="defeat">💀 Derrota</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#9494a8] block mb-1">Dificuldade</label>
                          <select
                            value={editDifficulty}
                            onChange={e => setEditDifficulty(e.target.value as GameDifficulty)}
                            className="w-full bg-[#13131a] text-white px-2 py-1.5 rounded border border-[#262633]"
                          >
                            <option value="Normal">Normal</option>
                            <option value="Hard">Difícil (Hard)</option>
                            <option value="Very Hard">Muito Difícil (Very Hard)</option>
                            <option value="Legendary">Lendário (Legendary)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#9494a8] block mb-1">Turno Final</label>
                          <input
                            type="number"
                            value={editTurn}
                            onChange={e => setEditTurn(parseInt(e.target.value, 10) || 0)}
                            className="w-full bg-[#13131a] text-white px-2 py-1.5 rounded border border-[#262633]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#9494a8] block mb-1">Dias Corridos</label>
                          <input
                            type="number"
                            value={editDays}
                            onChange={e => setEditDays(parseInt(e.target.value, 10) || 1)}
                            className="w-full bg-[#13131a] text-white px-2 py-1.5 rounded border border-[#262633]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-[#9494a8] block mb-1">Horas Jogadas</label>
                          <input
                            type="number"
                            min="0"
                            value={editHours}
                            onChange={e => setEditHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-full bg-[#13131a] text-white px-2 py-1.5 rounded border border-[#262633]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#9494a8] block mb-1">Minutos Jogados</label>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={editMinutes}
                            onChange={e => setEditMinutes(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                            className="w-full bg-[#13131a] text-white px-2 py-1.5 rounded border border-[#262633]"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <label className="flex items-center gap-2 text-xs text-purple-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editBlackBorder}
                            onChange={e => setEditBlackBorder(e.target.checked)}
                            className="rounded accent-purple-500"
                          />
                          100% Manual (Borda Preta)
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingRunId(null)}
                            className="px-3 py-1 bg-[#1b1b24] hover:bg-[#262633] text-neutral-300 text-xs rounded transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEditRun(r.id)}
                            className="px-3 py-1 bg-[#c9a227] hover:bg-[#d8b030] text-black font-bold text-xs rounded transition-colors"
                          >
                            Salvar Alterações
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={r.id}
                      className="bg-[#13131a] p-3 rounded-xl border border-[#262633] flex items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {r.status === 'victory' && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        )}
                        {r.status === 'defeat' && (
                          <Skull className="w-5 h-5 text-rose-400 shrink-0" />
                        )}
                        {r.status === 'in_progress' && (
                          <Hourglass className="w-5 h-5 text-sky-400 shrink-0 animate-spin" />
                        )}

                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>
                              {r.status === 'victory'
                                ? 'Vitória'
                                : r.status === 'defeat'
                                ? 'Derrota'
                                : 'Em Andamento'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1b1b24] text-[#9494a8] border border-[#262633]">
                              {r.difficulty}
                            </span>
                            {r.isBlackBorderEligible && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800">
                                🖤 100% Manual
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#9494a8] mt-0.5">
                            Turno {r.finalTurn || '-'} &middot; {r.manualDays || 1} dia(s) &middot;{' '}
                            <span className="text-emerald-400 font-semibold">
                              {formatDurationHuman(r.totalSeconds || totalSeconds)} jogadas
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditRun(r)}
                          className="p-1.5 text-neutral-400 hover:text-[#c9a227] rounded hover:bg-[#1b1b24] transition-colors"
                          title="Editar Campanha"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRun(r.id)}
                          className="p-1.5 text-neutral-500 hover:text-rose-400 rounded hover:bg-[#1b1b24] transition-colors"
                          title="Excluir Run"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          {/* Play Sessions History */}
          <div>
            <h3 className="text-xs font-bold uppercase text-[#9494a8] tracking-wider mb-2">
              Sessões de Jogo ({lordSessions.length})
            </h3>
            {lordSessions.length === 0 ? (
              <div className="text-xs text-[#9494a8] bg-[#13131a] p-3 rounded-xl border border-[#262633] text-center">
                Nenhuma sessão cronometrada salva ainda.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {lordSessions.map(s => (
                  <div
                    key={s.id}
                    className="bg-[#13131a] px-3 py-2 rounded-lg border border-[#262633] flex items-center justify-between text-xs font-mono-numbers"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#9494a8]" />
                      <span>{toUtcDateKey(s.startedAt)}</span>
                      {s.turnReached && (
                        <span className="text-[10px] text-sky-400">T{s.turnReached}</span>
                      )}
                      {s.autoDetected && (
                        <span className="text-[9px] px-1 bg-emerald-950 text-emerald-400 rounded border border-emerald-800">
                          Auto
                        </span>
                      )}
                    </div>
                    <span className="text-emerald-400 font-bold">{formatHMS(s.durationSeconds)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Portrait URL */}
          <div className="pt-2 border-t border-[#262633] flex items-center gap-2">
            <input
              type="text"
              value={customImgInput}
              onChange={e => setCustomImgInput(e.target.value)}
              placeholder="URL de retrato customizado (opcional)"
              className="flex-1 bg-[#13131a] text-xs px-3 py-2 rounded-lg border border-[#262633] text-white focus:outline-none focus:border-[#c9a227]"
            />
            <button
              onClick={handleSaveCustomImage}
              className="px-3 py-2 bg-[#1b1b24] hover:bg-[#262633] text-xs font-semibold rounded-lg text-white border border-[#3b3b4f]"
            >
              Atualizar Retrato
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
