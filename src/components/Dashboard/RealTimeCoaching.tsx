import React from 'react';
import { useTranscription } from '../../contexts/TranscriptionContext';
import { Lightbulb, TrendingUp, Info, AlertTriangle, CheckCircle } from 'lucide-react';

export const RealTimeCoaching: React.FC = () => {
    const { currentPhase, nextStepSuggestion, analysisConfidence, isActive } = useTranscription();

    if (!isActive && !nextStepSuggestion) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-12 text-center glass-card border border-white/5 rounded-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-mesh-gradient opacity-5"></div>
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:bg-harx-500/10 transition-all duration-700 relative z-10">
                    <Lightbulb className="w-10 h-10 opacity-20 group-hover:text-harx-400 group-hover:opacity-100 transition-all duration-700" />
                </div>
                <p className="text-xl font-black text-white tracking-tight uppercase relative z-10">AI Coaching Hub</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 relative z-10">Awaiting conversation stream for live tactical advice</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full glass-card overflow-hidden shadow-2xl border border-white/5 transition-all duration-500 group">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/2">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-harx-500/10 rounded-xl">
                        <Lightbulb className="w-5 h-5 text-harx-500" />
                    </div>
                    <h3 className="text-white font-black tracking-widest uppercase">Real-Time Coaching</h3>
                </div>
                {analysisConfidence > 0 && (
                    <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Confidence:</span>
                        <span className="text-[10px] text-harx-400 font-black tracking-widest">{Math.round(analysisConfidence * 100)}%</span>
                    </div>
                )}
            </div>

        <div className="flex-1 p-6 space-y-8 bg-transparent overflow-y-auto custom-scrollbar">
            {/* Current Call Phase */}
            <div className="space-y-4">
                <div className="flex items-center space-x-3 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                    <TrendingUp className="w-4 h-4 text-harx-alt-400" />
                    <span>Current Strategic Position</span>
                </div>
                <div className="bg-gradient-harx/10 border-l-4 border-harx-500/50 rounded-2xl rounded-l-none p-5 shadow-inner backdrop-blur-xl group/phase transition-all hover:bg-gradient-harx/20 duration-500">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover/phase:scale-110 transition-transform duration-500">
                            <span className="text-2xl">🎯</span>
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-harx-400 mb-1">State Verified</div>
                            <div className="text-2xl font-black text-white leading-none tracking-tight capitalize">{currentPhase || 'Intro / Opening'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Next Step Suggestion */}
            <div className="space-y-4">
                <div className="flex items-center space-x-3 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                    <Lightbulb className="w-4 h-4 text-harx-500" />
                    <span>Tactical Advice</span>
                </div>
                <div className={`rounded-2xl p-6 border shadow-2xl transition-all duration-1000 backdrop-blur-3xl relative overflow-hidden group/advice ${nextStepSuggestion
                        ? 'bg-white/5 border-harx-500/30 animate-in zoom-in-95'
                        : 'bg-white/2 border-white/5 opacity-40'
                    }`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-harx-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-1000 group-hover/advice:bg-harx-500/20"></div>
                    {nextStepSuggestion ? (
                        <div className="space-y-6 relative z-10">
                            <p className="text-white text-lg font-bold leading-relaxed italic tracking-tight">
                                "{nextStepSuggestion}"
                            </p>
                            <div className="flex items-center gap-4 pt-2">
                                <button className="flex-1 text-[10px] bg-harx-500 hover:bg-harx-600 text-white font-black py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg shadow-harx-500/20 uppercase tracking-[0.2em]">
                                    Execute Tactics
                                </button>
                                <button className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white font-black py-3 px-6 rounded-xl transition-all uppercase tracking-widest">
                                    Refine
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-8 text-slate-500 italic text-[10px] font-black uppercase tracking-widest">
                            <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center mb-4 animate-pulse">
                                <Info className="w-6 h-6 opacity-30" />
                            </div>
                            Awaiting context for next tactical move...
                        </div>
                    )}
                </div>
            </div>

            {/* Dynamic Tips based on detected intent */}
            <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 hover:bg-emerald-500/10 transition-colors duration-500">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-1 bg-emerald-500/20 rounded-lg">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Success Signal</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-300 leading-tight">Positive response detected regarding pricing structure.</p>
                </div>
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 hover:bg-rose-500/10 transition-colors duration-500">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-1 bg-rose-500/20 rounded-lg">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        </div>
                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Risk Signal</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-300 leading-tight">Hesitation patterns identified in current rebuttal.</p>
                </div>
            </div>
        </div>
        </div>
    );
};

export default RealTimeCoaching;

