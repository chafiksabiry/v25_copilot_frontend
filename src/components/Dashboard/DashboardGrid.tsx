import React, { useState, useRef } from 'react';
import { CallPhasesDisplay } from './CallPhasesDisplay';
import StatusCard from './StatusCard';
import { Brain, Radar, MapPin, GraduationCap, Target, Lightbulb, FileText, ArrowUp } from 'lucide-react';
import DiscPersonalityAnalysis from './DiscPersonalityAnalysis';
import TransactionProgressDetails from './TransactionProgressDetails';
import CallStructureGuideDetails from './CallStructureGuideDetails';
import CoachingDetails from './CoachingDetails';
import TargetingDetails from './TargetingDetails';
import RecommendationsDetails from './RecommendationsDetails';
import { RealTimeCoaching } from './RealTimeCoaching';
import { LiveTranscript } from './LiveTranscript';
import { KnowledgeBase } from './KnowledgeBase';
import { useAgent } from '../../contexts/AgentContext';
import SmartWarningSystem from './SmartWarningSystem';

// Placeholders stylés pour les widgets vides
/*
const PlaceholderCard = ({ icon, title, subtitle }: { icon: React.ReactNode, title: string, subtitle: string }) => (
  <div className="bg-[#232f47] rounded-xl flex flex-col items-center justify-center p-6 min-h-[140px] h-full">
    <div className="mb-2">{icon}</div>
    <div className="text-white font-semibold text-lg mb-1">{title}</div>
    <div className="text-slate-400 text-sm text-center">{subtitle}</div>
  </div>
);
*/

