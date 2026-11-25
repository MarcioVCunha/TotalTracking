import React, { useRef } from 'react';
import { Swords, Shield, BarChart3, Dices, Settings, Cloud, Upload, Download, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  currentTab: 'lords' | 'stats' | 'roulette';
  setCurrentTab: (tab: 'lords' | 'stats' | 'roulette') => void;
  onOpenSettings: () => void;
  onOpenSessions: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  onOpenSettings,
  onOpenSessions,
}) => {
  const { isGameRunning, triggerCloudSync, exportBackupJson, importBackupJson } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [syncing, setSyncing] = React.useState(false);

  const handleSync = async () => {
    setSyncing(true);
    const res = await triggerCloudSync();
    setSyncing(false);
    alert(res.message);
  };

  const handleExport = () => {
    const json = exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `total_tracking_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      if (content && importBackupJson(content)) {
        alert('Backup importado com sucesso!');
      } else {
        alert('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0e0e12]/95 backdrop-blur-md border-b border-[#262633] px-6 py-3.5">
      <div className="max-w-[1520px] mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#c9a227] to-[#806010] p-0.5 shadow-lg shadow-[#c9a227]/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#070709] rounded-[7px] flex items-center justify-center">
              <Swords className="w-5 h-5 text-[#c9a227]" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-cinzel font-black tracking-wider uppercase bg-gradient-to-r from-white via-[#f2f2f7] to-[#c9a227] bg-clip-text text-transparent">
              Total Tracking
            </h1>
            <p className="text-[11px] text-[#9494a8] font-medium tracking-wide">
              Total War: WARHAMMER III Companion &middot; 110 Lordes
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-[#13131a] p-1 rounded-xl border border-[#262633]">
          <button
            onClick={() => setCurrentTab('lords')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentTab === 'lords'
                ? 'bg-[#1b1b24] text-white shadow-md shadow-black/50 border border-[#3b3b4f]'
                : 'text-[#9494a8] hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 text-[#c9a227]" />
            110 Lordes
          </button>
          <button
            onClick={() => setCurrentTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentTab === 'stats'
                ? 'bg-[#1b1b24] text-white shadow-md shadow-black/50 border border-[#3b3b4f]'
                : 'text-[#9494a8] hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-[#38bdf8]" />
            Estatísticas & Ludohall
          </button>
          <button
            onClick={() => setCurrentTab('roulette')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentTab === 'roulette'
                ? 'bg-[#1b1b24] text-white shadow-md shadow-black/50 border border-[#3b3b4f]'
                : 'text-[#9494a8] hover:text-white'
            }`}
          >
            <Dices className="w-4 h-4 text-[#a855f7]" />
            Sortear Lorde
          </button>
        </nav>

        {/* Right Actions & Status */}
        <div className="flex items-center gap-2.5">
          {/* Live Process Watcher Status Pill */}
          <div
            title={isGameRunning ? 'Warhammer3.exe detectado e monitorado!' : 'Warhammer3.exe não está em execução'}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              isGameRunning
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                : 'bg-[#13131a] text-[#9494a8] border-[#262633]'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isGameRunning ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'
              }`}
            />
            {isGameRunning ? 'Warhammer 3 Ativo' : 'Jogo Fechado'}
          </div>

          {/* Sessions Manager Button */}
          <button
            onClick={onOpenSessions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1b1b24] hover:bg-[#262633] text-amber-400 border border-[#262633] hover:border-amber-500/50 transition-colors shadow-sm"
            title="Ver e Gerenciar Histórico de Sessões"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Sessões</span>
          </button>

          {/* Cloud Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1b1b24] hover:bg-[#262633] text-[#f2f2f7] border border-[#262633] transition-colors"
            title="Sincronizar com Supabase Cloud"
          >
            <Cloud className={`w-4 h-4 ${syncing ? 'animate-spin text-[#c9a227]' : 'text-sky-400'}`} />
            {syncing ? 'Sincronizando...' : 'Nuvem'}
          </button>

          {/* Backup Buttons */}
          <div className="flex items-center gap-1 bg-[#13131a] p-0.5 rounded-lg border border-[#262633]">
            <button
              onClick={handleExport}
              className="p-1.5 text-[#9494a8] hover:text-white rounded hover:bg-[#1b1b24] transition-colors"
              title="Exportar Backup JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-[#9494a8] hover:text-white rounded hover:bg-[#1b1b24] transition-colors"
              title="Importar Backup JSON"
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-[#1b1b24] hover:bg-[#262633] text-[#9494a8] hover:text-white border border-[#262633] transition-colors"
            title="Configurações do App"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
