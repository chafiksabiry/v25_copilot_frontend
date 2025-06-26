import React, { useState } from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { BookOpen, Search, FileText, HelpCircle, Copy, ExternalLink } from 'lucide-react';

export function KnowledgeBase() {
  const { state } = useAgent();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock knowledge base items
  const knowledgeItems = [
    {
      id: '1',
      title: 'Investment Risk Disclosure',
      content: 'All investments carry risk and may lose value. Past performance does not guarantee future results.',
      category: 'Compliance',
      relevanceScore: 95,
      type: 'document' as const
    },
    {
      id: '2',
      title: 'How to explain compound interest',
      content: 'Use the "Rule of 72" - divide 72 by the interest rate to show how long it takes to double money.',
      category: 'Education',
      relevanceScore: 87,
      type: 'faq' as const
    },
    {
      id: '3',
      title: 'Handling Objections Template',
      content: 'Listen -> Acknowledge -> Clarify -> Respond -> Confirm understanding',
      category: 'Sales',
      relevanceScore: 92,
      type: 'template' as const
    },
    {
      id: '4',
      title: 'Market Volatility Explanation',
      content: 'Volatility is normal. Focus on long-term goals and diversification benefits.',
      category: 'Education',
      relevanceScore: 89,
      type: 'procedure' as const
    }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="w-3 h-3" />;
      case 'faq': return <HelpCircle className="w-3 h-3" />;
      case 'template': return <Copy className="w-3 h-3" />;
      case 'procedure': return <BookOpen className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Compliance': return 'bg-red-600/20 text-red-300';
      case 'Education': return 'bg-blue-600/20 text-blue-300';
      case 'Sales': return 'bg-green-600/20 text-green-300';
      default: return 'bg-slate-600/20 text-slate-300';
    }
  };

  const filteredItems = knowledgeItems
    .filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        <BookOpen className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-white">Knowledge Base</h3>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search knowledge base..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Knowledge Items */}
      <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700">
        {filteredItems.length === 0 ? (
          <div className="text-center text-slate-400 py-6">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No knowledge items found</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-700/50 rounded-lg p-3 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="text-indigo-400">
                    {getTypeIcon(item.type)}
                  </div>
                  <h4 className="text-sm font-medium text-white truncate">{item.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={() => copyToClipboard(item.content)}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title="Copy content"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button className="text-slate-400 hover:text-white transition-colors p-1">
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed mb-2 line-clamp-2">
                {item.content}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-full bg-slate-600 rounded-full h-1">
                    <div
                      className="bg-indigo-500 h-1 rounded-full"
                      style={{ width: `${item.relevanceScore}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {item.relevanceScore}% match
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex flex-wrap gap-2">
          <button className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full transition-colors">
            Risk Disclosures
          </button>
          <button className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full transition-colors">
            Sales Scripts
          </button>
          <button className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full transition-colors">
            FAQs
          </button>
        </div>
      </div>
    </div>
  );
}