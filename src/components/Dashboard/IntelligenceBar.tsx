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
      case 'sentiment': return 'bg-blue-100 text-blue-800';
      case 'keyword': return 'bg-green-100 text-green-800';
      case 'action': return 'bg-yellow-100 text-yellow-800';
      case 'recommendation': return 'bg-purple-100 text-purple-800';
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold">AI Intelligence</h2>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {insights.length} insights
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All Types</option>
            <option value="sentiment">Sentiment</option>
            <option value="keyword">Keywords</option>
            <option value="action">Actions</option>
            <option value="recommendation">Recommendations</option>
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
                className={`p-3 rounded-lg border-l-4 ${getPriorityColor(insight.priority)} bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors`}
                onClick={() => onInsightClick?.(insight.id)}
              >
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
