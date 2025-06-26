import React from 'react';
import { Brain } from 'lucide-react';

const discTypes = [
  {
    letter: 'D',
    title: 'Dominant',
    desc: 'Direct & Results-focused',
  },
  {
    letter: 'I',
    title: 'Influential',
    desc: 'People & Persuasion',
  },
  {
    letter: 'S',
    title: 'Steady',
    desc: 'Stability & Support',
  },
  {
    letter: 'C',
    title: 'Conscientious',
    desc: 'Quality & Analysis',
  },
];

const DiscPersonalityAnalysis: React.FC = () => (
  <div className="bg-[#232f47] rounded-xl p-8 w-full">
    <div className="flex items-center text-purple-400 text-xl font-semibold mb-4">
      <Brain className="w-6 h-6 mr-2" />
      DISC Personality Analysis
    </div>
    <div className="bg-[#232f47] rounded-xl p-6 w-full mb-4 border border-slate-600/40">
      <div className="flex items-center text-purple-400 text-lg font-semibold mb-4">
        <Brain className="w-5 h-5 mr-2" />
        DISC Personality Types
      </div>
      <div className="grid grid-cols-4 gap-6 mb-6">
        {discTypes.map((type) => (
          <div key={type.letter} className="bg-[#26314a] rounded-xl flex flex-col items-center justify-center p-6 border border-slate-500/30">
            <div className="text-3xl font-bold text-white mb-2 opacity-80">{type.letter}</div>
            <div className="text-lg font-bold text-white mb-1">{type.title}</div>
            <div className="text-slate-400 text-sm text-center">{type.desc}</div>
          </div>
        ))}
      </div>
      <hr className="border-slate-600/40 mb-4" />
      <div className="flex items-center gap-6 justify-center text-sm">
        <span className="flex items-center gap-1 text-slate-400"><input type="checkbox" disabled className="accent-slate-400" /> Not Identified</span>
        <span className="flex items-center gap-1 text-green-400"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Identified</span>
        <span className="flex items-center gap-1 text-white"><span className="w-2 h-2 rounded-full bg-white inline-block" /> Live Analysis</span>
      </div>
    </div>
  </div>
);

export default DiscPersonalityAnalysis; 