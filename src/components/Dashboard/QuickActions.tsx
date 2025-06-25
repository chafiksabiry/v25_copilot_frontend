import React from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { useRealTimeFeatures } from '../../hooks/useRealTimeFeatures';
import { Zap, Send, Calendar, FileText, Phone, MessageSquare, Copy, ExternalLink } from 'lucide-react';

export function QuickActions() {
  const { state } = useAgent();
  const { updateCallPhase } = useRealTimeFeatures();

  const quickActions = [
    {
      id: 'send-materials',
      label: 'Send Materials',
      icon: <Send className="w-4 h-4" />,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => console.log('Send materials'),
      enabled: state.callState.isActive
    },
    {
      id: 'schedule-followup',
      label: 'Schedule Follow-up',
      icon: <Calendar className="w-4 h-4" />,
      color: 'bg-green-600 hover:bg-green-700',
      action: () => console.log('Schedule follow-up'),
      enabled: state.callState.isActive
    },
    {
      id: 'create-summary',
      label: 'Create Summary',
      icon: <FileText className="w-4 h-4" />,
      color: 'bg-purple-600 hover:bg-purple-700',
      action: () => console.log('Create summary'),
      enabled: state.callState.isActive
    },
    {
      id: 'escalate-call',
      label: 'Escalate',
      icon: <Phone className="w-4 h-4" />,
      color: 'bg-orange-600 hover:bg-orange-700',
      action: () => console.log('Escalate call'),
      enabled: state.callState.isActive
    },
    {
      id: 'send-chat',
      label: 'Send Chat',
      icon: <MessageSquare className="w-4 h-4" />,
      color: 'bg-cyan-600 hover:bg-cyan-700',
      action: () => console.log('Send chat message'),
      enabled: state.callState.isActive
    },
    {
      id: 'copy-transcript',
      label: 'Copy Transcript',
      icon: <Copy className="w-4 h-4" />,
      color: 'bg-slate-600 hover:bg-slate-700',
      action: () => {
        const transcript = state.transcript.map(entry => 
          `${entry.participantId.includes('agent') ? 'Agent' : 'Customer'}: ${entry.text}`
        ).join('\n');
        navigator.clipboard.writeText(transcript);
      },
      enabled: state.transcript.length > 0
    }
  ];

  const getTransactionAction = () => {
    const goal = state.transactionIntelligence.goal;
    const score = state.transactionIntelligence.currentScore;
    
    if (!goal || !state.callState.isActive) return null;

    if (score >= 75 && state.transactionIntelligence.optimalTiming.shouldProceed) {
      return {
        id: 'proceed-transaction',
        label: `Proceed with ${goal.type}`,
        icon: <Zap className="w-4 h-4" />,
        color: 'bg-emerald-600 hover:bg-emerald-700 animate-pulse',
        action: () => console.log(`Proceed with ${goal.type}`),
        enabled: true,
        priority: true
      };
    }

    return null;
  };

  const transactionAction = getTransactionAction();

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
        </div>
        {state.callState.isActive && (
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
        )}
      </div>

      <div className="space-y-3">
        {/* Priority Transaction Action */}
        {transactionAction && (
          <div className="mb-4 p-3 border border-emerald-500/30 bg-emerald-500/10 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-400">High Priority Action</span>
              <span className="text-xs text-emerald-300">
                {Math.round(state.transactionIntelligence.currentScore)}% success rate
              </span>
            </div>
            <button
              onClick={transactionAction.action}
              disabled={!transactionAction.enabled}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-white font-medium transition-all duration-200 ${transactionAction.color} ${
                !transactionAction.enabled ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105'
              }`}
            >
              {transactionAction.icon}
              <span>{transactionAction.label}</span>
            </button>
          </div>
        )}

        {/* Standard Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={action.action}
              disabled={!action.enabled}
              className={`flex flex-col items-center justify-center space-y-2 p-3 rounded-lg text-white font-medium transition-all duration-200 ${action.color} ${
                !action.enabled ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105'
              }`}
            >
              {action.icon}
              <span className="text-xs text-center">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Methodology Phase Actions */}
        {state.callStructureGuidance.currentPhase && state.callState.isActive && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <h4 className="text-sm font-medium text-white mb-2">Phase Actions</h4>
            <div className="space-y-2">
              {state.callStructureGuidance.currentPhase.suggestedPhrases.slice(0, 2).map((phrase, index) => (
                <button
                  key={index}
                  onClick={() => navigator.clipboard.writeText(phrase)}
                  className="w-full text-left p-2 bg-slate-700/50 hover:bg-slate-700 rounded text-xs text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate flex-1">{phrase}</span>
                    <Copy className="w-3 h-3 ml-2 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* External Tools */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h4 className="text-sm font-medium text-white mb-2">External Tools</h4>
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center space-x-1 p-2 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors">
              <ExternalLink className="w-3 h-3" />
              <span>CRM</span>
            </button>
            <button className="flex items-center justify-center space-x-1 p-2 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors">
              <ExternalLink className="w-3 h-3" />
              <span>Calendar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}