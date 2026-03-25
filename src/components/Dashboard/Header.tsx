import { useAgent } from '../../contexts/AgentContext';
import { useAgentProfile } from '../../hooks/useAgentProfile';
import { User, Volume2, Mic, LayoutDashboard, LogOut, MicOff, Headphones } from 'lucide-react';

export function Header() {
  const { state, dispatch } = useAgent();
  const { profile } = useAgentProfile();

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('profileData');

    // Clear cookies
    document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    // Redirect to login page
    window.location.href = '/repdashboard/profile';
  };

  const handleGoToDashboard = () => {
    window.location.href = '/repdashboard/profile';
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
    <header className="glass-card sticky top-0 z-[60] px-8 py-2 border-b border-pink-100/50 backdrop-blur-3xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-white via-pink-50/30 to-white opacity-40 group-hover:opacity-60 transition-opacity duration-1000"></div>
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-5">
          <div className="w-12 h-12 bg-gradient-harx rounded-2xl flex items-center justify-center shadow-lg shadow-harx-500/20 border border-white transform group-hover:scale-105 transition-all duration-700">
            <span className="text-white font-black text-xl tracking-tighter">{agentInitials}</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-[0.2em] uppercase">
              HARX <span className="text-harx-500">REPS</span> <span className="text-slate-400">AI COPILOT</span>
            </h1>
            <div className="flex items-center space-x-2 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Operational</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-5">
          <button
            onClick={handleGoToDashboard}
            className="flex items-center space-x-3 bg-white/80 hover:bg-white text-slate-600 px-5 py-2.5 rounded-xl transition-all duration-300 border border-slate-200 group/btn active:scale-95 shadow-sm hover:shadow-md"
            title="Dashboard"
          >
            <LayoutDashboard size={18} className="group-hover/btn:text-harx-500 transition-colors" />
            <span className="font-black text-[10px] uppercase tracking-widest">Dashboard</span>
          </button>

          {state.callState.isActive && (
            <div className="flex items-center space-x-4 text-sm px-5 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
              <div className="flex items-center space-x-2 text-emerald-600">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.4)]"></span>
                </div>
                <span className="font-black tracking-[0.2em] uppercase text-[10px]">LIVE SIGNAL</span>
              </div>
              <div className="text-slate-900 font-black tracking-widest text-[11px]">
                {state.callState.startTime && formatDuration(Date.now() - state.callState.startTime.getTime())}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3 border-l border-slate-200 pl-5">
            <button 
              onClick={() => dispatch({ type: 'TOGGLE_OUTPUT_MODE' })}
              className={`p-3 rounded-xl transition-all duration-300 relative group/icon active:scale-90 border mb-0.5 ${state.isSpeakerPhone ? 'bg-white/80 hover:bg-white border-slate-200 shadow-sm' : 'bg-harx-500/10 border-harx-500/20'}`} 
              title={state.isSpeakerPhone ? "Switch to Headset" : "Switch to Speaker"}
            >
              {state.isSpeakerPhone ? (
                <Volume2 className="w-5 h-5 text-slate-400 group-hover/icon:text-harx-500 transition-colors" />
              ) : (
                <Headphones className="w-5 h-5 text-harx-500" />
              )}
            </button>

            <button 
              onClick={() => dispatch({ type: 'TOGGLE_MIC' })}
              className={`p-3 rounded-xl transition-all duration-300 relative group/icon active:scale-90 border mb-0.5 ${state.isMicMuted ? 'bg-rose-50 border-rose-100 shadow-sm' : 'bg-white/80 hover:bg-white border-slate-200 shadow-sm'}`} 
              title={state.isMicMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {state.isMicMuted ? (
                <MicOff className="w-5 h-5 text-rose-500" />
              ) : (
                <Mic className="w-5 h-5 text-slate-400 group-hover/icon:text-harx-500 transition-colors" />
              )}
            </button>
            
            <button
              onClick={handleLogout}
              className="p-3 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all duration-300 border border-slate-200 hover:border-rose-200 group active:scale-90"
              title="Deconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4 ml-4 bg-white/80 px-5 py-2.5 rounded-2xl border border-slate-200 hover:border-harx-500/30 transition-all duration-500 group/profile shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover/profile:border-harx-500/30 transition-colors duration-500">
                <User size={18} className="text-harx-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{agentName}</span>
                {profile?.professionalSummary?.currentRole && (
                  <span className="text-harx-500 text-[8px] font-black uppercase tracking-[0.2em] mt-0.5">
                    {profile.professionalSummary.currentRole}
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
