import React, { useState, useEffect } from 'react';
import { PhoneOff, BarChart2, Brain, Shield, Target, Volume2, Activity, TrendingUp, MicOff, Mic, VolumeX, CheckSquare, Play, Headphones } from 'lucide-react';
import StatusCard from './StatusCard';
import { useAgent } from '../../contexts/AgentContext';
import { useTranscription } from '../../contexts/TranscriptionContext';
import { useAgentProfile } from '../../hooks/useAgentProfile';
import { TwilioCallService } from '../../services/twilioCallService';
import { useAudioVisualizer } from '../../hooks/useAudioVisualizer';

const TopStatusBar: React.FC = () => {
  const { state, dispatch } = useAgent();

  // Use real-time audio visualizer if stream is available
  useAudioVisualizer(state.mediaStream);
  const { profile: agentProfile } = useAgentProfile();
  const {
    currentPhase: aiCurrentPhase,
    analysisConfidence,
    isActive: isTranscriptionActive
  } = useTranscription();

  const [callExpanded, setCallExpanded] = useState(false);
  const [metricsExpanded, setMetricsExpanded] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [warningsExpanded, setWarningsExpanded] = useState(false);

  // Synchronize microphone mute with MediaStream
  useEffect(() => {
    if (state.mediaStream) {
      state.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = !state.isMicMuted;
      });
    }
  }, [state.isMicMuted, state.mediaStream]);

  // Synchronize speaker mute with volume behavior
  useEffect(() => {
    if (state.isSpeakerMuted) {
      // Opt-in behavior: muting the speaker sets app volume to 0
      if (state.volume !== 0) {
        dispatch({ type: 'UPDATE_VOLUME', volume: 0 });
      }
    } else {
        // Unmuting restores to 1 if it was 0
        if (state.volume === 0) {
            dispatch({ type: 'UPDATE_VOLUME', volume: 1 });
        }
    }
  }, [state.isSpeakerMuted, dispatch]);

  const handleToggleMic = () => {
    dispatch({ type: 'TOGGLE_MIC' });
  };

  const handleToggleSpeaker = () => {
    dispatch({ type: 'TOGGLE_SPEAKER' });
  };

  const handleToggleRecording = async () => {
    const { sid, isRecording } = state.callState;
    const userId = "6807abfc2c1ca099fe2b13c5"; // Using hardcoded agent ID for now

    if (!sid) {
      console.error('No active call SID found for recording toggle');
      return;
    }

    try {
      if (isRecording) {
        await TwilioCallService.stopRecording(sid, userId);
        dispatch({ type: 'UPDATE_CALL_STATE', callState: { isRecording: false } });
      } else {
        await TwilioCallService.startRecording(sid, userId);
        dispatch({ type: 'UPDATE_CALL_STATE', callState: { isRecording: true } });
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
    }
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto px-2 py-1 overflow-x-auto">
      <div className="grid grid-cols-9 gap-1 h-[90px]">
        <StatusCard
          icon={<PhoneOff size={20} className="text-slate-400" />}
          title="Call"
          value={state.callState.isActive
            ? <span className="text-emerald-600 font-semibold">Active</span>
            : <span className="text-slate-400 font-semibold">Inactive</span>
          }
          expandable
          expanded={callExpanded}
          onToggle={() => setCallExpanded(e => !e)}
        />
        <div className="relative w-full h-full">
          <div className="absolute inset-x-0 bottom-[-10px] z-20 flex justify-center">
            {state.callState.isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleRecording();
                }}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-bold transition-all shadow-md ${state.callState.isRecording
                  ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                  }`}
              >
                <Mic size={10} fill={state.callState.isRecording ? "white" : "none"} />
                <span>{state.callState.isRecording ? 'STOP REC' : 'START REC'}</span>
              </button>
            )}
          </div>
          <StatusCard
            icon={<CheckSquare size={20} className="text-slate-400" />}
            title="Recording"
            value={state.callState.isRecording ? (
              <span className="bg-rose-500 px-3 py-1 rounded-full text-xs font-semibold text-white animate-pulse">RECORDING</span>
            ) : state.callState.recordingUrl ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(state.callState.recordingUrl!, '_blank');
                }}
                className="bg-harx-600 hover:bg-harx-700 px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center space-x-1 transition-colors"
              >
                <Headphones size={12} />
                <span>LISTEN</span>
              </button>
            ) : (
              <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-semibold text-slate-500 border border-slate-200">STOPPED</span>
            )}
          />
        </div>
        <div className="relative w-full h-full">
          <StatusCard
            icon={<BarChart2 size={20} className="text-emerald-500" />}
            title="Metrics"
            value={<span className={`${state.callMetrics.overallScore < 50 ? 'text-rose-500' : 'text-emerald-600'} font-extrabold`}>{Math.round(state.callMetrics.overallScore)}%</span>}
            subtitle={<span>Overall Score</span>}
            status={state.callMetrics.overallScore < 50 ? "danger" : state.callMetrics.overallScore < 80 ? "warning" : "success"}
            expandable
            expanded={metricsExpanded}
            onToggle={() => setMetricsExpanded(e => !e)}
            disabled
          />
        </div>
        <div className="relative w-full h-full">
          <StatusCard
            icon={<Brain size={20} className="text-harx-alt-500" />}
            title="Rep Profile"
            value={agentProfile ? (
              <span className="text-slate-900 font-bold leading-tight line-clamp-1">
                {agentProfile.personalInfo.name}
              </span>
            ) : (
              <span className="text-slate-400 font-semibold tracking-tighter">Analyzing...</span>
            )}
            subtitle={agentProfile?.professionalSummary?.currentRole && (
              <span className="text-harx-alt-600 text-[10px] font-bold uppercase truncate block">{agentProfile.professionalSummary.currentRole}</span>
            )}
            expandable
            expanded={profileExpanded}
            onToggle={() => setProfileExpanded(e => !e)}
          />
        </div>
        <div className="relative w-full h-full">
          <StatusCard
            icon={<Shield size={20} className={state.smartWarnings.filter(w => !w.resolved).length > 0 ? "text-rose-500" : "text-cyan-600"} />}
            title="Warnings"
            value={state.smartWarnings.filter(w => !w.resolved).length > 0
              ? <span className="text-rose-600 font-semibold">{state.smartWarnings.filter(w => !w.resolved).length} Active</span>
              : <span className="text-emerald-600 font-semibold">All Clear</span>
            }
            status={state.smartWarnings.filter(w => !w.resolved).length > 0 ? "danger" : "success"}
            expandable
            expanded={warningsExpanded}
            onToggle={() => setWarningsExpanded(e => !e)}
            disabled
          />
        </div>
        <StatusCard
          icon={<Target size={20} className="text-cyan-600" />}
          title="Transaction"
          value={<span className="text-rose-600 font-extrabold">0%</span>}
          subtitle={<span>Success Rate</span>}
          status="danger"
          disabled
        />
        <div className="relative w-full h-full">
          <StatusCard
            icon={<Volume2 size={20} className="text-harx-500" />}
            title="Volume Control"
            value={
              <div className="w-full h-full flex flex-col justify-end pb-1">
                <div className="relative group/slider mt-1">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={state.volume}
                    onChange={(e) => dispatch({ type: 'UPDATE_VOLUME', volume: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-harx-500 hover:accent-harx-400 transition-all border border-slate-200"
                  />
                  <div 
                    className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-harx-500 text-[10px] font-black px-2 py-0.5 rounded border border-slate-200 opacity-0 group-hover/slider:opacity-100 transition-opacity pointer-events-none shadow-md"
                  >
                    {Math.round(state.volume * 100)}%
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1 px-1">
                  <span className="text-[10px] font-black text-harx-500 tracking-tighter uppercase">{Math.round(state.volume * 100)}%</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div 
                        key={i} 
                        className={`w-1 h-3 rounded-full transition-all duration-300 ${state.audioLevel * 5 >= i ? 'bg-harx-500 shadow-[0_0_5px_rgba(255,77,77,0.3)]' : 'bg-slate-200'}`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            }
          />
        </div>
        <div className="relative w-full h-full">
          <StatusCard
            icon={<Activity size={20} className={isTranscriptionActive ? "text-emerald-500" : "text-violet-500"} />}
            title="AI Status"
            value={isTranscriptionActive
              ? <div className="flex flex-col">
                <span className="text-emerald-600 font-semibold">Active ({Math.round(analysisConfidence * 100)}%)</span>
              </div>
              : <span className="text-slate-400 font-semibold">Idle</span>
            }
            disabled
          />
        </div>
        <div className="relative w-full h-full">
          <StatusCard
            icon={<TrendingUp size={20} className="text-orange-500" />}
            title="Phase"
            value={<span className="text-orange-600 font-semibold whitespace-nowrap">{state.callState.currentPhase || aiCurrentPhase || 'No active phase'}</span>}
            disabled
          />
        </div>
      </div>
      {callExpanded && (
        <div className="bg-white/80 rounded-xl mt-4 p-6 w-full max-w-[1800px] mx-auto border border-slate-200 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Call Controls & Recording</h2>
            <button
              className="text-slate-400 hover:text-white text-xl"
              onClick={() => setCallExpanded(false)}
              aria-label="Collapse call controls"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg>
            </button>
          </div>
          <div className="flex gap-x-16">
            {/* Audio Controls */}
            <div className="flex-1">
              <div className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">Audio Controls</div>
              <div className="flex space-x-3">
                <button
                  className="bg-slate-50 p-3 rounded-lg text-slate-400 hover:bg-slate-100 border border-slate-200"
                  onClick={handleToggleMic}
                  aria-label={state.isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {state.isMicMuted ? <MicOff size={20} className="text-rose-500" /> : <Mic size={20} className="text-slate-400" />}
                </button>
                <button
                  className={`p-3 rounded-lg transition-all border ${state.isSpeakerMuted ? 'bg-rose-50 border-rose-100 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                  onClick={handleToggleSpeaker}
                  aria-label={state.isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
                >
                  {state.isSpeakerMuted ? <VolumeX size={20} className="text-rose-500" /> : <Volume2 size={20} className="text-slate-400" />}
                </button>
              </div>
            </div>
            {/* Call Status */}
            <div className="flex-1">
              <div className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">Call Status</div>
              {state.callState.isActive ? (
                <span className="text-emerald-600 font-black uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">Active</span>
              ) : (
                <span className="text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">Inactive</span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">Recording Status</div>
              <div className="bg-slate-50 rounded-lg p-4 flex flex-col space-y-3 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${state.callState.isRecording ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <span className="text-slate-600 font-bold uppercase text-xs tracking-widest">
                      {state.callState.isRecording ? 'Recording Live' : 'Recording Stopped'}
                    </span>
                  </div>
                  {state.callState.isActive && (
                    <button
                      onClick={handleToggleRecording}
                      className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${state.callState.isRecording
                        ? 'bg-rose-100 text-rose-600 border border-rose-200 hover:bg-rose-200'
                        : 'bg-emerald-100 text-emerald-600 border border-emerald-200 hover:bg-emerald-200'
                        }`}
                    >
                      {state.callState.isRecording ? 'STOP' : 'START'}
                    </button>
                  )}
                </div>
                {state.callState.recordingUrl && (
                  <button
                    onClick={() => window.open(state.callState.recordingUrl!, '_blank')}
                    className="flex items-center space-x-2 bg-harx-600 hover:bg-harx-700 text-white px-4 py-2 rounded-lg transition-colors w-full justify-center shadow-md shadow-harx-500/20"
                  >
                    <Play size={16} fill="white" />
                    <span className="font-black text-xs uppercase tracking-widest">Play Recording</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {metricsExpanded && (
        <div className="bg-white/80 rounded-xl mt-4 p-6 w-full max-w-[1800px] mx-auto border border-slate-200 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Call Metrics Details</h2>
            <button
              className="text-slate-400 hover:text-white text-xl"
              onClick={() => setMetricsExpanded(false)}
              aria-label="Collapse metrics details"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-6">
            {/* Clarity */}
            <div className="bg-slate-50 rounded-lg p-4 flex flex-col border border-slate-100">
              <div className="flex items-center mb-2">
                <span className="text-harx-alt-500 text-xl mr-2">🎯</span>
                <span className="font-black text-slate-900 text-sm uppercase tracking-widest">Clarity</span>
              </div>
              <span className={`text-2xl font-black mb-2 ${state.callMetrics.overallScore < 50 ? 'text-rose-600' : 'text-emerald-600'}`}>{Math.round(state.callMetrics.clarity)}%</span>
              <div className="w-full h-1.5 bg-slate-200 rounded-full">
                <div className="bg-harx-alt-500 h-1.5 rounded-full transition-all duration-500 shadow-sm shadow-harx-alt-500/20" style={{ width: `${state.callMetrics.clarity}%` }}></div>
              </div>
            </div>
            {/* Empathy */}
            <div className="bg-slate-50 rounded-lg p-4 flex flex-col border border-slate-100">
              <div className="flex items-center mb-2">
                <span className="text-harx-alt-500 text-xl mr-2">❤️</span>
                <span className="font-black text-slate-900 text-sm uppercase tracking-widest">Empathy</span>
              </div>
              <span className={`text-2xl font-black mb-2 ${state.callMetrics.empathy < 50 ? 'text-rose-600' : 'text-emerald-600'}`}>{Math.round(state.callMetrics.empathy)}%</span>
              <div className="w-full h-1.5 bg-slate-200 rounded-full">
                <div className="bg-harx-alt-500 h-1.5 rounded-full transition-all duration-500 shadow-sm shadow-harx-alt-500/20" style={{ width: `${state.callMetrics.empathy}%` }}></div>
              </div>
            </div>
            {/* Assertiveness */}
            <div className="bg-slate-50 rounded-lg p-4 flex flex-col border border-slate-100">
              <div className="flex items-center mb-2">
                <span className="text-orange-500 text-xl mr-2">💪</span>
                <span className="font-black text-slate-900 text-sm uppercase tracking-widest">Assertiveness</span>
              </div>
              <span className={`text-2xl font-black mb-2 ${state.callMetrics.assertiveness < 50 ? 'text-rose-600' : 'text-emerald-600'}`}>{Math.round(state.callMetrics.assertiveness)}%</span>
              <div className="w-full h-1.5 bg-slate-200 rounded-full">
                <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-500 shadow-sm shadow-orange-500/20" style={{ width: `${state.callMetrics.assertiveness}%` }}></div>
              </div>
            </div>
            {/* Efficiency */}
            <div className="bg-slate-50 rounded-lg p-4 flex flex-col border border-slate-100">
              <div className="flex items-center mb-2">
                <span className="text-orange-500 text-xl mr-2">⚡</span>
                <span className="font-black text-slate-900 text-sm uppercase tracking-widest">Efficiency</span>
              </div>
              <span className={`text-2xl font-black mb-2 ${state.callMetrics.efficiency < 50 ? 'text-rose-600' : 'text-emerald-600'}`}>{Math.round(state.callMetrics.efficiency)}%</span>
              <div className="w-full h-1.5 bg-slate-200 rounded-full">
                <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-500 shadow-sm shadow-orange-500/20" style={{ width: `${state.callMetrics.efficiency}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {warningsExpanded && (
        <div className="bg-white/80 rounded-xl mt-4 p-6 w-full max-w-[1800px] mx-auto border border-slate-200 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Active Warnings</h2>
            <button
              className="text-slate-400 hover:text-white text-xl"
              onClick={() => setWarningsExpanded(false)}
              aria-label="Collapse warnings details"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg>
            </button>
          </div>
          <div className="flex flex-col gap-4 w-full">
            {state.smartWarnings.filter(w => !w.resolved).length > 0 ? (
              state.smartWarnings.filter(w => !w.resolved).map((warning, index) => (
                <div key={index} className="bg-rose-50 rounded-lg p-4 border-l-4 border-rose-500 border border-rose-100">
                  <div className="flex justify-between items-start">
                    <div className="font-black text-rose-900 uppercase text-xs tracking-widest">{warning.title}</div>
                    <span className="text-[10px] text-rose-400 font-bold">{warning.detectedAt.toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm text-rose-700 mt-1 font-medium">{warning.message}</div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Shield size={64} className="text-emerald-500 mb-6 opacity-20" />
                <span className="text-emerald-600 text-xl font-black uppercase tracking-widest">All systems normal</span>
              </div>
            )}
          </div>
        </div>
      )}
      {profileExpanded && agentProfile && (
        <div className="bg-white/90 rounded-2xl mt-4 p-8 w-full max-w-[1800px] mx-auto shadow-2xl border border-pink-100 animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-harx rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-harx-500/20 border-2 border-white transform rotate-3">
                {agentProfile.personalInfo.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 leading-tight tracking-tight uppercase">{agentProfile.personalInfo.name}</h2>
                <div className="flex items-center space-x-3 mt-1 text-harx-alt-600 font-bold uppercase tracking-widest text-[10px]">
                  {agentProfile.professionalSummary?.currentRole && (
                    <span className="bg-harx-alt-50 px-3 py-1 rounded-full border border-harx-alt-100">
                      {agentProfile.professionalSummary.currentRole}
                    </span>
                  )}
                  <span className="text-slate-400">{agentProfile.personalInfo.email}</span>
                </div>
              </div>
            </div>
            <button
              className="text-slate-400 hover:text-white transition-colors"
              onClick={() => setProfileExpanded(false)}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-8 text-slate-600">
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-harx-alt-600 font-black uppercase text-[10px] mb-4 tracking-[0.2em]">Professional Summary</h3>
              <p className="text-sm leading-relaxed text-slate-500 font-medium">
                {agentProfile.professionalSummary?.yearsOfExperience ? (
                  <>Experience: <span className="text-slate-900 font-black">{agentProfile.professionalSummary.yearsOfExperience}</span> in sales and customer engagement.</>
                ) : "No experience summary provided."}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-harx-alt-600 font-black uppercase text-[10px] mb-4 tracking-[0.2em]">Contact & Location</h3>
              <div className="space-y-3 text-sm font-bold uppercase tracking-widest text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone</span>
                  <span className="text-slate-900 font-mono">{agentProfile.personalInfo.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Location</span>
                  <span className="text-slate-900">{agentProfile.personalInfo.location || 'Remote'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className="text-emerald-600 flex items-center">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                    Connected
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-harx-alt-600 font-black uppercase text-[10px] mb-4 tracking-[0.2em]">Current Methodology</h3>
              <div className="flex items-center space-x-3 text-sm text-slate-700 font-bold uppercase tracking-widest text-[10px]">
                <div className="bg-harx-alt-500/10 p-2.5 rounded-xl">
                  <Shield size={20} className="text-harx-alt-500" />
                </div>
                <span>REPS Adaptive Coaching Active</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopStatusBar; 
