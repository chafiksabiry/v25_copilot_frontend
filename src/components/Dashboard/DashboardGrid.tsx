import React, { useState, useContext } from 'react';
import { CallMetrics } from './CallMetrics';
import { CallStructureGuide } from './CallStructureGuide';
import { TransactionTargeting } from './TransactionTargeting';
import { Recommendations } from './Recommendations';
import { CallPhasesDisplay } from './CallPhasesDisplay';
import { ScriptPrompter } from './ScriptPrompter';
import StatusCard from './StatusCard';
import { Brain, Radar, MapPin, GraduationCap, Target, Lightbulb, Phone, FileText } from 'lucide-react';
import DiscPersonalityAnalysis from './DiscPersonalityAnalysis';
import TransactionProgressDetails from './TransactionProgressDetails';
import CallStructureGuideDetails from './CallStructureGuideDetails';
import CoachingDetails from './CoachingDetails';
import TargetingDetails from './TargetingDetails';
import RecommendationsDetails from './RecommendationsDetails';
import { useAgent } from '../../contexts/AgentContext';

// Placeholders stylés pour les widgets vides
const PlaceholderCard = ({ icon, title, subtitle }: { icon: React.ReactNode, title: string, subtitle: string }) => (
  <div className="bg-[#232f47] rounded-xl flex flex-col items-center justify-center p-6 min-h-[140px] h-full">
    <div className="mb-2">{icon}</div>
    <div className="text-white font-semibold text-lg mb-1">{title}</div>
    <div className="text-slate-400 text-sm text-center">{subtitle}</div>
  </div>
);

const repsPhases = [
  { id: 'context', name: 'Context & Preparation', icon: '📋', color: 'bg-blue-100 text-blue-800' },
  { id: 'sbam', name: 'SBAM & Opening', icon: '👥', color: 'bg-green-100 text-green-800' },
  { id: 'legal', name: 'Legal & Compliance', icon: '🛡️', color: 'bg-purple-100 text-purple-800' },
  { id: 'discovery', name: 'Need Discovery', icon: '💬', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'value', name: 'Value Proposition', icon: '🎯', color: 'bg-pink-100 text-pink-800' },
  { id: 'documents', name: 'Documents/Quote', icon: '📄', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'objections', name: 'Objection Handling', icon: '⚠️', color: 'bg-red-100 text-red-800' },
  { id: 'closing', name: 'Confirmation & Closing', icon: '🤝', color: 'bg-teal-100 text-teal-800' },
  { id: 'postcall', name: 'Post-Call Actions', icon: '✅', color: 'bg-gray-100 text-gray-800' }
];

