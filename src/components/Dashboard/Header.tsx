import React from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { useAgentProfile } from '../../hooks/useAgentProfile';
import { Settings, User, Volume2, Mic } from 'lucide-react';

export function Header() {
  const { state } = useAgent();
  const { profile } = useAgentProfile();

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

        {state.callState.isActive && (
          <div className="flex items-center space-x-3 text-sm">
            <div className="flex items-center space-x-1 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>LIVE</span>
            </div>
            <div className="text-slate-300">
              {state.callState.startTime && formatDuration(Date.now() - state.callState.startTime.getTime())}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-4">
          <div className="p-2">
            <Volume2 className="w-5 h-5 text-slate-300" />
          </div>
          <div className="p-2">
            <Mic className="w-5 h-5 text-slate-300" />
          </div>
          <div className="p-2">
            <Settings className="w-5 h-5 text-slate-300" />
          </div>
          <div className="flex items-center space-x-2 text-slate-200 font-medium">
            <User className="w-5 h-5" />
            <div className="flex flex-col">
              <span className="text-base text-gray-200 leading-tight">{agentName}</span>
              {profile?.professionalSummary?.currentRole && (
                <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                  {profile.professionalSummary.currentRole}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}