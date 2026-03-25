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
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-12 text-center glass-card border border-pink-100/30 rounded-2xl relative overflow-hidden group shadow-sm bg-white/70">
                <div className="absolute inset-0 bg-mesh-gradient opacity-30"></div>
                <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mb-6 border border-pink-100 group-hover:bg-harx-alt-50 transition-all duration-700 relative z-10 shadow-sm">
                    <MessageSquare className="w-10 h-10 text-slate-200 group-hover:text-harx-alt-500 transition-all duration-700" />
                </div>
                <p className="text-xl font-black text-slate-900 tracking-tight uppercase relative z-10">Live Transcription Hub</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 relative z-10">Waiting for live audio stream initialization</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full glass-card overflow-hidden shadow-lg border border-pink-100/30 relative group bg-white/80 backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-harx-alt-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-harx-alt-500/10 transition-all duration-1000"></div>
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 relative z-10">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <MessageSquare className="w-5 h-5 text-harx-alt-500" />
                    </div>
                    <h3 className="text-slate-900 font-black tracking-widest uppercase">Live Transcript</h3>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl transition-all duration-300 border ${autoScroll ? 'bg-harx-500 text-white border-harx-500 shadow-md shadow-harx-500/20' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                    >
                        {autoScroll ? 'Scroll: Auto' : 'Scroll: Manual'}
                    </button>
                    {isActive && (
                        <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                            <span className="text-[9px] text-emerald-600 font-black uppercase tracking-[0.2em]">LIVE</span>
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
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${entry.speaker === 'agent' ? 'bg-pink-50 text-harx-500 border-pink-100 shadow-sm' : 'bg-harx-alt-50 text-harx-alt-500 border-harx-alt-100 shadow-sm'}`}>
                                    <User className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    {entry.speaker === 'agent' ? 'Intelligence Hub' : 'External Signal'}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase italic">
                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </div>
                        <div className={`rounded-2xl rounded-tl-none px-5 py-4 text-sm font-bold tracking-tight shadow-sm border ${entry.speaker === 'agent' ? 'bg-white border-slate-100 text-slate-900' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            {entry.text}
                        </div>
                    </div>
                ))}

                {currentInterimText && (
                    <div className="flex flex-col space-y-2 animate-in fade-in duration-300">
                        <div className="flex items-center space-x-3 px-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-harx-alt-500 animate-bounce shadow-[0_0_8px_rgba(var(--color-harx-alt-500),0.4)]"></div>
                            <span className="text-[10px] font-black text-harx-alt-500/80 uppercase tracking-[0.2em]">Processing Signal...</span>
                        </div>
                        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl rounded-tl-none px-5 py-4 text-slate-400 text-sm italic font-bold leading-relaxed opacity-60 backdrop-blur-md">
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

