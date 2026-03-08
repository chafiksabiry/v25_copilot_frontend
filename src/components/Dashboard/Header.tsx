import React from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { useAgentProfile } from '../../hooks/useAgentProfile';
import { Settings, User, Volume2, Mic, LayoutDashboard, LogOut } from 'lucide-react';

export function Header() {
  const { state } = useAgent();
  const { profile } = useAgentProfile();

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('profileData');

    // Clear cookies
    document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    // Redirect to login page
    window.location.href = '/';
  };

  const handleGoToDashboard = () => {
    window.location.href = '/dashboard';
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const agentName = profile?.personalInfo?.name || 'Agent';
  const agentInitials = agentName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="bg-[#151e2e] px-8 py-4 border-b border-[#22304a]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg">{agentInitials}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">HARX REPS AI COPILOT</h1>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleGoToDashboard}
            className="flex items-center space-x-2 bg-[#22304a] hover:bg-[#2d3e5d] text-slate-200 px-4 py-2 rounded-lg transition-all border border-slate-700/50 group"
            title="Dashboard"
          >
            <LayoutDashboard size={18} className="group-hover:text-blue-400 transition-colors" />
            <span className="font-semibold text-sm">Dashboard</span>
          </button>

          {state.callState.isActive && (
            <div className="flex items-center space-x-3 text-sm px-4 py-2 bg-green-900/20 border border-green-500/20 rounded-lg">
              <div className="flex items-center space-x-1 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-bold">LIVE</span>
              </div>
              <div className="text-slate-300 font-mono">
                {state.callState.startTime && formatDuration(Date.now() - state.callState.startTime.getTime())}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2 border-l border-slate-700 pl-4">
            <button className="p-2 hover:bg-slate-800 rounded-full transition-colors relative group" title="Volume">
              <Volume2 className="w-5 h-5 text-slate-300" />
              <div className="absolute inset-0 bg-blue-500/10 blur-xl opacity-0 group-hover:opacity-100 rounded-full transition-opacity"></div>
            </button>
            <button className="p-2 hover:bg-slate-800 rounded-full transition-colors relative group" title="Microphone">
              <Mic className="w-5 h-5 text-slate-300" />
              <div className="absolute inset-0 bg-blue-500/10 blur-xl opacity-0 group-hover:opacity-100 rounded-full transition-opacity"></div>
            </button>
            <button className="p-2 hover:bg-slate-800 rounded-full transition-colors relative group" title="Settings">
              <Settings className="w-5 h-5 text-slate-300" />
              <div className="absolute inset-0 bg-blue-500/10 blur-xl opacity-0 group-hover:opacity-100 rounded-full transition-opacity"></div>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-900/20 text-slate-300 hover:text-red-400 rounded-lg transition-all border border-transparent hover:border-red-500/20 group"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 text-slate-200 font-medium ml-2 bg-[#1b253a] px-4 py-2 rounded-xl border border-slate-700/30">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 shadow-inner">
                <User size={16} className="text-slate-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-200 leading-tight">{agentName}</span>
                {profile?.professionalSummary?.currentRole && (
                  <span className="text-blue-400 text-[9px] font-bold uppercase tracking-wider">
                    {profile.professionalSummary.currentRole.split(' ').slice(0, 3).join(' ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}