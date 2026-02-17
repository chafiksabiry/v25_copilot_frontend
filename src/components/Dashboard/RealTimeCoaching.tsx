import React from 'react';
import { useTranscription } from '../../contexts/TranscriptionContext';
import { Lightbulb, TrendingUp, Info, AlertTriangle, CheckCircle } from 'lucide-react';

export const RealTimeCoaching: React.FC = () => {
    const { currentPhase, nextStepSuggestion, analysisConfidence, isActive } = useTranscription();

    if (!isActive && !nextStepSuggestion) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center bg-[#1b253a]/30 rounded-xl border border-dashed border-slate-700">
                <Lightbulb className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">AI Coaching</p>
                <p className="text-sm">Suggestions will appear here during the call</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#1b253a] rounded-xl border border-slate-700 overflow-hidden shadow-lg transition-all duration-500">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-[#232f47]">
                <div className="flex items-center space-x-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-white font-bold">Real-Time Coaching</h3>
                </div>
                {analysisConfidence > 0 && (
                    <div className="flex items-center space-x-2 bg-slate-800/50 px-2 py-1 rounded">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Conf:</div>
                        <div className="text-[10px] text-cyan-400 font-mono font-bold">{Math.round(analysisConfidence * 100)}%</div>
                    </div>
                )}
            </div>

            <div className="flex-1 p-5 space-y-6 bg-gradient-to-b from-[#1b253a] to-[#10192e] overflow-y-auto custom-scrollbar">
                {/* Current Call Phase */}
                <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <TrendingUp className="w-4 h-4 text-purple-400" />
                        <span>Detected Phase</span>
                    </div>
                    <div className="bg-[#2d3a5a] border border-purple-500/30 rounded-lg p-4 shadow-inner">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center border border-purple-500/50">
                                <span className="text-xl">🎯</span>
                            </div>
                            <div>
                                <div className="text-xl font-bold text-white leading-tight">{currentPhase || 'Intro / Opening'}</div>
                                <div className="text-xs text-slate-400 mt-1">AI verified current state</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Next Step Suggestion */}
                <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <Lightbulb className="w-4 h-4 text-yellow-400" />
                        <span>Next Step Suggestion</span>
                    </div>
                    <div className={`rounded-xl p-5 border shadow-lg transition-all duration-700 ${nextStepSuggestion
                            ? 'bg-yellow-900/20 border-yellow-500/40 animate-in zoom-in-95'
                            : 'bg-slate-800/20 border-slate-700 opacity-60'
                        }`}>
                        {nextStepSuggestion ? (
                            <div className="space-y-4">
                                <p className="text-white text-base font-medium leading-relaxed italic">
                                    "{nextStepSuggestion}"
                                </p>
                                <div className="flex items-center space-x-3 pt-2">
                                    <button className="text-[10px] bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-1 px-3 rounded-full transition-all active:scale-95 shadow-lg shadow-yellow-500/20 uppercase tracking-tighter">
                                        Apply Suggestion
                                    </button>
                                    <button className="text-[10px] border border-slate-600 text-slate-400 font-bold py-1 px-3 rounded-full hover:bg-slate-700 transition-all uppercase tracking-tighter">
                                        Refine
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-4 text-slate-400 italic text-sm">
                                <Info className="w-5 h-5 mb-2 opacity-50" />
                                Waiting for sufficient context...
                            </div>
                        )}
                    </div>
                </div>

                {/* Dynamic Tips based on detected intent */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-[10px] font-bold text-green-400 uppercase">Success Signal</span>
                        </div>
                        <p className="text-[10px] text-slate-300">Client is curious about pricing.</p>
                    </div>
                    <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            <span className="text-[10px] font-bold text-red-400 uppercase">Risk Signal</span>
                        </div>
                        <p className="text-[10px] text-slate-300">Tone sounds slightly hesitant.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RealTimeCoaching;
