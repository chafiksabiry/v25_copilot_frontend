import React, { useState } from 'react';
import { PhoneOff, CheckSquare, BarChart2, Brain, Shield, Target, Volume2, Activity, TrendingUp, MicOff, Mic, VolumeX } from 'lucide-react';
import StatusCard from './StatusCard';
import { useAgent } from '../../contexts/AgentContext';
import { useTranscription } from '../../contexts/TranscriptionContext';

const TopStatusBar: React.FC = () => {
  const { state } = useAgent();
  const {
    currentPhase: aiCurrentPhase,
    analysisConfidence,
    isActive: isTranscriptionActive,
    simulationProgress
  } = useTranscription();

  const [callExpanded, setCallExpanded] = useState(false);
  const [metricsExpanded, setMetricsExpanded] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  // Mute/unmute microphone
  const handleToggleMic = () => {
    if (state.mediaStream) {
      state.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = !isMicMuted;
      });
      setIsMicMuted(m => !m);
    }
  };

  // Mute/unmute speaker (output)
  // Note: This only toggles a local state; actual output mute requires control of an <audio> element
  const handleToggleSpeaker = () => {
    setIsSpeakerMuted(m => !m);
    // If you have an <audio> element, you can set its volume or muted property here
    // Example: document.getElementById('call-audio')?.muted = !isSpeakerMuted;
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
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="bg-[#232f47]/50 absolute inset-0 rounded-xl" />
          </div>
          <div className="pointer-events-none w-full h-full">
            <StatusCard
              icon={<CheckSquare size={20} className="text-slate-200" />}
              title="Recording"
              value={<span className="bg-[#22304a] px-3 py-1 rounded-full text-xs font-semibold text-slate-200">STOPPED</span>}
            />
          </div>
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
          />
        </div>
        <div className="relative w-full h-full">
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="bg-[#232f47]/50 absolute inset-0 rounded-xl" />
          </div>
          <div className="pointer-events-none w-full h-full">
            <StatusCard
              icon={<Brain size={20} className="text-purple-400" />}
              title="Profile"
              value={<span className="text-slate-400 font-semibold">Analyzing...</span>}
              expandable
              expanded={profileExpanded}
              onToggle={() => setProfileExpanded(e => !e)}
            />
          </div>
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
          />
        </div>
        <div className="relative w-full h-full">
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="bg-[#232f47]/50 absolute inset-0 rounded-xl" />
          </div>
          <div className="pointer-events-none w-full h-full">
            <StatusCard
              icon={<Target size={20} className="text-cyan-400" />}
              title="Transaction"
              value={<span className="text-red-400 font-extrabold">0%</span>}
              subtitle={<span>Success Rate</span>}
              status="danger"
            />
          </div>
        </div>
        <div className="relative w-full h-full">
          <StatusCard
            icon={<Volume2 size={20} className="text-blue-400" />}
            title="Audio"
            value={
              <div className="w-full">
                <div className="w-full h-3 bg-[#3a4661] rounded-full mt-2">
                  <div className="bg-blue-400 h-3 rounded-full transition-all duration-300" style={{ width: `${simulationProgress}%` }}></div>
                </div>
                <span className="block mt-2 text-blue-400 text-sm text-left">{Math.round(simulationProgress)}%</span>
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
          />
        </div>
        <div className="relative w-full h-full">
          <StatusCard
            icon={<TrendingUp size={20} className="text-yellow-400" />}
            title="Phase"
            value={<span className="text-yellow-400 font-semibold whitespace-nowrap">{aiCurrentPhase || 'No active phase'}</span>}
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
              <div className="flex space-x-3">
                <button
                  className="bg-[#1b253a] p-3 rounded-lg text-slate-300 hover:bg-[#22304a]"
                  onClick={handleToggleMic}
                  aria-label={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMicMuted ? <MicOff size={20} className="text-slate-300" /> : <Mic size={20} className="text-slate-300" />}
                </button>
                <button
                  className="bg-[#1b253a] p-3 rounded-lg text-slate-300 hover:bg-[#22304a]"
                  onClick={handleToggleSpeaker}
                  aria-label={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
                >
                  {isSpeakerMuted ? <VolumeX size={20} className="text-slate-300" /> : <Volume2 size={20} className="text-slate-300" />}
                </button>
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
            {/* Recording Status */}
            <div className="flex-1">
              <div className="text-lg font-semibold text-white mb-2">Recording Status</div>
              <div className="bg-[#1b253a] rounded-lg p-4 flex items-center space-x-2">
                <input type="checkbox" checked={false} readOnly className="accent-blue-500" />
                <span className="text-slate-200">Recording Stopped</span>
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
                <span className="text-pink-400 text-xl mr-2">🎯</span>
                <span className="font-bold text-white text-lg">Clarity</span>
              </div>
              <span className={`text-2xl font-bold mb-2 ${state.callMetrics.clarity < 50 ? 'text-red-400' : 'text-green-400'}`}>{Math.round(state.callMetrics.clarity)}%</span>
              <div className="w-full h-2 bg-[#3a4661] rounded-full">
                <div className="bg-pink-400 h-2 rounded-full transition-all duration-500" style={{ width: `${state.callMetrics.clarity}%` }}></div>
              </div>
            </div>
            {/* Empathy */}
            <div className="bg-[#26314a] rounded-lg p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <span className="text-pink-400 text-xl mr-2">❤️</span>
                <span className="font-bold text-white text-lg">Empathy</span>
              </div>
              <span className={`text-2xl font-bold mb-2 ${state.callMetrics.empathy < 50 ? 'text-red-400' : 'text-green-400'}`}>{Math.round(state.callMetrics.empathy)}%</span>
              <div className="w-full h-2 bg-[#3a4661] rounded-full">
                <div className="bg-pink-400 h-2 rounded-full transition-all duration-500" style={{ width: `${state.callMetrics.empathy}%` }}></div>
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
    </div>
  );
};

export default TopStatusBar; 