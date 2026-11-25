import React, { useState, useEffect } from 'react';
import { Play, Pause, Swords, Clock } from 'lucide-react';
import { Lord } from '../types';
import { useApp } from '../context/AppContext';
import { formatDurationHuman } from '../lib/timeUtils';
import { FACTIONS_META } from '../data/factions';
import { WIKI_PORTRAITS, getLordPortrait } from '../data/portraits';

interface LordCardProps {
  lord: Lord;
  onOpenModal: (lordId: number) => void;
}

export const LordCard = React.memo<LordCardProps>(({ lord, onOpenModal }) => {
  const {
    lordsProgress,
    runs,
    activeSession,
    togglePlaySession,
    getLordTotalSeconds,
  } = useApp();

  const progress = lordsProgress[lord.id] || { short: false, long: false, crisis: false, black: false };
  const isPlaying = activeSession && Number(activeSession.lordId) === Number(lord.id);
  const lordRuns = runs.filter(r => Number(r.lordId) === Number(lord.id));
  const activeRun = lordRuns.find(r => r.status === 'in_progress');
  const totalSeconds = getLordTotalSeconds(lord.id);

  // BTD6 Border Evaluation
  let borderClass = 'border-btd-default';
  if (progress.black) {
    borderClass = 'border-btd-black';
  } else if (progress.crisis) {
    borderClass = 'border-btd-gold';
  } else if (progress.long) {
    borderClass = 'border-btd-silver';
  } else if (progress.short) {
    borderClass = 'border-btd-bronze';
  } else if (isPlaying || activeRun) {
    borderClass = 'border-btd-active';
  }

  const primaryPortrait = getLordPortrait(lord.id, progress.customImg);
  const [imgSrc, setImgSrc] = useState<string>(primaryPortrait);

  useEffect(() => {
    setImgSrc(getLordPortrait(lord.id, progress.customImg));
  }, [progress.customImg, lord.id]);

  const factionMeta = FACTIONS_META[lord.faction];
  const factionColor = factionMeta?.colorHex || '#c9a227';

  return (
    <div
      className={`group relative rounded-xl overflow-hidden bg-[#13131a] border-2 transition-all duration-200 hover:-translate-y-1 flex flex-col ${borderClass}`}
    >
      {/* Banner / Portrait Area */}
      <div
        onClick={() => onOpenModal(lord.id)}
        className="h-32 relative bg-[#181822] overflow-hidden cursor-pointer flex items-center justify-center"
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={lord.name}
            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
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
          <div className="flex flex-col items-center justify-center opacity-30">
            <Swords className="w-10 h-10 text-neutral-400" />
          </div>
        )}

        {/* Gradient shadow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#13131a] via-transparent to-black/30 pointer-events-none" />

        {/* Chrono Badge */}
        <div className="absolute top-2 left-2 bg-[#0c0c10]/95 border border-[#262633] px-2 py-0.5 rounded text-[11px] font-extrabold tracking-wide text-[#c9a227]">
          #{String(lord.id).padStart(3, '0')} &middot; Era {lord.era}
        </div>

        {/* BTD6 Medals Rack on Portrait */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-[#0c0c10]/95 px-2 py-1 rounded-md border border-[#262633]/60 text-xs shadow-md">
          {progress.short && <span title="Vitória Curta (Bronze)">🥉</span>}
          {progress.long && <span title="Vitória Longa (Prata)">🥈</span>}
          {progress.crisis && <span title="Crise Final / Dominação (Ouro)">🥇</span>}
          {progress.black && <span title="Borda Preta (100% Manual, Sem Reload)">🖤</span>}
          {!progress.short && !progress.long && !progress.crisis && !progress.black && (
            <span className="text-[10px] text-[#9494a8]">Sem Medalha</span>
          )}
        </div>

        {/* In-Campaign Indicator Pill */}
        {activeRun && (
          <div className="absolute top-2 right-2 bg-blue-500/90 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm shadow-blue-500/50">
            Turno {activeRun.finalTurn || 1}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <div
            onClick={() => onOpenModal(lord.id)}
            className="font-bold text-sm text-[#f2f2f7] hover:text-[#c9a227] transition-colors cursor-pointer line-clamp-1"
            title={lord.name}
          >
            {lord.name}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#9494a8] mt-0.5">
            <span className="flex items-center gap-1 font-medium" style={{ color: factionColor }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: factionColor }} />
              {lord.faction}
            </span>
            <span>Onda {lord.wave}</span>
          </div>
        </div>

        {/* Card Footer / Stats */}
        <div className="pt-2 border-t border-[#262633] flex items-center justify-between text-[11px] text-[#9494a8]">
          <div className="flex items-center gap-1 font-mono-numbers">
            <Clock className="w-3.5 h-3.5 text-[#9494a8]" />
            <span>{formatDurationHuman(totalSeconds)}</span>
            <span className="text-[10px] opacity-60">({lordRuns.length} runs)</span>
          </div>

          {/* Quick Play/Pause Button */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              togglePlaySession(lord.id);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
              isPlaying
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-current" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                Play
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

LordCard.displayName = 'LordCard';