const DashboardGrid: React.FC = () => {
  const { state } = useAgent();
  const [discExpanded, setDiscExpanded] = useState(false);
  const [transactionExpanded, setTransactionExpanded] = useState(false);
  const [callStructureExpanded, setCallStructureExpanded] = useState(false);
  const [coachingExpanded, setCoachingExpanded] = useState(false);
  const [targetingExpanded, setTargetingExpanded] = useState(false);
  const [recommendationsExpanded, setRecommendationsExpanded] = useState(false);

  return (
    <div className="w-full pb-8">
      <div className="grid grid-cols-6 gap-x-6 gap-y-6 my-6 w-full">
        <StatusCard
          icon={<Brain className="text-purple-400" />}
          title="DISC Profile"
          value={
            <div className="w-full flex flex-col items-center">
              <div className="flex gap-2 justify-center mb-2">
                <span className="bg-red-500 text-white rounded px-2 py-1 font-bold">D</span>
                <span className="bg-yellow-400 text-white rounded px-2 py-1 font-bold">I</span>
                <span className="bg-green-500 text-white rounded px-2 py-1 font-bold">S</span>
                <span className="bg-blue-500 text-white rounded px-2 py-1 font-bold">C</span>
              </div>
              <div className="text-slate-400 text-sm text-center w-full">Start call to analyze</div>
            </div>
          }
          expandable
          expanded={discExpanded}
          onToggle={() => setDiscExpanded(v => !v)}
        />
        <StatusCard
          icon={<Radar className="text-cyan-400" />}
          title="Transaction Progress"
          value={
            <div className="flex flex-col w-full">
              <span className="text-red-400 font-bold text-2xl mb-1">0%</span>
              <span className="text-slate-300 text-sm mb-1">Success Probability</span>
              <div className="w-full h-2 bg-slate-500/30 rounded-full mb-1">
                <div className="h-2 rounded-full bg-cyan-400" style={{ width: '0%' }} />
              </div>
              <span className="text-slate-400 text-sm">0% to goal</span>
            </div>
          }
          expandable
          expanded={transactionExpanded}
          onToggle={() => setTransactionExpanded(v => !v)}
        />
        <StatusCard
          icon={<MapPin className="text-cyan-400" />}
          title="Call Structure"
          value={
            <div className="flex flex-col items-center justify-center w-full mt-2">
              <MapPin className="w-10 h-10 text-slate-500 mb-2" />
              <span className="text-slate-400 text-base text-center">No active methodology</span>
            </div>
          }
          expandable
          expanded={callStructureExpanded}
          onToggle={() => setCallStructureExpanded(v => !v)}
        />
        <StatusCard
          icon={<GraduationCap className="text-blue-400" />}
          title="Coaching"
          value={
            <div className="flex flex-col items-center justify-center w-full mt-2">
              <GraduationCap className="w-10 h-10 text-slate-500 mb-2" />
              <span className="text-slate-400 text-base text-center">Start call for coaching</span>
            </div>
          }
          expandable
          expanded={coachingExpanded}
          onToggle={() => setCoachingExpanded(v => !v)}
        />
        <StatusCard
          icon={<Target className="text-cyan-400" />}
          title="Targeting"
          value={
            <div className="flex flex-col items-center justify-center w-full mt-2">
              <Target className="w-10 h-10 text-slate-500 mb-2" />
              <span className="text-slate-400 text-base text-center">No transaction goal set</span>
            </div>
          }
          expandable
          expanded={targetingExpanded}
          onToggle={() => setTargetingExpanded(v => !v)}
        />
        <StatusCard
          icon={<Lightbulb className="text-yellow-400" />}
          title="Recommendations"
          value={
            <div className="flex flex-col items-center justify-center w-full mt-2">
              <Lightbulb className="w-10 h-10 text-slate-500 mb-2" />
              <span className="text-slate-400 text-base text-center">No recommendations yet</span>
            </div>
          }
          expandable
          expanded={recommendationsExpanded}
          onToggle={() => setRecommendationsExpanded(v => !v)}
        />
      </div>
      {discExpanded && (
        <div className="w-full mt-2 mb-8">
          <DiscPersonalityAnalysis />
        </div>
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
      {/* Grille 2 colonnes toujours visible */}
      <div className="grid grid-cols-2 gap-6 mt-2">
        <div className="bg-[#232f47] rounded-xl p-8 flex flex-col min-h-[220px] overflow-hidden">
          <CallPhasesDisplay
            phases={repsPhases.map((phase, idx) => ({
              ...phase,
              status:
                state.callState.isActive
                  ? idx === 0
                    ? 'completed'
                    : idx === 1
                    ? 'in-progress'
                    : 'pending'
                  : 'pending'
            }))}
            currentPhase={state.callState.isActive ? repsPhases[1].id : undefined}
            isCallActive={state.callState.isActive}
            phoneNumber="+18605670043"
            mediaStream={state.mediaStream}
            onPhaseClick={(phaseId) => {
              console.log('Phase clicked:', phaseId);
            }}
          />
        </div>
        <div className="bg-[#232f47] rounded-xl p-8 flex flex-col min-h-[220px]">
          <div className="flex items-center mb-4 self-start">
            <Brain className="text-cyan-400 mr-2" />
            <span className="text-lg font-bold text-white">Adaptive Script Prompter</span>
          </div>
          <div className="flex flex-col items-center justify-center flex-1">
            <FileText className="w-14 h-14 text-slate-400 mb-4" />
            <div className="text-slate-300 text-center text-lg mb-1">Script prompter will activate when call starts</div>
            <div className="text-slate-400 text-center text-base">AI will analyze conversation and adapt REPS scripts in real-time</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardGrid; 