import React, { useState } from 'react';

interface IntelligenceInsight {
  id: string;
  type: 'sentiment' | 'keyword' | 'action' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
}

interface IntelligenceBarProps {
  insights?: IntelligenceInsight[];
  onInsightClick?: (insightId: string) => void;
  onDismiss?: (insightId: string) => void;
}

export const IntelligenceBar: React.FC<IntelligenceBarProps> = ({
  insights = [],
  onInsightClick,
  onDismiss
}) => {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sentiment' | 'keyword' | 'action' | 'recommendation'>('all');

  const filteredInsights = insights.filter(insight => 
    filter === 'all' ? true : insight.type === filter
  );

  const getTypeIcon = (type: IntelligenceInsight['type']) => {
    switch (type) {
      case 'sentiment': return '😊';
      case 'keyword': return '🔍';
      case 'action': return '⚡';
      case 'recommendation': return '💡';
      default: return '📊';
    }
  };

  const getTypeColor = (type: IntelligenceInsight['type']) => {
    switch (type) {
      case 'sentiment': return 'bg-harx-100 text-harx-800';
      case 'keyword': return 'bg-green-100 text-green-800';
      case 'action': return 'bg-yellow-100 text-yellow-800';
      case 'recommendation': return 'bg-harx-alt-100 text-harx-alt-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: IntelligenceInsight['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-500';
      case 'medium': return 'border-yellow-500';
      case 'low': return 'border-green-500';
      default: return 'border-gray-300';
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden relative group">
      <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-harx flex items-center justify-center shadow-lg shadow-harx-500/20">
            <span className="text-white text-xs font-black">AI</span>
          </div>
          <h2 className="text-lg font-black text-white tracking-tight">Intelligence</h2>
          <span className="bg-harx-500/20 text-harx-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-harx-500/20">
            {insights.length}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-slate-300 focus:ring-1 focus:ring-harx-500 outline-none transition-all"
          >
            <option value="all" className="bg-slate-900">All</option>
            <option value="sentiment" className="bg-slate-900">Sentiment</option>
            <option value="keyword" className="bg-slate-900">Keywords</option>
            <option value="action" className="bg-slate-900">Actions</option>
            <option value="recommendation" className="bg-slate-900">AI Recs</option>
          </select>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {filteredInsights.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No insights available
            </div>
          ) : (
            filteredInsights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-300 relative overflow-hidden group/item ${getPriorityColor(insight.priority)}`}
                onClick={() => onInsightClick?.(insight.id)}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityColor(insight.priority).replace('border-', 'bg-')}`}></div>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-lg">{getTypeIcon(insight.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-sm">{insight.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${getTypeColor(insight.type)}`}>
                          {insight.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round(insight.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                      <span className="text-xs text-gray-400">
                        {new Date(insight.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss?.(insight.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!expanded && insights.length > 0 && (
        <div className="p-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>{getTypeIcon(insights[0].type)}</span>
            <span>{insights[0].title}</span>
            <span className="text-gray-400">•</span>
            <span>{insights.length - 1} more insights</span>
          </div>
        </div>
      )}
    </div>
  );
};

