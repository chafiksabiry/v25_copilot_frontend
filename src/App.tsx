import React from 'react';
import { AgentProvider } from './contexts/AgentContext';
import { Header } from './components/Dashboard/Header';
import TopStatusBar from './components/Dashboard/TopStatusBar';
import { ContactInfo } from './components/Dashboard/ContactInfo';
import DashboardGrid from './components/Dashboard/DashboardGrid';

function App() {
  return (
    <AgentProvider>
      <div className="min-h-screen bg-[#151e2e]">
        <Header />
        <div className="max-w-[1800px] mx-auto px-2">
          <div className="pt-6 pb-2">
            <TopStatusBar />
          </div>
          <ContactInfo />
          <DashboardGrid />
        </div>
      </div>
    </AgentProvider>
  );
}

export default App;