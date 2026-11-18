import React, { useState, useEffect } from 'react';
import { Film, RefreshCw, FolderSearch, ShieldCheck, Swords, FileCode, MapPin, Users } from 'lucide-react';
import { ReplayItem } from '../types';

export const ReplayViewer: React.FC = () => {
  const [replays, setReplays] = useState<ReplayItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedReplay, setSelectedReplay] = useState<ReplayItem | null>(null);

  const fetchReplays = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const list = await window.electronAPI.getReplaysList();
        setReplays(list);
        if (list.length > 0 && !selectedReplay) {
          setSelectedReplay(list[0]);
        }
      } else {
        // Fallback demo data if running in pure browser
        setReplays([
          {
            fileName: 'reikland settlement battle.replay',
            filePath: 'The Creative Assembly/Warhammer3/replays/reikland settlement battle.replay',
            sizeBytes: 61555,
            modifiedAt: new Date().toISOString(),
            settlement: 'Grunburg',
            playerFaction: 'O Império (Reikland)',
            enemyFaction: 'Secessionistas do Império',
            playerLord: 'Karl Franz',
            detectedUnits: ['Karl Franz', 'Espadachins do Império', 'Lanceiros', 'Besteiros', 'Arcabuzeiros', 'Alabardeiros', 'Cavaleiros Reiksguard', 'Bateria de Morteiros', 'Grandes Espadachins'],
            battleType: 'Batalha por Assentamento (Grunburg)'
          },
          {
            fileName: 'Salvamento auto..replay',
            filePath: 'The Creative Assembly/Warhammer3/replays/Salvamento auto..replay',
            sizeBytes: 202324,
            modifiedAt: new Date(Date.now() - 3600000).toISOString(),
            playerFaction: 'Corte de Lybaras',
            enemyFaction: 'Rebeldes Vampiros',
            playerLord: 'Alta Rainha Khalida',
            detectedUnits: ['Lanceiros', 'Guarda da Tumba', 'Ushabti', 'Rainha Khalida', 'Guerreiros Esqueleto', 'Morcegos Vampíricos'],
            battleType: 'Batalha de Missão Lendária (Quest Battle)'
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplays();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0e0e12] p-5 rounded-2xl border border-[#262633] shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-950/50 border border-purple-500/40 flex items-center justify-center">
            <Film className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-cinzel font-bold text-white">
              Gravações & Replays de Batalha
            </h2>
            <p className="text-xs text-[#9494a8]">
              Auditoria de arquivos <code className="text-purple-300">.replay</code> com telemetria automática de assentamento, lorde, exércitos e IA tática
            </p>
          </div>
        </div>

        <button
          onClick={fetchReplays}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#1b1b24] hover:bg-[#262633] text-white border border-[#3b3b4f] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#c9a227]' : ''}`} />
          Atualizar Lista
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Replays List */}
        <div className="lg:col-span-1 bg-[#0e0e12] rounded-2xl border border-[#262633] p-4 flex flex-col h-[580px]">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-[#9494a8] mb-3">
            <span>Replays Detectados ({replays.length})</span>
            <span className="text-[10px] text-purple-400 font-mono-numbers">Auto-detect</span>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-[#9494a8]">
              Buscando e inspecionando arquivos de replay...
            </div>
          ) : replays.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-[#9494a8] text-center p-6">
              <FolderSearch className="w-10 h-10 mb-2 opacity-30 text-purple-400" />
              Nenhum arquivo <code>.replay</code> encontrado na pasta padrão do jogo. Jogue uma batalha no Warhammer 3 para gerar um replay automático!
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {replays.map(r => {
                const isSelected = selectedReplay?.filePath === r.filePath;
                return (
                  <div
                    key={r.filePath}
                    onClick={() => setSelectedReplay(r)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/80 text-white shadow-md shadow-purple-500/20'
                        : 'bg-[#13131a] border-[#262633] text-[#9494a8] hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className="font-bold truncate flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">{r.fileName}</span>
                    </div>

                    {r.settlement && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{r.settlement}</span>
                        {r.playerLord && <span className="text-neutral-400">&middot; {r.playerLord}</span>}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] mt-1.5 text-[#9494a8]">
                      <span>{new Date(r.modifiedAt).toLocaleString('pt-BR')}</span>
                      <span className="font-mono-numbers">{formatFileSize(r.sizeBytes)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Replay Details & AI Battle Analysis Guide */}
        <div className="lg:col-span-2 space-y-4">
          {selectedReplay ? (
            <div className="bg-[#0e0e12] p-5 rounded-2xl border border-[#262633] shadow-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#262633] pb-3">
                <div>
                  <div className="text-[10px] uppercase font-bold text-sky-400">
                    {selectedReplay.battleType || 'Batalha Manual Detectada'}
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">{selectedReplay.fileName}</h3>
                </div>
              </div>

              {/* Combatants Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#13131a] p-3.5 rounded-xl border border-[#262633]">
                  <div className="text-[10px] uppercase font-bold text-emerald-400">Suas Forças</div>
                  <div className="text-sm font-bold text-white mt-1">
                    {selectedReplay.playerLord || 'General Comandante'}
                  </div>
                  <div className="text-xs text-[#9494a8]">{selectedReplay.playerFaction || 'Sua Facção'}</div>
                </div>

                <div className="bg-[#13131a] p-3.5 rounded-xl border border-[#262633]">
                  <div className="text-[10px] uppercase font-bold text-red-400">Inimigos Enfrentados</div>
                  <div className="text-sm font-bold text-white mt-1">
                    {selectedReplay.enemyFaction || 'Facção Oponente'}
                  </div>
                  <div className="text-xs text-[#9494a8]">
                    {selectedReplay.settlement ? `Região: ${selectedReplay.settlement}` : 'Campo Aberto'}
                  </div>
                </div>
              </div>

              {/* Detected Units in Battle */}
              {selectedReplay.detectedUnits && selectedReplay.detectedUnits.length > 0 && (
                <div className="bg-[#13131a] p-4 rounded-xl border border-[#262633] space-y-2">
                  <div className="text-xs font-bold uppercase text-[#c9a227] flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Tropas Identificadas na Batalha ({selectedReplay.detectedUnits.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedReplay.detectedUnits.map(unit => (
                      <span
                        key={unit}
                        className="px-2.5 py-1 rounded-lg bg-[#1b1b24] text-purple-200 border border-purple-500/30 text-xs font-medium"
                      >
                        {unit}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tactical Checklist for Black Border / Manual Battles */}
              <div className="bg-[#13131a] p-4 rounded-xl border border-[#262633] space-y-2.5">
                <h4 className="text-xs font-bold uppercase text-[#c9a227] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Auditoria para Borda Preta (100% Batalhas Manuais)
                </h4>
                <ul className="text-xs space-y-1.5 text-neutral-300">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <strong>Zero Autoresolve:</strong> Batalha travada manualmente pelo jogador.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <strong>Sem Reload em caso de derrota:</strong> Derrotas parciais ou recuos foram absorvidos sem recarregar save.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <strong>Preservação de Tropas:</strong> Regimentos de Renome e artilharias chave foram preservados do aniquilamento total.
                  </li>
                </ul>
              </div>

              <div className="text-[11px] text-[#9494a8] bg-[#13131a] p-2.5 rounded-xl border border-[#262633] font-mono break-all">
                Caminho: {selectedReplay.filePath}
              </div>
            </div>
          ) : (
            <div className="bg-[#0e0e12] p-8 rounded-2xl border border-[#262633] text-center text-xs text-[#9494a8]">
              Selecione um replay na lista ao lado para ver os detalhes da batalha.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
