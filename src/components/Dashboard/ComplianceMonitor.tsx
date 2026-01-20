import React from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { Shield, AlertTriangle, CheckCircle, X, Clock } from 'lucide-react';

export function ComplianceMonitor() {
  const { state } = useAgent();

  // Mock compliance alerts (in real app, this would come from state)
  const mockAlerts = [
    {
      id: '1',
      type: 'missing_disclosure' as const,
      severity: 'warning' as const,
      message: 'Risk disclosure not yet provided',
      suggestion: 'Include standard risk disclaimer before proceeding with product details',
      timestamp: new Date(Date.now() - 300000) // 5 minutes ago
    },
    {
      id: '2',
      type: 'sensitive_term' as const,
      severity: 'error' as const,
      message: 'Guarantee language detected',
      suggestion: 'Avoid using terms like "guaranteed returns" - use "projected" or "estimated" instead',
      timestamp: new Date(Date.now() - 120000) // 2 minutes ago
    }
  ];

  const alerts = state.callState.isActive ? mockAlerts : [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-500/10 text-red-300';
      case 'error': return 'border-red-400 bg-red-400/10 text-red-300';
      case 'warning': return 'border-yellow-500 bg-yellow-500/10 text-yellow-300';
      default: return 'border-blue-500 bg-blue-500/10 text-blue-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Shield className="w-4 h-4 text-blue-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'missing_disclosure': return 'Missing Disclosure';
      case 'sensitive_term': return 'Sensitive Language';
      case 'gdpr_violation': return 'GDPR Issue';
      case 'script_deviation': return 'Script Deviation';
      default: return 'Compliance Issue';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const diff = Date.now() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ago`;
    }
    return `${seconds}s ago`;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Compliance Monitor</h3>
        </div>
        <div className="flex items-center space-x-2">
          {state.callState.isActive ? (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">Monitoring</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Inactive</span>
          )}
          {alerts.length > 0 && (
            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
              {alerts.length}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700">
        {!state.callState.isActive ? (
          <div className="text-center text-slate-400 py-6">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Compliance monitoring inactive</p>
            <p className="text-xs mt-1">Start a call to begin monitoring</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center text-slate-400 py-6">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400 opacity-50" />
            <p className="text-sm text-green-400">All clear</p>
            <p className="text-xs mt-1">No compliance issues detected</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)} transition-all duration-200`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getSeverityIcon(alert.severity)}
                  <h4 className="text-sm font-medium">{getTypeLabel(alert.type)}</h4>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                <button className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm mb-3 leading-relaxed">
                {alert.message}
              </p>

              <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
                <h5 className="text-xs font-medium text-emerald-400 mb-1">Suggested Action:</h5>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {alert.suggestion}
                </p>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(alert.timestamp)}</span>
                </div>
                <span className="capitalize">{alert.type.replace('_', ' ')}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Compliance Status Summary */}
      {state.callState.isActive && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-700/30 rounded-lg p-2">
              <div className="text-xs text-slate-400">Disclosures</div>
              <div className="text-sm font-medium text-yellow-400">2/4</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2">
              <div className="text-xs text-slate-400">Script Follow</div>
              <div className="text-sm font-medium text-green-400">85%</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2">
              <div className="text-xs text-slate-400">Risk Level</div>
              <div className="text-sm font-medium text-orange-400">Medium</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}