const repsPhases = [
  { id: 'context', name: 'Preparation', icon: '📋', color: 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm' },
  { id: 'sbam', name: 'Opening', icon: '👥', color: 'bg-slate-900 text-white shadow-lg' },
  { id: 'legal', name: 'Compliance', icon: '🛡️', color: 'bg-rose-50 text-rose-600 border border-rose-100 shock-sm' },
  { id: 'discovery', name: 'Discovery', icon: '🔍', color: 'bg-amber-50 text-amber-600 border border-amber-100 shadow-sm' },
  { id: 'value', name: 'Proposition', icon: '🎯', color: 'bg-harx-500 text-white shadow-lg shadow-harx-500/20' },
  { id: 'documents', name: 'Quote', icon: '📄', color: 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm' },
  { id: 'objections', name: 'Objections', icon: '⚠️', color: 'bg-orange-50 text-orange-600 border border-orange-100 shadow-sm' },
  { id: 'closing', name: 'Closing', icon: '🤝', color: 'bg-teal-50 text-teal-600 border border-teal-100 shadow-sm' },
  { id: 'postcall', name: 'Finish', icon: '✅', color: 'bg-slate-50 text-slate-400 border border-slate-200' }
];

const DashboardGrid: React.FC = () => {
  const { state } = useAgent();
  const [discExpanded, setDiscExpanded] = useState(false);
  const transactionExpanded = false;
  const callStructureExpanded = false;
  const coachingExpanded = false;
  const targetingExpanded = false;
  const recommendationsExpanded = false;
  const discSectionRef = useRef<HTMLDivElement>(null);

  // Génère une transcription propre pour DISC : uniquement les textes finaux uniques
  const transcriptTexts = state.transcript
    .map(entry => entry.text)
    .filter((text, idx, arr) => text && arr.indexOf(text) === idx);
  // (Optionnel) Ajoute la dernière interim si tu veux du live (à adapter si tu veux la passer via le contexte)
  // const fullTranscription = [...transcriptTexts, state.currentInterimText].filter(Boolean).join(' ');
  const fullTranscription = transcriptTexts.join(' ');

  return (
    <div className="w-full pb-2">
      <div className="grid grid-cols-6 gap-2 my-1 w-full h-[120px]">
        <StatusCard
          icon={<Brain className="text-harx-alt-500" />}
          title="DISC Profile"
          value={
            <div className="w-full flex flex-col items-center">
              {state.personalityProfile ? (
                <div className="flex flex-col items-center">
                  <div className="flex gap-2 justify-center mb-2">
                    <span className={`rounded-lg px-3 py-1 font-black text-xs ${state.personalityProfile.primaryType === 'D' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-rose-50 text-rose-500/40 border border-rose-100'}`}>D</span>
                    <span className={`rounded-lg px-3 py-1 font-black text-xs ${state.personalityProfile.primaryType === 'I' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-orange-50 text-orange-500/40 border border-orange-100'}`}>I</span>
                    <span className={`rounded-lg px-3 py-1 font-black text-xs ${state.personalityProfile.primaryType === 'S' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-emerald-50 text-emerald-500/40 border border-emerald-100'}`}>S</span>
                    <span className={`rounded-lg px-3 py-1 font-black text-xs ${state.personalityProfile.primaryType === 'C' ? 'bg-harx-500 text-white shadow-lg shadow-harx-500/20' : 'bg-pink-50 text-harx-500/40 border border-pink-100'}`}>C</span>
                  </div>
                  <div className="text-slate-900 font-black text-[10px] text-center uppercase tracking-widest">{state.personalityProfile.primaryType} Profile Detected</div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 justify-center mb-2">
                    <span className="bg-rose-50 text-rose-500/40 border border-rose-100 rounded-lg px-3 py-1 font-black text-xs">D</span>
                    <span className="bg-orange-50 text-orange-500/40 border border-orange-100 rounded-lg px-3 py-1 font-black text-xs">I</span>
                    <span className="bg-emerald-50 text-emerald-500/40 border border-emerald-100 rounded-lg px-3 py-1 font-black text-xs">S</span>
                    <span className="bg-pink-50 text-harx-500/40 border border-pink-100 rounded-lg px-3 py-1 font-black text-xs">C</span>
                  </div>
                  <div className="text-slate-400 text-[8px] font-black uppercase tracking-widest text-center w-full">Start call to analyze</div>
                </>
              )}
            </div>
          }
          expandable
          expanded={discExpanded}
          onToggle={() => setDiscExpanded(v => !v)}
          disabled
        />
        <StatusCard
          icon={<Radar className="text-cyan-600" />}
          title="Transaction Progress"
          value={
            <div className="flex flex-col w-full">
              <span className="text-slate-900 font-black text-2xl mb-1">0%</span>
              <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest mb-1">Success Probability</span>
              <div className="w-full h-1.5 bg-slate-100 rounded-full mb-1 border border-slate-200">
                <div className="h-1.5 rounded-full bg-slate-300" style={{ width: '0%' }} />
              </div>
              <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest">0% to goal</span>
            </div>
          }
          disabled
        />

        <StatusCard
          icon={<MapPin className="text-cyan-600" />}
          title="Call Structure"
          value={
            <div className="flex flex-col items-center justify-center w-full mt-2">
              <MapPin className="w-10 h-10 text-slate-200 mb-5" />
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest text-center">No active methodology</span>
            </div>
          }
          disabled
        />

        <StatusCard
          icon={<GraduationCap className="text-harx-500" />}
          title="Coaching"
          value={
            <div className="flex flex-col items-center justify-center w-full mt-2">
              <GraduationCap className="w-10 h-10 text-slate-200 mb-5" />
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest text-center">Start call for coaching</span>
            </div>
          }
          disabled
        />

        <StatusCard
          icon={<Target className="text-cyan-600" />}
          title="Targeting"
          value={
            <div className="flex flex-col items-center justify-center w-full mt-2">
              <Target className="w-10 h-10 text-slate-200 mb-5" />
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest text-center">No transaction goal set</span>
            </div>
          }
          disabled
        />

        <StatusCard
          icon={<Lightbulb className="text-orange-500" />}
          title="Recommendations"
          value={
            <div className="flex flex-col items-center justify-center w-full mt-2">
              <Lightbulb className="w-10 h-10 text-slate-200 mb-5" />
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest text-center">No recommendations yet</span>
            </div>
          }
          disabled
        />
      </div>
      {discExpanded && (
        <>
          {console.log('[DASHBOARD] state.transcript:', state.transcript)}
          {console.log('[DASHBOARD] transcription prop:', fullTranscription)}
          <div ref={discSectionRef} className="w-full mt-2 mb-8">
            <DiscPersonalityAnalysis
              transcription={fullTranscription}
              context={state.transcript || []}
              callDuration={state.callState.isActive ? Math.floor((Date.now() - (state.callState.startTime?.getTime() || Date.now())) / 60000) : 0}
              onPersonalityDetected={(profile) => {
                console.log('Personality detected:', profile);
                // Notification pour informer l'utilisateur
                if (profile.confidence >= 70) {
                  // Scroll automatique vers le DISC si confiance élevée
                  setTimeout(() => {
                    discSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 1000);
                }
              }}
            />
          </div>
        </>
      )}
      {transactionExpanded && (
        <div className="w-full mt-2 mb-8">
          <TransactionProgressDetails />
        </div>
      )}
      {callStructureExpanded && (
        <div className="w-full mt-2 mb-8">
          <CallStructureGuideDetails />
        </div>
      )}
      {coachingExpanded && (
        <div className="w-full mt-2 mb-8">
          <CoachingDetails />
        </div>
      )}
      {targetingExpanded && (
        <div className="w-full mt-2 mb-8">
          <TargetingDetails />
        </div>
      )}
      {recommendationsExpanded && (
        <div className="w-full mt-2 mb-8">
          <RecommendationsDetails />
        </div>
      )}
      {/* Bouton flottant pour remonter vers DISC */}
      {discExpanded && (
        <button
          onClick={() => discSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="fixed bottom-6 right-6 bg-harx-alt-500 hover:bg-harx-alt-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-50"
          title="Scroll to DISC Analysis"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Featured Real-Time Section */}
      <div className="grid grid-cols-12 gap-2 mt-1 min-h-[300px]">
        {/* Left Column: Phases & Coaching (7 cols) */}
        <div className="col-span-7 flex flex-col space-y-2">
          <div className="relative h-full">
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-3xl" />
              <div className="relative z-20 bg-slate-900/90 text-white text-[9px] font-black px-5 py-2 rounded-xl border border-slate-800 shadow-2xl uppercase tracking-[0.3em] active:scale-95 transition-all">
                Cognitive Engine Inactive
              </div>
            </div>
            <div className="bg-white rounded-3xl p-6 flex flex-col h-full shadow-[0_4px_25px_rgb(0,0,0,0.02)] opacity-30 border border-slate-100 relative">
              <RealTimeCoaching />
            </div>
          </div>

          <div className="relative h-[250px]">
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-3xl" />
            </div>
            <div className="bg-white rounded-3xl p-6 flex flex-col shadow-[0_4px_25px_rgb(0,0,0,0.02)] opacity-30 border border-slate-100">
              <CallPhasesDisplay
                phases={repsPhases as any}
                isCallActive={state.callState.isActive}
                phoneNumber={state.callState.contact?.phone || "+13024440090"}
                mediaStream={state.mediaStream}
                disableAutoScroll={true}
                onPhaseClick={(phaseId) => {
                  console.log('Phase clicked:', phaseId);
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Transcript (5 cols) */}
        <div className="col-span-5 h-full">
          <div className="relative h-full min-h-[300px]">
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-3xl" />
              <div className="relative z-20 bg-slate-900/90 text-white text-[9px] font-black px-5 py-2 rounded-xl border border-slate-800 shadow-2xl uppercase tracking-[0.3em]">
                Waiting for Stream
              </div>
            </div>
            <div className="bg-white rounded-3xl p-4 h-full shadow-[0_4px_25px_rgb(0,0,0,0.02)] opacity-30 border border-slate-100">
              <LiveTranscript />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Layout: Script Prompter & Knowledge Base */}
      <div className="grid grid-cols-12 gap-2 mt-2">
        {/* Left Column: Script Prompter (7 cols) */}
        <div className="col-span-7 relative">
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] rounded-3xl" />
            <div className="relative z-20 bg-slate-900/90 text-white text-[9px] font-black px-6 py-2 rounded-xl border border-slate-800 shadow-2xl uppercase tracking-[0.3em]">
              PROMPTER OFFLINE
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 flex flex-col h-full min-h-[220px] relative shadow-[0_4px_25px_rgb(0,0,0,0.02)] opacity-30 border border-slate-100">
            <div className="relative z-0 h-full flex flex-col">
              <div className="flex items-center mb-6 self-start group">
                <div className="p-3 bg-slate-900 rounded-xl mr-4 shadow-lg">
                  <FileText size={20} className="text-white" />
                </div>
                <span className="text-sm font-black text-slate-900 tracking-[0.2em] uppercase">Tactical Script Prompter</span>
              </div>
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="w-16 h-1 w-slate-100 rounded-full mb-4"></div>
                <div className="text-slate-300 text-[10px] font-black uppercase tracking-widest text-center">Protocol initiation required</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Knowledge Base (5 cols) */}
        <div className="col-span-5 relative">
           <KnowledgeBase />
        </div>
      </div>

      {/* AI Overlays */}
      <SmartWarningSystem />
    </div>
  );
};

export default DashboardGrid;
