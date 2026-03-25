import React, { useEffect, useRef, useState } from 'react';
import { useTranscription } from '../../contexts/TranscriptionContext';
import { TranscriptionMessage } from '../../services/transcriptionService';
import { MessageSquare, User } from 'lucide-react';

export const LiveTranscript: React.FC = () => {
    const { transcripts, currentInterimText, isActive } = useTranscription();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcripts, currentInterimText, autoScroll]);

    if (!isActive && transcripts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-12 text-center glass-card border border-white/5 rounded-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-mesh-gradient opacity-10"></div>
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:bg-harx-alt-500/10 transition-all duration-700 relative z-10">
                    <MessageSquare className="w-10 h-10 opacity-20 group-hover:text-harx-alt-400 group-hover:opacity-100 transition-all duration-700" />
                </div>
                <p className="text-xl font-black text-white tracking-tight uppercase relative z-10">Live Transcription Hub</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 relative z-10">Waiting for live audio stream initialization</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full glass-card overflow-hidden shadow-2xl border border-white/5 relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-harx-alt-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-harx-alt-500/10 transition-all duration-1000"></div>
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/2 relative z-10">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-harx-alt-500/10 rounded-xl">
                        <MessageSquare className="w-5 h-5 text-harx-alt-400" />
                    </div>
                    <h3 className="text-white font-black tracking-widest uppercase">Live Transcript</h3>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl transition-all duration-300 border ${autoScroll ? 'bg-harx-500 text-white border-harx-500 shadow-lg shadow-harx-500/20' : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10'}`}
                    >
                        {autoScroll ? 'Scroll: Auto' : 'Scroll: Manual'}
                    </button>
                    {isActive && (
                        <div className="flex items-center space-x-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                            <span className="text-[9px] text-emerald-400 font-black uppercase tracking-[0.2em]">LIVE</span>
                        </div>
                    )}
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-transparent relative z-10"
            >
                {transcripts.map((entry: TranscriptionMessage, idx: number) => (
                    <div key={idx} className="flex flex-col space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 ${entry.speaker === 'agent' ? 'bg-harx-500/20 text-harx-400' : 'bg-harx-alt-500/20 text-harx-alt-400'}`}>
                                    <User className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                    {entry.speaker === 'agent' ? 'Intelligence Hub' : 'External Signal'}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-600 font-black tracking-widest uppercase">
                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </div>
                        <div className={`rounded-2xl rounded-tl-none px-5 py-4 text-sm font-medium tracking-tight shadow-xl backdrop-blur-xl border ${entry.speaker === 'agent' ? 'bg-white/5 border-white/10 text-white' : 'bg-harx-alt-500/5 border-harx-alt-500/10 text-slate-200'}`}>
                            {entry.text}
                        </div>
                    </div>
                ))}

                {currentInterimText && (
                    <div className="flex flex-col space-y-2 animate-in fade-in duration-300">
                        <div className="flex items-center space-x-3 px-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-harx-alt-400 animate-bounce shadow-[0_0_8px_rgba(var(--color-harx-alt-400),0.4)]"></div>
                            <span className="text-[10px] font-black text-harx-alt-400/80 uppercase tracking-[0.2em]">Processing Signal...</span>
                        </div>
                        <div className="bg-white/2 border border-white/5 rounded-2xl rounded-tl-none px-5 py-4 text-slate-400 text-sm italic font-medium leading-relaxed opacity-60 backdrop-blur-md">
                            {currentInterimText}
                        </div>
                    </div>
                )}

                {isActive && transcripts.length === 0 && !currentInterimText && (
                    <div className="flex flex-col items-center justify-center h-full opacity-40 py-20">
                        <div className="w-16 h-16 relative mb-6">
                            <div className="absolute inset-0 border-4 border-harx-500/10 rounded-2xl"></div>
                            <div className="absolute inset-0 border-4 border-transparent border-t-harx-500 rounded-2xl animate-spin"></div>
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Decoding Signal Stream...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveTranscript;

