import React, { useState } from 'react';
import { PhoneOff, BarChart2, Brain, Shield, Target, Volume2, Activity, TrendingUp, MicOff, Mic, CheckSquare, Play, Headphones } from 'lucide-react';
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

  // Mute/unmute microphone
  const handleToggleMic = () => {
    dispatch({ type: 'TOGGLE_MIC' });
  };

  // Toggle audio output mode (Speaker vs Headset)
  const handleToggleSpeaker = () => {
    dispatch({ type: 'TOGGLE_OUTPUT_MODE' });
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
    <div className="w-full max-w-[1800px] mx-auto px-2 py-2 overflow-x-auto">
      <div className="grid grid-cols-9 gap-2 h-[120px]">
        <StatusCard
          icon={<PhoneOff size={20} className="text-slate-200" />}
          title="Call"
          value={state.callState.isActive
            ? <span className="text-green-400 font-semibold">Active</span>
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
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-bold transition-all shadow-lg ${state.callState.isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
              >
                <Mic size={10} fill={state.callState.isRecording ? "white" : "none"} />
                <span>{state.callState.isRecording ? 'STOP REC' : 'START REC'}</span>
              </button>
            )}
          </div>
          <StatusCard
            icon={<CheckSquare size={20} className="text-slate-200" />}
            title="Recording"
            value={state.callState.isRecording ? (
              <span className="bg-red-500 px-3 py-1 rounded-full text-xs font-semibold text-white animate-pulse">RECORDING</span>
            ) : state.callState.recordingUrl ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(state.callState.recordingUrl!, '_blank');
                }}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center space-x-1 transition-colors"
              >
                <Headphones size={12} />
                <span>LISTEN</span>
              </button>
            ) : (
              <span className="bg-[#22304a] px-3 py-1 rounded-full text-xs font-semibold text-slate-200">STOPPED</span>
            )}
          />
        </div>
        <div className="relative w-full h-full">
          <StatusCard
            icon={<BarChart2 size={20} className="text-green-400" />}
            title="Metrics"
            value={<span className={`${state.callMetrics.overallScore < 50 ? 'text-red-400' : 'text-green-400'} font-extrabold`}>{Math.round(state.callMetrics.overallScore)}%</span>}
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
            icon={<Brain size={20} className="text-blue-400" />}
            title="Rep Profile"
            value={agentProfile ? (
              <span className="text-white font-bold leading-tight line-clamp-1">
                {agentProfile.personalInfo.name}
              </span>
            ) : (
              <span className="text-slate-400 font-semibold tracking-tighter">Analyzing...</span>
            )}
            subtitle={agentProfile?.professionalSummary?.currentRole && (
              <span className="text-blue-300 text-[10px] font-bold uppercase truncate block">{agentProfile.professionalSummary.currentRole}</span>
            )}
            expandable
            expanded={profileExpanded}
            onToggle={() => setProfileExpanded(e => !e)}
          />
        </div>
        <div className="relative w-full h-full">
          <StatusCard
            icon={<Shield size={20} className={state.smartWarnings.filter(w => !w.resolved).length > 0 ? "text-red-400" : "text-cyan-400"} />}
            title="Warnings"
            value={state.smartWarnings.filter(w => !w.resolved).length > 0
              ? <span className="text-red-400 font-semibold">{state.smartWarnings.filter(w => !w.resolved).length} Active</span>
              : <span className="text-green-400 font-semibold">All Clear</span>
            }
            status={state.smartWarnings.filter(w => !w.resolved).length > 0 ? "danger" : "success"}
            expandable
            expanded={warningsExpanded}
            onToggle={() => setWarningsExpanded(e => !e)}
            disabled
          />
        </div>
        <StatusCard
          icon={<Target size={20} className="text-cyan-400" />}
          title="Transaction"
          value={<span className="text-red-400 font-extrabold">0%</span>}
          subtitle={<span>Success Rate</span>}
          status="danger"
          disabled
        />
        <div className="relative w-full h-full">
          <StatusCard
            icon={state.isSpeakerPhone ? <Volume2 size={20} className="text-blue-400" /> : <Headphones size={20} className="text-blue-400" />}
            title="Audio Output"
            value={state.isSpeakerPhone ? <span className="text-blue-400 font-semibold">Speaker</span> : <span className="text-slate-300 font-semibold">Headset</span>}
            subtitle={
              <div 
                className="w-full flex items-center mt-1"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <Volume2 size={12} className={state.volume === 0 ? "text-slate-600 mr-2" : "text-blue-400 mr-2"} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={state.volume}
                  onChange={(e) => dispatch({ type: 'UPDATE_VOLUME', volume: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-[#3a4661] rounded-lg appearance-none cursor-pointer accent-blue-500"
                  title="Volume"
                />
              </div>
            }
          />
        </div>
        <div className="relative w-full h-full">
          <StatusCard
            icon={<Activity size={20} className={isTranscriptionActive ? "text-green-400" : "text-violet-400"} />}
            title="AI Status"
            value={isTranscriptionActive
              ? <div className="flex flex-col">
                <span className="text-green-400 font-semibold">Active ({Math.round(analysisConfidence * 100)}%)</span>
              </div>
              : <span className="text-slate-400 font-semibold">Idle</span>
            }
            disabled
          />
        </div>
        <div className="relative w-full h-full">
          <StatusCard
            icon={<TrendingUp size={20} className="text-yellow-400" />}
            title="Phase"
            value={<span className="text-yellow-400 font-semibold whitespace-nowrap">{state.callState.currentPhase || aiCurrentPhase || 'No active phase'}</span>}
            disabled
          />
        </div>
      </div>
      {callExpanded && (
        <div className="bg-[#232f47] rounded-xl mt-4 p-6 w-full max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Call Controls & Recording</h2>
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
              <div className="text-lg font-semibold text-white mb-2">Audio Controls</div>
              <div className="flex space-x-3 mb-4">
                <button
                  className="bg-[#1b253a] p-3 rounded-lg text-slate-300 hover:bg-[#22304a]"
                  onClick={handleToggleMic}
                  aria-label={state.isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {state.isMicMuted ? <MicOff size={20} className="text-slate-300" /> : <Mic size={20} className="text-slate-300" />}
                </button>
                <button
                  className={`p-3 rounded-lg transition-colors ${state.isSpeakerPhone ? 'bg-blue-600/20 text-blue-400' : 'bg-[#1b253a] text-slate-300 hover:bg-[#22304a]'}`}
                  onClick={handleToggleSpeaker}
                  aria-label={state.isSpeakerPhone ? 'Switch to headset' : 'Switch to speaker'}
                  title={state.isSpeakerPhone ? 'Switch to headset' : 'Switch to speaker'}
                >
                  {state.isSpeakerPhone ? <Volume2 size={20} /> : <Headphones size={20} />}
                </button>
              </div>
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Volume Application</span>
                  <span>{Math.round(state.volume * 100)}%</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Volume2 size={16} className={state.volume === 0 ? "text-slate-600" : "text-blue-400"} />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={state.volume}
                    onChange={(e) => dispatch({ type: 'UPDATE_VOLUME', volume: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-[#3a4661] rounded-lg appearance-none cursor-pointer accent-blue-500"
                    title="Attention: Le navigateur ne peut pas contrôler le volume global de Windows, uniquement le volume de l'application."
                  />
                </div>
              </div>
            </div>
            {/* Call Status */}
            <div className="flex-1">
              <div className="text-lg font-semibold text-white mb-2">Call Status</div>
              {state.callState.isActive ? (
                <span className="text-green-400 font-semibold">Active</span>
              ) : (
                <span className="text-slate-400 font-semibold">Inactive</span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold text-white mb-2">Recording Status</div>
              <div className="bg-[#1b253a] rounded-lg p-4 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${state.callState.isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`}></div>
                    <span className="text-slate-200">
                      {state.callState.isRecording ? 'Recording Live' : 'Recording Stopped'}
                    </span>
                  </div>
                  {state.callState.isActive && (
                    <button
                      onClick={handleToggleRecording}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${state.callState.isRecording
                        ? 'bg-red-900/30 text-red-500 border border-red-500/50 hover:bg-red-900/50'
                        : 'bg-green-900/30 text-green-500 border border-green-500/50 hover:bg-green-900/50'
                        }`}
                    >
                      {state.callState.isRecording ? 'STOP' : 'START'}
                    </button>
                  )}
                </div>
                {state.callState.recordingUrl && (
                  <button
                    onClick={() => window.open(state.callState.recordingUrl!, '_blank')}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors w-full justify-center"
                  >
                    <Play size={16} fill="white" />
                    <span className="font-semibold text-sm">Play Recording</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {metricsExpanded && (
        <div className="bg-[#232f47] rounded-xl mt-4 p-6 w-full max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Call Metrics Details</h2>
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
            <div className="bg-[#26314a] rounded-lg p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <span className="text-blue-400 text-xl mr-2">🎯</span>
                <span className="font-bold text-white text-lg">Clarity</span>
              </div>
              <span className={`text-2xl font-bold mb-2 ${state.callMetrics.clarity < 50 ? 'text-red-400' : 'text-green-400'}`}>{Math.round(state.callMetrics.clarity)}%</span>
              <div className="w-full h-2 bg-[#3a4661] rounded-full">
                <div className="bg-blue-400 h-2 rounded-full transition-all duration-500" style={{ width: `${state.callMetrics.clarity}%` }}></div>
              </div>
            </div>
            {/* Empathy */}
            <div className="bg-[#26314a] rounded-lg p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <span className="text-blue-400 text-xl mr-2">❤️</span>
                <span className="font-bold text-white text-lg">Empathy</span>
              </div>
              <span className={`text-2xl font-bold mb-2 ${state.callMetrics.empathy < 50 ? 'text-red-400' : 'text-green-400'}`}>{Math.round(state.callMetrics.empathy)}%</span>
              <div className="w-full h-2 bg-[#3a4661] rounded-full">
                <div className="bg-blue-400 h-2 rounded-full transition-all duration-500" style={{ width: `${state.callMetrics.empathy}%` }}></div>
              </div>
            </div>
            {/* Assertiveness */}
            <div className="bg-[#26314a] rounded-lg p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <span className="text-yellow-400 text-xl mr-2">💪</span>
                <span className="font-bold text-white text-lg">Assertiveness</span>
              </div>
              <span className={`text-2xl font-bold mb-2 ${state.callMetrics.assertiveness < 50 ? 'text-red-400' : 'text-green-400'}`}>{Math.round(state.callMetrics.assertiveness)}%</span>
              <div className="w-full h-2 bg-[#3a4661] rounded-full">
                <div className="bg-yellow-400 h-2 rounded-full transition-all duration-500" style={{ width: `${state.callMetrics.assertiveness}%` }}></div>
              </div>
            </div>
            {/* Efficiency */}
            <div className="bg-[#26314a] rounded-lg p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <span className="text-yellow-400 text-xl mr-2">⚡</span>
                <span className="font-bold text-white text-lg">Efficiency</span>
              </div>
              <span className={`text-2xl font-bold mb-2 ${state.callMetrics.efficiency < 50 ? 'text-red-400' : 'text-green-400'}`}>{Math.round(state.callMetrics.efficiency)}%</span>
              <div className="w-full h-2 bg-[#3a4661] rounded-full">
                <div className="bg-yellow-400 h-2 rounded-full transition-all duration-500" style={{ width: `${state.callMetrics.efficiency}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {warningsExpanded && (
        <div className="bg-[#232f47] rounded-xl mt-4 p-6 w-full max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Active Warnings</h2>
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
                <div key={index} className="bg-[#26314a] rounded-lg p-4 border-l-4 border-red-500">
                  <div className="flex justify-between items-start">
                    <div className="font-bold text-white">{warning.title}</div>
                    <span className="text-[10px] text-slate-400">{warning.detectedAt.toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm text-slate-200 mt-1">{warning.message}</div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Shield size={64} className="text-green-500 mb-6" />
                <span className="text-green-400 text-xl font-semibold">All systems normal</span>
              </div>
            )}
          </div>
        </div>
      )}
      {profileExpanded && agentProfile && (
        <div className="bg-[#232f47] rounded-xl mt-4 p-8 w-full max-w-[1800px] mx-auto shadow-2xl border border-blue-500/20 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg border-2 border-blue-400/30">
                {agentProfile.personalInfo.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white leading-tight">{agentProfile.personalInfo.name}</h2>
                <div className="flex items-center space-x-3 mt-1 text-blue-300 font-medium">
                  {agentProfile.professionalSummary?.currentRole && (
                    <span className="bg-blue-900/40 px-3 py-1 rounded-full text-xs uppercase tracking-widest border border-blue-500/30">
                      {agentProfile.professionalSummary.currentRole}
                    </span>
                  )}
                  <span className="text-slate-400 text-sm">{agentProfile.personalInfo.email}</span>
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

          <div className="grid grid-cols-3 gap-8 text-slate-200">
            <div className="bg-[#1b253a] rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-blue-400 font-bold uppercase text-xs mb-4 tracking-tighter">Professional Summary</h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {agentProfile.professionalSummary?.yearsOfExperience ? (
                  <>Experience: <span className="text-white font-medium">{agentProfile.professionalSummary.yearsOfExperience}</span> in sales and customer engagement.</>
                ) : "No experience summary provided."}
              </p>
            </div>

            <div className="bg-[#1b253a] rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-blue-400 font-bold uppercase text-xs mb-4 tracking-tighter">Contact & Location</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Phone</span>
                  <span className="text-slate-200 font-mono">{agentProfile.personalInfo.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Location</span>
                  <span className="text-slate-200">{agentProfile.personalInfo.location || 'Remote'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="text-green-400 flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                    Connected
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#1b253a] rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-blue-400 font-bold uppercase text-xs mb-4 tracking-tighter">Current Methodology</h3>
              <div className="flex items-center space-x-2 text-sm text-slate-300">
                <div className="bg-harx-alt-500/20 p-2 rounded-lg">
                  <Shield size={20} className="text-blue-400" />
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
