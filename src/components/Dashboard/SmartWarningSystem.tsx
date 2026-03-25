import React from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

export const SmartWarningSystem: React.FC = () => {
    const { state, dispatch } = useAgent();

    const resolveWarning = (id: string) => {
        dispatch({ type: 'RESOLVE_WARNING', warningId: id });
    };

    const activeWarnings = state.smartWarnings.filter(w => !w.resolved);

    if (activeWarnings.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full">
            {activeWarnings.map(warning => (
                <div
                    key={warning.id}
                    className={`p-6 rounded-2xl border shadow-2xl animate-in slide-in-from-right-10 duration-700 glass-card backdrop-blur-3xl relative overflow-hidden group ${warning.severity === 'critical' ? 'border-rose-500/50 shadow-rose-500/10 bg-rose-500/5' :
                        warning.severity === 'high' ? 'border-amber-500/50 shadow-amber-500/10 bg-amber-500/5' : 'border-harx-500/50 shadow-harx-500/10 bg-harx-500/5'
                        }`}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:opacity-20 transition-all duration-1000 ${warning.severity === 'critical' ? 'bg-rose-500' : warning.severity === 'high' ? 'bg-amber-500' : 'bg-harx-500'}"></div>
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3 relative z-10">
                            <div className={`p-1.5 rounded-lg ${warning.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                {warning.severity === 'critical' ? (
                                    <ShieldAlert className="w-5 h-5 focus-within:animate-pulse" />
                                ) : (
                                    <AlertTriangle className="w-5 h-5" />
                                )}
                            </div>
                            <span className="font-black text-white uppercase tracking-[0.2em] text-xs">
                                {warning.title}
                            </span>
                        </div>
                        <button
                            onClick={() => resolveWarning(warning.id)}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-slate-300 text-sm mb-6 leading-relaxed font-bold tracking-tight px-1 relative z-10">
                        {warning.message}
                    </p>

                    <div className="flex gap-3 relative z-10">
                        {warning.suggestedActions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={() => resolveWarning(warning.id)}
                                className={`px-5 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border active:scale-95 shadow-lg ${warning.severity === 'critical' 
                                    ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/20 hover:bg-rose-600' 
                                    : 'bg-white/5 hover:bg-white/10 text-white border-white/10 shadow-sm'}`}
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SmartWarningSystem;

