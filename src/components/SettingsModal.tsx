import React, { useState } from 'react';
import { X, Settings, Folder, Cloud, Monitor, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { settings, updateSettings, triggerCloudSync } = useApp();

  const [form, setForm] = useState({ ...settings });
  const [testingSync, setTestingSync] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [shortcutFeedback, setShortcutFeedback] = useState<string | null>(null);

  const handleCreateShortcut = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.createDesktopShortcut();
      setShortcutFeedback(res.message);
      setTimeout(() => setShortcutFeedback(null), 4000);
    }
  };

  const handleSave = () => {
    updateSettings(form);
    onClose();
  };

  const handleBrowseFolder = async () => {
    if (window.electronAPI) {
      const selected = await window.electronAPI.browseFolder();
      if (selected) {
        setForm(prev => ({ ...prev, savesPath: selected }));
      }
    }
  };

  const handleTestSync = async () => {
    setTestingSync(true);
    setSyncFeedback(null);
    updateSettings(form);
    const res = await triggerCloudSync();
    setTestingSync(false);
    setSyncFeedback(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e0e12] border border-[#262633] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-[#0e0e12]/95 backdrop-blur-md border-b border-[#262633] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1b1b24] border border-[#262633] flex items-center justify-center">
              <Settings className="w-5 h-5 text-[#c9a227]" />
            </div>
            <div>
              <h2 className="text-base font-cinzel font-bold text-white">Configurações do Total Tracking</h2>
              <p className="text-xs text-[#9494a8]">Automações locais e nuvem</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#9494a8] hover:text-white rounded-lg hover:bg-[#1b1b24] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6">
          {/* Windows Automations */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#c9a227] tracking-wider flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Automações do Windows (Background)
            </h3>

            <div className="bg-[#13131a] p-4 rounded-xl border border-[#262633] space-y-3 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-semibold text-white">Monitoramento de Processo (Warhammer3.exe)</div>
                  <div className="text-[#9494a8] text-[11px]">
                    Verifica ativamente se o jogo está rodando em segundo plano.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.processWatcherEnabled}
                  onChange={e => setForm(prev => ({ ...prev, processWatcherEnabled: e.target.checked }))}
                  className="rounded accent-[#c9a227] w-4 h-4"
                />
              </label>

              <div className="border-t border-[#1b1b24]" />

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-semibold text-white">Auto-Play / Auto-Pause do Cronômetro</div>
                  <div className="text-[#9494a8] text-[11px]">
                    Inicia a sessão automaticamente ao abrir o Warhammer 3 e encerra ao fechar.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.autoPlayEnabled}
                  onChange={e => setForm(prev => ({ ...prev, autoPlayEnabled: e.target.checked }))}
                  className="rounded accent-[#c9a227] w-4 h-4"
                />
              </label>

              <div className="border-t border-[#1b1b24]" />

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-semibold text-white">Minimizar para a Bandeja do Sistema (Tray)</div>
                  <div className="text-[#9494a8] text-[11px]">
                    Ao fechar a janela (X), mantém o Total Tracking rodando na barra de apps abertos.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.minimizeToTray}
                  onChange={e => setForm(prev => ({ ...prev, minimizeToTray: e.target.checked }))}
                  className="rounded accent-[#c9a227] w-4 h-4"
                />
              </label>

              <div className="border-t border-[#1b1b24]" />

              {/* Desktop & Start Menu Shortcut Action */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="font-semibold text-white">Atalhos no Menu Iniciar &amp; Área de Trabalho</div>
                  <div className="text-[#9494a8] text-[11px]">
                    Cria ou recria os atalhos oficiais do Total Tracking no Menu Iniciar e no Desktop do Windows.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreateShortcut}
                    className="px-3 py-1.5 bg-[#1b1b24] hover:bg-[#262633] text-white font-bold text-xs rounded-lg border border-[#3b3b4f] transition-colors"
                  >
                    Criar Atalhos
                  </button>
                  {shortcutFeedback && (
                    <span className="text-[11px] text-emerald-400 font-semibold">{shortcutFeedback}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Save Games Path */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-sky-400 tracking-wider flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Diretório de Saves do Jogo (File Watcher)
            </h3>
            <div className="bg-[#13131a] p-4 rounded-xl border border-[#262633] space-y-2 text-xs">
              <p className="text-[11px] text-[#9494a8]">
                O app detecta automaticamente os diretórios Steam e Epic Games (%APPDATA%\The Creative Assembly\Warhammer3\(EOS\)?save_games). Se desejar apontar para uma pasta customizada:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.savesPath}
                  onChange={e => setForm(prev => ({ ...prev, savesPath: e.target.value }))}
                  placeholder="Deixe em branco para detecção automática padrão"
                  className="flex-1 bg-[#1b1b24] text-white px-3 py-2 rounded-lg border border-[#262633] text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleBrowseFolder}
                  className="px-3 py-2 bg-[#262633] hover:bg-[#323242] text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Procurar...
                </button>
              </div>
            </div>
          </div>

          {/* Supabase Sync */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              Sincronização em Nuvem (Supabase)
            </h3>
            <div className="bg-[#13131a] p-4 rounded-xl border border-[#262633] space-y-3 text-xs">
              <p className="text-[11px] text-[#9494a8]">
                Permite sincronizar suas medalhas e histórico de sessões com o Supabase para visualizar no celular ou navegador.
              </p>

              <div>
                <label className="text-[11px] text-[#9494a8] block mb-1">Project URL</label>
                <input
                  type="text"
                  value={form.supabaseUrl}
                  onChange={e => setForm(prev => ({ ...prev, supabaseUrl: e.target.value }))}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full bg-[#1b1b24] text-white px-3 py-2 rounded-lg border border-[#262633] text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#9494a8] block mb-1">Anon / Public Key</label>
                <input
                  type="password"
                  value={form.supabaseAnonKey}
                  onChange={e => setForm(prev => ({ ...prev, supabaseAnonKey: e.target.value }))}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  className="w-full bg-[#1b1b24] text-white px-3 py-2 rounded-lg border border-[#262633] text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleTestSync}
                  disabled={testingSync || !form.supabaseUrl || !form.supabaseAnonKey}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold text-xs transition-colors disabled:opacity-40"
                >
                  {testingSync ? 'Conectando...' : 'Testar Conexão e Sincronizar'}
                </button>
                {syncFeedback && (
                  <span className="text-[11px] text-emerald-400 font-semibold">{syncFeedback}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-[#0e0e12]/95 backdrop-blur-md border-t border-[#262633] px-6 py-4 flex items-center justify-end gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#9494a8] hover:text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-[#c9a227] hover:bg-[#d8b030] text-black font-bold text-xs rounded-lg transition-colors shadow-lg"
          >
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};
