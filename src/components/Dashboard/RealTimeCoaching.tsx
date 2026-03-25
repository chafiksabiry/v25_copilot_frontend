import React from 'react';
import { useTranscription } from '../../contexts/TranscriptionContext';
import { Lightbulb, TrendingUp, Info, AlertTriangle, CheckCircle } from 'lucide-react';

export const RealTimeCoaching: React.FC = () => {
    const { currentPhase, nextStepSuggestion, analysisConfidence, isActive } = useTranscription();

    if (!isActive && !nextStepSuggestion) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-12 text-center bg-white border border-slate-100 rounded-3xl relative overflow-hidden group shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-pink-50/50 transition-all duration-1000"></div>
                <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 border border-slate-100 group-hover:bg-slate-900 group-hover:border-slate-800 transition-all duration-700 relative z-10">
                    <Lightbulb className="w-10 h-10 text-slate-200 group-hover:text-white transition-all duration-700" />
                </div>
                <p className="text-xl font-black text-slate-900 tracking-tight uppercase relative z-10 transition-colors group-hover:text-slate-900">Tactical Hub</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 relative z-10">Waiting for live audio stream initialization</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 transition-all duration-500 group">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-900 rounded-xl shadow-lg shadow-slate-900/10">
                        <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-slate-900 font-black tracking-widest uppercase">Tactical Intelligence</h3>
                </div>
                {analysisConfidence > 0 && (
                    <div className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Precision:</span>
                        <span className="text-[10px] text-slate-900 font-black tracking-widest">{Math.round(analysisConfidence * 100)}%</span>
                    </div>
                )}
            </div>

        <div className="flex-1 p-6 space-y-8 bg-transparent overflow-y-auto custom-scrollbar">
            {/* Current Call Phase */}
            <div className="space-y-4">
                <div className="flex items-center space-x-3 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    <TrendingUp className="w-4 h-4 text-slate-900" />
                    <span>Strategic Position</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 shadow-sm group/phase transition-all hover:shadow-md duration-500">
                    <div className="flex items-center space-x-5">
                        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center border border-slate-100 group-hover/phase:scale-110 transition-transform duration-500 shadow-sm">
                            <span className="text-2xl">🎯</span>
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">LIVE ANALYSIS ACTIVE</div>
                            <div className="text-2xl font-black text-slate-900 leading-none tracking-tight capitalize">{currentPhase || 'Intro / Opening'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Next Step Suggestion */}
            <div className="space-y-4">
                <div className="flex items-center space-x-3 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    <Lightbulb className="w-4 h-4 text-slate-900" />
                    <span>Tactical Advice</span>
                </div>
                <div className={`rounded-[32px] p-8 border transition-all duration-700 relative overflow-hidden group/advice shadow-xl ${nextStepSuggestion
                        ? 'bg-slate-900 border-slate-800 border-2 active:scale-[0.99]'
                        : 'bg-slate-50 border-slate-100 opacity-40'
                    }`}>
                    {nextStepSuggestion ? (
                        <div className="space-y-8 relative z-10">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-all duration-1000 group-hover/advice:bg-white/10"></div>
                            <p className="text-white text-xl font-bold leading-relaxed italic tracking-tight">
                                "{nextStepSuggestion}"
                            </p>
                            <div className="flex items-center gap-4 pt-2">
                                <button className="flex-1 text-[10px] bg-white text-slate-900 font-black py-3.5 px-6 rounded-2xl transition-all active:scale-95 shadow-xl uppercase tracking-[0.2em]">
                                    Execute Move
                                </button>
                                <button className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-black py-3.5 px-6 rounded-2xl transition-all uppercase tracking-widest">
                                    Analyze
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-10 text-slate-400 italic text-[10px] font-black uppercase tracking-[0.2em]">
                            <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center mb-6 border border-slate-100 shadow-sm animate-pulse">
                                <Info className="w-8 h-8 opacity-20" />
                            </div>
                            Protocol initiation required for tactical deployment
                        </div>
                    )}
                </div>
            </div>

            {/* Dynamic Tips based on detected intent */}
            <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-emerald-50 border border-emerald-100 rounded-[24px] p-5 hover:bg-emerald-100 transition-colors duration-500 shadow-sm group/tip">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20 transition-transform group-hover/tip:scale-110">
                            <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Optimization</span>
                    </div>
                    <p className="text-[11px] font-bold text-emerald-800 leading-relaxed">Positive response detected regarding pricing structure.</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-[24px] p-5 hover:bg-slate-100 transition-colors duration-500 shadow-sm group/tip">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-slate-900 rounded-xl shadow-lg shadow-slate-900/10 transition-transform group-hover/tip:scale-110">
                            <AlertTriangle className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Adjustment</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed">Hesitation patterns identified in current rebuttal.</p>
                </div>
            </div>
        </div>
        </div>
    );
};

export default RealTimeCoaching;

