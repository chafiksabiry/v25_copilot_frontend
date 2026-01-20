import React, { useState } from 'react';
import { AgentProvider } from './contexts/AgentContext';
import { TranscriptionProvider } from './contexts/TranscriptionContext';
import { Header } from './components/Dashboard/Header';
import TopStatusBar from './components/Dashboard/TopStatusBar';
import { ContactInfo } from './components/Dashboard/ContactInfo';
import DashboardGrid from './components/Dashboard/DashboardGrid';
import { AudioLoopbackTestUI } from './components/AudioLoopbackTestUI';

import { useDestinationZone } from './hooks/useDestinationZone';

function AppContent() {
  // Récupérer la zone de destination au niveau de l'App
  const { zone: destinationZone } = useDestinationZone();
  const [showLoopbackTest, setShowLoopbackTest] = useState(false);

  return (
    <TranscriptionProvider destinationZone={destinationZone || undefined}>
      <div className="min-h-screen bg-[#151e2e]">
        <Header />
        <div className="max-w-[1800px] mx-auto px-2">
          <div className="pt-6 pb-2">
            <TopStatusBar />
          </div>
          <ContactInfo />
          <DashboardGrid />
        </div>

        {/* Bouton pour afficher le test audio */}
        <button
          onClick={() => setShowLoopbackTest(!showLoopbackTest)}
          className="fixed bottom-4 left-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 transition"
          title="Test Audio Loopback"
        >
          🔄 Test Audio
        </button>

        {/* Composant de test audio */}
        {showLoopbackTest && (
          <div id="loopback-test">
            <AudioLoopbackTestUI />
          </div>
        )}
      </div>
    </TranscriptionProvider>
  );
}

function App() {
  return (
    <AgentProvider>
      <AppContent />
    </AgentProvider>
  );
}

export default App;