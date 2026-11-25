import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Header } from './components/Header';
import { LordsGrid } from './components/LordsGrid';
import { Dashboard } from './components/Dashboard';
import { LordRoulette } from './components/LordRoulette';
import { FloatingTimer } from './components/FloatingTimer';
import { LordModal } from './components/LordModal';
import { SettingsModal } from './components/SettingsModal';
import { SessionsManagerModal } from './components/SessionsManagerModal';
import { LORDS_DATA } from './data/lords';

const MainLayout: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'lords' | 'stats' | 'roulette'>('lords');
  const [selectedLordId, setSelectedLordId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);

  const selectedLord = selectedLordId ? LORDS_DATA.find(l => l.id === selectedLordId) : null;

  return (
    <div className="min-h-screen bg-[#070709] text-[#f2f2f7] flex flex-col pb-28">
      {/* Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSessions={() => setIsSessionsOpen(true)}
      />

      {/* Main Content View */}
      <main className="max-w-[1520px] mx-auto w-full px-6 py-6 flex-1">
        {currentTab === 'lords' && <LordsGrid onOpenModal={id => setSelectedLordId(id)} />}
        {currentTab === 'stats' && <Dashboard onOpenSessions={() => setIsSessionsOpen(true)} />}
        {currentTab === 'roulette' && <LordRoulette />}
      </main>

      {/* Persistent Floating Active Session Timer */}
      <FloatingTimer onOpenModal={id => setSelectedLordId(id)} />

      {/* Lord Dossier / Medals & Runs Modal */}
      {selectedLord && (
        <LordModal lord={selectedLord} onClose={() => setSelectedLordId(null)} />
      )}

      {/* Sessions Manager Modal */}
      {isSessionsOpen && (
        <SessionsManagerModal
          onClose={() => setIsSessionsOpen(false)}
          onSelectLord={id => {
            setIsSessionsOpen(false);
            setSelectedLordId(id);
          }}
        />
      )}

      {/* App Settings Modal */}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;
