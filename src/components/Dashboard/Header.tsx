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
    <header className="glass-card sticky top-0 z-[60] px-8 py-2 border-b border-white/10 backdrop-blur-3xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-mesh-gradient opacity-20 group-hover:opacity-30 transition-opacity duration-1000"></div>
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-5">
          <div className="w-12 h-12 bg-gradient-harx rounded-2xl flex items-center justify-center shadow-xl shadow-harx-500/20 border border-white/20 transform group-hover:scale-105 transition-all duration-700">
            <span className="text-white font-black text-xl tracking-tighter">{agentInitials}</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-[0.2em] uppercase">
              HARX <span className="text-harx-500">REPS</span> <span className="opacity-50">AI COPILOT</span>
            </h1>
            <div className="flex items-center space-x-2 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">System Operational</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-5">
          <button
            onClick={handleGoToDashboard}
            className="flex items-center space-x-3 bg-white/5 hover:bg-white/10 text-slate-200 px-5 py-2.5 rounded-xl transition-all duration-300 border border-white/10 group/btn active:scale-95 shadow-lg"
            title="Dashboard"
          >
            <LayoutDashboard size={18} className="group-hover/btn:text-harx-500 transition-colors" />
            <span className="font-black text-[10px] uppercase tracking-widest">Core Command</span>
          </button>

          {state.callState.isActive && (
            <div className="flex items-center space-x-4 text-sm px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shadow-lg shadow-emerald-500/5">
              <div className="flex items-center space-x-2 text-emerald-400">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                </div>
                <span className="font-black tracking-[0.2em] uppercase text-[10px]">LIVE SIGNAL</span>
              </div>
              <div className="text-white font-black tracking-widest text-[11px]">
                {state.callState.startTime && formatDuration(Date.now() - state.callState.startTime.getTime())}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3 border-l border-white/10 pl-5">
            <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-300 relative group/icon active:scale-90 border border-transparent hover:border-white/10" title="Volume">
              <Volume2 className="w-5 h-5 text-slate-400 group-hover/icon:text-white transition-colors" />
              <div className="absolute inset-0 bg-harx-500/10 blur-xl opacity-0 group-hover/icon:opacity-100 rounded-full transition-opacity"></div>
            </button>
            <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-300 relative group/icon active:scale-90 border border-transparent hover:border-white/10" title="Microphone">
              <Mic className="w-5 h-5 text-slate-400 group-hover/icon:text-white transition-colors" />
              <div className="absolute inset-0 bg-harx-500/10 blur-xl opacity-0 group-hover/icon:opacity-100 rounded-full transition-opacity"></div>
            </button>
            <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-300 relative group/icon active:scale-90 border border-transparent hover:border-white/10" title="Settings">
              <Settings className="w-5 h-5 text-slate-400 group-hover/icon:text-white transition-colors" />
              <div className="absolute inset-0 bg-harx-500/10 blur-xl opacity-0 group-hover/icon:opacity-100 rounded-full transition-opacity"></div>
            </button>
            
            <button
              onClick={handleLogout}
              className="p-3 bg-rose-500/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-all duration-300 border border-white/5 hover:border-rose-500/30 group active:scale-90"
              title="Deconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4 ml-4 glass-card px-5 py-2.5 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-500 group/profile bg-white/2 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/10 shadow-inner group-hover/profile:border-harx-500/30 transition-colors duration-500">
                <User size={18} className="text-harx-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-white uppercase tracking-widest">{agentName}</span>
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
