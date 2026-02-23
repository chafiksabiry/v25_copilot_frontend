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
                    className={`p-4 rounded-lg border-2 shadow-2xl animate-in slide-in-from-right-10 duration-500 bg-[#1e293b] ${warning.severity === 'critical' ? 'border-red-500' :
                        warning.severity === 'high' ? 'border-orange-500' : 'border-yellow-500'
                        }`}
                >
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                            {warning.severity === 'critical' ? (
                                <ShieldAlert className="w-5 h-5 text-red-500" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                            )}
                            <span className="font-bold text-white uppercase tracking-wider text-sm">
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

                    <p className="text-slate-200 text-sm mb-3">
                        {warning.message}
                    </p>

                    <div className="flex gap-2">
                        {warning.suggestedActions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={() => resolveWarning(warning.id)}
                                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors border border-slate-600"
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
