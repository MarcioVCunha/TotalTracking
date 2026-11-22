import React, { useState, useMemo } from 'react';
import { X, Clock, Calendar, Pencil, Trash2, Search, Check, AlertCircle, Filter, ArrowUpDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LORDS_DATA } from '../data/lords';
import { FACTIONS_META } from '../data/factions';
import { getLordPortrait } from '../data/portraits';
import { formatHMS, formatDurationHuman } from '../lib/timeUtils';
import { PlaySession } from '../types';

interface SessionsManagerModalProps {
  onClose: () => void;
  onSelectLord?: (lordId: number) => void;
  initialLordId?: number | null;
}

export const SessionsManagerModal: React.FC<SessionsManagerModalProps> = ({
  onClose,
  onSelectLord,
  initialLordId,
}) => {
  const { sessions, updateSession, deleteSession, lordsProgress } = useApp();

  const [selectedLordFilter, setSelectedLordFilter] = useState<number | 'all'>(
    initialLordId ? Number(initialLordId) : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'longest'>('newest');

  // Editing session state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editLordId, setEditLordId] = useState<number>(1);
  const [editHours, setEditHours] = useState<number>(0);
  const [editMinutes, setEditMinutes] = useState<number>(0);
  const [editSeconds, setEditSeconds] = useState<number>(0);
  const [editTurn, setEditTurn] = useState<string>('');

  // Delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startEditing = (s: PlaySession) => {
    setEditingSessionId(s.id);
    setEditLordId(s.lordId);
    const totalSec = Math.max(0, s.durationSeconds);
    setEditHours(Math.floor(totalSec / 3600));
    setEditMinutes(Math.floor((totalSec % 3600) / 60));
    setEditSeconds(totalSec % 60);
    setEditTurn(s.turnReached ? String(s.turnReached) : '');
    setConfirmDeleteId(null);
  };

  const handleSaveEdit = (sessionId: string) => {
    const totalDurationSeconds = Math.max(0, editHours * 3600 + editMinutes * 60 + editSeconds);
    const turn = editTurn.trim() ? parseInt(editTurn, 10) : undefined;
    updateSession(sessionId, {
      lordId: editLordId,
      durationSeconds: totalDurationSeconds,
      turnReached: isNaN(turn as number) ? undefined : turn,
    });
    setEditingSessionId(null);
  };

  const handleDelete = (sessionId: string) => {
    deleteSession(sessionId);
    if (editingSessionId === sessionId) setEditingSessionId(null);
    setConfirmDeleteId(null);
  };

  // Filter & Sort
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    if (selectedLordFilter !== 'all') {
      result = result.filter(s => Number(s.lordId) === Number(selectedLordFilter));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => {
        const lord = LORDS_DATA.find(l => l.id === s.lordId);
        if (!lord) return false;
        return (
          lord.name.toLowerCase().includes(q) ||
          lord.faction.toLowerCase().includes(q) ||
          String(lord.id).includes(q) ||
          (s.turnReached && `turno ${s.turnReached}`.includes(q))
        );
      });
    }

    result.sort((a, b) => {
      if (sortOrder === 'newest') return (b.startedAt || 0) - (a.startedAt || 0);
      if (sortOrder === 'oldest') return (a.startedAt || 0) - (b.startedAt || 0);
      if (sortOrder === 'longest') return (b.durationSeconds || 0) - (a.durationSeconds || 0);
      return 0;
    });

    return result;
  }, [sessions, selectedLordFilter, searchQuery, sortOrder]);

  const totalFilteredSeconds = useMemo(() => {
    return filteredSessions.reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);
  }, [filteredSessions]);

  // Unique lords present in current sessions
  const lordsWithSessions = useMemo(() => {
    const set = new Set(sessions.map(s => Number(s.lordId)));
    return LORDS_DATA.filter(l => set.has(l.id));
  }, [sessions]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e0e12] border border-[#262633] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262633] flex items-center justify-between bg-[#13131a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-cinzel font-bold text-white flex items-center gap-2">
                Histórico & Gerenciador de Sessões
              </h2>
              <p className="text-xs text-[#9494a8]">
                Altere o lorde jogado, corrija a duração ou exclua sessões duplicadas/acumuladas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#1b1b24] hover:bg-[#262633] text-[#9494a8] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Bar & Filters */}
        <div className="p-4 border-b border-[#262633] bg-[#111117] flex flex-wrap items-center justify-between gap-3">
          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs font-mono-numbers">
            <div className="bg-[#181822] px-3 py-1.5 rounded-lg border border-[#262633]">
              <span className="text-[#9494a8]">Sessões: </span>
              <span className="font-bold text-white">
                {filteredSessions.length} {selectedLordFilter !== 'all' ? `(de ${sessions.length})` : ''}
              </span>
            </div>
            <div className="bg-[#181822] px-3 py-1.5 rounded-lg border border-[#262633]">
              <span className="text-[#9494a8]">Tempo Total: </span>
              <span className="font-bold text-emerald-400">{formatHMS(totalFilteredSeconds)}</span>
              <span className="text-[#9494a8] text-[10px] ml-1">({formatDurationHuman(totalFilteredSeconds)})</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Lord Filter */}
            <div className="flex items-center gap-1.5 bg-[#181822] px-2.5 py-1.5 rounded-lg border border-[#262633]">
              <Filter className="w-3.5 h-3.5 text-[#9494a8]" />
              <select
                value={selectedLordFilter}
                onChange={e => setSelectedLordFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#181822] text-white">
                  Todos os Lordes ({sessions.length})
                </option>
                {lordsWithSessions.map(l => {
                  const count = sessions.filter(s => s.lordId === l.id).length;
                  return (
                    <option key={l.id} value={l.id} className="bg-[#181822] text-white">
                      #{String(l.id).padStart(3, '0')} {l.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5 bg-[#181822] px-2.5 py-1.5 rounded-lg border border-[#262633]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#9494a8]" />
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as any)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-[#181822] text-white">Mais Recentes</option>
                <option value="oldest" className="bg-[#181822] text-white">Mais Antigas</option>
                <option value="longest" className="bg-[#181822] text-white">Maior Duração</option>
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9494a8]" />
              <input
                type="text"
                placeholder="Buscar lorde, facção..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#181822] pl-8 pr-3 py-1.5 rounded-lg border border-[#262633] text-xs text-white focus:outline-none focus:border-amber-400 w-44"
              />
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="py-16 text-center text-[#9494a8] flex flex-col items-center justify-center">
              <AlertCircle className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-semibold">Nenhuma sessão encontrada para os filtros selecionados.</p>
              <button
                onClick={() => {
                  setSelectedLordFilter('all');
                  setSearchQuery('');
                }}
                className="mt-3 text-xs text-amber-400 underline"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            filteredSessions.map(session => {
              const lord = LORDS_DATA.find(l => l.id === session.lordId) || {
                id: session.lordId,
                name: `Lorde #${session.lordId}`,
                faction: 'Desconhecida',
              };
              const factionMeta = FACTIONS_META[lord.faction];
              const factionColor = factionMeta?.colorHex || '#c9a227';
              const progress = lordsProgress[session.lordId];
              const portrait = getLordPortrait(session.lordId, progress?.customImg);

              const isEditing = editingSessionId === session.id;
              const isConfirmingDelete = confirmDeleteId === session.id;

              return (
                <div
                  key={session.id}
                  className={`bg-[#13131a] rounded-xl border transition-all ${
                    isEditing
                      ? 'border-amber-500/60 shadow-lg shadow-amber-500/10 p-4'
                      : 'border-[#262633] hover:border-[#3b3b4f] p-3'
                  }`}
                >
                  {isEditing ? (
                    /* Inline Edit Mode */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-[#262633] pb-2">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Pencil className="w-3.5 h-3.5" />
                          Editando Sessão #{session.id.slice(-6)}
                        </span>
                        <span className="text-[11px] text-[#9494a8]">
                          Gravada em {new Date(session.startedAt).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Lord Select */}
                        <div>
                          <label className="block text-[11px] font-bold text-[#9494a8] uppercase mb-1.5">
                            Lorde Atribuído
                          </label>
                          <select
                            value={editLordId}
                            onChange={e => setEditLordId(Number(e.target.value))}
                            className="w-full bg-[#181822] text-sm text-white px-3 py-2 rounded-lg border border-[#262633] focus:outline-none focus:border-amber-400 cursor-pointer"
                          >
                            {LORDS_DATA.map(l => (
                              <option key={l.id} value={l.id} className="bg-[#181822] text-white">
                                #{String(l.id).padStart(3, '0')} {l.name} ({l.faction})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Turn Reached (Optional) */}
                        <div>
                          <label className="block text-[11px] font-bold text-[#9494a8] uppercase mb-1.5">
                            Turno Alcançado (Opcional)
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Ex: 28"
                            value={editTurn}
                            onChange={e => setEditTurn(e.target.value)}
                            className="w-full bg-[#181822] text-sm text-white px-3 py-2 rounded-lg border border-[#262633] focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Duration Editor (Hours, Minutes, Seconds) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-[#9494a8] uppercase">
                            Tempo Percorrido / Duração
                          </label>
                          <span className="text-xs font-mono-numbers text-emerald-400 font-bold">
                            Total: {formatHMS(editHours * 3600 + editMinutes * 60 + editSeconds)} (
                            {editHours * 3600 + editMinutes * 60 + editSeconds}s)
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <span className="text-[10px] text-[#9494a8] block mb-1">Horas</span>
                            <input
                              type="number"
                              min="0"
                              value={editHours}
                              onChange={e => setEditHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-full bg-[#181822] text-base font-bold text-white text-center py-2 rounded-lg border border-[#262633] focus:outline-none focus:border-amber-400 font-mono-numbers"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-[#9494a8] block mb-1">Minutos</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={editMinutes}
                              onChange={e => setEditMinutes(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                              className="w-full bg-[#181822] text-base font-bold text-white text-center py-2 rounded-lg border border-[#262633] focus:outline-none focus:border-amber-400 font-mono-numbers"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-[#9494a8] block mb-1">Segundos</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={editSeconds}
                              onChange={e => setEditSeconds(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                              className="w-full bg-[#181822] text-base font-bold text-white text-center py-2 rounded-lg border border-[#262633] focus:outline-none focus:border-amber-400 font-mono-numbers"
                            />
                          </div>
                        </div>

                        {/* Quick adjustments */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-[#9494a8]">Ajuste rápido:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const total = Math.max(0, editHours * 3600 + editMinutes * 60 + editSeconds - 1800);
                              setEditHours(Math.floor(total / 3600));
                              setEditMinutes(Math.floor((total % 3600) / 60));
                              setEditSeconds(total % 60);
                            }}
                            className="px-2 py-0.5 bg-[#181822] hover:bg-[#262633] border border-[#262633] rounded text-[10px] text-white"
                          >
                            -30m
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const total = Math.max(0, editHours * 3600 + editMinutes * 60 + editSeconds - 3600);
                              setEditHours(Math.floor(total / 3600));
                              setEditMinutes(Math.floor((total % 3600) / 60));
                              setEditSeconds(total % 60);
                            }}
                            className="px-2 py-0.5 bg-[#181822] hover:bg-[#262633] border border-[#262633] rounded text-[10px] text-white"
                          >
                            -1h
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const total = editHours * 3600 + editMinutes * 60 + editSeconds + 1800;
                              setEditHours(Math.floor(total / 3600));
                              setEditMinutes(Math.floor((total % 3600) / 60));
                              setEditSeconds(total % 60);
                            }}
                            className="px-2 py-0.5 bg-[#181822] hover:bg-[#262633] border border-[#262633] rounded text-[10px] text-white"
                          >
                            +30m
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const total = editHours * 3600 + editMinutes * 60 + editSeconds + 3600;
                              setEditHours(Math.floor(total / 3600));
                              setEditMinutes(Math.floor((total % 3600) / 60));
                              setEditSeconds(total % 60);
                            }}
                            className="px-2 py-0.5 bg-[#181822] hover:bg-[#262633] border border-[#262633] rounded text-[10px] text-white"
                          >
                            +1h
                          </button>
                        </div>
                      </div>

                      {/* Edit Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262633]">
                        <button
                          type="button"
                          onClick={() => setEditingSessionId(null)}
                          className="px-4 py-2 bg-[#1b1b24] hover:bg-[#262633] text-xs font-semibold rounded-lg text-[#9494a8] hover:text-white transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(session.id)}
                          className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-xs font-bold text-white rounded-lg shadow-md transition-all flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          Salvar Alterações
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Left: Lord Portrait + Info */}
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => onSelectLord && onSelectLord(lord.id)}
                          className="w-12 h-12 rounded-xl overflow-hidden bg-[#181822] border border-[#262633] shrink-0 cursor-pointer shadow-sm hover:border-[#c9a227] transition-colors"
                        >
                          <img
                            src={portrait}
                            alt={lord.name}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              onClick={() => onSelectLord && onSelectLord(lord.id)}
                              className="font-bold text-sm text-white hover:text-amber-400 cursor-pointer transition-colors"
                            >
                              #{String(lord.id).padStart(3, '0')} {lord.name}
                            </span>
                            <span
                              className="text-[11px] font-medium"
                              style={{ color: factionColor }}
                            >
                              &middot; {lord.faction}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-[#9494a8] mt-0.5 font-mono-numbers">
                            <Calendar className="w-3 h-3 text-[#9494a8]" />
                            <span>
                              {new Date(session.startedAt).toLocaleString('pt-BR', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>

                            {session.turnReached && (
                              <span className="bg-sky-950/60 text-sky-400 border border-sky-800/80 px-1.5 py-0.2 rounded text-[10px] font-bold">
                                Turno {session.turnReached}
                              </span>
                            )}

                            {session.autoDetected && (
                              <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 px-1.5 py-0.2 rounded text-[9px] font-bold">
                                Auto
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Duration + Actions */}
                      <div className="flex items-center gap-4">
                        {/* Time display */}
                        <div className="text-right font-mono-numbers">
                          <div className="text-base font-extrabold text-emerald-400">
                            {formatHMS(session.durationSeconds)}
                          </div>
                          <div className="text-[10px] text-[#9494a8]">
                            {formatDurationHuman(session.durationSeconds)}
                          </div>
                        </div>

                        {/* Actions */}
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-800/60 p-1.5 rounded-lg animate-in fade-in">
                            <span className="text-[11px] text-rose-300 font-medium px-1">Excluir?</span>
                            <button
                              onClick={() => handleDelete(session.id)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 bg-[#1b1b24] hover:bg-[#262633] text-[#9494a8] text-[10px] rounded"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditing(session)}
                              className="p-2 rounded-lg bg-[#181822] hover:bg-[#262633] text-amber-400 hover:text-amber-300 border border-[#262633] transition-colors"
                              title="Editar lorde ou tempo da sessão"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(session.id)}
                              className="p-2 rounded-lg bg-[#181822] hover:bg-rose-950/40 text-neutral-400 hover:text-rose-400 border border-[#262633] transition-colors"
                              title="Excluir esta sessão"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#262633] bg-[#13131a] flex items-center justify-between text-xs text-[#9494a8]">
          <span>
            Dica: Alterar a duração de uma sessão ajusta automaticamente o Tempo Total e as métricas do lorde.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1b1b24] hover:bg-[#262633] text-white rounded-lg border border-[#262633] transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
