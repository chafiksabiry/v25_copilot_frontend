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
                    className={`p-3 rounded-2xl border shadow-xl animate-in slide-in-from-right-10 duration-700 glass-card backdrop-blur-3xl relative overflow-hidden group ${warning.severity === 'critical' ? 'border-rose-200 bg-rose-50 shadow-rose-500/5' :
                        warning.severity === 'high' ? 'border-amber-200 bg-amber-50 shadow-amber-500/5' : 'border-pink-200 bg-pink-50 shadow-harx-500/5'
                        }`}
                >
                    <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:opacity-20 transition-all duration-1000 ${warning.severity === 'critical' ? 'bg-rose-500' : warning.severity === 'high' ? 'bg-amber-500' : 'bg-harx-500'}`}></div>
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3 relative z-10">
                            <div className={`p-1.5 rounded-lg border ${warning.severity === 'critical' ? 'bg-white text-rose-600 border-rose-100' : 'bg-white text-amber-600 border-amber-100'}`}>
                                {warning.severity === 'critical' ? (
                                    <ShieldAlert className="w-5 h-5 focus-within:animate-pulse" />
                                ) : (
                                    <AlertTriangle className="w-5 h-5" />
                                )}
                            </div>
                            <span className="font-black text-slate-900 uppercase tracking-[0.2em] text-xs">
                                {warning.title}
                            </span>
                        </div>
                        <button
                            onClick={() => resolveWarning(warning.id)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-slate-600 text-xs mb-3 leading-tight font-black tracking-tight px-1 relative z-10 italic">
                        {warning.message}
                    </p>

                    <div className="flex gap-3 relative z-10">
                        {warning.suggestedActions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={() => resolveWarning(warning.id)}
                                className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all border active:scale-95 shadow-sm ${warning.severity === 'critical' 
                                    ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/20 hover:bg-rose-600' 
                                    : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'}`}
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

