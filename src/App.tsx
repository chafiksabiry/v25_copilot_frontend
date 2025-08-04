import React from 'react';
import { AgentProvider } from './contexts/AgentContext';
import { TranscriptionProvider } from './contexts/TranscriptionContext';
import { Header } from './components/Dashboard/Header';
import TopStatusBar from './components/Dashboard/TopStatusBar';
import { ContactInfo } from './components/Dashboard/ContactInfo';
import DashboardGrid from './components/Dashboard/DashboardGrid';
import { DestinationZoneDebug } from './components/Dashboard/DestinationZoneDebug';
import { useDestinationZone } from './hooks/useDestinationZone';

function AppContent() {
  // Récupérer la zone de destination au niveau de l'App
  const { zone: destinationZone } = useDestinationZone();

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
        {/* Composant de debug pour la zone de destination */}
        <DestinationZoneDebug />
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