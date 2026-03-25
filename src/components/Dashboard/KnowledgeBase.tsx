import { useState } from 'react';
import { BookOpen, Search, FileText, HelpCircle, Copy, ExternalLink } from 'lucide-react';

export function KnowledgeBase() {
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
      case 'Compliance': return 'bg-rose-100 text-rose-600 border border-rose-200';
      case 'Education': return 'bg-blue-100 text-blue-600 border border-blue-200';
      case 'Sales': return 'bg-emerald-100 text-emerald-600 border border-emerald-200';
      default: return 'bg-slate-100 text-slate-600 border border-slate-200';
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
    <div className="glass-card rounded-2xl p-3 relative group overflow-hidden h-full flex flex-col bg-white/80 backdrop-blur-xl border border-pink-100/30 shadow-lg">
      <div className="absolute top-0 right-0 w-32 h-32 bg-harx-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      <div className="flex items-center space-x-2 mb-3">
        <div className="p-2 bg-pink-50 rounded-xl border border-pink-100">
          <BookOpen className="w-5 h-5 text-harx-500" />
        </div>
        <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Knowledge Base</h3>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search documentation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-harx-500/20 focus:border-harx-500 transition-all text-xs font-black uppercase tracking-widest"
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
              className="bg-white rounded-xl p-3 hover:bg-slate-50 transition-all duration-300 border border-slate-100 hover:border-slate-200 cursor-pointer group/item shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="p-1.5 bg-pink-50 rounded-lg text-harx-500 border border-pink-100">
                    {getTypeIcon(item.type)}
                  </div>
                  <h4 className="text-sm font-black text-slate-900 truncate group-hover/item:text-harx-500 transition-colors tracking-tight">{item.title}</h4>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${getCategoryColor(item.category)}`}>
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

              <p className="text-xs text-slate-600 leading-relaxed mb-2 line-clamp-2 italic font-bold">
                {item.content}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1">
                  <div className="flex-1 bg-slate-100 rounded-full h-1">
                    <div
                      className="bg-harx-500 h-1 rounded-full shadow-[0_0_8px_rgba(255,77,77,0.3)]"
                      style={{ width: `${item.relevanceScore}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 whitespace-nowrap uppercase tracking-widest">
                    {item.relevanceScore}% match
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex flex-wrap gap-2">
          {['Risk Disclosures', 'Sales Scripts', 'FAQs'].map(tag => (
            <button key={tag} className="text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-slate-50 hover:bg-harx-500 hover:text-white text-slate-400 rounded-xl transition-all duration-300 border border-slate-200">
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
