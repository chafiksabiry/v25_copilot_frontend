import React from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { Phone, PhoneOff, Mic, MicOff, Settings, User, Volume2, VolumeX } from 'lucide-react';

export function Header() {
  const { state } = useAgent();

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <header className="bg-[#151e2e] px-8 py-4 border-b border-[#22304a]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg">H</span>
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
            <span className="text-base text-gray-400">Agent Smith</span>
          </div>
        </div>
      </div>
    </header>
  );
}