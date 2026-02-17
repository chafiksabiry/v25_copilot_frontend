import React, { useEffect, useRef, useState } from 'react';
import { useTranscription } from '../../contexts/TranscriptionContext';
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
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center bg-[#1b253a]/30 rounded-xl border border-dashed border-slate-700">
                <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">Live Transcript</p>
                <p className="text-sm">Start a call to see real-time transcription</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#1b253a] rounded-xl border border-slate-700 overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-[#232f47]">
                <div className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-white font-bold">Live Transcript</h3>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${autoScroll ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                    >
                        {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                    </button>
                    {isActive && (
                        <div className="flex items-center space-x-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs text-green-400 font-mono font-medium">LIVE</span>
                        </div>
                    )}
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0f172a]"
            >
                {transcripts.map((entry, idx) => (
                    <div key={idx} className="flex flex-col space-y-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                    <User className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {entry.type === 'final' ? 'Participant' : 'Agent'}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </div>
                        <div className="bg-[#1e293b] border border-slate-800 rounded-lg px-4 py-3 text-slate-100 text-sm shadow-sm leading-relaxed">
                            {entry.text}
                        </div>
                    </div>
                ))}

                {currentInterimText && (
                    <div className="flex flex-col space-y-1 animate-in fade-in duration-150">
                        <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                            <span className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-wider">Processing...</span>
                        </div>
                        <div className="bg-[#1e293b]/50 border border-slate-800/50 rounded-lg px-4 py-3 text-slate-400 text-sm italic leading-relaxed">
                            {currentInterimText}
                        </div>
                    </div>
                )}

                {isActive && transcripts.length === 0 && !currentInterimText && (
                    <div className="flex flex-col items-center justify-center h-full opacity-40 py-12">
                        <div className="w-12 h-12 relative mb-4">
                            <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
                        </div>
                        <p className="text-slate-400 text-sm font-medium">Listening for audio...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveTranscript;
