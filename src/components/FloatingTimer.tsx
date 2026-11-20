import React, { useState } from 'react';
import { Pause, Settings2, Swords, Sparkles, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LORDS_DATA } from '../data/lords';
import { formatHMS } from '../lib/timeUtils';
import { FinishCampaignModal } from './FinishCampaignModal';

interface FloatingTimerProps {
  onOpenModal: (lordId: number) => void;
}

export const FloatingTimer: React.FC<FloatingTimerProps> = ({ onOpenModal }) => {
  const { activeSession, activeSeconds, stopActiveSession, lastDetectedSave } = useApp();
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

  if (!activeSession) return null;

  const lord = LORDS_DATA.find(l => l.id === activeSession.lordId);
  if (!lord) return null;

  return (
    <>
      <aside
        aria-label="Sessão ativa"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(94vw,920px)] bg-[#13131a]/95 backdrop-blur-xl border border-[#c9a227] rounded-2xl px-5 py-3.5 shadow-2xl shadow-black/80 flex items-center justify-between gap-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-200"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#c9a227]/10 border border-[#c9a227]/40 flex items-center justify-center shrink-0">
            <Swords className="w-5 h-5 text-[#c9a227] animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#9494a8] flex items-center gap-2">
              <span>Sessão em Andamento</span>
              {lastDetectedSave?.turn && lastDetectedSave.lordId === lord.id && (
                <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  <Sparkles className="w-2.5 h-2.5" />
                  Turno {lastDetectedSave.turn} detectado
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-white truncate">
              #{String(lord.id).padStart(3, '0')} {lord.name} &middot;{' '}
              <span className="text-[#c9a227]">{lord.faction}</span>
            </div>
          </div>
        </div>

        {/* Stopwatch Digits */}
        <div className="font-mono-numbers text-2xl font-black text-emerald-400 tracking-wider drop-shadow-md">
          {formatHMS(activeSeconds)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsFinishModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/50 shadow-lg shadow-amber-500/10 transition-all hover:scale-105 active:scale-95"
            title="Concluir esta campanha com contagem automática de turno e dias"
          >
            <Trophy className="w-4 h-4 text-amber-400 fill-current" />
            <span>Finalizar Campanha</span>
          </button>

          <button
            onClick={() => stopActiveSession()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 transition-all"
            title="Pausar o cronômetro sem finalizar a campanha"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pausar</span>
          </button>

          <button
            onClick={() => onOpenModal(lord.id)}
            className="p-2 rounded-xl bg-[#1b1b24] hover:bg-[#262633] text-[#f2f2f7] border border-[#262633] transition-colors"
            title="Ver Detalhes do Lorde"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Quick Finish Campaign Modal */}
      {isFinishModalOpen && (
        <FinishCampaignModal lord={lord} onClose={() => setIsFinishModalOpen(false)} />
      )}
    </>
  );
};
