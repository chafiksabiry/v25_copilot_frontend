import React from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { BarChart3, TrendingUp, Clock, Award } from 'lucide-react';

export function CallMetrics() {
  const { state } = useAgent();

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-yellow-400';
    if (score >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-yellow-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const metrics = [
    { label: 'Clarity', value: state.callMetrics.clarity, icon: '🎯' },
    { label: 'Empathy', value: state.callMetrics.empathy, icon: '❤️' },
    { label: 'Assertiveness', value: state.callMetrics.assertiveness, icon: '💪' },
    { label: 'Efficiency', value: state.callMetrics.efficiency, icon: '⚡' }
  ];

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        <BarChart3 className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-white">Call Metrics</h3>
        {state.callState.isActive && (
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        )}
      </div>

      <div className="space-y-4">
        {/* Overall Score */}
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">Overall Score</span>
            </div>
            <span className={`text-2xl font-bold ${getScoreColor(state.callMetrics.overallScore)}`}>
              {Math.round(state.callMetrics.overallScore)}
            </span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2">
            <div
              className={`${getScoreBgColor(state.callMetrics.overallScore)} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${state.callMetrics.overallScore}%` }}
            />
          </div>
        </div>

        {/* Call Duration */}
        {state.callState.isActive && (
          <div className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-slate-300">Duration</span>
            </div>
            <span className="text-white font-mono">
              {formatDuration(state.callMetrics.duration)}
            </span>
          </div>
        )}

        {/* Individual Metrics */}
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span>{metric.icon}</span>
                  <span className="text-slate-300">{metric.label}</span>
                </div>
                <span className="text-white font-medium">{Math.round(metric.value)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div
                  className={`${getScoreBgColor(metric.value)} h-1.5 rounded-full transition-all duration-500`}
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Performance Trend */}
        {state.callState.isActive && (
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-white">Performance Trend</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex-1 h-1 bg-slate-600 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-xs text-green-400">↗ Improving</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}